'use client'

// Dialog flow: Jackett search -> pick release -> add to TorrServer ->
// wait for metadata -> pick video file (auto-match for episodes) -> navigate to player.

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, FileVideo, Loader2, Users, X } from 'lucide-react'
import { detectQuality, detectVoice, formatSize, searchReleases, type JackettRelease } from '@/lib/jackett'
import { matchEpisodeFile, streamUrl, tsAddTorrent, tsWaitForFiles, videoFiles, type TorrentFile } from '@/lib/torrserver'
import { useSettings } from '@/lib/settings-context'
import { cn } from '@/lib/utils'

export interface PlayTarget {
  id: number
  mediaType: 'movie' | 'tv'
  title: string
  originalTitle: string
  year: string
  posterPath: string | null
  season?: number
  episode?: number
}

type Step =
  | { name: 'searching' }
  | { name: 'releases'; releases: JackettRelease[] }
  | { name: 'adding'; release: JackettRelease }
  | { name: 'files'; hash: string; files: TorrentFile[] }
  | { name: 'error'; message: string }

const QUALITY_COLORS: Record<string, string> = {
  '2160p': 'bg-primary text-primary-foreground',
  '1080p': 'bg-accent text-accent-foreground',
  '720p': 'bg-secondary text-secondary-foreground',
  '480p': 'bg-muted text-muted-foreground',
  unknown: 'bg-muted text-muted-foreground',
}

