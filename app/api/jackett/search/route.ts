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
  const bad = ['trailer', 'трейлер', 'soundtrack', 'саундтрек', 'ost', 'бонус', 'extras', 'песня', 'mp3']
  return bad.some((b) => t.includes(b))
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

    console.log(`${indexer}: ${data.Results?.length ?? 0} результатов`)

    return data.Results ?? []
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
  const mediaType = req.nextUrl.searchParams.get('mediaType')
  const rawIndexers = req.nextUrl.searchParams.get('indexers')

  if (!jackettUrl || !apiKey) {
    return NextResponse.json(
      {
        error: 'Jackett не настроен. Укажите URL и API-ключ.',
      },
      {
        status: 400,
      },
    )
  }

  if (!query) {
    return NextResponse.json(
      {
        error: 'Пустой поисковый запрос',
      },
      {
        status: 400,
      },
    )
  }
  let enabledIndexers = INDEXERS

  if (rawIndexers) {
    try {
      const parsed = JSON.parse(rawIndexers) as Record<string, boolean>

      enabledIndexers = Object.entries(parsed)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name)

      if (enabledIndexers.length === 0) {
        enabledIndexers = INDEXERS
      }
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
    }
    if (originalTitle && originalTitle !== title) {
      if (year) queries.push(`${originalTitle} ${year}`)
      queries.push(originalTitle)
    }
    // fallback to raw query if nothing else
    if (queries.length === 0 && query) queries.push(query)

    // execute searches in parallel for all indexers x queries
    const calls: Promise<JackettResult[]>[] = []
    for (const indexer of enabledIndexers) {
      for (const q of queries) {
        calls.push(searchIndexer(jackettUrl, apiKey, q, indexer))
      }
    }

    const responses = await Promise.allSettled(calls)
    const allResults: JackettResult[] = []
    for (const r of responses) {
      if (r.status === 'fulfilled') allResults.push(...r.value)
    }

    // normalize and filter
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
    }

    const mapped: Norm[] = allResults
      .filter((r) => (r.MagnetUri || r.Link) && r.Seeders >= 0)
      .filter((r) => !isIrrelevantTitle(r.Title))
      .map((r) => ({
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
        indexer: r.Tracker?.toLowerCase?.(),
      }))

    // deduplicate by infoHash, then by normalized title+size
    const byHash = new Map<string, Norm>()
    const byTitleSize = new Map<string, Norm>()
    const resultsDedup: Norm[] = []
    for (const r of mapped) {
      if (r.infoHash) {
        if (byHash.has(r.infoHash)) continue
        byHash.set(r.infoHash, r)
        resultsDedup.push(r)
        continue
      }
      const key = `${normalizeTitleForCompare(r.title)}|${r.size}`
      if (byTitleSize.has(key)) continue
      byTitleSize.set(key, r)
      resultsDedup.push(r)
    }

    // scoring/ranking
    function scoreItem(item: Norm) {
      let score = 0
      // seeders weight
      score += Math.log10((item.seeders || 0) + 1) * 10
      // prefer larger size slightly
      score += Math.log10((item.size || 0) + 1) * 0.5
      // indexer priority
      const idx = item.indexer ? INDEXER_PRIORITY[item.indexer] ?? 100 : 100
      score += Math.max(0, 20 - idx)
      return score
    }

    const scored = resultsDedup
      .map((r) => ({ ...r, _score: scoreItem(r) }))
      .sort((a, b) => b._score - a._score || b.seeders - a.seeders)
      .slice(0, 200)
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