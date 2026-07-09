import { Hero } from '@/components/hero'
import { MediaRow } from '@/components/media-row'
import { ContinueWatchingRow } from '@/components/continue-watching-row'
import { GenresRow } from '@/components/genres-row'
import { YearsRow } from '@/components/years-row'
import { DecadesRow } from '@/components/decades-row'
import { CollectionsRow } from '@/components/collections-row'

export default function HomePage() {
  return (
    <main className="mx-auto max-w-[1800px] pb-12">
      <Hero />
      <div className="mt-8 flex flex-col gap-12">
        <ContinueWatchingRow />

        <MediaRow title="Популярное" path="movie/popular" mediaType="movie" />
        <MediaRow title="Новинки" path="movie/upcoming" mediaType="movie" />
        <MediaRow title="Сейчас в кино" path="movie/now_playing" mediaType="movie" />
        <MediaRow title="Сериалы" path="tv/popular" mediaType="tv" />
        <MediaRow title="Фильмы" path="discover/movie?sort_by=popularity.desc" mediaType="movie" />

        <GenresRow media="movie" />
        <YearsRow />
        <DecadesRow />
        <CollectionsRow />
      </div>
    </main>
  )
}
