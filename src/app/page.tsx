'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { generateGameCode } from '@/lib/utils'
import { useGameStore } from '@/stores/gameStore'
import { useTranslation } from '@/hooks/useTranslation'

const LANGUAGES = [
  { id: 'en', emoji: '🇬🇧', label: 'EN' },
  { id: 'fr', emoji: '🇫🇷', label: 'FR' },
]

export default function HomePage() {
  const [gameCode,    setGameCode]    = useState('')
  const [playerName,  setPlayerName]  = useState('')
  const [hostName,    setHostName]    = useState('')
  const [isLoading,   setIsLoading]   = useState(false)
  const [mode,        setMode]        = useState<'idle' | 'join' | 'host' | 'practice'>('idle')
  const router = useRouter()
  const { lang, setLang } = useGameStore()
  const { t } = useTranslation()

  // Restore lang from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('metaquizz_lang')
    if (saved && saved !== lang) setLang(saved)
  }, [])

  const handleLangSelect = (l: string) => {
    setLang(l)
    localStorage.setItem('metaquizz_lang', l)
  }

  const createGame = async (solo = false) => {
    if (!hostName.trim()) return
    setIsLoading(true)
    const code = generateGameCode()
    await new Promise(r => setTimeout(r, 200))
    const params = new URLSearchParams({ name: hostName.trim() })
    if (solo) params.set('solo', 'true')
    router.push(`/host/${code}?${params}` as any)
  }

  const canHost = hostName.trim().length > 0

  const joinGame = async () => {
    if (!gameCode.trim() || !playerName.trim()) return
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 150))
    router.push(`/game/${gameCode.toUpperCase()}?name=${encodeURIComponent(playerName.trim())}` as any)
  }

  const canJoin = gameCode.trim().length === 6 && playerName.trim().length > 0

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4"
      style={{ background: 'radial-gradient(ellipse at 50% -10%, #13154a 0%, #0f0f1a 45%, #09090f 100%)' }}
    >
      {/* Ambient orbs */}
      <div
        className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)',
          animation: 'floatOrb 18s ease-in-out infinite',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)',
          animation: 'floatOrb 22s ease-in-out 4s infinite reverse',
          filter: 'blur(80px)',
        }}
      />

      <div className="relative z-10 w-full max-w-md" style={{ animation: 'slideUpFadeIn 0.5s ease both' }}>

        {/* Logo */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-6">
            <span className="text-2xl">⚡</span>
          </div>
          <h1 className="text-5xl font-display tracking-tight leading-none mb-3">
            <span className="text-white">META</span><span className="text-indigo-400">QUIZZ</span>
          </h1>
          <p className="text-zinc-500 text-sm font-semibold tracking-wide">
            {t('tagline')}
          </p>
          {/* Language selector */}
          <div className="flex items-center justify-center gap-2 mt-5">
            {LANGUAGES.map(l => (
              <button
                key={l.id}
                onClick={() => handleLangSelect(l.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150"
                style={{
                  border: lang === l.id ? '1.5px solid rgba(99,102,241,0.7)' : '1.5px solid rgba(255,255,255,0.1)',
                  background: lang === l.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                  color: lang === l.id ? '#a5b4fc' : '#52525b',
                }}
              >
                <span>{l.emoji}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action card */}
        <div className="glass p-8">
          {mode === 'idle' ? (
            <div className="space-y-3" style={{ animation: 'slideUpFadeIn 0.35s ease both' }}>
              <button
                onClick={() => setMode('host')}
                className="w-full relative group py-5 px-6 rounded-2xl font-black text-lg text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                  boxShadow: '0 0 40px rgba(79,70,229,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                <span className="relative z-10">▶  {t('host_a_game')}</span>
              </button>

              <button
                onClick={() => setMode('practice')}
                className="w-full py-4 px-6 rounded-2xl font-black text-base text-emerald-300 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-emerald-800/60 hover:border-emerald-700 hover:bg-emerald-950/30"
              >
                🎯  {t('solo_practice')}
              </button>

              <div className="relative flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-zinc-600 font-semibold">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <button
                onClick={() => setMode('join')}
                className="w-full py-5 px-6 rounded-2xl font-black text-lg text-zinc-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-white/10 hover:border-white/20 hover:bg-white/5"
              >
                {t('join_a_game')}
              </button>
            </div>
          ) : mode === 'host' || mode === 'practice' ? (
            <div className="space-y-4" style={{ animation: 'slideUpFadeIn 0.3s ease both' }}>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                  {t('your_name')}
                </label>
                <input
                  type="text"
                  value={hostName}
                  onChange={e => setHostName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canHost && createGame(mode === 'practice')}
                  placeholder={t('enter_your_name')}
                  maxLength={20}
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-zinc-600 font-semibold text-base py-4 px-5 rounded-xl outline-none transition-all duration-150"
                />
              </div>

              <button
                onClick={() => createGame(mode === 'practice')}
                disabled={!canHost || isLoading}
                className="w-full py-5 px-6 rounded-2xl font-black text-lg text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: canHost
                    ? mode === 'practice'
                      ? 'linear-gradient(135deg, #059669, #047857)'
                      : 'linear-gradient(135deg, #4f46e5, #4338ca)'
                    : 'rgba(255,255,255,0.05)',
                  boxShadow: canHost
                    ? mode === 'practice' ? '0 0 30px rgba(5,150,105,0.4)' : '0 0 30px rgba(79,70,229,0.4)'
                    : 'none',
                  border: canHost ? 'none' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {isLoading ? t('setting_up_game') : mode === 'practice' ? `🎯  ${t('start_practice')}` : `▶  ${t('create_game')}`}
              </button>

              <button
                onClick={() => { setMode('idle'); setHostName('') }}
                className="w-full text-zinc-600 hover:text-zinc-400 text-sm font-semibold py-2 transition-colors"
              >
                ← Back
              </button>
            </div>
          ) : (
            <div className="space-y-4" style={{ animation: 'slideUpFadeIn 0.3s ease both' }}>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                  {t('your_name')}
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canJoin && joinGame()}
                  placeholder={t('enter_your_name')}
                  maxLength={20}
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-zinc-600 font-semibold text-base py-4 px-5 rounded-xl outline-none transition-all duration-150"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                  Game code
                </label>
                <input
                  type="text"
                  value={gameCode}
                  onChange={e => setGameCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && canJoin && joinGame()}
                  placeholder="ABC123"
                  maxLength={6}
                  className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-zinc-600 font-display text-2xl text-center tracking-[0.4em] py-4 px-5 rounded-xl outline-none transition-all duration-150"
                />
              </div>

              <button
                onClick={joinGame}
                disabled={!canJoin || isLoading}
                className="w-full py-5 px-6 rounded-2xl font-black text-lg text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: canJoin ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : 'rgba(255,255,255,0.05)',
                  boxShadow: canJoin ? '0 0 30px rgba(79,70,229,0.4)' : 'none',
                  border: canJoin ? 'none' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {isLoading ? t('joining_game') : `▶  ${t('join_game_btn')}`}
              </button>

              <button
                onClick={() => { setMode('idle'); setGameCode(''); setPlayerName('') }}
                className="w-full text-zinc-600 hover:text-zinc-400 text-sm font-semibold py-2 transition-colors"
              >
                ← Back
              </button>
            </div>
          )}
        </div>

        {/* Feature row */}
        <div
          className="flex flex-wrap justify-center gap-2 mt-8"
          style={{ animation: 'slideUpFadeIn 0.5s ease 0.2s both', opacity: 0 }}
        >
          {[
            { icon: '⚡', label: t('feat_speed_buzz') },
            { icon: '🎯', label: t('feat_types') },
            { icon: '📡', label: t('feat_stream') },
            { icon: '🏆', label: t('feat_scoring') },
            { icon: '🤖', label: t('feat_ai') },
          ].map(f => (
            <div
              key={f.label}
              className="flex items-center gap-1.5 text-xs text-zinc-500 border border-zinc-800 bg-white/[0.02] px-3 py-1.5 rounded-full font-semibold"
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