export function ReleasePicker({ target, onClose }: { target: PlayTarget; onClose: () => void }) {
  const router = useRouter()
  const { settings } = useSettings()
  const [step, setStep] = useState<Step>({ name: 'searching' })
  const [releases, setReleases] = useState<JackettRelease[] | null>(null)
  const [qualityFilter, setQualityFilter] = useState<string>('any')
  const [subsOnly, setSubsOnly] = useState<boolean>(false)
  const [voiceFilter, setVoiceFilter] = useState<string>('any')
  const dialogRef = useRef<HTMLDivElement>(null)

  const goToPlayer = useCallback(
    (hash: string, file: TorrentFile) => {
      const url = streamUrl(settings.torrserverUrl, hash, file.id, file.path)
      const params = new URLSearchParams({
        src: url,
        hash,
        index: String(file.id),
        file: file.path,
        type: target.mediaType,
        id: String(target.id),
        title: target.title,
      })
      if (target.posterPath) params.set('poster', target.posterPath)
      if (target.year) params.set('year', target.year)
      if (target.season != null) params.set('season', String(target.season))
      if (target.episode != null) params.set('episode', String(target.episode))
      router.push(`/watch?${params}`)
    },
    [router, settings.torrserverUrl, target],
  )

  const selectRelease = useCallback(
    async (release: JackettRelease) => {
      setStep({ name: 'adding', release })
      try {
        const link = release.magnet ?? release.link
        if (!link) throw new Error('У релиза нет magnet-ссылки')
        const added = await tsAddTorrent(settings.torrserverUrl, link, release.title)
        const hash = added.hash
        if (!hash) throw new Error('TorrServer не вернул hash торрента')
        const info = await tsWaitForFiles(settings.torrserverUrl, hash)
        const files = videoFiles(info)
        if (files.length === 0) throw new Error('В торренте не найдено видеофайлов')

        if (target.season != null && target.episode != null) {
          const matched = matchEpisodeFile(files, target.season, target.episode)
          if (matched) {
            goToPlayer(hash, matched)
            return
          }
        }
        if (files.length === 1) {
          goToPlayer(hash, files[0])
          return
        }
        setStep({ name: 'files', hash, files })
      } catch (err) {
        setStep({ name: 'error', message: err instanceof Error ? err.message : 'Ошибка TorrServer' })
      }
    },
    [settings.torrserverUrl, target, goToPlayer],
  )

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!settings.jackettUrl || !settings.jackettApiKey) {
        setStep({ name: 'error', message: 'Jackett не настроен. Укажите URL и API-ключ на странице настроек.' })
        return
      }
      if (!settings.torrserverUrl) {
        setStep({ name: 'error', message: 'TorrServer не настроен. Укажите URL на странице настроек.' })
        return
      }
      try {
        const queries = [
          `${target.title} ${target.year}`.trim(),
          target.originalTitle && target.originalTitle !== target.title
            ? `${target.originalTitle} ${target.year}`.trim()
            : null,
        ].filter(Boolean) as string[]

        let found: JackettRelease[] = []
        for (const q of queries) {
          found = await searchReleases(settings.jackettUrl, settings.jackettApiKey, q)
          if (found.length > 0) break
        }
        if (cancelled) return
        if (found.length === 0) {
          setStep({ name: 'error', message: 'Релизы не найдены. Попробуйте другой запрос или проверьте трекеры в Jackett.' })
        } else {
          // apply preferred quality hint but keep full list for filtering
          if (settings.preferredQuality !== 'any') {
            const hint = found.filter((r) => detectQuality(r.title) === settings.preferredQuality)
            if (hint.length > 0) found = hint
          }
          setReleases(found)
          setStep({ name: 'releases', releases: found })
        }
      } catch (err) {
        if (!cancelled) setStep({ name: 'error', message: err instanceof Error ? err.message : 'Ошибка поиска' })
      }
    }
    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close on Escape / Tizen Back, focus first element
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.keyCode === 10009) {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    const firstBtn = dialogRef.current?.querySelector<HTMLElement>('button')
    firstBtn?.focus()
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" role="dialog" aria-modal="true" aria-label="Выбор релиза">
      <div ref={dialogRef} className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">
            {step.name === 'files' ? 'Выберите файл' : `Релизы: ${target.title}`}
            {target.season != null && target.episode != null && ` — С${target.season} Э${target.episode}`}
          </h2>
          <button onClick={onClose} aria-label="Закрыть" className="tv-focus rounded-lg p-2 text-muted-foreground hover:text-foreground">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {step.name === 'searching' && (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
              <p>Поиск релизов через Jackett...</p>
            </div>
          )}

          {step.name === 'adding' && (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
              <p className="text-center text-pretty">Добавление в TorrServer и получение списка файлов...</p>
              <p className="line-clamp-2 max-w-md text-center text-xs">{step.release.title}</p>
            </div>
          )}

          {step.name === 'error' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <p className="max-w-md text-center text-pretty text-muted-foreground">{step.message}</p>
              <button onClick={onClose} className="tv-focus rounded-lg bg-secondary px-5 py-2.5 font-medium text-secondary-foreground">
                Закрыть
              </button>
            </div>
          )}

          {step.name === 'releases' && releases && (
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label className="text-sm text-muted-foreground">Качество:</label>
                <select value={qualityFilter} onChange={(e) => setQualityFilter(e.target.value)} className="tv-focus rounded border px-2 py-1">
                  <option value="any">Любое</option>
                  <option value="2160p">2160p</option>
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                  <option value="480p">480p</option>
                </select>

                <label className="ml-4 text-sm text-muted-foreground">Озвучка:</label>
                <select value={voiceFilter} onChange={(e) => setVoiceFilter(e.target.value)} className="tv-focus rounded border px-2 py-1">
                  <option value="any">Любая</option>
                  <option value="Дубляж">Дубляж</option>
                  <option value="LostFilm">LostFilm</option>
                  <option value="HDRezka">HDRezka</option>
                  <option value="Многоголосый">Многоголосый</option>
                  <option value="Двухголосый">Двухголосый</option>
                </select>

                <label className="ml-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={subsOnly} onChange={(e) => setSubsOnly(e.target.checked)} />
                  Только с субтитрами
                </label>
              </div>

              <ul className="flex flex-col gap-2">
                {releases
                  .filter((r) => {
                    if (qualityFilter !== 'any' && detectQuality(r.title) !== qualityFilter) return false
                    const v = detectVoice(r.title)
                    if (voiceFilter !== 'any' && v !== voiceFilter) return false
                    if (subsOnly && !/sub|subtitle|субтитр|subtitl/i.test(r.title)) return false
                    // exact-ish title matching
                    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9а-яё]+/g, ' ').trim()
                    const targetNorm = norm(target.title + (target.year ? ` ${target.year}` : ''))
                    const tNorm = norm(r.title)
                      // try several relaxed matching strategies
                      const targetWords = target.title.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
                      const wordMatches = targetWords.filter((w) => tNorm.includes(w)).length
                      const basicMatch = tNorm.includes(targetNorm) || targetNorm.includes(tNorm)
                      if (!basicMatch) {
                        // if many words in title require at least 2 matches, otherwise at least 1
                        if (targetWords.length >= 3) {
                          if (wordMatches < 2) {
                            // allow season match for TV
                            if (target.season != null) {
                              const seasonStr = `s${String(target.season).padStart(2, '0')}`
                              const ruSeason = `${target.season} сезон`
                              if (!tNorm.includes(seasonStr) && !tNorm.includes(String(target.season)) && !tNorm.includes(ruSeason)) return false
                            } else {
                              return false
                            }
                          }
                        } else {
                          if (wordMatches < 1) {
                            if (target.season != null) {
                              const seasonStr = `s${String(target.season).padStart(2, '0')}`
                              const ruSeason = `${target.season} сезон`
                              if (!tNorm.includes(seasonStr) && !tNorm.includes(String(target.season)) && !tNorm.includes(ruSeason)) return false
                            } else {
                              return false
                            }
                          }
                        }
                      }
                    return true
                  })
                  .map((r, i) => {
                    const quality = detectQuality(r.title)
                    const voice = detectVoice(r.title)
                    return (
                      <li key={i}>
                        <button
                          onClick={() => selectRelease(r)}
                          className="tv-focus w-full rounded-lg border border-border bg-background p-3 text-left hover:border-primary/50"
                        >
                          <p className="mb-2 line-clamp-2 text-sm font-medium leading-snug">{r.title}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className={cn('rounded px-1.5 py-0.5 font-semibold', QUALITY_COLORS[quality])}>
                              {quality === 'unknown' ? 'SD?' : quality}
                            </span>
                            {voice && <span className="rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground">{voice}</span>}
                            <span>{formatSize(r.size)}</span>
                            <span className="flex items-center gap-1 text-green-500">
                              <ArrowUp className="size-3" aria-hidden="true" />
                              {r.seeders}
                            </span>
                            <span className="flex items-center gap-1">
                              <ArrowDown className="size-3" aria-hidden="true" />
                              {r.peers}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="size-3" aria-hidden="true" />
                              {r.tracker}
                            </span>
                          </div>
                        </button>
                      </li>
                    )
                  })}
              </ul>
            </div>
          )}

          {step.name === 'files' && (
            <ul className="flex flex-col gap-2">
              {step.files.map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => goToPlayer(step.hash, f)}
                    className="tv-focus flex w-full items-center gap-3 rounded-lg border border-border bg-background p-3 text-left hover:border-primary/50"
                  >
                    <FileVideo className="size-5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm font-medium">{f.path.split('/').pop()}</span>
                      <span className="text-xs text-muted-foreground">{formatSize(f.length)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
