'use client'

import React, { useState, useEffect, useRef } from 'react'
import AnswerOptions from '@/components/game/AnswerOptions'
import RankingOptions from '@/components/game/RankingOptions'
import PixelRevealImage from '@/components/game/PixelRevealImage'
import { MusicPlayer } from '@/components/game/MusicPlayer'
import socketManager from '@/lib/socket'
import {
  Question,
  isImageGuessQuestion,
  isClosestWinsQuestion,
  isSpeedBuzzQuestion,
  isFillBlankQuestion,
  isPixelRevealQuestion,
  isLetterGameQuestion,
  isFlagGuessQuestion,
  isMusicGuessQuestion,
  isAnimalSoundQuestion,
  isClueChainQuestion,
  hasOptions,
  requiresTextInput,
  requiresRanking,
} from '@/types'

interface SharedGameViewProps {
  question: Question
  questionIndex: number
  totalQuestions: number
  timeLimit: number
  questionStartTime: number
  players: any[]
  answeredPlayers: string[]
  currentPlayerId: string
  onAnswerSubmit: (answer: string | number) => void
  onTimeUp: () => void
}

// ─── Circular countdown timer ─────────────────────────────────────────────────
function CircularTimer({ timeLeft, timeLimit }: { timeLeft: number; timeLimit: number }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const progress = timeLimit > 0 ? timeLeft / timeLimit : 0
  const dashOffset = circumference * (1 - progress)

  const isWarning = timeLeft <= 10 && timeLeft > 5
  const isDanger  = timeLeft <= 5 && timeLeft > 0

  const arcColor  = isDanger ? '#ef4444' : isWarning ? '#eab308' : '#6366f1'
  const textColor = isDanger ? '#ef4444' : isWarning ? '#eab308' : 'white'

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={isDanger ? { animation: 'timerPulse 0.6s ease-in-out infinite' } : undefined}
    >
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={radius} fill="none" stroke="#1e1e2e" strokeWidth="6" />
        <circle
          cx="42" cy="42" r={radius}
          fill="none"
          stroke={arcColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 42 42)"
          style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg leading-none" style={{ color: textColor }}>{timeLeft}</span>
        <span className="text-[8px] text-zinc-500 uppercase tracking-widest mt-0.5">sec</span>
      </div>
    </div>
  )
}

