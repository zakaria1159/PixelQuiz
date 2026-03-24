# Admin Dashboard — Design Spec

**Date:** 2026-03-24
**Status:** Approved

## Overview

A password-protected admin dashboard built as Next.js routes inside the existing app. Allows the owner to browse, add, edit, and delete questions across all categories and both languages (EN/FR), writing changes directly back to the JSON files on disk. The game server's in-memory question pool is refreshed after each change without needing a restart.

---

## Authentication

- `ADMIN_PASSWORD` environment variable in `.env`
- `/admin/login` — simple password form, POST to `/api/admin/auth`
- On success: generate a signed HMAC-SHA256 token using Node.js built-in `crypto` module (no new dependencies), set it as an `admin_session` HttpOnly cookie
- Token format: `<payload_base64>.<hmac_hex>` where payload is `{ exp: timestamp }` signed with `ADMIN_PASSWORD` as the secret
- Next.js middleware (`middleware.ts`) checks the cookie on every `/admin/*` and `/api/admin/*` request; redirects to `/admin/login` if missing or invalid
- Logout: `POST /api/admin/logout` clears the cookie

---

## Routes

| Route | Purpose |
|---|---|
| `/admin/login` | Password entry form |
| `/admin` | Redirects to `/admin/questions` |
| `/admin/questions` | Browse all questions with filters |
| `/admin/questions/new` | Add a new question |
| `/admin/questions/[id]/edit` | Edit an existing question |

---

## API Routes

All protected by the middleware cookie check.

| Endpoint | Method | Action |
|---|---|---|
| `/api/admin/auth` | POST | Verify password, set cookie |
| `/api/admin/logout` | POST | Clear cookie |
| `/api/admin/questions` | GET | List questions (filters: lang, category, type, difficulty, search) |
| `/api/admin/questions` | POST | Create question, write to JSON file |
| `/api/admin/questions/[id]` | PUT | Update question in JSON file |
| `/api/admin/questions/[id]` | DELETE | Remove question from JSON file |

---

## File I/O

Questions are stored in `questions/<category>.json` (EN) and `questions/fr/<category>.json` (FR).

Each write operation:
1. Reads the relevant JSON file
2. Applies the change (add / update / delete)
3. Writes the file back to disk
4. Calls `POST http://localhost:3003/internal/reload-questions` to refresh the game server's in-memory pool

The `/internal/reload-questions` endpoint on `server.js`:
- Only accepts requests from `127.0.0.1` (localhost guard)
- Mutates the existing `questionsByLang` object in-place: `questionsByLang.en = loadQuestionsFromDir(questionsDir)` and `questionsByLang.fr = loadQuestionsFromDir(path.join(questionsDir, 'fr'))` — since it is declared as `const`, properties must be mutated rather than reassigned
- Returns `{ ok: true }`

This approach means changes are live immediately in both dev and production without any server restart.

---

## UI Layout

**Sidebar navigation** (persistent across all admin pages):
- Logo + "ADMIN" label
- Navigation links: Overview, Questions, Add New
- Language toggle: EN / FR (persists as a filter context)
- Logout button at bottom

**Questions list page** (`/admin/questions`):
- Search bar (full-text across question text)
- Filter row: Language · Category · Type · Difficulty
- Table: Question (truncated) · Type · Difficulty · Lang · Actions (Edit / Delete)
- "Add Question" button → `/admin/questions/new`
- Delete shows inline confirmation before removing

**Question editor** (shared for new + edit, `/admin/questions/new` and `/admin/questions/[id]/edit`):

Single adaptive form — fields change based on the selected type.

**Common fields (all types):**

| Field | Notes |
|---|---|
| Type | Dropdown: all 14 types |
| Category | Dropdown sourced from filesystem at runtime (reads `questions/` directory for EN, `questions/fr/` for FR) |
| Language | EN or FR |
| Question text | Textarea |
| Difficulty | Toggle: easy / medium / hard |
| Time limit | Number input (seconds) |
| Explanation | Optional textarea |

**Type-specific fields:**

| Type | Extra fields |
|---|---|
| `multiple_choice` | `options[]` (4 text inputs), `correctAnswer` (click an option to mark as correct, stored as index 0–3) |
| `speed_buzz` | Same as multiple_choice |
| `true_false` | `correctAnswer` toggle (True=0, False=1, stored as number index) |
| `free_text` | `correctAnswer` (string), `acceptableAnswers[]` (add/remove list), `caseSensitive` toggle, `exactMatch` toggle |
| `fill_blank` | Question text must contain `___`; `correctAnswer` (the missing word), `acceptableAnswers[]` |
| `image_guess` | `imageUrl` (required), `correctAnswer` (string), `acceptableAnswers[]` |
| `pixel_reveal` | `imageUrl` (required), `correctAnswer` (string), `acceptableAnswers[]` |
| `ranking` | `items[]` (add/remove list), `correctOrder[]` (drag to reorder items into correct sequence), `allowPartialCredit` toggle |
| `closest_wins` | `correctAnswer` (number), `unit` (optional string, e.g. "million km") |
| `letter_game` | `letter` (single uppercase character), `categories[]` (add/remove list of category names) |
| `flag_guess` | `countryCode` (ISO 3166-1 alpha-2, e.g. `fr`), `correctAnswer` (country name), `acceptableAnswers[]` |
| `music_guess` | `deezerQuery` (search string), `correctAnswer` (song title), `artist`, `songTitle`, `acceptableAnswers[]` |
| `animal_sound` | `audioUrl` (direct audio URL), `correctAnswer` (animal name), `acceptableAnswers[]` |
| `clue_chain` | `clues[]` (exactly 4 clues, ordered hardest→easiest), `correctAnswer`, `acceptableAnswers[]` |

**ID generation:** `<category-prefix><timestamp>` (e.g. `mv1711234567`) — guaranteed unique, no collision risk.

---

## Styling

Matches the game's dark aesthetic: dark background (`#0f0f1a`), indigo accent (`#6366f1`), zinc text palette. Uses existing Tailwind classes where possible. Admin is desktop-only (no mobile requirement).

---

## What's Out of Scope

- Bulk import/export of questions
- Question preview in game UI
- User management (single owner only)
- Question usage statistics

---

## Files to Create / Modify

**New files:**
- `src/app/admin/login/page.tsx`
- `src/app/admin/questions/page.tsx`
- `src/app/admin/questions/new/page.tsx`
- `src/app/admin/questions/[id]/edit/page.tsx`
- `src/app/api/admin/auth/route.ts`
- `src/app/api/admin/logout/route.ts`
- `src/app/api/admin/questions/route.ts`
- `src/app/api/admin/questions/[id]/route.ts`
- `src/middleware.ts` (or extend if it exists)
- `src/lib/adminAuth.ts` (JWT sign/verify helpers)
- `src/lib/questionsIO.ts` (read/write JSON file helpers)

**Modified files:**
- `server.js` — add `/internal/reload-questions` endpoint + localhost guard
- `.env` — add `ADMIN_PASSWORD`
