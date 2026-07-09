export type MediaType = 'movie' | 'tv'

export interface SearchRequest {
  mediaType: MediaType

  title: string
  originalTitle?: string

  year?: number

  season?: number
  episode?: number

  imdbId?: string
  tmdbId?: number

  aliases?: string[]
}

export interface ParsedRelease {
  title: string

  normalizedTitle: string

  tracker: string

  size: number

  seeders: number

  peers: number

  magnet: string | null

  link: string | null

  infoHash: string | null

  publishDate: string

  category: string

  quality?: string

  voice?: string | null

  year?: number

  season?: number

  episode?: number

  score?: number
}