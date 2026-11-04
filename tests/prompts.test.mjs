import assert from 'node:assert/strict'
import test from 'node:test'
import { SCREENS, bannerPrompt, portraitPrompt, slugify } from '../lib/index.mjs'

const palette = { primary: '#7E57FF', accent: '#A78BFF', background: '#120F1E', light: '#FFFFFF' }
const CJK = /[\u3400-\u9fff]/

test('slugify keeps output directories filesystem-safe', () => {
  assert.equal(slugify('Short Drama!'), 'short-drama')
  assert.equal(slugify('  A/B  '), 'a-b')
  assert.match(slugify('短剧'), /^app-/)
  assert.ok(slugify('x'.repeat(80)).length <= 48)
})

test('four distinct portrait headlines', () => {
  const headlines = SCREENS.map((screen) => screen.headline)
  assert.equal(new Set(headlines).size, 4)
  for (const headline of headlines) {
    assert.ok(headline.split(/\s+/).length <= 5, headline)
    assert.doesNotMatch(headline, /\d/)
  }
})

test('portrait prompt pins copy, palette and text-free covers', () => {
  const prompt = portraitPrompt(SCREENS[0], 'Demo App', palette)
  assert.ok(prompt.includes('"Free to Start"'))
  assert.ok(prompt.includes('#7E57FF'))
  assert.match(prompt, /never reproduce the sheet/i)
  assert.match(prompt, /no titles/i)
  assert.match(prompt, /no episode numbers/i)
  assert.match(prompt, /1080x1920/)
  assert.doesNotMatch(prompt, CJK)
})

test('banner prompt states the target ratio and safe margins', () => {
  const prompt = bannerPrompt('Demo App', palette)
  assert.ok(prompt.includes('1024x500'))
  assert.match(prompt, />=8% empty margin/i)
  assert.match(prompt, /no titles/i)
  assert.doesNotMatch(prompt, CJK)
})

test('no exaggerated claim words in generated copy', () => {
  const copy = [...SCREENS.flatMap((screen) => [screen.headline, screen.subline]), 'Short stories, anywhere'].join(' ')
  assert.doesNotMatch(copy, /\b(unlimited|infinite|best|#1|free forever|no ads|download|install)\b/i)
})
