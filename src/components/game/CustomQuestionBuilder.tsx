'use client'

import { useState } from 'react'

export interface CustomQuestion {
  type: 'multiple_choice' | 'true_false' | 'free_text' | 'closest_wins'
  question: string
  options?: string[]
  correctAnswer: string | number
  acceptableAnswers?: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  category: 'custom'
}

interface CustomQuestionBuilderProps {
  questions: CustomQuestion[]
  customOnly: boolean
  onChange: (questions: CustomQuestion[], customOnly: boolean) => void
}

const TYPES = [
  { id: 'multiple_choice', label: 'Multiple Choice', emoji: '🔤' },
  { id: 'true_false',      label: 'True / False',    emoji: '✅' },
  { id: 'free_text',       label: 'Type Answer',     emoji: '✏️' },
  { id: 'closest_wins',    label: 'Closest Wins',    emoji: '🎯' },
] as const

const DIFFICULTIES = [
  { id: 'easy',   label: 'Easy',   color: 'rgba(34,197,94' },
  { id: 'medium', label: 'Medium', color: 'rgba(234,179,8' },
  { id: 'hard',   label: 'Hard',   color: 'rgba(239,68,68' },
] as const

const emptyForm = () => ({
  type: 'multiple_choice' as CustomQuestion['type'],
  question: '',
  options: ['', '', '', ''],
  correctOption: 0,
  correctAnswer: '',
  difficulty: 'medium' as CustomQuestion['difficulty'],
})

