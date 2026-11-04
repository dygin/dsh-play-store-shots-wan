import assert from 'node:assert/strict'
import test from 'node:test'
import { apply } from '../lib/index.mjs'

function register(settings = {}) {
  const registered = []
  const ctx = {
    commands: {
      register(definition) {
        registered.push(definition)
        return () => {}
      },
    },
    attachments: {
      readImage: async () => ({ data: new Uint8Array([1, 2, 3]) }),
    },
    effect: (execute) => execute(),
    get: () => undefined,
  }
  const config = {
    apiKey: { get: () => settings.apiKey ?? 'sk-test' },
    baseUrl: { get: () => 'https://example.test' },
    model: { get: () => 'wan2.7-image-pro' },
    outputDir: { get: () => 'out' },
  }
  apply(ctx, config)
  return registered[0]
}

const image = (id) => ({ type: 'image', attachment: { attachmentId: id } })

test('registers an attachment-capable command', () => {
  const definition = register()
  assert.equal(definition.name, 'playstoreshots')
  assert.equal(definition.input.attachments, true)
})

test('rejects zero attachments', async () => {
  const result = await register().handler({ rawInput: 'Demo', attachments: [], agent: {} })
  assert.equal(result.kind, 'error')
  assert.match(result.text, /恰好 3 张图片/)
})

test('rejects four attachments', async () => {
  const result = await register().handler({
    rawInput: 'Demo',
    attachments: [image('a'), image('b'), image('c'), image('d')],
    agent: {},
  })
  assert.equal(result.kind, 'error')
  assert.match(result.text, /收到 4 个附件/)
})

test('rejects a non-image attachment', async () => {
  const result = await register().handler({
    rawInput: 'Demo',
    attachments: [image('a'), image('b'), { type: 'file', attachment: {} }],
    agent: {},
  })
  assert.equal(result.kind, 'error')
  assert.match(result.text, /图片 2 张/)
})

test('rejects a missing app name', async () => {
  const result = await register().handler({
    rawInput: '   ',
    attachments: [image('a'), image('b'), image('c')],
    agent: {},
  })
  assert.equal(result.kind, 'error')
  assert.match(result.text, /缺少应用名称/)
})

test('rejects a missing api key before calling the API', async () => {
  delete process.env.WAN_API_KEY
  const result = await register({ apiKey: '' }).handler({
    rawInput: 'Demo',
    attachments: [image('a'), image('b'), image('c')],
    agent: {},
  })
  assert.equal(result.kind, 'error')
  assert.match(result.text, /API Key/)
})
