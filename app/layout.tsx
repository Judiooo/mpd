import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { SettingsProvider } from '@/lib/settings-context'
import { TvNavigationProvider } from '@/components/tv/tv-navigation'
import { AppHeader } from '@/components/app-header'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'КиноПоток — фильмы и сериалы',
  description: 'Просмотр фильмов и сериалов через TorrServer на Smart TV и в браузере',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#16161f',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className={`bg-background ${inter.className}`}>
      <body className="antialiased font-sans min-h-screen">
        <SettingsProvider>
          <TvNavigationProvider>
            <AppHeader />
            {children}
          </TvNavigationProvider>
        </SettingsProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
