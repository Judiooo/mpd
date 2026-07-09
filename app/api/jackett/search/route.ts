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

// Список индексаторов, по которым выполняется поиск
const INDEXERS = [
  'rutracker',
  'rutor',
  'kinozal',
  'megapeer',
  'nnmclub',
  'anilibria',
]

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
    const responses = await Promise.allSettled(
      enabledIndexers.map((indexer) =>
        searchIndexer(
          jackettUrl,
          apiKey,
          query,
          indexer,
        ),
      ),
    )

    const allResults: JackettResult[] = []

    for (const response of responses) {
      if (response.status === 'fulfilled') {
        allResults.push(...response.value)
      }
    }

    const results = allResults
      .filter((r) => (r.MagnetUri || r.Link) && r.Seeders > 0)
      .sort((a, b) => b.Seeders - a.Seeders)
      .slice(0, 60)
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
      }))

    return NextResponse.json({ results })
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