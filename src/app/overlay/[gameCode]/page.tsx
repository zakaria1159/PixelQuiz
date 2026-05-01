'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSpectator } from '@/hooks/useSpectator'
import { hasOptions, isImageGuessQuestion, isPixelRevealQuestion, isFlagGuessQuestion, isMusicGuessQuestion, isAnimalSoundQuestion } from '@/types/question'
import { MusicPlayer } from '@/components/game/MusicPlayer'

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

const BG = 'radial-gradient(ellipse at 50% -10%, #13154a 0%, #0f0f1a 50%, #09090f 100%)'

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
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Time</span>
        <span style={{ fontSize: '48px', fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{timeLeft}</span>
      </div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '6px', width: `${pct}%`, background: color, borderRadius: '99px', transition: 'width 0.25s linear, background 0.5s' }} />
      </div>
    </div>
  )
}

export default function OverlayPage() {
  const params = useParams()
  const gameCode = params.gameCode as string
  const {
    gameState,
    gameStatus,
    spectatorCount,
    correctAnswerText,
    timeLimit,
    questionStartTime,
    isConnected,
    error,
  } = useSpectator(gameCode)

  // Connecting
  if (!isConnected || error) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center' }}>
          {error ? (
            <>
              <div style={{ fontSize: '64px', marginBottom: '24px' }}>🚫</div>
              <p style={{ color: '#71717a', fontSize: '20px', fontWeight: 700 }}>{error}</p>
            </>
          ) : (
            <>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '4px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
              <p style={{ color: '#52525b', fontSize: '18px', fontWeight: 700 }}>Connecting...</p>
            </>
          )}
        </div>
      </div>
    )
  }

  // Lobby / waiting
  if (!gameState || gameStatus === 'waiting') {
    const host = gameState?.players?.find(p => p.id === gameState?.hostId)
    return (
      <div style={{ width: '100vw', height: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '72px', fontWeight: 900, color: 'white', letterSpacing: '-2px', marginBottom: '16px' }}>
            META<span style={{ color: '#6366f1' }}>QUIZZ</span>
          </h1>
          <div style={{ fontSize: '24px', color: '#52525b', fontWeight: 700, marginBottom: '48px' }}>
            {gameState?.players?.length ?? 0} players in lobby{host ? ` · hosted by ${host.name}` : ''}
          </div>
          <div style={{ fontSize: '20px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '16px' }}>Join the game</div>
          <div style={{ fontSize: '96px', fontWeight: 900, color: 'white', letterSpacing: '0.3em', textShadow: '0 0 80px rgba(99,102,241,0.6)' }}>{gameCode}</div>
          {spectatorCount > 0 && (
            <div style={{ marginTop: '32px', fontSize: '18px', color: '#52525b' }}>{spectatorCount} watching</div>
          )}
        </div>
      </div>
    )
  }

  // Final results
  if (gameStatus === 'final_results' && gameState?.finalResults) {
    const sorted = [...gameState.finalResults].sort((a, b) => b.score - a.score)
    const top3 = sorted.slice(0, 3)
    const rest = sorted.slice(3)
    const medals = ['🥇', '🥈', '🥉']
    const podiumSizes = ['96px', '72px', '64px']

    return (
      <div style={{ width: '100vw', height: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '48px' }}>
        <div style={{ fontSize: '24px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '48px' }}>Final Results</div>
        <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-end', marginBottom: '48px' }}>
          {top3.map((r, i) => (
            <div key={r.playerId} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: podiumSizes[i], lineHeight: 1, marginBottom: '12px' }}>{medals[i]}</div>
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} font-black text-white text-3xl mx-auto mb-3`}>
                {r.playerName.charAt(0).toUpperCase()}
              </div>
              <div style={{ fontSize: i === 0 ? '28px' : '22px', fontWeight: 900, color: 'white', marginBottom: '6px' }}>{r.playerName}</div>
              <div style={{ fontSize: i === 0 ? '24px' : '20px', fontWeight: 900, color: '#a5b4fc' }}>{r.score.toLocaleString()}</div>
            </div>
          ))}
        </div>
        {rest.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '400px' }}>
            {rest.map((r, i) => (
              <div key={r.playerId} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '12px 20px' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#52525b', width: '28px' }}>{i + 4}</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${AVATAR_COLORS[(i + 3) % AVATAR_COLORS.length]} font-black text-white text-base flex-shrink-0`}>
                  {r.playerName.charAt(0).toUpperCase()}
                </div>
                <span style={{ flex: 1, fontSize: '18px', fontWeight: 700, color: 'white' }}>{r.playerName}</span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#a5b4fc' }}>{r.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Active question / results
  const question = gameState?.currentQuestion
  const players = gameState?.players ?? []
  const leaderboard = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5)
  const isResults = gameStatus === 'question_results'

  return (
    <div style={{ width: '100vw', height: '100vh', background: BG, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ fontSize: '28px', fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
          META<span style={{ color: '#6366f1' }}>QUIZZ</span>
          <span style={{ fontSize: '13px', color: '#52525b', fontWeight: 600, marginLeft: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live</span>
        </div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#71717a' }}>
          Question {(gameState?.currentQuestionIndex ?? 0) + 1} / {gameState?.questions?.length ?? 0}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', color: '#71717a', fontWeight: 700 }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.7)' }} />
          {spectatorCount} watching
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', gap: '0', minHeight: 0 }}>
        {/* Center: question */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 60px', gap: '32px' }}>
          {!isResults && gameStatus === 'question' && question && (
            <div style={{ width: '100%', maxWidth: '700px' }}>
              <TimerBar timeLimit={timeLimit} questionStartTime={questionStartTime} />
            </div>
          )}

          {question && isFlagGuessQuestion(question) && (
            <img
              src={`https://flagcdn.com/w640/${question.countryCode.toLowerCase()}.png`}
              alt="Flag"
              style={{ maxHeight: '200px', objectFit: 'contain', borderRadius: '12px' }}
            />
          )}
          {question && (isImageGuessQuestion(question) || isPixelRevealQuestion(question)) && question.imageUrl && (
            <img
              src={question.imageUrl}
              alt="Question"
              style={{ maxHeight: '240px', objectFit: 'contain', borderRadius: '12px' }}
            />
          )}
          {question && (isMusicGuessQuestion(question) || isAnimalSoundQuestion(question)) && (
            <MusicPlayer
              deezerQuery={isMusicGuessQuestion(question) ? question.deezerQuery : undefined}
              audioUrl={isAnimalSoundQuestion(question) ? question.audioUrl : undefined}
              allowedDuration={timeLimit}
              hasAnswered={false}
            />
          )}

          {question && (
            <div style={{ fontSize: '36px', fontWeight: 800, color: 'white', textAlign: 'center', lineHeight: 1.4, maxWidth: '800px' }}>
              {question.question}
            </div>
          )}

          {question && hasOptions(question) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', maxWidth: '800px' }}>
              {question.options.map((opt, i) => {
                const isCorrect = isResults && correctAnswerText !== null && opt === correctAnswerText
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '16px',
                      background: isCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `2px solid ${isCorrect ? 'rgba(34,197,94,0.6)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '16px', padding: '16px 20px',
                      transition: 'background 0.4s, border-color 0.4s',
                      transform: isCorrect ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                      background: isCorrect ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.2)',
                      color: isCorrect ? '#4ade80' : '#818cf8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', fontWeight: 800,
                    }}>
                      {isCorrect ? '✓' : String.fromCharCode(65 + i)}
                    </div>
                    <span style={{ fontSize: '22px', color: isCorrect ? '#86efac' : '#e4e4e7', fontWeight: isCorrect ? 800 : 600 }}>{opt}</span>
                  </div>
                )
              })}
            </div>
          )}

          {question && !hasOptions(question) && isResults && correctAnswerText && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.5)', borderRadius: '16px', padding: '20px 28px' }}>
              <span style={{ fontSize: '28px' }}>✓</span>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#86efac' }}>{correctAnswerText}</span>
            </div>
          )}
        </div>

        {/* Right sidebar: leaderboard + join code */}
        <div style={{ width: '300px', flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', padding: '32px 24px', gap: '24px' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '16px' }}>Leaderboard</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {leaderboard.map((player, i) => (
                <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: i === 0 ? '#f59e0b' : '#52525b', width: '24px' }}>
                    {i === 0 ? '🥇' : i + 1}
                  </span>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} font-black text-white text-base flex-shrink-0`}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontSize: '16px', fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</span>
                  <span style={{ fontSize: '16px', fontWeight: 900, color: '#a5b4fc' }}>{(player.score ?? 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 'auto', textAlign: 'center', padding: '20px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '16px' }}>
            <div style={{ fontSize: '12px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px' }}>Join the game</div>
            <div style={{ fontSize: '40px', fontWeight: 900, color: 'white', letterSpacing: '0.25em' }}>{gameCode}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
