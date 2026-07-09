'use client'

// Custom HTML5 player for TorrServer streams:
// play/pause, seek ±10s, fullscreen, playback rate, audio tracks, text tracks,
// buffering indicator, TorrServer stats overlay, TV remote keys, progress saving.

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  AudioLines,
  Captions,
  Gauge,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { tsGetTorrent, type TorrentInfo } from '@/lib/torrserver'
import type { MediaTrack } from '@/lib/player/ffprobe'
import { useSettings } from '@/lib/settings-context'
import { saveProgress, type WatchProgress } from '@/lib/storage'
import { cn } from '@/lib/utils'

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2]
const KEY = { TIZEN_BACK: 10009, MEDIA_PLAY: 415, MEDIA_PAUSE: 19, MEDIA_PLAY_PAUSE: 10252, MEDIA_FF: 417, MEDIA_RW: 412 }

function fmtTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

function fmtSpeed(bytesPerSec: number): string {
  const mb = bytesPerSec / 1024 ** 2
  if (mb >= 1) return `${mb.toFixed(1)} МБ/с`
  return `${(bytesPerSec / 1024).toFixed(0)} КБ/с`
}

interface TrackOption {
  id: number
  label: string
}

const SUBTITLE_SIZE_PX = { small: 20, medium: 28, large: 38 } as const

// Best-effort match of a preferred language code against a track's label/language string
function trackMatchesLanguage(label: string, lang: string, pref: string): boolean {
  if (pref === 'any') return false
  const hay = `${label} ${lang}`.toLowerCase()
  if (pref === 'ru') return /\bru\b|rus|русск|россия/.test(hay)
  if (pref === 'en') return /\ben\b|eng|англ/.test(hay)
  if (pref === 'original') return /original|ориг/.test(hay)
  return false
}

