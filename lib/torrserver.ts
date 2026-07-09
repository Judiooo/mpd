// TorrServer (MatriX) client helpers — control requests go through /api/torrserver proxy,
// the video stream URL points directly at the TorrServer instance.

export interface TorrentFile {
  id: number
  path: string
  length: number
}

export interface TorrentInfo {
  hash: string
  title: string
  stat: number
  stat_string: string
  torrent_size: number
  download_speed: number
  active_peers: number
  total_peers: number
  connected_seeders: number
  loaded_size: number
  preloaded_bytes: number
  preload_size: number
  file_stats?: TorrentFile[]
}

async function proxy<T>(serverUrl: string, action: string, payload?: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/torrserver', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serverUrl, action, payload }),
  })
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) throw new Error(data.error ?? 'Ошибка TorrServer')
  return data
}

export async function tsEcho(serverUrl: string): Promise<string> {
  const data = await proxy<{ ok: boolean; version?: string }>(serverUrl, 'echo')
  if (!data.ok) throw new Error('TorrServer не отвечает')
  return data.version ?? ''
}

export async function tsAddTorrent(
  serverUrl: string,
  link: string,
  title: string,
  poster?: string,
): Promise<TorrentInfo> {
  return proxy<TorrentInfo>(serverUrl, 'add', { link, title, poster: poster ?? '', save_to_db: true })
}

export async function tsGetTorrent(serverUrl: string, hash: string): Promise<TorrentInfo> {
  return proxy<TorrentInfo>(serverUrl, 'get', { hash })
}

export async function tsRemoveTorrent(serverUrl: string, hash: string): Promise<void> {
  await proxy(serverUrl, 'rem', { hash })
}

// Wait until torrent metadata (file list) is available
export async function tsWaitForFiles(serverUrl: string, hash: string, timeoutMs = 60000): Promise<TorrentInfo> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const info = await tsGetTorrent(serverUrl, hash)
    if (info.file_stats && info.file_stats.length > 0) return info
    await new Promise((r) => setTimeout(r, 1500))
  }
  throw new Error('Не удалось получить список файлов торрента (таймаут)')
}

const VIDEO_EXT = /\.(mkv|mp4|avi|m4v|ts|webm|mov|mpg|mpeg|wmv)$/i

export function videoFiles(info: TorrentInfo): TorrentFile[] {
  return (info.file_stats ?? []).filter((f) => VIDEO_EXT.test(f.path))
}

// Direct stream URL — the player fetches video straight from TorrServer
export function streamUrl(serverUrl: string, hash: string, fileIndex: number, fileName: string): string {
  const base = serverUrl.replace(/\/+$/, '')
  const name = encodeURIComponent(fileName.split('/').pop() ?? 'video')
  return `${base}/stream/${name}?link=${hash}&index=${fileIndex}&play`
}

export function proxyStreamUrl(
  serverUrl: string,
  hash: string,
  fileIndex: number,
  fileName: string,
  audioTrack = 0,
  subtitleTrack: number | null = null,
  startTime = 0,
): string {
  const source = streamUrl(serverUrl, hash, fileIndex, fileName)
  const params = new URLSearchParams({
    url: source,
    audio: String(audioTrack),
  })
  if (subtitleTrack !== null && subtitleTrack >= 0) {
    params.set('subtitle', String(subtitleTrack))
  }
  if (startTime > 0) {
    params.set('start', String(Math.floor(startTime)))
  }
  return `/api/player/stream?${params.toString()}`
}

// Try to match a series episode to a file path (S01E02, 1x02, «02 серия» patterns)
export function matchEpisodeFile(files: TorrentFile[], season: number, episode: number): TorrentFile | null {
  const patterns = [
    new RegExp(`s0?${season}[\\s._-]*e0?${episode}(?!\\d)`, 'i'),
    new RegExp(`(?<!\\d)${season}x0?${episode}(?!\\d)`, 'i'),
    new RegExp(`(?<!\\d)0?${episode}(?!\\d)[\\s._-]*(серия|seriya|episode|ep)`, 'i'),
    new RegExp(`(серия|seriya|episode|ep)[\\s._-]*0?${episode}(?!\\d)`, 'i'),
  ]
  for (const p of patterns) {
    const found = files.find((f) => p.test(f.path))
    if (found) return found
  }
  // fallback: sort by path and pick by index if file count matches a single-season pack
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))
  if (episode >= 1 && episode <= sorted.length) return sorted[episode - 1]
  return null
}
