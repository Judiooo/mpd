import { SearchRequest } from './types'

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean).map((v) => v.trim()))]
}

function seasonString(season: number): string {
  return `S${String(season).padStart(2, '0')}`
}

function episodeString(season: number, episode: number): string {
  return `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
}

export function buildMovieQueries(request: SearchRequest): string[] {
  const queries: string[] = []

  const titles = unique([
    request.title,
    request.originalTitle ?? '',
    ...(request.aliases ?? []),
  ])

  for (const title of titles) {
    if (request.year) {
      queries.push(`${title} ${request.year}`)
    }

    queries.push(title)
  }

  return unique(queries)
}

export function buildTvQueries(request: SearchRequest): string[] {
  const queries: string[] = []

  const titles = unique([
    request.title,
    request.originalTitle ?? '',
    ...(request.aliases ?? []),
  ])

  for (const title of titles) {
    if (
      request.season !== undefined &&
      request.episode !== undefined
    ) {
      queries.push(`${title} ${episodeString(request.season, request.episode)}`)
      queries.push(`${title} ${request.season}x${request.episode}`)
      queries.push(`${title} Season ${request.season}`)
      queries.push(`${title} ${request.season} сезон`)
    }

    if (
      request.season !== undefined &&
      request.episode === undefined
    ) {
      queries.push(`${title} ${seasonString(request.season)}`)
      queries.push(`${title} Season ${request.season}`)
      queries.push(`${title} ${request.season} сезон`)
    }

    if (request.year) {
      queries.push(`${title} ${request.year}`)
    }

    queries.push(title)
  }

  return unique(queries)
}

export function buildQueries(request: SearchRequest): string[] {
  return request.mediaType === 'movie'
    ? buildMovieQueries(request)
    : buildTvQueries(request)
}