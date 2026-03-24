import { NextRequest, NextResponse } from 'next/server'
import { updateQuestion, deleteQuestion, reloadGameServer } from '@/lib/questionsIO'

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
  const category = searchParams.get('category')
  if (!lang || !category) {
    return NextResponse.json({ error: 'lang and category are required' }, { status: 400 })
  }
  const ok = deleteQuestion(params.id, lang, category)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await reloadGameServer()
  return NextResponse.json({ ok: true })
}
