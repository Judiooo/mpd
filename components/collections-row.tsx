'use client'

import Link from 'next/link'

const COLLECTIONS = [
  { label: 'Лауреаты Оскара', path: 'discover/movie?with_keywords=oscar-winner' },
  { label: 'Marvel', path: 'discover/movie?with_companies=420' },
  { label: 'DC', path: 'discover/movie?with_companies=9993' },
  { label: 'Pixar', path: 'discover/movie?with_companies=3' },
  { label: 'Ghibli', path: 'discover/movie?with_companies=112' },
  { label: 'Christmas', path: 'discover/movie?with_keywords=christmas' },
  { label: 'Halloween', path: 'discover/movie?with_keywords=halloween' },
  { label: 'Семейные', path: 'discover/movie?with_genres=10751' },
  { label: 'Для детей', path: 'discover/movie?with_keywords=family-children' },
]

export function CollectionsRow() {
  return (
    <section className="min-w-0">
      <h2 className="mb-3 px-4 text-lg font-semibold md:px-8 md:text-xl">Подборки</h2>
      <div className="flex flex-wrap gap-2 px-4 md:px-8">
        {COLLECTIONS.map((collection) => (
          <Link
            key={collection.label}
            href={`/category?path=${encodeURIComponent(collection.path)}&title=${encodeURIComponent(collection.label)}&media=movie`}
            className="tv-focus rounded-full border px-3 py-1 text-sm"
          >
            {collection.label}
          </Link>
        ))}
      </div>
    </section>
  )
}
