'use client'

import React, { useState, useEffect, useRef } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import AnswerOptions from '@/components/game/AnswerOptions'
import RankingOptions from '@/components/game/RankingOptions'
import { 
  Question, 
  isMultipleChoiceQuestion, 
  isTrueFalseQuestion,
  isFreeTextQuestion, 
  isImageGuessQuestion,
  hasOptions,
  requiresTextInput,
  requiresRanking
} from '@/types'

interface SharedGameViewProps {
  question: Question
  questionIndex: number
  totalQuestions: number
  timeLimit: number
  players: any[]
  answeredPlayers: string[]
  currentPlayerId: string
  onAnswerSubmit: (answer: string | number) => void
  onTimeUp: () => void
}

export function SharedGameView({
  question,
  questionIndex,
  totalQuestions,
  timeLimit,
  players,
  answeredPlayers,
  currentPlayerId,
  onAnswerSubmit,
  onTimeUp
}: SharedGameViewProps) {
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [answerText, setAnswerText] = useState('')
  const [selectedOption, setSelectedOption] = useState<number | undefined>(undefined)
  const [selectedOrder, setSelectedOrder] = useState<number[] | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const onTimeUpRef = useRef(onTimeUp)

  // Update ref when callback changes
  useEffect(() => {
    onTimeUpRef.current = onTimeUp
  }, [onTimeUp])

  // Reset state when question changes
  useEffect(() => {
    setTimeLeft(timeLimit)
    setAnswerText('')
    setSelectedOption(undefined)
    setSelectedOrder(null)
    setHasAnswered(false)
  }, [questionIndex, timeLimit])

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUpRef.current()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onTimeUpRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft]) // Remove onTimeUp from dependencies to prevent timer recreation

  const handleSubmit = () => {
    if (hasAnswered) return

    let answer: string | number | number[]
    
    if (hasOptions(question)) {
      // Multiple choice or True/False
      if (selectedOption === undefined) return
      answer = selectedOption
    } else if (requiresTextInput(question)) {
      // Free text or Image guess
      if (!answerText.trim()) return
      answer = answerText.trim()
    } else if (requiresRanking(question)) {
      // Ranking question
      if (selectedOrder === null) return
      answer = selectedOrder.join(',') // Convert array to comma-separated string
    } else {
      return // Unknown question type
    }

    setHasAnswered(true)
    onAnswerSubmit(answer)
  }

  const handleOptionSelect = (optionIndex: number) => {
    if (hasAnswered || timeLeft === 0) return
    setSelectedOption(optionIndex)
  }

  const handleOrderChange = (order: number[]) => {
    if (hasAnswered || timeLeft === 0) return
    setSelectedOrder(order)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && requiresTextInput(question) && answerText.trim() && !hasAnswered) {
      handleSubmit()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const answeredCount = answeredPlayers.length
  const totalPlayers = players.length
  const progressPercentage = totalPlayers > 0 ? (answeredCount / totalPlayers) * 100 : 0

  const canSubmit = hasAnswered || timeLeft === 0 ? false : 
    hasOptions(question) ? selectedOption !== null :
    requiresTextInput(question) ? answerText.trim().length > 0 :
    requiresRanking(question) ? selectedOrder !== null : false

  const getQuestionTypeIndicator = () => {
    switch (question.type) {
      case 'multiple_choice': return '🔘 Multiple Choice'
      case 'true_false': return '✓❌ True or False'
      case 'free_text': return '✍️ Type Your Answer'
      case 'image_guess': return '🖼️ Guess the Image'
      case 'ranking': return '📋 Rank Items'
      default: return '❓ Question'
    }
  }

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with timer and progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-white">
              Question {questionIndex + 1} of {totalQuestions}
            </div>
            <div className="text-2xl font-bold text-red-400">
              {formatTime(timeLeft)}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-700 rounded-none h-4 mb-4 border-2 border-gray-600">
            <div 
              className="bg-green-500 h-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          <div className="text-center text-sm text-white">
            {answeredCount} of {totalPlayers} players answered
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question Section */}
          <div className="lg:col-span-2">
            <Card className="p-6 bg-gray-800 border-gray-600">
              {/* Question type indicator */}
              <div className="text-center mb-4">
                <span className="text-sm bg-blue-600 text-white px-3 py-1 rounded border-2 border-blue-400 font-bold uppercase">
                  {getQuestionTypeIndicator()}
                </span>
              </div>

              {/* Image for image guess questions */}
              {isImageGuessQuestion(question) && question.imageUrl && (
                <div className="text-center mb-6">
                  <img 
                    src={question.imageUrl} 
                    alt="Question image" 
                    className="max-w-full max-h-64 mx-auto border-4 border-gray-600"
                  />
                </div>
              )}

              <h2 className="text-xl font-semibold mb-6 text-white text-center">{question.question}</h2>
              
              {/* Answer input based on question type */}
              {hasOptions(question) ? (
                // Multiple choice or True/False
                <AnswerOptions
                  options={question.options}
                  selectedAnswer={selectedOption}
                  onAnswerSelect={handleOptionSelect}
                  disabled={hasAnswered || timeLeft === 0}
                  timeLeft={timeLeft}
                />
              ) : requiresTextInput(question) ? (
                // Free text or Image guess
                <div className="space-y-4">
                  <div>
                    <label htmlFor="answer-input" className="block text-sm font-medium text-white mb-2">
                      Your Answer:
                    </label>
                    <input
                      id="answer-input"
                      type="text"
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={hasAnswered || timeLeft === 0}
                      placeholder={
                        isFreeTextQuestion(question) ? "Type your answer here..." :
                        isImageGuessQuestion(question) ? "What do you see in the image?" :
                        "Type your answer..."
                      }
                      className="w-full p-4 border-4 border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none transition-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {requiresTextInput(question) && !question.caseSensitive && (
                      <p className="text-xs text-gray-400 mt-1">💡 Not case sensitive</p>
                    )}
                    {requiresTextInput(question) && !question.exactMatch && (
                      <p className="text-xs text-gray-400 mt-1">💡 Partial answers accepted</p>
                    )}
                  </div>
                </div>
              ) : requiresRanking(question) ? (
                // Ranking question
                <RankingOptions
                  items={question.items}
                  selectedOrder={selectedOrder}
                  onOrderChange={handleOrderChange}
                  disabled={hasAnswered || timeLeft === 0}
                  timeLeft={timeLeft}
                />
              ) : null}

              <div className="text-center mt-6">
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  {hasAnswered ? 'Answer Submitted ✓' : 'Submit Answer'}
                </Button>
              </div>
            </Card>
          </div>

          {/* Players Activity Section */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-gray-800 border-gray-600">
              <h3 className="text-lg font-semibold mb-4 text-white">Players</h3>
              
              <div className="space-y-3">
                {players.map((player) => {
                  const hasAnswered = answeredPlayers.includes(player.id)
                  const isCurrentPlayer = player.id === currentPlayerId
                  
                  return (
                    <div 
                      key={player.id} 
                      className={`flex items-center p-3 border-4 transition-none ${
                        isCurrentPlayer 
                          ? 'border-blue-400 bg-blue-900' 
                          : 'border-gray-600 bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center flex-1">
                        <div className={`w-3 h-3 mr-3 ${
                          hasAnswered ? 'bg-green-400' : 'bg-gray-500'
                        }`} />
                        <span className="font-medium text-white">{player.name}</span>
                        {isCurrentPlayer && (
                          <span className="ml-2 text-xs bg-blue-700 text-blue-200 px-2 py-1 border border-blue-500">
                            You
                          </span>
                        )}
                      </div>
                      
                      <div className="text-right">
                        {hasAnswered ? (
                          <span className="text-blue-400 text-sm">📝 Submitted</span>
                        ) : (
                          <span className="text-gray-400 text-sm">⏳ Waiting</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Answer Status Summary */}
              <div className="mt-6 p-4 bg-gray-700 border-2 border-gray-600">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {answeredCount}/{totalPlayers}
                  </div>
                  <div className="text-sm text-gray-300">
                    Players Answered
                  </div>
                </div>
              </div>

              {/* Question difficulty and category */}
              <div className="mt-4 p-3 bg-gray-700 border-2 border-gray-600">
                <div className="text-xs text-gray-300 text-center space-y-1">
                  <div>
                    <span className="font-bold">Category:</span> {question.category.replace('_', ' ')}
                  </div>
                  <div>
                    <span className="font-bold">Difficulty:</span> 
                    <span className={`ml-1 ${
                      question.difficulty === 'easy' ? 'text-green-400' :
                      question.difficulty === 'medium' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {question.difficulty.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}