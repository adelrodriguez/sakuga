import type { TokenCategory } from "#lib/scene/model.ts"

const SCOPE_TO_CATEGORY: ReadonlyArray<readonly [RegExp, TokenCategory]> = [
  [/^keyword\.operator/, "operator"],
  [/^keyword\./, "keyword"],
  [/^storage\.type/, "keyword"],
  [/^storage\.modifier/, "keyword"],
  [/^entity\.name\.function/, "function"],
  [/^entity\.name\.type/, "type"],
  [/^entity\.name\.class/, "type"],
  [/^string\./, "string"],
  [/^constant\.numeric/, "number"],
  [/^comment\./, "comment"],
  [/^punctuation\./, "punctuation"],
  [/^meta\.brace/, "punctuation"],
  [/^variable\./, "identifier"],
  [/^entity\.name\./, "identifier"],
]

/**
 * Maps TextMate scopes to a coarse category, so transitions can morph tokens of the same kind.
 */
export function categorizeToken(scopes: readonly string[]): TokenCategory {
  // String delimiters are punctuation scopes nested in a string; keep them with the string.
  if (
    scopes.some(
      (scope) => scope.startsWith("string.") || scope.startsWith("punctuation.definition.string")
    )
  ) {
    return "string"
  }

  for (const scope of scopes.toReversed()) {
    const match = SCOPE_TO_CATEGORY.find(([pattern]) => pattern.test(scope))
    if (match) {
      return match[1]
    }
  }

  return "other"
}
