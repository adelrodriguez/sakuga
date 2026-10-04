import * as Stream from "effect/Stream"
import type { Frame, Scene } from "#lib/scene/model.ts"
import type { RenderConfig } from "#lib/shared/model.ts"
import { blendColors } from "#lib/scene/color.ts"
import {
  buildTransitionDiff,
  buildTransitionTokens,
  easeInOutCubic,
  sceneTokens,
} from "#lib/scene/transition.ts"

export function computeFrameCounts(
  transitionDurationMs: number,
  fps: number,
  blockDuration: number
) {
  return {
    blockFrames: Math.max(1, Math.round(blockDuration * fps)),
    frameDuration: 1 / fps,
    transitionFrames: Math.max(1, Math.round((transitionDurationMs / 1000) * fps)),
  }
}

function sceneFrames(scene: Scene, count: number) {
  const frame: Frame = { background: scene.background, tokens: sceneTokens(scene) }
  return Stream.range(1, count).pipe(Stream.map(() => frame))
}

function transitionFrames(config: RenderConfig, from: Scene, to: Scene, count: number) {
  const diff = buildTransitionDiff(from, to)

  return Stream.range(1, count).pipe(
    Stream.map((index): Frame => {
      const progress = easeInOutCubic(index / count)
      return {
        background: blendColors(from.background, to.background, progress),
        tokens: buildTransitionTokens(config, diff, progress),
      }
    })
  )
}

/**
 * Every frame of the video: each scene holds still, then transitions into the next.
 */
export function buildFrames(config: RenderConfig, scenes: readonly Scene[]) {
  const counts = computeFrameCounts(config.transitionDurationMs, config.fps, config.blockDuration)

  return Stream.fromIterable(scenes).pipe(
    Stream.zipWithIndex,
    Stream.flatMap(([scene, index]) => {
      const hold = sceneFrames(scene, counts.blockFrames)
      const next = scenes[index + 1]
      return next
        ? Stream.concat(hold, transitionFrames(config, scene, next, counts.transitionFrames))
        : hold
    })
  )
}
