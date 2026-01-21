import { Args, Command } from "@effect/cli"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import { Console, Effect, Option } from "effect"
import type { RenderConfig } from "../lib/types"
import { InvalidTransitionDuration, NoCodeBlocksFound } from "../lib/errors"
import { parseMarkdownCodeBlocks } from "../lib/markdown"
import { resolveTheme } from "../lib/theme"
import { renderVideo } from "../lib/video"
import {
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
  width,
} from "./options"

const file = Args.file({ exists: "yes", name: "input" }).pipe(
  Args.withDescription("Markdown file to render")
)

export default Command.make("render", {
  background,
  blockDuration,
  file,
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
  width,
}).pipe(
  Command.withDescription("Render a video from code blocks in a Markdown file"),
  Command.withHandler(
    ({
      background,
      blockDuration,
      file,
      fontFamily,
      fontSize,
      foreground,
      fps,
      height,
      lineHeight,
      output,
      padding,
      tabReplacement,
      theme,
      transitionDrift,
      transitionDurationMs,
      width,
      format,
    }) =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem
        const path = yield* Path.Path

        const markdown = yield* fileSystem.readFileString(file)
        const blocks = yield* parseMarkdownCodeBlocks(markdown)

        if (blocks.length === 0) {
          return yield* new NoCodeBlocksFound({ path: file })
        }

        if (transitionDurationMs <= 0) {
          return yield* new InvalidTransitionDuration({
            duration: transitionDurationMs,
            minimum: 1,
          })
        }

        const resolvedTheme = yield* resolveTheme(theme)
        const outputPath = Option.match(output, {
          onNone: () => {
            const parsed = path.parse(file)
            return path.join(parsed.dir, `${parsed.name}.${format}`)
          },
          onSome: (value) => value,
        })

        const renderConfig: RenderConfig = {
          background,
          blockDuration,
          fontFamily,
          fontSize,
          foreground,
          fps,
          height,
          lineHeight,
          padding,
          tabReplacement,
          transitionDrift,
          transitionDurationMs,
          width,
        }

        yield* Console.log(`Rendering ${blocks.length} code blocks to ${outputPath}...`)
        yield* renderVideo(outputPath, resolvedTheme, blocks, renderConfig, { format })
        yield* Console.log(`Video created at ${outputPath}`)
      }).pipe(
        Effect.catchTags({
          BadArgument: (error) => Console.error(`Invalid file argument: ${error.message}`),
          FfmpegRenderFailed: (error) => {
            const stageMessage = {
              finish: "finalizing the video file",
              init: "starting the FFmpeg process",
              stream: "writing video frames",
            }[error.stage]

            let message = `FFmpeg failed while ${stageMessage}.\n`
            message += `  Output: ${error.outputPath}\n`
            message += `  Format: ${error.format}`

            if (error.exitCode !== undefined) {
              message += `\n  Exit code: ${error.exitCode}`
            }
            if (error.signal) {
              message += `\n  Signal: ${error.signal}`
            }

            return Console.error(message)
          },
          InvalidTransitionDuration: (error) =>
            Console.error(
              `Invalid transition duration: ${error.duration}ms.\n` +
                `  Minimum allowed: ${error.minimum}ms`
            ),
          MissingCodeBlockLanguage: (error) =>
            Console.error(
              `Missing language in code block.\n` +
                `  ${error.detail ?? "Every fenced code block needs a language (e.g., ```typescript)."}\n` +
                `  See supported languages: https://shiki.style/languages`
            ),
          MissingFfmpeg: () =>
            Console.error(
              `FFmpeg is not installed or not in PATH.\n` +
                `  Install FFmpeg to render videos: https://ffmpeg.org/download.html`
            ),
          NoCodeBlocksFound: (error) =>
            Console.error(
              `No code blocks found${error.path ? ` in ${error.path}` : ""}.\n` +
                `  Add fenced code blocks with a language to your markdown file.`
            ),
          SceneMeasureFailed: (error) => {
            const details =
              error.cause instanceof Error ? `\n  Details: ${error.cause.message}` : ""
            return Console.error(
              `Failed to process code block.\n  The syntax highlighter could not tokenize the code.${details}`
            )
          },
          SystemError: (error) =>
            Console.error(
              `Failed to read input file.\n` +
                `  Path: ${error.pathOrDescriptor}\n` +
                `  Reason: ${error.reason}`
            ),
          UnknownTheme: (error) =>
            Console.error(
              `Unknown theme: "${error.theme}".\n` +
                `  See available themes: https://shiki.style/themes`
            ),
          UnsupportedLanguage: (error) =>
            Console.error(
              `Unsupported language: "${error.language}".\n` +
                `  See supported languages: https://shiki.style/languages`
            ),
        })
      )
  )
)
