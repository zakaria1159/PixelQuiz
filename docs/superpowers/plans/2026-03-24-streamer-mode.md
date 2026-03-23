# Streamer Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in streamer mode to the host lobby that generates a public `/watch/[gameCode]` spectator page and `/overlay/[gameCode]` OBS overlay, letting viewers follow the game live without participating.

**Architecture:** Spectators join the existing Socket.io game room via a new `spectator-join` event and receive existing broadcasts read-only. A new `player-answered` event is emitted only to spectator sockets so active players cannot see opponents' answers via DevTools. Two new Next.js routes render the watch and overlay UIs using a new `useSpectator` hook.

**Tech Stack:** Next.js 14 App Router, Socket.io client v4, Zustand, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-24-streamer-mode-design.md`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/types/game.ts` | Modify | Add `streamerMode` to `GameSettings`, change `spectators` to `string[]` |
| `server.js` | Modify | Add `spectators` Map, `spectator-join` handler, disconnect cleanup, `player-answered` emit, `streamerMode` persistence |
| `src/lib/socket.ts` | Modify | Add spectator emit/listener methods |
| `src/hooks/useSpectator.ts` | Create | Read-only hook for watch/overlay pages |
| `src/components/game/Lobby.tsx` | Modify | Add StreamerModeCard with toggle and links |
| `src/app/watch/[gameCode]/page.tsx` | Create | Public spectator watch page |
| `src/app/overlay/[gameCode]/page.tsx` | Create | Transparent OBS browser source overlay |

---

## Task 1: TypeScript Type Changes

**Files:**
- Modify: `src/types/game.ts`

- [ ] **Step 1: Update `GameSettings` and `GameState` types**

In `src/types/game.ts`, make two changes:

```typescript
export interface GameSettings {
  maxPlayers: number
  questionsPerGame: number
  timePerQuestion: number
  categories: QuestionCategory[]
  difficulty: QuestionDifficulty | 'mixed'
  aiGenerated: boolean
  showExplanations: boolean
  allowSpectators: boolean
  streamerMode?: boolean   // ADD THIS
}

export interface GameState {
  id: string
  hostId: string
  players: Player[]
  spectators: string[]    // CHANGE FROM Player[] TO string[]
  // ... rest unchanged
}
```

- [ ] **Step 2: Verify type-check passes**

```bash
npm run type-check
```

Expected: no errors related to `spectators` or `streamerMode`.

- [ ] **Step 3: Commit**

```bash
git add src/types/game.ts
git commit -m "feat: add streamerMode to GameSettings, change spectators to string[]"
```

---

## Task 2: Server — Spectator Infrastructure

**Files:**
- Modify: `server.js` (lines 660-661 for Maps, ~881 for host-start-game, ~940 for submit-answer, ~1806 for disconnect)

### Step 1: Add top-level `spectators` Map

After line 661 (`const players = new Map()`), add:

- [ ] **Add the spectators Map**

```js
const spectators = new Map() // socketId → { gameCode }
```

### Step 2: Add `spectator-join` handler

Inside `io.on('connection', (socket) => { ... })`, add the handler (place it near the other `socket.on` handlers, after the `player-join-game` handler):

- [ ] **Add spectator-join handler**

```js
socket.on('spectator-join', ({ gameCode }) => {
  try {
    const game = games.get(gameCode)
    if (!game) {
      socket.emit('spectator-error', { message: 'Game not found' })
      return
    }
    if (!game.settings.streamerMode) {
      socket.emit('spectator-error', { message: 'Streamer mode is not enabled for this game' })
      return
    }

    socket.join(gameCode)
    spectators.set(socket.id, { gameCode })
    game.spectators.push(socket.id)

    // Sanitize gameState: strip answers during active question to avoid leaking correctness data
    const safeGameState = { ...game }
    if (game.gameStatus === 'question') {
      safeGameState.answers = {}
    }

    socket.emit('spectator-joined', { gameState: safeGameState })
    io.to(gameCode).emit('spectator-count-updated', { count: game.spectators.length })

    console.log(`👁 Spectator joined game ${gameCode} (total: ${game.spectators.length})`)
  } catch (error) {
    console.error('Error in spectator-join:', error)
    socket.emit('spectator-error', { message: 'Failed to join as spectator' })
  }
})
```

### Step 3: Add spectator disconnect cleanup

In the existing `disconnect` handler, **after** the `players.delete(socket.id)` line, add:

