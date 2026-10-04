import * as Argument from "effect/cli/Argument"
import * as Command from "effect/cli/Command"
import * as Effect from "effect/Effect"
import { renderFlags, renderWithFlags } from "#commands/render-options.ts"
import { loadMarkdownCodeBlocks } from "#lib/sources/markdown.ts"

const file = Argument.File("input", { mustExist: true }).pipe(
  Argument.withDescription("Markdown file to render")
)

export default Command.make("render", { ...renderFlags, file }).pipe(
  Command.withDescription("Render a video from code blocks in a Markdown file"),
  Command.withHandler((flags) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(`Reading ${flags.file}...`)
      const codeBlocks = yield* loadMarkdownCodeBlocks(flags.file)

      yield* renderWithFlags(flags.file, codeBlocks, flags)
    })
  )
)
