import { defineConfig } from "bunup"

export default defineConfig([
  {
    entry: ["src/cli.ts"],
    format: "esm",
    name: "cli",
    outDir: "dist",
    sourcemap: true,
    target: "node",
  },
])
