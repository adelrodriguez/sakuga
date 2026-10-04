import { describe, expect, it } from "bun:test"
import * as NodePath from "@effect/platform-node/NodePath"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type { GitHistoryOptions } from "#lib/sources/git.ts"
import { GitRepositoryNotFound } from "#lib/shared/errors.ts"
import { Git, loadGitHistoryBlocks } from "#lib/sources/git.ts"

const repositoryRoot = "/repo"

// Newest first, like `git log`. The file was renamed from `old.ts` in the first commit.
const history = [
  { commit: "c".repeat(40), path: "src/app.ts" },
  { commit: "b".repeat(40), path: "src/app.ts" },
  { commit: "a".repeat(40), path: "src/old.ts" },
]

const gitLayer = Layer.succeed(Git)(
  Git.of({
    fileHistory: ({ count }) => Effect.succeed(history.slice(0, count)),
    repositoryRoot: () => Effect.succeed(repositoryRoot),
    show: ({ revision }) => Effect.succeed(`// ${revision.path}@${revision.commit.charAt(0)}`),
  })
)

function load(options: Partial<GitHistoryOptions> = {}) {
  return loadGitHistoryBlocks({
    commits: 10,
    language: Option.none(),
    path: `${repositoryRoot}/src/app.ts`,
    reverse: false,
    ...options,
  }).pipe(Effect.provide(Layer.mergeAll(gitLayer, NodePath.layer)))
}

describe("loadGitHistoryBlocks", () => {
  it("loads each revision from oldest to newest", async () => {
    const blocks = await Effect.runPromise(load())

    expect(blocks.map((block) => block.code)).toEqual([
      "// src/old.ts@a",
      "// src/app.ts@b",
      "// src/app.ts@c",
    ])
    expect(blocks.every((block) => block.language === "ts")).toBe(true)
  })

  it("loads newest first when reversed and honors the commit count", async () => {
    const blocks = await Effect.runPromise(load({ commits: 2, reverse: true }))

    expect(blocks.map((block) => block.code)).toEqual(["// src/app.ts@c", "// src/app.ts@b"])
  })

  it("uses the language override", async () => {
    const blocks = await Effect.runPromise(load({ language: Option.some("tsx") }))

    expect(blocks[0]?.language).toBe("tsx")
  })

  it("fails for files outside the repository", async () => {
    const error = await Effect.runPromise(Effect.flip(load({ path: "/elsewhere/app.ts" })))

    expect(error).toBeInstanceOf(GitRepositoryNotFound)
  })
})
