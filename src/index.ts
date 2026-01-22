import * as Command from "@effect/cli/Command"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import git from "./commands/git"
import render from "./commands/render"
import { readVersion } from "./commands/version" with { type: "macro" }

const version = await readVersion()

const main = Command.make("sakuga").pipe(
  Command.withDescription("Create code animation videos from Markdown."),
  Command.withSubcommands([git, render])
)

const program = Command.run(main, { name: "sakuga", version })

program(process.argv).pipe(
  Effect.catchTags({
    CommandMismatch: (_error) =>
      Console.error(`Invalid command.\n  Run "sakuga --help" for usage.`),
    MultipleValuesDetected: (error) =>
      Console.error(`Multiple values detected: ${error.values.join(", ")}`),
    UnclusteredFlag: (error) =>
      Console.error(
        `Invalid flag format: "${error.unclustered.join("")}".\n  Flags cannot be clustered. Use separate flags instead.`
      ),
  }),
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain
)
