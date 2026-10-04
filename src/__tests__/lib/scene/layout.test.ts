import { describe, expect, it } from "bun:test"
import type { MeasuredScene } from "#lib/scene/model.ts"
import { renderConfig } from "#__tests__/fixtures.ts"
import { layoutScene } from "#lib/scene/layout.ts"
import { resolveFrameSize } from "#lib/scene/measure.ts"

function measuredScene(blockWidth: number, blockHeight: number): MeasuredScene {
  return { background: "#000", blockHeight, blockWidth, lines: [] }
}

describe("resolveFrameSize", () => {
  it("expands when content exceeds minimum size", () => {
    const config = { ...renderConfig, height: 720, width: 1280 }

    expect(resolveFrameSize(config, [measuredScene(1400, 900)])).toEqual({
      height: 900,
      width: 1400,
    })
  })

  it("keeps minimum size when content is smaller", () => {
    const config = { ...renderConfig, height: 720, width: 1280 }

    expect(resolveFrameSize(config, [measuredScene(700, 500)])).toEqual({
      height: 720,
      width: 1280,
    })
  })

  it("handles empty scenes", () => {
    expect(resolveFrameSize(renderConfig, [])).toEqual({ height: 0, width: 0 })
  })
})

describe("layoutScene", () => {
  it("centers the block and places tokens on whole pixels in order", () => {
    const measured: MeasuredScene = {
      ...measuredScene(300, 200),
      lines: [
        {
          tokens: [
            { category: "keyword", color: "#f00", content: "a", fontStyle: 0, width: 10.4 },
            { category: "keyword", color: "#f00", content: "b", fontStyle: 0, width: 10.4 },
            { category: "keyword", color: "#f00", content: "c", fontStyle: 0, width: 10.4 },
          ],
          width: 31.2,
        },
        {
          tokens: [{ category: "other", color: "#0f0", content: "d", fontStyle: 0, width: 5 }],
          width: 5,
        },
      ],
    }

    const scene = layoutScene(renderConfig, measured, 1280, 720)
    const left = (1280 - 300) / 2 + renderConfig.padding
    const top = (720 - 200) / 2 + renderConfig.padding

    expect(scene.tokens.map((token) => [token.content, token.x, token.y])).toEqual([
      ["a", left, top],
      ["b", left + 10, top],
      ["c", left + 21, top],
      ["d", left, top + renderConfig.lineHeight],
    ])
  })
})
