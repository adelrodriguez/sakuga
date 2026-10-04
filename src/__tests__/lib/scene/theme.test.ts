import { describe, expect, it } from "bun:test"
import * as Effect from "effect/Effect"
import { resolveTheme } from "#lib/scene/theme.ts"
import { UnknownTheme } from "#lib/shared/errors.ts"

describe("resolveTheme", () => {
  it("returns theme when supported", () => {
    expect(Effect.runSync(resolveTheme(" github-dark "))).toBe("github-dark")
  })

  it("fails when theme is unknown", () => {
    const error = Effect.runSync(Effect.flip(resolveTheme("not-a-theme")))

    expect(error).toBeInstanceOf(UnknownTheme)
  })
})
