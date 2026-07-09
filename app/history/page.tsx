'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Clock, Trash2 } from 'lucide-react'
import { clearHistory, getHistory, removeFromHistory, type HistoryItem } from '@/lib/storage'
import { posterUrl } from '@/lib/tmdb'

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[] | null>(null)

  useEffect(() => {
    setItems(getHistory())
  }, [])

  function remove(item: HistoryItem) {
    removeFromHistory(item.id, item.mediaType, item.season, item.episode)
    setItems(getHistory())
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-16 md:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-3 text-2xl font-bold md:text-3xl">
          <Clock className="size-7 text-primary" aria-hidden="true" />
          История просмотра
        </h1>
        {items && items.length > 0 && (
          <button
            onClick={() => {
              clearHistory()
              setItems([])
            }}
            className="tv-focus rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground"
          >
            Очистить всё
          </button>
        )}
      </div>

      {items === null && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-card" />
          ))}
        </div>
      )}

      {items && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
          <Clock className="size-10" aria-hidden="true" />
          <p>История пуста. Здесь появятся фильмы и серии, которые вы начнёте смотреть.</p>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const poster = posterUrl(item.posterPath)
            const key = `${item.mediaType}-${item.id}-${item.season ?? ''}-${item.episode ?? ''}`
            return (
              <li key={key} className="group relative">
                <Link
                  href={`/${item.mediaType}/${item.id}`}
                  className="tv-focus flex items-center gap-4 rounded-lg border border-border bg-card p-3 hover:border-primary/50"
                >
                  <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-md bg-background md:w-20">
                    {poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={poster || '/placeholder.svg'} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center p-1 text-center text-xs text-muted-foreground">
                        {item.title}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium">{item.title}</p>
                    {item.season != null && item.episode != null && (
                      <p className="text-sm text-muted-foreground">
                        Сезон {item.season}, серия {item.episode}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">{fmtDate(item.watchedAt)}</p>
                  </div>
                </Link>
                <button
                  onClick={() => remove(item)}
                  aria-label={`Удалить «${item.title}» из истории`}
                  className="tv-focus absolute top-3 right-3 rounded-md bg-background/85 p-2 text-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
