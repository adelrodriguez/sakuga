import { availableParallelism } from "node:os"
import type { BundledTheme } from "shiki"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Stream from "effect/Stream"
import type { Frame } from "#lib/scene/model.ts"
import type { CodeBlock, RenderConfig, VideoFormat } from "#lib/shared/model.ts"
import { makeCanvas } from "#lib/scene/canvas.ts"
import { drawFrame } from "#lib/scene/draw.ts"
import { buildFrames } from "#lib/scene/frames.ts"
import { layoutScene } from "#lib/scene/layout.ts"
import { measureScene, resolveFrameSize } from "#lib/scene/measure.ts"
import { FfmpegRenderFailed } from "#lib/shared/errors.ts"
import { ensureEvenDimensions, Ffmpeg } from "#lib/video/ffmpeg.ts"

export interface RenderVideoOptions {
  readonly codeBlocks: readonly CodeBlock[]
  readonly config: RenderConfig
  readonly format: VideoFormat
  readonly outputPath: string
  readonly theme: BundledTheme
  readonly verbose: boolean
}

/**
 * Turns frames into raw pixels one at a time. Pixel buffers are large, so only one exists before
 * the sink writes it, however long a scene holds. `Stream.map` would convert a whole chunk first.
 */
export function rasterizeFrames<E, R>(
  frames: Stream.Stream<Frame, E, R>,
  rasterize: (frame: Frame) => Uint8Array
) {
  return frames.pipe(Stream.mapEffect((frame) => Effect.sync(() => rasterize(frame))))
}

/**
 * Renders code blocks into a video: measure every scene, size the frame to fit them, draw every
 * frame to a raw file, then encode it with FFmpeg.
 */
export const renderVideo = Effect.fn("Video.render")(function* (options: RenderVideoOptions) {
  const { codeBlocks, config, format, outputPath } = options
  const ffmpeg = yield* Ffmpeg
  const fileSystem = yield* FileSystem.FileSystem

  yield* ffmpeg.ensureAvailable
  yield* Effect.logInfo(`Rendering ${codeBlocks.length} blocks as ${format} at ${config.fps} fps.`)

  yield* Effect.logInfo("Measuring scenes...")
  const measuredScenes = yield* Effect.forEach(
    codeBlocks,
    (codeBlock) => measureScene(config, makeCanvas(1, 1).context, codeBlock, options.theme),
    { concurrency: Math.min(4, availableParallelism()) }
  )

  const frameSize = resolveFrameSize(config, measuredScenes)
  const { height, width } = ensureEvenDimensions(format, frameSize.width, frameSize.height)
  yield* Effect.logInfo(`Resolved output size ${width}x${height}.`)

  const canvas = makeCanvas(width, height)
  const scenes = measuredScenes.map((measured) => layoutScene(config, measured, width, height))
  const frameBytes = rasterizeFrames(buildFrames(config, scenes), (frame) => {
    drawFrame(config, canvas.context, width, height, frame)
    return canvas.snapshot()
  })

  yield* Effect.scoped(
    Effect.gen(function* () {
      const rawPath = yield* fileSystem.makeTempFileScoped({ suffix: ".raw" })

      yield* Effect.logInfo("Rendering frames...")
      yield* Effect.logDebug(`Writing raw frames to ${rawPath}.`)
      yield* Stream.run(frameBytes, fileSystem.sink(rawPath)).pipe(
        Effect.mapError(
          (cause) => new FfmpegRenderFailed({ cause, format, outputPath, stage: "frames" })
        )
      )

      yield* Effect.logInfo(`Encoding video to ${outputPath}...`)
      yield* ffmpeg.encode({
        format,
        fps: config.fps,
        height,
        inputPath: rawPath,
        outputPath,
        verbose: options.verbose,
        width,
      })
      yield* Effect.logDebug(`FFmpeg completed for ${outputPath}.`)
    })
  )

  return outputPath
})
