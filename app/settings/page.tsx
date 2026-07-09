'use client'

import { useState } from 'react'
import {
  AlertCircle,
  Bookmark,
  CheckCircle2,
  Clock,
  Database,
  Loader2,
  Monitor,
  Server,
  Settings as SettingsIcon,
  SlidersHorizontal,
} from 'lucide-react'
import { useSettings } from '@/lib/settings-context'
import { clearAllProgress, clearBookmarks, clearHistory, type AppSettings } from '@/lib/storage'
import { tsEcho } from '@/lib/torrserver'
import { searchReleases } from '@/lib/jackett'
import { tmdbFetch } from '@/lib/tmdb'
import { cn } from '@/lib/utils'

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 md:p-6">
      <div className="mb-5 flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold md:text-xl">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground text-pretty">{hint}</span>}
    </label>
  )
}

function TextField({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="tv-focus h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none md:h-12 md:text-base"
    />
  )
}

function SelectField<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            'tv-focus rounded-lg px-3.5 py-2 text-sm font-medium md:text-base',
            value === o.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className="tv-focus flex items-center justify-between gap-4 rounded-lg bg-background px-3.5 py-3 text-left"
    >
      <span className="text-sm font-medium md:text-base">{label}</span>
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  )
}

const SUBTITLE_COLORS = ['#ffffff', '#ffd54a', '#4ade80', '#60a5fa', '#f87171']

type TestState = 'idle' | 'testing' | 'ok' | 'fail'

function TestButton({ state, label, onClick }: { state: TestState; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === 'testing'}
      className="tv-focus flex items-center gap-2 self-start rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground disabled:opacity-60"
    >
      {state === 'testing' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {state === 'ok' && <CheckCircle2 className="size-4 text-green-500" aria-hidden="true" />}
      {state === 'fail' && <AlertCircle className="size-4 text-destructive" aria-hidden="true" />}
      {label}
    </button>
  )
}

