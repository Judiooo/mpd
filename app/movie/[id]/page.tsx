'use client'

import { use, useState } from 'react'
import useSWR from 'swr'
import { Play } from 'lucide-react'
import { BookmarkButton, CastRow, DetailHeader, RecommendationsRow } from '@/components/media-detail'
import { ReleasePicker, type PlayTarget } from '@/components/release-picker'
import { mediaYear, tmdbFetcher, type TmdbMovieDetails } from '@/lib/tmdb'

export default function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [picking, setPicking] = useState(false)
  const { data, error, isLoading } = useSWR<TmdbMovieDetails>(
    `movie/${id}?append_to_response=credits,videos,recommendations`,
    tmdbFetcher,
  )

  if (error) {
    return (
      <main className="mx-auto max-w-[1800px] px-4 py-16 text-center md:px-8">
        <p className="text-muted-foreground">Не удалось загрузить фильм: {error.message}</p>
      </main>
    )
  }
  if (isLoading || !data) {
    return (
      <main className="mx-auto max-w-[1800px] px-4 py-8 md:px-8">
        <div className="flex gap-10">
          <div className="aspect-[2/3] w-40 animate-pulse rounded-xl bg-card md:w-64" />
          <div className="flex-1 space-y-4 pt-4">
            <div className="h-10 w-2/3 animate-pulse rounded bg-card" />
            <div className="h-5 w-1/3 animate-pulse rounded bg-card" />
            <div className="h-24 w-full animate-pulse rounded bg-card" />
          </div>
        </div>
      </main>
    )
  }

  const title = data.title ?? 'Без названия'
  const year = mediaYear(data)
  const runtime = data.runtime ? `${Math.floor(data.runtime / 60)} ч ${data.runtime % 60} мин` : ''
  const countries = data.production_countries?.map((c) => c.name).join(', ') ?? ''

  const target: PlayTarget = {
    id: data.id,
    mediaType: 'movie',
    title,
    originalTitle: data.original_title ?? '',
    year,
    posterPath: data.poster_path,
  }

  return (
    <main className="pb-12">
      <DetailHeader
        backdropPath={data.backdrop_path}
        posterPath={data.poster_path}
        title={title}
        originalTitle={data.original_title ?? ''}
        year={year}
        voteAverage={data.vote_average}
        genres={data.genres.map((g) => g.name)}
        facts={[runtime, countries].filter(Boolean)}
        tagline={data.tagline}
        overview={data.overview}
      >
        <div className="mt-2 flex flex-wrap gap-3">
          <button
            onClick={() => setPicking(true)}
            className="tv-focus flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground md:px-6 md:py-3"
          >
            <Play className="size-5 fill-primary-foreground" aria-hidden="true" />
            Смотреть
          </button>
          <BookmarkButton
            media={{
              id: data.id,
              mediaType: 'movie',
              title,
              posterPath: data.poster_path,
              year,
              voteAverage: data.vote_average,
            }}
          />
        </div>
      </DetailHeader>
      <div className="mx-auto max-w-[1800px]">
        <CastRow credits={data.credits} />
        <RecommendationsRow items={data.recommendations?.results} mediaType="movie" />
      </div>
      {picking && <ReleasePicker target={target} onClose={() => setPicking(false)} />}
    </main>
  )
}
