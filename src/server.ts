import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { GeneratedFile } from './pipeline.ts'

export interface LatestRun {
  appName: string
  directory: string
  generatedAt: string
  files: GeneratedFile[]
}

/** Where the last run is remembered across Host restarts. */
function latestFile(): string {
  return join(homedir(), '.dsh', 'play-store-shots', 'latest.json')
}

/** The most recent run; the gallery reads it. */
let latest: LatestRun | undefined

export function rememberRun(run: LatestRun): void {
  latest = run
  void (async () => {
    try {
      await mkdir(join(homedir(), '.dsh', 'play-store-shots'), { recursive: true })
      await writeFile(latestFile(), JSON.stringify(run))
    } catch {
      /* the in-memory copy still serves this process */
    }
  })()
}

async function loadRun(): Promise<LatestRun | undefined> {
  if (latest) return latest
  try {
    const parsed = JSON.parse(await readFile(latestFile(), 'utf8')) as LatestRun
    return Array.isArray(parsed?.files) && parsed.files.length > 0 ? parsed : undefined
  } catch {
    return undefined
  }
}

interface RouteRequest {
  url?: string
}

interface RouteResponse {
  writeHead(status: number, headers?: Record<string, string>): void
  end(body?: string | Uint8Array): void
}

interface WebServer {
  port: number
  register(route: { kind: 'exact'; path: string; handler: (req: RouteRequest, res: RouteResponse) => void | Promise<void> }): () => void
}

export interface RouteContext {
  webServer?: WebServer
  effect(execute: () => (() => void) | void, label?: string): void
}

const BASE = '/plugins/dsh-play-store-shots-wan'

function queryIndex(url: string): number | undefined {
  const at = url.indexOf('?')
  if (at === -1) return undefined
  for (const pair of url.slice(at + 1).split('&')) {
    const eq = pair.indexOf('=')
    if (eq === -1) continue
    if (pair.slice(0, eq) !== 'i') continue
    const value = Number(pair.slice(eq + 1))
    return Number.isInteger(value) && value >= 0 ? value : undefined
  }
  return undefined
}

/**
 * Serve the last run to the browser: a tiny JSON descriptor for the gallery
 * strip and the PNG bytes themselves. Both are read-only and same-origin, so
 * the strip needs no authenticated file API and no base64 in the page.
 */
export async function trace(line: string): Promise<void> {
  try {
    const dir = join(homedir(), '.dsh', 'logs')
    await mkdir(dir, { recursive: true })
    await appendFile(join(dir, 'play-store-shots.log'), `${new Date().toISOString()} ${line}\n`)
  } catch {
    /* ignore */
  }
}

export function mountRoutes(ctx: RouteContext): void {
  const server = ctx.webServer
  if (!server) return
  void trace('routes: mounting gallery endpoints')

  ctx.effect(
    () =>
      server.register({
        kind: 'exact',
        path: `${BASE}/latest.json`,
        handler: async (_req, res) => {
          const run = await loadRun()
          res.writeHead(200, {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
          })
          res.end(JSON.stringify(run ? { run } : {}))
        },
      }),
    'play-store-shots: latest run route',
  )

  ctx.effect(
    () =>
      server.register({
        kind: 'exact',
        path: `${BASE}/image`,
        handler: async (req, res) => {
          const run = await loadRun()
          const index = queryIndex(String(req.url ?? ''))
          const file = index === undefined ? undefined : run?.files[index]
          if (!run || !file) {
            res.writeHead(404)
            res.end('not found')
            return
          }
          try {
            const bytes = await readFile(join(run.directory, 'final', file.name))
            res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' })
            res.end(bytes)
          } catch {
            res.writeHead(404)
            res.end('not found')
          }
        },
      }),
    'play-store-shots: image route',
  )
}
