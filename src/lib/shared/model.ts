import type { BundledLanguage } from "shiki"

export const VIDEO_FORMATS = ["mp4", "webm"] as const
export type VideoFormat = (typeof VIDEO_FORMATS)[number]

export interface CodeBlock {
  readonly code: string
  readonly language: BundledLanguage
}

export interface RenderConfig {
  readonly background: string
  readonly blockDuration: number
  readonly fontFamily: string
  readonly fontSize: number
  readonly foreground: string
  readonly fps: number
  readonly height: number
  readonly lineHeight: number
  readonly padding: number
  readonly tabReplacement: string
  readonly transitionDrift: number
  readonly transitionDurationMs: number
  readonly width: number
}
