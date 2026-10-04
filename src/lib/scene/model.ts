export type TokenCategory =
  | "keyword"
  | "function"
  | "type"
  | "string"
  | "number"
  | "comment"
  | "punctuation"
  | "operator"
  | "identifier"
  | "other"

export interface MeasuredToken {
  readonly category: TokenCategory
  readonly color: string
  readonly content: string
  readonly fontStyle: number
  readonly width: number
}

export interface MeasuredLine {
  readonly tokens: readonly MeasuredToken[]
  readonly width: number
}

export interface MeasuredScene {
  readonly background: string
  readonly blockHeight: number
  readonly blockWidth: number
  readonly lines: readonly MeasuredLine[]
}

export interface LayoutToken extends MeasuredToken {
  readonly x: number
  readonly y: number
}

export interface Scene {
  readonly background: string
  readonly tokens: readonly LayoutToken[]
}

export interface DrawToken {
  readonly color: string
  readonly content: string
  readonly fontStyle: number
  readonly opacity: number
  readonly width: number
  readonly x: number
  readonly y: number
}

export interface TokenMatch {
  readonly from: LayoutToken
  readonly to: LayoutToken
}

export interface TransitionDiff {
  readonly added: readonly LayoutToken[]
  readonly matched: readonly TokenMatch[]
  readonly removed: readonly LayoutToken[]
}

export interface Frame {
  readonly background: string
  readonly tokens: readonly DrawToken[]
}
