'use client'

import Link from 'next/link'

export function YearsRow({ media = 'movie' }: { media?: 'movie' | 'tv' }) {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = currentYear; y >= 1980; y--) years.push(y)

  return (
    <section className="min-w-0">
      <h2 className="mb-3 px-4 text-lg font-semibold md:px-8 md:text-xl">Годы</h2>
      <div className="flex flex-wrap gap-2 px-4 md:px-8">
        {years.map((y) => (
          <Link key={y} href={`/category?path=discover/${media}&primary_release_year=${y}&title=${encodeURIComponent(String(y))}&media=${media}`} className="tv-focus rounded-full border px-3 py-1 text-sm">
            {y}
          </Link>
        ))}
      </div>
    </section>
  )
}
