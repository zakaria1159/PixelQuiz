'use client'
import { useState, useEffect } from 'react'

export interface QuizSettings {
  categories: string[]
  types: string[]
  questionCount: number
}

const CATEGORIES = [
  { id: 'music',       label: 'Music',       emoji: '🎵' },
  { id: 'geography',   label: 'Geography',   emoji: '🌍' },
  { id: 'sports',      label: 'Sports',      emoji: '⚽' },
  { id: 'movies',      label: 'Movies',      emoji: '🎬' },
  { id: 'science',     label: 'Science',     emoji: '🔬' },
  { id: 'pop_culture', label: 'Pop Culture', emoji: '✨' },
  { id: 'gaming',      label: 'Gaming',      emoji: '🎮' },
  { id: 'history',     label: 'History',     emoji: '📜' },
  { id: 'streaming',   label: 'Streaming',   emoji: '📺' },
]

const THEMED_CATEGORIES = [
  { id: 'harry_potter', label: 'Harry Potter', emoji: '🧙' },
]

const QUESTION_TYPES = [
  { id: 'multiple_choice', label: 'Multiple Choice', emoji: '🔤' },
  { id: 'true_false',      label: 'True / False',    emoji: '✅' },
  { id: 'free_text',       label: 'Type Answer',     emoji: '✏️' },
  { id: 'fill_blank',      label: 'Fill the Blank',  emoji: '___' },
  { id: 'ranking',         label: 'Ranking',         emoji: '📊' },
  { id: 'closest_wins',    label: 'Closest Wins',    emoji: '🎯' },
  { id: 'speed_buzz',      label: 'Speed Buzz',      emoji: '⚡' },
  { id: 'flag_guess',      label: 'Flag Quiz',       emoji: '🚩' },
  { id: 'image_guess',     label: 'Image Guess',     emoji: '🖼️' },
  { id: 'pixel_reveal',    label: 'Pixel Reveal',    emoji: '🔍' },
  { id: 'music_guess',     label: 'Music Round',     emoji: '🎵' },
  { id: 'animal_sound',    label: 'Animal Sound',    emoji: '🐾' },
  { id: 'clue_chain',      label: 'Clue Chain',      emoji: '🔗' },
  { id: 'letter_game',     label: 'Letter Game',     emoji: '🅰️' },
]

const QUESTION_COUNTS = [5, 10, 15, 20]

interface QuizSettingsPanelProps {
  onChange: (settings: QuizSettings) => void
}

