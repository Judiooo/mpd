'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Bookmark, Star, Trash2 } from 'lucide-react'
import { clearBookmarks, getBookmarks, toggleBookmark, type BookmarkItem } from '@/lib/storage'
import { posterUrl } from '@/lib/tmdb'

export default function BookmarksPage() {
  const [items, setItems] = useState<BookmarkItem[] | null>(null)

  useEffect(() => {
    setItems(getBookmarks())
  }, [])

  function remove(item: BookmarkItem) {
    toggleBookmark(item)
    setItems(getBookmarks())
  }

  return (
    <main className="mx-auto max-w-[1800px] px-4 py-6 pb-16 md:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-3 text-2xl font-bold md:text-3xl">
          <Bookmark className="size-7 text-primary" aria-hidden="true" />
          Закладки
        </h1>
        {items && items.length > 0 && (
          <button
            onClick={() => {
              clearBookmarks()
              setItems([])
            }}
            className="tv-focus rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground"
          >
            Очистить всё
          </button>
        )}
      </div>

      {items === null && (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-card" />
          ))}
        </div>
      )}

      {items && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
          <Bookmark className="size-10" aria-hidden="true" />
          <p>Здесь пока пусто. Добавляйте фильмы и сериалы в закладки со страницы карточки.</p>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {items.map((item) => {
            const poster = posterUrl(item.posterPath)
            return (
              <div key={`${item.mediaType}-${item.id}`} className="group relative">
                <Link href={`/${item.mediaType}/${item.id}`} className="tv-focus block rounded-lg">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-card">
                    {poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={poster || '/placeholder.svg'} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center p-2 text-center text-sm text-muted-foreground">
                        {item.title}
                      </div>
                    )}
                    {item.voteAverage != null && item.voteAverage > 0 && (
                      <span className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-md bg-background/85 px-1.5 py-0.5 text-xs font-semibold text-primary">
                        <Star className="size-3 fill-primary" aria-hidden="true" />
                        {item.voteAverage.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 px-0.5">
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-pretty">{item.title}</p>
                    {item.year && <p className="text-xs text-muted-foreground">{item.year}</p>}
                  </div>
                </Link>
                <button
                  onClick={() => remove(item)}
                  aria-label={`Удалить «${item.title}» из закладок`}
                  className="tv-focus absolute top-1.5 left-1.5 rounded-md bg-background/85 p-1.5 text-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
