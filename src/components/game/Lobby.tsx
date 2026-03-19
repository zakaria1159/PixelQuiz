'use client'

import { useEffect, useState } from 'react'
import { QuizSettingsPanel, QuizSettings } from '@/components/game/QuizSettings'
import { useTranslation } from '@/hooks/useTranslation'

interface Player {
  id: string
  name: string
  isHost?: boolean
  score?: number
}

interface LobbyProps {
  gameCode: string
  players: Player[]
  currentPlayerId: string
  isHost: boolean
  isSolo?: boolean
  questionCount?: number
  onStartGame?: (settings: QuizSettings) => void
  onLeaveGame?: () => void
}

const AVATAR_COLORS = [
  'from-blue-600 to-blue-800',
  'from-orange-500 to-orange-700',
  'from-emerald-500 to-emerald-700',
  'from-purple-600 to-purple-800',
  'from-pink-500 to-pink-700',
  'from-yellow-500 to-yellow-700',
  'from-red-500 to-red-700',
  'from-cyan-500 to-cyan-700',
]

function PulsingDots() {
  return (
    <span className="inline-flex gap-1 ml-1.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="inline-block w-1.5 h-1.5 bg-current rounded-full"
          style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </span>
  )
}

function PlayerCard({ player, index, isCurrentPlayer }: { player: Player; index: number; isCurrentPlayer: boolean }) {
  const [visible, setVisible] = useState(false)
  const grad = AVATAR_COLORS[index % AVATAR_COLORS.length]
  const { t } = useTranslation()

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50 + index * 30)
    return () => clearTimeout(t)
  }, [index])

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        background: isCurrentPlayer ? 'rgba(79,70,229,0.1)' : 'rgba(255,255,255,0.03)',
        borderColor: isCurrentPlayer ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)',
      }}
    >
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${grad} font-black text-white text-base flex-shrink-0`}>
        {player.name.charAt(0).toUpperCase()}
      </div>

      {/* Name */}
      <span className="font-semibold text-white flex-1 truncate">{player.name}</span>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {player.isHost && (
          <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/40 font-bold uppercase tracking-wide">
            {t('host_badge')}
          </span>
        )}
        {isCurrentPlayer && (
          <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/40 font-bold uppercase tracking-wide">
            {t('you_badge')}
          </span>
        )}
        <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.7)]" />
      </div>
    </div>
  )
}

export function Lobby({
  gameCode,
  players,
  currentPlayerId,
  isHost,
  isSolo = false,
  questionCount = 0,
  onStartGame,
  onLeaveGame,
}: LobbyProps) {
  const [copied, setCopied] = useState(false)
  const [settings, setSettings] = useState<QuizSettings>({ categories: [], types: [], questionCount: 10, lang: 'en' })
  const { t } = useTranslation()
  const canStart = isSolo ? players.length >= 1 : players.length >= 2
  const nonHostPlayers = players.filter(p => !p.isHost)

  const handleCopy = () => {
    navigator.clipboard.writeText(gameCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-6"
      style={{ background: 'radial-gradient(ellipse at 50% -10%, #13154a 0%, #0f0f1a 50%, #09090f 100%)' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full pointer-events-none opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      <div className="relative z-10 w-full max-w-md flex flex-col gap-6">

        {/* Branding */}
        <div className="text-center" style={{ animation: 'slideUpFadeIn 0.4s ease both' }}>
          <div className="text-xs text-indigo-400 uppercase tracking-[0.4em] mb-2 font-bold">
            {isHost ? t('hosting') : t('joined')}
          </div>
          <h1 className="text-3xl font-display text-white tracking-tight leading-none">
            META<span className="text-indigo-400">QUIZZ</span>
          </h1>
        </div>

        {/* Game code card */}
        <div className="glass p-6 text-center cursor-pointer" onClick={handleCopy} style={{ animation: 'slideUpFadeIn 0.4s ease 0.07s both' }}>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3 font-semibold">{t('game_code')}</div>
          <div
            className="font-display text-5xl text-white tracking-[0.3em] leading-none mb-3"
            style={{ textShadow: '0 0 40px rgba(99,102,241,0.6)' }}
          >
            {gameCode}
          </div>
          <div className={`text-xs font-semibold transition-colors ${copied ? 'text-green-400' : 'text-zinc-600'}`}>
            {copied ? t('copied') : t('click_to_copy')}
          </div>
          {questionCount > 0 && (
            <div className="mt-3 text-xs text-zinc-500">
              <span className="text-indigo-400 font-bold">{questionCount}</span> questions loaded
            </div>
          )}
        </div>

        {/* Players list */}
        <div className="glass p-5" style={{ animation: 'slideUpFadeIn 0.4s ease 0.14s both' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('players')}</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              canStart
                ? 'text-green-400 border-green-800 bg-green-950/50'
                : 'text-yellow-400 border-yellow-800 bg-yellow-950/50'
            }`}>
              {players.length} joined
            </span>
          </div>

          <div className="space-y-2 min-h-[72px]">
            {players.length === 0 ? (
              <div className="flex items-center justify-center h-16 text-zinc-600 text-sm">
                {t('waiting_for_players')}<PulsingDots />
              </div>
            ) : (
              players.map((player, index) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  index={index}
                  isCurrentPlayer={player.id === currentPlayerId}
                />
              ))
            )}
          </div>
        </div>

        {/* Quiz settings — host only */}
        {isHost && (
          <div className="glass p-5" style={{ animation: 'slideUpFadeIn 0.4s ease 0.21s both' }}>
            <QuizSettingsPanel onChange={setSettings} />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3" style={{ animation: 'slideUpFadeIn 0.4s ease 0.28s both', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {isHost ? (
            <>
              {!canStart && (
                <div className="text-center text-sm text-yellow-400 bg-yellow-950/30 border border-yellow-900/50 rounded-2xl px-4 py-3">
                  {t('waiting_for_players')}<PulsingDots />
                </div>
              )}
              <button
                onClick={() => onStartGame?.(settings)}
                disabled={!canStart}
                className="w-full py-5 px-6 rounded-2xl font-black text-lg text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: canStart ? 'linear-gradient(135deg, #059669, #047857)' : 'rgba(255,255,255,0.05)',
                  boxShadow: canStart ? '0 0 40px rgba(5,150,105,0.4)' : 'none',
                  border: canStart ? 'none' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {canStart
                  ? isSolo
                    ? t('start_practice')
                    : `${t('start_game')} · ${nonHostPlayers.length === 1 ? t('player_ready_singular', { n: nonHostPlayers.length }) : t('player_ready_plural', { n: nonHostPlayers.length })}`
                  : t('need_2_players')}
              </button>
            </>
          ) : (
            <div className="text-center text-sm text-blue-400 bg-blue-950/30 border border-blue-900/50 rounded-2xl px-4 py-4">
              {t('waiting_for_host')}<PulsingDots />
            </div>
          )}

          {onLeaveGame && (
            <button
              onClick={onLeaveGame}
              className="w-full py-3 px-6 text-sm text-zinc-600 hover:text-zinc-400 font-semibold transition-colors"
            >
              {t('leave_game')}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
