# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run both frontend and backend concurrently (two terminals)
npm run dev          # Next.js frontend on port 3000
npm run dev:server   # Express + Socket.io backend with Nodemon hot reload

# Production
npm run build && npm run start
npm run server       # Production backend

# Code quality
npm run lint
npm run type-check   # tsc --noEmit

# Storybook component dev
npm run storybook    # http://localhost:6006
```

There is no test suite configured.

## Architecture

**MetaQuizz** is a real-time multiplayer quiz game for streamers with a retro pixel art aesthetic. It uses a split architecture:

- **Frontend:** Next.js 14 App Router (`src/app/`) — purely client-side game logic
- **Backend:** `server.js` — Express + Socket.io, manages authoritative game state

All real-time communication goes through Socket.io WebSockets. The backend is the source of truth for game state; the frontend stores a synced copy in Zustand (`src/stores/gameStore.ts`).

### Game Flow

1. Host creates game → 6-character code generated on server
2. Players join via code + name
3. Host starts game (requires 2+ players)
4. Per question: question displayed → timer countdown → answers submitted → results revealed → optional challenge/vote phase → ready consensus → next question
5. Final results screen

### Key Files

| File | Purpose |
|------|---------|
| `server.js` | All game logic: scoring, answer validation, challenge voting, state management |
| `src/hooks/useGame.ts` | Main hook — establishes Socket.io connection, maps all server events to Zustand actions |
| `src/stores/gameStore.ts` | Zustand store — client-side game state mirror |
| `src/lib/socket.ts` | Socket.io client wrapper with typed emit methods |
| `src/lib/scoreCalculator.ts` | Score calculation (difficulty × type multiplier × time bonus × participation ratio) |
| `src/types/question.ts` | Discriminated union for all 5 question types + type guards |

### Question Types

```typescript
type QuestionType = 'multiple_choice' | 'true_false' | 'free_text' | 'image_guess' | 'ranking'
```

Each type has distinct answer structure. `RankingQuestion` uses `items[]` + `correctOrder[]` (index array). Free text / image guess use LCS-based fuzzy matching in `server.js`.

### Scoring

- Base points: Easy=100, Medium=200, Hard=400
- Type multipliers: true_false=0.8×, multiple_choice=1.0×, ranking=1.2×, free_text=1.3×, image_guess=1.5×
- Time bonus: proportional to how fast the player answered
- Participation ratio bonus: dynamic bonus if fewer players got it right (rewards hard questions)

### Socket Events

Client emits: `host-create-game`, `player-join-game`, `host-start-game`, `submit-answer`, `time-up`, `player-ready`, `next-question`, `challenge-question`, `vote-challenge`

Server emits: `game-created`, `game-state-updated`, `question-start`, `question-results`, `reveal-state-updated`, `challenge-voting`, `challenge-resolved`, `game-finished`

### Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`).
