import { JackettRelease, Quality, detectQuality, detectVoice } from '@/lib/jackett'

export interface SeasonEpisode {
  season?: number
  episode?: number
}

export interface NormalizedRelease extends JackettRelease {
  normalizedTitle: string

  quality: Quality

  voice: string | null

  year?: number

  season?: number

  episode?: number

  source?: string

  codec?: string

  hdr?: boolean
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[._[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractYear(title: string): number | undefined {
  const match = title.match(/\b(19\d{2}|20\d{2})\b/)

  return match ? Number(match[1]) : undefined
}

export function extractSeasonEpisode(title: string): SeasonEpisode {
  const t = title.toLowerCase()

  let m =
    t.match(/\bs(\d{1,2})e(\d{1,2})\b/) ??
    t.match(/\b(\d{1,2})x(\d{1,2})\b/)

  if (m) {
    return {
      season: Number(m[1]),
      episode: Number(m[2]),
    }
  }

  m = t.match(/season\s*(\d{1,2})/)

  if (m) {
    return {
      season: Number(m[1]),
    }
  }

  m = t.match(/(\d{1,2})\s*сезон/)

  if (m) {
    return {
      season: Number(m[1]),
    }
  }

  m = t.match(/сезон\s*(\d{1,2})/)

  if (m) {
    return {
      season: Number(m[1]),
    }
  }

  m = t.match(/(\d{1,2})\s*серия/)

  if (m) {
    return {
      episode: Number(m[1]),
    }
  }

  m = t.match(/episode\s*(\d{1,2})/)

  if (m) {
    return {
      episode: Number(m[1]),
    }
  }

  return {}
}

function detectCodec(title: string): string | undefined {
  const t = title.toLowerCase()

  if (/x265|hevc|h265/.test(t)) return 'HEVC'

  if (/x264|h264|avc/.test(t)) return 'AVC'

  if (/av1/.test(t)) return 'AV1'

  return undefined
}

function detectSource(title: string): string | undefined {
  const t = title.toLowerCase()

  if (/bluray|blu-ray|bdrip|bdremux/.test(t)) return 'BluRay'

  if (/web[- ]?dl/.test(t)) return 'WEB-DL'

  if (/webrip/.test(t)) return 'WEBRip'

  if (/hdtv/.test(t)) return 'HDTV'

  if (/dvdrip/.test(t)) return 'DVDRip'

  if (/camrip|cam/.test(t)) return 'CAM'

  if (/ts|telesync/.test(t)) return 'TS'

  return undefined
}

function detectHdr(title: string): boolean {
  return /\bhdr\b|dolby.?vision|dv\b|hdr10/.test(title.toLowerCase())
}

export function normalizeRelease(
  release: JackettRelease,
): NormalizedRelease {
  const seasonEpisode = extractSeasonEpisode(release.title)

  return {
    ...release,

    normalizedTitle: normalizeTitle(release.title),

    quality: detectQuality(release.title),

    voice: detectVoice(release.title),

    year: extractYear(release.title),

    season: seasonEpisode.season,

    episode: seasonEpisode.episode,

    codec: detectCodec(release.title),

    source: detectSource(release.title),

    hdr: detectHdr(release.title),
  }
}

export function normalizeReleases(
  releases: JackettRelease[],
): NormalizedRelease[] {
  return releases.map(normalizeRelease)
}