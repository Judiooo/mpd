// TMDB types and client helpers (requests go through /api/tmdb proxy)

import { loadSettings } from './storage'

export interface TmdbMedia {
  id: number
  media_type?: 'movie' | 'tv' | 'person'
  title?: string // movie
  name?: string // tv
  original_title?: string
  original_name?: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string // movie
  first_air_date?: string // tv
  vote_average: number
  vote_count: number
  genre_ids?: number[]
}

export interface TmdbGenre {
  id: number
  name: string
}

export interface TmdbCredits {
  cast: { id: number; name: string; character: string; profile_path: string | null }[]
}

export interface TmdbVideos {
  results: { key: string; site: string; type: string; name: string }[]
}

export interface TmdbMovieDetails extends TmdbMedia {
  genres: TmdbGenre[]
  runtime: number | null
  tagline: string
  status: string
  production_countries: { name: string }[]
  credits?: TmdbCredits
  videos?: TmdbVideos
  recommendations?: { results: TmdbMedia[] }
}

export interface TmdbSeason {
  id: number
  season_number: number
  name: string
  episode_count: number
  poster_path: string | null
  air_date: string | null
}

export interface TmdbEpisode {
  id: number
  episode_number: number
  season_number: number
  name: string
  overview: string
  still_path: string | null
  air_date: string | null
  runtime: number | null
  vote_average: number
}

export interface TmdbTvDetails extends TmdbMedia {
  genres: TmdbGenre[]
  number_of_seasons: number
  number_of_episodes: number
  seasons: TmdbSeason[]
  episode_run_time: number[]
  status: string
  tagline: string
  credits?: TmdbCredits
  videos?: TmdbVideos
  recommendations?: { results: TmdbMedia[] }
}

export interface TmdbListResponse {
  page: number
  results: TmdbMedia[]
  total_pages: number
  total_results: number
}

const IMG_BASE = 'https://image.tmdb.org/t/p'

export function posterUrl(path: string | null, size: 'w342' | 'w500' = 'w342'): string | null {
  return path ? `${IMG_BASE}/${size}${path}` : null
}

export function backdropUrl(path: string | null, size: 'w1280' | 'original' = 'w1280'): string | null {
  return path ? `${IMG_BASE}/${size}${path}` : null
}

export function profileUrl(path: string | null): string | null {
  return path ? `${IMG_BASE}/w185${path}` : null
}

export function stillUrl(path: string | null): string | null {
  return path ? `${IMG_BASE}/w300${path}` : null
}

export function mediaTitle(m: TmdbMedia): string {
  return m.title ?? m.name ?? 'Без названия'
}

export function mediaYear(m: TmdbMedia): string {
  const date = m.release_date ?? m.first_air_date
  return date ? date.slice(0, 4) : ''
}

export function originalTitle(m: TmdbMedia): string {
  return m.original_title ?? m.original_name ?? ''
}

export async function tmdbFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const search = new URLSearchParams(params)
  const qs = search.toString()
  const apiKey = typeof window !== 'undefined' ? loadSettings().tmdbApiKey : ''
  const res = await fetch(`/api/tmdb/${path}${qs ? `?${qs}` : ''}`, {
    headers: apiKey ? { 'x-tmdb-api-key': apiKey } : undefined,
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? `Ошибка TMDB (${res.status})`)
  }
  return (await res.json()) as T
}

// SWR-compatible fetcher
export const tmdbFetcher = <T = unknown>(path: string) => tmdbFetch<T>(path)
