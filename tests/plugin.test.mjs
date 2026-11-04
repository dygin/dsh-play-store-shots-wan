import assert from 'node:assert/strict'
import test from 'node:test'
import { Context, Service } from '@deepseek-ai/cordis'
import * as plugin from '../lib/index.mjs'

class Commands extends Service {
  constructor(ctx) {
    super(ctx, 'commands')
  }
  register(definition) {
    this.definition = definition
    return () => {}
  }
}

class Attachments extends Service {
  constructor(ctx) {
    super(ctx, 'attachments')
    this.reads = 0
  }
  async readImage() {
    this.reads += 1
    return { data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) }
  }
}

const config = {
  apiKey: 'sk-test',
  baseUrl: 'http://127.0.0.1:9',
  model: 'wan2.7-image-pro',
  outputDir: '/tmp/dsh-play-store-shots-test',
}

test('mounts through cordis and reads the three attachments', async () => {
  const ctx = new Context()
  ctx.plugin(Commands)
  ctx.plugin(Attachments)
  ctx.plugin(plugin, config)
  await new Promise((resolve) => setTimeout(resolve, 300))

  const definition = ctx.commands.definition
  assert.ok(definition, 'command should be registered')

  const result = await definition.handler({
    rawInput: 'Probe',
    attachments: [1, 2, 3].map((id) => ({ type: 'image', attachment: { attachmentId: id } })),
    agent: {},
  })

  // Reading the store proves the plugin declared the attachment seam; without
  // it cordis throws `cannot get property "attachments" without inject`.
  assert.equal(ctx.attachments.reads, 3)
  assert.equal(result.kind, 'error')
  assert.doesNotMatch(result.text, /without inject/)
})
