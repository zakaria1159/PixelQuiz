'use client'

import { useState } from 'react'
import { clsx } from 'clsx'

interface AnswerOptionsProps {
  options: string[]
  selectedAnswer?: number | undefined
  correctAnswer?: number
  showResults?: boolean
  onAnswerSelect?: (index: number) => void
  disabled?: boolean
  timeLeft?: number
  fillHeight?: boolean
}

const PALETTE = [
  {
    label: 'A',
    idle:     'bg-[#1a3a8f]/60 border-[#3b6dea] hover:bg-[#1a3a8f]/90 hover:border-[#6b9dff]',
    selected: 'bg-[#2952cc] border-[#6b9dff] shadow-[0_0_30px_rgba(59,130,246,0.5)]',
    badge:    'bg-[#3b6dea]',
    correct:  'bg-[#14532d]/70 border-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,0.3)]',
    wrong:    'bg-[#450a0a]/50 border-[#ef4444]',
    muted:    'bg-white/[0.03] border-white/10',
    checkBg:  'bg-[#22c55e]',
    xBg:      'bg-[#ef4444]',
  },
  {
    label: 'B',
    idle:     'bg-[#7c2d12]/60 border-[#f97316] hover:bg-[#7c2d12]/90 hover:border-[#fdba74]',
    selected: 'bg-[#c2410c] border-[#fdba74] shadow-[0_0_30px_rgba(249,115,22,0.5)]',
    badge:    'bg-[#f97316]',
    correct:  'bg-[#14532d]/70 border-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,0.3)]',
    wrong:    'bg-[#450a0a]/50 border-[#ef4444]',
    muted:    'bg-white/[0.03] border-white/10',
    checkBg:  'bg-[#22c55e]',
    xBg:      'bg-[#ef4444]',
  },
  {
    label: 'C',
    idle:     'bg-[#14532d]/60 border-[#22c55e] hover:bg-[#14532d]/90 hover:border-[#86efac]',
    selected: 'bg-[#15803d] border-[#86efac] shadow-[0_0_30px_rgba(34,197,94,0.5)]',
    badge:    'bg-[#22c55e]',
    correct:  'bg-[#14532d]/70 border-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,0.3)]',
    wrong:    'bg-[#450a0a]/50 border-[#ef4444]',
    muted:    'bg-white/[0.03] border-white/10',
    checkBg:  'bg-[#22c55e]',
    xBg:      'bg-[#ef4444]',
  },
  {
    label: 'D',
    idle:     'bg-[#4a1d96]/60 border-[#a855f7] hover:bg-[#4a1d96]/90 hover:border-[#d8b4fe]',
    selected: 'bg-[#7e22ce] border-[#d8b4fe] shadow-[0_0_30px_rgba(168,85,247,0.5)]',
    badge:    'bg-[#a855f7]',
    correct:  'bg-[#14532d]/70 border-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,0.3)]',
    wrong:    'bg-[#450a0a]/50 border-[#ef4444]',
    muted:    'bg-white/[0.03] border-white/10',
    checkBg:  'bg-[#22c55e]',
    xBg:      'bg-[#ef4444]',
  },
]

const AnswerOptions = ({
  options,
  selectedAnswer,
  correctAnswer,
  showResults = false,
  onAnswerSelect,
  disabled = false,
  timeLeft,
  fillHeight = false,
}: AnswerOptionsProps) => {
  const [flashIndex, setFlashIndex] = useState<number | null>(null)

  const handleSelect = (index: number) => {
    if (disabled || showResults || timeLeft === 0) return
    setFlashIndex(index)
    setTimeout(() => setFlashIndex(null), 300)
    onAnswerSelect?.(index)
  }

  const isDisabled = disabled || showResults || timeLeft === 0

  const getCardClass = (index: number) => {
    const p = PALETTE[index % PALETTE.length]
    if (showResults) {
      if (index === correctAnswer) return p.correct
      if (index === selectedAnswer && index !== correctAnswer) return p.wrong
      return p.muted
    }
    if (selectedAnswer === index) return p.selected
    return p.idle
  }

  const getBadgeClass = (index: number) => {
    const p = PALETTE[index % PALETTE.length]
    if (showResults) {
      if (index === correctAnswer) return p.checkBg
      if (index === selectedAnswer && index !== correctAnswer) return p.xBg
      return 'bg-white/10'
    }
    if (selectedAnswer === index) return p.badge
    return 'bg-white/15'
  }

  // In fillHeight mode, we render bare fragments — the parent grid handles layout
  if (fillHeight) {
    return (
      <>
        {options.map((option, index) => {
          const p = PALETTE[index % PALETTE.length]
          const isSelected = selectedAnswer === index
          const isCorrect = showResults && index === correctAnswer
          const isWrong = showResults && index === selectedAnswer && index !== correctAnswer

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={isDisabled}
              className={clsx(
                'relative group flex items-center gap-3 px-4 rounded-2xl border-2 text-left w-full h-full',
                'transition-all duration-200',
                getCardClass(index),
                isDisabled && !showResults && 'cursor-not-allowed',
                !isSelected && !showResults && !isDisabled && 'cursor-pointer',
              )}
            >
              <div className={clsx(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                'text-base font-black text-white transition-all duration-200',
                getBadgeClass(index),
              )}>
                {isCorrect ? '✓' : isWrong ? '✗' : p.label}
              </div>
              <span className={clsx(
                'text-sm font-semibold leading-snug min-w-0 break-words flex-1',
                showResults && index !== correctAnswer && index !== selectedAnswer
                  ? 'text-white/30'
                  : 'text-white',
              )}>
                {option}
              </span>
              {!showResults && isSelected && (
                <div className="w-2 h-2 rounded-full bg-white/70 flex-shrink-0" />
              )}
            </button>
          )
        })}
      </>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ overflow: 'hidden' }}>
      {options.map((option, index) => {
        const p = PALETTE[index % PALETTE.length]
        const isSelected = selectedAnswer === index
        const isCorrect = showResults && index === correctAnswer
        const isWrong = showResults && index === selectedAnswer && index !== correctAnswer

        return (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={isDisabled}
            className={clsx(
              'relative group flex items-center gap-3 p-4 rounded-2xl border-2 text-left w-full',
              'transition-all duration-200',
              getCardClass(index),
              isDisabled && !showResults && 'cursor-not-allowed',
              !isSelected && !showResults && !isDisabled && 'cursor-pointer',
            )}
          >
            <div className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              'text-base font-black text-white transition-all duration-200',
              getBadgeClass(index),
            )}>
              {isCorrect ? '✓' : isWrong ? '✗' : p.label}
            </div>
            <span className={clsx(
              'text-sm font-semibold leading-snug min-w-0 break-words flex-1',
              showResults && index !== correctAnswer && index !== selectedAnswer
                ? 'text-white/30'
                : 'text-white',
            )}>
              {option}
            </span>
            {!showResults && isSelected && (
              <div className="w-2 h-2 rounded-full bg-white/70 flex-shrink-0" />
            )}
          </button>
        )
      })}
    </div>
  )
}

export default AnswerOptions
