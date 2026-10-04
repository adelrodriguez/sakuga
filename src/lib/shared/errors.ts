import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import { VIDEO_FORMATS } from "#lib/shared/model.ts"

const SHIKI_LANGUAGES_URL = "https://shiki.style/languages"
const SHIKI_THEMES_URL = "https://shiki.style/themes"

export class InputReadFailed extends Schema.TaggedError<InputReadFailed>()("InputReadFailed", {
  cause: Schema.Defect(),
  path: Schema.String,
}) {
  override get message() {
    return `Failed to read input file: ${this.path}\n  ${Predicate.isError(this.cause) ? this.cause.message : String(this.cause)}`
  }
}

export class MarkdownParseFailed extends Schema.TaggedError<MarkdownParseFailed>()(
  "MarkdownParseFailed",
  { cause: Schema.Defect() }
) {
  override get message() {
    const details = Predicate.isError(this.cause) ? `\n  Details: ${this.cause.message}` : ""
    return `Unable to parse markdown.${details}`
  }
}

export class MissingCodeBlockLanguage extends Schema.TaggedError<MissingCodeBlockLanguage>()(
  "MissingCodeBlockLanguage",
  { block: Schema.Int }
) {
  override get message() {
    return (
      `Missing language in code block ${this.block}.\n`
      + "  Every fenced code block needs a language (for example: ```ts).\n"
      + `  See supported languages: ${SHIKI_LANGUAGES_URL}`
    )
  }
}

export class UnsupportedLanguage extends Schema.TaggedError<UnsupportedLanguage>()(
  "UnsupportedLanguage",
  { language: Schema.String }
) {
  override get message() {
    return (
      `Unsupported language: "${this.language}".\n`
      + `  See supported languages: ${SHIKI_LANGUAGES_URL}`
    )
  }
}

export class UnsupportedFileExtension extends Schema.TaggedError<UnsupportedFileExtension>()(
  "UnsupportedFileExtension",
  { path: Schema.String }
) {
  override get message() {
    return (
      `Cannot determine language for: ${this.path}\n`
      + "  Use --language to specify the language manually."
    )
  }
}

export class NoCodeBlocksFound extends Schema.TaggedError<NoCodeBlocksFound>()(
  "NoCodeBlocksFound",
  { path: Schema.String, source: Schema.Literals(["git", "markdown"]) }
) {
  override get message() {
    const hint =
      this.source === "markdown"
        ? "Add fenced code blocks with a language to your markdown file."
        : "The file may have no git history or commits."
    return `No code blocks found in ${this.path}.\n  ${hint}`
  }
}

export class UnknownTheme extends Schema.TaggedError<UnknownTheme>()("UnknownTheme", {
  theme: Schema.String,
}) {
  override get message() {
    return `Unknown theme: "${this.theme}".\n  See available themes: ${SHIKI_THEMES_URL}`
  }
}

export class GitRepositoryNotFound extends Schema.TaggedError<GitRepositoryNotFound>()(
  "GitRepositoryNotFound",
  { path: Schema.String }
) {
  override get message() {
    return `Not a git repository: ${this.path}\n  The file must be inside a git repository.`
  }
}

export class GitCommandFailed extends Schema.TaggedError<GitCommandFailed>()("GitCommandFailed", {
  args: Schema.Array(Schema.String),
  cause: Schema.optional(Schema.Defect()),
  exitCode: Schema.optional(Schema.Int),
  stderr: Schema.optional(Schema.String),
}) {
  override get message() {
    let message = `Git command failed: git ${this.args.join(" ")}`
    if (this.exitCode !== undefined) {
      message += `\n  Exit code: ${this.exitCode}`
    }
    if (this.stderr) {
      message += `\n  ${this.stderr.trim()}`
    }
    return message
  }
}

export class NoGitCommitsFound extends Schema.TaggedError<NoGitCommitsFound>()(
  "NoGitCommitsFound",
  { path: Schema.String }
) {
  override get message() {
    return (
      `No git commits found for: ${this.path}\n`
      + "  The file must have at least one commit in git history."
    )
  }
}

export class SceneMeasureFailed extends Schema.TaggedError<SceneMeasureFailed>()(
  "SceneMeasureFailed",
  { cause: Schema.Defect() }
) {
  override get message() {
    const details = Predicate.isError(this.cause) ? `\n  Details: ${this.cause.message}` : ""
    return `Failed to process code block.\n  The syntax highlighter could not tokenize the code.${details}`
  }
}

export class MissingFfmpeg extends Schema.TaggedError<MissingFfmpeg>()("MissingFfmpeg", {
  cause: Schema.optional(Schema.Defect()),
}) {
  override get message() {
    const details = Predicate.isError(this.cause) ? `\n  Details: ${this.cause.message}` : ""
    return (
      "FFmpeg is not installed or not in PATH.\n"
      + `  Install FFmpeg to render videos: https://ffmpeg.org/download.html${details}`
    )
  }
}

const FFMPEG_STAGE_DESCRIPTIONS = {
  encode: "encoding the video file",
  frames: "writing video frames",
  spawn: "starting the FFmpeg process",
} as const

export class FfmpegRenderFailed extends Schema.TaggedError<FfmpegRenderFailed>()(
  "FfmpegRenderFailed",
  {
    cause: Schema.optional(Schema.Defect()),
    exitCode: Schema.optional(Schema.Int),
    format: Schema.Literals(VIDEO_FORMATS),
    outputPath: Schema.String,
    stage: Schema.Literals(["encode", "frames", "spawn"]),
  }
) {
  override get message() {
    let message = `FFmpeg failed while ${FFMPEG_STAGE_DESCRIPTIONS[this.stage]}.\n`
    message += `  Output: ${this.outputPath}\n`
    message += `  Format: ${this.format}`
    if (this.exitCode !== undefined) {
      message += `\n  Exit code: ${this.exitCode}`
    }
    return message
  }
}
