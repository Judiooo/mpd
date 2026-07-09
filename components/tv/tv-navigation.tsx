'use client'

// Spatial navigation for TV remotes (Tizen) and desktop keyboards.
// Arrow keys move focus between elements marked with the `tv-focus` class
// (or any natively focusable element), Enter activates, Back navigates back.

import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

const TIZEN_BACK = 10009

function getFocusables(): HTMLElement[] {
  const nodes = document.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  return Array.from(nodes).filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return false
    const style = window.getComputedStyle(el)
    return style.visibility !== 'hidden' && style.display !== 'none'
  })
}

function center(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function findNext(current: HTMLElement, direction: 'up' | 'down' | 'left' | 'right'): HTMLElement | null {
  const currentRect = current.getBoundingClientRect()
  const c = center(currentRect)
  let best: HTMLElement | null = null
  let bestScore = Infinity

  for (const el of getFocusables()) {
    if (el === current) continue
    const rect = el.getBoundingClientRect()
    const t = center(rect)
    const dx = t.x - c.x
    const dy = t.y - c.y

    let primary: number
    let secondary: number
    switch (direction) {
      case 'up':
        if (dy >= -4) continue
        primary = -dy
        secondary = Math.abs(dx)
        break
      case 'down':
        if (dy <= 4) continue
        primary = dy
        secondary = Math.abs(dx)
        break
      case 'left':
        if (dx >= -4) continue
        primary = -dx
        secondary = Math.abs(dy)
        break
      case 'right':
        if (dx <= 4) continue
        primary = dx
        secondary = Math.abs(dy)
        break
    }
    // prefer elements aligned along the movement axis
    const score = primary + secondary * 2.5
    if (score < bestScore) {
      bestScore = score
      best = el
    }
  }
  return best
}

export function TvNavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Register Tizen remote keys if running on a Samsung TV
    try {
      const tizen = (window as unknown as { tizen?: { tvinputdevice?: { registerKey: (k: string) => void } } }).tizen
      if (tizen?.tvinputdevice) {
        for (const key of ['MediaPlay', 'MediaPause', 'MediaPlayPause', 'MediaFastForward', 'MediaRewind', 'MediaStop']) {
          try {
            tizen.tvinputdevice.registerKey(key)
          } catch {
            // key not supported
          }
        }
      }
    } catch {
      // not on Tizen
    }
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isTextInput =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

      // Back button (Tizen Return / Escape on desktop)
      if (e.keyCode === TIZEN_BACK || e.key === 'Escape') {
        if (isTextInput) {
          ;(target as HTMLElement).blur()
          e.preventDefault()
          return
        }
        // Let dialogs handle Escape themselves
        if (document.querySelector('[role="dialog"]')) return
        if (pathname !== '/') {
          e.preventDefault()
          router.back()
        }
        return
      }

      const dirMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      }
      const dir = dirMap[e.key]
      if (!dir) return
      // don't hijack horizontal arrows inside text inputs or sliders
      if (isTextInput && (dir === 'left' || dir === 'right')) return
      if (target?.getAttribute('role') === 'slider') return

      const active = document.activeElement as HTMLElement | null
      if (!active || active === document.body) {
        const first = getFocusables()[0]
        if (first) {
          first.focus()
          e.preventDefault()
        }
        return
      }
      const next = findNext(active, dir)
      if (next) {
        e.preventDefault()
        next.focus()
        next.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router, pathname])

  return <>{children}</>
}