// Reusable toggle grid
function ToggleGrid({
  items,
  selected,
  onToggle,
  onSelectAll,
  accentColor = 'rgba(99,102,241',
}: {
  items: { id: string; label: string; emoji: string }[]
  selected: string[]
  onToggle: (id: string) => void
  onSelectAll: () => void
  accentColor?: string
}) {
  const allSelected = selected.length === items.length
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
        {items.map(item => {
          const active = selected.includes(item.id)
          return (
            <button
              key={item.id}
              onClick={() => onToggle(item.id)}
              style={{
                padding: '10px 6px 8px',
                borderRadius: '12px',
                border: active
                  ? `1.5px solid ${accentColor},0.6)`
                  : '1.5px solid rgba(255,255,255,0.07)',
                background: active
                  ? `${accentColor},0.18)`
                  : 'rgba(255,255,255,0.03)',
                color: active ? '#c7d2fe' : '#52525b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>{item.emoji}</span>
              <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.02em', textAlign: 'center', lineHeight: 1.2 }}>{item.label}</span>
            </button>
          )
        })}
      </div>
      {!allSelected && (
        <p style={{ fontSize: '11px', color: '#3f3f46', marginTop: '10px', textAlign: 'center' }}>
          {selected.length} of {items.length} selected —{' '}
          <button
            onClick={onSelectAll}
            style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            select all
          </button>
        </p>
      )}
    </>
  )
}

const ALL_GENERAL_CATEGORY_IDS = CATEGORIES.map(c => c.id)
const ALL_THEMED_CATEGORY_IDS  = THEMED_CATEGORIES.map(c => c.id)
const ALL_CATEGORY_IDS  = [...ALL_GENERAL_CATEGORY_IDS, ...ALL_THEMED_CATEGORY_IDS]
const ALL_TYPE_IDS      = QUESTION_TYPES.map(t => t.id)

export function QuizSettingsPanel({ onChange }: QuizSettingsPanelProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTypes,      setSelectedTypes]      = useState<string[]>([])
  const [questionCount,      setQuestionCount]      = useState(10)

  const emit = (cats: string[], types: string[], count: number) =>
    onChange({ categories: cats, types, questionCount: count })

  // Emit initial state so parent has correct values without user interaction
  useEffect(() => {
    emit([], [], 10)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleCategory = (id: string) => {
    const next = selectedCategories.includes(id)
      ? selectedCategories.filter(c => c !== id)
      : [...selectedCategories, id]
    setSelectedCategories(next)
    emit(next, selectedTypes, questionCount)
  }

  const toggleType = (id: string) => {
    const next = selectedTypes.includes(id)
      ? selectedTypes.filter(t => t !== id)
      : [...selectedTypes, id]
    setSelectedTypes(next)
    emit(selectedCategories, next, questionCount)
  }

  const selectCount = (count: number) => {
    setQuestionCount(count)
    emit(selectedCategories, selectedTypes, count)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Question count */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
          Questions
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {QUESTION_COUNTS.map(count => (
            <button
              key={count}
              onClick={() => selectCount(count)}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: '12px',
                border: questionCount === count
                  ? '1.5px solid rgba(99,102,241,0.7)'
                  : '1.5px solid rgba(255,255,255,0.08)',
                background: questionCount === count
                  ? 'rgba(99,102,241,0.2)'
                  : 'rgba(255,255,255,0.03)',
                color: questionCount === count ? '#818cf8' : '#52525b',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Categories
            <span style={{ fontWeight: 400, color: '#3f3f46', marginLeft: '6px', textTransform: 'none', letterSpacing: 0 }}>
              {selectedCategories.length === 0 ? '(all)' : `${selectedCategories.length} selected`}
            </span>
          </div>
          {selectedCategories.length === 0 ? (
            <button
              onClick={() => { setSelectedCategories(ALL_GENERAL_CATEGORY_IDS); emit(ALL_GENERAL_CATEGORY_IDS, selectedTypes, questionCount) }}
              style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Select All
            </button>
          ) : (
            <button
              onClick={() => { setSelectedCategories([]); emit([], selectedTypes, questionCount) }}
              style={{ fontSize: '11px', color: '#52525b', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Clear
            </button>
          )}
        </div>
        <ToggleGrid
          items={CATEGORIES}
          selected={selectedCategories}
          onToggle={toggleCategory}
          onSelectAll={() => { setSelectedCategories(ALL_GENERAL_CATEGORY_IDS); emit(ALL_GENERAL_CATEGORY_IDS, selectedTypes, questionCount) }}
        />
      </div>

      {/* Themed categories */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
            Themed
          </div>
          <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>
        <ToggleGrid
          items={THEMED_CATEGORIES}
          selected={selectedCategories}
          onToggle={toggleCategory}
          onSelectAll={() => { setSelectedCategories(ALL_THEMED_CATEGORY_IDS); emit(ALL_THEMED_CATEGORY_IDS, selectedTypes, questionCount) }}
          accentColor='rgba(251,191,36'
        />
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

      {/* Question types */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Question Types
            <span style={{ fontWeight: 400, color: '#3f3f46', marginLeft: '6px', textTransform: 'none', letterSpacing: 0 }}>
              {selectedTypes.length === 0 ? '(all)' : `${selectedTypes.length} selected`}
            </span>
          </div>
          {selectedTypes.length === 0 ? (
            <button
              onClick={() => { setSelectedTypes(ALL_TYPE_IDS); emit(selectedCategories, ALL_TYPE_IDS, questionCount) }}
              style={{ fontSize: '11px', color: '#14b8a6', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Select All
            </button>
          ) : (
            <button
              onClick={() => { setSelectedTypes([]); emit(selectedCategories, [], questionCount) }}
              style={{ fontSize: '11px', color: '#52525b', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Clear
            </button>
          )}
        </div>
        <ToggleGrid
          items={QUESTION_TYPES}
          selected={selectedTypes}
          onToggle={toggleType}
          onSelectAll={() => { setSelectedTypes(ALL_TYPE_IDS); emit(selectedCategories, ALL_TYPE_IDS, questionCount) }}
          accentColor='rgba(20,184,166'
        />
      </div>

    </div>
  )
}
