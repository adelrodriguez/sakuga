import { describe, expect, it } from "bun:test"
import * as NodePath from "@effect/platform-node/NodePath"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { UnsupportedFileExtension, UnsupportedLanguage } from "../errors"
import { resolveLanguage } from "../git"

const resolveLanguageSync = (filePath: string, override?: string) =>
  Effect.runSync(resolveLanguage(filePath, override).pipe(Effect.provide(NodePath.layer)))

const resolveLanguageExit = (filePath: string, override?: string) =>
  Effect.runSyncExit(resolveLanguage(filePath, override).pipe(Effect.provide(NodePath.layer)))

describe("resolveLanguage", () => {
  it("uses file extension when present", () => {
    const language = resolveLanguageSync("src/index.ts")
    expect(language).toBe("ts")
  })

  it("fails when extension is missing", () => {
    const exit = resolveLanguageExit("LICENSE")
    expect(exit._tag).toBe("Failure")
    if (Exit.isFailure(exit)) {
      const errors = Chunk.toArray(Cause.failures(exit.cause))
      expect(errors[0]).toBeInstanceOf(UnsupportedFileExtension)
    }
  })

  it("honors language overrides", () => {
    const language = resolveLanguageSync("src/index.ts", "tsx")
    expect(language).toBe("tsx")
  })

  it("fails for unsupported language overrides", () => {
    const exit = resolveLanguageExit("src/index.ts", "nope")
    expect(exit._tag).toBe("Failure")
    if (Exit.isFailure(exit)) {
      const errors = Chunk.toArray(Cause.failures(exit.cause))
      expect(errors[0]).toBeInstanceOf(UnsupportedLanguage)
    }
  })
})
