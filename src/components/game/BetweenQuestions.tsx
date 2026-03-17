'use client'

import { useEffect, useState } from 'react'

interface ScoreEntry {
  playerId: string
  playerName: string
  earned: number
  total: number
  isCorrect: boolean
  rank: number
}

interface BetweenQuestionsProps {
  questionIndex: number
  totalQuestions: number
  correctAnswerText: string
  leaderboard: ScoreEntry[]
  currentPlayerId: string
}

function AnimatedScore({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0)
  useEffect(() => {
    if (value === 0) return
    const duration = 800
    const steps = 30
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + increment, value)
      setDisplayed(Math.round(current))
      if (current >= value) clearInterval(timer)
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])
  return <>{displayed.toLocaleString()}</>
}

function generateHints(
  leaderboard: ScoreEntry[],
  myEntry: ScoreEntry | undefined,
  questionIndex: number,
  totalQuestions: number
): string[] {
  const hints: string[] = []
  const n = leaderboard.length
  const correctCount = leaderboard.filter(p => p.isCorrect).length
  const questionsLeft = totalQuestions - questionIndex - 1

  // ── Personal hints ──
  if (myEntry) {
    if (myEntry.rank === 1 && myEntry.isCorrect)
      hints.push("You're leading and just got it right. Don't get comfortable 👀")
    else if (myEntry.rank === 1 && !myEntry.isCorrect)
      hints.push("You're in the lead... but you just dropped points 😬")
    else if (myEntry.rank === n && myEntry.isCorrect)
      hints.push("You got that one! Keep the momentum going 🔥")
    else if (myEntry.rank === n && !myEntry.isCorrect)
      hints.push("Rough round. The next question is your chance to turn it around 💪")
    else if (myEntry.isCorrect)
      hints.push("Nice answer! Every point matters in this game 🎯")
    else
      hints.push("Missed that one. Stay sharp — it's not over yet ⚡")
  }

  // ── Social hints ──
  if (correctCount === n)
    hints.push("Everyone nailed that one — no one gains an edge 😅")
  else if (correctCount === 0)
    hints.push("Nobody got that one right. Brutal question 🤯")
  else if (correctCount === 1)
    hints.push("Only one player got that right... they know something you don't 🔍")
  else if (correctCount === n - 1)
    hints.push("Almost everyone got it — someone's having a tough time 😬")

  // ── Tension/drama hints ──
  const scores = leaderboard.map(p => p.total)
  const topScore = Math.max(...scores)
  const bottomScore = Math.min(...scores)
  const spread = topScore - bottomScore
  const avg = scores.reduce((a, b) => a + b, 0) / n

  if (spread < avg * 0.15 && n > 2)
    hints.push("The scores are dangerously close right now... 😰")
  else if (spread > avg * 2)
    hints.push("Someone is pulling away from the pack 🏃")

  if (questionsLeft === 1)
    hints.push("Last question coming up — everything can still change 🔥")
  else if (questionsLeft === 2)
    hints.push("Two questions left. The real game starts now 🎲")
  else if (questionsLeft === 0)
    hints.push("That was the last question! Head to the reveal... 🏁")

  // Return max 2, pick from beginning (most relevant)
  return hints.slice(0, 2)
}

export function BetweenQuestions({
  questionIndex,
  totalQuestions,
  correctAnswerText,
  leaderboard,
  currentPlayerId,
}: BetweenQuestionsProps) {
  const [countdown, setCountdown] = useState(4)
  const [visible, setVisible] = useState(false)

  const me = leaderboard.find(p => p.playerId === currentPlayerId)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const hints = generateHints(leaderboard, me, questionIndex, totalQuestions)

  return (
    <>
      <style>{`
        @keyframes slideUpFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.7); }
          60%  { transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div
        style={{
          height: '100svh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at 50% -10%, #13154a 0%, #09090f 60%)',
          padding: '24px 20px',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      >
        {/* Q number header */}
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#6366f1',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}>
            Question {questionIndex + 1} / {totalQuestions}
          </span>
          <div style={{ fontSize: '12px', color: '#52525b', marginTop: '4px', fontWeight: 600 }}>
            Answer: <span style={{ color: '#a1a1aa', fontWeight: 700 }}>{correctAnswerText}</span>
          </div>
        </div>

        {/* Personal result */}
        {me && (
          <div
            style={{
              marginBottom: '24px',
              padding: '16px 32px',
              borderRadius: '20px',
              textAlign: 'center',
              background: me.isCorrect ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${me.isCorrect ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'}`,
              animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '4px' }}>
              {me.isCorrect ? '✅' : '❌'}
            </div>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: me.isCorrect ? '#4ade80' : '#f87171',
              marginBottom: '6px',
            }}>
              {me.isCorrect ? 'Correct!' : 'Wrong answer'}
            </div>
            {me.earned > 0 && (
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  color: '#facc15',
                  textShadow: '0 0 20px rgba(250,204,21,0.5)',
                }}
              >
                +<AnimatedScore value={me.earned} /> pts
              </div>
            )}
          </div>
        )}

        {/* Hints (replace leaderboard) */}
        <div style={{
          width: '100%',
          maxWidth: '440px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginBottom: '28px',
        }}>
          {hints.map((hint, i) => (
            <div key={i} style={{
              padding: '14px 20px',
              borderRadius: '16px',
              background: 'rgba(99,102,241,0.07)',
              border: '1px solid rgba(99,102,241,0.2)',
              fontSize: '13px',
              fontWeight: 600,
              color: '#a1a1aa',
              lineHeight: 1.5,
              animation: `slideUpFadeIn 0.4s ease ${i * 0.12}s both`,
            }}>
              {hint}
            </div>
          ))}
        </div>

        {/* Countdown */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{
            fontSize: '11px',
            color: '#3f3f46',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            Next question in
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '3px solid rgba(99,102,241,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 900,
              color: '#6366f1',
            }}
          >
            {countdown}
          </div>
        </div>
      </div>
    </>
  )
}
