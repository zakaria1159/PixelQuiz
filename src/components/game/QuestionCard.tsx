'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Question, hasOptions } from '@/types'

interface QuestionCardProps {
  question: Question
  questionIndex: number
  totalQuestions: number
  timeLimit: number
  onAnswerSubmit: (answerIndex: number) => void
  onTimeUp: () => void
}

export const QuestionCard = ({ 
  question, 
  questionIndex, 
  totalQuestions, 
  timeLimit, 
  onAnswerSubmit, 
  onTimeUp 
}: QuestionCardProps) => {
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)

  useEffect(() => {
    // Reset timer state when question changes
    setTimeLeft(timeLimit)
    setSelectedAnswer(null)
    setHasAnswered(false)
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [questionIndex, timeLimit, onTimeUp]) // Added questionIndex and timeLimit as dependencies

  const handleAnswerSelect = (answerIndex: number) => {
    if (hasAnswered || timeLeft === 0) return
    setSelectedAnswer(answerIndex)
  }

  const handleSubmit = () => {
    if (selectedAnswer === null || hasAnswered || timeLeft === 0) return
    setHasAnswered(true)
    onAnswerSubmit(selectedAnswer)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-6">
        <div className="text-sm text-gray-500 mb-2">
          Question {questionIndex + 1} of {totalQuestions}
        </div>
        <div className="text-2xl font-bold text-red-500 mb-2">
          {formatTime(timeLeft)}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-red-500 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${(timeLeft / timeLimit) * 100}%` }}
          />
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">{question.question}</h2>
        
        <div className="space-y-3">
        {hasOptions(question) && question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              disabled={hasAnswered || timeLeft === 0}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                selectedAnswer === index
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${hasAnswered || timeLeft === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="text-center">
        <Button
          onClick={handleSubmit}
          disabled={selectedAnswer === null || hasAnswered || timeLeft === 0}
          variant="primary"
          size="lg"
          className="w-full"
        >
          {hasAnswered ? 'Answer Submitted' : 'Submit Answer'}
        </Button>
      </div>
    </Card>
  )
}
export default QuestionCard;