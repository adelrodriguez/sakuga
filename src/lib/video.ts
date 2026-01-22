import { availableParallelism } from "node:os"
import type { BundledTheme } from "shiki"
import * as ShellCommand from "@effect/platform/Command"
import * as FileSystem from "@effect/platform/FileSystem"
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Stream from "effect/Stream"
import type { CanvasContext } from "./context"
import type { CodeBlock, RenderConfig, RenderFrame } from "./types"
import { FfmpegRenderFailed, type FfmpegFormat } from "./errors"
import { ensureEvenDimensions, ensureFfmpegAvailable, startFfmpegCommand } from "./ffmpeg"
import { buildFramesStream, computeFrameCounts, renderFrame } from "./render"
import { layoutScene, measureScene, resolveFrameSize } from "./scene"

export type RenderVideoOptions = {
  concurrency?: number
  format?: FfmpegFormat
  verbose?: boolean
}

const frameToBytes = (
  config: RenderConfig,
  context: CanvasContext,
  width: number,
  height: number
) =>
  Effect.fn("renderVideo.frameToBytes")((frame: RenderFrame) =>
    Effect.sync(() => {
      renderFrame(config, context, width, height, frame)
      const bytes = (context as SKRSContext2D).canvas.data()
      return Buffer.from(bytes)
    })
  )

export const renderVideo = Effect.fn(function* renderVideo(
  outputPath: string,
  theme: BundledTheme,
  codeBlocks: CodeBlock[],
  config: RenderConfig,
  options: RenderVideoOptions = {}
) {
  yield* ensureFfmpegAvailable()

  const concurrency = options.concurrency ?? Math.min(4, availableParallelism())
  const format = options.format ?? "mp4"
  const verbose = options.verbose ?? false

  yield* Console.log(`Rendering ${codeBlocks.length} blocks as ${format} at ${config.fps} fps.`)

  yield* Console.log("Measuring scenes...")
  const measuredScenes = yield* Effect.forEach(
    codeBlocks,
    (codeBlock) =>
      Effect.gen(function* () {
        const measurementContext = createCanvas(1, 1).getContext("2d")
        measurementContext.textRendering = "optimizeLegibility"
        return yield* measureScene(config, measurementContext, codeBlock, theme as never)
      }),
    { concurrency }
  )

  const { width, height } = resolveFrameSize(config, measuredScenes)
  const { height: evenHeight, width: evenWidth } = ensureEvenDimensions(format, width, height)

  yield* Console.log(`Resolved output size ${evenWidth}x${evenHeight}.`)

  const canvas = createCanvas(evenWidth, evenHeight)
  const context = canvas.getContext("2d")
  context.textRendering = "optimizeLegibility"

  const scenes = measuredScenes.map((measured) =>
    layoutScene(config, measured, evenWidth, evenHeight)
  )

  const frameCounts = computeFrameCounts(
    config.transitionDurationMs,
    config.fps,
    config.blockDuration
  )
  yield* Console.log("Rendering frames...")
  const frameStream = buildFramesStream(
    config,
    scenes,
    frameCounts.blockFrames,
    frameCounts.transitionFrames
  )
  const frameBytesStream = frameStream.pipe(
    Stream.mapEffect(frameToBytes(config, context, evenWidth, evenHeight))
  )

  return yield* Effect.scoped(
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem
      const rawPath = yield* fileSystem.makeTempFileScoped({ suffix: ".raw" })

      yield* Console.log(`Writing raw frames to ${rawPath}.`)
      yield* Stream.run(frameBytesStream, fileSystem.sink(rawPath)).pipe(
        Effect.mapError(
          (cause) =>
            new FfmpegRenderFailed({
              cause,
              format,
              outputPath,
              stage: "stream",
            })
        )
      )

      yield* Console.log(`Encoding video to ${outputPath}...`)
      if (verbose) {
        yield* Console.log(`Starting FFmpeg for ${outputPath}.`)
      }

      const command = startFfmpegCommand(
        format,
        evenWidth,
        evenHeight,
        config.fps,
        rawPath,
        outputPath
      )
      const process = yield* Effect.acquireRelease(
        command.pipe(
          ShellCommand.stdout(verbose ? "inherit" : "pipe"),
          ShellCommand.stderr(verbose ? "inherit" : "pipe"),
          ShellCommand.start,
          Effect.mapError(
            (cause) =>
              new FfmpegRenderFailed({
                cause,
                format,
                outputPath,
                stage: "init",
              })
          )
        ),
        (process, exit) =>
          Effect.ignore(
            Exit.isFailure(exit)
              ? process.kill("SIGTERM")
              : Effect.whenEffect(process.kill("SIGTERM"), process.isRunning)
          )
      )

      const exitCodeEffect = verbose
        ? process.exitCode
        : Effect.all([
            Stream.runDrain(process.stdout),
            Stream.runDrain(process.stderr),
            process.exitCode,
          ]).pipe(Effect.map((result) => result[2]))

      const exitCode = yield* exitCodeEffect

      if (exitCode === null || Number(exitCode) !== 0) {
        return yield* new FfmpegRenderFailed({
          ...(exitCode !== null && { exitCode: Number(exitCode) }),
          format,
          outputPath,
          stage: "finish",
        })
      }

      if (verbose) {
        yield* Console.log(`FFmpeg completed for ${outputPath}.`)
      }

      return outputPath
    })
  )
})
