'use client'

import Link from 'next/link'
import { Star } from 'lucide-react'
import { mediaTitle, mediaYear, posterUrl, type TmdbMedia } from '@/lib/tmdb'
import { useSettings } from '@/lib/settings-context'
import { cn } from '@/lib/utils'

const SIZE_CLASSES = {
  small: 'w-28 md:w-36',
  medium: 'w-36 md:w-44',
  large: 'w-44 md:w-52',
}

export function MediaCard({
  media,
  mediaType,
  className,
}: {
  media: TmdbMedia
  mediaType?: 'movie' | 'tv'
  className?: string
}) {
  const { settings } = useSettings()
  const type = mediaType ?? media.media_type ?? 'movie'
  if (type === 'person') return null
  const title = mediaTitle(media)
  const year = mediaYear(media)
  const poster = posterUrl(media.poster_path)

  return (
    <Link
      href={`/${type}/${media.id}`}
      className={cn('tv-focus group block shrink-0 rounded-lg', SIZE_CLASSES[settings.cardSize], className)}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-card">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster || "/placeholder.svg"}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-2 text-center text-sm text-muted-foreground">
            {title}
          </div>
        )}
        {settings.showRatings && media.vote_average > 0 && (
          <span className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-md bg-background/85 px-1.5 py-0.5 text-xs font-semibold text-primary">
            <Star className="size-3 fill-primary" aria-hidden="true" />
            {media.vote_average.toFixed(1)}
          </span>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-pretty">{title}</p>
        {year && <p className="text-xs text-muted-foreground">{year}</p>}
      </div>
    </Link>
  )
}
