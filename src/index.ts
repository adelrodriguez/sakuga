import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as CliError from "effect/cli/CliError"
import * as Command from "effect/cli/Command"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Runtime from "effect/Runtime"
import { appLayer, main } from "#cli.ts"
import { getPackageVersion } from "#lib/shared/version.macro.ts" with { type: "macro" }

const version = getPackageVersion()

const program = Command.run(main, { version }).pipe(
  Effect.as(0),
  Effect.catch((error) =>
    // The CLI already printed help for invalid input.
    (CliError.isCliError(error) ? Effect.void : Console.error(error.message)).pipe(Effect.as(1))
  ),
  Effect.provide(appLayer)
)

NodeRuntime.runMain(program, {
  teardown: (exit, onExit) => {
    if (Exit.isSuccess(exit)) {
      onExit(Number(exit.value))
      return
    }

    Runtime.defaultTeardown(exit, onExit)
  },
})
