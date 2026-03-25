'use client'

import { useState, useEffect } from 'react'

const QUESTION_TYPES = ['multiple_choice','speed_buzz','true_false','free_text','fill_blank','image_guess','pixel_reveal','ranking','closest_wins','letter_game','flag_guess','music_guess','animal_sound','clue_chain']
const DIFFICULTIES = ['easy', 'medium', 'hard']

interface Props {
  initialValues?: any
  allCategories: { en: string[]; fr: string[] }
  onSubmit: (data: any) => Promise<void>
  submitLabel: string
}

function InputField({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (
    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 text-white placeholder-zinc-600 text-sm py-2.5 px-4 rounded-lg outline-none transition-all"
      />
    </div>
  )
}

function ListField({ label, values, onChange, placeholder }: any) {
  return (
    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">{label}</label>
      <div className="space-y-2">
        {(values || []).map((v: string, i: number) => (
          <div key={`${i}-${v}`} className="flex gap-2">
            <input
              value={v}
              onChange={e => { const next = [...values]; next[i] = e.target.value; onChange(next) }}
              placeholder={`${placeholder} ${i + 1}`}
              className="flex-1 bg-white/5 border border-white/10 focus:border-indigo-500 text-white placeholder-zinc-600 text-sm py-2 px-3 rounded-lg outline-none"
            />
            <button type="button" onClick={() => onChange(values.filter((_: any, j: number) => j !== i))} className="text-red-500 hover:text-red-400 px-2 font-bold">✕</button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...(values || []), ''])} className="text-indigo-400 hover:text-indigo-300 text-xs font-bold">+ Add</button>
      </div>
    </div>
  )
}

export default function QuestionForm({ initialValues, allCategories, onSubmit, submitLabel }: Props) {
  const defaults = {
    type: 'multiple_choice', category: allCategories.en[0] || '', lang: 'en',
    question: '', difficulty: 'easy', timeLimit: 20, explanation: '',
    options: ['', '', '', ''], correctAnswer: 0,
    ...initialValues,
  }
  const [form, setForm] = useState<any>(defaults)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Categories filtered by the currently selected language
  const categories = allCategories[form.lang as 'en' | 'fr'] ?? allCategories.en

  function set(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }))
  }

  // Reset type-specific fields when type changes
  useEffect(() => {
    if (initialValues?.type === form.type) return
    const resets: Record<string, any> = {
      multiple_choice: { options: ['', '', '', ''], correctAnswer: 0 },
      speed_buzz: { options: ['', '', '', ''], correctAnswer: 0 },
      true_false: { options: ['True', 'False'], correctAnswer: 0 },
      free_text: { correctAnswer: '', acceptableAnswers: [], caseSensitive: false, exactMatch: false },
      fill_blank: { correctAnswer: '', acceptableAnswers: [] },
      image_guess: { imageUrl: '', correctAnswer: '', acceptableAnswers: [] },
      pixel_reveal: { imageUrl: '', correctAnswer: '', acceptableAnswers: [] },
      ranking: { items: ['', '', ''], correctOrder: [0, 1, 2], allowPartialCredit: true },
      closest_wins: { correctAnswer: 0, unit: '' },
      letter_game: { letter: 'A', categories: ['Name', 'Animal', 'Country'] },
      flag_guess: { countryCode: '', correctAnswer: '', acceptableAnswers: [] },
      music_guess: { deezerQuery: '', correctAnswer: '', artist: '', songTitle: '', acceptableAnswers: [] },
      animal_sound: { audioUrl: '', correctAnswer: '', acceptableAnswers: [] },
      clue_chain: { clues: ['', '', '', ''], correctAnswer: '', acceptableAnswers: [] },
    }
    if (resets[form.type]) setForm((f: any) => ({ ...f, ...resets[form.type] }))
  }, [form.type, initialValues])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSubmit(form)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const t = form.type

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {/* Row 1: Type, Category, Lang */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 text-white text-sm py-2.5 px-3 rounded-lg outline-none">
            {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)} className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 text-white text-sm py-2.5 px-3 rounded-lg outline-none">
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Language</label>
          <select value={form.lang} onChange={e => set('lang', e.target.value)} className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 text-white text-sm py-2.5 px-3 rounded-lg outline-none">
            <option value="en">🇬🇧 EN</option>
            <option value="fr">🇫🇷 FR</option>
          </select>
        </div>
      </div>

      {/* Question text */}
      <div>
        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">
          Question {t === 'fill_blank' && <span className="text-indigo-400 normal-case font-normal">(use ___ for the blank)</span>}
        </label>
        <textarea
          value={form.question}
          onChange={e => set('question', e.target.value)}
          rows={2}
          className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 text-white placeholder-zinc-600 text-sm py-2.5 px-4 rounded-lg outline-none resize-none"
          placeholder="Enter question text…"
        />
      </div>

      {/* Type-specific fields */}
      {(t === 'multiple_choice' || t === 'speed_buzz') && (
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Options <span className="text-indigo-400 normal-case font-normal">(click to mark correct)</span></label>
          <div className="grid grid-cols-2 gap-2">
            {(form.options || ['','','','']).map((opt: string, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <button type="button" onClick={() => set('correctAnswer', i)} className={`w-6 h-6 rounded-full flex-shrink-0 border-2 transition-colors ${form.correctAnswer === i ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`} />
                <input
                  value={opt}
                  onChange={e => { const next = [...(form.options || [])]; next[i] = e.target.value; set('options', next) }}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 bg-white/5 border border-white/10 text-white text-sm py-2 px-3 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {t === 'true_false' && (
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Correct Answer</label>
          <div className="flex gap-3">
            {['True', 'False'].map((v, i) => (
              <button key={v} type="button" onClick={() => set('correctAnswer', i)} className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${form.correctAnswer === i ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-zinc-700 text-zinc-500'}`}>{v}</button>
            ))}
          </div>
        </div>
      )}

      {(t === 'free_text' || t === 'fill_blank') && (
        <>
          <InputField label="Correct Answer" value={form.correctAnswer} onChange={(v: string) => set('correctAnswer', v)} placeholder="The correct answer" />
          <ListField label="Acceptable Answers (alternatives)" values={form.acceptableAnswers} onChange={(v: string[]) => set('acceptableAnswers', v)} placeholder="Alternative answer" />
          {t === 'free_text' && (
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer"><input type="checkbox" checked={!!form.caseSensitive} onChange={e => set('caseSensitive', e.target.checked)} className="rounded" /> Case sensitive</label>
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer"><input type="checkbox" checked={!!form.exactMatch} onChange={e => set('exactMatch', e.target.checked)} className="rounded" /> Exact match only</label>
            </div>
          )}
        </>
      )}

      {(t === 'image_guess' || t === 'pixel_reveal') && (
        <>
          <InputField label="Image URL" value={form.imageUrl} onChange={(v: string) => set('imageUrl', v)} placeholder="https://…" />
          <InputField label="Correct Answer" value={form.correctAnswer} onChange={(v: string) => set('correctAnswer', v)} placeholder="What's in the image?" />
          <ListField label="Acceptable Answers" values={form.acceptableAnswers} onChange={(v: string[]) => set('acceptableAnswers', v)} placeholder="Alternative answer" />
        </>
      )}

      {t === 'ranking' && (
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Items <span className="text-indigo-400 normal-case font-normal">(order them correctly below)</span></label>
          <div className="space-y-2">
            {(form.items || []).map((item: string, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-zinc-600 text-xs w-4">{i + 1}.</span>
                <input
                  value={item}
                  onChange={e => { const next = [...(form.items || [])]; next[i] = e.target.value; set('items', next); set('correctOrder', next.map((_, j) => j)) }}
                  placeholder={`Item ${i + 1}`}
                  className="flex-1 bg-white/5 border border-white/10 text-white text-sm py-2 px-3 rounded-lg outline-none focus:border-indigo-500"
                />
                <button type="button" onClick={() => { const next = (form.items || []).filter((_: any, j: number) => j !== i); set('items', next); set('correctOrder', next.map((_: any, j: number) => j)) }} className="text-red-500 text-xs px-1">✕</button>
              </div>
            ))}
            <button type="button" onClick={() => { const next = [...(form.items || []), '']; set('items', next); set('correctOrder', next.map((_, j) => j)) }} className="text-indigo-400 text-xs font-bold">+ Add item</button>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer mt-3"><input type="checkbox" checked={!!form.allowPartialCredit} onChange={e => set('allowPartialCredit', e.target.checked)} className="rounded" /> Allow partial credit</label>
        </div>
      )}

      {t === 'closest_wins' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField label="Correct Answer (number)" value={form.correctAnswer} onChange={(v: number) => set('correctAnswer', v)} type="number" placeholder="42" />
          <InputField label="Unit (optional)" value={form.unit} onChange={(v: string) => set('unit', v)} placeholder="km, years…" />
        </div>
      )}

      {t === 'letter_game' && (
        <>
          <InputField label="Letter" value={form.letter} onChange={(v: string) => set('letter', v.toUpperCase().slice(0, 1))} placeholder="A" />
          <ListField label="Categories" values={form.categories} onChange={(v: string[]) => set('categories', v)} placeholder="Category name" />
        </>
      )}

      {t === 'flag_guess' && (
        <>
          <InputField label="Country Code (ISO alpha-2)" value={form.countryCode} onChange={(v: string) => set('countryCode', v.toLowerCase())} placeholder="fr" />
          <InputField label="Country Name" value={form.correctAnswer} onChange={(v: string) => set('correctAnswer', v)} placeholder="France" />
          <ListField label="Acceptable Answers (aliases)" values={form.acceptableAnswers} onChange={(v: string[]) => set('acceptableAnswers', v)} placeholder="Alias" />
        </>
      )}

      {t === 'music_guess' && (
        <>
          <InputField label="Deezer Search Query" value={form.deezerQuery} onChange={(v: string) => set('deezerQuery', v)} placeholder="bohemian rhapsody queen" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Song Title (correct answer)" value={form.correctAnswer} onChange={(v: string) => set('correctAnswer', v)} placeholder="Bohemian Rhapsody" />
            <InputField label="Artist" value={form.artist} onChange={(v: string) => set('artist', v)} placeholder="Queen" />
          </div>
          <InputField label="Song Title (display)" value={form.songTitle} onChange={(v: string) => set('songTitle', v)} placeholder="Bohemian Rhapsody" />
          <ListField label="Acceptable Answers" values={form.acceptableAnswers} onChange={(v: string[]) => set('acceptableAnswers', v)} placeholder="Alternative answer" />
        </>
      )}

      {t === 'animal_sound' && (
        <>
          <InputField label="Audio URL (Wikimedia OGG)" value={form.audioUrl} onChange={(v: string) => set('audioUrl', v)} placeholder="https://upload.wikimedia.org/…" />
          <InputField label="Animal Name (correct answer)" value={form.correctAnswer} onChange={(v: string) => set('correctAnswer', v)} placeholder="Lion" />
          <ListField label="Acceptable Answers" values={form.acceptableAnswers} onChange={(v: string[]) => set('acceptableAnswers', v)} placeholder="Alternative" />
        </>
      )}

      {t === 'clue_chain' && (
        <>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">4 Clues <span className="text-indigo-400 normal-case font-normal">(hardest → easiest)</span></label>
            <div className="space-y-2">
              {[0,1,2,3].map(i => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-zinc-600 text-xs w-4">{i + 1}.</span>
                  <input
                    value={(form.clues || [])[i] || ''}
                    onChange={e => { const next = [...(form.clues || ['','','',''])]; next[i] = e.target.value; set('clues', next) }}
                    placeholder={i === 0 ? 'Hardest clue' : i === 3 ? 'Easiest clue' : `Clue ${i + 1}`}
                    className="flex-1 bg-white/5 border border-white/10 text-white text-sm py-2 px-3 rounded-lg outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>
          <InputField label="Correct Answer" value={form.correctAnswer} onChange={(v: string) => set('correctAnswer', v)} placeholder="The answer" />
          <ListField label="Acceptable Answers" values={form.acceptableAnswers} onChange={(v: string[]) => set('acceptableAnswers', v)} placeholder="Alternative" />
        </>
      )}

      {/* Common: Difficulty + Time limit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Difficulty</label>
          <div className="flex gap-2">
            {DIFFICULTIES.map(d => (
              <button key={d} type="button" onClick={() => set('difficulty', d)} className={`px-4 py-1.5 rounded-lg font-bold text-xs border transition-colors ${form.difficulty === d ? d === 'easy' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : d === 'medium' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-red-500/20 border-red-500 text-red-400' : 'border-zinc-700 text-zinc-500'}`}>{d}</button>
            ))}
          </div>
        </div>
        <InputField label="Time Limit (seconds)" value={form.timeLimit} onChange={(v: number) => set('timeLimit', v)} type="number" placeholder="20" />
      </div>

      {/* Explanation */}
      <div>
        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Explanation <span className="text-zinc-600 normal-case font-normal">(optional)</span></label>
        <input
          value={form.explanation || ''}
          onChange={e => set('explanation', e.target.value)}
          placeholder="Shown after the answer is revealed…"
          className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 text-white placeholder-zinc-600 text-sm py-2.5 px-4 rounded-lg outline-none"
        />
      </div>

      {error && <p className="text-red-400 text-sm font-semibold">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="px-8 py-3 rounded-xl font-black text-white disabled:opacity-40 transition-all"
        style={{ background: 'linear-gradient(135deg,#4f46e5,#4338ca)', boxShadow: '0 0 24px rgba(79,70,229,0.3)' }}
      >
        {saving ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
