import { describe, expect, it } from "bun:test"
import { renderConfig } from "#__tests__/fixtures.ts"
import { buildFont, readFontStyle } from "#lib/scene/font.ts"

describe("buildFont", () => {
  it("builds the default font string", () => {
    expect(buildFont(renderConfig, false, false)).toBe(
      `${renderConfig.fontSize}px ${renderConfig.fontFamily}`
    )
  })

  it("adds italic and bold styles", () => {
    expect(buildFont(renderConfig, true, true)).toBe(
      `italic bold ${renderConfig.fontSize}px ${renderConfig.fontFamily}`
    )
  })
})

describe("readFontStyle", () => {
  it("reads Shiki font style flags", () => {
    expect(readFontStyle(0)).toEqual({ isBold: false, isItalic: false, isUnderline: false })
    expect(readFontStyle(1 | 2 | 4)).toEqual({ isBold: true, isItalic: true, isUnderline: true })
  })
})
