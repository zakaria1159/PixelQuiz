'use client'

import { useEffect, useState, useRef } from 'react'
import { useTranslation } from '@/hooks/useTranslation'

interface GameResultsProps {
  gameState: any
  currentPlayer: any
  isHost: boolean
}

// ── Confetti particle ────────────────────────────────────────────────────────
interface Particle {
  id: number
  x: number
  size: number
  color: string
  delay: number
  duration: number
  rotate: number
  shape: 'rect' | 'circle'
}

const CONFETTI_COLORS = ['#6366f1','#8b5cf6','#ec4899','#facc15','#4ade80','#38bdf8','#f97316']

function Confetti() {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 3,
      rotate: Math.random() * 360,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }))
  )

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: '-20px',
            width: p.shape === 'rect' ? p.size : p.size,
            height: p.shape === 'rect' ? p.size * 0.4 : p.size,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            background: p.color,
            opacity: 0,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(110vh) rotate(720deg); }
        }
      `}</style>
    </div>
  )
}

// ── Animated number ──────────────────────────────────────────────────────────
function AnimatedScore({ value, delay = 0 }: { value: number; delay?: number }) {
  const [displayed, setDisplayed] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  useEffect(() => {
    if (!started || value === 0) return
    const duration = 1200
    const steps = 40
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + increment, value)
      setDisplayed(Math.round(current))
      if (current >= value) clearInterval(timer)
    }, duration / steps)
    return () => clearInterval(timer)
  }, [started, value])

  return <>{displayed.toLocaleString()}</>
}

// ── Podium bar ───────────────────────────────────────────────────────────────
const PODIUM = [
  { rank: 0, height: 120, color: '#facc15', shadow: 'rgba(250,204,21,0.4)', medal: '🥇', label: '1ST' },
  { rank: 1, height: 90,  color: '#94a3b8', shadow: 'rgba(148,163,184,0.3)', medal: '🥈', label: '2ND' },
  { rank: 2, height: 70,  color: '#fb923c', shadow: 'rgba(251,146,60,0.3)',  medal: '🥉', label: '3RD' },
]

// ── Main component ───────────────────────────────────────────────────────────
export function GameResults({ gameState, currentPlayer, isHost }: GameResultsProps) {
  const [visible, setVisible] = useState(false)
  const [showPodium, setShowPodium] = useState(false)
  const [showList, setShowList] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 50)
    const t2 = setTimeout(() => setShowPodium(true), 400)
    const t3 = setTimeout(() => setShowList(true), 1200)
    const t4 = setTimeout(() => setShowStats(true), 1600)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  if (!gameState?.finalResults) {
    return (
      <div style={{ height: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090f' }}>
        <div style={{ textAlign: 'center', color: '#71717a' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
          <div style={{ fontWeight: 700 }}>Calculating final scores…</div>
        </div>
      </div>
    )
  }

  const results: any[] = gameState.finalResults
  const winner = results[0]
  const myResult = results.find((r: any) => r.playerId === currentPlayer?.id)
  const myRank = myResult ? results.indexOf(myResult) + 1 : null

  // reorder podium: 2nd | 1st | 3rd
  const podiumOrder = [results[1], results[0], results[2]].filter(Boolean)
  const podiumDefs   = [PODIUM[1], PODIUM[0], PODIUM[2]]

  return (
    <div
      style={{
        height: '100svh',
        overflowY: 'auto',
        background: 'radial-gradient(ellipse at 50% -10%, #13154a 0%, #09090f 60%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 20px 48px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        position: 'relative',
      }}
    >
      <Confetti />

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#6366f1', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '10px' }}>
          METAQUIZZ
        </div>
        <div style={{ fontSize: '32px', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>
          {t('game_over')}
        </div>
        <div style={{ fontSize: '13px', color: '#52525b', marginTop: '4px', fontWeight: 600 }}>
          {t('n_players_n_questions', { players: results.length, questions: results[0]?.questionResults?.length ?? 0 })}
        </div>
      </div>

      {/* Winner callout */}
      <div
        style={{
          position: 'relative', zIndex: 1,
          marginTop: '24px', marginBottom: '32px',
          padding: '20px 40px',
          borderRadius: '24px',
          background: 'rgba(250,204,21,0.08)',
          border: '1px solid rgba(250,204,21,0.25)',
          textAlign: 'center',
          animation: showPodium ? 'popIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
          opacity: showPodium ? 1 : 0,
        }}
      >
        <div style={{ fontSize: '40px', marginBottom: '6px' }}>👑</div>
        <div style={{ fontSize: '22px', fontWeight: 900, color: '#facc15', textShadow: '0 0 24px rgba(250,204,21,0.5)' }}>
          {winner?.playerName}
        </div>
        <div style={{ fontSize: '13px', color: '#a16207', fontWeight: 700, marginTop: '4px' }}>
          {winner?.score?.toLocaleString()} {t('wins_the_game')}
        </div>
      </div>

      {/* Podium */}
      <div
        style={{
          position: 'relative', zIndex: 1,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '40px',
          opacity: showPodium ? 1 : 0,
          transition: 'opacity 0.5s ease 0.3s',
        }}
      >
        {podiumOrder.map((player, i) => {
          const def = podiumDefs[i]
          const isMe = player?.playerId === currentPlayer?.id
          return (
            <div
              key={player?.playerId}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                animation: showPodium ? `slideUp 0.5s ease ${0.1 + i * 0.1}s both` : 'none',
              }}
            >
              {/* Name above bar */}
              <div style={{ textAlign: 'center', maxWidth: '90px' }}>
                <div style={{ fontSize: '20px' }}>{def.medal}</div>
                <div style={{
                  fontSize: '11px', fontWeight: 700,
                  color: isMe ? '#a5b4fc' : 'white',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90px',
                }}>
                  {player?.playerName}
                  {isMe && <span style={{ color: '#818cf8' }}> ★</span>}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 900, color: def.color, textShadow: `0 0 12px ${def.shadow}` }}>
                  <AnimatedScore value={player?.score || 0} delay={600 + i * 100} />
                </div>
              </div>
              {/* Bar */}
              <div
                style={{
                  width: '80px',
                  height: `${def.height}px`,
                  borderRadius: '12px 12px 4px 4px',
                  background: `linear-gradient(180deg, ${def.color}30 0%, ${def.color}10 100%)`,
                  border: `1px solid ${def.color}50`,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: '8px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 800, color: def.color, letterSpacing: '0.05em' }}>
                  {def.label}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Full leaderboard */}
      <div
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: '460px',
          display: 'flex', flexDirection: 'column', gap: '8px',
          marginBottom: '32px',
          opacity: showList ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
          {t('final_standings')}
        </div>
        {results.map((entry: any, i: number) => {
          const isMe = entry.playerId === currentPlayer?.id
          const correct = entry.questionResults?.filter((q: any) => q.isCorrect).length ?? 0
          const total = entry.questionResults?.length ?? 0
          const RANK_COLORS = [
            { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', text: '#facc15' },
            { bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', text: '#94a3b8' },
            { bg: 'rgba(180,83,9,0.1)', border: 'rgba(180,83,9,0.25)', text: '#fb923c' },
          ]
          const rankStyle = RANK_COLORS[i] ?? { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)', text: '#52525b' }

          return (
            <div
              key={entry.playerId}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                borderRadius: '14px',
                background: isMe ? 'rgba(99,102,241,0.12)' : rankStyle.bg,
                border: `1px solid ${isMe ? 'rgba(99,102,241,0.35)' : rankStyle.border}`,
                animation: showList ? `slideUpFadeIn 0.4s ease ${i * 0.06}s both` : 'none',
              }}
            >
              <div style={{ width: '28px', textAlign: 'center', fontSize: i < 3 ? '18px' : '12px', fontWeight: 700, color: rankStyle.text, flexShrink: 0 }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: isMe ? '#a5b4fc' : 'white', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {entry.playerName}
                  {isMe && <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.3)', color: '#818cf8', padding: '1px 6px', borderRadius: '99px', fontWeight: 700 }}>{t('you_badge')}</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#52525b', fontWeight: 600, marginTop: '2px' }}>
                  {t('n_correct', { n: correct, total })}
                </div>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: isMe ? '#a5b4fc' : rankStyle.text, flexShrink: 0, minWidth: '60px', textAlign: 'right' }}>
                <AnimatedScore value={entry.score || 0} delay={800 + i * 80} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Personal stat card */}
      {myResult && (
        <div
          style={{
            position: 'relative', zIndex: 1,
            width: '100%', maxWidth: '460px',
            padding: '20px 24px',
            borderRadius: '20px',
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.25)',
            marginBottom: '32px',
            opacity: showStats ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
            {t('your_performance')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {[
              { label: t('rank_label'), value: myRank === 1 ? '🥇 1st' : `#${myRank}`, highlight: myRank === 1 },
              { label: t('score_label'), value: (myResult.score || 0).toLocaleString(), highlight: false },
              {
                label: t('accuracy_label'),
                value: `${Math.round(
                  ((myResult.questionResults?.filter((q: any) => q.isCorrect).length ?? 0) /
                    (myResult.questionResults?.length || 1)) * 100
                )}%`,
                highlight: false,
              },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 900, color: stat.highlight ? '#facc15' : '#a5b4fc' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back home */}
      <button
        onClick={() => window.location.href = '/'}
        style={{
          position: 'relative', zIndex: 1,
          padding: '14px 40px',
          borderRadius: '14px',
          background: 'rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.4)',
          color: '#a5b4fc',
          fontSize: '14px',
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.05em',
          opacity: showStats ? 1 : 0,
          transition: 'opacity 0.4s ease 0.2s, background 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.28)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
      >
        {t('back_to_home')}
      </button>

      <style>{`
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.7); }
          60%  { transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUpFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
