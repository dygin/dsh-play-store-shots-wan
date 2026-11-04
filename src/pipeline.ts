import { mkdir, writeFile } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { contactSheet, finalize, imageSize, prepareLogo, prepareReference } from './images.ts'
import {
  BANNER_SIZE,
  BANNER_TARGET,
  PORTRAIT_SIZE,
  PORTRAIT_TARGET,
  SCREENS,
  bannerPrompt,
  portraitPrompt,
  type Palette,
} from './prompts.ts'
import { generateImage } from './wan.ts'

export interface GenerateOptions {
  appName: string
  apiKey: string
  baseUrl: string
  model: string
  outputRoot: string
  logo: Buffer
  portraitReference: Buffer
  bannerReference: Buffer
  signal?: AbortSignal
  onProgress?: (message: string) => void
}

export interface GeneratedFile {
  name: string
  headline: string
  width: number
  height: number
  bytes: number
}

export interface GenerateResult {
  directory: string
  sheet: string
  palette: Palette
  files: GeneratedFile[]
}

export function slugify(appName: string): string {
  const slug = appName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || `app-${Date.now().toString(36)}`
}

/**
 * Normalise the three uploads, generate the five boards in parallel, then land
 * every board on the exact store pixel size before writing it.
 */
export async function generateStoreShots(options: GenerateOptions): Promise<GenerateResult> {
  const report = options.onProgress ?? (() => {})
  const directory = isAbsolute(options.outputRoot)
    ? join(options.outputRoot, slugify(options.appName))
    : resolve(options.outputRoot, slugify(options.appName))
  const finalDir = join(directory, 'final')
  await mkdir(finalDir, { recursive: true })

  const { png, palette } = await prepareLogo(options.logo)
  report(`品牌主色 ${palette.primary}`)

  const portraitReference = await prepareReference(options.portraitReference)
  const bannerReference = await prepareReference(options.bannerReference)
  const iconReference = { mime: 'image/png', data: png }

  const portraitJobs = SCREENS.map(async (screen) => {
    report(`生成竖图 ${screen.id} · ${screen.headline}`)
    const raw = await generateImage({
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      model: options.model,
      prompt: portraitPrompt(screen, options.appName, palette),
      references: [iconReference, { mime: 'image/jpeg', data: portraitReference }],
      size: PORTRAIT_SIZE,
      signal: options.signal,
    })
    const buffer = await finalize(raw, PORTRAIT_TARGET.width, PORTRAIT_TARGET.height)
    const name = `${screen.id}.png`
    await writeFile(join(finalDir, name), buffer)
    return { name, headline: screen.headline, buffer }
  })

  const bannerJob = (async () => {
    report('生成横图 05')
    const raw = await generateImage({
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      model: options.model,
      prompt: bannerPrompt(options.appName, palette),
      references: [iconReference, { mime: 'image/jpeg', data: bannerReference }],
      size: BANNER_SIZE,
      signal: options.signal,
    })
    const buffer = await finalize(raw, BANNER_TARGET.width, BANNER_TARGET.height)
    await writeFile(join(finalDir, '05.png'), buffer)
    return { name: '05.png', headline: options.appName, buffer }
  })()

  const produced = await Promise.all([...portraitJobs, bannerJob])
  const files: GeneratedFile[] = []
  for (const item of produced) {
    const size = await imageSize(item.buffer)
    files.push({ name: item.name, headline: item.headline, ...size, bytes: item.buffer.byteLength })
  }

  const sheet = join(finalDir, 'contact-sheet.png')
  await contactSheet(files.map((file) => join(finalDir, file.name)), sheet)

  await writeFile(
    join(directory, 'manifest.json'),
    `${JSON.stringify(
      {
        appName: options.appName,
        model: options.model,
        baseUrl: options.baseUrl,
        generatedAt: new Date().toISOString(),
        palette,
        files,
      },
      null,
      2,
    )}\n`,
  )

  return { directory, sheet, palette, files }
}
