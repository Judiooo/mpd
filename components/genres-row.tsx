'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { tmdbFetcher, type TmdbGenre } from '@/lib/tmdb'

export function GenresRow({ media = 'movie' }: { media?: 'movie' | 'tv' }) {
  const { data } = useSWR<{ genres: TmdbGenre[] }>(`${media}/genre/list`, tmdbFetcher)
  const genres = data?.genres ?? []

  if (genres.length === 0) return null

  return (
    <section className="min-w-0">
      <h2 className="mb-3 px-4 text-lg font-semibold md:px-8 md:text-xl">Жанры</h2>
      <div className="flex flex-wrap gap-2 px-4 md:px-8">
        {genres.map((g) => (
          <Link key={g.id} href={`/category?path=discover/${media}&with_genres=${g.id}&title=${encodeURIComponent(g.name)}&media=${media}`} className="tv-focus rounded-full border px-3 py-1 text-sm">
            {g.name}
          </Link>
        ))}
      </div>
    </section>
  )
}
