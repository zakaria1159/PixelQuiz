# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run both frontend and backend (two terminals)
npm run dev          # Next.js frontend on port 3000
npm run dev:server   # Express + Socket.io backend with Nodemon hot reload

# Production
npm run build && npm run start
npm run server       # Production backend

# Code quality
npm run lint
npm run type-check        # tsc --noEmit
npm run validate          # validate all question JSON files (run before deploy)

# Data / DB
node scripts/migrate-to-supabase.js   # seed/resync JSON files → Supabase
node scripts/fix-correct-answers.js   # one-time fix for string correctAnswer bugs
node scripts/validate-questions.js    # same as npm run validate

# Storybook component dev
npm run storybook    # http://localhost:6006
```

## Architecture

**MetaQuizz** is a real-time multiplayer quiz game for streamers with a retro pixel art aesthetic. It uses a split architecture:

- **Frontend:** Next.js 14 App Router (`src/app/`) — client-side rendering, game UI
- **Backend:** `server.js` — Express + Socket.io, authoritative game state
- **Database:** Supabase (Postgres) — persistent question storage, read/written by both services

All real-time communication goes through Socket.io WebSockets. The backend is the source of truth for game state; the frontend stores a synced copy in Zustand (`src/stores/gameStore.ts`).

## Environment Variables

Both the Next.js service and server.js need:

```
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
ADMIN_PASSWORD=...           # protects the admin dashboard + internal reload endpoint
GAME_SERVER_URL=...          # Next.js → server.js URL (prod only, default localhost:3003)
ANTHROPIC_API_KEY=...        # used for AI challenge resolution in server.js
```

## Question Storage

Questions are stored in Supabase in a single `questions` table:

```sql
questions (
  id          TEXT,
  lang        TEXT,       -- 'en' | 'fr'
  category    TEXT,
  type        TEXT,
  question    TEXT,
  difficulty  TEXT,       -- 'easy' | 'medium' | 'hard'
  time_limit  INTEGER,
  explanation TEXT,
  data        JSONB,      -- all type-specific fields (options, correctAnswer, items, etc.)
  PRIMARY KEY (id, lang)
)
```

The JSON files in `questions/` and `questions/fr/` are the canonical source used to seed the DB. After editing them, run `node scripts/migrate-to-supabase.js` to sync to Supabase. The app reads exclusively from Supabase at runtime — JSON files are not used in production.

`src/lib/questionsIO.ts` is the single interface for all question CRUD (used by admin API routes). `server.js` loads its own copy directly from Supabase at startup via `loadQuestionsFromDB()`.

## Game Flow

1. Host creates game → 6-character code generated on server
2. Players join via code + nickname
3. Host configures settings (question count, categories, types, difficulties, language) and starts game
4. Per question:
   - Question + timer displayed to all players
   - Players submit answers before time expires
   - Results revealed: correct answer highlighted, per-player scores shown
   - Optional challenge/vote phase (host or players can challenge the answer)
   - Ready consensus → next question
5. Final leaderboard screen

The host view (`/host/[gameId]`) and player view (`/game/[gameId]`) are separate pages. A spectator/stream view exists at `/watch/[gameCode]`.

## Question Selection (`getRandomQuestions` in server.js)

When a game starts, questions are selected from the in-memory pool loaded from Supabase:

- Filters applied: `categories`, `types`, `difficulties`, `lang`
- **General mode:** category-first round-robin — each category gets equal representation, then types are varied within each category's slot. This prevents large categories (gaming has 300+ questions, 11 types) from dominating.
- **Themed mode:** if all selected categories are `THEMED_CATEGORY_IDS` (harry_potter, football), balances by type only since category is already fixed.
- **Custom questions:** host-added questions are mixed in or used exclusively (`customOnly` mode).

## Question Types

14 question types are supported:

| Type | Answer format | Notes |
|------|--------------|-------|
| `multiple_choice` | integer index | `correctAnswer` is index into `options[]` |
| `true_false` | 0 or 1 | 0=True, 1=False |
| `free_text` | string | LCS fuzzy match, `acceptableAnswers[]` for aliases |
| `fill_blank` | string | sentence has `___` as placeholder |
| `ranking` | comma-separated indices | `correctOrder[]` is array of item indices |
| `closest_wins` | number | player closest to `correctAnswer` wins |
| `speed_buzz` | index (with options) or string (without) | rank-based scoring, fastest correct answer wins |
| `pixel_reveal` | string | image de-pixelates over time; earlier answer = more points |
| `clue_chain` | string | 4 clues revealed progressively hardest→easiest |
| `image_guess` | string | static image, type the answer |
| `flag_guess` | string | country flag shown, type the country name |
| `music_guess` | string | Deezer preview clip plays, type the song title |
| `animal_sound` | string | audio clip plays, type the animal name |
| `letter_game` | comma-separated words | Scattergories-style; each word must start with given letter |

**Critical:** `multiple_choice`, `true_false`, and `speed_buzz` (with options) all require `correctAnswer` to be an **integer index**, not a string. Run `npm run validate` to catch this.

## Answer Validation (server.js)

- `multiple_choice` / `true_false` / `speed_buzz`: `parseInt(playerAnswer) === question.correctAnswer`
- `free_text` / `fill_blank` / `image_guess` / `pixel_reveal` / `flag_guess` / `clue_chain` / `animal_sound`: LCS similarity >= 0.82 after normalization (lowercase, accents stripped, punctuation removed)
- `music_guess`: checks title match first (full credit), then artist match (partial credit)
- `ranking`: compares comma-separated index order; partial credit per correctly placed item
- `closest_wins`: no correct/incorrect — scored by distance from correct value
- `letter_game`: each entry scored by whether it starts with the given letter

## Scoring

- Base points: Easy=100, Medium=200, Hard=400
- Type multipliers: true_false=0.8×, multiple_choice=1.0×, ranking=1.2×, free_text=1.3×, image_guess=1.5×
- Time bonus: proportional to how fast the player answered relative to the time limit
- Participation ratio bonus: dynamic bonus when fewer players get it right (rewards hard questions); requires 4+ players

## Admin Dashboard

Protected by `ADMIN_PASSWORD` cookie. Routes:

- `/admin/login` — password gate
- `/admin/questions` — list/search/filter all questions, edit or delete
- `/admin/questions/new` — create a new question (any type, any category, EN or FR)
- `/admin/questions/[id]/edit` — edit existing question

All changes write directly to Supabase and then call `POST /internal/reload-questions` on the game server to refresh its in-memory cache.

API routes (all under `/api/admin/`):
- `GET /api/admin/questions` — list with filters
- `POST /api/admin/questions` — create
- `PUT /api/admin/questions/[id]` — update
- `DELETE /api/admin/questions/[id]` — delete

## Categories

12 categories, each with EN and FR variants:

`gaming` · `movies` · `music` · `sports` · `science` · `history` · `pop_culture` · `geography` · `books` · `harry_potter` · `streaming` · `football`

Gaming has significantly more questions (~300) and more unique question types than other categories (~80 each). The category-first round-robin in `getRandomQuestions` compensates for this.

## Key Files

| File | Purpose |
|------|---------|
| `server.js` | All game logic: scoring, answer validation, challenge voting, question selection, state management |
| `src/lib/questionsIO.ts` | Supabase CRUD for questions — used by admin API routes |
| `src/hooks/useGame.ts` | Main hook — Socket.io connection, maps server events to Zustand actions |
| `src/stores/gameStore.ts` | Zustand store — client-side game state mirror |
| `src/lib/socket.ts` | Socket.io client wrapper with typed emit methods |
| `src/lib/scoreCalculator.ts` | Score display utilities |
| `src/types/question.ts` | Discriminated union for all 14 question types + type guards |
| `src/lib/translations.ts` | EN/FR UI string translations |
| `src/lib/adminAuth.ts` | Admin cookie auth helpers |
| `supabase/schema.sql` | DB schema — run once to create the questions table |
| `scripts/migrate-to-supabase.js` | Seed Supabase from JSON files |
| `scripts/validate-questions.js` | Data quality checks for all question files |

## Socket Events

Client emits: `host-create-game`, `player-join-game`, `host-start-game`, `submit-answer`, `time-up`, `player-ready`, `next-question`, `challenge-question`, `vote-challenge`

Server emits: `game-created`, `game-state-updated`, `question-start`, `question-results`, `reveal-state-updated`, `challenge-voting`, `challenge-resolved`, `game-finished`

## Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`).