export function VideoPlayer({
  src,
  title,
  subtitle,
  hash,
  progressStorageKey,
  startPosition,
  resumeContext,
  onEnded,
}: {
  src: string
  title: string
  subtitle?: string
  hash: string
  progressStorageKey: string
  startPosition: number
  resumeContext: Partial<WatchProgress>
  onEnded?: () => void
}) {
  const router = useRouter()
  const { settings } = useSettings()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [playing, setPlaying] = useState(false)
  const [buffering, setBuffering] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [muted, setMuted] = useState(false)
  const [rate, setRate] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [menu, setMenu] = useState<'none' | 'rate' | 'audio' | 'subs'>('none')
  const [audioTracks, setAudioTracks] = useState<TrackOption[]>([])
  const [activeAudio, setActiveAudio] = useState(0)
  const [textTracks, setTextTracks] = useState<TrackOption[]>([])
  const [activeText, setActiveText] = useState(-1)
  const [streamOffset, setStreamOffset] = useState(startPosition)
  const [totalDuration, setTotalDuration] = useState(0)
  const [segmentDuration, setSegmentDuration] = useState(0)
  const [stats, setStats] = useState<TorrentInfo | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [fatalError, setFatalError] = useState<string | null>(null)

  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      setControlsVisible(false)
      setMenu('none')
    }, 4000)
  }, [])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
    showControls()
  }, [showControls])

  const seekBy = useCallback(
    (delta: number) => {
      const v = videoRef.current
      if (!v) return
      const effectiveDuration = totalDuration || segmentDuration || Infinity
      const target = Math.max(0, Math.min(effectiveDuration, currentTime + delta))
      v.currentTime = Math.max(0, target - streamOffset)
      showControls()
    },
    [currentTime, segmentDuration, showControls, streamOffset, totalDuration],
  )

  const buildProxyUrl = useCallback(
    (audio: number, subtitle: number, start: number) => {
      const params = new URLSearchParams({
        url: src,
        audio: String(audio),
      })
      if (subtitle >= 0) params.set('subtitle', String(subtitle))
      if (start > 0) params.set('start', String(Math.floor(start)))
      return `/api/player/stream?${params.toString()}`
    },
    [src],
  )

  const proxySrc = buildProxyUrl(activeAudio, activeText, streamOffset)

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      containerRef.current?.requestFullscreen().catch(() => {})
    }
    showControls()
  }, [showControls])

  // Fetch audio/subtitle metadata for the source
  useEffect(() => {
    let active = true

    async function loadMediaInfo() {
      try {
        const response = await fetch(`/api/player/info?url=${encodeURIComponent(src)}`)
        if (!active) return
        if (!response.ok) {
          const body = await response.text()
          throw new Error(body || 'Не удалось получить информацию о медиа')
        }

        const data = (await response.json()) as {
          duration: number
          audioTracks: MediaTrack[]
          subtitleTracks: MediaTrack[]
        }

        const audioOpts = data.audioTracks.map((track, index) => {
          const label = track.title || track.language || `${track.codec.toUpperCase()} ${index + 1}`
          return { id: index, label }
        })

        const subtitleOpts = data.subtitleTracks.map((track, index) => {
          const label = track.title || track.language || `${track.codec.toUpperCase()} ${index + 1}`
          return { id: index, label }
        })

        if (!active) return

        setAudioTracks(audioOpts)
        setTextTracks(subtitleOpts)
        setTotalDuration(data.duration || 0)

        if (audioOpts.length > 0) {
          const preferredAudio = audioOpts.findIndex((track) => trackMatchesLanguage(track.label, '', settings.audioLanguage))
          if (preferredAudio >= 0) setActiveAudio(preferredAudio)
        }

        if (subtitleOpts.length > 0 && settings.subtitlesEnabled) {
          const preferredSub = subtitleOpts.findIndex((track) => trackMatchesLanguage(track.label, '', settings.subtitleLanguage))
          if (preferredSub >= 0) setActiveText(preferredSub)
        }
      } catch (err) {
        console.error(err)
        if (active) {
          setFatalError(
            'Не удалось получить информацию о дорожках. Проверьте доступность источника и работоспособность FFmpeg-плана.',
          )
        }
      }
    }

    loadMediaInfo()
    return () => {
      active = false
    }
  }, [src, settings.audioLanguage, settings.subtitleLanguage, settings.subtitlesEnabled])

  // Video element listeners
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onLoaded = () => {
      setSegmentDuration(v.duration)
      setTotalDuration((current) => current || v.duration + streamOffset)
      if (settings.autoplay) v.play().catch(() => {})
    }
    const onTime = () => {
      const absoluteTime = streamOffset + v.currentTime
      setCurrentTime(absoluteTime)
      if (v.buffered.length > 0) setBuffered(streamOffset + v.buffered.end(v.buffered.length - 1))
    }
    const onPlay = () => {
      setPlaying(true)
      setBuffering(false)
    }
    const onPause = () => setPlaying(false)
    const onWaiting = () => setBuffering(true)
    const onPlaying = () => setBuffering(false)
    const onError = () => {
      setBuffering(false)
      setFatalError(
        'Не удалось воспроизвести поток. Возможные причины: TorrServer недоступен из браузера, формат не поддерживается, либо страница открыта по HTTPS, а TorrServer — по HTTP (mixed content).',
      )
    }
    const onVideoEnded = () => onEnded?.()

    v.addEventListener('loadedmetadata', onLoaded)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('waiting', onWaiting)
    v.addEventListener('playing', onPlaying)
    v.addEventListener('error', onError)
    v.addEventListener('ended', onVideoEnded)
    return () => {
      v.removeEventListener('loadedmetadata', onLoaded)
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('waiting', onWaiting)
      v.removeEventListener('playing', onPlaying)
      v.removeEventListener('error', onError)
      v.removeEventListener('ended', onVideoEnded)
    }
  }, [streamOffset, settings.autoplay, settings.subtitlesEnabled, settings.audioLanguage, settings.subtitleLanguage, onEnded])

  // Save progress every 10 seconds and on unmount
  useEffect(() => {
    const save = () => {
      const v = videoRef.current
      if (!v || v.currentTime < 5) return
      saveProgress(progressStorageKey, {
        position: Math.floor(streamOffset + v.currentTime),
        duration: Math.floor(totalDuration || v.duration),
        updatedAt: Date.now(),
        ...resumeContext,
      })
    }
    const interval = setInterval(save, 10000)
    return () => {
      clearInterval(interval)
      save()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressStorageKey])

  // Poll TorrServer stats while overlay is open
  useEffect(() => {
    if (!showStats || !settings.torrserverUrl || !hash) return
    let active = true
    const poll = async () => {
      try {
        const info = await tsGetTorrent(settings.torrserverUrl, hash)
        if (active) setStats(info)
      } catch {
        // ignore polling errors
      }
    }
    poll()
    const interval = setInterval(poll, 3000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [showStats, settings.torrserverUrl, hash])

  // Reposition cues of the active subtitle track per user preference (BR-15)
  useEffect(() => {
    const v = videoRef.current
    if (!v || activeText < 0) return
    const track = v.textTracks[activeText]
    if (!track) return
    const applyLine = () => {
      const cues = track.activeCues ?? track.cues
      if (!cues) return
      for (let i = 0; i < cues.length; i++) {
        const cue = cues[i] as VTTCue
        try {
          cue.line = settings.subtitlePosition === 'top' ? 3 : -3
        } catch {
          // some browsers/tracks don't allow reassigning line; ignore
        }
      }
    }
    applyLine()
    track.addEventListener('cuechange', applyLine)
    return () => track.removeEventListener('cuechange', applyLine)
  }, [activeText, settings.subtitlePosition])

  // Keyboard / remote control
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const code = e.keyCode
      if (code === KEY.TIZEN_BACK || e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        if (menu !== 'none') setMenu('none')
        else if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
        else router.back()
        return
      }
      if (menu !== 'none') return
      switch (true) {
        case e.key === ' ' || e.key === 'Enter' && (e.target as HTMLElement)?.tagName !== 'BUTTON' && (e.target as HTMLElement)?.getAttribute('role') !== 'slider':
        case code === KEY.MEDIA_PLAY_PAUSE:
          e.preventDefault()
          togglePlay()
          break
        case code === KEY.MEDIA_PLAY:
          videoRef.current?.play().catch(() => {})
          break
        case code === KEY.MEDIA_PAUSE:
          videoRef.current?.pause()
          break
        case e.key === 'ArrowRight' || code === KEY.MEDIA_FF:
          e.preventDefault()
          e.stopPropagation()
          seekBy(10)
          break
        case e.key === 'ArrowLeft' || code === KEY.MEDIA_RW:
          e.preventDefault()
          e.stopPropagation()
          seekBy(-10)
          break
        case e.key === 'ArrowUp' || e.key === 'ArrowDown':
          showControls()
          break
        case e.key === 'f':
          toggleFullscreen()
          break
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [menu, router, seekBy, togglePlay, toggleFullscreen, showControls])

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  function selectAudio(id: number) {
    const v = videoRef.current
    const position = v ? streamOffset + v.currentTime : streamOffset
    setActiveAudio(id)
    setStreamOffset(position)
    setMenu('none')
  }

  function selectText(id: number) {
    const v = videoRef.current
    const position = v ? streamOffset + v.currentTime : streamOffset
    setActiveText(id)
    setStreamOffset(position)
    setMenu('none')
  }

  function onSeekBarKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      seekBy(30)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      seekBy(-30)
    }
  }

  const effectiveDuration = totalDuration || segmentDuration
  const progressPct = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0
  const bufferedPct = effectiveDuration > 0 ? (buffered / effectiveDuration) * 100 : 0

  if (fatalError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
        <p className="max-w-lg leading-relaxed text-pretty text-muted-foreground">{fatalError}</p>
        <button onClick={() => router.back()} className="tv-focus rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground">
          Назад
        </button>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-screen items-center justify-center bg-black"
      onMouseMove={showControls}
      onClick={showControls}
    >
      {/* Subtitle appearance from settings (BR-15: размер/цвет субтитров) */}
      <style>{`
        video::cue {
          color: ${settings.subtitleColor};
          font-size: ${SUBTITLE_SIZE_PX[settings.subtitleSize]}px;
          background: rgba(0, 0, 0, 0.6);
        }
      `}</style>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} src={proxySrc} className="h-screen w-full object-contain" muted={muted} crossOrigin="anonymous" playsInline />

      {buffering && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-14 animate-spin text-primary" aria-hidden="true" />
        </div>
      )}

      {/* Stats overlay */}
      {showStats && stats && (
        <div className="absolute top-16 right-4 z-20 w-64 rounded-lg bg-background/90 p-4 text-sm">
          <p className="mb-2 font-semibold text-primary">Статистика TorrServer</p>
          <dl className="space-y-1 text-muted-foreground">
            <div className="flex justify-between"><dt>Скорость</dt><dd className="text-foreground">{fmtSpeed(stats.download_speed)}</dd></div>
            <div className="flex justify-between"><dt>Сиды</dt><dd className="text-foreground">{stats.connected_seeders}</dd></div>
            <div className="flex justify-between"><dt>Пиры</dt><dd className="text-foreground">{stats.active_peers} / {stats.total_peers}</dd></div>
            <div className="flex justify-between"><dt>Статус</dt><dd className="text-foreground">{stats.stat_string}</dd></div>
          </dl>
        </div>
      )}

      {/* Controls */}
      <div
        className={cn(
          'absolute inset-0 z-10 flex flex-col justify-between transition-opacity duration-300',
          controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        {/* Top bar */}
        <div className="flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent p-4 md:p-6">
          <button onClick={() => router.back()} aria-label="Назад" className="tv-focus rounded-lg p-2 text-white">
            <ArrowLeft className="size-6" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <p className="line-clamp-1 font-semibold text-white md:text-lg">{title}</p>
            {subtitle && <p className="line-clamp-1 text-sm text-white/70">{subtitle}</p>}
          </div>
          <button
            onClick={() => setShowStats((s) => !s)}
            aria-pressed={showStats}
            aria-label="Статистика загрузки"
            className={cn('tv-focus ml-auto rounded-lg p-2', showStats ? 'text-primary' : 'text-white')}
          >
            <Activity className="size-6" aria-hidden="true" />
          </button>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-3 bg-gradient-to-t from-black/90 to-transparent p-4 md:p-6">
          {/* Seek bar */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Позиция воспроизведения"
            aria-valuemin={0}
            aria-valuemax={Math.floor(totalDuration || segmentDuration)}
            aria-valuenow={Math.floor(currentTime)}
            aria-valuetext={`${fmtTime(currentTime)} из ${fmtTime(totalDuration || segmentDuration)}`}
            onKeyDown={onSeekBarKey}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const ratio = (e.clientX - rect.left) / rect.width
              const v = videoRef.current
              const effectiveDuration = totalDuration || v?.duration || 0
              const target = ratio * effectiveDuration
              if (v) v.currentTime = Math.max(0, Math.min(v.duration, target - streamOffset))
            }}
            className="tv-focus group relative h-6 cursor-pointer rounded"
          >
            <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/20">
              <div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${bufferedPct}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
              <div
                className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-primary"
                style={{ left: `calc(${progressPct}% - 8px)` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={() => seekBy(-10)} aria-label="Назад 10 секунд" className="tv-focus rounded-lg p-2 text-white">
              <RotateCcw className="size-6" aria-hidden="true" />
            </button>
            <button onClick={togglePlay} aria-label={playing ? 'Пауза' : 'Воспроизвести'} className="tv-focus rounded-full bg-primary p-3 text-primary-foreground">
              {playing ? <Pause className="size-6 fill-primary-foreground" aria-hidden="true" /> : <Play className="size-6 fill-primary-foreground" aria-hidden="true" />}
            </button>
            <button onClick={() => seekBy(10)} aria-label="Вперёд 10 секунд" className="tv-focus rounded-lg p-2 text-white">
              <RotateCw className="size-6" aria-hidden="true" />
            </button>
            <span className="ml-1 text-sm tabular-nums text-white md:text-base">
              {fmtTime(currentTime)} / {fmtTime(effectiveDuration)}
            </span>

            <div className="ml-auto flex items-center gap-1 md:gap-2">
              <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Включить звук' : 'Выключить звук'} className="tv-focus rounded-lg p-2 text-white">
                {muted ? <VolumeX className="size-6" aria-hidden="true" /> : <Volume2 className="size-6" aria-hidden="true" />}
              </button>
              {audioTracks.length > 1 && (
                <button onClick={() => setMenu(menu === 'audio' ? 'none' : 'audio')} aria-label="Аудиодорожка" className={cn('tv-focus rounded-lg p-2', menu === 'audio' ? 'text-primary' : 'text-white')}>
                  <AudioLines className="size-6" aria-hidden="true" />
                </button>
              )}
              {textTracks.length > 0 && (
                <button onClick={() => setMenu(menu === 'subs' ? 'none' : 'subs')} aria-label="Субтитры" className={cn('tv-focus rounded-lg p-2', activeText >= 0 ? 'text-primary' : 'text-white')}>
                  <Captions className="size-6" aria-hidden="true" />
                </button>
              )}
              <button onClick={() => setMenu(menu === 'rate' ? 'none' : 'rate')} aria-label="Скорость воспроизведения" className={cn('tv-focus rounded-lg p-2', rate !== 1 ? 'text-primary' : 'text-white')}>
                <Gauge className="size-6" aria-hidden="true" />
              </button>
              <button onClick={toggleFullscreen} aria-label={fullscreen ? 'Выйти из полноэкранного режима' : 'Во весь экран'} className="tv-focus rounded-lg p-2 text-white">
                {fullscreen ? <Minimize className="size-6" aria-hidden="true" /> : <Maximize className="size-6" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Popup menus */}
      {menu !== 'none' && (
        <div className="absolute right-4 bottom-24 z-20 min-w-44 rounded-lg bg-background/95 p-2 shadow-xl md:right-6">
          {menu === 'rate' &&
            RATES.map((r) => (
              <button
                key={r}
                onClick={() => {
                  if (videoRef.current) videoRef.current.playbackRate = r
                  setRate(r)
                  setMenu('none')
                }}
                className={cn('tv-focus block w-full rounded-md px-4 py-2 text-left text-sm', r === rate ? 'bg-primary text-primary-foreground' : 'text-foreground')}
              >
                {r === 1 ? 'Обычная' : `${r}x`}
              </button>
            ))}
          {menu === 'audio' &&
            audioTracks.map((t) => (
              <button
                key={t.id}
                onClick={() => selectAudio(t.id)}
                className={cn('tv-focus block w-full rounded-md px-4 py-2 text-left text-sm', t.id === activeAudio ? 'bg-primary text-primary-foreground' : 'text-foreground')}
              >
                {t.label}
              </button>
            ))}
          {menu === 'subs' && (
            <>
              <button
                onClick={() => selectText(-1)}
                className={cn('tv-focus block w-full rounded-md px-4 py-2 text-left text-sm', activeText === -1 ? 'bg-primary text-primary-foreground' : 'text-foreground')}
              >
                Выключены
              </button>
              {textTracks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectText(t.id)}
                  className={cn('tv-focus block w-full rounded-md px-4 py-2 text-left text-sm', t.id === activeText ? 'bg-primary text-primary-foreground' : 'text-foreground')}
                >
                  {t.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
