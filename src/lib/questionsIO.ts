import { createClient, SupabaseClient } from '@supabase/supabase-js'

function getClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

// Maps a DB row back to the flat question shape the rest of the app expects
function rowToQuestion(row: any): any {
  const { id, lang, category, type, question, difficulty, time_limit, explanation, data } = row
  return {
    id,
    _lang: lang,
    category,
    type,
    question,
    difficulty,
    timeLimit: time_limit,
    ...(explanation != null ? { explanation } : {}),
    ...data,
  }
}

// Splits a flat question object into common columns + type-specific data blob
function splitQuestion(q: any): { common: Record<string, any>; data: Record<string, any> } {
  const { id, _lang, category, type, question, difficulty, timeLimit, explanation, ...rest } = q
  return {
    common: { id, category, type, question, difficulty, time_limit: timeLimit, explanation: explanation ?? null },
    data: rest,
  }
}

export interface QuestionFilter {
  lang?: 'en' | 'fr'
  category?: string
  type?: string
  difficulty?: string
  search?: string
}

export async function getCategories(lang: 'en' | 'fr'): Promise<string[]> {
  const { data, error } = await getClient()
    .from('questions')
    .select('category')
    .eq('lang', lang)
  if (error || !data) return []
  return Array.from(new Set(data.map((r: any) => r.category as string))).sort()
}

export async function getQuestions(filters: QuestionFilter = {}): Promise<any[]> {
  let query = getClient().from('questions').select('*')

  if (filters.lang) query = query.eq('lang', filters.lang)
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.type) query = query.eq('type', filters.type)
  if (filters.difficulty) query = query.eq('difficulty', filters.difficulty)

  const { data, error } = await query
  if (error || !data) return []

  let results = data.map(rowToQuestion)

  if (filters.search) {
    const s = filters.search.toLowerCase()
    results = results.filter((q: any) => q.question?.toLowerCase().includes(s))
  }

  return results
}

export async function getQuestion(
  id: string,
  lang?: 'en' | 'fr'
): Promise<{ question: any; lang: 'en' | 'fr'; category: string } | null> {
  let query = getClient().from('questions').select('*').eq('id', id)
  if (lang) query = query.eq('lang', lang)

  const { data, error } = await query.maybeSingle()
  if (error || !data) return null

  return { question: rowToQuestion(data), lang: data.lang, category: data.category }
}

export async function createQuestion(question: any, lang: 'en' | 'fr', category: string): Promise<any> {
  const id = `${category.slice(0, 2)}${Date.now()}${Math.random().toString(36).slice(2, 5)}`
  const newQ = { ...question, id, category }
  delete newQ._lang

  const { common, data } = splitQuestion(newQ)

  const { data: inserted, error } = await getClient()
    .from('questions')
    .insert({ ...common, lang, data })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return rowToQuestion(inserted)
}

export async function updateQuestion(
  id: string,
  updates: any,
  lang: 'en' | 'fr',
  category: string
): Promise<any | null> {
  const existing = await getQuestion(id, lang)
  if (!existing) return null

  const merged = { ...existing.question, ...updates, id }
  delete merged._lang

  const { common, data } = splitQuestion(merged)

  const { data: updated, error } = await getClient()
    .from('questions')
    .update({ ...common, lang, data })
    .eq('id', id)
    .eq('lang', lang)
    .select()
    .single()

  if (error) return null
  return rowToQuestion(updated)
}

export async function deleteQuestion(id: string, lang: 'en' | 'fr', category: string): Promise<boolean> {
  const { error, count } = await getClient()
    .from('questions')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('lang', lang)
    .eq('category', category)

  return !error && (count ?? 0) > 0
}

// Notify game server to reload its in-memory question cache from the DB
export async function reloadGameServer(): Promise<void> {
  try {
    const base = process.env.GAME_SERVER_URL || 'http://localhost:3003'
    const secret = process.env.ADMIN_PASSWORD || ''
    await fetch(`${base}/internal/reload-questions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
    })
  } catch {
    // Non-fatal: server may not be running in dev
  }
}
