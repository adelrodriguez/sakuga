import * as Argument from "effect/cli/Argument"
import * as Command from "effect/cli/Command"
import * as Flag from "effect/cli/Flag"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { renderFlags, renderWithFlags } from "#commands/render-options.ts"
import { loadGitHistoryBlocks } from "#lib/sources/git.ts"

const file = Argument.File("input", { mustExist: true }).pipe(
  Argument.withDescription("File to render git history from")
)

const commits = Flag.Int("commits").pipe(
  Flag.withAlias("c"),
  Flag.withDefault(10),
  Flag.withSchema(Schema.Int.check(Schema.isGreaterThanOrEqualTo(1))),
  Flag.withDescription("Number of commits to render")
)

const language = Flag.String("language").pipe(
  Flag.withAlias("l"),
  Flag.optional,
  Flag.withDescription("Override the language used for syntax highlighting")
)

const reverse = Flag.Boolean("reverse").pipe(
  Flag.withDefault(false),
  Flag.withDescription("Render from newest to oldest commit")
)

export default Command.make("git", { ...renderFlags, commits, file, language, reverse }).pipe(
  Command.withDescription("Render a video from git history for a file"),
  Command.withHandler((flags) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(`Loading ${flags.commits} commits from ${flags.file}...`)
      const codeBlocks = yield* loadGitHistoryBlocks({
        commits: flags.commits,
        language: flags.language,
        path: flags.file,
        reverse: flags.reverse,
      })

      yield* renderWithFlags(flags.file, codeBlocks, flags)
    })
  )
)
