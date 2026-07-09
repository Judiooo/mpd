'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { SearchIcon } from 'lucide-react'
import { MediaCard } from '@/components/media-card'
import { useSettings } from '@/lib/settings-context'
import { mediaTitle, mediaYear, tmdbFetcher, type TmdbListResponse } from '@/lib/tmdb'

export default function SearchPage() {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const { settings } = useSettings()

  const { data, error, isLoading } = useSWR<TmdbListResponse>(
    query ? `search/multi?query=${encodeURIComponent(query)}` : null,
    tmdbFetcher,
  )

  const results = useMemo(() => {
    const list = data?.results.filter((m) => m.media_type !== 'person' && m.poster_path) ?? []
    const sorted = [...list]
    switch (settings.sortOrder) {
      case 'rating':
        sorted.sort((a, b) => b.vote_average - a.vote_average)
        break
      case 'year':
        sorted.sort((a, b) => Number(mediaYear(b)) - Number(mediaYear(a)))
        break
      case 'title':
        sorted.sort((a, b) => mediaTitle(a).localeCompare(mediaTitle(b), 'ru'))
        break
      default:
        break // relevance = TMDB's original order
    }
    return sorted
  }, [data, settings.sortOrder])

  return (
    <main className="mx-auto max-w-[1800px] px-4 py-6 md:px-8">
      <h1 className="mb-4 text-2xl font-bold md:text-3xl">Поиск</h1>
      <form
        className="mb-8 flex max-w-2xl gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          setQuery(input.trim())
        }}
      >
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
          }}
          placeholder="Название фильма или сериала..."
          aria-label="Поисковый запрос"
          className="tv-focus h-12 flex-1 rounded-lg border border-input bg-card px-4 text-base outline-none md:h-14 md:text-lg"
        />
        <button
          type="submit"
          className="tv-focus flex h-12 items-center gap-2 rounded-lg bg-primary px-5 font-semibold text-primary-foreground md:h-14 md:px-6"
        >
          <SearchIcon className="size-5" aria-hidden="true" />
          <span className="hidden sm:inline">Найти</span>
        </button>
      </form>

      {error && <p className="text-muted-foreground">Ошибка поиска: {error.message}</p>}
      {isLoading && (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-card" />
          ))}
        </div>
      )}
      {query && !isLoading && !error && results.length === 0 && (
        <p className="text-muted-foreground">По запросу «{query}» ничего не найдено.</p>
      )}
      {results.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {results.map((m) => (
            <MediaCard key={`${m.media_type}-${m.id}`} media={m} />
          ))}
        </div>
      )}
      {!query && !isLoading && (
        <p className="text-muted-foreground">Введите название и нажмите «Найти».</p>
      )}
    </main>
  )
}
