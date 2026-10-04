import { createCanvas } from "@napi-rs/canvas"

/**
 * The subset of the 2D canvas API that scenes use. Tests provide a fake.
 */
export interface CanvasContext {
  fillStyle: unknown
  font: string
  globalAlpha: number
  lineWidth: number
  strokeStyle: unknown
  textAlign: string
  textBaseline: string
  beginPath: () => void
  fillRect: (x: number, y: number, width: number, height: number) => void
  fillText: (text: string, x: number, y: number) => void
  lineTo: (x: number, y: number) => void
  measureText: (text: string) => { width: number }
  moveTo: (x: number, y: number) => void
  setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => void
  stroke: () => void
}

export interface Canvas {
  readonly context: CanvasContext
  /**
   * Copies the current RGBA pixels, so the canvas can draw the next frame while the copy is
   * written.
   */
  readonly snapshot: () => Uint8Array
}

export function makeCanvas(width: number, height: number): Canvas {
  const canvas = createCanvas(width, height)
  const context = canvas.getContext("2d")
  context.textRendering = "optimizeLegibility"

  return {
    context,
    snapshot: () => new Uint8Array(canvas.data()),
  }
}
