# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a password-protected admin dashboard at `/admin` for managing MetaQuizz questions (browse, add, edit, delete) across all 14 question types and both EN/FR languages, writing changes directly to the JSON files on disk.

**Architecture:** Next.js admin pages + API routes handle auth and file I/O. After each write, the API calls `POST /internal/reload-questions` on the game server (port 3003) to refresh the in-memory question pool without a restart. Auth uses a signed HMAC-SHA256 cookie with no external libraries.

**Tech Stack:** Next.js 14 App Router, Node.js `crypto` (built-in), Tailwind CSS, Express (existing server.js)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/adminAuth.ts` | Create | Token sign/verify with Node crypto |
| `src/middleware.ts` | Create | Protect all `/admin/*` and `/api/admin/*` routes |
| `server.js` | Modify | Add `POST /internal/reload-questions` endpoint |
| `.env` | Modify | Add `ADMIN_PASSWORD` |
| `src/lib/questionsIO.ts` | Create | Read/write question JSON files |
| `src/app/api/admin/auth/route.ts` | Create | Login endpoint |
| `src/app/api/admin/logout/route.ts` | Create | Logout endpoint |
| `src/app/api/admin/questions/route.ts` | Create | GET list + POST create |
| `src/app/api/admin/questions/[id]/route.ts` | Create | PUT update + DELETE remove |
| `src/app/admin/layout.tsx` | Create | Sidebar shell wrapping all admin pages |
| `src/app/admin/page.tsx` | Create | Redirect to `/admin/questions` |
| `src/app/admin/login/page.tsx` | Create | Password login form |
| `src/app/admin/questions/page.tsx` | Create | Browse/filter/delete questions |
| `src/components/admin/QuestionForm.tsx` | Create | Adaptive form for all 14 question types |
| `src/app/admin/questions/new/page.tsx` | Create | New question page |
| `src/app/admin/questions/[id]/edit/page.tsx` | Create | Edit question page |

---

## Task 1: Auth helpers

**Files:**
- Create: `src/lib/adminAuth.ts`
- Modify: `.env`

- [ ] **Step 1: Add `ADMIN_PASSWORD` to `.env`**

Append to `.env`:
```
ADMIN_PASSWORD=choose-a-strong-password-here
```
Replace the value with an actual password of your choice.

- [ ] **Step 2: Create `src/lib/adminAuth.ts`**

```typescript
import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = process.env.ADMIN_PASSWORD!
const COOKIE_NAME = 'admin_session'
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

export function createToken(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + EXPIRY_MS })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifyToken(token: string): boolean {
  if (!token) return false
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return false
  try {
    const expected = sign(payload)
    const sigBuf = Buffer.from(sig, 'hex')
    const expBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length) return false
    if (!timingSafeEqual(sigBuf, expBuf)) return false
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return Date.now() < exp
  } catch {
    return false
  }
}

export { COOKIE_NAME }
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/adminAuth.ts .env
git commit -m "feat(admin): add auth token helpers"
```

---

## Task 2: Middleware

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create `src/middleware.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/adminAuth'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Login page is always accessible
  if (pathname === '/admin/login') return NextResponse.next()

  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!verifyToken(token ?? '')) {
    const loginUrl = new URL('/admin/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
```

- [ ] **Step 2: Verify middleware compiles**

```bash
npm run type-check
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(admin): add middleware to protect /admin routes"
```

---

## Task 3: Server reload endpoint

**Files:**
- Modify: `server.js` (add after the `/health` endpoint, before `server.listen`)

- [ ] **Step 1: Add the reload endpoint to `server.js`**

Find the `/health` endpoint in `server.js` (near the bottom, around line 2208). Add this block directly after it:

```javascript
// Internal reload endpoint — only accepts requests from localhost
app.post('/internal/reload-questions', (req, res) => {
  const ip = req.socket.remoteAddress
  if (ip !== '127.0.0.1' && ip !== '::1' && ip !== '::ffff:127.0.0.1') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  questionsByLang.en = loadQuestionsFromDir(questionsDir)
  questionsByLang.fr = loadQuestionsFromDir(path.join(questionsDir, 'fr'))
  console.log(`🔄 Questions reloaded — EN: ${questionsByLang.en.length}, FR: ${questionsByLang.fr.length}`)
  res.json({ ok: true, en: questionsByLang.en.length, fr: questionsByLang.fr.length })
})
```

- [ ] **Step 2: Test the endpoint manually**

With `npm run dev:server` running, run:
```bash
curl -X POST http://localhost:3003/internal/reload-questions
```
Expected: `{"ok":true,"en":942,"fr":942}` (or similar counts)

Also verify the localhost guard:
```bash
# This should work (loopback):
curl -X POST http://localhost:3003/internal/reload-questions

# A request from a non-localhost IP should get 403 — you can verify this
# by temporarily logging the IP and checking the console output
```

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat(admin): add internal reload-questions endpoint to game server"
```

---

## Task 4: Questions I/O library

**Files:**
- Create: `src/lib/questionsIO.ts`

This module is the single place that reads and writes the JSON question files. All API routes use it.

- [ ] **Step 1: Create `src/lib/questionsIO.ts`**

```typescript
import fs from 'fs'
import path from 'path'

const QUESTIONS_DIR = path.join(process.cwd(), 'questions')

// Returns the file path for a given category + language
function filePath(category: string, lang: 'en' | 'fr'): string {
  return lang === 'fr'
    ? path.join(QUESTIONS_DIR, 'fr', `${category}.json`)
    : path.join(QUESTIONS_DIR, `${category}.json`)
}

// List all categories available for a language (from filesystem)
export function getCategories(lang: 'en' | 'fr'): string[] {
  const dir = lang === 'fr' ? path.join(QUESTIONS_DIR, 'fr') : QUESTIONS_DIR
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .sort()
}

// Read all questions from a category file
function readCategory(category: string, lang: 'en' | 'fr'): any[] {
  const fp = filePath(category, lang)
  if (!fs.existsSync(fp)) return []
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'))
  } catch {
    return []
  }
}

// Write all questions back to a category file
function writeCategory(category: string, lang: 'en' | 'fr', questions: any[]): void {
  const fp = filePath(category, lang)
  fs.writeFileSync(fp, JSON.stringify(questions, null, 2), 'utf8')
}

export interface QuestionFilter {
  lang?: 'en' | 'fr'
  category?: string
  type?: string
  difficulty?: string
  search?: string
}

// List questions with optional filters
export function getQuestions(filters: QuestionFilter = {}): any[] {
  const langs: Array<'en' | 'fr'> = filters.lang ? [filters.lang] : ['en', 'fr']
  const results: any[] = []

  for (const lang of langs) {
    const categories = filters.category ? [filters.category] : getCategories(lang)
    for (const cat of categories) {
      const qs = readCategory(cat, lang).map(q => ({ ...q, _lang: lang }))
      results.push(...qs)
    }
  }

  return results.filter(q => {
    if (filters.type && q.type !== filters.type) return false
    if (filters.difficulty && q.difficulty !== filters.difficulty) return false
    if (filters.search) {
      const s = filters.search.toLowerCase()
      if (!q.question?.toLowerCase().includes(s)) return false
    }
    return true
  })
}

// Find a single question by id across all files (or in a specific lang)
export function getQuestion(id: string, lang?: 'en' | 'fr'): { question: any; lang: 'en' | 'fr'; category: string } | null {
  const langs: Array<'en' | 'fr'> = lang ? [lang] : ['en', 'fr']
  for (const l of langs) {
    for (const cat of getCategories(l)) {
      const qs = readCategory(cat, l)
      const q = qs.find(q => q.id === id)
      if (q) return { question: { ...q, _lang: l }, lang: l, category: cat }
    }
  }
  return null
}

// Add a new question to a category file
export function createQuestion(question: any, lang: 'en' | 'fr', category: string): any {
  const id = `${category.slice(0, 2)}${Date.now()}${Math.random().toString(36).slice(2, 5)}`
  const newQ = { ...question, id }
  delete newQ._lang
  const qs = readCategory(category, lang)
  qs.push(newQ)
  writeCategory(category, lang, qs)
  return newQ
}

// Update an existing question in its file
export function updateQuestion(id: string, updates: any, lang: 'en' | 'fr', category: string): any | null {
  const qs = readCategory(category, lang)
  const idx = qs.findIndex(q => q.id === id)
  if (idx === -1) return null
  const updated = { ...qs[idx], ...updates, id }
  delete updated._lang
  qs[idx] = updated
  writeCategory(category, lang, qs)
  return updated
}

// Delete a question from its file
export function deleteQuestion(id: string, lang: 'en' | 'fr', category: string): boolean {
  const qs = readCategory(category, lang)
  const next = qs.filter(q => q.id !== id)
  if (next.length === qs.length) return false
  writeCategory(category, lang, next)
  return true
}

// Notify game server to reload questions from disk
export async function reloadGameServer(): Promise<void> {
  try {
    const port = process.env.PORT || 3003
    await fetch(`http://localhost:${port}/internal/reload-questions`, { method: 'POST' })
  } catch {
    // Non-fatal: server may not be running in dev
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/questionsIO.ts
git commit -m "feat(admin): add questions I/O library"
```

---

## Task 5: API routes

**Files:**
- Create: `src/app/api/admin/auth/route.ts`
- Create: `src/app/api/admin/logout/route.ts`
- Create: `src/app/api/admin/questions/route.ts`
- Create: `src/app/api/admin/questions/[id]/route.ts`

- [ ] **Step 1: Create auth route `src/app/api/admin/auth/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createToken, COOKIE_NAME } from '@/lib/adminAuth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }
  const token = createToken()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return res
}
```

- [ ] **Step 2: Create logout route `src/app/api/admin/logout/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/lib/adminAuth'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(COOKIE_NAME)
  return res
}
```

- [ ] **Step 3: Create questions list + create route `src/app/api/admin/questions/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getQuestions, getCategories, createQuestion, reloadGameServer } from '@/lib/questionsIO'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const filters = {
    lang: (searchParams.get('lang') as 'en' | 'fr') || undefined,
    category: searchParams.get('category') || undefined,
    type: searchParams.get('type') || undefined,
    difficulty: searchParams.get('difficulty') || undefined,
    search: searchParams.get('search') || undefined,
  }
  const questions = getQuestions(filters)
  const categories = {
    en: getCategories('en'),
    fr: getCategories('fr'),
  }
  return NextResponse.json({ questions, categories })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { lang, category, ...question } = body
  if (!lang || !category) {
    return NextResponse.json({ error: 'lang and category are required' }, { status: 400 })
  }
  const created = createQuestion(question, lang, category)
  await reloadGameServer()
  return NextResponse.json({ question: created }, { status: 201 })
}
```

- [ ] **Step 4: Create question update + delete route `src/app/api/admin/questions/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getQuestion, updateQuestion, deleteQuestion, reloadGameServer } from '@/lib/questionsIO'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { lang, category, ...updates } = body
  if (!lang || !category) {
    return NextResponse.json({ error: 'lang and category are required' }, { status: 400 })
  }
  const updated = updateQuestion(params.id, updates, lang, category)
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await reloadGameServer()
  return NextResponse.json({ question: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = req.nextUrl
  const lang = searchParams.get('lang') as 'en' | 'fr'
  const category = searchParams.get('category')!
  const ok = deleteQuestion(params.id, lang, category)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await reloadGameServer()
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Type-check**

```bash
npm run type-check
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/
git commit -m "feat(admin): add auth and questions API routes"
```

---

## Task 6: Admin shell + login page

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/login/page.tsx`

- [ ] **Step 1: Create redirect page `src/app/admin/page.tsx`**

```typescript
import { redirect } from 'next/navigation'

export default function AdminPage() {
  redirect('/admin/questions')
}
```

- [ ] **Step 2: Create admin layout `src/app/admin/layout.tsx`**

```typescript
'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

const navItems = [
  { href: '/admin/questions', label: 'Questions', icon: '📝' },
  { href: '/admin/questions/new', label: 'Add New', icon: '➕' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const isLoginPage = pathname === '/admin/login'
  if (isLoginPage) return <>{children}</>

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#09090f' }}>
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 flex flex-col" style={{ background: '#0f1117', borderRight: '1px solid #1f2035' }}>
        <div className="p-4 border-b" style={{ borderColor: '#1f2035' }}>
          <span className="text-indigo-400 font-black text-sm tracking-wide">⚡ ADMIN</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const active = pathname.startsWith(item.href) && !(item.href === '/admin/questions' && pathname === '/admin/questions/new')
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: active ? '#a5b4fc' : '#52525b',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: '#1f2035' }}>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Create login page `src/app/admin/login/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/admin/questions')
    } else {
      setError('Invalid password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at 50% -10%, #13154a 0%, #0f0f1a 45%, #09090f 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-4">
            <span className="text-xl">⚡</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Admin Access</h1>
          <p className="text-zinc-500 text-sm">MetaQuizz Question Manager</p>
        </div>
        <form onSubmit={handleSubmit} className="glass p-8 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-zinc-600 font-semibold text-base py-4 px-5 rounded-xl outline-none transition-all"
              placeholder="Enter admin password"
            />
          </div>
          {error && <p className="text-red-400 text-sm font-semibold">{error}</p>}
          <button
            type="submit"
            disabled={!password || loading}
            className="w-full py-4 px-6 rounded-xl font-black text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)', boxShadow: '0 0 30px rgba(79,70,229,0.4)' }}
          >
            {loading ? 'Verifying…' : '▶  Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify login flow works**

With `npm run dev` running:
1. Open `http://localhost:3000/admin` — should redirect to `/admin/login`
2. Enter the wrong password — should show "Invalid password"
3. Enter the correct password — should redirect to `/admin/questions` (404 for now, that's fine)
4. Refresh `/admin/questions` — should stay on the page (cookie persists)
5. Click Logout — should go back to `/admin/login`

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/
git commit -m "feat(admin): add sidebar layout and login page"
```

---

## Task 7: Questions list page

**Files:**
- Create: `src/app/admin/questions/page.tsx`

- [ ] **Step 1: Create `src/app/admin/questions/page.tsx`**

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const QUESTION_TYPES = ['multiple_choice','true_false','free_text','fill_blank','ranking','image_guess','pixel_reveal','closest_wins','speed_buzz','letter_game','flag_guess','music_guess','animal_sound','clue_chain']
const DIFFICULTIES = ['easy', 'medium', 'hard']

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([])
  const [categories, setCategories] = useState<{ en: string[]; fr: string[] }>({ en: [], fr: [] })
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filters, setFilters] = useState({ lang: '', category: '', type: '', difficulty: '', search: '' })
  const router = useRouter()

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    const res = await fetch(`/api/admin/questions?${params}`)
    const data = await res.json()
    setQuestions(data.questions)
    setCategories(data.categories)
    setLoading(false)
  }, [filters])

  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  async function handleDelete(q: any) {
    if (!confirm(`Delete "${q.question?.slice(0, 60)}…"?`)) return
    setDeleting(q.id)
    await fetch(`/api/admin/questions/${q.id}?lang=${q._lang}&category=${q.category}`, { method: 'DELETE' })
    await fetchQuestions()
    setDeleting(null)
  }

  const allCategories = Array.from(new Set([...categories.en, ...categories.fr])).sort()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">Questions</h1>
        <Link href="/admin/questions/new" className="px-4 py-2 rounded-xl font-bold text-sm text-white" style={{ background: 'linear-gradient(135deg,#4f46e5,#4338ca)' }}>
          ➕ Add Question
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search…"
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          className="bg-white/5 border border-white/10 text-white placeholder-zinc-600 text-sm px-4 py-2 rounded-lg outline-none focus:border-indigo-500 w-56"
        />
        {[
          { key: 'lang', options: ['en', 'fr'], label: 'All langs' },
          { key: 'category', options: allCategories, label: 'All categories' },
          { key: 'type', options: QUESTION_TYPES, label: 'All types' },
          { key: 'difficulty', options: DIFFICULTIES, label: 'All difficulties' },
        ].map(({ key, options, label }) => (
          <select
            key={key}
            value={(filters as any)[key]}
            onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
            className="bg-white/5 border border-white/10 text-zinc-300 text-sm px-3 py-2 rounded-lg outline-none focus:border-indigo-500"
          >
            <option value="">{label}</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        {Object.values(filters).some(Boolean) && (
          <button onClick={() => setFilters({ lang: '', category: '', type: '', difficulty: '', search: '' })} className="text-zinc-500 hover:text-zinc-300 text-sm font-semibold">✕ Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#1f2035' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#0f1117', borderBottom: '1px solid #1f2035' }}>
              <th className="text-left px-4 py-3 text-zinc-500 font-bold text-xs uppercase tracking-wider">Question</th>
              <th className="text-left px-4 py-3 text-zinc-500 font-bold text-xs uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 text-zinc-500 font-bold text-xs uppercase tracking-wider">Diff</th>
              <th className="text-left px-4 py-3 text-zinc-500 font-bold text-xs uppercase tracking-wider">Lang</th>
              <th className="text-left px-4 py-3 text-zinc-500 font-bold text-xs uppercase tracking-wider">Cat</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-600">Loading…</td></tr>
            ) : questions.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-600">No questions found</td></tr>
            ) : questions.map(q => (
              <tr key={`${q.id}-${q._lang}`} style={{ borderBottom: '1px solid #1a1d2e' }} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-zinc-300 max-w-xs">
                  <span className="line-clamp-1">{q.question}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-indigo-400 text-xs font-mono">{q.type}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold ${q.difficulty === 'easy' ? 'text-emerald-400' : q.difficulty === 'medium' ? 'text-amber-400' : 'text-red-400'}`}>
                    {q.difficulty}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs font-mono uppercase">{q._lang}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs">{q.category}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 justify-end">
                    <Link href={`/admin/questions/${q.id}/edit?lang=${q._lang}&category=${q.category}`} className="text-indigo-400 hover:text-indigo-300 font-semibold text-xs">Edit</Link>
                    <button
                      onClick={() => handleDelete(q)}
                      disabled={deleting === q.id}
                      className="text-red-500 hover:text-red-400 font-semibold text-xs disabled:opacity-40"
                    >
                      {deleting === q.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-zinc-600 text-xs mt-3">{questions.length} questions</p>
    </div>
  )
}
```

- [ ] **Step 2: Verify the questions list**

With both servers running (`npm run dev` + `npm run dev:server`):
1. Go to `http://localhost:3000/admin/questions`
2. Should see a table of all questions
3. Try filtering by lang, category, type, difficulty
4. Try the search box
5. Try deleting a question — confirm dialog appears, question disappears from list, game server logs show reload

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/questions/page.tsx
git commit -m "feat(admin): add questions list page with filters and delete"
```

---

## Task 8: Question form component

**Files:**
- Create: `src/components/admin/QuestionForm.tsx`

This is the adaptive form used by both the new and edit pages. It renders different fields depending on the selected `type`.

- [ ] **Step 1: Create `src/components/admin/QuestionForm.tsx`**

```typescript
'use client'

import { useState, useEffect } from 'react'

const QUESTION_TYPES = ['multiple_choice','speed_buzz','true_false','free_text','fill_blank','image_guess','pixel_reveal','ranking','closest_wins','letter_game','flag_guess','music_guess','animal_sound','clue_chain']
const DIFFICULTIES = ['easy', 'medium', 'hard']

interface Props {
  initialValues?: any
  allCategories: { en: string[]; fr: string[] }
  onSubmit: (data: any) => Promise<void>
  submitLabel: string
}

function InputField({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (
    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 text-white placeholder-zinc-600 text-sm py-2.5 px-4 rounded-lg outline-none transition-all"
      />
    </div>
  )
}

function ListField({ label, values, onChange, placeholder }: any) {
  return (
    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">{label}</label>
      <div className="space-y-2">
        {(values || []).map((v: string, i: number) => (
          <div key={i} className="flex gap-2">
            <input
              value={v}
              onChange={e => { const next = [...values]; next[i] = e.target.value; onChange(next) }}
              placeholder={`${placeholder} ${i + 1}`}
              className="flex-1 bg-white/5 border border-white/10 focus:border-indigo-500 text-white placeholder-zinc-600 text-sm py-2 px-3 rounded-lg outline-none"
            />
            <button type="button" onClick={() => onChange(values.filter((_: any, j: number) => j !== i))} className="text-red-500 hover:text-red-400 px-2 font-bold">✕</button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...(values || []), ''])} className="text-indigo-400 hover:text-indigo-300 text-xs font-bold">+ Add</button>
      </div>
    </div>
  )
}

export default function QuestionForm({ initialValues, allCategories, onSubmit, submitLabel }: Props) {
  const defaults = {
    type: 'multiple_choice', category: allCategories.en[0] || '', lang: 'en',
    question: '', difficulty: 'easy', timeLimit: 20, explanation: '',
    options: ['', '', '', ''], correctAnswer: 0,
    ...initialValues,
  }
  const [form, setForm] = useState<any>(defaults)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Categories filtered by the currently selected language
  const categories = allCategories[form.lang as 'en' | 'fr'] ?? allCategories.en

  function set(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }))
  }

  // Reset type-specific fields when type changes
  useEffect(() => {
    if (initialValues?.type === form.type) return
    const resets: Record<string, any> = {
      multiple_choice: { options: ['', '', '', ''], correctAnswer: 0 },
      speed_buzz: { options: ['', '', '', ''], correctAnswer: 0 },
      true_false: { options: ['True', 'False'], correctAnswer: 0 },
      free_text: { correctAnswer: '', acceptableAnswers: [], caseSensitive: false, exactMatch: false },
      fill_blank: { correctAnswer: '', acceptableAnswers: [] },
      image_guess: { imageUrl: '', correctAnswer: '', acceptableAnswers: [] },
      pixel_reveal: { imageUrl: '', correctAnswer: '', acceptableAnswers: [] },
      ranking: { items: ['', '', ''], correctOrder: [0, 1, 2], allowPartialCredit: true },
      closest_wins: { correctAnswer: 0, unit: '' },
      letter_game: { letter: 'A', categories: ['Name', 'Animal', 'Country'] },
      flag_guess: { countryCode: '', correctAnswer: '', acceptableAnswers: [] },
      music_guess: { deezerQuery: '', correctAnswer: '', artist: '', songTitle: '', acceptableAnswers: [] },
      animal_sound: { audioUrl: '', correctAnswer: '', acceptableAnswers: [] },
      clue_chain: { clues: ['', '', '', ''], correctAnswer: '', acceptableAnswers: [] },
    }
    if (resets[form.type]) setForm((f: any) => ({ ...f, ...resets[form.type] }))
  }, [form.type])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSubmit(form)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setSaving(false)
    }
  }

  const t = form.type

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {/* Row 1: Type, Category, Lang */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 text-white text-sm py-2.5 px-3 rounded-lg outline-none">
            {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)} className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 text-white text-sm py-2.5 px-3 rounded-lg outline-none">
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Language</label>
          <select value={form.lang} onChange={e => set('lang', e.target.value)} className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 text-white text-sm py-2.5 px-3 rounded-lg outline-none">
            <option value="en">🇬🇧 EN</option>
            <option value="fr">🇫🇷 FR</option>
          </select>
        </div>
      </div>

      {/* Question text */}
      <div>
        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">
          Question {t === 'fill_blank' && <span className="text-indigo-400 normal-case font-normal">(use ___ for the blank)</span>}
        </label>
        <textarea
          value={form.question}
          onChange={e => set('question', e.target.value)}
          rows={2}
          className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 text-white placeholder-zinc-600 text-sm py-2.5 px-4 rounded-lg outline-none resize-none"
          placeholder="Enter question text…"
        />
      </div>

      {/* Type-specific fields */}
      {(t === 'multiple_choice' || t === 'speed_buzz') && (
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Options <span className="text-indigo-400 normal-case font-normal">(click to mark correct)</span></label>
          <div className="grid grid-cols-2 gap-2">
            {(form.options || ['','','','']).map((opt: string, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <button type="button" onClick={() => set('correctAnswer', i)} className={`w-6 h-6 rounded-full flex-shrink-0 border-2 transition-colors ${form.correctAnswer === i ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`} />
                <input
                  value={opt}
                  onChange={e => { const next = [...(form.options || [])]; next[i] = e.target.value; set('options', next) }}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 bg-white/5 border border-white/10 text-white text-sm py-2 px-3 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {t === 'true_false' && (
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Correct Answer</label>
          <div className="flex gap-3">
            {['True', 'False'].map((v, i) => (
              <button key={v} type="button" onClick={() => set('correctAnswer', i)} className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${form.correctAnswer === i ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-zinc-700 text-zinc-500'}`}>{v}</button>
            ))}
          </div>
        </div>
      )}

      {(t === 'free_text' || t === 'fill_blank') && (
        <>
          <InputField label="Correct Answer" value={form.correctAnswer} onChange={(v: string) => set('correctAnswer', v)} placeholder="The correct answer" />
          <ListField label="Acceptable Answers (alternatives)" values={form.acceptableAnswers} onChange={(v: string[]) => set('acceptableAnswers', v)} placeholder="Alternative answer" />
          {t === 'free_text' && (
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer"><input type="checkbox" checked={!!form.caseSensitive} onChange={e => set('caseSensitive', e.target.checked)} className="rounded" /> Case sensitive</label>
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer"><input type="checkbox" checked={!!form.exactMatch} onChange={e => set('exactMatch', e.target.checked)} className="rounded" /> Exact match only</label>
            </div>
          )}
        </>
      )}

      {(t === 'image_guess' || t === 'pixel_reveal') && (
        <>
          <InputField label="Image URL" value={form.imageUrl} onChange={(v: string) => set('imageUrl', v)} placeholder="https://…" />
          <InputField label="Correct Answer" value={form.correctAnswer} onChange={(v: string) => set('correctAnswer', v)} placeholder="What's in the image?" />
          <ListField label="Acceptable Answers" values={form.acceptableAnswers} onChange={(v: string[]) => set('acceptableAnswers', v)} placeholder="Alternative answer" />
        </>
      )}

      {t === 'ranking' && (
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Items <span className="text-indigo-400 normal-case font-normal">(order them correctly below)</span></label>
          <div className="space-y-2">
            {(form.items || []).map((item: string, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-zinc-600 text-xs w-4">{i + 1}.</span>
                <input
                  value={item}
                  onChange={e => { const next = [...(form.items || [])]; next[i] = e.target.value; set('items', next); set('correctOrder', next.map((_, j) => j)) }}
                  placeholder={`Item ${i + 1}`}
                  className="flex-1 bg-white/5 border border-white/10 text-white text-sm py-2 px-3 rounded-lg outline-none focus:border-indigo-500"
                />
                <button type="button" onClick={() => { const next = (form.items || []).filter((_: any, j: number) => j !== i); set('items', next); set('correctOrder', next.map((_: any, j: number) => j)) }} className="text-red-500 text-xs px-1">✕</button>
              </div>
            ))}
            <button type="button" onClick={() => { const next = [...(form.items || []), '']; set('items', next); set('correctOrder', next.map((_, j) => j)) }} className="text-indigo-400 text-xs font-bold">+ Add item</button>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer mt-3"><input type="checkbox" checked={!!form.allowPartialCredit} onChange={e => set('allowPartialCredit', e.target.checked)} className="rounded" /> Allow partial credit</label>
        </div>
      )}

      {t === 'closest_wins' && (
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Correct Answer (number)" value={form.correctAnswer} onChange={(v: number) => set('correctAnswer', v)} type="number" placeholder="42" />
          <InputField label="Unit (optional)" value={form.unit} onChange={(v: string) => set('unit', v)} placeholder="km, years…" />
        </div>
      )}

      {t === 'letter_game' && (
        <>
          <InputField label="Letter" value={form.letter} onChange={(v: string) => set('letter', v.toUpperCase().slice(0, 1))} placeholder="A" />
          <ListField label="Categories" values={form.categories} onChange={(v: string[]) => set('categories', v)} placeholder="Category name" />
        </>
      )}

      {t === 'flag_guess' && (
        <>
          <InputField label="Country Code (ISO alpha-2)" value={form.countryCode} onChange={(v: string) => set('countryCode', v.toLowerCase())} placeholder="fr" />
          <InputField label="Country Name" value={form.correctAnswer} onChange={(v: string) => set('correctAnswer', v)} placeholder="France" />
          <ListField label="Acceptable Answers (aliases)" values={form.acceptableAnswers} onChange={(v: string[]) => set('acceptableAnswers', v)} placeholder="Alias" />
        </>
      )}

      {t === 'music_guess' && (
        <>
          <InputField label="Deezer Search Query" value={form.deezerQuery} onChange={(v: string) => set('deezerQuery', v)} placeholder="bohemian rhapsody queen" />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Song Title (correct answer)" value={form.correctAnswer} onChange={(v: string) => set('correctAnswer', v)} placeholder="Bohemian Rhapsody" />
            <InputField label="Artist" value={form.artist} onChange={(v: string) => set('artist', v)} placeholder="Queen" />
          </div>
          <InputField label="Song Title (display)" value={form.songTitle} onChange={(v: string) => set('songTitle', v)} placeholder="Bohemian Rhapsody" />
          <ListField label="Acceptable Answers" values={form.acceptableAnswers} onChange={(v: string[]) => set('acceptableAnswers', v)} placeholder="Alternative answer" />
        </>
      )}

      {t === 'animal_sound' && (
        <>
          <InputField label="Audio URL (Wikimedia OGG)" value={form.audioUrl} onChange={(v: string) => set('audioUrl', v)} placeholder="https://upload.wikimedia.org/…" />
          <InputField label="Animal Name (correct answer)" value={form.correctAnswer} onChange={(v: string) => set('correctAnswer', v)} placeholder="Lion" />
          <ListField label="Acceptable Answers" values={form.acceptableAnswers} onChange={(v: string[]) => set('acceptableAnswers', v)} placeholder="Alternative" />
        </>
      )}

      {t === 'clue_chain' && (
        <>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">4 Clues <span className="text-indigo-400 normal-case font-normal">(hardest → easiest)</span></label>
            <div className="space-y-2">
              {[0,1,2,3].map(i => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-zinc-600 text-xs w-4">{i + 1}.</span>
                  <input
                    value={(form.clues || [])[i] || ''}
                    onChange={e => { const next = [...(form.clues || ['','','',''])]; next[i] = e.target.value; set('clues', next) }}
                    placeholder={i === 0 ? 'Hardest clue' : i === 3 ? 'Easiest clue' : `Clue ${i + 1}`}
                    className="flex-1 bg-white/5 border border-white/10 text-white text-sm py-2 px-3 rounded-lg outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>
          <InputField label="Correct Answer" value={form.correctAnswer} onChange={(v: string) => set('correctAnswer', v)} placeholder="The answer" />
          <ListField label="Acceptable Answers" values={form.acceptableAnswers} onChange={(v: string[]) => set('acceptableAnswers', v)} placeholder="Alternative" />
        </>
      )}

      {/* Common: Difficulty + Time limit */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Difficulty</label>
          <div className="flex gap-2">
            {DIFFICULTIES.map(d => (
              <button key={d} type="button" onClick={() => set('difficulty', d)} className={`px-4 py-1.5 rounded-lg font-bold text-xs border transition-colors ${form.difficulty === d ? d === 'easy' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : d === 'medium' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-red-500/20 border-red-500 text-red-400' : 'border-zinc-700 text-zinc-500'}`}>{d}</button>
            ))}
          </div>
        </div>
        <InputField label="Time Limit (seconds)" value={form.timeLimit} onChange={(v: number) => set('timeLimit', v)} type="number" placeholder="20" />
      </div>

      {/* Explanation */}
      <div>
        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Explanation <span className="text-zinc-600 normal-case font-normal">(optional)</span></label>
        <input
          value={form.explanation || ''}
          onChange={e => set('explanation', e.target.value)}
          placeholder="Shown after the answer is revealed…"
          className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 text-white placeholder-zinc-600 text-sm py-2.5 px-4 rounded-lg outline-none"
        />
      </div>

      {error && <p className="text-red-400 text-sm font-semibold">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="px-8 py-3 rounded-xl font-black text-white disabled:opacity-40 transition-all"
        style={{ background: 'linear-gradient(135deg,#4f46e5,#4338ca)', boxShadow: '0 0 24px rgba(79,70,229,0.3)' }}
      >
        {saving ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/QuestionForm.tsx
git commit -m "feat(admin): add adaptive question form component for all 14 types"
```

---

## Task 9: New + Edit question pages

**Files:**
- Create: `src/app/admin/questions/new/page.tsx`
- Create: `src/app/admin/questions/[id]/edit/page.tsx`

- [ ] **Step 1: Create new question page `src/app/admin/questions/new/page.tsx`**

Note: load both EN and FR categories upfront so the category dropdown stays correct when the user switches language in the form. Pass both to `QuestionForm` and let it filter by the current `lang` field.

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import QuestionForm from '@/components/admin/QuestionForm'

export default function NewQuestionPage() {
  const [allCategories, setAllCategories] = useState<{ en: string[]; fr: string[] }>({ en: [], fr: [] })
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/questions')
      .then(r => r.json())
      .then(d => setAllCategories(d.categories))
  }, [])

  async function handleSubmit(data: any) {
    const res = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to create question')
    }
    router.push('/admin/questions')
  }

  const ready = allCategories.en.length > 0 || allCategories.fr.length > 0
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Add Question</h1>
        <p className="text-zinc-500 text-sm mt-1">New question will be saved to the JSON file immediately.</p>
      </div>
      {ready && (
        <QuestionForm allCategories={allCategories} onSubmit={handleSubmit} submitLabel="Save Question" />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create edit question page `src/app/admin/questions/[id]/edit/page.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import QuestionForm from '@/components/admin/QuestionForm'

export default function EditQuestionPage({ params }: { params: { id: string } }) {
  const [question, setQuestion] = useState<any>(null)
  const [allCategories, setAllCategories] = useState<{ en: string[]; fr: string[] }>({ en: [], fr: [] })
  const router = useRouter()
  const searchParams = useSearchParams()
  const lang = searchParams.get('lang') as 'en' | 'fr'
  const category = searchParams.get('category')!

  useEffect(() => {
    // Load question + all categories (both langs) so the category dropdown works if lang is changed
    fetch(`/api/admin/questions?lang=${lang}&category=${category}`)
      .then(r => r.json())
      .then(data => {
        const q = data.questions.find((q: any) => q.id === params.id)
        setQuestion(q ? { ...q, lang, category } : null)
        setAllCategories(data.categories)
      })
  }, [params.id, lang, category])

  async function handleSubmit(data: any) {
    const res = await fetch(`/api/admin/questions/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to update question')
    }
    router.push('/admin/questions')
  }

  if (!question) return <div className="text-zinc-500">Loading…</div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Edit Question</h1>
        <p className="text-zinc-500 text-sm mt-1 font-mono">{question.id} · {lang} · {category}</p>
      </div>
      <QuestionForm
        initialValues={question}
        allCategories={allCategories}
        onSubmit={handleSubmit}
        submitLabel="Update Question"
      />
    </div>
  )
}
```

- [ ] **Step 3: Verify the full flow**

With both servers running:
1. Go to `/admin/questions/new`
2. Select type `multiple_choice`, fill in question + options, mark correct answer, pick difficulty, save
3. Should redirect to `/admin/questions` and the new question should appear in the list
4. Click Edit on any question — form should pre-fill with existing values
5. Make a change and save — verify it's reflected in the list and in the JSON file on disk
6. Check the game server console — should log `🔄 Questions reloaded` after each save

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/questions/
git commit -m "feat(admin): add new and edit question pages"
```

---

## Task 10: Final check

- [ ] **Step 1: Type-check the whole project**

```bash
npm run type-check
```
Expected: no errors.

- [ ] **Step 2: Lint check**

```bash
npm run lint
```
Fix any lint errors.

- [ ] **Step 3: End-to-end smoke test**

1. `/admin` → redirects to `/admin/login` ✓
2. Wrong password → error message ✓
3. Correct password → into `/admin/questions` ✓
4. Browse + filter questions ✓
5. Delete a question → confirm dialog → removed from list + JSON file updated ✓
6. Add a new question (try at least 3 different types) ✓
7. Edit an existing question ✓
8. Logout → back to login ✓
9. Refresh after logout → stays on login ✓

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: admin dashboard complete — question CRUD for all 14 types + auth"
```
