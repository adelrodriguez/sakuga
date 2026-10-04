import { describe, expect, it } from "bun:test"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import type { EncodeOptions } from "#lib/video/ffmpeg.ts"
import { renderConfig } from "#__tests__/fixtures.ts"
import { MissingFfmpeg } from "#lib/shared/errors.ts"
import { Ffmpeg } from "#lib/video/ffmpeg.ts"
import { renderVideo } from "#lib/video/render.ts"

const silent = Logger.layer([])

const config = { ...renderConfig, blockDuration: 0.2, fps: 10, transitionDurationMs: 100 }

const options = {
  codeBlocks: [
    { code: "const a = 1", language: "ts" as const },
    { code: "const b = 2", language: "ts" as const },
  ],
  config,
  format: "mp4" as const,
  outputPath: "out.mp4",
  theme: "github-dark" as const,
  verbose: false,
}

describe("renderVideo", () => {
  it("writes every frame as raw RGBA and encodes it", async () => {
    const program = Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem
      const encoded = yield* Ref.make(Option.none<{ bytes: number; options: EncodeOptions }>())
      const ffmpeg = Ffmpeg.of({
        encode: (encodeOptions) =>
          fileSystem.stat(encodeOptions.inputPath).pipe(
            Effect.flatMap((info) =>
              Ref.set(encoded, Option.some({ bytes: Number(info.size), options: encodeOptions }))
            ),
            Effect.orDie
          ),
        ensureAvailable: Effect.void,
      })

      yield* renderVideo(options).pipe(Effect.provideService(Ffmpeg, ffmpeg))
      return yield* Ref.get(encoded).pipe(Effect.flatMap((encoded) => Effect.fromOption(encoded)))
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, silent)))
    )

    const { height, width } = result.options
    // Two scenes of 2 frames, and one transition frame between them.
    expect(result.bytes).toBe(width * height * 4 * 5)
    expect(width % 2).toBe(0)
    expect(height % 2).toBe(0)
    expect(result.options).toMatchObject({ format: "mp4", fps: 10, outputPath: "out.mp4" })
  })

  it("fails before rendering when FFmpeg is missing", async () => {
    const ffmpegLayer = Layer.succeed(Ffmpeg)(
      Ffmpeg.of({ encode: () => Effect.die("unreachable"), ensureAvailable: new MissingFfmpeg({}) })
    )

    const error = await Effect.runPromise(
      Effect.flip(renderVideo(options)).pipe(
        Effect.provide(Layer.mergeAll(ffmpegLayer, NodeServices.layer, silent))
      )
    )

    expect(error).toBeInstanceOf(MissingFfmpeg)
  })
})
