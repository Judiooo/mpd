'use client'

import Link from 'next/link'

const CURATED_GENRES: { id: number; name: string }[] = [
  { id: 28, name: 'Боевик' },
  { id: 35, name: 'Комедия' },
  { id: 18, name: 'Драма' },
  { id: 53, name: 'Триллер' },
  { id: 27, name: 'Ужасы' },
  { id: 878, name: 'Фантастика' },
  { id: 14, name: 'Фэнтези' },
  { id: 16, name: 'Мультфильмы' },
  { id: 9648, name: 'Детектив' },
  { id: 36, name: 'Исторические' },
  { id: 10752, name: 'Военные' },
]

export function GenresRow({ media = 'movie' }: { media?: 'movie' | 'tv' }) {
  return (
    <section className="min-w-0">
      <h2 className="mb-3 px-4 text-lg font-semibold md:px-8 md:text-xl">Жанры</h2>
      <div className="flex flex-wrap gap-2 px-4 md:px-8">
        {CURATED_GENRES.map((g) => (
          <Link
            key={g.id}
            href={`/category?path=${encodeURIComponent(`discover/${media}?with_genres=${g.id}`)}&title=${encodeURIComponent(g.name)}&media=${media}`}
            className="tv-focus rounded-full border px-3 py-1 text-sm"
          >
            {g.name}
          </Link>
        ))}
      </div>
    </section>
  )
}
