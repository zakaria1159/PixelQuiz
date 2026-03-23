# Streamer Mode — Design Spec

**Date:** 2026-03-24
**Status:** Approved
**Feature:** Opt-in streamer mode that unlocks a public spectator watch page and OBS overlay

---

## Overview

Streamer mode is an optional toggle the host enables in the lobby. When active, two public URLs become available:

- `/watch/[gameCode]` — a read-only spectator page for viewers (shareable in Twitch/YouTube chat)
- `/overlay/[gameCode]` — a transparent, compact layout designed as an OBS browser source

Regular gameplay is completely unaffected when streamer mode is off.

---

## User Stories

- As a host/streamer, I can enable streamer mode in the lobby and get two shareable links
- As a host, I can see how many spectators are watching in real time
- As a spectator, I can open the watch link and see the current question, all answer options, each player's answer as they submit it, the live leaderboard, and the timer
- As a spectator arriving before the game starts, I see a "Game starting soon" waiting screen
- As a streamer, I can add the overlay URL as an OBS browser source and have it display transparently over my stream

---

## Architecture

### Transport

Spectators join the existing Socket.io game room via a new `spectator-join` event. They receive all existing server broadcasts (`question-start`, `game-state-updated`, `question-scores`, `game-finished`, etc.) for free. A new `player-answered` push event is introduced for per-player answer tracking (see below).

Spectators are tracked in two places:
1. `game.spectators[]` — array of socket ID strings in the game state. **The existing `GameState.spectators` type in `src/types/game.ts` is `Player[]` and must be changed to `string[]`.**
2. A separate `spectators: Map<socketId, { gameCode }>` — mirrors the existing `players` Map, used for disconnect cleanup

### Per-player answer visibility

The existing `answer-status-updated` event sends `{ answeredPlayers: string[], totalPlayers: number }` (a list of IDs only). Rather than restructuring this event, a new **`player-answered`** event is emitted alongside it whenever a player submits, carrying `{ playerId, playerName, answer }`. The watch page uses this to build its answer tracker. Existing players and host ignore this new event.

### `gameState` sanitization for spectators

`game.answers` contains `{ answer, time, isCorrect, partial }` per player — correctness data that must not be leaked during an active question. When sending `gameState` to a spectator on join, the server strips the `answers` field if `gameStatus === 'question'`. After reveal, `answers` may be included.

---

## Server Changes (`server.js`)

### 1. `spectators` Map (top-level, mirrors `players` Map)
```js
const spectators = new Map() // socketId → { gameCode }
```

### 2. `spectator-join` handler
```
socket.on('spectator-join', ({ gameCode }) => {
  - Validate game exists → emit 'spectator-error' if not
  - Validate game.settings.streamerMode === true → emit 'spectator-error' if not
  - socket.join(gameCode)
  - spectators.set(socket.id, { gameCode })
  - game.spectators.push(socket.id)
  - Emit 'spectator-joined' to socket with sanitized gameState (strip answers if status === 'question')
  - Broadcast 'spectator-count-updated' { count: game.spectators.length } to room
})
```

### 3. Disconnect handler — spectator cleanup
In the existing `disconnect` handler, after the `players.get(socket.id)` branch, add:
```
if (spectators.has(socket.id)) {
  const { gameCode } = spectators.get(socket.id)
  spectators.delete(socket.id)
  const game = games.get(gameCode)
  if (game) {
    game.spectators = game.spectators.filter(id => id !== socket.id)
    io.to(gameCode).emit('spectator-count-updated', { count: game.spectators.length })
  }
}
```

### 4. `player-answered` event
Emitted **only to spectator sockets** (not to the full room) to prevent active players from reading opponents' answers via DevTools. Iterate `game.spectators` and emit individually:

```js
game.spectators.forEach(spectatorId => {
  io.to(spectatorId).emit('player-answered', {
    playerId: socket.id,
    playerName: player.name,
    answer: submittedAnswer
  })
})
```

This ensures raw answer data never reaches active player browsers during the question phase.

### 5. `streamerMode` in `game.settings`
In the `host-start-game` handler, after `getRandomQuestions(settings)`, explicitly write:
```js
game.settings.streamerMode = settings.streamerMode ?? false
```

---

## TypeScript / Type Changes

### `src/types/game.ts`
- Add `streamerMode?: boolean` to `GameSettings` interface.
- Change `spectators: Player[]` to `spectators: string[]` in `GameState` interface.

