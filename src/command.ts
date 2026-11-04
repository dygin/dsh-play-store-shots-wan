import { appendFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Settings } from './config.ts'
import { generateStoreShots } from './pipeline.ts'
import { WanError } from './wan.ts'

export type CommandOutcome = { kind: 'success'; text: string } | { kind: 'error'; text: string }

interface AttachmentBlock {
  type: 'image' | 'file'
  attachment?: unknown
}

export interface Invocation {
  rawInput: string
  attachments: readonly AttachmentBlock[]
  agent: unknown
  signal?: AbortSignal
}

export interface HandlerDeps {
  settings: () => Settings
  readImage: (reference: unknown, signal?: AbortSignal) => Promise<{ data: Uint8Array }>
}

const IMAGE_COUNT = 3

/**
 * Append one diagnostic line. Runs are long and the failing side is not always
 * visible from the chat, so every invocation leaves a trace under `~/.dsh/logs`.
 * Diagnostics must never break a run: any failure here is ignored.
 */
async function trace(line: string): Promise<void> {
  try {
    const dir = join(homedir(), '.dsh', 'logs')
    await mkdir(dir, { recursive: true })
    await appendFile(join(dir, 'play-store-shots.log'), `${new Date().toISOString()} ${line}\n`)
  } catch {
    /* ignore */
  }
}

function workspaceCwd(agent: unknown): string {
  const session = (agent as { session?: { header?: { cwd?: string }; meta?: { cwd?: string } } } | undefined)?.session
  return session?.header?.cwd ?? session?.meta?.cwd ?? process.cwd()
}

function countMessage(received: number, images: number): string {
  if (received === 0) return '未检测到附件'
  return `收到 ${received} 个附件，其中图片 ${images} 张`
}

/**
 * A command handler never streams, so it validates everything up front, runs
 * the five boards in parallel, and reports one settled result.
 */
export function createHandler(deps: HandlerDeps) {
  return async function handler(invocation: Invocation): Promise<CommandOutcome> {
    const appName = invocation.rawInput.trim()
    const images = invocation.attachments.filter((block) => block.type === 'image')
    await trace(`invoke app=${JSON.stringify(appName)} attachments=${invocation.attachments.length} images=${images.length}`)

    if (invocation.attachments.length !== IMAGE_COUNT || images.length !== IMAGE_COUNT) {
      await trace(`reject: expected ${IMAGE_COUNT} images`)
      return {
        kind: 'error',
        text: `需要恰好 3 张图片（${countMessage(invocation.attachments.length, images.length)}）。\n请按顺序附上：1) App logo  2) 商店竖图参考  3) 商店横图参考，然后重新提交 /playstoreshots。`,
      }
    }

    if (!appName) {
      await trace('reject: missing app name')
      return {
        kind: 'error',
        text: '缺少应用名称。用法：/playstoreshots <应用名称>，并附上 3 张图片。',
      }
    }

    const settings = deps.settings()
    if (!settings.apiKey) {
      await trace('reject: missing api key')
      return {
        kind: 'error',
        text: '未配置百炼 API Key。请在「插件 → Google Play 商店图」里填写，或设置环境变量 WAN_API_KEY。',
      }
    }

    const started = Date.now()
    try {
      await trace(`start model=${settings.model} baseUrl=${settings.baseUrl}`)
      const [logo, portrait, banner] = await Promise.all(
        images.map((block) => deps.readImage(block.attachment, invocation.signal)),
      )

      const result = await generateStoreShots({
        appName,
        apiKey: settings.apiKey,
        baseUrl: settings.baseUrl,
        model: settings.model,
        outputRoot: join(workspaceCwd(invocation.agent), settings.outputDir),
        logo: Buffer.from(logo!.data),
        portraitReference: Buffer.from(portrait!.data),
        bannerReference: Buffer.from(banner!.data),
        signal: invocation.signal,
      })

      await trace(`done in ${Date.now() - started}ms files=${result.files.length} dir=${result.directory}`)
      const lines = result.files.map(
        (file) => `- ${file.name} ${file.width}×${file.height} · ${file.headline}`,
      )
      return {
        kind: 'success',
        text: [
          `已生成 ${result.files.length} 张商店图（${appName}，主色 ${result.palette.primary}）`,
          `目录：${result.directory}`,
          ...lines,
          '联系表：final/contact-sheet.png',
        ].join('\n'),
      }
    } catch (caught) {
      const message = caught instanceof WanError ? caught.message : (caught as Error).message
      await trace(`error after ${Date.now() - started}ms: ${message}`)
      return { kind: 'error', text: `生成失败：${message}` }
    }
  }
}
