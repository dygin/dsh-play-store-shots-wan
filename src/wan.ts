export interface ReferenceImage {
  mime: string
  data: Buffer
}

export interface ImageRequest {
  baseUrl: string
  apiKey: string
  model: string
  prompt: string
  references: readonly ReferenceImage[]
  size: string
  signal?: AbortSignal
  /** Total transport attempts for the generation call. */
  attempts?: number
  /** Per-request deadline. */
  timeoutMs?: number
}

export class WanError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly retryable = false,
  ) {
    super(message)
    this.name = 'WanError'
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

function deadline(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timer = AbortSignal.timeout(timeoutMs)
  return signal ? AbortSignal.any([signal, timer]) : timer
}

/**
 * One synchronous `multimodal-generation` call, then the signed PNG download.
 * Bailian returns `{ code, message }` for rejections and `output.choices[0]`
 * for successes; both are handled here so callers only see bytes or WanError.
 */
export async function generateImage(request: ImageRequest): Promise<Buffer> {
  const endpoint = `${request.baseUrl.replace(/\/+$/, '')}/api/v1/services/aigc/multimodal-generation/generation`
  const content = [
    ...request.references.map((reference) => ({
      image: `data:${reference.mime};base64,${reference.data.toString('base64')}`,
    })),
    { text: request.prompt },
  ]
  const body = JSON.stringify({
    model: request.model,
    input: { messages: [{ role: 'user', content }] },
    parameters: { size: request.size, n: 1, watermark: false },
  })

  const attempts = request.attempts ?? 3
  let lastError: WanError | undefined

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${request.apiKey}`,
        },
        body,
        signal: deadline(request.signal, request.timeoutMs ?? 180_000),
      })

      const raw = await response.text()
      let payload: unknown
      try {
        payload = JSON.parse(raw)
      } catch {
        throw new WanError(`Bailian returned a non-JSON response (${response.status})`, undefined, isRetryableStatus(response.status))
      }

      const error = payload as { code?: string; message?: string }
      if (!response.ok || error.code) {
        throw new WanError(
          `Bailian ${error.code ?? response.status}: ${error.message ?? 'request failed'}`,
          error.code ?? String(response.status),
          isRetryableStatus(response.status),
        )
      }

      const url = (payload as { output?: { choices?: { message?: { content?: { image?: string }[] } }[] } })
        .output?.choices?.[0]?.message?.content?.find((part) => part.image)?.image
      if (!url) throw new WanError('Bailian response carried no image URL', 'no-image')

      return await download(url, request.signal)
    } catch (caught) {
      const name = (caught as Error | undefined)?.name
      if (name === 'AbortError') throw new WanError('请求已取消', 'aborted')
      const failure =
        caught instanceof WanError
          ? caught
          : new WanError(name === 'TimeoutError' ? '请求超时' : (caught as Error).message, 'network', true)
      lastError = failure
      if (!failure.retryable || attempt === attempts) break
      await sleep(1_000 * 2 ** (attempt - 1))
    }
  }

  throw lastError ?? new WanError('Bailian request failed')
}

async function download(url: string, signal?: AbortSignal): Promise<Buffer> {
  const response = await fetch(url, { signal: deadline(signal, 120_000) })
  if (!response.ok) throw new WanError(`image download failed (${response.status})`, 'download', true)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.byteLength < 1024) throw new WanError('downloaded image is empty', 'download', true)
  return bytes
}