// ─── Question type metadata ───────────────────────────────────────────────────
const TYPE_META: Record<string, { label: string; color: string }> = {
  multiple_choice: { label: 'Multiple Choice', color: 'bg-blue-600/30 text-blue-300 border-blue-500/40' },
  true_false:      { label: 'True or False',   color: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40' },
  free_text:       { label: 'Type Answer',     color: 'bg-violet-600/30 text-violet-300 border-violet-500/40' },
  image_guess:     { label: 'Guess the Image', color: 'bg-pink-600/30 text-pink-300 border-pink-500/40' },
  ranking:         { label: 'Rank Items',      color: 'bg-orange-600/30 text-orange-300 border-orange-500/40' },
  closest_wins:    { label: 'Closest Wins',    color: 'bg-yellow-600/30 text-yellow-300 border-yellow-500/40' },
  speed_buzz:      { label: 'Speed Buzz',      color: 'bg-red-600/30 text-red-300 border-red-500/40' },
  fill_blank:      { label: 'Fill the Blank',  color: 'bg-cyan-600/30 text-cyan-300 border-cyan-500/40' },
  pixel_reveal:    { label: 'Pixel Reveal',    color: 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' },
  letter_game:     { label: 'Letter Game',     color: 'bg-teal-600/30 text-teal-300 border-teal-500/40' },
  flag_guess:      { label: 'Flag Quiz',        color: 'bg-sky-600/30 text-sky-300 border-sky-500/40' },
  music_guess:     { label: 'Music Round',      color: 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' },
  animal_sound:    { label: 'Animal Sound',     color: 'bg-green-600/30 text-green-300 border-green-500/40' },
  clue_chain:      { label: 'Clue Chain',       color: 'bg-amber-600/30 text-amber-300 border-amber-500/40' },
}

export function SharedGameView({
  question,
  questionIndex,
  totalQuestions,
  timeLimit,
  questionStartTime,
  players,
  answeredPlayers,
  currentPlayerId,
  onAnswerSubmit,
  onTimeUp,
}: SharedGameViewProps) {
  const [answerText,        setAnswerText]        = useState('')
  const [flagAnswer,        setFlagAnswer]        = useState('')
  const [numberAnswer,      setNumberAnswer]      = useState('')
  const [fillBlankAnswer,   setFillBlankAnswer]   = useState('')
  const [pixelRevealAnswer, setPixelRevealAnswer] = useState('')
  const [letterGameAnswers, setLetterGameAnswers] = useState<string[]>([])
  const [selectedOption,    setSelectedOption]    = useState<number | undefined>(undefined)
  const [selectedOrder,     setSelectedOrder]     = useState<number[] | undefined>(undefined)
  const [hasAnswered,       setHasAnswered]       = useState(false)
  const [submitPulse,       setSubmitPulse]       = useState(false)
  const [speedBuzzRank,     setSpeedBuzzRank]     = useState<number | null>(null)
  const [answerFeed,        setAnswerFeed]        = useState<{ key: number; name: string }[]>([])

  const prevAnsweredRef = useRef<string[]>([])
  const onTimeUpRef     = useRef(onTimeUp)
  const timeUpFiredRef  = useRef(false)

  useEffect(() => { onTimeUpRef.current = onTimeUp }, [onTimeUp])

  // Reset on new question
  useEffect(() => {
    setAnswerText('')
    setFlagAnswer('')
    setNumberAnswer('')
    setFillBlankAnswer('')
    setPixelRevealAnswer('')
    setLetterGameAnswers(isLetterGameQuestion(question) ? Array(question.categories.length).fill('') : [])
    setSelectedOption(undefined)
    setSelectedOrder(undefined)
    setHasAnswered(false)
    setSpeedBuzzRank(null)
    timeUpFiredRef.current = false
    prevAnsweredRef.current = []
    setAnswerFeed([])
  }, [questionIndex])

  // Speed-buzz rank
  useEffect(() => {
    const socket = socketManager.getSocket()
    if (!socket) return
    const handler = (data: { rank: number; questionIndex: number }) => {
      if (data.questionIndex === questionIndex) setSpeedBuzzRank(data.rank)
    }
    socket.on('speed-buzz-rank', handler)
    return () => { socket.off('speed-buzz-rank', handler) }
  }, [questionIndex])

  // Answer feed toasts
  useEffect(() => {
    const prev = prevAnsweredRef.current
    const newIds = answeredPlayers.filter(id => !prev.includes(id))
    if (newIds.length > 0) {
      const entries = newIds.map(id => {
        const player = players.find(p => p.id === id)
        return { key: Date.now() + Math.random(), name: player?.name ?? '?' }
      })
      setAnswerFeed(f => [...f, ...entries].slice(-5))
      const t = setTimeout(() => {
        setAnswerFeed(f => f.filter(e => !entries.find(n => n.key === e.key)))
      }, 2500)
      return () => clearTimeout(t)
    }
    prevAnsweredRef.current = answeredPlayers
  }, [answeredPlayers, players])

  // Wall-clock timer
  const getTimeLeft = () => Math.max(0, timeLimit - Math.floor((Date.now() - questionStartTime) / 1000))
  const [timeLeft, setTimeLeft] = useState(getTimeLeft)

  useEffect(() => {
    timeUpFiredRef.current = false
    const interval = setInterval(() => {
      const remaining = getTimeLeft()
      setTimeLeft(remaining)
      if (remaining <= 0 && !timeUpFiredRef.current) {
        timeUpFiredRef.current = true
        onTimeUpRef.current()
      }
    }, 250)
    return () => clearInterval(interval)
  }, [questionIndex, questionStartTime, timeLimit])

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (hasAnswered) return
    let answer: string | number | number[]

    if (hasOptions(question)) {
      if (selectedOption === undefined) return
      answer = selectedOption
    } else if (requiresTextInput(question)) {
      if (!answerText.trim()) return
      answer = answerText.trim()
    } else if (requiresRanking(question)) {
      const order = selectedOrder ?? Array.from({ length: question.items.length }, (_, i) => i)
      answer = order.join(',')
    } else if (isClosestWinsQuestion(question)) {
      if (!numberAnswer.trim()) return
      answer = numberAnswer.trim()
    } else if (isFillBlankQuestion(question)) {
      if (!fillBlankAnswer.trim()) return
      answer = fillBlankAnswer.trim()
    } else if (isPixelRevealQuestion(question)) {
      if (!pixelRevealAnswer.trim()) return
      answer = pixelRevealAnswer.trim()
    } else if (isLetterGameQuestion(question)) {
      if (!letterGameAnswers.some(a => a.trim().length > 0)) return
      answer = letterGameAnswers.map(a => a.trim()).join(',')
    } else if (isFlagGuessQuestion(question)) {
      if (!flagAnswer.trim()) return
      answer = flagAnswer.trim()
    } else {
      return
    }

    setHasAnswered(true)
    setSubmitPulse(true)
    setTimeout(() => setSubmitPulse(false), 400)
    onAnswerSubmit(answer)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !hasAnswered) handleSubmit()
  }

  // ─── Derived ──────────────────────────────────────────────────────────────
  const answeredCount = answeredPlayers.length
  const totalPlayers  = players.length
  const allAnswered   = totalPlayers > 0 && answeredCount >= totalPlayers
  const isDanger        = timeLeft <= 5 && timeLeft > 0
  const pixelSize       = hasAnswered ? 1 : Math.max(1, Math.round(24 * Math.sqrt(timeLeft / timeLimit)))
  const allowedDuration = isAnimalSoundQuestion(question)
    ? 30  // animal sounds play in full — no progressive reveal
    : isMusicGuessQuestion(question)
    ? (hasAnswered ? 30 : Math.min(30, 5 + Math.round((1 - timeLeft / timeLimit) * 25)))
    : 0

  const canSubmit =
    hasAnswered || timeLeft === 0      ? false :
    hasOptions(question)               ? selectedOption !== undefined :
    requiresTextInput(question)        ? answerText.trim().length > 0 :
    requiresRanking(question)          ? true :
    isClosestWinsQuestion(question)    ? numberAnswer.trim().length > 0 && !isNaN(Number(numberAnswer)) :
    isFillBlankQuestion(question)      ? fillBlankAnswer.trim().length > 0 :
    isPixelRevealQuestion(question)    ? pixelRevealAnswer.trim().length > 0 :
    isLetterGameQuestion(question)     ? letterGameAnswers.some(a => a.trim().length > 0) :
    isFlagGuessQuestion(question)      ? flagAnswer.trim().length > 0 : false

  const meta         = TYPE_META[question.type] ?? { label: 'Question', color: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/40' }
  const sortedPlayers = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const myScore      = sortedPlayers.find(p => p.id === currentPlayerId)?.score ?? 0

  const inputCls = [
    'w-full bg-white/5 border border-white/10 text-white placeholder-zinc-500',
    'rounded-xl px-4 py-4 text-base font-medium',
    'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
    'transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' ')

  // ─── Layout: h-screen, no scroll ever ────────────────────────────────────
  return (
    <div
      style={{
        height: '100svh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'radial-gradient(ellipse at 30% 0%, #13154a 0%, #09090f 55%)',
        position: 'relative',
      }}
    >
      {/* Danger vignette */}
      {isDanger && (
        <div
          className="pointer-events-none absolute inset-0 z-50 animate-pulse"
          style={{ boxShadow: 'inset 0 0 140px 50px rgba(239,68,68,0.28)' }}
        />
      )}

      {/* Answer feed toasts */}
      <div className="fixed top-3 right-3 z-40 flex flex-col gap-1.5 items-end pointer-events-none">
        {answerFeed.map(entry => (
          <div
            key={entry.key}
            className="glass text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-xl"
            style={{ animation: 'slideInRight 0.25s ease both' }}
          >
            ✓ {entry.name}
          </div>
        ))}
      </div>

      {/* ── TOP BAR ────────────────────────────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.2)',
        }}
        key={`bar-${questionIndex}`}
      >
        {/* Logo mark */}
        <div
          className="font-display flex-shrink-0"
          style={{ fontSize: '10px', letterSpacing: '0.05em', color: '#6366f1', lineHeight: 1 }}
        >
          PX
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

        {/* Question number — hero element */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <div
            style={{
              background: 'linear-gradient(135deg,#4f46e5,#818cf8)',
              borderRadius: '10px',
              padding: '4px 12px',
              display: 'flex',
              alignItems: 'baseline',
              gap: '3px',
            }}
          >
            <span style={{ fontSize: '18px', fontWeight: 900, color: 'white', lineHeight: 1 }}>{questionIndex + 1}</span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>/{totalQuestions}</span>
          </div>
        </div>

        {/* Type badge */}
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${meta.color}`}>
          {meta.label}
        </span>

        {/* Difficulty badge */}
        <span className={`hidden sm:inline text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex-shrink-0 ${
          question.difficulty === 'easy'   ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800' :
          question.difficulty === 'medium' ? 'text-yellow-400 bg-yellow-950/60 border border-yellow-800' :
                                             'text-red-400 bg-red-950/60 border border-red-800'
        }`}>
          {question.difficulty}
        </span>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Score */}
        <div
          className="flex-shrink-0"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '10px',
            padding: '5px 12px',
          }}
        >
          <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>pts</span>
          <span
            className="font-display tabular-nums"
            style={{ fontSize: '13px', color: 'white', textShadow: '0 0 20px rgba(99,102,241,0.7)' }}
          >
            {myScore.toLocaleString()}
          </span>
        </div>

        {/* Answered dots */}
        <div
          className="hidden sm:flex flex-shrink-0 items-center gap-1.5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            padding: '5px 10px',
          }}
        >
          {players.slice(0, 8).map(p => (
            <div
              key={p.id}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: answeredPlayers.includes(p.id) ? '#34d399' : 'rgba(255,255,255,0.15)',
                boxShadow: answeredPlayers.includes(p.id) ? '0 0 6px rgba(52,211,153,0.8)' : 'none',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
          {totalPlayers > 8 && (
            <span style={{ fontSize: '10px', color: '#52525b', fontWeight: 600 }}>+{totalPlayers - 8}</span>
          )}
        </div>

        {/* Timer */}
        {allAnswered ? (
          <div className="text-sm font-bold text-emerald-400 animate-pulse flex-shrink-0">✓ All in!</div>
        ) : (
          <CircularTimer timeLeft={timeLeft} timeLimit={timeLimit} />
        )}
      </div>

      {/* ── PROGRESS BAR ───────────────────────────────────────────────────── */}
      <div
        style={{ flexShrink: 0, height: '3px', margin: '0 20px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: '99px',
            transition: 'width 0.5s linear',
            width: `${(timeLeft / timeLimit) * 100}%`,
            background: isDanger
              ? 'linear-gradient(90deg,#ef4444,#f97316)'
              : timeLeft <= 10
              ? 'linear-gradient(90deg,#eab308,#f97316)'
              : 'linear-gradient(90deg,#6366f1,#818cf8)',
          }}
        />
      </div>

      {/* ── CARD — fills ALL remaining space ───────────────────────────────── */}
      <div
        style={{ flex: 1, minHeight: 0, padding: '0 20px 16px' }}
        key={`card-${questionIndex}`}
      >
        <div
          className="glass"
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideUpFadeIn 0.35s ease both',
          }}
        >
          {/* ── QUESTION TEXT ─────────────────────────────────────────────── */}
          <div
            style={{
              flexShrink: 0,
              padding: '20px 28px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            {isImageGuessQuestion(question) && question.imageUrl && (
              <div className="text-center mb-3">
                <img
                  src={question.imageUrl}
                  alt="Question image"
                  style={{ maxHeight: '140px', maxWidth: '100%', margin: '0 auto', borderRadius: '12px' }}
                />
              </div>
            )}

            {isFillBlankQuestion(question) ? (
              <p className="text-xl font-bold text-white text-center leading-relaxed">
                {question.question.split('___').map((part, i, arr) => (
                  <React.Fragment key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span className={`inline-block min-w-[5rem] border-b-4 mx-2 px-2 font-black text-center align-bottom ${
                        hasAnswered ? 'border-emerald-400 text-emerald-300' : 'border-indigo-400 text-indigo-300'
                      }`}>
                        {fillBlankAnswer.trim() || '\u00A0\u00A0\u00A0\u00A0'}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </p>
            ) : isPixelRevealQuestion(question) ? (
              <p className="text-base text-zinc-300 text-center">{question.question}</p>
            ) : (
              <h2 className="text-xl lg:text-2xl font-bold text-white text-center leading-snug">
                {question.question}
              </h2>
            )}
          </div>

          {/* ── ANSWER ZONE — fills remaining space, NO scroll ────────────── */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: '16px 28px',
              overflow: 'hidden',
            }}
          >
            {/* Multiple choice / True-False: fill height with equal-height buttons */}
            {hasOptions(question) && (
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  maxHeight: `${Math.ceil(question.options.length / 2) * 140}px`,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gridTemplateRows: `repeat(${Math.ceil(question.options.length / 2)}, 1fr)`,
                  gap: '10px',
                }}
              >
                <AnswerOptions
                  options={question.options}
                  selectedAnswer={selectedOption}
                  onAnswerSelect={(i) => { if (!hasAnswered && timeLeft > 0) setSelectedOption(i) }}
                  disabled={hasAnswered || timeLeft === 0}
                  timeLeft={timeLeft}
                  fillHeight
                />
              </div>
            )}

            {/* Text input types (music_guess, animal_sound, clue_chain have their own blocks) */}
            {requiresTextInput(question) && !isMusicGuessQuestion(question) && !isAnimalSoundQuestion(question) && !isClueChainQuestion(question) && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingTop: '8px', gap: '8px' }}>
                <input
                  type="text"
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={hasAnswered || timeLeft === 0}
                  placeholder={isImageGuessQuestion(question) ? 'What do you see?' : 'Type your answer…'}
                  className={inputCls}
                  autoFocus
                />
                <p className="text-xs text-zinc-600">💡 Not case sensitive · Partial answers accepted</p>
              </div>
            )}

            {/* Ranking */}
            {requiresRanking(question) && (
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <RankingOptions
                  items={question.items}
                  selectedOrder={selectedOrder}
                  onOrderChange={(o) => { if (!hasAnswered && timeLeft > 0) setSelectedOrder(o) }}
                  disabled={hasAnswered || timeLeft === 0}
                  timeLeft={timeLeft}
                />
              </div>
            )}

            {/* Closest wins */}
            {isClosestWinsQuestion(question) && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingTop: '8px', gap: '8px' }}>
                <label className="text-sm font-semibold text-zinc-400">
                  Your guess{question.unit ? ` (${question.unit})` : ''}
                </label>
                <input
                  type="number"
                  value={numberAnswer}
                  onChange={e => setNumberAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={hasAnswered || timeLeft === 0}
                  placeholder="Enter a number…"
                  className={inputCls}
                  autoFocus
                />
                <p className="text-xs text-zinc-600">🎯 Closest number wins</p>
              </div>
            )}

            {/* Fill in the blank */}
            {isFillBlankQuestion(question) && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingTop: '8px', gap: '8px' }}>
                <input
                  type="text"
                  value={fillBlankAnswer}
                  onChange={e => setFillBlankAnswer(e.target.value.replace(/\s+/g, ''))}
                  onKeyDown={handleKeyDown}
                  disabled={hasAnswered || timeLeft === 0}
                  placeholder="The missing word…"
                  className={inputCls}
                  autoFocus
                  autoComplete="off"
                />
                <p className="text-xs text-zinc-600">✏️ One word only</p>
              </div>
            )}

            {/* Pixel reveal */}
            {isPixelRevealQuestion(question) && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
                <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <div className="relative" style={{ maxHeight: '100%' }}>
                    <PixelRevealImage
                      src={question.imageUrl}
                      pixelSize={pixelSize}
                      className="rounded-xl"
                    />
                    {!hasAnswered && (
                      <div className="absolute top-2 right-2 glass text-xs text-white px-2 py-1 rounded-lg">
                        {pixelSize > 1 ? `${Math.round((1 - pixelSize / 24) * 100)}% revealed` : 'Fully revealed'}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <input
                    type="text"
                    value={pixelRevealAnswer}
                    onChange={e => setPixelRevealAnswer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={hasAnswered || timeLeft === 0}
                    placeholder="What is this?"
                    className={inputCls}
                    autoComplete="off"
                  />
                </div>
              </div>
            )}

            {/* Letter game */}
            {isLetterGameQuestion(question) && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}>
                <div className="text-center" style={{ flexShrink: 0 }}>
                  <span className="text-5xl font-black text-yellow-400 leading-none">{question.letter}</span>
                  <p className="text-xs text-zinc-500 mt-1">
                    One word per category starting with <strong className="text-yellow-300">{question.letter}</strong>
                  </p>
                </div>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {question.categories.map((cat, i) => (
                      <div key={cat}>
                        <label className="block text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wide">{cat}</label>
                        <input
                          type="text"
                          value={letterGameAnswers[i] ?? ''}
                          onChange={e => {
                            const updated = [...letterGameAnswers]
                            updated[i] = e.target.value
                            setLetterGameAnswers(updated)
                          }}
                          disabled={hasAnswered || timeLeft === 0}
                          placeholder={`${question.letter}…`}
                          className={inputCls}
                          autoComplete="off"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {/* Music guess */}
            {isMusicGuessQuestion(question) && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
                <MusicPlayer
                  deezerQuery={question.deezerQuery}
                  allowedDuration={allowedDuration}
                  hasAnswered={hasAnswered}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input
                    type="text"
                    value={answerText}
                    onChange={e => setAnswerText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={hasAnswered || timeLeft === 0}
                    placeholder="Type the song title..."
                    className={inputCls}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <p className="text-xs text-zinc-600">🎵 Song title = full points · artist name = ½ points · typos forgiven</p>
                </div>
              </div>
            )}

            {/* Clue chain */}
            {isClueChainQuestion(question) && (() => {
              const totalClues = question.clues.length
              const cluesVisible = hasAnswered || timeLeft === 0
                ? totalClues
                : Math.min(totalClues, Math.floor((1 - timeLeft / timeLimit) * totalClues) + 1)
              const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th']
              return (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}>
                  {/* Hint progress */}
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {question.clues.map((_, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: '4px',
                          borderRadius: '99px',
                          background: i < cluesVisible
                            ? `hsl(${40 + i * 20}, 90%, 60%)`
                            : 'rgba(255,255,255,0.08)',
                          transition: 'background 0.4s ease',
                        }}
                      />
                    ))}
                    <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 600, flexShrink: 0 }}>
                      {cluesVisible}/{totalClues} clues
                    </span>
                  </div>

                  {/* Clues list */}
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {question.clues.map((clue, i) => {
                      const revealed = i < cluesVisible
                      const isJustRevealed = i === cluesVisible - 1 && !hasAnswered && cluesVisible > 0
                      return (
                        <div
                          key={i}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '14px',
                            background: revealed ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${revealed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                            animation: isJustRevealed ? 'slideUpFadeIn 0.4s ease both' : undefined,
                            transition: 'background 0.3s ease, border-color 0.3s ease',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              color: revealed ? `hsl(${40 + i * 20}, 80%, 65%)` : '#3f3f46',
                              paddingTop: '2px',
                              flexShrink: 0,
                              minWidth: '28px',
                            }}
                          >
                            {ORDINALS[i] ?? `#${i + 1}`}
                          </span>
                          <span
                            style={{
                              fontSize: '15px',
                              fontWeight: 500,
                              color: revealed ? 'white' : '#27272a',
                              lineHeight: 1.45,
                            }}
                          >
                            {revealed ? clue : '• • • • • •'}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Text input */}
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                      type="text"
                      value={answerText}
                      onChange={e => setAnswerText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={hasAnswered || timeLeft === 0}
                      placeholder="Your answer…"
                      className={inputCls}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <p className="text-xs text-zinc-600">🔍 Answer early for more points · minor typos forgiven</p>
                  </div>
                </div>
              )
            })()}

            {/* Animal sound */}
            {isAnimalSoundQuestion(question) && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
                <MusicPlayer
                  audioUrl={question.audioUrl}
                  allowedDuration={30}
                  hasAnswered={hasAnswered}
                  label="🐾 ANIMAL SOUND"
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input
                    type="text"
                    value={answerText}
                    onChange={e => setAnswerText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={hasAnswered || timeLeft === 0}
                    placeholder="Which animal makes this sound?"
                    className={inputCls}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <p className="text-xs text-zinc-600">🐾 Type the animal name · minor typos are forgiven</p>
                </div>
              </div>
            )}

            {/* Flag guess */}
            {isFlagGuessQuestion(question) && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
                {/* Flag image */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
                    maxWidth: '420px',
                    width: '100%',
                  }}>
                    <img
                      src={`https://flagcdn.com/w640/${question.countryCode.toLowerCase()}.png`}
                      srcSet={`https://flagcdn.com/w1280/${question.countryCode.toLowerCase()}.png 2x`}
                      alt="Country flag"
                      style={{ width: '100%', display: 'block', maxHeight: '240px', objectFit: 'cover' }}
                      draggable={false}
                    />
                  </div>
                </div>
                {/* Text input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input
                    type="text"
                    value={flagAnswer}
                    onChange={e => setFlagAnswer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={hasAnswered || timeLeft === 0}
                    placeholder="Type the country name…"
                    className={inputCls}
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <p className="text-xs text-zinc-600">🌍 Type the full country name — minor typos are forgiven</p>
                </div>
              </div>
            )}

          </div>

          {/* ── SUBMIT BUTTON — always pinned at bottom ────────────────────── */}
          <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full py-4 rounded-2xl font-black text-base transition-all duration-200 ${
                submitPulse ? 'scale-[1.03]' : ''
              } ${
                hasAnswered
                  ? 'bg-emerald-600/80 border border-emerald-500/50 text-white cursor-default'
                  : canSubmit
                  ? 'text-white hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-white/5 border border-white/10 text-zinc-600 cursor-not-allowed'
              }`}
              style={
                hasAnswered ? undefined :
                canSubmit ? {
                  background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                  boxShadow: '0 0 30px rgba(99,102,241,0.35)',
                } : undefined
              }
            >
              {hasAnswered ? '✓ Locked In!' : 'Submit Answer'}
            </button>
            {isSpeedBuzzQuestion(question) && hasAnswered && (
              <div className="text-center text-sm font-bold mt-2">
                {speedBuzzRank === null
                  ? <span className="text-zinc-500">Waiting for result…</span>
                  : speedBuzzRank === 1 ? <span className="text-yellow-400">🥇 1st to answer!</span>
                  : speedBuzzRank === 2 ? <span className="text-zinc-300">🥈 2nd correct</span>
                  : speedBuzzRank === 3 ? <span className="text-orange-400">🥉 3rd correct</span>
                  : <span className="text-zinc-400">#{speedBuzzRank} correct</span>
                }
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
