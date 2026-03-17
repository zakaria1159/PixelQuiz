'use client'
import { useEffect, useRef, useState } from 'react'

interface MusicPlayerProps {
  deezerQuery?: string      // fetch from Deezer (music_guess)
  audioUrl?: string         // direct audio URL, skip fetch (animal_sound)
  allowedDuration: number   // seconds of clip unlocked so far (5–30)
  hasAnswered: boolean
  label?: string            // header label override, e.g. '🐾 ANIMAL SOUND'
}

export function MusicPlayer({ deezerQuery, audioUrl, allowedDuration, hasAnswered, label }: MusicPlayerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(false)
  const [isPlaying, setIsPlaying]   = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef    = useRef<HTMLAudioElement | null>(null)
  const allowedRef  = useRef(allowedDuration)
  const answeredRef = useRef(hasAnswered)

  // Keep refs in sync with latest props so the timeupdate closure always sees them
  allowedRef.current  = allowedDuration
  answeredRef.current = hasAnswered

  // Fetch preview URL or use direct audioUrl
  useEffect(() => {
    setLoading(true)
    setError(false)
    setPreviewUrl(null)

    // Direct URL provided (e.g. animal sounds) — skip Deezer fetch
    if (audioUrl) {
      setPreviewUrl(audioUrl)
      setLoading(false)
      return
    }

    if (!deezerQuery) {
      setError(true)
      setLoading(false)
      return
    }

    fetch(`/api/deezer-preview?q=${encodeURIComponent(deezerQuery)}`)
      .then(r => r.json())
      .then(data => {
        if (data.previewUrl) {
          setPreviewUrl(data.previewUrl)
          setLoading(false)
        } else {
          setError(true)
          setLoading(false)
        }
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [deezerQuery, audioUrl])

  // Create Audio element when preview URL resolves
  useEffect(() => {
    if (!previewUrl) return

    const audio = new Audio(previewUrl)
    audioRef.current = audio

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
      const cap = answeredRef.current ? 30 : allowedRef.current
      if (audio.currentTime >= cap) {
        audio.pause()
        audio.currentTime = 0
        setIsPlaying(false)
      }
    })

    audio.addEventListener('ended', () => {
      setIsPlaying(false)
      audio.currentTime = 0
    })

    // Auto-play best-effort
    audio.play().then(() => setIsPlaying(true)).catch(() => {})

    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [previewUrl])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.currentTime = 0
      audio.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }

  const unlockedPct = Math.round((allowedDuration / 30) * 100)

  // ─── Waveform bar animation delays ───────────────────────────────────────────
  const barDelays = ['0ms', '120ms', '240ms', '360ms', '480ms', '200ms', '80ms']

  return (
    <>
      <style>{`
        @keyframes waveBar {
          0%, 100% { height: 8px; }
          50%       { height: 32px; }
        }
      `}</style>

      <div
        style={{
          borderRadius: '20px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#6366f1',
            }}
          >
            {label ?? '🎵 MUSIC ROUND'}
          </span>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px 0' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#6366f1',
                animation: 'waveBar 1s ease-in-out infinite',
              }}
            />
            <span style={{ fontSize: '13px', color: '#a1a1aa' }}>Finding track...</span>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <span style={{ fontSize: '13px', color: '#71717a' }}>Track not found</span>
          </div>
        )}

        {/* Player */}
        {!loading && !error && previewUrl && (
          <>
            {/* Waveform + Play button row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
              {/* Waveform */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '40px' }}>
                {barDelays.map((delay, i) => (
                  <div
                    key={i}
                    style={{
                      width: '4px',
                      borderRadius: '2px',
                      background: '#6366f1',
                      height: isPlaying ? undefined : '8px',
                      animation: isPlaying ? `waveBar 0.8s ease-in-out ${delay} infinite` : 'none',
                      transition: 'height 0.2s ease',
                      alignSelf: 'center',
                    }}
                  />
                ))}
              </div>

              {/* Play/Pause button */}
              <button
                onClick={togglePlay}
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'rgba(99,102,241,0.2)',
                  border: '2px solid rgba(99,102,241,0.5)',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.35)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.8)'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.2)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.5)'
                }}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              {/* Waveform mirrored */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '40px' }}>
                {barDelays.slice().reverse().map((delay, i) => (
                  <div
                    key={i}
                    style={{
                      width: '4px',
                      borderRadius: '2px',
                      background: '#6366f1',
                      height: isPlaying ? undefined : '8px',
                      animation: isPlaying ? `waveBar 0.8s ease-in-out ${delay} infinite` : 'none',
                      transition: 'height 0.2s ease',
                      alignSelf: 'center',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Clip position */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: '#52525b', fontVariantNumeric: 'tabular-nums' }}>
                {currentTime.toFixed(1)}s
              </span>
            </div>

            {/* Unlocked progress — hidden when full clip is always available */}
            {allowedDuration < 30 && <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Unlocked
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#a1a1aa', fontVariantNumeric: 'tabular-nums' }}>
                  {allowedDuration}s / 30s
                </span>
              </div>
              <div
                style={{
                  height: '6px',
                  borderRadius: '99px',
                  background: 'rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    borderRadius: '99px',
                    width: `${unlockedPct}%`,
                    background: 'linear-gradient(90deg, #4f46e5, #818cf8)',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>}
          </>
        )}
      </div>
    </>
  )
}
