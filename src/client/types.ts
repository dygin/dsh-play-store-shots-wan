export type FieldKey = 'apiKey' | 'baseUrl' | 'model' | 'outputDir'

export interface FormSnapshot {
  status: 'loading' | 'ready' | 'unavailable'
  value: Partial<Record<FieldKey, string>> | undefined
  writable: boolean
}

/** The slice of `ctx.configForms.get(entry)` a card needs. */
export interface ConfigForm {
  getSnapshot(): FormSnapshot
  subscribe(listener: () => void): () => void
  set(field: FieldKey, value: string): Promise<boolean>
  unset(field: FieldKey): Promise<boolean>
}

export interface CardProps {
  form: ConfigForm
  t: (key: string) => string
}