### `src/components/game/QuizSettings.tsx`
Add `streamerMode?: boolean` to the `QuizSettings` interface (or manage as separate local state in Lobby and merge at `onStartGame` call site — preferred to keep `QuizSettings` focused on quiz config).

---

## Client Changes

### `src/lib/socket.ts`
- Add `spectatorJoin(gameCode)` emit method
- Add `onSpectatorJoined(cb)` listener
- Add `onSpectatorCountUpdated(cb)` listener
- Add `onPlayerAnswered(cb)` listener (new event)

### `src/hooks/useSpectator.ts` (new)
Lightweight read-only hook:
- Connects to socket, calls `spectatorJoin(gameCode)` on connection
- On reconnect, re-emits `spectatorJoin(gameCode)` to rejoin room. Use the Manager-level reconnect event (`socket.io.on('reconnect', ...)`) consistent with the existing pattern in `src/lib/socket.ts`
- Listens to: `spectator-joined`, `question-start`, `game-state-updated`, `player-answered`, `question-scores`, `game-finished`, `spectator-count-updated`
- Maintains local state: `gameState`, `gameStatus`, `currentQuestion`, `playerAnswers` (Map of playerId → answer, reset on each `question-start`), `spectatorCount`, `timeLimit`, `questionStartTime`
- Read-only — no emit methods beyond join/rejoin

### `src/components/game/Lobby.tsx`
- Add `StreamerModeCard` section (host only, below custom questions), toggled by local state `streamerMode` (default false)
- When enabled: show watch link, overlay link with copy buttons, live spectator count (via `onSpectatorCountUpdated`)
- Merge `streamerMode` at `onStartGame` call site: `onStartGame?.({ ...settings, customQuestions, customOnly, streamerMode })`

### `src/app/watch/[gameCode]/page.tsx` (new)
- Uses `useSpectator` hook
- **Pre-game / waiting state** (`gameStatus === 'waiting'` or game not found yet): "Game starting soon · X players in lobby · Hosted by [name]" with pulsing dots
- **Question state:** Full question card + answer options + player answer tracker + live timer + live leaderboard sidebar
- **Between questions (`question-scores`):** Leaderboard with correct answer
- **Game finished:** Final results view (read-only)
- No answer submission UI anywhere

### `src/app/overlay/[gameCode]/page.tsx` (new)
- Uses `useSpectator` hook
- `background: transparent` — designed as OBS browser source
- Fixed layout: question + timer left, compact leaderboard + spectator count right
- No waiting screen (renders empty until `gameStatus === 'question'`)
- No interaction elements

---

## New Socket Events

| Event | Direction | Payload |
|---|---|---|
| `spectator-join` | Client → Server | `{ gameCode }` |
| `spectator-joined` | Server → Client | `{ gameState }` (sanitized) |
| `spectator-count-updated` | Server → Room | `{ count }` |
| `spectator-error` | Server → Client | `{ message }` |
| `player-answered` | Server → Spectators only | `{ playerId, playerName, answer }` |

### Existing events consumed by spectators (no change)

`question-start`, `game-state-updated`, `question-scores`, `game-finished`

---

## UI Details

### Watch page — player answer tracker
Below the question card, a row per player shows:
- Avatar + name
- Answer indicator: grey dot (not answered yet) → colored chip with their chosen answer once `player-answered` fires

### Watch page — waiting screen
```
[METAQUIZZ logo]
Game starting soon...
X players in lobby · Hosted by [name]
[pulsing dots]
```

### Overlay — layout
```
┌─────────────────────────────┬───────────────┐
│  Q4/10  ████░░░  12s        │  Leaderboard  │
│                             │  1. Zakaria   │
│  Question text here         │  2. Alex      │
│                             │  3. Sara      │
│  [A] Option   [B] Option    │               │
│  [C] Option   [D] Option    │  👁 47 watching│
└─────────────────────────────┴───────────────┘
```
Transparent background. No interaction elements.

---

## Out of Scope (this iteration)

- Twitch chat bot / chat voting
- Artificial answer delay on watch page
- Spectator chat or reactions
- Multiple overlay layout options
- Streamer mode persisting across games (toggle resets each session)
- Full reconnection recovery with state resync for spectators (re-emit `spectator-join` on reconnect is sufficient)
