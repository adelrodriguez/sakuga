import { describe, expect, it } from "bun:test"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import type { Scene } from "#lib/scene/model.ts"
import { layoutToken, renderConfig } from "#__tests__/fixtures.ts"
import { buildFrames, computeFrameCounts } from "#lib/scene/frames.ts"

describe("computeFrameCounts", () => {
  it("returns expected frame counts", () => {
    const result = computeFrameCounts(1000, 25, 2)

    expect(result.frameDuration).toBeCloseTo(0.04)
    expect(result.blockFrames).toBe(50)
    expect(result.transitionFrames).toBe(25)
  })

  it("renders at least one frame per stage", () => {
    expect(computeFrameCounts(1, 1, 0)).toMatchObject({ blockFrames: 1, transitionFrames: 1 })
  })
})

describe("buildFrames", () => {
  it("holds each scene and transitions between neighbors", async () => {
    const config = { ...renderConfig, blockDuration: 1, fps: 10, transitionDurationMs: 500 }
    const scenes: Scene[] = [
      { background: "#000000", tokens: [layoutToken("keyword", "const", 0)] },
      { background: "#ffffff", tokens: [layoutToken("keyword", "let", 0)] },
    ]

    const frames = await Effect.runPromise(Stream.runCollect(buildFrames(config, scenes)))

    expect(frames).toHaveLength(10 + 5 + 10)
    expect(frames[0]?.background).toBe("#000000")
    expect(frames.at(-1)?.background).toBe("#ffffff")
  })
})
