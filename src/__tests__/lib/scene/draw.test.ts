import { describe, expect, it } from "bun:test"
import type { CanvasContext } from "#lib/scene/canvas.ts"
import { renderConfig } from "#__tests__/fixtures.ts"
import { drawFrame, drawUnderline } from "#lib/scene/draw.ts"

function noop() {
  return null
}

function createContext() {
  const calls = {
    fillText: [] as Array<[string, number, number]>,
    lineTo: [] as Array<[number, number]>,
    lineWidthAtStroke: undefined as number | undefined,
    moveTo: [] as Array<[number, number]>,
    stroke: 0,
    strokeStyleAtStroke: undefined as unknown,
  }

  const context: CanvasContext = {
    beginPath: noop,
    fillRect: noop,
    fillStyle: "#f00",
    fillText: (text, x, y) => {
      calls.fillText.push([text, x, y])
    },
    font: "",
    globalAlpha: 1,
    lineTo: (x, y) => {
      calls.lineTo.push([x, y])
    },
    lineWidth: 5,
    measureText: () => ({ width: 0 }),
    moveTo: (x, y) => {
      calls.moveTo.push([x, y])
    },
    setTransform: noop,
    stroke: () => {
      calls.stroke += 1
      calls.strokeStyleAtStroke = context.strokeStyle
      calls.lineWidthAtStroke = context.lineWidth
    },
    strokeStyle: "#00f",
    textAlign: "left",
    textBaseline: "top",
  }

  return { calls, context }
}

describe("drawUnderline", () => {
  it("draws underline with computed style and restores context", () => {
    const { calls, context } = createContext()

    drawUnderline(renderConfig, context, 10, 20, 80)

    const underlineY = 20 + renderConfig.fontSize + 2
    expect(calls.moveTo).toEqual([[10, underlineY]])
    expect(calls.lineTo).toEqual([[90, underlineY]])
    expect(calls.stroke).toBe(1)
    expect(calls.strokeStyleAtStroke).toBe("#f00")
    expect(calls.lineWidthAtStroke).toBe(2)
    expect(context.strokeStyle).toBe("#00f")
    expect(context.lineWidth).toBe(5)
  })
})

describe("drawFrame", () => {
  it("draws every token on whole pixels and underlines underlined tokens", () => {
    const { calls, context } = createContext()

    drawFrame(renderConfig, context, 100, 100, {
      background: "#000",
      tokens: [
        { color: "#fff", content: "a", fontStyle: 0, opacity: 1, width: 10, x: 1.4, y: 2.6 },
        { color: "#fff", content: "b", fontStyle: 4, opacity: 0.5, width: 10, x: 12, y: 3 },
      ],
    })

    expect(calls.fillText).toEqual([
      ["a", 1, 3],
      ["b", 12, 3],
    ])
    expect(calls.stroke).toBe(1)
  })
})