- [ ] **Add spectator disconnect cleanup**

```js
// Spectator disconnect cleanup
if (spectators.has(socket.id)) {
  const { gameCode } = spectators.get(socket.id)
  spectators.delete(socket.id)
  const game = games.get(gameCode)
  if (game) {
    game.spectators = game.spectators.filter(id => id !== socket.id)
    io.to(gameCode).emit('spectator-count-updated', { count: game.spectators.length })
    console.log(`👁 Spectator left game ${gameCode} (total: ${game.spectators.length})`)
  }
}
```

### Step 4: Emit `player-answered` to spectators only

In the `submit-answer` handler, right after the `io.to(gameCode).emit('answer-status-updated', ...)` call (around line 1005), add:

- [ ] **Emit player-answered to spectators only**

```js
// Notify spectators of the raw answer (spectator-only, not broadcast to room)
if (game.spectators.length > 0) {
  const playerObj = game.players.find(p => p.id === socket.id)
  game.spectators.forEach(spectatorId => {
    io.to(spectatorId).emit('player-answered', {
      playerId: socket.id,
      playerName: playerObj?.name || 'Unknown',
      answer: answerText
    })
  })
}
```

### Step 5: Persist `streamerMode` in game settings

In the `host-start-game` handler, after `game.questions = questions` (around line 910), add:

- [ ] **Persist streamerMode setting**

```js
game.settings.streamerMode = settings?.streamerMode ?? false
```

- [ ] **Step 6: Start both servers and manually verify spectator-join works**

```bash
# Terminal 1
npm run dev:server

# Terminal 2
npm run dev
```

Open browser console on any game page and run:
```js
// In browser console after a host creates a game
socketManager.getSocket().emit('spectator-join', { gameCode: 'XXXXXX' })
// Expected: 'spectator-error' event with "Streamer mode is not enabled"
```

- [ ] **Step 7: Commit**

```bash
git add server.js
git commit -m "feat: add spectator-join handler, player-answered event, streamerMode persistence"
```

---

## Task 3: Socket Client Methods

**Files:**
- Modify: `src/lib/socket.ts`

- [ ] **Step 1: Add spectator emit and listener methods**

In `src/lib/socket.ts`, add the following methods to the `SocketManager` class (place them before `offAllGameEvents`):

```typescript
// Spectator methods
spectatorJoin(gameCode: string) {
  this.socket?.emit('spectator-join', { gameCode })
}

onSpectatorJoined(callback: (data: { gameState: any }) => void) {
  this.socket?.on('spectator-joined', callback)
}

onSpectatorError(callback: (data: { message: string }) => void) {
  this.socket?.on('spectator-error', callback)
}

onSpectatorCountUpdated(callback: (data: { count: number }) => void) {
  this.socket?.on('spectator-count-updated', callback)
}

onPlayerAnswered(callback: (data: { playerId: string; playerName: string; answer: string }) => void) {
  this.socket?.on('player-answered', callback)
}
```

Also add `'spectator-joined'`, `'spectator-error'`, `'spectator-count-updated'`, `'player-answered'` to the `offAllGameEvents` events array.

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/socket.ts
git commit -m "feat: add spectator socket methods to SocketManager"
```

---

## Task 4: `useSpectator` Hook

**Files:**
- Create: `src/hooks/useSpectator.ts`

- [ ] **Step 1: Create the hook**

```typescript
'use client'

import { useEffect, useState, useRef } from 'react'
import socketManager from '@/lib/socket'
import type { GameState, GameStatus } from '@/types/game'

interface PlayerAnswer {
  playerId: string
  playerName: string
  answer: string
}

interface SpectatorState {
  gameState: GameState | null
  gameStatus: GameStatus | null
  spectatorCount: number
  playerAnswers: Record<string, PlayerAnswer> // playerId → answer
  timeLimit: number
  questionStartTime: number
  isConnected: boolean
  error: string | null
}

