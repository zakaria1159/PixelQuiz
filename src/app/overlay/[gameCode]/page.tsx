'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSpectator } from '@/hooks/useSpectator'
import { hasOptions } from '@/types/question'

const AVATAR_COLORS = [
  'from-blue-600 to-blue-800',
  'from-orange-500 to-orange-700',
  'from-emerald-500 to-emerald-700',
  'from-purple-600 to-purple-800',
]

export default function OverlayPage() {
  const params = useParams()
  const gameCode = params.gameCode as string
  const { gameState, gameStatus, spectatorCount, timeLimit, questionStartTime } = useSpectator(gameCode)
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    if (gameStatus !== 'question') return
    setTimeLeft(timeLimit)
    const interval = setInterval(() => {
      const elapsed = (Date.now() - questionStartTime) / 1000
      const remaining = Math.max(0, timeLimit - elapsed)
      setTimeLeft(Math.ceil(remaining))
      if (remaining <= 0) clearInterval(interval)
    }, 250)
    return () => clearInterval(interval)
  }, [timeLimit, questionStartTime, gameStatus])

  if (!gameState || gameStatus !== 'question' || !gameState.currentQuestion) {
    return <div style={{ background: 'transparent' }} />
  }

  const question = gameState.currentQuestion
  const players = [...(gameState.players ?? [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const pct = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 0
  const timerColor = pct > 50 ? '#6366f1' : pct > 25 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ background: 'transparent', padding: '12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>

        {/* Left: question + timer */}
        <div style={{ flex: 1, background: 'rgba(9,9,15,0.85)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', padding: '12px', backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '9px', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              Q{(gameState.currentQuestionIndex ?? 0) + 1}/{gameState.questions?.length ?? 0}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 900, color: timerColor, lineHeight: 1 }}>{timeLeft}s</span>
          </div>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ height: '3px', width: `${pct}%`, background: timerColor, borderRadius: '99px', transition: 'width 0.25s linear' }} />
          </div>

          <div style={{ fontSize: '12px', fontWeight: 700, color: 'white', marginBottom: '8px', lineHeight: 1.4 }}>
            {question.question}
          </div>

          {hasOptions(question) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {question.options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '5px 7px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 800, flexShrink: 0 }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span style={{ fontSize: '10px', color: '#a1a1aa' }}>{opt}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: leaderboard + spectator count */}
        <div style={{ width: '140px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ background: 'rgba(9,9,15,0.85)', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.2)', padding: '10px', backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: '8px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>
              Leaderboard
            </div>
            {players.slice(0, 5).map((player, i) => (
              <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 0', borderBottom: i < Math.min(players.length, 5) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: '#52525b', width: '12px' }}>{i + 1}</span>
                <div className={`w-4 h-4 rounded flex items-center justify-center bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} font-black text-white flex-shrink-0`} style={{ fontSize: '7px' }}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ flex: 1, fontSize: '9px', fontWeight: 600, color: '#e4e4e7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</span>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#a5b4fc' }}>{(player.score ?? 0).toLocaleString()}</span>
              </div>
            ))}
          </div>

          {spectatorCount > 0 && (
            <div style={{ background: 'rgba(9,9,15,0.85)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', padding: '8px 10px', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
              <span style={{ fontSize: '13px', fontWeight: 900, color: 'white' }}>{spectatorCount}</span>
              <span style={{ fontSize: '9px', color: '#71717a' }}>watching</span>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
