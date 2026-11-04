import { Card } from './Card.tsx'
import { en, NS, zh } from './locale.ts'
import { injectStyles } from './styles.ts'
import type { ConfigForm } from './types.ts'

/** Profile entry id; doubles as the settings namespace the card binds to. */
const ENTRY_ID = 'play-store-shots'
const BUNDLE_SLOT = 'plugins.bundle.config'
const BUNDLE_ID = 'dsh-play-store-shots-wan'

interface LocaleService {
  register(namespace: string, dictionaries: Record<string, Record<string, string>>): () => void
  bind(namespace: string): (key: string) => string
}

interface SlotsService {
  inject(name: string, register: () => () => void): () => void
  register(options: Record<string, unknown>, component: unknown): () => void
}

interface ConfigFormsService {
  get<T>(entryId: string): T
  whileServed(namespaces: readonly string[], register: () => () => void): () => void
}

interface ClientContext {
  locale: LocaleService
  slots: SlotsService
  configForms: ConfigFormsService
  effect(execute: () => (() => void) | void, label?: string): void
}

export const inject = ['slots', 'locale', 'configForms']

export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'play-store-shots: dictionary')
  injectStyles()

  const form = ctx.configForms.get<ConfigForm>(ENTRY_ID)

  // The card belongs to the package's own page under "Installed plugins" rather
  // than the settings list: `plugins.bundle.config` is keyed by bundle name and
  // rendered only while the Host serves this entry's namespace.
  ctx.effect(
    () =>
      ctx.configForms.whileServed([ENTRY_ID], () =>
        ctx.slots.inject(BUNDLE_SLOT, () =>
          ctx.slots.register(
            {
              name: BUNDLE_SLOT,
              key: BUNDLE_ID,
              locale: NS,
              inject: () => ({ form, t }),
            },
            Card,
          ),
        ),
      ),
    'play-store-shots: settings card',
  )

}
