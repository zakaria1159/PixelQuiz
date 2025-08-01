// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Quiz Platform - Retro Style',
  description: 'Pixel art multiplayer quiz platform powered by AI for streamers',
  keywords: ['quiz', 'trivia', 'multiplayer', 'streaming', 'AI', 'games', 'retro', 'pixel'],
  authors: [{ name: 'AI Quiz Platform Team' }],
  openGraph: {
    title: 'AI Quiz Platform - Retro Style',
    description: 'The ultimate retro multiplayer quiz experience for streamers',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-pixel antialiased pixel-bg">
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative scanlines">
          {children}
        </div>
      </body>
    </html>
  )
}