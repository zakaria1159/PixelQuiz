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
  const [questions, enCats, frCats] = await Promise.all([
    getQuestions(filters),
    getCategories('en'),
    getCategories('fr'),
  ])
  const categories = { en: enCats, fr: frCats }
  return NextResponse.json({ questions, categories })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { lang, category, ...question } = body
  if (!lang || !category) {
    return NextResponse.json({ error: 'lang and category are required' }, { status: 400 })
  }
  const created = await createQuestion(question, lang, category)
  await reloadGameServer()
  return NextResponse.json({ question: created }, { status: 201 })
}
