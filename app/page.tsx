import { Hero } from '@/components/hero'
import { MediaRow } from '@/components/media-row'
import { ContinueWatchingRow } from '@/components/continue-watching-row'
import { GenresRow } from '@/components/genres-row'

export default function HomePage() {
  return (
    <main className="mx-auto max-w-[1800px] pb-12">
      <Hero />
      <div className="mt-8 flex flex-col gap-8">
        <ContinueWatchingRow />
        <GenresRow media="movie" />
        <MediaRow title="Популярные фильмы" path="movie/popular" mediaType="movie" />
        <MediaRow title="Популярные сериалы" path="tv/popular" mediaType="tv" />
        <MediaRow title="Сейчас в кино" path="movie/now_playing" mediaType="movie" />
        <MediaRow title="Лучшие фильмы" path="movie/top_rated" mediaType="movie" />
        <MediaRow title="Лучшие сериалы" path="tv/top_rated" mediaType="tv" />
        <MediaRow title="В тренде за неделю" path="trending/all/week" />
      </div>
    </main>
  )
}
