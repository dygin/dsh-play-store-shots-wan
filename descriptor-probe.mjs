import { Context, Service } from '@deepseek-ai/cordis'
import commandsModule from '/Users/clygin/.npm-global/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-commands/lib/index.js'
import * as plugin from './lib/index.mjs'

class Attachments extends Service {
  constructor(ctx) { super(ctx, 'attachments') }
  async readImage() { return { data: new Uint8Array([1]) } }
}

const ctx = new Context()
ctx.plugin(commandsModule)
ctx.plugin(Attachments)
await new Promise((r) => setTimeout(r, 300))
ctx.plugin(plugin, { apiKey: 'sk-test', baseUrl: 'http://127.0.0.1:9', model: 'm', outputDir: '/tmp/o' })
await new Promise((r) => setTimeout(r, 400))

const agent = { session: { header: { cwd: '/tmp' } } }
for (const method of ['list', 'find']) {
  try {
    const value = method === 'list' ? ctx.commands.list(agent) : ctx.commands.find(agent, 'playstoreshots')
    console.log(method, '->', JSON.stringify(value))
  } catch (error) {
    console.log(method, 'threw:', error.message)
  }
}
