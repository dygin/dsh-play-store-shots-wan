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
import { WanError, generateImage, type ReferenceImage } from './wan.ts'

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

export interface BoardFailure {
  name: string
  message: string
}

export interface GenerateResult {
  directory: string
  sheet: string
  palette: Palette
  files: GeneratedFile[]
  failures: BoardFailure[]
}

/** One of the five images, and everything needed to render it. */
interface Board {
  name: string
  headline: string
  size: string
  target: { width: number; height: number }
  prompt: string
  safePrompt: string
  references: ReferenceImage[]
  safeReferences: ReferenceImage[]
}

export function slugify(appName: string): string {
  const slug = appName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || `app-${Date.now().toString(36)}`
}

function isModeration(caught: unknown): boolean {
  const message = caught instanceof Error ? caught.message : String(caught)
  return /DataInspectionFailed|Green net|inappropriate content/i.test(message)
}

/**
 * Renders one board with a moderation ladder: Bailian inspects the *output*, so
 * a drama-style cover can be refused even when nothing in the prompt is risky.
 * The retry states the safe clause explicitly, and the last attempt drops the
 * user's reference sheet, which is often what the inspector reacted to.
 */
async function renderBoard(board: Board, options: GenerateOptions, report: (message: string) => void): Promise<Buffer> {
  const attempts = [
    { prompt: board.prompt, references: board.references },
    { prompt: board.safePrompt, references: board.references },
    { prompt: board.safePrompt, references: board.safeReferences },
  ]

  let lastError: unknown
  for (const [index, attempt] of attempts.entries()) {
    try {
      const raw = await generateImage({
        baseUrl: options.baseUrl,
        apiKey: options.apiKey,
        model: options.model,
        prompt: attempt.prompt,
        references: attempt.references,
        size: board.size,
        signal: options.signal,
      })
      return await finalize(raw, board.target.width, board.target.height)
    } catch (caught) {
      lastError = caught
      if (!isModeration(caught) || index === attempts.length - 1) break
      report(`${board.name} 触发内容审核，换更保守的描述重试`)
    }
  }
  throw lastError
}

/**
 * Normalise the three uploads, generate the five boards in parallel, then land
 * every board on the exact store pixel size before writing it. A board that is
 * refused by moderation does not sink the rest of the set.
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
  const icon: ReferenceImage = { mime: 'image/png', data: png }
  const portraitImages: ReferenceImage[] = [icon, { mime: 'image/jpeg', data: portraitReference }]
  const bannerImages: ReferenceImage[] = [icon, { mime: 'image/jpeg', data: bannerReference }]

  const boards: Board[] = [
    ...SCREENS.map((screen) => ({
      name: `${screen.id}.png`,
      headline: screen.headline,
      size: PORTRAIT_SIZE,
      target: PORTRAIT_TARGET,
      prompt: portraitPrompt(screen, options.appName, palette),
      safePrompt: portraitPrompt(screen, options.appName, palette, true),
      references: portraitImages,
      safeReferences: [icon],
    })),
    {
      name: '05.png',
      headline: options.appName,
      size: BANNER_SIZE,
      target: BANNER_TARGET,
      prompt: bannerPrompt(options.appName, palette),
      safePrompt: bannerPrompt(options.appName, palette, true),
      references: bannerImages,
      safeReferences: [icon],
    },
  ]

  const settled = await Promise.allSettled(
    boards.map(async (board) => {
      report(`生成 ${board.name} · ${board.headline}`)
      const buffer = await renderBoard(board, options, report)
      await writeFile(join(finalDir, board.name), buffer)
      const size = await imageSize(buffer)
      return { name: board.name, headline: board.headline, ...size, bytes: buffer.byteLength } satisfies GeneratedFile
    }),
  )

  const files: GeneratedFile[] = []
  const failures: BoardFailure[] = []
  settled.forEach((outcome, index) => {
    const name = boards[index]?.name ?? `board-${index}`
    if (outcome.status === 'fulfilled') files.push(outcome.value)
    else failures.push({ name, message: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason) })
  })

  if (files.length === 0) {
    throw settled[0]?.status === 'rejected' ? settled[0].reason : new Error('no image was generated')
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
        failures,
      },
      null,
      2,
    )}\n`,
  )

  return { directory, sheet, palette, files, failures }
}
