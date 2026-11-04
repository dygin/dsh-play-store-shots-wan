const CSS = `
.pss-card { display: flex; flex-direction: column; gap: 14px; padding: 16px 18px; border: 1px solid var(--dsh-border, #e5e7eb); border-radius: 12px; background: var(--dsh-surface, #fff); }
.pss-head { display: flex; flex-direction: column; gap: 4px; }
.pss-title { font-size: 14px; font-weight: 600; margin: 0; }
.pss-sub, .pss-hint, .pss-usage { margin: 0; font-size: 12px; line-height: 1.5; opacity: .65; }
.pss-usage { opacity: .55; }
.pss-grid { display: grid; gap: 12px; }
.pss-field { display: flex; flex-direction: column; gap: 6px; }
.pss-label { font-size: 12px; font-weight: 500; }
.pss-input { height: 32px; padding: 0 10px; font-size: 13px; color: inherit; background: transparent; border: 1px solid var(--dsh-border, #d4d4d8); border-radius: 8px; outline: none; }
.pss-input:focus { border-color: var(--dsh-accent, #6366f1); }
.pss-input:disabled { opacity: .55; }
.pss-actions { display: flex; align-items: center; gap: 8px; }
.pss-button { height: 30px; padding: 0 12px; font-size: 12px; border-radius: 8px; border: 1px solid var(--dsh-border, #d4d4d8); background: transparent; color: inherit; cursor: pointer; }
.pss-button:hover:not(:disabled) { background: rgba(127,127,127,.12); }
.pss-button:disabled { opacity: .5; cursor: default; }
.pss-primary { background: var(--dsh-accent, #6366f1); border-color: transparent; color: #fff; }
.pss-status { font-size: 12px; opacity: .7; }
.pss-error { color: #dc2626; }
`

let installed = false

export function injectStyles(): void {
  if (installed || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.dataset.plugin = 'play-store-shots'
  style.textContent = CSS
  document.head.append(style)
  installed = true
}
