'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'

interface GameCountdownProps {
  playerCount: number
}

export function GameCountdown({ playerCount }: GameCountdownProps) {
  const [count, setCount] = useState(3)
  const [phase, setPhase] = useState<'ready' | 'counting' | 'go'>('ready')
  const [visible, setVisible] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    // Show "GET READY" for 1s, then count 3-2-1, then "GO!"
    const readyTimer = setTimeout(() => {
      setPhase('counting')
    }, 1000)
    return () => clearTimeout(readyTimer)
  }, [])

  useEffect(() => {
    if (phase !== 'counting') return
    if (count <= 0) {
      setPhase('go')
      return
    }
    const t = setTimeout(() => setCount(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, count])

  const displayNum = count > 0 ? count : 0

  return (
    <div
      style={{
        height: '100svh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% -10%, #13154a 0%, #09090f 60%)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        gap: '32px',
      }}
    >
      {/* PX logo */}
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#6366f1', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        METAQUIZZ
      </div>

      {/* Player count pill */}
      <div style={{
        fontSize: '12px',
        fontWeight: 700,
        color: '#71717a',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '99px',
        padding: '6px 16px',
        letterSpacing: '0.08em',
      }}>
        {playerCount === 1 ? t('player_ready_singular', { n: playerCount }) : t('player_ready_plural', { n: playerCount })}
      </div>

      {/* Main display */}
      {phase === 'ready' && (
        <div
          key="ready"
          style={{
            textAlign: 'center',
            animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#a1a1aa', marginBottom: '12px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            {t('get_ready')}
          </div>
          <div style={{ fontSize: '80px', lineHeight: 1 }}>🎮</div>
        </div>
      )}

      {phase === 'counting' && displayNum > 0 && (
        <div
          key={`count-${displayNum}`}
          style={{
            fontSize: '120px',
            fontWeight: 900,
            color: '#6366f1',
            lineHeight: 1,
            textShadow: '0 0 60px rgba(99,102,241,0.6)',
            animation: 'countPop 0.9s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          {displayNum}
        </div>
      )}

      {phase === 'go' && (
        <div
          key="go"
          style={{
            fontSize: '72px',
            fontWeight: 900,
            color: '#4ade80',
            textShadow: '0 0 40px rgba(74,222,128,0.6)',
            animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
            letterSpacing: '0.05em',
          }}
        >
          GO!
        </div>
      )}

      {/* Subtitle */}
      <div style={{ fontSize: '12px', color: '#3f3f46', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {t('first_question_soon')}
      </div>

      <style>{`
        @keyframes countPop {
          0%   { opacity: 0; transform: scale(1.6); }
          40%  { opacity: 1; transform: scale(0.9); }
          70%  { transform: scale(1.05); }
          100% { opacity: 0.7; transform: scale(1); }
        }
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.6); }
          60%  { transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
