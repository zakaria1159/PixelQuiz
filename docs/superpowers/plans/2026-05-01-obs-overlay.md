# OBS Overlay + Viewer Join Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated full-screen OBS overlay at `/overlay/[gameCode]`, expose a configurable max-players setting in streamer mode, and show a friendly "game is full" message to viewers who can't join.

**Architecture:** New `src/app/overlay/[gameCode]/page.tsx` reuses the existing `useSpectator` hook with no backend changes. `maxPlayers` is added to `QuizSettings` and applied server-side at game-start time. The "game is full" path in `src/app/game/[gameId]/page.tsx` gets a dedicated UI with a watch link.

**Tech Stack:** Next.js 14 App Router, React, Socket.io (via `useSpectator`), Tailwind CSS utility classes + inline styles (follow existing patterns in the codebase).

---

## File Map

| Action | File | What changes |
|---|---|---|
| Modify | `server.js` | Raise default `maxPlayers` 10→50; apply `maxPlayers` + hard cap 200 at game-start |
| Modify | `src/components/game/QuizSettings.tsx` | Add `maxPlayers` to interface; add `streamerMode` prop; show maxPlayers input when streamer mode on |
| Modify | `src/components/game/Lobby.tsx` | Pass `streamerMode` to `QuizSettingsPanel`; show overlay URL in streamer mode panel |
| Modify | `src/app/game/[gameId]/page.tsx` | Friendly "game is full" screen with `/watch/[gameCode]` link |
| Create | `src/app/overlay/[gameCode]/page.tsx` | Full-screen OBS overlay — all 5 game states |

---

## Task 1: Raise default maxPlayers and apply it at game-start

**Files:**
- Modify: `server.js` (line ~702 for default, line ~926 for game-start handler)

- [ ] **Step 1: Raise the default maxPlayers in game init**

Find this block (around line 700):
```js
settings: {
  maxPlayers: 10,
```
Change to:
```js
settings: {
  maxPlayers: 50,
```

- [ ] **Step 2: Apply maxPlayers from host settings at game-start**

Find this block in the `host-start-game` handler (around line 926, right after `game.settings.streamerMode = ...`):
```js
game.settings.streamerMode = settings?.streamerMode ?? false
```
Add the line below it:
```js
game.settings.streamerMode = settings?.streamerMode ?? false
game.settings.maxPlayers = Math.min(settings?.maxPlayers ?? 50, 200)
```

- [ ] **Step 3: Verify manually**

