// Typed localStorage module: settings, history, bookmarks, watch progress

export interface AppSettings {
  torrserverUrl: string
  jackettUrl: string
  jackettApiKey: string
  jackettIndexers: Record<string, boolean>
  tmdbApiKey: string
  autoplay: boolean
  preferredQuality: 'any' | '2160p' | '1080p' | '720p'
  audioLanguage: 'any' | 'ru' | 'en' | 'original'
  subtitlesEnabled: boolean
  subtitleLanguage: 'any' | 'ru' | 'en'
  subtitleSize: 'small' | 'medium' | 'large'
  subtitleColor: string
  subtitlePosition: 'bottom' | 'top'
  theme: 'dark' | 'light'
  cardSize: 'small' | 'medium' | 'large'
  showRatings: boolean
  sortOrder: 'relevance' | 'rating' | 'year' | 'title'
  uiLanguage: 'ru'
}

export const DEFAULT_SETTINGS: AppSettings = {
  torrserverUrl: '',
  jackettUrl: '',
  jackettApiKey: '',
  jackettIndexers: {
    rutracker: true,
    rutor: true,
    kinozal: true,
    megapeer: true,
    nnmclub: true,
    anilibria: false,
  },
  tmdbApiKey: '',
  autoplay: true,
  preferredQuality: 'any',
  audioLanguage: 'any',
  subtitlesEnabled: true,
  subtitleLanguage: 'any',
  subtitleSize: 'medium',
  subtitleColor: '#ffffff',
  subtitlePosition: 'bottom',
  theme: 'dark',
  cardSize: 'medium',
  showRatings: true,
  sortOrder: 'relevance',
  uiLanguage: 'ru',
}

export interface MediaRef {
  id: number
  mediaType: 'movie' | 'tv'
  title: string
  posterPath: string | null
  year?: string
  voteAverage?: number
}

export interface HistoryItem extends MediaRef {
  watchedAt: number
  season?: number
  episode?: number
}

export interface BookmarkItem extends MediaRef {
  addedAt: number
}

export interface WatchProgress {
  position: number // seconds
  duration: number // seconds
  updatedAt: number
  // playback context to resume without re-picking a release
  torrentHash?: string
  fileIndex?: number
  fileName?: string
  season?: number
  episode?: number
}

const KEYS = {
  settings: 'ts-app:settings',
  history: 'ts-app:history',
  bookmarks: 'ts-app:bookmarks',
  progress: 'ts-app:progress',
} as const

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable — fail silently
  }
}

// ----- Settings -----
export function loadSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<AppSettings>>(KEYS.settings, {}) }
}

export function saveSettings(settings: AppSettings) {
  write(KEYS.settings, settings)
}

// ----- History -----
const HISTORY_LIMIT = 100

export function getHistory(): HistoryItem[] {
  return read<HistoryItem[]>(KEYS.history, [])
}

export function addToHistory(item: Omit<HistoryItem, 'watchedAt'>) {
  const list = getHistory().filter(
    (h) => !(h.id === item.id && h.mediaType === item.mediaType && h.season === item.season && h.episode === item.episode),
  )
  list.unshift({ ...item, watchedAt: Date.now() })
  write(KEYS.history, list.slice(0, HISTORY_LIMIT))
}

export function removeFromHistory(id: number, mediaType: string, season?: number, episode?: number) {
  write(
    KEYS.history,
    getHistory().filter((h) => !(h.id === id && h.mediaType === mediaType && h.season === season && h.episode === episode)),
  )
}

export function clearHistory() {
  write(KEYS.history, [])
}

// ----- Bookmarks -----
export function getBookmarks(): BookmarkItem[] {
  return read<BookmarkItem[]>(KEYS.bookmarks, [])
}

export function isBookmarked(id: number, mediaType: string): boolean {
  return getBookmarks().some((b) => b.id === id && b.mediaType === mediaType)
}

export function toggleBookmark(item: MediaRef): boolean {
  const list = getBookmarks()
  const idx = list.findIndex((b) => b.id === item.id && b.mediaType === item.mediaType)
  if (idx >= 0) {
    list.splice(idx, 1)
    write(KEYS.bookmarks, list)
    return false
  }
  list.unshift({ ...item, addedAt: Date.now() })
  write(KEYS.bookmarks, list)
  return true
}

export function clearBookmarks() {
  write(KEYS.bookmarks, [])
}

// ----- Watch progress -----
type ProgressMap = Record<string, WatchProgress>

export function progressKey(id: number, mediaType: string, season?: number, episode?: number): string {
  return season != null && episode != null ? `${mediaType}:${id}:s${season}e${episode}` : `${mediaType}:${id}`
}

export function getProgress(key: string): WatchProgress | null {
  const map = read<ProgressMap>(KEYS.progress, {})
  return map[key] ?? null
}

export function saveProgress(key: string, progress: WatchProgress) {
  const map = read<ProgressMap>(KEYS.progress, {})
  map[key] = progress
  // keep the map bounded
  const entries = Object.entries(map)
  if (entries.length > 200) {
    entries.sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    write(KEYS.progress, Object.fromEntries(entries.slice(0, 200)))
    return
  }
  write(KEYS.progress, map)
}

export function removeProgress(key: string) {
  const map = read<ProgressMap>(KEYS.progress, {})
  delete map[key]
  write(KEYS.progress, map)
}

export function clearAllProgress() {
  write(KEYS.progress, {})
}
