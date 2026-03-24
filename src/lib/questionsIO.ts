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
