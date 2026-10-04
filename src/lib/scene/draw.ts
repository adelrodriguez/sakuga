import type { CanvasContext } from "#lib/scene/canvas.ts"
import type { Frame } from "#lib/scene/model.ts"
import type { RenderConfig } from "#lib/shared/model.ts"
import { buildFont, readFontStyle } from "#lib/scene/font.ts"

export function drawUnderline(
  config: RenderConfig,
  context: CanvasContext,
  x: number,
  y: number,
  width: number
) {
  const previousStrokeStyle = context.strokeStyle
  const previousLineWidth = context.lineWidth
  const underlineY = y + config.fontSize + 2

  context.strokeStyle = context.fillStyle
  context.lineWidth = Math.max(1, Math.floor(config.fontSize / 12))
  context.beginPath()
  context.moveTo(x, underlineY)
  context.lineTo(x + width, underlineY)
  context.stroke()

  context.strokeStyle = previousStrokeStyle
  context.lineWidth = previousLineWidth
}

/**
 * Paints one frame over the whole canvas.
 */
export function drawFrame(
  config: RenderConfig,
  context: CanvasContext,
  width: number,
  height: number,
  frame: Frame
) {
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.globalAlpha = 1
  context.fillStyle = frame.background
  context.fillRect(0, 0, width, height)
  context.textBaseline = "top"
  context.textAlign = "left"

  for (const token of frame.tokens) {
    const { isBold, isItalic, isUnderline } = readFontStyle(token.fontStyle)
    const x = Math.round(token.x)
    const y = Math.round(token.y)

    context.globalAlpha = token.opacity
    context.font = buildFont(config, isItalic, isBold)
    context.fillStyle = token.color
    context.fillText(token.content, x, y)

    if (isUnderline && token.width > 0) {
      drawUnderline(config, context, x, y, token.width)
    }
  }
}
