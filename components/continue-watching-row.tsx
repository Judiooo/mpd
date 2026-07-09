'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { getHistory, getProgress, progressKey, type HistoryItem, type WatchProgress } from '@/lib/storage'
import { posterUrl } from '@/lib/tmdb'

interface ContinueItem extends HistoryItem {
  progress: WatchProgress
}

export function ContinueWatchingRow() {
  const [items, setItems] = useState<ContinueItem[]>([])

  useEffect(() => {
    const result: ContinueItem[] = []
    for (const h of getHistory()) {
      const key = progressKey(h.id, h.mediaType, h.season, h.episode)
      const p = getProgress(key)
      if (p && p.duration > 0 && p.position >= 10 && p.position / p.duration < 0.95) {
        result.push({ ...h, progress: p })
      }
      if (result.length >= 12) break
    }
    setItems(result)
  }, [])

  if (items.length === 0) return null

  return (
    <section className="min-w-0">
      <h2 className="mb-3 px-4 text-lg font-semibold md:px-8 md:text-xl">Продолжить просмотр</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 md:gap-4 md:px-8">
        {items.map((item) => {
          const pct = Math.round((item.progress.position / item.progress.duration) * 100)
          const poster = posterUrl(item.posterPath)
          return (
            <Link
              key={progressKey(item.id, item.mediaType, item.season, item.episode)}
              href={
                item.mediaType === 'tv' && item.season != null && item.episode != null
                  ? `/tv/${item.id}?season=${item.season}&episode=${item.episode}`
                  : `/${item.mediaType}/${item.id}`
              }
              className="tv-focus group block w-48 shrink-0 rounded-lg md:w-60"
            >
              <div className="relative aspect-video overflow-hidden rounded-lg bg-card">
                {poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={poster || "/placeholder.svg"} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{item.title}</div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-background/30 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Play className="size-10 fill-foreground text-foreground" aria-hidden="true" />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <p className="mt-2 line-clamp-1 text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.season != null && item.episode != null ? `С${item.season} Э${item.episode} · ` : ''}
                {pct}% просмотрено
              </p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
