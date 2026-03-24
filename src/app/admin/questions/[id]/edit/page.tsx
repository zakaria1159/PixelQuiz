'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import QuestionForm from '@/components/admin/QuestionForm'

function EditQuestionContent({ id }: { id: string }) {
  const [question, setQuestion] = useState<any>(null)
  const [allCategories, setAllCategories] = useState<{ en: string[]; fr: string[] }>({ en: [], fr: [] })
  const router = useRouter()
  const searchParams = useSearchParams()
  const lang = searchParams.get('lang') as 'en' | 'fr'
  const category = searchParams.get('category')!

  useEffect(() => {
    fetch(`/api/admin/questions?lang=${lang}&category=${category}`)
      .then(r => r.json())
      .then(data => {
        const q = data.questions.find((q: any) => q.id === id)
        setQuestion(q ? { ...q, lang, category } : null)
        setAllCategories(data.categories)
      })
  }, [id, lang, category])

  async function handleSubmit(data: any) {
    const res = await fetch(`/api/admin/questions/${id}`, {
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

export default function EditQuestionPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="text-zinc-500">Loading…</div>}>
      <EditQuestionContent id={params.id} />
    </Suspense>
  )
}
