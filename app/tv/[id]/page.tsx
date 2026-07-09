'use client'

import { use, useState } from 'react'
import useSWR from 'swr'
import { Play } from 'lucide-react'
import { BookmarkButton, CastRow, DetailHeader, RecommendationsRow } from '@/components/media-detail'
import { ReleasePicker, type PlayTarget } from '@/components/release-picker'
import { mediaYear, stillUrl, tmdbFetcher, type TmdbEpisode, type TmdbTvDetails } from '@/lib/tmdb'
import { cn } from '@/lib/utils'

function EpisodeList({
  tvId,
  season,
  onPlay,
}: {
  tvId: string
  season: number
  onPlay: (season: number, episode: number, name: string) => void
}) {
  const { data, error, isLoading } = useSWR<{ episodes: TmdbEpisode[] }>(`tv/${tvId}/season/${season}`, tmdbFetcher)

  if (error) return <p className="px-4 text-sm text-muted-foreground md:px-8">Не удалось загрузить серии.</p>
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 px-4 md:px-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-card" />
        ))}
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2 px-4 md:px-8">
      {data?.episodes.map((ep) => {
        const still = stillUrl(ep.still_path)
        return (
          <li key={ep.id}>
            <button
              onClick={() => onPlay(season, ep.episode_number, ep.name)}
              className="tv-focus flex w-full items-center gap-4 rounded-lg border border-border bg-card p-3 text-left hover:border-primary/50"
            >
              <div className="relative hidden aspect-video w-32 shrink-0 overflow-hidden rounded-md bg-background sm:block">
                {still ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={still || "/placeholder.svg"} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Play className="size-6 text-muted-foreground" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {ep.episode_number}. {ep.name}
                </p>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{ep.overview || 'Без описания'}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[ep.air_date, ep.runtime ? `${ep.runtime} мин` : null].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Play className="size-5 shrink-0 text-primary" aria-hidden="true" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default function TvPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [picking, setPicking] = useState<PlayTarget | null>(null)
  const [activeSeason, setActiveSeason] = useState<number | null>(null)
  const { data, error, isLoading } = useSWR<TmdbTvDetails>(
    `tv/${id}?append_to_response=credits,videos,recommendations`,
    tmdbFetcher,
  )

  if (error) {
    return (
      <main className="mx-auto max-w-[1800px] px-4 py-16 text-center md:px-8">
        <p className="text-muted-foreground">Не удалось загрузить сериал: {error.message}</p>
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

  const title = data.name ?? 'Без названия'
  const year = mediaYear(data)
  const seasons = data.seasons.filter((s) => s.season_number > 0 && s.episode_count > 0)
  const currentSeason = activeSeason ?? seasons[0]?.season_number ?? 1

  function playEpisode(season: number, episode: number) {
    setPicking({
      id: data!.id,
      mediaType: 'tv',
      title,
      originalTitle: data!.original_name ?? '',
      year,
      posterPath: data!.poster_path,
      season,
      episode,
    })
  }

  return (
    <main className="pb-12">
      <DetailHeader
        backdropPath={data.backdrop_path}
        posterPath={data.poster_path}
        title={title}
        originalTitle={data.original_name ?? ''}
        year={year}
        voteAverage={data.vote_average}
        genres={data.genres.map((g) => g.name)}
        facts={[
          `Сезонов: ${data.number_of_seasons}`,
          `Серий: ${data.number_of_episodes}`,
          data.status === 'Ended' ? 'Завершён' : 'Выходит',
        ]}
        tagline={data.tagline}
        overview={data.overview}
      >
        <div className="mt-2 flex flex-wrap gap-3">
          <BookmarkButton
            media={{
              id: data.id,
              mediaType: 'tv',
              title,
              posterPath: data.poster_path,
              year,
              voteAverage: data.vote_average,
            }}
          />
        </div>
      </DetailHeader>

      <section className="mx-auto mt-10 max-w-[1800px]" aria-label="Сезоны и серии">
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto px-4 md:px-8">
          {seasons.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSeason(s.season_number)}
              aria-pressed={s.season_number === currentSeason}
              className={cn(
                'tv-focus shrink-0 rounded-lg px-4 py-2 text-sm font-medium md:text-base',
                s.season_number === currentSeason
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground',
              )}
            >
              Сезон {s.season_number}
            </button>
          ))}
        </div>
        <EpisodeList tvId={id} season={currentSeason} onPlay={playEpisode} />
      </section>

      <div className="mx-auto max-w-[1800px]">
        <CastRow credits={data.credits} />
        <RecommendationsRow items={data.recommendations?.results} mediaType="tv" />
      </div>

      {picking && <ReleasePicker target={picking} onClose={() => setPicking(null)} />}
    </main>
  )
}
