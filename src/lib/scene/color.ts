const FALLBACK_COLOR = { alpha: 1, blue: 11, green: 11, red: 11 }

export function expandShortHex(hex: string) {
  if (hex.length !== 3 && hex.length !== 4) {
    return hex
  }

  return Array.from(hex, (digit) => digit + digit).join("")
}

export function parseHexColor(color: string) {
  const normalized = expandShortHex(color.replace("#", "").trim())
  if (normalized.length !== 6 && normalized.length !== 8) {
    return FALLBACK_COLOR
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  const alpha = normalized.length === 8 ? Number.parseInt(normalized.slice(6, 8), 16) / 255 : 1

  if ([red, green, blue, alpha].some((channel) => Number.isNaN(channel))) {
    return FALLBACK_COLOR
  }

  return { alpha, blue, green, red }
}

export function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress
}

export function blendColors(from: string, to: string, progress: number) {
  const fromColor = parseHexColor(from)
  const toColor = parseHexColor(to)

  const red = Math.round(lerp(fromColor.red, toColor.red, progress))
  const green = Math.round(lerp(fromColor.green, toColor.green, progress))
  const blue = Math.round(lerp(fromColor.blue, toColor.blue, progress))
  const alpha = lerp(fromColor.alpha, toColor.alpha, progress).toFixed(3)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
