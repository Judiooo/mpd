'use client'

// Shared pieces for movie/tv detail pages: backdrop header, bookmark button, cast row.

import { useEffect, useState } from 'react'
import { Bookmark, BookmarkCheck, Star } from 'lucide-react'
import { isBookmarked, toggleBookmark, type MediaRef } from '@/lib/storage'
import { backdropUrl, posterUrl, profileUrl, type TmdbCredits, type TmdbMedia } from '@/lib/tmdb'
import { MediaCard } from '@/components/media-card'

export function BookmarkButton({ media }: { media: MediaRef }) {
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    setSaved(isBookmarked(media.id, media.mediaType))
  }, [media.id, media.mediaType])

  return (
    <button
      onClick={() => setSaved(toggleBookmark(media))}
      aria-pressed={saved}
      className="tv-focus flex items-center gap-2 rounded-lg bg-secondary px-5 py-2.5 font-semibold text-secondary-foreground md:px-6 md:py-3"
    >
      {saved ? (
        <BookmarkCheck className="size-5 text-primary" aria-hidden="true" />
      ) : (
        <Bookmark className="size-5" aria-hidden="true" />
      )}
      {saved ? 'В закладках' : 'В закладки'}
    </button>
  )
}

export function DetailHeader({
  backdropPath,
  posterPath,
  title,
  originalTitle,
  year,
  voteAverage,
  genres,
  facts,
  tagline,
  overview,
  children,
}: {
  backdropPath: string | null
  posterPath: string | null
  title: string
  originalTitle: string
  year: string
  voteAverage: number
  genres: string[]
  facts: string[]
  tagline: string
  overview: string
  children?: React.ReactNode
}) {
  const backdrop = backdropUrl(backdropPath)
  const poster = posterUrl(posterPath, 'w500')

  return (
    <section className="relative">
      {backdrop && (
        <div className="absolute inset-0 h-[420px] overflow-hidden md:h-[520px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={backdrop || "/placeholder.svg"} alt="" className="h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        </div>
      )}
      <div className="relative mx-auto flex max-w-[1800px] flex-col gap-6 px-4 pt-8 md:flex-row md:gap-10 md:px-8 md:pt-16">
        <div className="w-40 shrink-0 md:w-64">
          <div className="aspect-[2/3] overflow-hidden rounded-xl bg-card shadow-2xl">
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster || "/placeholder.svg"} alt={`Постер: ${title}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">{title}</div>
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-balance md:text-5xl">{title}</h1>
            {originalTitle && originalTitle !== title && (
              <p className="mt-1 text-muted-foreground md:text-lg">{originalTitle}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm md:text-base">
            {voteAverage > 0 && (
              <span className="flex items-center gap-1 font-semibold text-primary">
                <Star className="size-4 fill-primary md:size-5" aria-hidden="true" />
                {voteAverage.toFixed(1)}
              </span>
            )}
            {year && <span>{year}</span>}
            {facts.map((f) => (
              <span key={f} className="text-muted-foreground">
                {f}
              </span>
            ))}
          </div>
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => (
                <span key={g} className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground md:text-sm">
                  {g}
                </span>
              ))}
            </div>
          )}
          {tagline && <p className="italic text-muted-foreground">{tagline}</p>}
          {overview && <p className="max-w-3xl leading-relaxed text-foreground/90 md:text-lg">{overview}</p>}
          {children}
        </div>
      </div>
    </section>
  )
}

export function CastRow({ credits }: { credits?: TmdbCredits }) {
  const cast = credits?.cast.slice(0, 15) ?? []
  if (cast.length === 0) return null
  return (
    <section className="mt-10">
      <h2 className="mb-3 px-4 text-lg font-semibold md:px-8 md:text-xl">В ролях</h2>
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-8">
        {cast.map((p) => {
          const photo = profileUrl(p.profile_path)
          return (
            <div key={p.id} className="w-24 shrink-0 text-center md:w-28">
              <div className="mx-auto aspect-square w-20 overflow-hidden rounded-full bg-card md:w-24">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo || "/placeholder.svg"} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Фото</div>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-medium md:text-sm">{p.name}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{p.character}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function RecommendationsRow({ items, mediaType }: { items?: TmdbMedia[]; mediaType: 'movie' | 'tv' }) {
  const list = items?.filter((m) => m.poster_path).slice(0, 15) ?? []
  if (list.length === 0) return null
  return (
    <section className="mt-10">
      <h2 className="mb-3 px-4 text-lg font-semibold md:px-8 md:text-xl">Похожее</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 md:gap-4 md:px-8">
        {list.map((m) => (
          <MediaCard key={m.id} media={m} mediaType={m.media_type === 'tv' || m.media_type === 'movie' ? m.media_type : mediaType} />
        ))}
      </div>
    </section>
  )
}
