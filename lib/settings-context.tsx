'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { type AppSettings, DEFAULT_SETTINGS, loadSettings, saveSettings } from './storage'

interface SettingsContextValue {
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
  ready: boolean
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  ready: false,
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
    setReady(true)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light', settings.theme === 'light')
    document.documentElement.style.colorScheme = settings.theme
  }, [settings.theme])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  return <SettingsContext.Provider value={{ settings, updateSettings, ready }}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  return useContext(SettingsContext)
}
