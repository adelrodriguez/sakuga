import { describe, expect, it } from "bun:test"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { UnknownTheme } from "../errors"
import { resolveTheme } from "../theme"

describe("resolveTheme", () => {
  it("returns theme when supported", () => {
    const result = Effect.runSync(resolveTheme("github-dark"))

    expect(result).toBe("github-dark")
  })

  it("fails when theme is unknown", () => {
    const exit = Effect.runSyncExit(resolveTheme("not-a-theme"))

    expect(exit._tag).toBe("Failure")
    if (Exit.isFailure(exit)) {
      const fail = exit.cause.reasons.find(Cause.isFailReason)
      expect(fail?.error).toBeInstanceOf(UnknownTheme)
    }
  })
})
