import * as Effect from "effect/Effect"
import { codeToTokens, type BundledTheme, type ThemedToken } from "shiki"
import type { CanvasContext } from "#lib/scene/canvas.ts"
import type { MeasuredLine, MeasuredScene, MeasuredToken } from "#lib/scene/model.ts"
import type { CodeBlock, RenderConfig } from "#lib/shared/model.ts"
import { buildFont, readFontStyle } from "#lib/scene/font.ts"
import { categorizeToken } from "#lib/scene/token.ts"
import { SceneMeasureFailed } from "#lib/shared/errors.ts"

function tokenScopes(token: ThemedToken) {
  return (
    token.explanation?.flatMap((explanation) => explanation.scopes.map((scope) => scope.scopeName))
    ?? []
  )
}

function measureLine(
  config: RenderConfig,
  context: CanvasContext,
  lineTokens: readonly ThemedToken[],
  foreground: string
): MeasuredLine {
  const tokens: MeasuredToken[] = []

  for (const token of lineTokens) {
    const content = token.content.split("\t").join(config.tabReplacement)
    if (!content) {
      continue
    }

    const fontStyle = token.fontStyle ?? 0
    const { isBold, isItalic } = readFontStyle(fontStyle)
    context.font = buildFont(config, isItalic, isBold)

    tokens.push({
      category: categorizeToken(tokenScopes(token)),
      color: token.color ?? foreground,
      content,
      fontStyle,
      width: context.measureText(content).width,
    })
  }

  return { tokens, width: tokens.reduce((total, token) => total + token.width, 0) }
}

/**
 * Highlights a code block and measures every token with the configured font.
 */
export const measureScene = Effect.fn("Scene.measure")(function* (
  config: RenderConfig,
  context: CanvasContext,
  codeBlock: CodeBlock,
  theme: BundledTheme
) {
  const highlighted = yield* Effect.tryPromise({
    catch: (cause) => new SceneMeasureFailed({ cause }),
    try: () =>
      codeToTokens(codeBlock.code, {
        includeExplanation: "scopeName",
        lang: codeBlock.language,
        theme,
      }),
  })

  const foreground = highlighted.fg ?? config.foreground
  const lines = highlighted.tokens.map((lineTokens) =>
    measureLine(config, context, lineTokens, foreground)
  )
  const contentWidth = Math.max(0, ...lines.map((line) => line.width))
  const contentHeight = lines.length * config.lineHeight

  return {
    background: highlighted.bg ?? config.background,
    blockHeight: contentHeight + config.padding * 2,
    blockWidth: contentWidth + config.padding * 2,
    lines,
  } satisfies MeasuredScene
})

/**
 * Sizes the video to fit the largest scene, but never below the configured minimum.
 */
export function resolveFrameSize(config: RenderConfig, scenes: readonly MeasuredScene[]) {
  return {
    height: Math.max(config.height, Math.ceil(Math.max(0, ...scenes.map((s) => s.blockHeight)))),
    width: Math.max(config.width, Math.ceil(Math.max(0, ...scenes.map((s) => s.blockWidth)))),
  }
}
