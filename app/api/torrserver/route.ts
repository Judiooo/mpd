import { NextRequest, NextResponse } from 'next/server'

// Proxy for TorrServer (MatriX) JSON API.
// The video stream itself goes directly from the player to TorrServer —
// only control-plane requests (add/get/list/rem/echo) go through this proxy
// to avoid CORS and mixed-content issues.

function normalizeBase(url: string): string {
  return url.replace(/\/+$/, '')
}

interface ProxyBody {
  serverUrl: string
  action: 'add' | 'get' | 'list' | 'rem' | 'echo'
  payload?: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  let body: ProxyBody
  try {
    body = (await req.json()) as ProxyBody
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const { serverUrl, action, payload } = body
  if (!serverUrl) {
    return NextResponse.json({ error: 'TorrServer не настроен. Укажите URL в настройках.' }, { status: 400 })
  }

  const base = normalizeBase(serverUrl)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    let res: Response
    if (action === 'echo') {
      res = await fetch(`${base}/echo`, { signal: controller.signal, cache: 'no-store' })
      clearTimeout(timeout)
      const text = await res.text()
      return NextResponse.json({ ok: res.ok, version: text })
    }

    res = await fetch(`${base}/torrents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json({ error: `TorrServer вернул ошибку ${res.status}: ${text.slice(0, 200)}` }, { status: 502 })
    }

    const text = await res.text()
    if (!text) return NextResponse.json({ ok: true })
    try {
      return NextResponse.json(JSON.parse(text))
    } catch {
      return NextResponse.json({ ok: true, raw: text })
    }
  } catch (err) {
    clearTimeout(timeout)
    const isAbort = err instanceof Error && err.name === 'AbortError'
    return NextResponse.json(
      { error: isAbort ? 'TorrServer не ответил вовремя (таймаут)' : 'TorrServer недоступен: проверьте URL в настройках' },
      { status: 502 },
    )
  }
}
