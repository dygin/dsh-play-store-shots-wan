import { useEffect, useState } from 'react'

interface GalleryFile {
  name: string
  headline: string
  width: number
  height: number
}

interface LatestRun {
  appName: string
  generatedAt: string
  files: GalleryFile[]
}

const BASE = '/plugins/dsh-play-store-shots-wan'

/**
 * The conversation composer dock reads the last run from the Host and shows the
 * boards inline. Command results are plain text, so this strip is how the
 * pictures reach the UI; a new run replaces it, dismissing hides that run only.
 */
export function Gallery({ t }: { t: (key: string) => string }) {
  const [run, setRun] = useState<LatestRun | null>(null)
  const [dismissed, setDismissed] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    const read = async () => {
      try {
        const response = await fetch(`${BASE}/latest.json`, { cache: 'no-store' })
        const body = (await response.json()) as { run?: LatestRun }
        if (live) setRun(body.run ?? null)
      } catch {
        /* the Host may be restarting; the next tick retries */
      }
    }
    void read()
    const timer = setInterval(read, 5000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [])

  if (!run || run.generatedAt === dismissed) return null

  return (
    <section className="pss-gallery">
      <div className="pss-gallery-head">
        <span className="pss-gallery-title">
          {t('galleryTitle')} · {run.appName}
        </span>
        <button className="pss-gallery-close" type="button" aria-label={t('galleryClose')} onClick={() => setDismissed(run.generatedAt)}>
          ×
        </button>
      </div>
      <ul className="pss-gallery-list">
        {run.files.map((file, index) => (
          <li className="pss-gallery-item" key={file.name}>
            <a href={`${BASE}/image?i=${index}`} target="_blank" rel="noreferrer">
              <img className="pss-gallery-thumb" src={`${BASE}/image?i=${index}`} alt={file.headline} loading="lazy" />
            </a>
            <span className="pss-gallery-caption">{file.headline}</span>
            <span className="pss-gallery-meta">
              {file.width}×{file.height}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
