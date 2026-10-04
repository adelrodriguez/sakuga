import * as Effect from "effect/Effect"
import { bundledThemes, type BundledTheme } from "shiki"
import { UnknownTheme } from "#lib/shared/errors.ts"

function isSupportedTheme(theme: string): theme is BundledTheme {
  return Object.hasOwn(bundledThemes, theme)
}

export const resolveTheme = Effect.fn("Theme.resolve")(function* (theme: string) {
  const trimmed = theme.trim()

  if (!isSupportedTheme(trimmed)) {
    return yield* new UnknownTheme({ theme })
  }

  return trimmed
})