Start the backend (`npm run dev:server`) and create a game via the host page. In the browser console, confirm the game starts without errors. No automated test needed — the join-error path will be tested in Task 4.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat(streamer): raise default maxPlayers to 50, apply host setting at game-start (cap 200)"
```

---

## Task 2: Add maxPlayers to QuizSettings interface and panel

**Files:**
- Modify: `src/components/game/QuizSettings.tsx`

- [ ] **Step 1: Add `maxPlayers` to the QuizSettings interface**

Find:
```ts
export interface QuizSettings {
  categories: string[]
  types: string[]
  difficulties: string[]
  questionCount: number
  lang: string
  customQuestions?: any[]
  customOnly?: boolean
  streamerMode?: boolean
}
```
Replace with:
```ts
export interface QuizSettings {
  categories: string[]
  types: string[]
  difficulties: string[]
  questionCount: number
  lang: string
  customQuestions?: any[]
  customOnly?: boolean
  streamerMode?: boolean
  maxPlayers?: number
}
```

- [ ] **Step 2: Add `streamerMode` prop to QuizSettingsPanel**

Find:
```ts
interface QuizSettingsPanelProps {
  onChange: (settings: QuizSettings) => void
}
```
Replace with:
```ts
interface QuizSettingsPanelProps {
  onChange: (settings: QuizSettings) => void
  streamerMode?: boolean
}
```

- [ ] **Step 3: Destructure streamerMode and add maxPlayers state**

Find:
```ts
export function QuizSettingsPanel({ onChange }: QuizSettingsPanelProps) {
```
Replace with:
```ts
export function QuizSettingsPanel({ onChange, streamerMode = false }: QuizSettingsPanelProps) {
```

Find the state declarations block (around line with `const [lang, setLang]`):
```ts
const [lang,                setLang]                = useState(storeLang)
```
Add below it:
```ts
const [lang,                setLang]                = useState(storeLang)
const [maxPlayers,          setMaxPlayers]          = useState(50)
```

- [ ] **Step 4: Include maxPlayers in the emit helper**

Find:
```ts
  const emit = (cats: string[], types: string[], diffs: string[], count: number, l: string) =>
    onChange({ categories: cats, types, difficulties: diffs, questionCount: count, lang: l })
```
Replace with:
```ts
  const emit = (cats: string[], types: string[], diffs: string[], count: number, l: string, mp: number = maxPlayers) =>
    onChange({ categories: cats, types, difficulties: diffs, questionCount: count, lang: l, maxPlayers: mp })
```

- [ ] **Step 5: Add maxPlayers input in the JSX, visible only when streamerMode is on**

Find the closing `</div>` of the component's return (the very last `</div>` before the closing of `QuizSettingsPanel`). Add this block just before it:

```tsx
      {/* Max players — streamer mode only */}
      {streamerMode && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
            Max players
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="number"
              min={2}
              max={200}
              value={maxPlayers}
              onChange={(e) => {
                const val = Math.min(200, Math.max(2, Number(e.target.value)))
                setMaxPlayers(val)
                emit(selectedCategories, selectedTypes, selectedDifficulties, questionCount, lang, val)
              }}
              style={{
                width: '80px',
                padding: '8px 10px',
                borderRadius: '10px',
                border: '1.5px solid rgba(99,102,241,0.4)',
                background: 'rgba(99,102,241,0.1)',
                color: '#c7d2fe',
                fontWeight: 700,
                fontSize: '15px',
                textAlign: 'center',
              }}
            />
            <span style={{ fontSize: '12px', color: '#52525b' }}>players max (2–200)</span>
          </div>
        </div>
      )}
```

- [ ] **Step 6: Run type-check**

```bash
npm run type-check
```
Expected: no errors related to QuizSettings or QuizSettingsPanel.

- [ ] **Step 7: Commit**

```bash
git add src/components/game/QuizSettings.tsx
git commit -m "feat(streamer): add configurable maxPlayers to QuizSettings, shown only in streamer mode"
```

---

## Task 3: Pass streamerMode to QuizSettingsPanel and show overlay URL in Lobby

**Files:**
- Modify: `src/components/game/Lobby.tsx`

- [ ] **Step 1: Compute the overlay URL alongside the watch URL**

Find:
```ts
const watchUrl = typeof window !== 'undefined' ? `${window.location.origin}/watch/${gameCode}` : `/watch/${gameCode}`
```
Add below it:
```ts
const watchUrl = typeof window !== 'undefined' ? `${window.location.origin}/watch/${gameCode}` : `/watch/${gameCode}`
const overlayUrl = typeof window !== 'undefined' ? `${window.location.origin}/overlay/${gameCode}` : `/overlay/${gameCode}`
```

- [ ] **Step 2: Pass streamerMode to QuizSettingsPanel**

Find:
```tsx
            <QuizSettingsPanel onChange={setSettings} />
```
Replace with:
```tsx
            <QuizSettingsPanel onChange={setSettings} streamerMode={streamerMode} />
```

- [ ] **Step 3: Add the overlay URL row in the streamer mode expanded panel**

Find this block inside the `{streamerMode && (` section:
```tsx
                {/* Watch link */}
                <div>
                  <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 600, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Watch link (share with chat)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', padding: '8px 10px' }}>
                    <span style={{ flex: 1, fontSize: '11px', color: '#818cf8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{watchUrl}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(watchUrl) }}
                      style={{ fontSize: '9px', fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.15)', border: 'none', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', flexShrink: 0 }}
                    >
                      COPY
                    </button>
                  </div>
                </div>
```
Replace with:
```tsx
                {/* Watch link */}
                <div>
                  <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 600, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Watch link (share with chat)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', padding: '8px 10px' }}>
                    <span style={{ flex: 1, fontSize: '11px', color: '#818cf8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{watchUrl}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(watchUrl) }}
                      style={{ fontSize: '9px', fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.15)', border: 'none', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', flexShrink: 0 }}
                    >
                      COPY
                    </button>
                  </div>
                </div>

                {/* OBS overlay link */}
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 600, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    OBS overlay (add as browser source)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '8px', padding: '8px 10px' }}>
                    <span style={{ flex: 1, fontSize: '11px', color: '#c4b5fd', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{overlayUrl}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(overlayUrl) }}
                      style={{ fontSize: '9px', fontWeight: 700, color: '#a855f7', background: 'rgba(168,85,247,0.15)', border: 'none', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', flexShrink: 0 }}
                    >
                      COPY
                    </button>
                  </div>
                </div>
```

- [ ] **Step 4: Run type-check**

```bash
npm run type-check
```
Expected: no errors.

- [ ] **Step 5: Verify manually**

Open the host lobby, toggle Streamer Mode on. Confirm:
- The QuizSettings panel now shows a "Max players" input
- The streamer mode panel shows both "Watch link" and "OBS overlay" rows with copy buttons

- [ ] **Step 6: Commit**

```bash
git add src/components/game/Lobby.tsx
git commit -m "feat(streamer): show overlay URL in lobby and pass streamerMode to QuizSettingsPanel"
```

---

## Task 4: Friendly "game is full" screen on the join page

**Files:**
- Modify: `src/app/game/[gameId]/page.tsx`

- [ ] **Step 1: Add a game-full check before the generic connectionError block**

Find this block (around line 182):
```tsx
  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Card className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-bold mb-4 text-white">{t('connection_error')}</h2>
          <p className="text-red-400 mb-4">{connectionError}</p>
          <Button onClick={clearError} variant="primary">
            {t('try_again')}
          </Button>
        </Card>
      </div>
    )
  }
```
Replace with:
```tsx
  if (connectionError === 'Game is full') {
    const watchLink = `/watch/${gameCode}`
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at 50% -10%, #13154a 0%, #09090f 70%)', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '360px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎭</div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'white', marginBottom: '10px' }}>Game is full</h2>
          <p style={{ fontSize: '14px', color: '#71717a', marginBottom: '24px', lineHeight: 1.6 }}>
            All player slots are taken, but you can still watch the action live.
          </p>
          <a
            href={watchLink}
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              borderRadius: '12px',
              background: 'rgba(99,102,241,0.2)',
              border: '1px solid rgba(99,102,241,0.4)',
              color: '#a5b4fc',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            Watch live →
          </a>
          <div style={{ marginTop: '16px' }}>
            <button
              onClick={clearError}
              style={{ background: 'none', border: 'none', color: '#52525b', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Card className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-bold mb-4 text-white">{t('connection_error')}</h2>
          <p className="text-red-400 mb-4">{connectionError}</p>
          <Button onClick={clearError} variant="primary">
            {t('try_again')}
          </Button>
        </Card>
      </div>
    )
  }
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```
Expected: no errors.

- [ ] **Step 3: Verify manually**

Temporarily change `maxPlayers` to 1 in server.js game init, start a game, join as a second player. Confirm you see the "Game is full" screen with a "Watch live →" link. Revert the temporary change after testing.

- [ ] **Step 4: Commit**

```bash
git add src/app/game/\[gameId\]/page.tsx
git commit -m "feat(streamer): show friendly 'game is full' screen with watch link"
```

---

## Task 5: Build the OBS overlay page

**Files:**
- Create: `src/app/overlay/[gameCode]/page.tsx`

This page is self-contained — it uses `useSpectator` exactly like `src/app/watch/[gameCode]/page.tsx`, but is built for 1920×1080 full-screen OBS rendering. No shared layout, no scrollbars.

- [ ] **Step 1: Create the file with the connecting and error states**

Create `src/app/overlay/[gameCode]/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSpectator } from '@/hooks/useSpectator'
import { hasOptions, isImageGuessQuestion, isPixelRevealQuestion, isFlagGuessQuestion, isMusicGuessQuestion, isAnimalSoundQuestion } from '@/types/question'
import { MusicPlayer } from '@/components/game/MusicPlayer'

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

const BG = 'radial-gradient(ellipse at 50% -10%, #13154a 0%, #0f0f1a 50%, #09090f 100%)'

function TimerBar({ timeLimit, questionStartTime }: { timeLimit: number; questionStartTime: number }) {
  const [timeLeft, setTimeLeft] = useState(timeLimit)

  useEffect(() => {
    setTimeLeft(timeLimit)
    const interval = setInterval(() => {
      const elapsed = (Date.now() - questionStartTime) / 1000
      const remaining = Math.max(0, timeLimit - elapsed)
      setTimeLeft(Math.ceil(remaining))
      if (remaining <= 0) clearInterval(interval)
    }, 250)
    return () => clearInterval(interval)
  }, [timeLimit, questionStartTime])

  const pct = (timeLeft / timeLimit) * 100
  const color = pct > 50 ? '#6366f1' : pct > 25 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Time</span>
        <span style={{ fontSize: '48px', fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{timeLeft}</span>
      </div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '6px', width: `${pct}%`, background: color, borderRadius: '99px', transition: 'width 0.25s linear, background 0.5s' }} />
      </div>
    </div>
  )
}

export default function OverlayPage() {
  const params = useParams()
  const gameCode = params.gameCode as string
  const {
    gameState,
    gameStatus,
    spectatorCount,
    playerAnswers,
    correctAnswerText,
    timeLimit,
    questionStartTime,
    isConnected,
    error,
  } = useSpectator(gameCode)

  // Connecting
  if (!isConnected || error) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center' }}>
          {error ? (
            <>
              <div style={{ fontSize: '64px', marginBottom: '24px' }}>🚫</div>
              <p style={{ color: '#71717a', fontSize: '20px', fontWeight: 700 }}>{error}</p>
            </>
          ) : (
            <>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '4px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
              <p style={{ color: '#52525b', fontSize: '18px', fontWeight: 700 }}>Connecting...</p>
            </>
          )}
        </div>
      </div>
    )
  }

  // Lobby / waiting
  if (!gameState || gameStatus === 'waiting') {
    const host = gameState?.players?.find(p => p.id === gameState?.hostId)
    return (
      <div style={{ width: '100vw', height: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '72px', fontWeight: 900, color: 'white', letterSpacing: '-2px', marginBottom: '16px' }}>
            META<span style={{ color: '#6366f1' }}>QUIZZ</span>
          </h1>
          <div style={{ fontSize: '24px', color: '#52525b', fontWeight: 700, marginBottom: '48px' }}>
            {gameState?.players?.length ?? 0} players in lobby{host ? ` · hosted by ${host.name}` : ''}
          </div>
          <div style={{ fontSize: '20px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '16px' }}>Join the game</div>
          <div style={{ fontSize: '96px', fontWeight: 900, color: 'white', letterSpacing: '0.3em', textShadow: '0 0 80px rgba(99,102,241,0.6)' }}>{gameCode}</div>
          {spectatorCount > 0 && (
            <div style={{ marginTop: '32px', fontSize: '18px', color: '#52525b' }}>{spectatorCount} watching</div>
          )}
        </div>
      </div>
    )
  }

  // Final results
  if (gameStatus === 'final_results' && gameState?.finalResults) {
    const sorted = [...gameState.finalResults].sort((a, b) => b.score - a.score)
    const top3 = sorted.slice(0, 3)
    const rest = sorted.slice(3)
    const medals = ['🥇', '🥈', '🥉']
    const podiumSizes = ['96px', '72px', '64px']

    return (
      <div style={{ width: '100vw', height: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '48px' }}>
        <div style={{ fontSize: '24px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '48px' }}>Final Results</div>
        {/* Podium top 3 */}
        <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-end', marginBottom: '48px' }}>
          {top3.map((r, i) => (
            <div key={r.playerId} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: podiumSizes[i], lineHeight: 1, marginBottom: '12px' }}>{medals[i]}</div>
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} font-black text-white text-3xl mx-auto mb-3`}>
                {r.playerName.charAt(0).toUpperCase()}
              </div>
              <div style={{ fontSize: i === 0 ? '28px' : '22px', fontWeight: 900, color: 'white', marginBottom: '6px' }}>{r.playerName}</div>
              <div style={{ fontSize: i === 0 ? '24px' : '20px', fontWeight: 900, color: '#a5b4fc' }}>{r.score.toLocaleString()}</div>
            </div>
          ))}
        </div>
        {/* Rest of leaderboard */}
        {rest.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '400px' }}>
            {rest.map((r, i) => (
              <div key={r.playerId} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '12px 20px' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#52525b', width: '28px' }}>{i + 4}</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${AVATAR_COLORS[(i + 3) % AVATAR_COLORS.length]} font-black text-white text-base flex-shrink-0`}>
                  {r.playerName.charAt(0).toUpperCase()}
                </div>
                <span style={{ flex: 1, fontSize: '18px', fontWeight: 700, color: 'white' }}>{r.playerName}</span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#a5b4fc' }}>{r.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Active question / results
  const question = gameState?.currentQuestion
  const players = gameState?.players ?? []
  const leaderboard = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5)
  const isResults = gameStatus === 'question_results'

  return (
    <div style={{ width: '100vw', height: '100vh', background: BG, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ fontSize: '28px', fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
          META<span style={{ color: '#6366f1' }}>QUIZZ</span>
          <span style={{ fontSize: '13px', color: '#52525b', fontWeight: 600, marginLeft: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live</span>
        </div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#71717a' }}>
          Question {(gameState?.currentQuestionIndex ?? 0) + 1} / {gameState?.questions?.length ?? 0}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', color: '#71717a', fontWeight: 700 }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.7)' }} />
          {spectatorCount} watching
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', gap: '0', minHeight: 0 }}>
        {/* Center: question */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 60px', gap: '32px' }}>
          {/* Timer (question phase only) */}
          {!isResults && gameStatus === 'question' && question && (
            <div style={{ width: '100%', maxWidth: '700px' }}>
              <TimerBar timeLimit={timeLimit} questionStartTime={questionStartTime} />
            </div>
          )}

          {/* Media */}
          {question && isFlagGuessQuestion(question) && (
            <img
              src={`https://flagcdn.com/w640/${question.countryCode.toLowerCase()}.png`}
              alt="Flag"
              style={{ maxHeight: '200px', objectFit: 'contain', borderRadius: '12px' }}
            />
          )}
          {question && (isImageGuessQuestion(question) || isPixelRevealQuestion(question)) && question.imageUrl && (
            <img
              src={question.imageUrl}
              alt="Question"
              style={{ maxHeight: '240px', objectFit: 'contain', borderRadius: '12px' }}
            />
          )}
          {question && (isMusicGuessQuestion(question) || isAnimalSoundQuestion(question)) && (
            <MusicPlayer
              deezerQuery={isMusicGuessQuestion(question) ? question.deezerQuery : undefined}
              audioUrl={isAnimalSoundQuestion(question) ? question.audioUrl : undefined}
              allowedDuration={timeLimit}
              hasAnswered={false}
            />
          )}

          {/* Question text */}
          {question && (
            <div style={{ fontSize: '36px', fontWeight: 800, color: 'white', textAlign: 'center', lineHeight: 1.4, maxWidth: '800px' }}>
              {question.question}
            </div>
          )}

          {/* Options grid */}
          {question && hasOptions(question) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', maxWidth: '800px' }}>
              {question.options.map((opt, i) => {
                const isCorrect = isResults && correctAnswerText !== null && opt === correctAnswerText
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '16px',
                      background: isCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `2px solid ${isCorrect ? 'rgba(34,197,94,0.6)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '16px', padding: '16px 20px',
                      transition: 'background 0.4s, border-color 0.4s',
                      transform: isCorrect ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                      background: isCorrect ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.2)',
                      color: isCorrect ? '#4ade80' : '#818cf8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', fontWeight: 800,
                    }}>
                      {isCorrect ? '✓' : String.fromCharCode(65 + i)}
                    </div>
                    <span style={{ fontSize: '22px', color: isCorrect ? '#86efac' : '#e4e4e7', fontWeight: isCorrect ? 800 : 600 }}>{opt}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Free-text correct answer reveal */}
          {question && !hasOptions(question) && isResults && correctAnswerText && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.5)', borderRadius: '16px', padding: '20px 28px' }}>
              <span style={{ fontSize: '28px' }}>✓</span>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#86efac' }}>{correctAnswerText}</span>
            </div>
          )}
        </div>

        {/* Right sidebar: leaderboard + join code */}
        <div style={{ width: '300px', flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', padding: '32px 24px', gap: '24px' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '16px' }}>Leaderboard</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {leaderboard.map((player, i) => (
                <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: i === 0 ? '#f59e0b' : '#52525b', width: '24px' }}>
                    {i === 0 ? '🥇' : i + 1}
                  </span>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} font-black text-white text-base flex-shrink-0`}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontSize: '16px', fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</span>
                  <span style={{ fontSize: '16px', fontWeight: 900, color: '#a5b4fc' }}>{(player.score ?? 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Join code */}
          <div style={{ marginTop: 'auto', textAlign: 'center', padding: '20px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '16px' }}>
            <div style={{ fontSize: '12px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px' }}>Join the game</div>
            <div style={{ fontSize: '40px', fontWeight: 900, color: 'white', letterSpacing: '0.25em' }}>{gameCode}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```
Expected: no errors. If you see errors about `question.countryCode` or `question.imageUrl`, check `src/types/question.ts` for the correct property names — they should match what `src/app/watch/[gameCode]/page.tsx` uses.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```
Fix any lint errors reported.

- [ ] **Step 4: Verify the overlay manually**

1. Start both servers (`npm run dev` and `npm run dev:server`)
2. Create a game as host, enable Streamer Mode in the lobby
3. Copy the OBS overlay URL shown in the lobby (e.g. `http://localhost:3001/overlay/ABC123`)
4. Open it in a browser — you should see the lobby/waiting state with the game code large in the center
5. Start the game — confirm the question appears with timer bar, options, and leaderboard sidebar
6. After the question timer expires — confirm the correct answer highlights green
7. Let the game finish — confirm the podium/final results screen appears

- [ ] **Step 5: Commit**

```bash
git add src/app/overlay/
git commit -m "feat(streamer): add full-screen OBS overlay page at /overlay/[gameCode]"
```

---

## Final check

- [ ] Run `npm run type-check` — expect zero errors
- [ ] Run `npm run lint` — expect zero errors
- [ ] Play through a complete game with streamer mode on and confirm all overlay states render correctly at full browser width
