import { Command } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Cause, Effect, Option } from "effect"
import render from "./commands/render"
import { readVersion } from "./commands/version" with { type: "macro" }
import { FfmpegRenderFailed, MissingFfmpeg } from "./lib/errors"

const version = await readVersion()

const main = Command.make("sakuga").pipe(
  Command.withDescription("Create code animation videos from Markdown."),
  Command.withSubcommands([render])
)

const program = Command.run(main, { name: "sakuga", version })

const reportFailure = (cause: Cause.Cause<unknown>) => {
  const failure = Cause.failureOption(cause)
  return Option.match(failure, {
    onNone: () => Effect.logError(cause),
    onSome: (error) =>
      Effect.gen(function* () {
        if (error instanceof MissingFfmpeg) {
          yield* Effect.logError("Missing ffmpeg. Install it and retry.")
          return
        }
        if (error instanceof FfmpegRenderFailed) {
          yield* Effect.logError(
            `FFmpeg failed during ${error.stage} for ${error.outputPath} (format ${error.format}).`
          )
          return
        }
        yield* Effect.logError(error)
      }),
  })
}

program(process.argv).pipe(
  Effect.tapErrorCause(reportFailure),
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain
)
