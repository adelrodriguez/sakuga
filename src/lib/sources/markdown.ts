import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import { marked } from "marked"
import type { CodeBlock } from "#lib/shared/model.ts"
import {
  InputReadFailed,
  MarkdownParseFailed,
  MissingCodeBlockLanguage,
  NoCodeBlocksFound,
  UnsupportedLanguage,
} from "#lib/shared/errors.ts"
import { isSupportedLanguage, normalizeLanguage } from "#lib/sources/language.ts"

export const parseMarkdownCodeBlocks = Effect.fn("Markdown.parseCodeBlocks")(function* (
  markdown: string
) {
  const tokens = yield* Effect.try({
    catch: (cause) => new MarkdownParseFailed({ cause }),
    try: () => marked.lexer(markdown),
  })
  const blocks: CodeBlock[] = []

  for (const token of tokens) {
    if (token.type !== "code") {
      continue
    }

    const block = blocks.length + 1

    const rawLanguage = typeof token.lang === "string" ? token.lang.trim() : ""
    const language = normalizeLanguage(rawLanguage)

    if (!language) {
      return yield* new MissingCodeBlockLanguage({ block })
    }

    if (!isSupportedLanguage(language)) {
      return yield* new UnsupportedLanguage({ language: rawLanguage })
    }

    blocks.push({ code: token.text, language })
  }

  return blocks
})

/**
 * Reads a Markdown file and returns its fenced code blocks in document order.
 */
export const loadMarkdownCodeBlocks = Effect.fn("Markdown.loadCodeBlocks")(function* (
  path: string
) {
  const fileSystem = yield* FileSystem.FileSystem
  const markdown = yield* fileSystem
    .readFileString(path)
    .pipe(Effect.mapError((cause) => new InputReadFailed({ cause, path })))
  const blocks = yield* parseMarkdownCodeBlocks(markdown)

  if (blocks.length === 0) {
    return yield* new NoCodeBlocksFound({ path, source: "markdown" })
  }

  return blocks
})