export default function SettingsPage() {
  const { settings, updateSettings, ready } = useSettings()
  const [tsTest, setTsTest] = useState<TestState>('idle')
  const [jkTest, setJkTest] = useState<TestState>('idle')
  const [tmdbTest, setTmdbTest] = useState<TestState>('idle')
  const [cleared, setCleared] = useState<string | null>(null)

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    updateSettings({ [key]: value } as Partial<AppSettings>)
  }

  async function testTorrserver() {
    setTsTest('testing')
    try {
      await tsEcho(settings.torrserverUrl)
      setTsTest('ok')
    } catch {
      setTsTest('fail')
    }
  }

  async function testJackett() {
    setJkTest('testing')
    try {
      await searchReleases(settings.jackettUrl, settings.jackettApiKey, 'test')
      setJkTest('ok')
    } catch {
      setJkTest('fail')
    }
  }

  async function testTmdb() {
    setTmdbTest('testing')
    try {
      await tmdbFetch('movie/popular')
      setTmdbTest('ok')
    } catch {
      setTmdbTest('fail')
    }
  }

  async function clearCache() {
    try {
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
    } catch {
      // ignore
    }
    setCleared('Кеш очищен')
    setTimeout(() => setCleared(null), 2500)
  }

  if (!ready) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center md:px-8">
        <Loader2 className="mx-auto size-8 animate-spin text-primary" aria-hidden="true" />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-16 md:px-8">
      <h1 className="mb-6 flex items-center gap-3 text-2xl font-bold md:text-3xl">
        <SettingsIcon className="size-7 text-primary" aria-hidden="true" />
        Настройки
      </h1>

      <div className="flex flex-col gap-5">
        <Section icon={Server} title="Серверы" description="Адреса вашей собственной инфраструктуры TorrServer и Jackett, а также ключ TMDB для получения информации о фильмах.">
          <Field label="TMDB API-ключ" hint="Бесплатно получить на themoviedb.org/settings/api. Подходит как v3 API key, так и v4 read access token.">
            <TextField value={settings.tmdbApiKey} onChange={(v) => set('tmdbApiKey', v)} placeholder="API key или access token" />
          </Field>
          <TestButton
            state={tmdbTest}
            label={tmdbTest === 'ok' ? 'TMDB отвечает' : tmdbTest === 'fail' ? 'Не удалось подключиться' : 'Проверить ключ'}
            onClick={testTmdb}
          />

          <Field label="Адрес TorrServer" hint="Например: http://192.168.1.10:8090">
            <TextField value={settings.torrserverUrl} onChange={(v) => set('torrserverUrl', v)} placeholder="http://192.168.1.10:8090" />
          </Field>
          <TestButton
            state={tsTest}
            label={tsTest === 'ok' ? 'Соединение установлено' : tsTest === 'fail' ? 'Не удалось подключиться' : 'Проверить соединение'}
            onClick={testTorrserver}
          />

          <Field label="Адрес Jackett" hint="Например: http://192.168.1.10:9117">
            <TextField value={settings.jackettUrl} onChange={(v) => set('jackettUrl', v)} placeholder="http://192.168.1.10:9117" />
          </Field>
          <Field label="API-ключ Jackett">
            <TextField value={settings.jackettApiKey} onChange={(v) => set('jackettApiKey', v)} placeholder="API key" />
          </Field>
          <TestButton
            state={jkTest}
            label={jkTest === 'ok' ? 'Jackett отвечает' : jkTest === 'fail' ? 'Не удалось подключиться' : 'Проверить соединение'}
            onClick={testJackett}
          />
          <p className="text-xs text-muted-foreground text-pretty">
            Архитектура приложения модульная: в дальнейшем можно подключить дополнительные источники метаданных
            или поисковые индексаторы без изменения интерфейса.
          </p>
        </Section>

        <Section icon={SlidersHorizontal} title="Плеер" description="Поведение воспроизведения, качество релизов и субтитры.">
          <Toggle checked={settings.autoplay} onChange={(v) => set('autoplay', v)} label="Автозапуск воспроизведения" />

          <Field label="Качество по умолчанию">
            <SelectField
              value={settings.preferredQuality}
              onChange={(v) => set('preferredQuality', v)}
              options={[
                { value: 'any', label: 'Любое' },
                { value: '2160p', label: '4K' },
                { value: '1080p', label: '1080p' },
                { value: '720p', label: '720p' },
              ]}
            />
          </Field>

          <Field label="Язык аудио">
            <SelectField
              value={settings.audioLanguage}
              onChange={(v) => set('audioLanguage', v)}
              options={[
                { value: 'any', label: 'Любой' },
                { value: 'ru', label: 'Русский' },
                { value: 'en', label: 'English' },
                { value: 'original', label: 'Оригинал' },
              ]}
            />
          </Field>

          <Toggle checked={settings.subtitlesEnabled} onChange={(v) => set('subtitlesEnabled', v)} label="Включить субтитры" />

          <Field label="Язык субтитров">
            <SelectField
              value={settings.subtitleLanguage}
              onChange={(v) => set('subtitleLanguage', v)}
              options={[
                { value: 'any', label: 'Любой' },
                { value: 'ru', label: 'Русский' },
                { value: 'en', label: 'English' },
              ]}
            />
          </Field>

          <Field label="Размер субтитров">
            <SelectField
              value={settings.subtitleSize}
              onChange={(v) => set('subtitleSize', v)}
              options={[
                { value: 'small', label: 'Маленький' },
                { value: 'medium', label: 'Средний' },
                { value: 'large', label: 'Крупный' },
              ]}
            />
          </Field>

          <Field label="Цвет субтитров">
            <div className="flex gap-2">
              {SUBTITLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('subtitleColor', c)}
                  aria-label={c}
                  aria-pressed={settings.subtitleColor === c}
                  className={cn(
                    'tv-focus size-9 rounded-full border-2',
                    settings.subtitleColor === c ? 'border-primary' : 'border-transparent',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Field>

          <Field label="Положение субтитров">
            <SelectField
              value={settings.subtitlePosition}
              onChange={(v) => set('subtitlePosition', v)}
              options={[
                { value: 'bottom', label: 'Снизу' },
                { value: 'top', label: 'Сверху' },
              ]}
            />
          </Field>
        </Section>

        <Section icon={Monitor} title="Интерфейс" description="Внешний вид каталога и карточек.">
          <Field label="Тема оформления">
            <SelectField
              value={settings.theme}
              onChange={(v) => set('theme', v)}
              options={[
                { value: 'dark', label: 'Тёмная' },
                { value: 'light', label: 'Светлая' },
              ]}
            />
          </Field>
          <Field label="Размер карточек">
            <SelectField
              value={settings.cardSize}
              onChange={(v) => set('cardSize', v)}
              options={[
                { value: 'small', label: 'Маленькие' },
                { value: 'medium', label: 'Средние' },
                { value: 'large', label: 'Крупные' },
              ]}
            />
          </Field>
          <Toggle checked={settings.showRatings} onChange={(v) => set('showRatings', v)} label="Показывать рейтинги на карточках" />
          <Field label="Сортировка результатов поиска">
            <SelectField
              value={settings.sortOrder}
              onChange={(v) => set('sortOrder', v)}
              options={[
                { value: 'relevance', label: 'По релевантности' },
                { value: 'rating', label: 'По рейтингу' },
                { value: 'year', label: 'По году' },
                { value: 'title', label: 'По названию' },
              ]}
            />
          </Field>
        </Section>

        <Section icon={Database} title="Общее" description="Язык интерфейса и очистка локальных данных.">
          <Field label="Язык интерфейса">
            <SelectField
              value={settings.uiLanguage}
              onChange={(v) => set('uiLanguage', v)}
              options={[{ value: 'ru', label: 'Русский' }]}
            />
          </Field>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                clearHistory()
                clearAllProgress()
                setCleared('История очищена')
                setTimeout(() => setCleared(null), 2500)
              }}
              className="tv-focus flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground"
            >
              <Clock className="size-4" aria-hidden="true" />
              Очистить историю
            </button>
            <button
              type="button"
              onClick={() => {
                clearBookmarks()
                setCleared('Закладки очищены')
                setTimeout(() => setCleared(null), 2500)
              }}
              className="tv-focus flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground"
            >
              <Bookmark className="size-4" aria-hidden="true" />
              Очистить закладки
            </button>
            <button
              type="button"
              onClick={clearCache}
              className="tv-focus flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground"
            >
              <Database className="size-4" aria-hidden="true" />
              Очистить кеш
            </button>
          </div>
          {cleared && <p className="text-sm text-primary">{cleared}</p>}
        </Section>
      </div>
    </main>
  )
}
