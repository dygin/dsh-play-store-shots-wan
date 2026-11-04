import z from '@deepseek-ai/schemastery'

export const DEFAULT_BASE_URL = 'https://ws-gpgzmtcnyu9qtdc4.cn-beijing.maas.aliyuncs.com'
export const DEFAULT_MODEL = 'wan2.7-image-pro'
export const DEFAULT_OUTPUT_DIR = 'play-store-shots'

/**
 * Every field is volatile: that is what makes an entry editable from the
 * configuration card. Defaults are resolved by the schema, so a fresh install
 * already shows the working endpoint and model.
 */
export const Config = z.object({
  apiKey: z
    .string()
    .default('')
    .description('百炼 API Key。留空则回退到环境变量 WAN_API_KEY。')
    .volatile(),
  baseUrl: z
    .string()
    .default(DEFAULT_BASE_URL)
    .description('百炼专属网关地址，末尾不要带 /api/v1。')
    .volatile(),
  model: z
    .string()
    .default(DEFAULT_MODEL)
    .description('图像模型；wan2.7-image-pro 支持 4K 与多图参考。')
    .volatile(),
  outputDir: z
    .string()
    .default(DEFAULT_OUTPUT_DIR)
    .description('输出目录，相对路径基于会话工作目录。')
    .volatile(),
})

export interface Settings {
  apiKey: string
  baseUrl: string
  model: string
  outputDir: string
}

/** A volatile reference as handed to `apply`; reads always see the latest edit. */
interface Live<T> {
  get(): T
}

export type ConfigInput = { [K in keyof Settings]: Live<Settings[K]> }

export function readSettings(config: ConfigInput): Settings {
  return {
    apiKey: (config.apiKey.get() || process.env.WAN_API_KEY || '').trim(),
    baseUrl: (config.baseUrl.get() || DEFAULT_BASE_URL).trim().replace(/\/+$/, ''),
    model: (config.model.get() || DEFAULT_MODEL).trim(),
    outputDir: (config.outputDir.get() || DEFAULT_OUTPUT_DIR).trim(),
  }
}
