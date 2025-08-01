import { Question, validateAnswer, hasOptions, requiresTextInput } from '@/types'

export const calculateScore = (
  question: Question,
  playerAnswer: string | number,
  timeToAnswer: number, 
  timeLimit: number
): number => {
  // First check if answer is correct
  const isCorrect = validateAnswer(question, playerAnswer)
  if (!isCorrect) return 0
  
  // Base scores by difficulty
  const baseScores = {
    easy: 500,
    medium: 1000,
    hard: 1500
  }
  
  // Question type multipliers
  const typeMultipliers = {
    multiple_choice: 1.0,
    true_false: 0.8, // Slightly less since it's easier
    free_text: 1.3, // More points for typing
    image_guess: 1.5 // Most points for visual recognition
  }
  
  const baseScore = baseScores[question.difficulty]
  const typeMultiplier = typeMultipliers[question.type]
  
  // Time bonus (0 to 1 multiplier)
  const timeBonus = Math.max(0, (timeLimit - timeToAnswer) / timeLimit)
  
  // Calculate final score
  const adjustedBase = Math.round(baseScore * typeMultiplier)
  const finalScore = Math.round(adjustedBase + (timeBonus * adjustedBase * 0.5))
  
  return Math.max(finalScore, Math.round(adjustedBase * 0.5)) // Minimum 50% of adjusted base
}

export const getAnswerDisplayText = (question: Question, answer: string | number): string => {
  if (hasOptions(question)) {
    // Multiple choice or True/False
    if (typeof answer === 'number' && question.options[answer]) {
      return question.options[answer]
    }
    return 'Invalid option'
  } else if (requiresTextInput(question)) {
    // Free text or Image guess
    return typeof answer === 'string' ? answer : 'Invalid answer'
  }
  return 'Unknown answer'
}

export const calculatePlayerRank = (players: Array<{ score: number }>, playerId: string): number => {
  const sorted = [...players].sort((a, b) => b.score - a.score)
  return sorted.findIndex(p => (p as any).id === playerId) + 1
}
