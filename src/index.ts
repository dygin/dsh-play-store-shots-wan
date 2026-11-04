import type { Context } from '@deepseek-ai/cordis'
import { createHandler, type Invocation } from './command.ts'
import { mountRoutes, trace } from './server.ts'
import { Config, readSettings, type ConfigInput } from './config.ts'

export const name = 'play-store-shots'
export const inject = ['commands', 'attachments']
export { Config }
export { createHandler } from './command.ts'
export { generateStoreShots } from './pipeline.ts'
export { generateImage } from './wan.ts'
export { DEFAULT_BASE_URL, DEFAULT_MODEL, DEFAULT_OUTPUT_DIR } from './config.ts'
export { slugify } from './pipeline.ts'
export { BANNER_SIZE, PORTRAIT_SIZE, SCREENS, bannerPrompt, portraitPrompt } from './prompts.ts'

interface CommandDefinition {
  name: string
  description: string
  input: { hint: string; attachments: boolean }
  handler: (invocation: Invocation) => Promise<{ kind: 'success' | 'error'; text: string }>
}

interface CommandRegistry {
  register(definition: CommandDefinition): () => void
}

interface AttachmentStore {
  readImage(reference: unknown, signal?: AbortSignal): Promise<{ data: Uint8Array }>
}

interface HostContext {
  commands: CommandRegistry
  attachments: AttachmentStore
  effect(execute: () => (() => void) | void, label?: string): void
  inject?(names: string[], execute: (scope: unknown) => void): void
}

export function apply(ctx: Context, config: ConfigInput): void {
  const host = ctx as unknown as HostContext

  const handler = createHandler({
    settings: () => readSettings(config),
    readImage: (reference, signal) => host.attachments.readImage(reference, signal),
  })

  // `webServer` may be provided after this plugin applies, so the routes mount
  // from a scoped injection instead of a one-shot lookup.
  host.inject?.(['webServer'], (scope) => {
    const scoped = scope as { webServer?: never; effect: HostContext['effect'] }
    mountRoutes({ webServer: scoped.webServer, effect: (execute, label) => scoped.effect(execute, label) })
  })

  host.effect(
    () =>
      host.commands.register({
        name: 'playstoreshots',
        description: '生成 Google Play 商店图：4 张 1080×1920 竖图 + 1 张 1024×500 横图',
        input: {
          hint: '<应用名称>（附 3 张图片：logo、竖图参考、横图参考）',
          attachments: true,
        },
        handler,
      }),
    'play-store-shots: /playstoreshots',
  )
}
