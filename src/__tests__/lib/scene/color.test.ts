import { describe, expect, it } from "bun:test"
import { blendColors, expandShortHex, parseHexColor } from "#lib/scene/color.ts"

describe("color helpers", () => {
  it("expands short hex", () => {
    expect(expandShortHex("abc")).toBe("aabbcc")
    expect(expandShortHex("abcd")).toBe("aabbccdd")
    expect(expandShortHex("aabbcc")).toBe("aabbcc")
  })

  it("parses hex color", () => {
    expect(parseHexColor("#ff8800")).toEqual({ alpha: 1, blue: 0, green: 136, red: 255 })
  })

  it("falls back for invalid colors", () => {
    expect(parseHexColor("#zz")).toEqual({ alpha: 1, blue: 11, green: 11, red: 11 })
    expect(parseHexColor("#gggggg")).toEqual({ alpha: 1, blue: 11, green: 11, red: 11 })
  })

  it("blends colors", () => {
    expect(blendColors("#000000", "#ffffff", 0.5)).toBe("rgba(128, 128, 128, 1.000)")
  })
})
