import { NextRequest, NextResponse } from 'next/server'

interface JackettResult {
  Title: string
  Size: number
  Seeders: number
  Peers: number
  Tracker: string
  MagnetUri: string | null
  Link: string | null
  InfoHash: string | null
  PublishDate: string
  CategoryDesc: string
  Indexer?: string
}

function normalizeBase(url: string): string {
  return url.replace(/\/+$/, '')
}

// Список индексаторов и их приоритет (чем меньше — выше приоритет)
const INDEXERS = [
  'rutracker',
  'rutor',
  'kinozal',
  'megapeer',
  'nnmclub',
  'anilibria',
]

const INDEXER_PRIORITY: Record<string, number> = INDEXERS.reduce((acc, name, i) => ({ ...acc, [name]: i }), {})

function normalizeTitleForCompare(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9а-яё]+/g, ' ').trim()
}

function isIrrelevantTitle(title: string) {
  const t = title.toLowerCase()
  const bad = ['trailer', 'трейлер', 'soundtrack', 'саундтрек', 'ost', 'бонус', 'extras', 'песня', 'mp3', 'сборник', 'collection', 'boxset']
  if (bad.some((b) => t.includes(b))) return true
  if (/\b(mp3|flac|aac|wav)\b/.test(t)) return true
  return false
}