export function useSpectator(gameCode: string) {
  const [state, setState] = useState<SpectatorState>({
    gameState: null,
    gameStatus: null,
    spectatorCount: 0,
    playerAnswers: {},
    timeLimit: 30,
    questionStartTime: 0,
    isConnected: false,
    error: null,
  })
  const gameCodeRef = useRef(gameCode)

  useEffect(() => {
    const socket = socketManager.connect()

    const joinAsSpectator = () => {
      socketManager.spectatorJoin(gameCodeRef.current)
    }

    // Join on connect
    socket.on('connect', () => {
      setState(s => ({ ...s, isConnected: true }))
      joinAsSpectator()
    })

    // Rejoin on reconnect (Manager-level event)
    socket.io.on('reconnect', () => {
      joinAsSpectator()
    })

    // If already connected, join immediately
    if (socket.connected) {
      setState(s => ({ ...s, isConnected: true }))
      joinAsSpectator()
    }

    socket.on('disconnect', () => {
      setState(s => ({ ...s, isConnected: false }))
    })

    socketManager.onSpectatorJoined(({ gameState }) => {
      setState(s => ({
        ...s,
        gameState,
        gameStatus: gameState.gameStatus,
        error: null,
      }))
    })

    socketManager.onSpectatorError(({ message }) => {
      setState(s => ({ ...s, error: message }))
    })

    socketManager.onSpectatorCountUpdated(({ count }) => {
      setState(s => ({ ...s, spectatorCount: count }))
    })

    socketManager.onGameStateUpdated(({ gameState }) => {
      setState(s => ({
        ...s,
        gameState,
        gameStatus: gameState.gameStatus,
      }))
    })

    socketManager.onQuestionStart((data) => {
      setState(s => ({
        ...s,
        gameStatus: 'question',
        playerAnswers: {}, // reset per question
        timeLimit: data.timeLimit,
        questionStartTime: Date.now(),
      }))
    })

    socketManager.onPlayerAnswered((data) => {
      setState(s => ({
        ...s,
        playerAnswers: {
          ...s.playerAnswers,
          [data.playerId]: data,
        },
      }))
    })

    socketManager.onQuestionScores((data) => {
      setState(s => ({
        ...s,
        gameStatus: 'question_results',
      }))
    })

    socketManager.onGameFinished(({ gameState }) => {
      setState(s => ({
        ...s,
        gameState,
        gameStatus: 'final_results',
      }))
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.io.off('reconnect')
      socketManager.offAllGameEvents()
    }
  }, [])

  return state
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSpectator.ts
git commit -m "feat: add useSpectator hook for read-only game state"
```

---

## Task 5: Lobby — Streamer Mode Card

**Files:**
- Modify: `src/components/game/Lobby.tsx`

- [ ] **Step 1: Add streamerMode state and spectator count listener**

In `Lobby.tsx`, add state and socket listener. At the top of the `Lobby` component function body, add:

```typescript
const [streamerMode, setStreamerMode] = useState(false)
const [spectatorCount, setSpectatorCount] = useState(0)
const watchUrl = typeof window !== 'undefined' ? `${window.location.origin}/watch/${gameCode}` : `/watch/${gameCode}`
const overlayUrl = typeof window !== 'undefined' ? `${window.location.origin}/overlay/${gameCode}` : `/overlay/${gameCode}`
```

Also add a `useEffect` for spectator count (add it alongside the existing useEffects):

```typescript
useEffect(() => {
  socketManager.onSpectatorCountUpdated(({ count }) => {
    setSpectatorCount(count)
  })
  return () => {
    socketManager.getSocket()?.off('spectator-count-updated')
  }
}, [])
```

Don't forget to add `import socketManager from '@/lib/socket'` if not already imported.

- [ ] **Step 2: Add StreamerModeCard JSX**

In the `Lobby` component return, add the following section after the custom question builder block and before the Actions block (`{/* Actions */}`):

```tsx
{/* Streamer Mode — host only */}
{isHost && (
  <div className="glass" style={{ animation: 'slideUpFadeIn 0.4s ease 0.28s both', overflow: 'hidden' }}>
    <button
      onClick={() => setStreamerMode(v => !v)}
      style={{
        width: '100%', padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'none', border: 'none', cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px' }}>📡</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>
            Streamer Mode
            {streamerMode && spectatorCount > 0 && (
              <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 700, background: 'rgba(34,197,94,0.2)', color: '#4ade80', padding: '1px 7px', borderRadius: '99px' }}>
                {spectatorCount} watching
              </span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: '#52525b', marginTop: '1px' }}>
            Share your game with viewers
          </div>
        </div>
      </div>
      {/* Toggle */}
      <div style={{
        width: '36px', height: '20px', borderRadius: '99px',
        background: streamerMode ? '#6366f1' : 'rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', padding: '2px',
        transition: 'background 0.2s',
        boxShadow: streamerMode ? '0 0 12px rgba(99,102,241,0.4)' : 'none',
        flexShrink: 0,
      }}>
        <div style={{
          width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
          transform: streamerMode ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform 0.2s',
        }} />
      </div>
    </button>

    {streamerMode && (
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '16px' }} />

        {/* Watch link */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 600, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Watch link (share with chat)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', padding: '8px 10px' }}>
            <span style={{ flex: 1, fontSize: '11px', color: '#818cf8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{watchUrl}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(watchUrl) }}
              style={{ fontSize: '9px', fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.15)', border: 'none', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', flexShrink: 0 }}
            >
              COPY
            </button>
          </div>
        </div>

        {/* OBS overlay link */}
        <div>
          <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 600, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            OBS overlay (browser source)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', padding: '8px 10px' }}>
            <span style={{ flex: 1, fontSize: '11px', color: '#818cf8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{overlayUrl}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(overlayUrl) }}
              style={{ fontSize: '9px', fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.15)', border: 'none', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', flexShrink: 0 }}
            >
              COPY
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 3: Pass `streamerMode` through `onStartGame`**

Find the Start Game button `onClick`:
```tsx
onClick={() => onStartGame?.({ ...settings, customQuestions, customOnly })}
```

Change to:
```tsx
onClick={() => onStartGame?.({ ...settings, customQuestions, customOnly, streamerMode })}
```

- [ ] **Step 4: Type-check and lint**

```bash
npm run type-check && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/Lobby.tsx
git commit -m "feat: add StreamerModeCard to lobby with toggle, watch link, overlay link"
```

---

## Task 6: Watch Page

**Files:**
- Create: `src/app/watch/[gameCode]/page.tsx`

- [ ] **Step 1: Create the watch page**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSpectator } from '@/hooks/useSpectator'

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
        <span key={i} className="inline-block w-1.5 h-1.5 bg-current rounded-full"
          style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </span>
  )
}

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
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 600 }}>Time left</span>
        <span style={{ fontSize: '22px', fontWeight: 900, color, lineHeight: 1 }}>{timeLeft}</span>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '4px', width: `${pct}%`, background: color, borderRadius: '99px', transition: 'width 0.25s linear, background 0.5s' }} />
      </div>
    </div>
  )
}

