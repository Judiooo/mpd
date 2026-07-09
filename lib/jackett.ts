// Jackett release parsing helpers

export interface JackettRelease {
  title: string
  size: number
  seeders: number
  peers: number
  tracker: string
  magnet: string | null
  link: string | null
  infoHash: string | null
  publishDate: string
  category: string
}

export type Quality = '2160p' | '1080p' | '720p' | '480p' | 'unknown'

export function detectQuality(title: string): Quality {
  const t = title.toLowerCase()
  if (/2160p|4k|uhd/.test(t)) return '2160p'
  if (/1080p|1080i|fullhd|fhd/.test(t)) return '1080p'
  if (/720p|hd(?!r)/.test(t)) return '720p'
  if (/480p|dvdrip|tvrip|satrip/.test(t)) return '480p'
  return 'unknown'
}

export function detectVoice(title: string): string | null {
  const t = title.toLowerCase()
  if (/дубляж|dub|дублирован/.test(t)) return 'Дубляж'
  if (/lostfilm/.test(t)) return 'LostFilm'
  if (/hdrezka/.test(t)) return 'HDRezka'
  if (/кубик в кубе|kubik/.test(t)) return 'Кубик в Кубе'
  if (/многоголос|mvo/.test(t)) return 'Многоголосый'
  if (/двухголос|dvo/.test(t)) return 'Двухголосый'
  if (/одноголос|avo|vo /.test(t)) return 'Одноголосый'
  if (/субтитр|sub/.test(t)) return 'Субтитры'
  return null
}

export function formatSize(bytes: number): string {
  if (!bytes) return '—'
  const gb = bytes / 1024 ** 3
  if (gb >= 1) return `${gb.toFixed(2)} ГБ`
  const mb = bytes / 1024 ** 2
  return `${mb.toFixed(0)} МБ`
}

export async function searchReleases(
  jackettUrl: string,
  apiKey: string,
  query: string,
): Promise<JackettRelease[]> {
  const params = new URLSearchParams({ url: jackettUrl, apikey: apiKey, query })
  const res = await fetch(`/api/jackett/search?${params}`)
  const data = (await res.json()) as { results?: JackettRelease[]; error?: string }
  if (!res.ok) throw new Error(data.error ?? 'Ошибка поиска релизов')
  return data.results ?? []
}
