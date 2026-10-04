import core from "adamantite/lint"
import custom from "adamantite/lint/custom"
import effect from "adamantite/lint/effect"
import node from "adamantite/lint/node"
import { defineConfig, type OxlintOverride } from "oxlint"

const TERMINAL_IMPORTS = {
  group: ["#terminal/*", "#commands/*", "#cli.ts"],
  message:
    "Lib code does not talk to the terminal or know about commands. Return data or log with `Effect.log*`.",
}

const PARENT_RELATIVE_IMPORTS = {
  group: ["../**", "!../../../package.json"],
  message: "Import other modules through `#lib/...`, so the lib layer rules apply.",
}

const LIB_LAYER_MESSAGE =
  "Lib layers import only from lower layers: shared, then sources and scene, then video. See AGENTS.md."

function libLayer(files: string, forbidden: string[]): OxlintOverride {
  const patterns: Array<{ group: string[]; message: string }> = [
    TERMINAL_IMPORTS,
    PARENT_RELATIVE_IMPORTS,
  ]

  if (forbidden.length > 0) {
    patterns.push({ group: forbidden, message: LIB_LAYER_MESSAGE })
  }

  return { files: [files], rules: { "no-restricted-imports": ["error", { patterns }] } }
}

export default defineConfig({
  extends: [core, node, effect, custom()],
  ignorePatterns: [...core.ignorePatterns, ".packref/"],
  options: {
    respectEslintDisableDirectives: true,
    typeAware: true,
    typeCheck: true,
  },
  overrides: [
    libLayer("src/lib/shared/**/*.ts", ["#lib/sources/*", "#lib/scene/*", "#lib/video/*"]),
    libLayer("src/lib/sources/**/*.ts", ["#lib/scene/*", "#lib/video/*"]),
    libLayer("src/lib/scene/**/*.ts", ["#lib/sources/*", "#lib/video/*"]),
    libLayer("src/lib/video/**/*.ts", ["#lib/sources/*"]),
    {
      // `Schema.TaggedError<Self>()(...)` is a class factory, not an error constructor.
      files: ["src/lib/shared/errors.ts"],
      rules: { "unicorn/throw-new-error": "off" },
    },
    {
      // Drawing on a canvas means setting state on its 2D context.
      files: ["src/lib/scene/draw.ts", "src/lib/scene/measure.ts"],
      rules: { "no-param-reassign": "off" },
    },
  ],
})
