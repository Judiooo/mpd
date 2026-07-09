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

export async function GET(req: NextRequest) {
  const jackettUrl = req.nextUrl.searchParams.get('url')
  const apiKey = req.nextUrl.searchParams.get('apikey')
  const query = req.nextUrl.searchParams.get('query')

  if (!jackettUrl || !apiKey) {
    return NextResponse.json({ error: 'Jackett не настроен. Укажите URL и API-ключ в настройках.' }, { status: 400 })
  }
  if (!query) {
    return NextResponse.json({ error: 'Пустой поисковый запрос' }, { status: 400 })
  }

  const url = new URL(`${normalizeBase(jackettUrl)}/api/v2.0/indexers/all/results`)
  url.searchParams.set('apikey', apiKey)
  url.searchParams.set('Query', query)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)
    const res = await fetch(url.toString(), { signal: controller.signal, cache: 'no-store' })
    clearTimeout(timeout)

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ error: 'Jackett отклонил запрос: проверьте API-ключ' }, { status: 401 })
    }
    if (!res.ok) {
      return NextResponse.json({ error: `Jackett вернул ошибку ${res.status}` }, { status: 502 })
    }

    const data = (await res.json()) as { Results?: JackettResult[] }
    const results = (data.Results ?? [])
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
    const isAbort = err instanceof Error && err.name === 'AbortError'
    return NextResponse.json(
      { error: isAbort ? 'Jackett не ответил вовремя (таймаут)' : 'Jackett недоступен: проверьте URL в настройках' },
      { status: 502 },
    )
  }
}
