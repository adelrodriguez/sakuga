import type { DrawToken, LayoutToken, Scene, TokenMatch, TransitionDiff } from "#lib/scene/model.ts"
import type { RenderConfig } from "#lib/shared/model.ts"
import { blendColors, lerp } from "#lib/scene/color.ts"

type KeyBuilder = (token: LayoutToken) => string

interface Unmatched {
  readonly added: readonly LayoutToken[]
  readonly matched: readonly TokenMatch[]
  readonly removed: readonly LayoutToken[]
}

function exactKey(token: LayoutToken) {
  return `exact::${token.content}::${token.fontStyle}`
}

function categoryKey(token: LayoutToken) {
  return `category::${token.category}`
}

/**
 * Matches tokens that keep their relative order, using the longest common subsequence of keys.
 */
function diffByKey(
  fromTokens: readonly LayoutToken[],
  toTokens: readonly LayoutToken[],
  buildKey: KeyBuilder
): Unmatched {
  const fromKeys = fromTokens.map((token) => buildKey(token))
  const toKeys = toTokens.map((token) => buildKey(token))
  const lengths = Array.from({ length: fromKeys.length + 1 }, () =>
    Array.from({ length: toKeys.length + 1 }, () => 0)
  )
  const lengthAt = (i: number, j: number) => lengths[i]?.[j] ?? 0

  for (let i = fromKeys.length - 1; i >= 0; i -= 1) {
    const row = lengths[i]
    if (!row) {
      continue
    }

    for (let j = toKeys.length - 1; j >= 0; j -= 1) {
      row[j] =
        fromKeys[i] === toKeys[j]
          ? lengthAt(i + 1, j + 1) + 1
          : Math.max(lengthAt(i + 1, j), lengthAt(i, j + 1))
    }
  }

  const matched: TokenMatch[] = []
  const matchedFrom = new Set<number>()
  const matchedTo = new Set<number>()
  let i = 0
  let j = 0

  while (i < fromTokens.length && j < toTokens.length) {
    const from = fromTokens[i]
    const to = toTokens[j]

    if (from && to && fromKeys[i] === toKeys[j]) {
      matched.push({ from, to })
      matchedFrom.add(i)
      matchedTo.add(j)
      i += 1
      j += 1
    } else if (lengthAt(i + 1, j) >= lengthAt(i, j + 1)) {
      i += 1
    } else {
      j += 1
    }
  }

  return {
    added: toTokens.filter((_, index) => !matchedTo.has(index)),
    matched,
    removed: fromTokens.filter((_, index) => !matchedFrom.has(index)),
  }
}

/**
 * Pairs each removed token with the nearest added token that shares its key, preferring the same
 * line.
 */
function matchNearest(
  removed: readonly LayoutToken[],
  added: readonly LayoutToken[],
  buildKey: KeyBuilder
): Unmatched {
  const matched: TokenMatch[] = []
  const usedFrom = new Set<number>()
  const usedTo = new Set<number>()

  removed.forEach((from, fromIndex) => {
    const key = buildKey(from)
    let bestIndex = -1
    let bestDistance = Infinity

    added.forEach((to, toIndex) => {
      if (usedTo.has(toIndex) || buildKey(to) !== key) {
        return
      }

      const distance = Math.abs(from.y - to.y) * 1000 + Math.abs(from.x - to.x)
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = toIndex
      }
    })

    const to = added[bestIndex]
    if (to) {
      matched.push({ from, to })
      usedFrom.add(fromIndex)
      usedTo.add(bestIndex)
    }
  })

  return {
    added: added.filter((_, index) => !usedTo.has(index)),
    matched,
    removed: removed.filter((_, index) => !usedFrom.has(index)),
  }
}

export function diffLayoutTokens(
  fromTokens: readonly LayoutToken[],
  toTokens: readonly LayoutToken[]
): TransitionDiff {
  const ordered = diffByKey(fromTokens, toTokens, exactKey)
  const moved = matchNearest(ordered.removed, ordered.added, exactKey)
  const morphed = matchNearest(moved.removed, moved.added, categoryKey)

  return {
    added: morphed.added,
    matched: [...ordered.matched, ...moved.matched, ...morphed.matched],
    removed: morphed.removed,
  }
}

export function buildTransitionDiff(fromScene: Scene, toScene: Scene) {
  return diffLayoutTokens(fromScene.tokens, toScene.tokens)
}

export function easeInOutCubic(progress: number) {
  const clamped = Math.min(1, Math.max(0, progress))
  return clamped < 0.5 ? 4 * clamped * clamped * clamped : 1 - (-2 * clamped + 2) ** 3 / 2
}

function fadeToken(token: LayoutToken, opacity: number, y: number): DrawToken {
  return {
    color: token.color,
    content: token.content,
    fontStyle: token.fontStyle,
    opacity,
    width: token.width,
    x: token.x,
    y,
  }
}

function morphTokens(match: TokenMatch, progress: number): DrawToken[] {
  const { from, to } = match
  const position = {
    width: lerp(from.width, to.width, progress),
    x: lerp(from.x, to.x, progress),
    y: lerp(from.y, to.y, progress),
  }

  if (from.content === to.content && from.fontStyle === to.fontStyle) {
    return [
      {
        ...position,
        color: blendColors(from.color, to.color, progress),
        content: to.content,
        fontStyle: to.fontStyle,
        opacity: 1,
      },
    ]
  }

  // Different text in the same slot crossfades while it moves.
  return [
    {
      ...position,
      color: from.color,
      content: from.content,
      fontStyle: from.fontStyle,
      opacity: 1 - progress,
    },
    {
      ...position,
      color: to.color,
      content: to.content,
      fontStyle: to.fontStyle,
      opacity: progress,
    },
  ]
}

/**
 * Computes the tokens to draw at `progress` (0 to 1) through a transition.
 */
export function buildTransitionTokens(
  config: RenderConfig,
  diff: TransitionDiff,
  progress: number
): DrawToken[] {
  const clamped = Math.min(1, Math.max(0, progress))
  const drift = config.transitionDrift

  return [
    ...diff.removed.map((token) => fadeToken(token, 1 - clamped, token.y - drift * clamped)),
    ...diff.matched.flatMap((match) => morphTokens(match, clamped)),
    ...diff.added.map((token) => fadeToken(token, clamped, token.y + drift * (1 - clamped))),
  ].filter((token) => token.opacity > 0)
}

/**
 * The tokens of a scene at rest.
 */
export function sceneTokens(scene: Scene): DrawToken[] {
  return scene.tokens.map((token) => fadeToken(token, 1, token.y))
}
