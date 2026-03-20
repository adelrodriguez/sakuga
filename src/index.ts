import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as CliError from "effect/unstable/cli/CliError"
import * as Command from "effect/unstable/cli/Command"
import git from "./commands/git"
import render from "./commands/render"
import { readVersion } from "./commands/version" with { type: "macro" }
import { messageFromUnknown } from "./lib/errors"

const version: string = await readVersion()

const main = Command.make("sakuga").pipe(
  Command.withDescription("Create code animation videos from Markdown."),
  Command.withSubcommands([git, render])
)

const program = Command.run(main, { version }).pipe(
  Effect.catch((error: unknown) => {
    if (CliError.isCliError(error)) {
      return Console.error(error.message)
    }
    return Console.error(messageFromUnknown(error) ?? String(error))
  }),
  Effect.provide(NodeServices.layer)
)

NodeRuntime.runMain(program)
