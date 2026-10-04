import { describe, expect, it } from "bun:test"
import * as NodePath from "@effect/platform-node/NodePath"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { UnsupportedFileExtension, UnsupportedLanguage } from "#lib/shared/errors.ts"
import { normalizeLanguage, resolveFileLanguage } from "#lib/sources/language.ts"

function resolve(filePath: string, override?: string) {
  return resolveFileLanguage(filePath, Option.fromNullishOr(override)).pipe(
    Effect.provide(NodePath.layer)
  )
}

describe("normalizeLanguage", () => {
  it("trims and lowercases language tags", () => {
    expect(normalizeLanguage("  TS  ")).toBe("ts")
    expect(normalizeLanguage('tsx title="app.tsx"')).toBe("tsx")
  })

  it("handles empty language", () => {
    expect(normalizeLanguage("  ")).toBe("")
  })
})

describe("resolveFileLanguage", () => {
  it("uses file extension when present", () => {
    expect(Effect.runSync(resolve("src/index.ts"))).toBe("ts")
  })

  it("honors language overrides", () => {
    expect(Effect.runSync(resolve("src/index.ts", "TSX"))).toBe("tsx")
  })

  it("fails when extension is missing", () => {
    expect(Effect.runSync(Effect.flip(resolve("LICENSE")))).toBeInstanceOf(UnsupportedFileExtension)
  })

  it("fails for unsupported language overrides", () => {
    const error = Effect.runSync(Effect.flip(resolve("src/index.ts", "nope")))

    expect(error).toBeInstanceOf(UnsupportedLanguage)
    expect(error).toMatchObject({ language: "nope" })
  })
})
