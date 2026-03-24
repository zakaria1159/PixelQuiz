'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/admin/questions')
      } else {
        setError('Invalid password')
        setPassword('')
      }
    } catch (err) {
      setError(`Network error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at 50% -10%, #13154a 0%, #0f0f1a 45%, #09090f 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-4">
            <span className="text-xl">⚡</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Admin Access</h1>
          <p className="text-zinc-500 text-sm">MetaQuizz Question Manager</p>
        </div>
        <form onSubmit={handleSubmit} className="glass p-8 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-zinc-600 font-semibold text-base py-4 px-5 rounded-xl outline-none transition-all"
              placeholder="Enter admin password"
            />
          </div>
          {error && <p className="text-red-400 text-sm font-semibold">{error}</p>}
          <button
            type="submit"
            disabled={!password || loading}
            className="w-full py-4 px-6 rounded-xl font-black text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)', boxShadow: '0 0 30px rgba(79,70,229,0.4)' }}
          >
            {loading ? 'Verifying…' : '▶  Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
