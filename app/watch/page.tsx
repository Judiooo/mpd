'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { VideoPlayer } from '@/components/player/video-player'
import { addToHistory, getProgress, progressKey, removeProgress } from '@/lib/storage'

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

function WatchContent() {
  const router = useRouter()
  const params = useSearchParams()

  const src = params.get('src')
  const hash = params.get('hash') ?? ''
  const fileIndex = Number(params.get('index') ?? 0)
  const fileName = params.get('file') ?? ''
  const mediaType = (params.get('type') ?? 'movie') as 'movie' | 'tv'
  const id = Number(params.get('id') ?? 0)
  const title = params.get('title') ?? 'Просмотр'
  const poster = params.get('poster')
  const year = params.get('year') ?? undefined
  const season = params.get('season') ? Number(params.get('season')) : undefined
  const episode = params.get('episode') ? Number(params.get('episode')) : undefined

  const storageKey = progressKey(id, mediaType, season, episode)
  const [resume, setResume] = useState<'ask' | number>(0)

  useEffect(() => {
    if (!id) return
    addToHistory({ id, mediaType, title, posterPath: poster, year, season, episode })
    const saved = getProgress(storageKey)
    if (saved && saved.position >= 10 && saved.duration > 0 && saved.position / saved.duration < 0.95) {
      setResume('ask')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  if (!src || !id) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">Некорректная ссылка на поток.</p>
        <button onClick={() => router.push('/')} className="tv-focus rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground">
          На главную
        </button>
      </div>
    )
  }

  if (resume === 'ask') {
    const saved = getProgress(storageKey)
    const pos = saved?.position ?? 0
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4" role="dialog" aria-modal="true" aria-label="Продолжить просмотр">
        <div className="flex w-full max-w-md flex-col gap-5 rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="text-xl font-semibold text-balance">{title}</h1>
          <p className="text-muted-foreground">
            Вы остановились на <span className="font-semibold text-foreground">{fmtTime(pos)}</span>. Продолжить просмотр?
          </p>
          <div className="flex flex-col gap-3">
            <button
              autoFocus
              onClick={() => setResume(pos)}
              className="tv-focus rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground"
            >
              Продолжить с {fmtTime(pos)}
            </button>
            <button
              onClick={() => {
                removeProgress(storageKey)
                setResume(0)
              }}
              className="tv-focus rounded-lg bg-secondary px-6 py-3 font-semibold text-secondary-foreground"
            >
              Начать сначала
            </button>
          </div>
        </div>
      </div>
    )
  }

  const subtitle = season != null && episode != null ? `Сезон ${season}, серия ${episode}` : undefined

  return (
    <VideoPlayer
      src={src}
      title={title}
      subtitle={subtitle}
      hash={hash}
      progressStorageKey={storageKey}
      startPosition={resume}
      resumeContext={{ torrentHash: hash, fileIndex, fileName, season, episode }}
      onEnded={() => {
        removeProgress(storageKey)
        router.back()
      }}
    />
  )
}

export default function WatchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="size-10 animate-spin text-primary" aria-hidden="true" />
        </div>
      }
    >
      <WatchContent />
    </Suspense>
  )
}
