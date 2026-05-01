# OBS Overlay + Viewer Join — Design Spec

**Date:** 2026-05-01  
**Scope:** Streamer mode feature #1 of 4  
**Status:** Approved

## Overview

Add a dedicated OBS browser source overlay at `/overlay/[gameCode]` and improve the viewer join experience when a game is full. This is the first of four planned streamer-mode features (overlay → viewer join → Twitch chat plays → channel points). All changes are gated behind the existing `streamerMode` toggle and do not affect regular games.

## New Files

| Path | Purpose |
|---|---|
| `src/app/overlay/[gameCode]/page.tsx` | New OBS overlay page — self-contained, no shared layout |

## Modified Files

| Path | Change |
|---|---|
| `src/components/game/QuizSettings.tsx` | Add `maxPlayers` number input, visible only when `streamerMode` is on |
| `server.js` | Raise default `maxPlayers` to 50 when `streamerMode: true`; enforce hard cap of 200 |
| `src/app/game/[gameId]/page.tsx` | Friendly "game is full" message with link to `/watch/[gameCode]` |
| `src/components/game/Lobby.tsx` | Show overlay URL alongside watch link when streamer mode is on |

## Overlay Page — `/overlay/[gameCode]`

### Data
Reuses the existing `useSpectator` hook with no changes. No new Socket.io events or backend work required.

### Target dimensions
1920×1080 (OBS browser source default). No scrollbars ever — all content fits the viewport at all times.

### Visual style
- Background: dark radial gradient (`#0f0f1a → #09090f`) matching the rest of the app
- Question text: ~36–40px, readable at stream resolution
- Option text: ~22px
- Timer bar: indigo → amber → red as time runs out (same thresholds as current watch page)
- Correct answer reveal: green highlight + brief scale-up animation

### States

| State | Content |
|---|---|
| **Connecting** | Centered spinner + game code |
| **Lobby / waiting** | Large game code, "Game starting soon", player count |
| **Question active** | Top bar (logo + LIVE + spectator count) · Center (question + timer bar + options grid) · Bottom strip (top 3 scores + join code) |
| **Results** | Same layout; correct answer highlights green, player dots show ✓/✗, scores animate up |
| **Final results** | Full podium (1st/2nd/3rd large, rest below); join code hidden |

## Max Players

- `QuizSettings` exposes a "Max players" number input when `streamerMode` is on
- Default: **50**, min: 2, max: 200
- Server enforces a hard cap of 200 regardless of host input
- When `streamerMode: false`, `maxPlayers` stays at the existing default of 10 and is not shown in settings

## Join Flow When Game Is Full

Current behaviour: generic socket error shown to the player.

New behaviour: when the server rejects a join with reason "game is full", the join page shows:
> "This game is full. You can watch the action live →" with a link to `/watch/[gameCode]`

The streamer-mode-disabled error ("Streamer mode is not enabled") is unchanged.

## Host Lobby — Overlay URL

When streamer mode is on, the host lobby displays two copyable links:
- **Watch link:** `/watch/[gameCode]` (for browser spectators)
- **OBS overlay:** `/overlay/[gameCode]` (for OBS browser source)

## Out of Scope (future features)

- Twitch chat plays
- Channel Points integration
- Viewer joins via Twitch OAuth
- Animated scene transitions (intro/outro)
