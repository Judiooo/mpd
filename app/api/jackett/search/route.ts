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

const pendingRequests = new Map<string, Promise<NextResponse>>()
const responseCache = new Map<string, { expiresAt: number; status: number; payload: unknown }>()
const JACKETT_TIMEOUT_MS = 10000
const CACHE_TTL_MS = 8000

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

  const cacheKey = `${normalizeBase(jackettUrl)}|${apiKey}|${query}`
  const now = Date.now()
  const cached = responseCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.payload, { status: cached.status })
  }

  const existing = pendingRequests.get(cacheKey)
  if (existing) {
    return existing
  }

  const request = (async () => {
    const url = new URL(`${normalizeBase(jackettUrl)}/api/v2.0/indexers/all/results`)
    url.searchParams.set('apikey', apiKey)
    url.searchParams.set('Query', query)

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), JACKETT_TIMEOUT_MS)
      const res = await fetch(url.toString(), { signal: controller.signal, cache: 'no-store' })
      clearTimeout(timeout)

      if (res.status === 401 || res.status === 403) {
        const payload = { error: 'Jackett отклонил запрос: проверьте API-ключ' }
        responseCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, status: 401, payload })
        return NextResponse.json(payload, { status: 401 })
      }
      if (!res.ok) {
        const payload = { error: `Jackett вернул ошибку ${res.status}` }
        responseCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, status: 502, payload })
        return NextResponse.json(payload, { status: 502 })
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

      const payload = { results }
      responseCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, status: 200, payload })
      return NextResponse.json(payload)
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError'
      const payload = {
        error: isAbort ? 'Jackett не ответил вовремя (таймаут)' : 'Jackett недоступен: проверьте URL в настройках',
      }
      responseCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, status: 502, payload })
      return NextResponse.json(payload, { status: 502 })
    } finally {
      pendingRequests.delete(cacheKey)
    }
  })()

  pendingRequests.set(cacheKey, request)
  return request
}
