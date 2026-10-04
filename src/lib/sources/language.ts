import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
import { bundledLanguages, type BundledLanguage } from "shiki"
import { UnsupportedFileExtension, UnsupportedLanguage } from "#lib/shared/errors.ts"

export function isSupportedLanguage(language: string): language is BundledLanguage {
  return Object.hasOwn(bundledLanguages, language)
}

/**
 * Reduces an info string such as ` TS title="x" ` to its lowercase language tag.
 */
export function normalizeLanguage(rawLanguage: string) {
  const [primary = ""] = rawLanguage.trim().split(/\s+/)
  return primary.toLowerCase()
}

/**
 * Picks the highlighting language for a file from an explicit override, or from its extension.
 */
export const resolveFileLanguage = Effect.fn("Language.resolveFileLanguage")(function* (
  filePath: string,
  override: Option.Option<string>
) {
  const path = yield* Path.Path
  const requested = override.pipe(
    Option.map((language) => normalizeLanguage(language)),
    Option.filter((language) => language.length > 0)
  )
  const language = Option.getOrElse(requested, () =>
    normalizeLanguage(path.extname(filePath).replace(/^\./, ""))
  )

  if (!language) {
    return yield* new UnsupportedFileExtension({ path: filePath })
  }

  if (!isSupportedLanguage(language)) {
    return yield* new UnsupportedLanguage({ language: Option.getOrElse(override, () => language) })
  }

  return language
})
