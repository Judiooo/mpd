"use client"

import { Suspense, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWRInfinite from 'swr/infinite'
import { MediaCard } from '@/components/media-card'
import { filterCatalogMedia, tmdbFetcher, type TmdbListResponse } from '@/lib/tmdb'

export default function CategoryPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[1200px] p-6"><div className="text-sm text-muted-foreground">Загрузка...</div></main>}>
      <CategoryPageClient />
    </Suspense>
  )
}

function CategoryPageClient() {
  const params = useSearchParams()
  const path = params.get('path') ?? 'movie/popular'
  const title = params.get('title') ?? ''
  const media = (params.get('media') ?? undefined) as 'movie' | 'tv' | undefined

  const getKey = (pageIndex: number, previousPageData: TmdbListResponse | null) => {
    if (previousPageData && previousPageData.results.length === 0) return null
    const separator = path.includes('?') ? '&' : '?'
    return `${path}${separator}page=${pageIndex + 1}`
  }

  const { data, error, size, setSize, isValidating } = useSWRInfinite<TmdbListResponse>(getKey, tmdbFetcher)

  const pages = data ?? []
  const totalPages = pages[0]?.total_pages ?? 0
  const reachedEnd = totalPages > 0 && size >= totalPages

  // flatten and dedupe by id while preserving order
  const all = pages.flatMap((p) => p.results)
  const seen = new Set<number>()
  const results = [] as typeof all
  for (const m of filterCatalogMedia(all, media)) {
    if (seen.has(m.id)) continue
    seen.add(m.id)
    results.push(m)
  }

  const sentinel = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = sentinel.current
    if (!el || reachedEnd) return
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!reachedEnd && e.isIntersecting) {
          setSize((s) => s + 1)
        }
      }
    }, { rootMargin: '300px' })
    obs.observe(el)
    return () => obs.disconnect()
    // only recreate when sentinel element changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinel.current, setSize, reachedEnd])

  return (
    <main className="mx-auto max-w-[1200px] p-6">
      <h1 className="mb-4 text-2xl font-semibold">{title || 'Категория'}</h1>
      {error && <p className="text-sm text-muted-foreground">Ошибка: {error.message}</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {results.length === 0 && Array.from({ length: 20 }).map((_, i) => <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-card" />)}
        {results.map((m) => (
          <MediaCard key={m.id} media={m} mediaType={media} />
        ))}
      </div>

      <div ref={sentinel} className="mt-6 h-8 flex items-center justify-center">
        {isValidating ? <div className="text-sm text-muted-foreground">Загрузка...</div> : null}
      </div>
    </main>
  )
}
