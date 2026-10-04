import packageJson from "../../../package.json" with { type: "json" }

export function getPackageVersion() {
  return packageJson.version
}
