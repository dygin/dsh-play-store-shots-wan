import sharp from 'sharp'
import type { Palette } from './prompts.ts'

const LIGHT_BACKDROP = { r: 255, g: 255, b: 255 }
const DARK_BACKDROP = { r: 17, g: 19, b: 24 }

/**
 * The API rejects PNGs with an alpha channel and the model cannot read
 * transparency, so the icon is flattened first. A white-matted icon whose
 * pixels are nearly uniform means the glyph itself was white; flatten onto the
 * dark backdrop instead.
 */
export async function prepareLogo(input: Buffer): Promise<{ png: Buffer; palette: Palette }> {
  const onLight = await sharp(input, { failOn: 'none' })
    .rotate()
    .flatten({ background: LIGHT_BACKDROP })
    .png()
    .toBuffer()

  const stats = await sharp(onLight).stats()
  const flatIcon = stats.channels.slice(0, 3).every((channel) => channel.stdev < 6)

  const png = flatIcon
    ? await sharp(input, { failOn: 'none' })
        .rotate()
        .flatten({ background: DARK_BACKDROP })
        .png()
        .toBuffer()
    : onLight

  return { png, palette: await extractPalette(png) }
}

interface Bucket {
  r: number
  g: number
  b: number
  count: number
}

function hex({ r, g, b }: Bucket): string {
  const to = (value: number) => Math.round(value).toString(16).padStart(2, '0').toUpperCase()
  return `#${to(r)}${to(g)}${to(b)}`
}

function luma({ r, g, b }: Bucket): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Quantise to a 32-level palette; enough to keep brand colours, cheap enough to run per request. */
export async function extractPalette(input: Buffer): Promise<Palette> {
  const { data, info } = await sharp(input)
    .resize(48, 48, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const buckets = new Map<number, Bucket>()
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i] ?? 0
    const g = data[i + 1] ?? 0
    const b = data[i + 2] ?? 0
    const key = ((r >> 5) << 10) | ((g >> 5) << 5) | (b >> 5)
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 }
    bucket.r += r
    bucket.g += g
    bucket.b += b
    bucket.count += 1
    buckets.set(key, bucket)
  }

  const colors = [...buckets.values()]
    .map((bucket) => ({
      r: bucket.r / bucket.count,
      g: bucket.g / bucket.count,
      b: bucket.b / bucket.count,
      count: bucket.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  if (colors.length === 0) {
    return { primary: '#1F2937', accent: '#6366F1', background: '#111318', light: '#FFFFFF' }
  }

  const chroma = (c: Bucket) => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)
  const byChroma = [...colors].sort((a, b) => chroma(b) - chroma(a))
  const byLuma = [...colors].sort((a, b) => luma(a) - luma(b))

  return {
    primary: hex(colors[0]!),
    accent: hex(byChroma[0]!),
    background: hex(byLuma[0]!),
    light: hex(byLuma[byLuma.length - 1]!),
  }
}

/** Long edge 1280 keeps the uploaded reference legible while the payload stays small. */
export async function prepareReference(input: Buffer): Promise<Buffer> {
  return sharp(input, { failOn: 'none' })
    .rotate()
    .flatten({ background: LIGHT_BACKDROP })
    .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer()
}

/** Cover-resize to exact store pixels, flatten alpha, strip metadata. */
export async function finalize(input: Buffer, width: number, height: number): Promise<Buffer> {
  return sharp(input, { failOn: 'none' })
    .flatten({ background: LIGHT_BACKDROP })
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer()
}

export async function imageSize(input: Buffer): Promise<{ width: number; height: number }> {
  const { width = 0, height = 0 } = await sharp(input).metadata()
  return { width, height }
}

/** One strip that shows the whole set at a glance. */
export async function contactSheet(paths: readonly string[], target: string): Promise<void> {
  const thumbHeight = 640
  const gap = 24
  const padding = 32
  const thumbs = await Promise.all(paths.map((path) => sharp(path).resize({ height: thumbHeight }).toBuffer()))
  const sizes = await Promise.all(thumbs.map((thumb) => sharp(thumb).metadata()))

  const width =
    sizes.reduce((total, meta) => total + (meta.width ?? 0), 0) + gap * (thumbs.length - 1) + padding * 2

  let left = padding
  const items = thumbs.map((input, index) => {
    const item = { input, left, top: padding }
    left += (sizes[index]?.width ?? 0) + gap
    return item
  })

  await sharp({
    create: {
      width,
      height: thumbHeight + padding * 2,
      channels: 3,
      background: { r: 17, g: 19, b: 24 },
    },
  })
    .composite(items)
    .png({ compressionLevel: 9 })
    .toFile(target)
}
