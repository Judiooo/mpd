import { NextRequest, NextResponse } from 'next/server'

const TMDB_BASE = 'https://api.themoviedb.org/3'

// Allowlist of TMDB path prefixes the client may request
const ALLOWED = [
  'trending/',
  'movie/',
  'tv/',
  'search/',
  'discover/',
  'genre/',
  'person/',
]

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const apiKey = req.headers.get('x-tmdb-api-key') || process.env.TMDB_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'TMDB API-ключ не настроен. Укажите его в Настройках → Серверы.' },
      { status: 500 },
    )
  }

  const { path } = await ctx.params
  const tmdbPath = path.join('/')
  if (!ALLOWED.some((p) => tmdbPath.startsWith(p))) {
    return NextResponse.json({ error: 'Недопустимый путь TMDB' }, { status: 400 })
  }

  const url = new URL(`${TMDB_BASE}/${tmdbPath}`)
  req.nextUrl.searchParams.forEach((value, key) => {
    if (key !== 'api_key') url.searchParams.set(key, value)
  })
  if (!url.searchParams.has('language')) url.searchParams.set('language', 'ru-RU')

  // Support both v3 api keys and v4 read access tokens
  const isV4Token = apiKey.startsWith('eyJ')
  if (!isV4Token) url.searchParams.set('api_key', apiKey)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: isV4Token ? { Authorization: `Bearer ${apiKey}` } : undefined,
      next: { revalidate: 600 },
    })
    clearTimeout(timeout)
    const data = await res.json()
    return NextResponse.json(data, {
      status: res.status,
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' },
    })
  } catch {
    return NextResponse.json({ error: 'TMDB недоступен, попробуйте позже' }, { status: 502 })
  }
}
