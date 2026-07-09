'use client'

import Link from 'next/link'

const DECADES = [
  { label: '2020-е', from: 2020, to: 2029 },
  { label: '2010-е', from: 2010, to: 2019 },
  { label: '2000-е', from: 2000, to: 2009 },
  { label: '90-е', from: 1990, to: 1999 },
  { label: '80-е', from: 1980, to: 1989 },
]

export function DecadesRow() {
  return (
    <section className="min-w-0">
      <h2 className="mb-3 px-4 text-lg font-semibold md:px-8 md:text-xl">По десятилетиям</h2>
      <div className="flex flex-wrap gap-2 px-4 md:px-8">
        {DECADES.map((decade) => (
          <Link
            key={decade.label}
            href={`/category?path=${encodeURIComponent(
              `discover/movie?primary_release_date.gte=${decade.from}-01-01&primary_release_date.lte=${decade.to}-12-31`,
            )}&title=${encodeURIComponent(decade.label)}&media=movie`}
            className="tv-focus rounded-full border px-3 py-1 text-sm"
          >
            {decade.label}
          </Link>
        ))}
      </div>
    </section>
  )
}
