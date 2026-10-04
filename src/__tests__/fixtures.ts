import type { LayoutToken, TokenCategory } from "#lib/scene/model.ts"
import type { RenderConfig } from "#lib/shared/model.ts"

export const renderConfig: RenderConfig = {
  background: "#0b0b0b",
  blockDuration: 2,
  fontFamily:
    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  fontSize: 24,
  foreground: "#e6e6e6",
  fps: 60,
  height: 0,
  lineHeight: 34,
  padding: 64,
  tabReplacement: "  ",
  transitionDrift: 8,
  transitionDurationMs: 800,
  width: 0,
}

export function layoutToken(category: TokenCategory, content: string, x: number): LayoutToken {
  return { category, color: "#fff", content, fontStyle: 0, width: 10, x, y: 0 }
}
