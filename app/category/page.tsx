"use client"

import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { MediaCard } from '@/components/media-card'
import { tmdbFetcher, type TmdbListResponse } from '@/lib/tmdb'

export default function CategoryPageClient() {
  const params = useSearchParams()
  const path = params.get('path') ?? 'movie/popular'
  const title = params.get('title') ?? ''
  const media = (params.get('media') ?? undefined) as 'movie' | 'tv' | undefined
  const page = Number(params.get('page') ?? '1')

  const { data, error, isLoading } = useSWR<TmdbListResponse>(`${path}?page=${page}`, tmdbFetcher)

  return (
    <main className="mx-auto max-w-[1200px] p-6">
      <h1 className="mb-4 text-2xl font-semibold">{title || 'Категория'}</h1>
      {error && <p className="text-sm text-muted-foreground">Ошибка: {error.message}</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {isLoading && Array.from({ length: 20 }).map((_, i) => <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-card" />)}
        {data?.results.filter((m) => m.poster_path).map((m) => (
          <MediaCard key={m.id} media={m} mediaType={media} />
        ))}
      </div>
      <div className="mt-6 flex justify-center gap-3">
        {page > 1 && (
          <a href={`?path=${encodeURIComponent(path)}&page=${page - 1}`} className="tv-focus rounded bg-secondary px-4 py-2 font-semibold">
            Назад
          </a>
        )}
        <a href={`?path=${encodeURIComponent(path)}&page=${page + 1}`} className="tv-focus rounded bg-primary px-4 py-2 font-semibold text-primary-foreground">
          Далее
        </a>
      </div>
    </main>
  )
}
