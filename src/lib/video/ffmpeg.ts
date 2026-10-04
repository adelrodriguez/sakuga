import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ChildProcess from "effect/process/ChildProcess"
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner"
import * as Stream from "effect/Stream"
import type { VideoFormat } from "#lib/shared/model.ts"
import { FfmpegRenderFailed, MissingFfmpeg } from "#lib/shared/errors.ts"

const FFMPEG_BINARY = "ffmpeg"
const LOOKUP_BINARY = process.platform === "win32" ? "where" : "which"

const CODEC_BY_FORMAT: Record<VideoFormat, string> = {
  mp4: "libx264",
  webm: "libvpx-vp9",
}

const PIX_FMT_BY_FORMAT: Record<VideoFormat, string> = {
  mp4: "yuv420p",
  webm: "yuv420p",
}

const QUALITY_ARGS_BY_FORMAT: Record<VideoFormat, readonly string[]> = {
  mp4: ["-crf", "12", "-preset", "slow", "-profile:v", "high", "-level:v", "4.1"],
  webm: ["-crf", "20", "-b:v", "0"],
}

// A silent audio track keeps players that expect one (such as social media uploads) happy.
const AUDIO_INPUT_ARGS_BY_FORMAT: Record<VideoFormat, readonly string[]> = {
  mp4: ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"],
  webm: [],
}

const AUDIO_OUTPUT_ARGS_BY_FORMAT: Record<VideoFormat, readonly string[]> = {
  mp4: ["-c:a", "aac", "-b:a", "192k", "-shortest"],
  webm: [],
}

const CONTAINER_ARGS_BY_FORMAT: Record<VideoFormat, readonly string[]> = {
  mp4: ["-movflags", "+faststart"],
  webm: [],
}

export interface EncodeOptions {
  readonly format: VideoFormat
  readonly fps: number
  readonly height: number
  /**
   * Path of a file with raw RGBA frames of `width` × `height` pixels.
   */
  readonly inputPath: string
  readonly outputPath: string
  /**
   * Show FFmpeg's own output instead of discarding it.
   */
  readonly verbose: boolean
  readonly width: number
}

function ensureEven(value: number) {
  return value % 2 === 0 ? value : value + 1
}

/**
 * Chroma subsampled pixel formats such as `yuv420p` need even dimensions.
 */
export function ensureEvenDimensions(format: VideoFormat, width: number, height: number) {
  if (PIX_FMT_BY_FORMAT[format] !== "yuv420p") {
    return { height, width }
  }

  return { height: ensureEven(height), width: ensureEven(width) }
}

export function buildEncodeArgs(options: EncodeOptions) {
  const { format } = options

  return [
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgba",
    "-s",
    `${options.width}x${options.height}`,
    "-r",
    `${options.fps}`,
    "-i",
    options.inputPath,
    ...AUDIO_INPUT_ARGS_BY_FORMAT[format],
    "-vf",
    "eq=saturation=1.3,unsharp=5:5:1.0:5:5:1.0,cas=0.5",
    "-c:v",
    CODEC_BY_FORMAT[format],
    ...QUALITY_ARGS_BY_FORMAT[format],
    "-pix_fmt",
    PIX_FMT_BY_FORMAT[format],
    ...AUDIO_OUTPUT_ARGS_BY_FORMAT[format],
    ...CONTAINER_ARGS_BY_FORMAT[format],
    "-y",
    options.outputPath,
  ]
}

interface FfmpegService {
  readonly ensureAvailable: Effect.Effect<void, MissingFfmpeg>
  readonly encode: (options: EncodeOptions) => Effect.Effect<void, FfmpegRenderFailed>
}

export class Ffmpeg extends Context.Service<Ffmpeg, FfmpegService>()("sakuga/Ffmpeg") {
  static readonly layer = Layer.effect(this)(
    Effect.gen(function* () {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner

      const ensureAvailable = Effect.gen(function* () {
        const exitCode = yield* spawner
          .exitCode(
            ChildProcess.make(LOOKUP_BINARY, [FFMPEG_BINARY], {
              stderr: "ignore",
              stdin: "ignore",
              stdout: "ignore",
            })
          )
          .pipe(Effect.mapError((cause) => new MissingFfmpeg({ cause })))

        if (exitCode !== ChildProcessSpawner.ExitCode(0)) {
          return yield* new MissingFfmpeg({})
        }
      }).pipe(Effect.withSpan("Ffmpeg.ensureAvailable"))

      const encode = Effect.fn("Ffmpeg.encode")(function* (options: EncodeOptions) {
        const failed = (stage: "encode" | "spawn") => (cause: unknown) =>
          new FfmpegRenderFailed({
            cause,
            format: options.format,
            outputPath: options.outputPath,
            stage,
          })
        const output = options.verbose ? "inherit" : "pipe"

        const exitCode = yield* Effect.scoped(
          Effect.gen(function* () {
            const handle = yield* spawner
              .spawn(
                ChildProcess.make(FFMPEG_BINARY, buildEncodeArgs(options), {
                  stderr: output,
                  stdin: "ignore",
                  stdout: output,
                })
              )
              .pipe(Effect.mapError(failed("spawn")))

            // Piped output must be drained, or FFmpeg blocks once the pipe buffer fills.
            const drained = options.verbose
              ? Effect.void
              : Effect.all([Stream.runDrain(handle.stdout), Stream.runDrain(handle.stderr)], {
                  concurrency: "unbounded",
                  discard: true,
                })
            const [, code] = yield* Effect.all([drained, handle.exitCode], {
              concurrency: "unbounded",
            }).pipe(Effect.mapError(failed("encode")))

            return code
          })
        )

        if (exitCode !== ChildProcessSpawner.ExitCode(0)) {
          return yield* new FfmpegRenderFailed({
            exitCode,
            format: options.format,
            outputPath: options.outputPath,
            stage: "encode",
          })
        }
      })

      return Ffmpeg.of({ encode, ensureAvailable })
    })
  )
}
