import type { KnipConfig } from "knip"
import analyze, { ignoreDependencies } from "adamantite/analyze"

const config: KnipConfig = {
  ...analyze,
  // `adamantite prepare` runs `@effect/tsgo`, and Packref is a CLI for agents and contributors.
  ignoreDependencies: [...ignoreDependencies.effect, "@effect/tsgo", "packref"],
  project: ["src/**/*.ts"],
}

export default config
