/**
 * Card styles. The package cannot import the shell's CSS modules, so it injects
 * one style tag and styles through the theme's `--dsw-alias-*` tokens: no
 * literal colours, so light and dark both stay readable.
 */
const CSS = `
.pss-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
}
.pss-head { display: flex; flex-direction: column; gap: 4px; }
.pss-title { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.4; color: var(--dsw-alias-label-primary); }
.pss-sub, .pss-hint, .pss-usage { margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }
.pss-grid { display: grid; gap: 12px; }
.pss-field { display: flex; flex-direction: column; gap: 6px; }
.pss-label { font-size: 12px; font-weight: 500; color: var(--dsw-alias-label-secondary); }
.pss-input {
  height: 32px;
  padding: 0 10px;
  font: inherit;
  font-size: 13px;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  outline: none;
}
.pss-input::placeholder { color: var(--dsw-alias-label-tertiary); }
.pss-input:focus { border-color: var(--dsw-alias-brand-primary); }
.pss-input:disabled { color: var(--dsw-alias-label-tertiary); }
.pss-actions { display: flex; align-items: center; gap: 8px; }
.pss-button {
  height: 30px;
  padding: 0 12px;
  font: inherit;
  font-size: 12px;
  color: var(--dsw-alias-label-primary);
  background: transparent;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  cursor: pointer;
}
.pss-button:hover:not(:disabled) { border-color: var(--dsw-alias-label-dimmed); }
.pss-button:disabled { color: var(--dsw-alias-label-tertiary); cursor: default; }
.pss-primary { color: var(--dsw-alias-brand-primary-invert); background: var(--dsw-alias-brand-primary); border-color: transparent; }
.pss-primary:hover:not(:disabled) { border-color: transparent; opacity: .9; }
.pss-primary:disabled { color: var(--dsw-alias-label-tertiary); background: var(--dsw-alias-bg-layer-2); }
.pss-status { font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.pss-error { color: var(--dsw-alias-state-warn-label); }
.pss-gallery {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
}
.pss-gallery-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pss-gallery-title { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.pss-gallery-close { border: 0; background: none; color: var(--dsw-alias-label-tertiary); font-size: 16px; line-height: 1; cursor: pointer; padding: 0 4px; }
.pss-gallery-close:hover { color: var(--dsw-alias-label-primary); }
.pss-gallery-list { display: flex; gap: 12px; margin: 0; padding: 0; list-style: none; overflow-x: auto; }
.pss-gallery-item { display: flex; flex-direction: column; gap: 4px; flex: 0 0 auto; width: 96px; }
.pss-gallery-thumb { width: 96px; height: 170px; object-fit: cover; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); display: block; }
.pss-gallery-item:nth-child(5) .pss-gallery-thumb { height: 47px; margin-top: 61px; }
.pss-gallery-caption { font-size: 11px; line-height: 1.3; color: var(--dsw-alias-label-secondary); }
.pss-gallery-meta { font-size: 10px; color: var(--dsw-alias-label-tertiary); }
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
