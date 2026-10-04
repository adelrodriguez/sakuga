import { describe, expect, it } from "bun:test"
import { buildEncodeArgs, ensureEvenDimensions } from "#lib/video/ffmpeg.ts"

describe("ensureEvenDimensions", () => {
  it("rounds odd dimensions to even for yuv420p formats", () => {
    expect(ensureEvenDimensions("mp4", 1281, 721)).toEqual({ height: 722, width: 1282 })
    expect(ensureEvenDimensions("webm", 1281, 721)).toEqual({ height: 722, width: 1282 })
  })

  it("keeps even dimensions unchanged", () => {
    expect(ensureEvenDimensions("webm", 1280, 720)).toEqual({ height: 720, width: 1280 })
  })
})

describe("buildEncodeArgs", () => {
  const options = {
    fps: 30,
    height: 720,
    inputPath: "/tmp/frames.raw",
    outputPath: "out.mp4",
    verbose: false,
    width: 1280,
  }

  it("reads raw RGBA frames and writes the output last", () => {
    const args = buildEncodeArgs({ ...options, format: "mp4" })

    expect(args.slice(0, 10)).toEqual([
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgba",
      "-s",
      "1280x720",
      "-r",
      "30",
      "-i",
      "/tmp/frames.raw",
    ])
    expect(args.slice(-2)).toEqual(["-y", "out.mp4"])
    expect(args).toContain("libx264")
    expect(args).toContain("aac")
  })

  it("encodes webm with VP9 and no audio track", () => {
    const args = buildEncodeArgs({ ...options, format: "webm", outputPath: "out.webm" })

    expect(args).toContain("libvpx-vp9")
    expect(args).not.toContain("aac")
  })
})
