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
  'from-pink-500 to-pink-700',
  'from-yellow-500 to-yellow-700',
  'from-red-500 to-red-700',
  'from-cyan-500 to-cyan-700',
]

function PulsingDots() {
  return (
    <span className="inline-flex gap-1 ml-1.5">
      {[0, 1, 2].map(i => (
        <span key={i} className="inline-block w-1.5 h-1.5 bg-current rounded-full"
          style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </span>
  )
}

function TimerBar({ timeLimit, questionStartTime }: { timeLimit: number; questionStartTime: number }) {
  const [timeLeft, setTimeLeft] = useState(timeLimit)

  useEffect(() => {
    setTimeLeft(timeLimit)
    const interval = setInterval(() => {
      const elapsed = (Date.now() - questionStartTime) / 1000
      const remaining = Math.max(0, timeLimit - elapsed)
      setTimeLeft(Math.ceil(remaining))
      if (remaining <= 0) clearInterval(interval)
    }, 250)
    return () => clearInterval(interval)
  }, [timeLimit, questionStartTime])

  const pct = (timeLeft / timeLimit) * 100
  const color = pct > 50 ? '#6366f1' : pct > 25 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 600 }}>Time left</span>
        <span style={{ fontSize: '22px', fontWeight: 900, color, lineHeight: 1 }}>{timeLeft}</span>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '4px', width: `${pct}%`, background: color, borderRadius: '99px', transition: 'width 0.25s linear, background 0.5s' }} />
      </div>
    </div>
  )
}

export default function WatchPage() {
  const params = useParams()
  const gameCode = params.gameCode as string
  const { gameState, gameStatus, spectatorCount, playerAnswers, timeLimit, questionStartTime, isConnected, error } = useSpectator(gameCode)

  const bg = 'radial-gradient(ellipse at 50% -10%, #13154a 0%, #0f0f1a 50%, #09090f 100%)'

  if (error) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, padding: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <h2 style={{ color: 'white', fontWeight: 800, fontSize: '20px', marginBottom: '8px' }}>Cannot join as spectator</h2>
          <p style={{ color: '#71717a', fontSize: '14px' }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
          <p style={{ color: '#52525b', fontSize: '13px', fontWeight: 600 }}>Connecting...</p>
        </div>
      </div>
    )
  }

  if (!gameState || gameStatus === 'waiting') {
    const host = gameState?.players?.find(p => p.id === gameState?.hostId)
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '320px' }}>
          <div style={{ fontSize: '11px', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '8px', fontWeight: 700 }}>Spectating</div>
          <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'white', marginBottom: '24px', letterSpacing: '-0.5px' }}>
            META<span style={{ color: '#6366f1' }}>QUIZZ</span>
          </h1>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '6px' }}>Game Code</div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: 'white', letterSpacing: '0.3em', marginBottom: '12px' }}>{gameCode}</div>
            <div style={{ fontSize: '13px', color: '#71717a' }}>
              {gameState?.players?.length ?? 0} players in lobby
              {host ? ` · Hosted by ${host.name}` : ''}
            </div>
          </div>
          <div style={{ fontSize: '14px', color: '#6366f1', fontWeight: 600 }}>
            Game starting soon<PulsingDots />
          </div>
          {spectatorCount > 0 && (
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#52525b' }}>
              {spectatorCount} watching
            </div>
          )}
        </div>
      </div>
    )
  }

  if (gameStatus === 'final_results' && gameState?.finalResults) {
    const sorted = [...gameState.finalResults].sort((a, b) => b.score - a.score)
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏆</div>
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'white' }}>Final Results</h2>
            <p style={{ fontSize: '12px', color: '#52525b', marginTop: '4px' }}>{spectatorCount} spectators watched</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sorted.map((result, i) => (
              <div key={result.playerId} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '12px 16px' }}>
                <span style={{ fontSize: '16px', fontWeight: 900, color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#52525b', width: '24px' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} font-black text-white text-sm flex-shrink-0`}>
                  {result.playerName.charAt(0).toUpperCase()}
                </div>
                <span style={{ flex: 1, fontSize: '14px', fontWeight: 700, color: 'white' }}>{result.playerName}</span>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#a5b4fc' }}>{result.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const question = gameState?.currentQuestion
  const players = gameState?.players ?? []
  const leaderboard = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  return (
    <div style={{ minHeight: '100svh', background: bg, padding: '16px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ fontSize: '16px', fontWeight: 900, color: 'white' }}>
            META<span style={{ color: '#6366f1' }}>QUIZZ</span>
            <span style={{ fontSize: '11px', color: '#52525b', fontWeight: 600, marginLeft: '8px' }}>Live</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#71717a', fontWeight: 600 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
            {spectatorCount} watching
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', color: '#71717a', fontWeight: 600, marginBottom: '8px' }}>
              Question {(gameState?.currentQuestionIndex ?? 0) + 1} of {gameState?.questions?.length ?? 0}
            </div>

            {gameStatus === 'question' && (
              <TimerBar timeLimit={timeLimit} questionStartTime={questionStartTime} />
            )}

            {question && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '12px', lineHeight: 1.5 }}>
                  {question.question}
                </div>
                {hasOptions(question) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {question.options.map((opt, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 10px' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '6px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, flexShrink: 0 }}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600 }}>{opt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Player Answers
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {players.map((player, i) => {
                  const answered = playerAnswers[player.id]
                  const grad = AVATAR_COLORS[i % AVATAR_COLORS.length]
                  return (
                    <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br ${grad} font-black text-white text-xs flex-shrink-0`}>
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ flex: 1, fontSize: '12px', fontWeight: 600, color: '#e4e4e7' }}>{player.name}</span>
                      {answered ? (
                        <span style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '99px', border: '1px solid rgba(99,102,241,0.3)' }}>
                          {answered.answer}
                        </span>
                      ) : (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div style={{ width: '160px', flexShrink: 0 }}>
            <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Leaderboard
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {leaderboard.map((player, i) => (
                <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 0', borderBottom: i < leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#52525b', width: '14px' }}>{i + 1}</span>
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} font-black text-white text-xs flex-shrink-0`}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontSize: '11px', fontWeight: 600, color: '#e4e4e7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</span>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#a5b4fc' }}>{(player.score ?? 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
