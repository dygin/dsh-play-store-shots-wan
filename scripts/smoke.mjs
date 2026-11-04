import { readFile } from 'node:fs/promises'
import { DEFAULT_BASE_URL, DEFAULT_MODEL, generateStoreShots } from '../lib/index.mjs'

const [logo, portrait, banner] = process.argv.slice(2)
const apiKey = process.env.WAN_API_KEY

if (!logo || !portrait || !banner) {
  console.error('usage: WAN_API_KEY=... node scripts/smoke.mjs <logo> <portrait-ref> <banner-ref>')
  process.exit(2)
}
if (!apiKey) {
  console.error('WAN_API_KEY is not set')
  process.exit(2)
}

const started = Date.now()
const result = await generateStoreShots({
  appName: process.env.SMOKE_APP_NAME ?? 'Smoke Demo',
  apiKey,
  baseUrl: process.env.WAN_BASE_URL ?? DEFAULT_BASE_URL,
  model: process.env.WAN_MODEL ?? DEFAULT_MODEL,
  outputRoot: 'play-store-shots',
  logo: await readFile(logo),
  portraitReference: await readFile(portrait),
  bannerReference: await readFile(banner),
  onProgress: (message) => console.log(`  ${message}`),
})

console.log(`\n${result.directory} (${((Date.now() - started) / 1000).toFixed(1)}s)`)
for (const file of result.files) {
  console.log(`  ${file.name} ${file.width}x${file.height} ${(file.bytes / 1024).toFixed(0)}KB ${file.headline}`)
}
