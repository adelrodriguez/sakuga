import type { BundledTheme } from "shiki"
import * as Schema from "effect/Schema"
import * as Flag from "effect/unstable/cli/Flag"

const DEFAULT_THEME: BundledTheme = "github-dark"
const DEFAULT_WIDTH = 0
const DEFAULT_HEIGHT = 0
const DEFAULT_FPS = 60
const DEFAULT_BLOCK_DURATION = 2
const DEFAULT_TRANSITION_DURATION_MS = 800
const DEFAULT_TRANSITION_DRIFT = 8
const DEFAULT_BACKGROUND = "#0b0b0b"
const DEFAULT_FONT_FAMILY =
  "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
const DEFAULT_FONT_SIZE = 24
const DEFAULT_FOREGROUND = "#e6e6e6"
const DEFAULT_LINE_HEIGHT = 34
const DEFAULT_PADDING = 64
const TAB_REPLACEMENT = "  "

export const background = Flag.string("background").pipe(
  Flag.withAlias("bg"),
  Flag.withDefault(DEFAULT_BACKGROUND),
  Flag.withDescription("Background color behind the code")
)

export const blockDuration = Flag.float("block-duration").pipe(
  Flag.withAlias("bd"),
  Flag.withDefault(DEFAULT_BLOCK_DURATION),
  Flag.withDescription("Seconds each code block stays on screen")
)

export const fontFamily = Flag.string("font-family").pipe(
  Flag.withAlias("ff"),
  Flag.withDefault(DEFAULT_FONT_FAMILY),
  Flag.withDescription("Font family for the text")
)

export const fontSize = Flag.integer("font-size").pipe(
  Flag.withAlias("fs"),
  Flag.withDefault(DEFAULT_FONT_SIZE),
  Flag.withDescription("Font size in pixels")
)

export const foreground = Flag.string("foreground").pipe(
  Flag.withAlias("fg"),
  Flag.withDefault(DEFAULT_FOREGROUND),
  Flag.withDescription("Default text color")
)

export const format = Flag.choice("format", ["mp4", "webm"] as const).pipe(
  Flag.withAlias("f"),
  Flag.withDefault("mp4"),
  Flag.withDescription("Output container format.")
)

export const fps = Flag.integer("fps").pipe(
  Flag.withAlias("r"),
  Flag.withDefault(DEFAULT_FPS),
  Flag.withDescription("Frames per second for the video")
)

export const height = Flag.integer("height").pipe(
  Flag.withAlias("h"),
  Flag.withDefault(DEFAULT_HEIGHT),
  Flag.withDescription("Minimum output height in pixels (0 = auto)")
)

export const lineHeight = Flag.integer("line-height").pipe(
  Flag.withAlias("lh"),
  Flag.withDefault(DEFAULT_LINE_HEIGHT),
  Flag.withDescription("Line height in pixels")
)

export const output = Flag.file("output").pipe(
  Flag.withAlias("o"),
  Flag.withDescription("Destination video path"),
  Flag.optional
)

export const padding = Flag.integer("padding").pipe(
  Flag.withAlias("p"),
  Flag.withDefault(DEFAULT_PADDING),
  Flag.withDescription("Padding around the code block in pixels")
)

export const tabReplacement = Flag.string("tab-replacement").pipe(
  Flag.withAlias("tb"),
  Flag.withDefault(TAB_REPLACEMENT),
  Flag.withDescription("Text used instead of tabs")
)

export const theme = Flag.string("theme").pipe(
  Flag.withAlias("t"),
  Flag.withDefault(DEFAULT_THEME),
  Flag.withDescription("Shiki theme for syntax highlighting")
)

export const transitionDrift = Flag.float("transition-drift").pipe(
  Flag.withAlias("td"),
  Flag.withDefault(DEFAULT_TRANSITION_DRIFT),
  Flag.withDescription("Pixel drift during transitions")
)

export const transitionDurationMs = Flag.integer("transition").pipe(
  Flag.withAlias("tr"),
  Flag.withDefault(DEFAULT_TRANSITION_DURATION_MS),
  Flag.withDescription("Transition time between slides in ms")
)

export const verbose = Flag.boolean("verbose").pipe(
  Flag.withAlias("v"),
  Flag.withDefault(false),
  Flag.withDescription("Show FFmpeg output and detailed logging")
)

export const width = Flag.integer("width").pipe(
  Flag.withAlias("w"),
  Flag.withDefault(DEFAULT_WIDTH),
  Flag.withDescription("Minimum output width in pixels (0 = auto)")
)

// Git-specific options

export const commits = Flag.integer("commits").pipe(
  Flag.withAlias("c"),
  Flag.withDefault(10),
  Flag.withSchema(Schema.Number.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(1)))),
  Flag.withDescription("Number of commits to render")
)

export const language = Flag.string("language").pipe(
  Flag.withAlias("l"),
  Flag.optional,
  Flag.withDescription("Override the language used for syntax highlighting")
)

export const reverse = Flag.boolean("reverse").pipe(
  Flag.withDescription("Render from newest to oldest commit"),
  Flag.withDefault(false)
)
