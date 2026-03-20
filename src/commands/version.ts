import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import * as Schema from "effect/Schema"

const PackageJson = Schema.Struct({ version: Schema.String })
const PackageJsonFromFile = Schema.fromJsonString(PackageJson)

export const readVersion = () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const contents = yield* fs.readFileString(
        path.join(import.meta.dirname, "../..", "package.json")
      )
      const parsed = yield* Schema.decodeUnknownEffect(PackageJsonFromFile)(contents)

      return parsed.version
    }).pipe(Effect.provide(NodeServices.layer), Effect.orDie)
  )
