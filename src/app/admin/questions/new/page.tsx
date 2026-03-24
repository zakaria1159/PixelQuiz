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
