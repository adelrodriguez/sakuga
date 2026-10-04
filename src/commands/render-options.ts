import * as Flag from "effect/cli/Flag"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
import * as References from "effect/References"
import * as Schema from "effect/Schema"
import type { CodeBlock, RenderConfig, VideoFormat } from "#lib/shared/model.ts"
import { resolveTheme } from "#lib/scene/theme.ts"
import { VIDEO_FORMATS } from "#lib/shared/model.ts"
import { renderVideo } from "#lib/video/render.ts"

const PositiveInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1))

export const background = Flag.String("background").pipe(
  Flag.withAlias("bg"),
  Flag.withDefault("#0b0b0b"),
  Flag.withDescription("Background color behind the code")
)

export const blockDuration = Flag.Finite("block-duration").pipe(
  Flag.withAlias("bd"),
  Flag.withDefault(2),
  Flag.withDescription("Seconds each code block stays on screen")
)

export const fontFamily = Flag.String("font-family").pipe(
  Flag.withAlias("ff"),
  Flag.withDefault(
    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
  ),
  Flag.withDescription("Font family for the text")
)

export const fontSize = Flag.Int("font-size").pipe(
  Flag.withAlias("fs"),
  Flag.withDefault(24),
  Flag.withDescription("Font size in pixels")
)

export const foreground = Flag.String("foreground").pipe(
  Flag.withAlias("fg"),
  Flag.withDefault("#e6e6e6"),
  Flag.withDescription("Default text color")
)

export const format = Flag.Literals("format", VIDEO_FORMATS).pipe(
  Flag.withAlias("f"),
  Flag.withDefault("mp4"),
  Flag.withDescription("Output container format")
)

export const fps = Flag.Int("fps").pipe(
  Flag.withAlias("r"),
  Flag.withDefault(60),
  Flag.withSchema(PositiveInt),
  Flag.withDescription("Frames per second for the video")
)

export const height = Flag.Int("height").pipe(
  Flag.withAlias("h"),
  Flag.withDefault(0),
  Flag.withDescription("Minimum output height in pixels (0 = auto)")
)

export const lineHeight = Flag.Int("line-height").pipe(
  Flag.withAlias("lh"),
  Flag.withDefault(34),
  Flag.withDescription("Line height in pixels")
)

export const output = Flag.File("output").pipe(
  Flag.withAlias("o"),
  Flag.withDescription("Destination video path"),
  Flag.optional
)

export const padding = Flag.Int("padding").pipe(
  Flag.withAlias("p"),
  Flag.withDefault(64),
  Flag.withDescription("Padding around the code block in pixels")
)

export const tabReplacement = Flag.String("tab-replacement").pipe(
  Flag.withAlias("tb"),
  Flag.withDefault("  "),
  Flag.withDescription("Text used instead of tabs")
)

export const theme = Flag.String("theme").pipe(
  Flag.withAlias("t"),
  Flag.withDefault("github-dark"),
  Flag.withDescription("Shiki theme for syntax highlighting")
)

export const transitionDrift = Flag.Finite("transition-drift").pipe(
  Flag.withAlias("td"),
  Flag.withDefault(8),
  Flag.withDescription("Pixel drift during transitions")
)

export const transitionDurationMs = Flag.Int("transition").pipe(
  Flag.withAlias("tr"),
  Flag.withDefault(800),
  Flag.withSchema(PositiveInt),
  Flag.withDescription("Transition time between slides in ms")
)

export const verbose = Flag.Boolean("verbose").pipe(
  Flag.withAlias("v"),
  Flag.withDefault(false),
  Flag.withDescription("Show FFmpeg output and detailed logging")
)

export const width = Flag.Int("width").pipe(
  Flag.withAlias("w"),
  Flag.withDefault(0),
  Flag.withDescription("Minimum output width in pixels (0 = auto)")
)

/**
 * Flags shared by every command that renders a video.
 */
export const renderFlags = {
  background,
  blockDuration,
  fontFamily,
  fontSize,
  foreground,
  format,
  fps,
  height,
  lineHeight,
  output,
  padding,
  tabReplacement,
  theme,
  transitionDrift,
  transitionDurationMs,
  verbose,
  width,
}

export interface RenderFlags {
  readonly background: string
  readonly blockDuration: number
  readonly fontFamily: string
  readonly fontSize: number
  readonly foreground: string
  readonly format: VideoFormat
  readonly fps: number
  readonly height: number
  readonly lineHeight: number
  readonly output: Option.Option<string>
  readonly padding: number
  readonly tabReplacement: string
  readonly theme: string
  readonly transitionDrift: number
  readonly transitionDurationMs: number
  readonly verbose: boolean
  readonly width: number
}

/**
 * Renders code blocks read from `input` with the shared render flags, and reports the result.
 */
export const renderWithFlags = Effect.fn("renderWithFlags")(
  function* (input: string, codeBlocks: readonly CodeBlock[], flags: RenderFlags) {
    const path = yield* Path.Path
    const theme = yield* resolveTheme(flags.theme)
    const outputPath = Option.getOrElse(flags.output, () => {
      const parsed = path.parse(input)
      return path.join(parsed.dir, `${parsed.name}.${flags.format}`)
    })
    const config: RenderConfig = {
      background: flags.background,
      blockDuration: flags.blockDuration,
      fontFamily: flags.fontFamily,
      fontSize: flags.fontSize,
      foreground: flags.foreground,
      fps: flags.fps,
      height: flags.height,
      lineHeight: flags.lineHeight,
      padding: flags.padding,
      tabReplacement: flags.tabReplacement,
      transitionDrift: flags.transitionDrift,
      transitionDurationMs: flags.transitionDurationMs,
      width: flags.width,
    }

    yield* renderVideo({
      codeBlocks,
      config,
      format: flags.format,
      outputPath,
      theme,
      verbose: flags.verbose,
    })
    yield* Console.log(`Video created at ${outputPath}`)
  },
  (effect, _input, _codeBlocks, flags) =>
    flags.verbose ? Effect.provideService(effect, References.MinimumLogLevel, "Debug") : effect
)
