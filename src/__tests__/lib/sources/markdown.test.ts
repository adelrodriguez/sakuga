import { describe, expect, it } from "bun:test"
import * as Effect from "effect/Effect"
import { MissingCodeBlockLanguage, UnsupportedLanguage } from "#lib/shared/errors.ts"
import { parseMarkdownCodeBlocks } from "#lib/sources/markdown.ts"

describe("parseMarkdownCodeBlocks", () => {
  it("extracts fenced blocks with languages", () => {
    const markdown = ["```ts", "const value = 1", "```", "", "```js", "console.log(value)", "```"]

    const blocks = Effect.runSync(parseMarkdownCodeBlocks(markdown.join("\n")))

    expect(blocks.map((block) => block.language)).toEqual(["ts", "js"])
    expect(blocks[0]?.code).toBe("const value = 1")
  })

  it("fails when language is missing", () => {
    const markdown = ["```ts", "1", "```", "", "```", "console.log('nope')", "```"].join("\n")

    const error = Effect.runSync(Effect.flip(parseMarkdownCodeBlocks(markdown)))

    expect(error).toBeInstanceOf(MissingCodeBlockLanguage)
    expect(error).toMatchObject({ block: 2 })
  })

  it("fails when language is unsupported", () => {
    const markdown = ["```nope", "console.log('nope')", "```"].join("\n")

    const error = Effect.runSync(Effect.flip(parseMarkdownCodeBlocks(markdown)))

    expect(error).toBeInstanceOf(UnsupportedLanguage)
  })
})
