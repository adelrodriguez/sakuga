import process from "node:process"
import * as Logger from "effect/Logger"

function formatMessage(message: unknown) {
  return (Array.isArray(message) ? message : [message]).map(String).join(" ")
}

/**
 * Prints log messages as plain lines: progress on stdout, warnings and errors on stderr. Lib code
 * reports progress through `Effect.log*`, so it never writes to the terminal itself.
 */
const plainLogger = Logger.make(({ logLevel, message }) => {
  const stream =
    logLevel === "Warn" || logLevel === "Error" || logLevel === "Fatal"
      ? process.stderr
      : process.stdout
  stream.write(`${formatMessage(message)}\n`)
})

export const layer = Logger.layer([plainLogger])
