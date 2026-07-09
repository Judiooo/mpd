'use client'

import useSWR from 'swr'
import { MediaCard } from '@/components/media-card'
import { tmdbFetcher, type TmdbListResponse } from '@/lib/tmdb'

export function Top100Row() {
  const { data } = useSWR<TmdbListResponse>('movie/top_rated', tmdbFetcher)
  const items = data?.results ?? []
  if (items.length === 0) return null

  return (
    <section className="min-w-0">
      <h2 className="mb-3 px-4 text-lg font-semibold md:px-8 md:text-xl">Топ 100</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 md:gap-4 md:px-8">
        {items.slice(0, 20).map((m) => (
          <MediaCard key={m.id} media={m} mediaType="movie" />
        ))}
      </div>
    </section>
  )
}
