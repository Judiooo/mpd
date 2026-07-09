import { NormalizedRelease } from './search-normalizer'

export interface RankingRequest {
  title: string
  originalTitle?: string

  year?: number

  mediaType: 'movie' | 'tv'

  season?: number
  episode?: number
}

const QUALITY_SCORE: Record<string, number> = {
  '2160p': 10,
  '1080p': 8,
  '720p': 6,
  '480p': 3,
  unknown: 0,
}

const VOICE_SCORE: Record<string, number> = {
  'Дубляж': 8,
  'LostFilm': 7,
  'HDRezka': 6,
  'Кубик в Кубе': 6,
  'Многоголосый': 5,
  'Двухголосый': 4,
  'Одноголосый': 2,
  'Субтитры': 1,
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, ' ')
    .trim()
}

function titleScore(
  release: NormalizedRelease,
  request: RankingRequest,
): number {
  const candidates = [
    request.title,
    request.originalTitle ?? '',
  ]
    .map(normalize)
    .filter(Boolean)

  const title = release.normalizedTitle

  let best = 0

  for (const candidate of candidates) {
    if (candidate === title) {
      best = Math.max(best, 50)
      continue
    }

    if (title.includes(candidate)) {
      best = Math.max(best, 40)
      continue
    }

    const words = candidate.split(' ')

    const matches = words.filter((w) => title.includes(w)).length

    best = Math.max(best, matches * 8)
  }

  return best
}

function yearScore(
  release: NormalizedRelease,
  request: RankingRequest,
) {
  if (!request.year) return 0

  if (release.year === request.year) return 20

  return 0
}

function seasonScore(
  release: NormalizedRelease,
  request: RankingRequest,
) {
  if (request.mediaType !== 'tv') return 0

  let score = 0

  if (
    request.season !== undefined &&
    release.season === request.season
  ) {
    score += 30
  }

  if (
    request.episode !== undefined &&
    release.episode === request.episode
  ) {
    score += 25
  }

  return score
}

function qualityScore(release: NormalizedRelease) {
  return QUALITY_SCORE[release.quality] ?? 0
}

function voiceScore(release: NormalizedRelease) {
  if (!release.voice) return 0

  return VOICE_SCORE[release.voice] ?? 0
}

function hdrScore(release: NormalizedRelease) {
  return release.hdr ? 5 : 0
}

function seedScore(release: NormalizedRelease) {
  return Math.min(release.seeders, 50) / 10
}

function trackerScore(release: NormalizedRelease) {
  const tracker = release.tracker.toLowerCase()

  if (tracker.includes('rutracker')) return 5

  if (tracker.includes('kinozal')) return 5

  if (tracker.includes('megapeer')) return 4

  if (tracker.includes('rutor')) return 4

  return 1
}

export function scoreRelease(
  release: NormalizedRelease,
  request: RankingRequest,
): number {
  return (
    titleScore(release, request) +
    yearScore(release, request) +
    seasonScore(release, request) +
    qualityScore(release) +
    voiceScore(release) +
    hdrScore(release) +
    seedScore(release) +
    trackerScore(release)
  )
}

export function rankReleases(
  releases: NormalizedRelease[],
  request: RankingRequest,
): NormalizedRelease[] {
  return releases
    .map((r) => ({
      ...r,
      score: scoreRelease(r, request),
    }))
    .sort((a, b) => {
      if ((b.score ?? 0) !== (a.score ?? 0)) {
        return (b.score ?? 0) - (a.score ?? 0)
      }

      return b.seeders - a.seeders
    })
}