'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { MediaCard } from '@/components/media-card'
import { filterCatalogMedia, tmdbFetcher, type TmdbListResponse } from '@/lib/tmdb'

export function MediaRow({
  title,
  path,
  mediaType,
}: {
  title: string
  path: string
  mediaType?: 'movie' | 'tv'
}) {
  const { data, error, isLoading } = useSWR<TmdbListResponse>(path, tmdbFetcher)

  if (error) {
    return (
      <section className="px-4 md:px-8">
        <h2 className="mb-3 text-lg font-semibold md:text-xl">{title}</h2>
        <p className="text-sm text-muted-foreground">Не удалось загрузить: {error.message}</p>
      </section>
    )
  }

  const params = new URLSearchParams({ path })
  if (mediaType) params.set('media', mediaType)
  const href = `/category?${params.toString()}`

  return (
    <section className="min-w-0">
      <h2 className="mb-3 px-4 text-lg font-semibold md:px-8 md:text-xl">
        <Link href={href} className="hover:underline">{title}</Link>
      </h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 md:gap-4 md:px-8">
        {isLoading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-36 shrink-0 md:w-44">
              <div className="aspect-[2/3] animate-pulse rounded-lg bg-card" />
            </div>
          ))}
        {filterCatalogMedia(data?.results ?? [], mediaType)
          .slice(0, 20)
          .map((m) => (
            <MediaCard key={m.id} media={m} mediaType={mediaType} />
          ))}
      </div>
    </section>
  )
}
