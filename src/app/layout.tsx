import type { Metadata } from 'next'
import { Space_Grotesk, Press_Start_2P } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const pressStart2P = Press_Start_2P({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-press-start',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MetaQuizz — Multiplayer Trivia for Streamers',
  description: 'Real-time multiplayer quiz platform with 10 question types, AI-powered content, and stream-ready design.',
  keywords: ['quiz', 'trivia', 'multiplayer', 'streaming', 'AI', 'games'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${pressStart2P.variable}`}>
      <body>
        {children}
      </body>
    </html>
  )
}
