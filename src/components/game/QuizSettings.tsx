'use client'
import { useState, useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useTranslation } from '@/hooks/useTranslation'

export interface QuizSettings {
  categories: string[]
  types: string[]
  difficulties: string[]
  questionCount: number
  lang: string
  customQuestions?: any[]
  customOnly?: boolean
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
  { id: 'books',       label: 'Books',       emoji: '📚' },
]

const THEMED_CATEGORIES = [
  { id: 'harry_potter', label: 'Harry Potter', emoji: '🧙' },
  { id: 'football',     label: 'Football',     emoji: '⚽' },
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

const DIFFICULTIES = [
  { id: 'easy',   label: 'Easy',   emoji: '🟢' },
  { id: 'medium', label: 'Medium', emoji: '🟡' },
  { id: 'hard',   label: 'Hard',   emoji: '🔴' },
]

const QUESTION_COUNTS = [5, 10, 15, 20, 25, 30, 40]

const LANGUAGES = [
  { id: 'en', label: 'English', emoji: '🇬🇧' },
  { id: 'fr', label: 'Français', emoji: '🇫🇷' },
]

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
  const { t } = useTranslation()
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
          {t('n_of_m_selected', { n: selected.length, m: items.length })}{' '}
          <button
            onClick={onSelectAll}
            style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {t('select_all_link')}
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
  const { t, lang: storeLang } = useTranslation()
  const [selectedCategories,  setSelectedCategories]  = useState<string[]>([])
  const [selectedTypes,       setSelectedTypes]       = useState<string[]>([])
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([])
  const [questionCount,       setQuestionCount]       = useState(10)
  const [lang,                setLang]                = useState(storeLang)

  const emit = (cats: string[], types: string[], diffs: string[], count: number, l: string) =>
    onChange({ categories: cats, types, difficulties: diffs, questionCount: count, lang: l })

  // Emit initial state so parent has correct values without user interaction
  useEffect(() => {
    emit([], [], [], 10, 'en')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleCategory = (id: string) => {
    const isThemed = ALL_THEMED_CATEGORY_IDS.includes(id)
    const wasSelected = selectedCategories.includes(id)
    let next: string[]
    if (wasSelected) {
      next = selectedCategories.filter(c => c !== id)
    } else {
      // Selecting a themed universe clears general categories, and vice versa
      const clearIds = isThemed ? ALL_GENERAL_CATEGORY_IDS : ALL_THEMED_CATEGORY_IDS
      next = [...selectedCategories.filter(c => !clearIds.includes(c)), id]
    }
    setSelectedCategories(next)
    emit(next, selectedTypes, selectedDifficulties, questionCount, lang)
  }

  const toggleType = (id: string) => {
    const next = selectedTypes.includes(id)
      ? selectedTypes.filter(t => t !== id)
      : [...selectedTypes, id]
    setSelectedTypes(next)
    emit(selectedCategories, next, selectedDifficulties, questionCount, lang)
  }

  const toggleDifficulty = (id: string) => {
    const next = selectedDifficulties.includes(id)
      ? selectedDifficulties.filter(d => d !== id)
      : [...selectedDifficulties, id]
    setSelectedDifficulties(next)
    emit(selectedCategories, selectedTypes, next, questionCount, lang)
  }

  const selectCount = (count: number) => {
    setQuestionCount(count)
    emit(selectedCategories, selectedTypes, selectedDifficulties, count, lang)
  }

  const selectLang = (l: string) => {
    setLang(l)
    useGameStore.getState().setLang(l)
    localStorage.setItem('metaquizz_lang', l)
    emit(selectedCategories, selectedTypes, selectedDifficulties, questionCount, l)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Language */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
          {t('language')}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {LANGUAGES.map(l => (
            <button
              key={l.id}
              onClick={() => selectLang(l.id)}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: '12px',
                border: lang === l.id
                  ? '1.5px solid rgba(99,102,241,0.7)'
                  : '1.5px solid rgba(255,255,255,0.08)',
                background: lang === l.id
                  ? 'rgba(99,102,241,0.2)'
                  : 'rgba(255,255,255,0.03)',
                color: lang === l.id ? '#818cf8' : '#52525b',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>{l.emoji}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Question count */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
          {t('questions_label')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {QUESTION_COUNTS.map(count => (
            <button
              key={count}
              onClick={() => selectCount(count)}
              style={{
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

      {/* Difficulty */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
          {t('difficulty')}
          <span style={{ fontWeight: 400, color: '#3f3f46', marginLeft: '6px', textTransform: 'none', letterSpacing: 0 }}>
            {selectedDifficulties.length === 0 ? t('all_label') : selectedDifficulties.join(', ')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {DIFFICULTIES.map(d => {
            const active = selectedDifficulties.includes(d.id)
            const colors: Record<string, string> = { easy: 'rgba(34,197,94', medium: 'rgba(234,179,8', hard: 'rgba(239,68,68' }
            const c = colors[d.id]
            return (
              <button
                key={d.id}
                onClick={() => toggleDifficulty(d.id)}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: '12px',
                  border: active ? `1.5px solid ${c},0.6)` : '1.5px solid rgba(255,255,255,0.08)',
                  background: active ? `${c},0.15)` : 'rgba(255,255,255,0.03)',
                  color: active ? `${c},1)` : '#52525b',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>{d.emoji}</span>
                <span>{d.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Categories */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {t('categories')}
            <span style={{ fontWeight: 400, color: '#3f3f46', marginLeft: '6px', textTransform: 'none', letterSpacing: 0 }}>
              {selectedCategories.length === 0 ? t('all_label') : t('n_selected', { n: selectedCategories.length })}
            </span>
          </div>
          {selectedCategories.length === 0 ? (
            <button
              onClick={() => { setSelectedCategories(ALL_GENERAL_CATEGORY_IDS); emit(ALL_GENERAL_CATEGORY_IDS, selectedTypes, selectedDifficulties, questionCount, lang) }}
              style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {t('select_all')}
            </button>
          ) : (
            <button
              onClick={() => { setSelectedCategories([]); emit([], selectedTypes, selectedDifficulties, questionCount, lang) }}
              style={{ fontSize: '11px', color: '#52525b', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {t('clear')}
            </button>
          )}
        </div>
        <ToggleGrid
          items={CATEGORIES}
          selected={selectedCategories}
          onToggle={toggleCategory}
          onSelectAll={() => { setSelectedCategories(ALL_GENERAL_CATEGORY_IDS); emit(ALL_GENERAL_CATEGORY_IDS, selectedTypes, selectedDifficulties, questionCount, lang) }}
        />
      </div>

      {/* Themed categories */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
            {t('themed')}
          </div>
          <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>
        <ToggleGrid
          items={THEMED_CATEGORIES}
          selected={selectedCategories}
          onToggle={toggleCategory}
          onSelectAll={() => { setSelectedCategories(ALL_THEMED_CATEGORY_IDS); emit(ALL_THEMED_CATEGORY_IDS, selectedTypes, selectedDifficulties, questionCount, lang) }}
          accentColor='rgba(251,191,36'
        />
        {selectedCategories.some(c => ALL_THEMED_CATEGORY_IDS.includes(c)) && (
          <p style={{ fontSize: '10px', color: '#78716c', marginTop: '8px', textAlign: 'center' }}>
            {t('themed_universe_note')}
          </p>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

      {/* Question types */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {t('question_types')}
            <span style={{ fontWeight: 400, color: '#3f3f46', marginLeft: '6px', textTransform: 'none', letterSpacing: 0 }}>
              {selectedTypes.length === 0 ? t('all_label') : t('n_selected', { n: selectedTypes.length })}
            </span>
          </div>
          {selectedTypes.length === 0 ? (
            <button
              onClick={() => { setSelectedTypes(ALL_TYPE_IDS); emit(selectedCategories, ALL_TYPE_IDS, selectedDifficulties, questionCount, lang) }}
              style={{ fontSize: '11px', color: '#14b8a6', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {t('select_all')}
            </button>
          ) : (
            <button
              onClick={() => { setSelectedTypes([]); emit(selectedCategories, [], selectedDifficulties, questionCount, lang) }}
              style={{ fontSize: '11px', color: '#52525b', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {t('clear')}
            </button>
          )}
        </div>
        <ToggleGrid
          items={QUESTION_TYPES}
          selected={selectedTypes}
          onToggle={toggleType}
          onSelectAll={() => { setSelectedTypes(ALL_TYPE_IDS); emit(selectedCategories, ALL_TYPE_IDS, selectedDifficulties, questionCount, lang) }}
          accentColor='rgba(20,184,166'
        />
      </div>

    </div>
  )
}
