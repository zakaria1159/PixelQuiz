'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const QUESTION_TYPES = ['multiple_choice','true_false','free_text','fill_blank','ranking','image_guess','pixel_reveal','closest_wins','speed_buzz','letter_game','flag_guess','music_guess','animal_sound','clue_chain']
const DIFFICULTIES = ['easy', 'medium', 'hard']

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([])
  const [categories, setCategories] = useState<{ en: string[]; fr: string[] }>({ en: [], fr: [] })
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filters, setFilters] = useState({ lang: '', category: '', type: '', difficulty: '', search: '' })
  const router = useRouter()

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    const res = await fetch(`/api/admin/questions?${params}`)
    const data = await res.json()
    setQuestions(data.questions)
    setCategories(data.categories)
    setLoading(false)
  }, [filters])

  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  async function handleDelete(q: any) {
    if (!confirm(`Delete "${q.question?.slice(0, 60)}…"?`)) return
    setDeleting(q.id)
    await fetch(`/api/admin/questions/${q.id}?lang=${q._lang}&category=${q.category}`, { method: 'DELETE' })
    await fetchQuestions()
    setDeleting(null)
  }

  const allCategories = Array.from(new Set([...categories.en, ...categories.fr])).sort()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">Questions</h1>
        <Link href="/admin/questions/new" className="px-4 py-2 rounded-xl font-bold text-sm text-white" style={{ background: 'linear-gradient(135deg,#4f46e5,#4338ca)' }}>
          ➕ Add Question
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search…"
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          className="bg-white/5 border border-white/10 text-white placeholder-zinc-600 text-sm px-4 py-2 rounded-lg outline-none focus:border-indigo-500 w-56"
        />
        {[
          { key: 'lang', options: ['en', 'fr'], label: 'All langs' },
          { key: 'category', options: allCategories, label: 'All categories' },
          { key: 'type', options: QUESTION_TYPES, label: 'All types' },
          { key: 'difficulty', options: DIFFICULTIES, label: 'All difficulties' },
        ].map(({ key, options, label }) => (
          <select
            key={key}
            value={(filters as any)[key]}
            onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
            className="bg-white/5 border border-white/10 text-zinc-300 text-sm px-3 py-2 rounded-lg outline-none focus:border-indigo-500"
          >
            <option value="">{label}</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        {Object.values(filters).some(Boolean) && (
          <button onClick={() => setFilters({ lang: '', category: '', type: '', difficulty: '', search: '' })} className="text-zinc-500 hover:text-zinc-300 text-sm font-semibold">✕ Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#1f2035' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#0f1117', borderBottom: '1px solid #1f2035' }}>
              <th className="text-left px-4 py-3 text-zinc-500 font-bold text-xs uppercase tracking-wider">Question</th>
              <th className="text-left px-4 py-3 text-zinc-500 font-bold text-xs uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 text-zinc-500 font-bold text-xs uppercase tracking-wider">Diff</th>
              <th className="text-left px-4 py-3 text-zinc-500 font-bold text-xs uppercase tracking-wider">Lang</th>
              <th className="text-left px-4 py-3 text-zinc-500 font-bold text-xs uppercase tracking-wider">Cat</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-600">Loading…</td></tr>
            ) : questions.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-600">No questions found</td></tr>
            ) : questions.map(q => (
              <tr key={`${q.id}-${q._lang}`} style={{ borderBottom: '1px solid #1a1d2e' }} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-zinc-300 max-w-xs">
                  <span className="line-clamp-1">{q.question}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-indigo-400 text-xs font-mono">{q.type}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold ${q.difficulty === 'easy' ? 'text-emerald-400' : q.difficulty === 'medium' ? 'text-amber-400' : 'text-red-400'}`}>
                    {q.difficulty}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs font-mono uppercase">{q._lang}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs">{q.category}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 justify-end">
                    <Link href={`/admin/questions/${q.id}/edit?lang=${q._lang}&category=${q.category}`} className="text-indigo-400 hover:text-indigo-300 font-semibold text-xs">Edit</Link>
                    <button
                      onClick={() => handleDelete(q)}
                      disabled={deleting === q.id}
                      className="text-red-500 hover:text-red-400 font-semibold text-xs disabled:opacity-40"
                    >
                      {deleting === q.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-zinc-600 text-xs mt-3">{questions.length} questions</p>
    </div>
  )
}
