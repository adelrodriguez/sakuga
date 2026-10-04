import type { LayoutToken, MeasuredScene, Scene } from "#lib/scene/model.ts"
import type { RenderConfig } from "#lib/shared/model.ts"

/**
 * Centers a measured scene in the frame and places each token on whole pixels.
 */
export function layoutScene(
  config: RenderConfig,
  measured: MeasuredScene,
  frameWidth: number,
  frameHeight: number
): Scene {
  const blockX = Math.max(0, Math.round((frameWidth - measured.blockWidth) / 2))
  const blockY = Math.max(0, Math.round((frameHeight - measured.blockHeight) / 2))

  const tokens = measured.lines.flatMap((line, lineIndex) => {
    // Accumulate unrounded widths so rounding errors do not add up along the line.
    let cursorX = blockX + config.padding
    const y = Math.round(blockY + config.padding + lineIndex * config.lineHeight)

    return line.tokens.map((token): LayoutToken => {
      const x = Math.round(cursorX)
      cursorX += token.width
      return { ...token, x, y }
    })
  })

  return { background: measured.background, tokens }
}
