import { execFileSync } from "node:child_process"
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import packageJson from "../package.json" with { type: "json" }

const packageRoot = join(import.meta.dirname, "..")
const temporaryDirectory = mkdtempSync(join(tmpdir(), "sakuga-build-"))
const packagePaths = [packageJson.bin.sakuga, packageJson.exports["."].default]

function run(command: string, arguments_: string[], cwd: string): string {
  return execFileSync(command, arguments_, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  })
}

try {
  for (const packagePath of packagePaths) {
    if (!existsSync(join(packageRoot, packagePath))) {
      throw new Error(`The package file does not exist: ${packagePath}`)
    }
  }

  run("npm", ["pack", "--pack-destination", temporaryDirectory], packageRoot)

  const tarballs = readdirSync(temporaryDirectory).filter((file) => file.endsWith(".tgz"))
  const [tarball] = tarballs
  if (!tarball || tarballs.length !== 1) {
    throw new Error(`Expected one package tarball, found ${tarballs.length}`)
  }

  writeFileSync(
    join(temporaryDirectory, "package.json"),
    `${JSON.stringify({ name: "sakuga-build-verification", private: true, type: "module" }, null, 2)}\n`
  )
  run(
    "npm",
    ["install", "--ignore-scripts", "--no-package-lock", join(temporaryDirectory, tarball)],
    temporaryDirectory
  )

  // The bin runs on Node, so check it there rather than under Bun.
  const cliPath = join(temporaryDirectory, "node_modules", "sakuga", packageJson.bin.sakuga)
  const version = run("node", [cliPath, "--version"], temporaryDirectory)
  if (!version.includes(packageJson.version)) {
    throw new Error(
      `Expected the packed CLI to print ${packageJson.version}, received ${version.trim()}`
    )
  }
  run("node", [cliPath, "--help"], temporaryDirectory)

  console.info(`Verified the packed sakuga CLI: ${version.trim()}`)
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true })
}
