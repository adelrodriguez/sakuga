import type { RenderConfig } from "#lib/shared/model.ts"

/**
 * Shiki `FontStyle` bit flags.
 */
const FONT_STYLE_ITALIC = 1
const FONT_STYLE_BOLD = 2
const FONT_STYLE_UNDERLINE = 4

export function readFontStyle(fontStyle: number) {
  return {
    isBold: (fontStyle & FONT_STYLE_BOLD) === FONT_STYLE_BOLD,
    isItalic: (fontStyle & FONT_STYLE_ITALIC) === FONT_STYLE_ITALIC,
    isUnderline: (fontStyle & FONT_STYLE_UNDERLINE) === FONT_STYLE_UNDERLINE,
  }
}

export function buildFont(config: RenderConfig, isItalic: boolean, isBold: boolean) {
  const style = `${isItalic ? "italic " : ""}${isBold ? "bold " : ""}`
  return `${style}${config.fontSize}px ${config.fontFamily}`
}
