'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bookmark, Clock, Film, Home, Search, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'Главная', icon: Home },
  { href: '/search', label: 'Поиск', icon: Search },
  { href: '/bookmarks', label: 'Закладки', icon: Bookmark },
  { href: '/history', label: 'История', icon: Clock },
  { href: '/settings', label: 'Настройки', icon: Settings },
]

export function AppHeader() {
  const pathname = usePathname()
  if (pathname === '/watch') return null

  return (
    <header className="sticky top-0 z-40 bg-background/95 border-b border-border">
      <nav aria-label="Основная навигация" className="mx-auto flex max-w-[1800px] items-center gap-2 px-4 py-3 md:px-8">
        <Link href="/" className="tv-focus mr-4 flex items-center gap-2 rounded-lg px-2 py-1 text-primary">
          <Film className="size-6" aria-hidden="true" />
          <span className="text-lg font-bold tracking-tight">КиноПоток</span>
        </Link>
        <div className="flex flex-1 items-center gap-1 overflow-x-auto no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'tv-focus flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium md:text-base',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
              >
                <Icon className="size-4 md:size-5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
