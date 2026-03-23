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

Spectators join the existing Socket.io game room via a new `spectator-join` event. They receive all existing server broadcasts (`question-start`, `game-state-updated`, `answer-status-updated`, `question-scores`, `game-finished`, etc.) for free — no duplicate emissions needed.

Spectators are tracked in `game.spectators[]` (already scaffolded in `createGameState`). The server broadcasts a `spectator-count-updated` event whenever the count changes.

### Answer visibility

The existing `answer-status-updated` event currently sends `{ playerId, answered: boolean }`. It needs to also carry `answer` (the actual choice submitted) so spectators can see what each player picked in real time.

> **Note:** This is the only change to an existing event payload. Players and the host already receive this event — adding `answer` does not break their existing handlers since they ignore unknown fields.

---

## Server Changes (`server.js`)

### 1. `spectator-join` handler
```
socket.on('spectator-join', ({ gameCode }) => {
  - Validate game exists, return 'spectator-error' if not
  - socket.join(gameCode)
  - Add socket.id to game.spectators[]
  - Emit 'spectator-joined' to socket with current gameState
  - Broadcast 'spectator-count-updated' to room with count
})
```

### 2. `spectator-leave` on disconnect
```
On disconnect:
  - If socket.id is in any game.spectators[]:
    - Remove from spectators[]
    - Broadcast 'spectator-count-updated' to room
```

### 3. `answer-status-updated` payload extension
Add `answer` field to the payload emitted when a player submits:
```js
{ playerId, playerName, answered: true, answer: submittedAnswer }
```

### 4. `streamerMode` setting
Pass `streamerMode` from `host-start-game` settings through to `game.settings.streamerMode`. No logic change — purely stored for potential future use.

---

## Client Changes

### `src/lib/socket.ts`
- Add `spectatorJoin(gameCode)` emit method
- Add `onSpectatorJoined(cb)` listener
- Add `onSpectatorCountUpdated(cb)` listener

### `src/hooks/useSpectator.ts` (new)
Lightweight hook for watch/overlay pages:
- Connects to socket, calls `spectatorJoin(gameCode)` on connection
- Listens to: `spectator-joined`, `question-start`, `game-state-updated`, `answer-status-updated`, `question-scores`, `game-finished`, `spectator-count-updated`
- Maintains local state: `gameState`, `gameStatus`, `currentQuestion`, `playerAnswers` (map of playerId → answer), `spectatorCount`, `timeLimit`, `questionStartTime`
- Read-only — no emit methods beyond join

### `src/components/game/Lobby.tsx`
- Add `StreamerModeCard` section (host only, below custom questions)
- Toggle off by default
- When enabled: show watch link, overlay link with copy buttons, live spectator count (via `onSpectatorCountUpdated`)
- Pass `streamerMode` through `onStartGame` settings

### `src/app/watch/[gameCode]/page.tsx` (new)
- Uses `useSpectator` hook
- **Pre-game state:** "Game starting soon · X players in lobby" waiting screen with game code
- **Question state:** Full question card + answer options + player answer tracker (shows each player's name/avatar + their answer as submitted) + live timer + live leaderboard sidebar
- **Between questions:** Leaderboard with correct answer revealed
- **Game finished:** Final results view (read-only)
- No answer submission UI anywhere

### `src/app/overlay/[gameCode]/page.tsx` (new)
- Uses `useSpectator` hook
- Transparent background (`background: transparent`)
- Fixed layout: question + timer left, compact leaderboard right
- Minimal styling — designed to sit on top of stream content
- No waiting screen (just empty until game starts)

---

## New Socket Events

| Event | Direction | Payload |
|---|---|---|
| `spectator-join` | Client → Server | `{ gameCode }` |
| `spectator-joined` | Server → Client | `{ gameState }` |
| `spectator-count-updated` | Server → Room | `{ count }` |
| `spectator-error` | Server → Client | `{ message }` |

### Modified Events

| Event | Change |
|---|---|
| `answer-status-updated` | Add `answer` field to payload |

---

## UI Details

### Watch page — player answer tracker
Below the question card, a row per player shows:
- Avatar + name
- Answer indicator: grey dot (not answered yet) → colored chip with their chosen answer once submitted

### Watch page — waiting screen
```
[game code]
Game starting soon
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
- Spectator delay (no artificial delay on watch page)
- Spectator chat or reactions
- Multiple overlay layout options
- Streamer mode persisting across games (toggle resets each session)
