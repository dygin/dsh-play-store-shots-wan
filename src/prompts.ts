export interface Palette {
  /** Dominant logo colour. */
  primary: string
  /** Most chromatic sampled colour. */
  accent: string
  /** Darkest sampled colour. */
  background: string
  /** Lightest sampled colour. */
  light: string
}

export interface Screen {
  id: string
  headline: string
  subline: string
  layout: string
}

export const PORTRAIT_SIZE = '1080*1920'
export const BANNER_SIZE = '1638*800'
export const PORTRAIT_TARGET = { width: 1080, height: 1920 } as const
export const BANNER_TARGET = { width: 1024, height: 500 } as const

/**
 * Four copy sets that read as product benefits without promising inventory,
 * ranking or price. They deliberately avoid the phrasing store references use
 * ("watch free now", "download"), so a generated set never mirrors them.
 */
export const SCREENS: readonly Screen[] = [
  {
    id: '01',
    headline: 'Free to Start',
    subline: 'Short stories, anytime',
    layout:
      'The app icon alone at the top centre, about 14% of the frame width; large headline and subline in the upper third; one phone at a three-quarter angle in the lower half showing a waterfall of cover cards; a compact FREE pill near the bottom.',
  },
  {
    id: '02',
    headline: 'Find Your Genre',
    subline: 'Romance, suspense, comedy',
    layout:
      'Headline in the upper left; one row of four pill-shaped genre chips carrying only icons or colour fills, never words; a 2x3 grid of cover cards below.',
  },
  {
    id: '03',
    headline: 'Save & Continue',
    subline: 'Pick up where you left off',
    layout:
      'Headline centred above; one front-facing phone showing a saved-list layout, each row a cover thumbnail beside two grey placeholder bars instead of text.',
  },
  {
    id: '04',
    headline: 'Swipe to Discover',
    subline: 'One tap, next story',
    layout:
      'Headline in the lower third; three cover cards fanned out at slight angles; a small swipe-arrow glyph and three pagination dots.',
  },
]

const NEGATIVE =
  'Strictly avoid: Chinese characters or any non-Latin script, gibberish lettering, watermarks, QR codes, App Store or Google Play badges, star ratings, download counters, prices, device brand logos, camera notches, speaker slits, Apple-style home indicators, extra borders, and multi-panel collages.'

const COVER_RULE =
  'The short-drama cover thumbnails are frameless cinematic photographs: real faces, moody lighting, no overlay of any kind — no pills, no corner badges, no labels, no episode numbers, no titles, no logos, no watermarks. Phone UI shows icons and flat shapes only: no status bar, no clock, no battery or signal icons, no interface text, no fake numbers.'

function paletteLine(palette: Palette): string {
  return `Brand palette: primary ${palette.primary}, accent ${palette.accent}, background ${palette.background}, light ${palette.light}`
}

const STYLE =
  'Create ONE single vertical Google Play store screenshot, 9:16 portrait, flat modern vector illustration, premium mobile marketing key art.'

const IMAGE_ROLES =
  'IMAGE 1 is the app icon: reproduce it exactly as drawn (same shape, fill and glyph), keep it opaque, place it exactly once, never twice, never mirrored, never turn it into an outline, never recolour it to blend into the background, never add text. IMAGE 2 may be a sheet holding four screenshots: borrow only its colour system, typography weight and margin rhythm, never its wording or its layout, and never reproduce the sheet itself.'

export function portraitPrompt(screen: Screen, appName: string, palette: Palette): string {
  return [
    STYLE,
    IMAGE_ROLES,
    `App name: ${appName}`,
    paletteLine(palette),
    `Headline, render exactly these words: "${screen.headline}"`,
    `Subline, smaller and lighter: "${screen.subline}"`,
    `Background: build the backdrop from ${palette.background} or ${palette.primary}, never plain white.`,
    `Layout: ${screen.layout} Show a generic Android phone with slim bezels and no notch. Keep >=6% margins and a single hero scene filling the frame.`,
    COVER_RULE,
    NEGATIVE,
    `Output: one full-bleed ${PORTRAIT_TARGET.width}x${PORTRAIT_TARGET.height} image, sharp typography.`,
  ].join('\n\n')
}

export function bannerPrompt(appName: string, palette: Palette): string {
  return [
    'Create ONE single wide horizontal Google Play feature graphic, 1024x500, flat modern vector style, matching the screenshot brand system.',
    'IMAGE 1 is the app icon: reproduce it exactly, unchanged. IMAGE 2 is a layout reference only: never copy its wording, colours or composition.',
    `App name: ${appName}`,
    paletteLine(palette),
    `Headline, render exactly these words: "${appName}"`,
    'Subline, smaller and lighter: "Short stories, anywhere"',
    `Background: gradient from ${palette.background} to ${palette.primary}, never plain white.`,
    'Layout: logo and headline in the left 45%, two overlapping cinematic cover cards in the right 55% — each card filled with a photo, never an empty solid block — >=8% empty margin on every side, headline vertically centred, nothing important in the outer 8%.',
    'The cover cards contain no text at all: no titles, no subtitles, no numbers, no logos.',
    NEGATIVE,
    'Output: one 1024x500 image (generated larger, then downscaled).',
  ].join('\n\n')
}
