'use client'

import Link from 'next/link'

const CURATED_GENRES: { id: number; name: string }[] = [
  { id: 28, name: 'Боевики' },
  { id: 35, name: 'Комедии' },
  { id: 27, name: 'Ужасы' },
  { id: 16, name: 'Мультфильмы' },
  { id: 18, name: 'Драмы' },
  { id: 53, name: 'Триллеры' },
  { id: 10749, name: 'Романтика' },
  { id: 99, name: 'Документальные' },
  { id: 10751, name: 'Семейные' },
  { id: 878, name: 'Фантастика' },
]

export function GenresRow({ media = 'movie' }: { media?: 'movie' | 'tv' }) {
  return (
    <section className="min-w-0">
      <h2 className="mb-3 px-4 text-lg font-semibold md:px-8 md:text-xl">Жанры</h2>
      <div className="flex flex-wrap gap-2 px-4 md:px-8">
        {CURATED_GENRES.map((g) => (
          <Link
            key={g.id}
            href={`/category?path=discover/${media}&with_genres=${g.id}&title=${encodeURIComponent(g.name)}&media=${media}`}
            className="tv-focus rounded-full border px-3 py-1 text-sm"
          >
            {g.name}
          </Link>
        ))}
      </div>
    </section>
  )
}
