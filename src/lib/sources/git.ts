import type * as Option from "effect/Option"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import * as ChildProcess from "effect/process/ChildProcess"
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner"
import * as Stream from "effect/Stream"
import type { CodeBlock } from "#lib/shared/model.ts"
import {
  GitCommandFailed,
  GitRepositoryNotFound,
  NoCodeBlocksFound,
  NoGitCommitsFound,
} from "#lib/shared/errors.ts"
import { resolveFileLanguage } from "#lib/sources/language.ts"

const GIT_BINARY = "git"
const REVISION_PATTERN = /([a-f0-9]{40})\n+([^\n]+)/gi

export interface GitRevision {
  readonly commit: string
  /**
   * The file path at this commit, which differs from the current path after a rename.
   */
  readonly path: string
}

interface GitService {
  readonly repositoryRoot: (directory: string) => Effect.Effect<string, GitRepositoryNotFound>
  readonly fileHistory: (options: {
    readonly count: number
    readonly path: string
    readonly repositoryRoot: string
  }) => Effect.Effect<readonly GitRevision[], GitCommandFailed | NoGitCommitsFound>
  readonly show: (options: {
    readonly repositoryRoot: string
    readonly revision: GitRevision
  }) => Effect.Effect<string, GitCommandFailed>
}

export class Git extends Context.Service<Git, GitService>()("sakuga/Git") {
  static readonly layer = Layer.effect(this)(
    Effect.gen(function* () {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner

      const run = Effect.fn("Git.run")(function* (cwd: string, args: readonly string[]) {
        const [stdout, stderr, exitCode] = yield* Effect.scoped(
          Effect.gen(function* () {
            const handle = yield* spawner.spawn(
              ChildProcess.make(GIT_BINARY, args, {
                cwd,
                stderr: "pipe",
                stdin: "ignore",
                stdout: "pipe",
              })
            )

            return yield* Effect.all(
              [
                Stream.mkString(Stream.decodeText(handle.stdout)),
                Stream.mkString(Stream.decodeText(handle.stderr)),
                handle.exitCode,
              ],
              { concurrency: "unbounded" }
            )
          })
        ).pipe(Effect.mapError((cause) => new GitCommandFailed({ args, cause })))

        if (exitCode !== ChildProcessSpawner.ExitCode(0)) {
          return yield* new GitCommandFailed({ args, exitCode, stderr })
        }

        return stdout
      })

      const repositoryRoot = Effect.fn("Git.repositoryRoot")(function* (directory: string) {
        const output = yield* run(directory, ["rev-parse", "--show-toplevel"]).pipe(
          Effect.mapError(() => new GitRepositoryNotFound({ path: directory }))
        )
        const root = output.trim()

        if (!root) {
          return yield* new GitRepositoryNotFound({ path: directory })
        }

        return root
      })

      const fileHistory = Effect.fn("Git.fileHistory")(function* (options: {
        readonly count: number
        readonly path: string
        readonly repositoryRoot: string
      }) {
        // `--name-only` records the path at each commit, which changes across renames.
        const output = yield* run(options.repositoryRoot, [
          "log",
          "--follow",
          `-n${options.count}`,
          "--pretty=format:%H",
          "--name-only",
          "--",
          options.path,
        ])
        const revisions = Array.from(output.matchAll(REVISION_PATTERN), ([, commit, path]) =>
          commit && path ? [{ commit, path }] : []
        ).flat()

        if (revisions.length === 0) {
          return yield* new NoGitCommitsFound({ path: options.path })
        }

        return revisions
      })

      const show = Effect.fn("Git.show")(function* (options: {
        readonly repositoryRoot: string
        readonly revision: GitRevision
      }) {
        const { commit, path } = options.revision
        return yield* run(options.repositoryRoot, ["show", `${commit}:${path}`])
      })

      return Git.of({ fileHistory, repositoryRoot, show })
    })
  )
}

export interface GitHistoryOptions {
  readonly commits: number
  readonly language: Option.Option<string>
  readonly path: string
  /**
   * Order revisions from newest to oldest instead of oldest to newest.
   */
  readonly reverse: boolean
}

/**
 * Loads the contents of a file at each of its most recent commits, one code block per commit.
 */
export const loadGitHistoryBlocks = Effect.fn("Git.loadHistoryBlocks")(function* (
  options: GitHistoryOptions
) {
  const git = yield* Git
  const path = yield* Path.Path
  const absolutePath = path.resolve(options.path)
  const repositoryRoot = yield* git.repositoryRoot(path.dirname(absolutePath))
  const relativePath = path.relative(repositoryRoot, absolutePath)

  if (!relativePath || relativePath.startsWith("..")) {
    return yield* new GitRepositoryNotFound({ path: options.path })
  }

  const language = yield* resolveFileLanguage(relativePath, options.language)
  const history = yield* git.fileHistory({
    count: options.commits,
    path: relativePath,
    repositoryRoot,
  })
  const revisions = options.reverse ? history : history.toReversed()

  const blocks = yield* Effect.forEach(
    revisions,
    (revision) =>
      git
        .show({ repositoryRoot, revision })
        .pipe(Effect.map((code): CodeBlock => ({ code, language }))),
    { concurrency: 4 }
  )

  if (blocks.length === 0) {
    return yield* new NoCodeBlocksFound({ path: options.path, source: "git" })
  }

  return blocks
})