export default function WatchPage() {
  const params = useParams()
  const gameCode = params.gameCode as string
  const { gameState, gameStatus, spectatorCount, playerAnswers, timeLimit, questionStartTime, isConnected, error } = useSpectator(gameCode)

  const bg = 'radial-gradient(ellipse at 50% -10%, #13154a 0%, #0f0f1a 50%, #09090f 100%)'

  // Error state
  if (error) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, padding: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <h2 style={{ color: 'white', fontWeight: 800, fontSize: '20px', marginBottom: '8px' }}>Cannot join as spectator</h2>
          <p style={{ color: '#71717a', fontSize: '14px' }}>{error}</p>
        </div>
      </div>
    )
  }

  // Connecting
  if (!isConnected) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
          <p style={{ color: '#52525b', fontSize: '13px', fontWeight: 600 }}>Connecting...</p>
        </div>
      </div>
    )
  }

  // Waiting / lobby
  if (!gameState || gameStatus === 'waiting') {
    const host = gameState?.players?.find(p => p.id === gameState?.hostId)
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '320px' }}>
          <div style={{ fontSize: '11px', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '8px', fontWeight: 700 }}>Spectating</div>
          <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'white', marginBottom: '24px', letterSpacing: '-0.5px' }}>
            META<span style={{ color: '#6366f1' }}>QUIZZ</span>
          </h1>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '6px' }}>Game Code</div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: 'white', letterSpacing: '0.3em', marginBottom: '12px' }}>{gameCode}</div>
            <div style={{ fontSize: '13px', color: '#71717a' }}>
              {gameState?.players?.length ?? 0} players in lobby
              {host ? ` · Hosted by ${host.name}` : ''}
            </div>
          </div>
          <div style={{ fontSize: '14px', color: '#6366f1', fontWeight: 600 }}>
            Game starting soon<PulsingDots />
          </div>
          {spectatorCount > 0 && (
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#52525b' }}>
              {spectatorCount} watching
            </div>
          )}
        </div>
      </div>
    )
  }

  // Game finished
  if (gameStatus === 'final_results' && gameState?.finalResults) {
    const sorted = [...gameState.finalResults].sort((a, b) => b.score - a.score)
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏆</div>
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'white' }}>Final Results</h2>
            <p style={{ fontSize: '12px', color: '#52525b', marginTop: '4px' }}>{spectatorCount} spectators watched</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sorted.map((result, i) => (
              <div key={result.playerId} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '12px 16px' }}>
                <span style={{ fontSize: '16px', fontWeight: 900, color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#52525b', width: '24px' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} font-black text-white text-sm flex-shrink-0`}>
                  {result.playerName.charAt(0).toUpperCase()}
                </div>
                <span style={{ flex: 1, fontSize: '14px', fontWeight: 700, color: 'white' }}>{result.playerName}</span>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#a5b4fc' }}>{result.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Active question
  const question = gameState?.currentQuestion
  const players = gameState?.players ?? []
  const leaderboard = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  return (
    <div style={{ minHeight: '100svh', background: bg, padding: '16px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ fontSize: '16px', fontWeight: 900, color: 'white' }}>
            META<span style={{ color: '#6366f1' }}>QUIZZ</span>
            <span style={{ fontSize: '11px', color: '#52525b', fontWeight: 600, marginLeft: '8px' }}>Live</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#71717a', fontWeight: 600 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
            {spectatorCount} watching
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

          {/* Left: question + player answers */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Question progress */}
            <div style={{ fontSize: '11px', color: '#71717a', fontWeight: 600, marginBottom: '8px' }}>
              Question {(gameState?.currentQuestionIndex ?? 0) + 1} of {gameState?.questions?.length ?? 0}
            </div>

            {/* Timer */}
            {gameStatus === 'question' && (
              <TimerBar timeLimit={timeLimit} questionStartTime={questionStartTime} />
            )}

            {/* Question card */}
            {question && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '12px', lineHeight: 1.5 }}>
                  {question.question}
                </div>
                {question.options && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {question.options.map((opt: string, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 10px' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '6px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, flexShrink: 0 }}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600 }}>{opt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Player answer tracker */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Player Answers
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {players.map((player, i) => {
                  const answered = playerAnswers[player.id]
                  const grad = AVATAR_COLORS[i % AVATAR_COLORS.length]
                  return (
                    <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br ${grad} font-black text-white text-xs flex-shrink-0`}>
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ flex: 1, fontSize: '12px', fontWeight: 600, color: '#e4e4e7' }}>{player.name}</span>
                      {answered ? (
                        <span style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '99px', border: '1px solid rgba(99,102,241,0.3)' }}>
                          {answered.answer}
                        </span>
                      ) : (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right: leaderboard */}
          <div style={{ width: '160px', flexShrink: 0 }}>
            <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Leaderboard
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {leaderboard.map((player, i) => (
                <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 0', borderBottom: i < leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#52525b', width: '14px' }}>{i + 1}</span>
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} font-black text-white text-xs flex-shrink-0`}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontSize: '11px', fontWeight: 600, color: '#e4e4e7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</span>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#a5b4fc' }}>{(player.score ?? 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Manual test — open watch page before game starts**

1. Host creates a game with streamer mode enabled
2. Open `/watch/[gameCode]` in another browser tab
3. Expected: waiting screen with "Game starting soon" and player count

- [ ] **Step 4: Commit**

```bash
git add "src/app/watch/[gameCode]/page.tsx"
git commit -m "feat: add spectator watch page"
```

---

## Task 7: OBS Overlay Page

**Files:**
- Create: `src/app/overlay/[gameCode]/page.tsx`

- [ ] **Step 1: Create the overlay page**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSpectator } from '@/hooks/useSpectator'

const AVATAR_COLORS = [
  'from-blue-600 to-blue-800',
  'from-orange-500 to-orange-700',
  'from-emerald-500 to-emerald-700',
  'from-purple-600 to-purple-800',
]

export default function OverlayPage() {
  const params = useParams()
  const gameCode = params.gameCode as string
  const { gameState, gameStatus, spectatorCount, timeLimit, questionStartTime } = useSpectator(gameCode)
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    if (gameStatus !== 'question') return
    setTimeLeft(timeLimit)
    const interval = setInterval(() => {
      const elapsed = (Date.now() - questionStartTime) / 1000
      const remaining = Math.max(0, timeLimit - elapsed)
      setTimeLeft(Math.ceil(remaining))
      if (remaining <= 0) clearInterval(interval)
    }, 250)
    return () => clearInterval(interval)
  }, [timeLimit, questionStartTime, gameStatus])

  // Render nothing until question is active
  if (!gameState || gameStatus !== 'question' || !gameState.currentQuestion) {
    return <div style={{ background: 'transparent' }} />
  }

  const question = gameState.currentQuestion
  const players = [...(gameState.players ?? [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const pct = (timeLeft / timeLimit) * 100
  const timerColor = pct > 50 ? '#6366f1' : pct > 25 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ background: 'transparent', padding: '12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>

        {/* Left: question + timer */}
        <div style={{ flex: 1, background: 'rgba(9,9,15,0.85)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', padding: '12px', backdropFilter: 'blur(8px)' }}>
          {/* Progress + timer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '9px', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              Q{(gameState.currentQuestionIndex ?? 0) + 1}/{gameState.questions?.length ?? 0}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 900, color: timerColor, lineHeight: 1 }}>{timeLeft}s</span>
          </div>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ height: '3px', width: `${pct}%`, background: timerColor, borderRadius: '99px', transition: 'width 0.25s linear' }} />
          </div>

          {/* Question text */}
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'white', marginBottom: '8px', lineHeight: 1.4 }}>
            {question.question}
          </div>

          {/* Options */}
          {question.options && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {question.options.map((opt: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '5px 7px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 800, flexShrink: 0 }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span style={{ fontSize: '10px', color: '#a1a1aa' }}>{opt}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: leaderboard + spectator count */}
        <div style={{ width: '140px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ background: 'rgba(9,9,15,0.85)', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.2)', padding: '10px', backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: '8px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>
              Leaderboard
            </div>
            {players.slice(0, 5).map((player, i) => (
              <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 0', borderBottom: i < Math.min(players.length, 5) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: '#52525b', width: '12px' }}>{i + 1}</span>
                <div className={`w-4 h-4 rounded flex items-center justify-center bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} font-black text-white flex-shrink-0`} style={{ fontSize: '7px' }}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ flex: 1, fontSize: '9px', fontWeight: 600, color: '#e4e4e7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</span>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#a5b4fc' }}>{(player.score ?? 0).toLocaleString()}</span>
              </div>
            ))}
          </div>

          {spectatorCount > 0 && (
            <div style={{ background: 'rgba(9,9,15,0.85)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', padding: '8px 10px', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
              <span style={{ fontSize: '13px', fontWeight: 900, color: 'white' }}>{spectatorCount}</span>
              <span style={{ fontSize: '9px', color: '#71717a' }}>watching</span>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Manual end-to-end test**

1. Start both servers (`npm run dev:server` + `npm run dev`)
2. Host creates a game, enables streamer mode in lobby
3. Open the watch link in another tab → expect waiting screen
4. Open the overlay link in another tab → expect empty/transparent
5. Start the game
6. Watch tab: question appears, timer counts down, player answers appear as submitted
7. Overlay tab: question + timer + leaderboard appear with transparent background
8. Finish game → watch tab shows final results

- [ ] **Step 4: Commit**

```bash
git add "src/app/overlay/[gameCode]/page.tsx"
git commit -m "feat: add OBS overlay page for streamer mode"
```

---

## Task 8: Final PR

- [ ] **Step 1: Run type-check and lint one final time**

```bash
npm run type-check && npm run lint
```

- [ ] **Step 2: Create feature branch and PR**

```bash
git checkout -b feat/streamer-mode
git push -u origin feat/streamer-mode
gh pr create --title "feat: streamer mode — watch page and OBS overlay" --body "$(cat <<'EOF'
## Summary
- Opt-in Streamer Mode toggle in host lobby — generates watch link and OBS overlay link
- `/watch/[gameCode]` — public spectator page with live question, player answer tracker, timer, leaderboard
- `/overlay/[gameCode]` — transparent OBS browser source with compact question + scoreboard layout
- Live spectator count shown to host in lobby
- `player-answered` event emitted only to spectator sockets (fairness: active players cannot see opponents' answers)
- Graceful waiting screen when spectator joins before game starts

## Test plan
- [ ] Enable streamer mode in lobby → links appear with copy buttons
- [ ] Open watch link before game starts → waiting screen shows player count
- [ ] Start game → watch page updates live with question, timer, player answers
- [ ] Overlay page shows transparent background in OBS browser source
- [ ] Host sees spectator count update in lobby
- [ ] Disable streamer mode → spectator-join returns error

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
