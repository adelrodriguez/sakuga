import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Command from "effect/cli/Command"
import * as Layer from "effect/Layer"
import gitCommand from "#commands/git.ts"
import renderCommand from "#commands/render.ts"
import { Git } from "#lib/sources/git.ts"
import { Ffmpeg } from "#lib/video/ffmpeg.ts"
import * as TerminalLogger from "#terminal/logger.ts"

export const main = Command.make("sakuga").pipe(
  Command.withDescription("Create code animation videos from Markdown."),
  Command.withSubcommands([gitCommand, renderCommand])
)

/**
 * Every service the CLI needs.
 */
export const appLayer = Layer.mergeAll(Git.layer, Ffmpeg.layer, TerminalLogger.layer).pipe(
  Layer.provideMerge(NodeServices.layer)
)
