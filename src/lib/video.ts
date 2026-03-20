import { availableParallelism } from "node:os"
import type { BundledTheme } from "shiki"
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FileSystem from "effect/FileSystem"
import * as Stream from "effect/Stream"
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner"
import type { CanvasContext } from "./context"
import type { CodeBlock, RenderConfig, RenderFrame } from "./types"
import { FfmpegRenderFailed, type FfmpegFormat } from "./errors"
import { ensureEvenDimensions, ensureFfmpegAvailable, makeFfmpegCommand } from "./ffmpeg"
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

      const ffmpegCommand = makeFfmpegCommand(
        format,
        evenWidth,
        evenHeight,
        config.fps,
        rawPath,
        outputPath,
        verbose
      )

      const ffmpeg = yield* Effect.acquireRelease(
        Effect.gen(function* () {
          return yield* ffmpegCommand
        }).pipe(
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
        (ffmpeg, exit) =>
          Effect.ignore(
            Effect.gen(function* () {
              if (Exit.isFailure(exit)) {
                yield* ffmpeg.kill()
                return
              }
              const running = yield* ffmpeg.isRunning
              if (running) {
                yield* ffmpeg.kill()
              }
            })
          )
      )

      const exitCodeEffect = verbose
        ? ffmpeg.exitCode
        : Effect.all([
            Stream.runDrain(ffmpeg.stdout),
            Stream.runDrain(ffmpeg.stderr),
            ffmpeg.exitCode,
          ]).pipe(Effect.map((result) => result[2]))

      const exitCode = yield* exitCodeEffect

      if (exitCode !== ChildProcessSpawner.ExitCode(0)) {
        return yield* new FfmpegRenderFailed({
          exitCode,
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
