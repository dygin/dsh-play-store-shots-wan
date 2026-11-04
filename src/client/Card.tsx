import { useMemo, useState, useSyncExternalStore } from 'react'
import type { CardProps, FieldKey } from './types.ts'

interface FieldSpec {
  key: FieldKey
  label: string
  hint: string
  type?: 'password' | 'text'
  placeholder?: string
}

/**
 * The four settings the Host serves for this entry. Defaults come from the
 * schema, so an untouched card already shows the working gateway and model.
 */
function fields(t: CardProps['t']): FieldSpec[] {
  return [
    { key: 'apiKey', label: t('apiKey'), hint: t('apiKeyHint'), type: 'password', placeholder: 'sk-…' },
    { key: 'baseUrl', label: t('baseUrl'), hint: t('baseUrlHint') },
    { key: 'model', label: t('model'), hint: '' },
    { key: 'outputDir', label: t('outputDir'), hint: t('outputDirHint') },
  ]
}

type SaveState = 'idle' | 'saving' | 'saved' | 'failed'

export function Card({ form, t }: CardProps) {
  const subscribe = useMemo(() => (listener: () => void) => form.subscribe(listener), [form])
  const snapshot = useSyncExternalStore(subscribe, () => form.getSnapshot())
  const [draft, setDraft] = useState<Partial<Record<FieldKey, string>>>({})
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const specs = fields(t)
  const editable = snapshot.status === 'ready' && snapshot.writable
  const dirty = Object.keys(draft).length > 0

  const valueOf = (key: FieldKey): string => draft[key] ?? snapshot.value?.[key] ?? ''

  async function save() {
    const edits = Object.entries(draft) as [FieldKey, string][]
    if (edits.length === 0) return
    setSaveState('saving')
    let accepted = true
    for (const [key, value] of edits) {
      accepted = (await form.set(key, value)) && accepted
    }
    setSaveState(accepted ? 'saved' : 'failed')
    if (accepted) setDraft({})
  }

  async function reset() {
    setSaveState('saving')
    for (const spec of specs) await form.unset(spec.key)
    setDraft({})
    setSaveState('idle')
  }

  if (snapshot.status === 'unavailable') return null

  return (
    <section className="pss-card">
      <div className="pss-head">
        <h3 className="pss-title">{t('title')}</h3>
        <p className="pss-sub">{t('subtitle')}</p>
      </div>

      <div className="pss-grid">
        {specs.map((spec) => (
          <label className="pss-field" key={spec.key} htmlFor={`pss-${spec.key}`}>
            <span className="pss-label">{spec.label}</span>
            <input
              id={`pss-${spec.key}`}
              className="pss-input"
              type={spec.type ?? 'text'}
              value={valueOf(spec.key)}
              disabled={!editable}
              placeholder={spec.placeholder}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setDraft((current) => ({ ...current, [spec.key]: event.target.value }))}
            />
            {spec.hint ? <span className="pss-hint">{spec.hint}</span> : null}
          </label>
        ))}
      </div>

      <div className="pss-actions">
        <button className="pss-button pss-primary" type="button" disabled={!editable || !dirty} onClick={save}>
          {t('save')}
        </button>
        <button className="pss-button" type="button" disabled={!editable} onClick={reset}>
          {t('reset')}
        </button>
        {saveState === 'saved' ? <span className="pss-status">{t('saved')}</span> : null}
        {saveState === 'failed' ? <span className="pss-status pss-error">{t('failed')}</span> : null}
        {snapshot.status === 'loading' ? <span className="pss-status">{t('loading')}</span> : null}
        {!snapshot.writable && snapshot.status === 'ready' ? <span className="pss-status">{t('readOnly')}</span> : null}
      </div>

      <p className="pss-usage">{t('usage')}</p>
    </section>
  )
}