export function CustomQuestionBuilder({ questions, customOnly, onChange }: CustomQuestionBuilderProps) {
  const [form, setForm] = useState(emptyForm())
  const [error, setError] = useState('')

  const setType = (type: CustomQuestion['type']) => setForm(f => ({ ...emptyForm(), type, difficulty: f.difficulty }))
  const setDifficulty = (difficulty: CustomQuestion['difficulty']) => setForm(f => ({ ...f, difficulty }))

  const validate = (): string => {
    if (!form.question.trim()) return 'Question text is required.'
    if (form.type === 'multiple_choice') {
      if (form.options!.some(o => !o.trim())) return 'All 4 options are required.'
    }
    if (form.type === 'free_text' && !form.correctAnswer.toString().trim()) return 'Correct answer is required.'
    if (form.type === 'closest_wins') {
      if (!form.correctAnswer.toString().trim()) return 'A number is required.'
      if (isNaN(Number(form.correctAnswer))) return 'Answer must be a number.'
    }
    return ''
  }

  const buildQuestion = (): CustomQuestion => {
    if (form.type === 'multiple_choice') {
      return {
        type: 'multiple_choice',
        question: form.question.trim(),
        options: form.options!.map(o => o.trim()),
        correctAnswer: form.correctOption,
        difficulty: form.difficulty,
        category: 'custom',
      }
    }
    if (form.type === 'true_false') {
      return {
        type: 'true_false',
        question: form.question.trim(),
        options: ['True', 'False'],
        correctAnswer: form.correctOption, // 0=True, 1=False
        difficulty: form.difficulty,
        category: 'custom',
      }
    }
    if (form.type === 'closest_wins') {
      return {
        type: 'closest_wins',
        question: form.question.trim(),
        correctAnswer: Number(form.correctAnswer),
        difficulty: form.difficulty,
        category: 'custom',
      }
    }
    // free_text
    return {
      type: 'free_text',
      question: form.question.trim(),
      correctAnswer: form.correctAnswer.toString().trim(),
      acceptableAnswers: [],
      difficulty: form.difficulty,
      category: 'custom',
    }
  }

  const handleAdd = () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    const next = [...questions, buildQuestion()]
    onChange(next, customOnly)
    setForm(f => ({ ...emptyForm(), type: f.type, difficulty: f.difficulty }))
  }

  const handleDelete = (i: number) => {
    const next = questions.filter((_, idx) => idx !== i)
    onChange(next, customOnly)
  }

  const handleToggleCustomOnly = () => onChange(questions, !customOnly)

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: 'white',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 700,
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '6px',
    display: 'block',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Type selector */}
      <div>
        <span style={labelStyle}>Question Type</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {TYPES.map(t => {
            const active = form.type === t.id
            return (
              <button
                key={t.id}
                onClick={() => setType(t.id as CustomQuestion['type'])}
                style={{
                  padding: '9px 8px',
                  borderRadius: '10px',
                  border: active ? '1.5px solid rgba(99,102,241,0.7)' : '1.5px solid rgba(255,255,255,0.07)',
                  background: active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
                  color: active ? '#c7d2fe' : '#52525b',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Question text */}
      <div>
        <span style={labelStyle}>Question</span>
        <textarea
          value={form.question}
          onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
          placeholder="Type your question here…"
          rows={2}
          style={{ ...inputStyle, resize: 'none' }}
        />
      </div>

      {/* Type-specific fields */}
      {form.type === 'multiple_choice' && (
        <div>
          <span style={labelStyle}>Options — click the circle to mark correct</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {form.options!.map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setForm(f => ({ ...f, correctOption: i }))}
                  style={{
                    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                    border: form.correctOption === i ? '2px solid #4ade80' : '2px solid rgba(255,255,255,0.2)',
                    background: form.correctOption === i ? 'rgba(74,222,128,0.2)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                />
                <input
                  value={opt}
                  onChange={e => {
                    const opts = [...form.options!]
                    opts[i] = e.target.value
                    setForm(f => ({ ...f, options: opts }))
                  }}
                  placeholder={`Option ${i + 1}`}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {form.type === 'true_false' && (
        <div>
          <span style={labelStyle}>Correct Answer</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['True', 'False'].map((label, i) => {
              const active = form.correctOption === i
              return (
                <button
                  key={label}
                  onClick={() => setForm(f => ({ ...f, correctOption: i }))}
                  style={{
                    flex: 1, padding: '10px',
                    borderRadius: '10px',
                    border: active
                      ? `1.5px solid ${i === 0 ? 'rgba(74,222,128,0.7)' : 'rgba(239,68,68,0.7)'}`
                      : '1.5px solid rgba(255,255,255,0.08)',
                    background: active
                      ? i === 0 ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.12)'
                      : 'rgba(255,255,255,0.03)',
                    color: active ? (i === 0 ? '#4ade80' : '#f87171') : '#52525b',
                    fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {form.type === 'free_text' && (
        <div>
          <span style={labelStyle}>Correct Answer</span>
          <input
            value={form.correctAnswer.toString()}
            onChange={e => setForm(f => ({ ...f, correctAnswer: e.target.value }))}
            placeholder="Type the correct answer…"
            style={inputStyle}
          />
          <p style={{ fontSize: '11px', color: '#52525b', marginTop: '6px' }}>
            Minor typos and case differences are forgiven automatically.
          </p>
        </div>
      )}

      {form.type === 'closest_wins' && (
        <div>
          <span style={labelStyle}>Correct Number</span>
          <input
            type="number"
            value={form.correctAnswer.toString()}
            onChange={e => setForm(f => ({ ...f, correctAnswer: e.target.value }))}
            placeholder="Enter the correct number…"
            style={inputStyle}
          />
        </div>
      )}

      {/* Difficulty */}
      <div>
        <span style={labelStyle}>Difficulty</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {DIFFICULTIES.map(d => {
            const active = form.difficulty === d.id
            return (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                style={{
                  flex: 1, padding: '8px 0',
                  borderRadius: '10px',
                  border: active ? `1.5px solid ${d.color},0.6)` : '1.5px solid rgba(255,255,255,0.08)',
                  background: active ? `${d.color},0.15)` : 'rgba(255,255,255,0.03)',
                  color: active ? `${d.color},1)` : '#52525b',
                  fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {d.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p style={{ fontSize: '12px', color: '#f87171', margin: 0 }}>{error}</p>
      )}

      {/* Add button */}
      <button
        onClick={handleAdd}
        style={{
          width: '100%', padding: '11px',
          borderRadius: '12px',
          border: '1.5px solid rgba(99,102,241,0.5)',
          background: 'rgba(99,102,241,0.15)',
          color: '#a5b4fc',
          fontSize: '13px', fontWeight: 700,
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.25)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
      >
        + Add Question
      </button>

      {/* Question list */}
      {questions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={labelStyle}>{questions.length} question{questions.length !== 1 ? 's' : ''} added</span>
          </div>
          {questions.map((q, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'white', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {q.question}
                </div>
                <div style={{ fontSize: '10px', color: '#52525b', fontWeight: 600 }}>
                  {TYPES.find(t => t.id === q.type)?.label} · {q.difficulty}
                </div>
              </div>
              <button
                onClick={() => handleDelete(i)}
                style={{
                  flexShrink: 0, width: '24px', height: '24px',
                  borderRadius: '6px', border: 'none',
                  background: 'rgba(239,68,68,0.1)',
                  color: '#f87171', fontSize: '14px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
              >
                ×
              </button>
            </div>
          ))}

          {/* Custom only toggle */}
          <div
            onClick={handleToggleCustomOnly}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '12px',
              border: customOnly ? '1.5px solid rgba(251,191,36,0.4)' : '1.5px solid rgba(255,255,255,0.08)',
              background: customOnly ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: customOnly ? '#fbbf24' : '#a1a1aa' }}>
                {customOnly ? 'Custom questions only' : 'Mix with standard pool'}
              </div>
              <div style={{ fontSize: '10px', color: '#52525b', marginTop: '2px' }}>
                {customOnly ? 'Only your questions will be used' : 'Your questions + standard pool combined'}
              </div>
            </div>
            <div style={{
              width: '36px', height: '20px', borderRadius: '99px',
              background: customOnly ? '#fbbf24' : 'rgba(255,255,255,0.15)',
              position: 'relative', flexShrink: 0,
              transition: 'background 0.2s',
            }}>
              <div style={{
                width: '14px', height: '14px', borderRadius: '50%',
                background: 'white',
                position: 'absolute', top: '3px',
                left: customOnly ? '19px' : '3px',
                transition: 'left 0.2s',
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