async function searchIndexer(
  baseUrl: string,
  apiKey: string,
  query: string,
  indexer: string,
): Promise<JackettResult[]> {
  const url = new URL(
    `${normalizeBase(baseUrl)}/api/v2.0/indexers/${indexer}/results`,
  )

  url.searchParams.set('apikey', apiKey)
  url.searchParams.set('Query', query)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const RESULT_LIMIT = 200
    console.log(`🔍 ${indexer}`)

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      cache: 'no-store',
    })

    if (res.status === 401 || res.status === 403) {
      console.log(`${indexer}: неверный API ключ`)
      return []
    }

    if (!res.ok) {
      console.log(`${indexer}: HTTP ${res.status}`)
      return []
    }

    const data = (await res.json()) as { Results?: JackettResult[] }

    const results = (data.Results ?? []).map((r) => ({ ...r, Indexer: indexer }))

    console.log(`${indexer}: ${results.length} результатов`)

    return results
  } catch (err) {
    console.log(`${indexer}: ошибка`, err)
    return []
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(req: NextRequest) {
  const jackettUrl = req.nextUrl.searchParams.get('url')
  const apiKey = req.nextUrl.searchParams.get('apikey')
  const query = req.nextUrl.searchParams.get('query')
  const title = req.nextUrl.searchParams.get('title')
  const originalTitle = req.nextUrl.searchParams.get('originalTitle')
  const year = req.nextUrl.searchParams.get('year')
  const seasonParam = req.nextUrl.searchParams.get('season')
  const episodeParam = req.nextUrl.searchParams.get('episode')
  const mediaType = req.nextUrl.searchParams.get('mediaType')
  const rawIndexers = req.nextUrl.searchParams.get('indexers')
  const RESULT_LIMIT = 200

  const targetSeason = seasonParam ? Number(seasonParam) : undefined
  const targetEpisode = episodeParam ? Number(episodeParam) : undefined

    // normalize and filter with preliminary scoring and smarter deduplication
    type Norm = {
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
      indexer?: string
      _quality?: string
      _voice?: string | null
      _seasonEp?: { season?: number; episode?: number }
      _prelim?: number
    }

    const sequelTokens = ['part', 'часть', 'ii', 'iii', 'iv', 'v', '2', '3', '4', '5', 'ii', 'iii']
    const negativeSubTokens = ['под прикрытием', 'undercover', 'подполье']

    function detectQualityFromTitle(s: string) {
      const t = s.toLowerCase()
      if (/2160p|4k|uhd/.test(t)) return '2160p'
      if (/1080p|1080i|fullhd|fhd/.test(t)) return '1080p'
      if (/720p|hd(?!r)/.test(t)) return '720p'
      if (/480p|dvdrip|tvrip|satrip/.test(t)) return '480p'
      return 'unknown'
    }

    function detectVoiceFromTitle(s: string) {
      const t = s.toLowerCase()
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

    function extractSeasonEpisode(s: string): { season?: number; episode?: number } {
      const t = s.toLowerCase()
      const seMatch = t.match(/s(\d{1,2})e(\d{1,2})/) || t.match(/(\d{1,2})x(\d{1,2})/)
      if (seMatch) return { season: Number(seMatch[1]), episode: Number(seMatch[2]) }
      const seRuMatch = t.match(/(\d{1,2}) сезон[^\d]*(\d{1,2}) серия/)
      if (seRuMatch) return { season: Number(seRuMatch[1]), episode: Number(seRuMatch[2]) }
      const seasonMatch = t.match(/season\s*(\d{1,2})/) || t.match(/(\d{1,2}) сезон/)
      if (seasonMatch) return { season: Number(seasonMatch[1]) }
      const simpleS = t.match(/\b(сезон|season)\s*(\d{1,2})\b/)
      if (simpleS) return { season: Number(simpleS[2]) }
      return {}
    }

    function getIndexerFromResult(r: JackettResult) {
      return (r.Indexer || r.Tracker || '').toLowerCase()
    }

    // choose enabled indexers
    let enabledIndexers = INDEXERS

    if (rawIndexers) {
      try {
        const parsed = JSON.parse(rawIndexers) as Record<string, boolean>
        enabledIndexers = Object.entries(parsed).filter(([, enabled]) => enabled).map(([name]) => name)
        if (enabledIndexers.length === 0) enabledIndexers = INDEXERS
      } catch {
        enabledIndexers = INDEXERS
      }
    }

    try {
      // build query variants
      const queries: string[] = []
      if (query) queries.push(query)
      if (title) {
        if (year) queries.push(`${title} ${year}`)
        queries.push(title)
        if (mediaType === 'tv' && targetSeason != null) {
          const seasonTag = `s${String(targetSeason).padStart(2, '0')}`
          const ruSeason = `${targetSeason} сезон`
          queries.push(`${title} ${seasonTag}`)
          queries.push(`${title} ${ruSeason}`)
          if (targetEpisode != null) {
            const episodeTag = `e${String(targetEpisode).padStart(2, '0')}`
            queries.push(`${title} ${seasonTag}${episodeTag}`)
            queries.push(`${title} ${seasonTag} ${episodeTag}`)
            queries.push(`${title} ${targetSeason}x${targetEpisode}`)
          }
        }
      }
      if (originalTitle && originalTitle !== title) {
        if (year) queries.push(`${originalTitle} ${year}`)
        queries.push(originalTitle)
        if (mediaType === 'tv' && targetSeason != null) {
          const seasonTag = `s${String(targetSeason).padStart(2, '0')}`
          const ruSeason = `${targetSeason} сезон`
          queries.push(`${originalTitle} ${seasonTag}`)
          queries.push(`${originalTitle} ${ruSeason}`)
          if (targetEpisode != null) {
            const episodeTag = `e${String(targetEpisode).padStart(2, '0')}`
            queries.push(`${originalTitle} ${seasonTag}${episodeTag}`)
            queries.push(`${originalTitle} ${seasonTag} ${episodeTag}`)
            queries.push(`${originalTitle} ${targetSeason}x${targetEpisode}`)
          }
        }
      }
      if (queries.length === 0 && query) queries.push(query)

      // execute searches in parallel for all indexers x queries
      const calls: Promise<JackettResult[]>[] = []
      for (const indexer of enabledIndexers) {
        for (const q of queries) {
          calls.push(searchIndexer(jackettUrl!, apiKey!, q, indexer))
        }
      }

      const responses = await Promise.allSettled(calls)
      const allResults: JackettResult[] = []
      for (const r of responses) {
        if (r.status === 'fulfilled') allResults.push(...r.value)
      }

    const mapped: Norm[] = allResults
      .filter((r) => (r.MagnetUri || r.Link) && r.Seeders >= 0)
      .filter((r) => !isIrrelevantTitle(r.Title))
      .map((r) => {
        const idx = getIndexerFromResult(r)
        const prelim = Math.log10((r.Seeders || 0) + 1) * 10 + Math.max(0, 20 - (INDEXER_PRIORITY[idx] ?? 100))
        return {
          title: r.Title,
          size: r.Size,
          seeders: r.Seeders,
          peers: r.Peers,
          tracker: r.Tracker,
          magnet: r.MagnetUri,
          link: r.Link,
          infoHash: r.InfoHash,
          publishDate: r.PublishDate,
          category: r.CategoryDesc,
          indexer: idx,
          _quality: detectQualityFromTitle(r.Title),
          _voice: detectVoiceFromTitle(r.Title),
          _seasonEp: extractSeasonEpisode(r.Title),
          _prelim: prelim,
        } as Norm
      })

    // smarter deduplication: keep the candidate with higher preliminary score
    const byHash = new Map<string, Norm>()
    const byTitleSize = new Map<string, Norm>()
    const resultsDedup: Norm[] = []
    for (const r of mapped) {
      if (r.infoHash) {
        const existing = byHash.get(r.infoHash)
        if (!existing) {
          byHash.set(r.infoHash, r)
          resultsDedup.push(r)
        } else if ((r._prelim ?? 0) > (existing._prelim ?? 0)) {
          // replace in array
          const idx = resultsDedup.indexOf(existing)
          if (idx >= 0) resultsDedup[idx] = r
          byHash.set(r.infoHash, r)
        }
        continue
      }
      const key = `${normalizeTitleForCompare(r.title)}|${r.size}`
      const existingTS = byTitleSize.get(key)
      if (!existingTS) {
        byTitleSize.set(key, r)
        resultsDedup.push(r)
      } else if ((r._prelim ?? 0) > (existingTS._prelim ?? 0)) {
        const idx = resultsDedup.indexOf(existingTS)
        if (idx >= 0) resultsDedup[idx] = r
        byTitleSize.set(key, r)
      }
    }

    // advanced filtering: exclude likely different movies (subtitles, sequels)
    function isLikelyDifferentMovie(item: Norm, target: string | undefined, targetYear?: number) {
      if (!target) return false
      const itemNorm = normalizeTitleForCompare(item.title)
      const targetNormLocal = normalizeTitleForCompare(target)
      // if item title contains negative subtitle tokens -> different
      for (const tkn of negativeSubTokens) {
        if (item.title.toLowerCase().includes(tkn)) return true
      }
      // detect sequel markers
      const lower = item.title.toLowerCase()
      for (const s of sequelTokens) {
        const re = new RegExp(`\\b${s}\\b`, 'i')
        if (re.test(lower) && !new RegExp(`\\b${s}\\b`, 'i').test(target.toLowerCase())) {
          return true
        }
      }
      // if target year provided and item has clearly different year -> likely different
      if (targetYear) {
        if (item.publishDate && !item.publishDate.includes(String(targetYear))) {
          // if item title includes a different year explicitly, exclude
          const yearMatch = item.title.match(/(19|20)\d{2}/g)
          if (yearMatch && !yearMatch.includes(String(targetYear))) return true
        }
      }
      // if normalized target words are not well represented in item -> likely different
      const targetWords = targetNormLocal.split(/\s+/).filter((w) => w.length > 2)
      const itemWords = itemNorm.split(/\s+/).filter((w) => w.length > 2)
      const matches = targetWords.filter((w) => itemWords.includes(w)).length
      if (targetWords.length > 0) {
        const ratio = matches / targetWords.length
        if (ratio < 0.5) return true
      }
      return false
    }


    

    // scoring/ranking with multiple factors and final filtering
    const targetNorm = normalizeTitleForCompare(title ?? originalTitle ?? query ?? '')
    const targetWords = (title ?? originalTitle ?? query ?? '').toLowerCase().split(/\s+/).filter((w) => w.length > 2)
    const targetYear = year ? Number(year) : undefined

    function scoreItem(item: Norm) {
      let score = 0

      const itemNorm = normalizeTitleForCompare(item.title)

      // title exact / contains / word overlap
      if (itemNorm === targetNorm && targetNorm.length > 0) {
        score += 40
      } else if (targetNorm && itemNorm.includes(targetNorm)) {
        score += 20
      } else {
        const itemWords = itemNorm.split(/\s+/).filter(Boolean)
        const matches = targetWords.filter((w) => itemWords.includes(w)).length
        if (targetWords.length > 0) {
          const ratio = matches / targetWords.length
          score += Math.round(ratio * 15)
        }
      }

      // year match
      if (targetYear) {
        if (item.publishDate && item.publishDate.includes(String(targetYear))) score += 12
        if (item.title && item.title.includes(String(targetYear))) score += 8
        // penalize if item mentions other year explicitly
        const years = (item.title.match(/(19|20)\d{2}/g) || []).map(Number)
        if (years.length > 0 && !years.includes(targetYear)) score -= 12
      }

      // season/episode matching for TV
      if (mediaType === 'tv' && targetSeason != null) {
        const s = item._seasonEp?.season
        const e = item._seasonEp?.episode
        if (s != null) {
          if (s === targetSeason) {
            score += 12
            if (targetEpisode != null && e != null && e === targetEpisode) score += 6
          } else {
            score -= 10
          }
        }
      }

      // quality
      const q = item._quality
      if (q === '2160p') score += 6
      else if (q === '1080p') score += 4
      else if (q === '720p') score += 2
      else if (q === '480p') score += 1

      // voice
      const v = item._voice
      if (v === 'LostFilm' || v === 'Дубляж') score += 3
      if (v === 'HDRezka') score += 2

      // seeders weight
      score += Math.log10((item.seeders || 0) + 1) * 10

      // size slight favor
      score += Math.log10((item.size || 0) + 1) * 0.5

      // indexer priority
      const idx = item.indexer ? INDEXER_PRIORITY[item.indexer] ?? 100 : 100
      score += Math.max(0, 20 - idx)

      return score
    }

    const scored = resultsDedup
      // filter out likely different movies (sequels, subtitle variants)
      .filter((it) => !isLikelyDifferentMovie(it, title ?? originalTitle ?? query, targetYear))
      .map((r) => ({ ...r, _score: scoreItem(r) }))
      .sort((a, b) => b._score - a._score || b.seeders - a.seeders)
      .slice(0, RESULT_LIMIT)
      .map((r) => ({
        title: r.title,
        size: r.size,
        seeders: r.seeders,
        peers: r.peers,
        tracker: r.tracker,
        magnet: r.magnet,
        link: r.link,
        infoHash: r.infoHash,
        publishDate: r.publishDate,
        category: r.category,
      }))

    return NextResponse.json({ results: scored })
  } catch (err) {
    console.error(err)

    return NextResponse.json(
      {
        error: 'Ошибка поиска в Jackett',
      },
      {
        status: 500,
      },
    )
  }
}