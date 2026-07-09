'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { Info, Play, Star } from 'lucide-react'
import {
  backdropUrl,
  mediaTitle,
  mediaYear,
  tmdbFetcher,
  type TmdbListResponse,
} from '@/lib/tmdb'

export function Hero() {
  const { data } = useSWR<TmdbListResponse>('trending/all/week', tmdbFetcher)
  const item = data?.results.find((m) => m.backdrop_path && m.media_type !== 'person')

  if (!item) {
    return <div className="mx-4 mt-4 aspect-[16/7] animate-pulse rounded-xl bg-card md:mx-8" />
  }

  const type = item.media_type === 'tv' ? 'tv' : 'movie'
  const title = mediaTitle(item)
  const year = mediaYear(item)

  return (
    <section className="relative mx-4 mt-4 overflow-hidden rounded-xl md:mx-8" aria-label="Рекомендуемое">
      <div className="relative aspect-[16/9] w-full sm:aspect-[16/7]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={backdropUrl(item.backdrop_path, 'w1280') ?? ''}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 md:p-10">
          <h1 className="max-w-2xl text-2xl font-bold text-balance md:text-4xl lg:text-5xl">{title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground md:text-base">
            {item.vote_average > 0 && (
              <span className="flex items-center gap-1 font-semibold text-primary">
                <Star className="size-4 fill-primary" aria-hidden="true" />
                {item.vote_average.toFixed(1)}
              </span>
            )}
            {year && <span>{year}</span>}
            <span>{type === 'tv' ? 'Сериал' : 'Фильм'}</span>
          </div>
          <p className="hidden max-w-xl text-sm leading-relaxed text-foreground/80 md:line-clamp-3 md:text-base">
            {item.overview}
          </p>
          <div className="mt-1 flex gap-3">
            <Link
              href={`/${type}/${item.id}`}
              className="tv-focus flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground md:px-6 md:py-3"
            >
              <Play className="size-5 fill-primary-foreground" aria-hidden="true" />
              Смотреть
            </Link>
            <Link
              href={`/${type}/${item.id}`}
              className="tv-focus flex items-center gap-2 rounded-lg bg-secondary px-5 py-2.5 font-semibold text-secondary-foreground md:px-6 md:py-3"
            >
              <Info className="size-5" aria-hidden="true" />
              Подробнее
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
