import { Question, validateAnswer, hasOptions, requiresTextInput, requiresRanking } from '@/types'

// Import the same scoring constants as the server
const POINT_VALUES = {
  easy: { 
    base: 100, 
    timeBonus: 50,
    multiplier: 1.0 
  },
  medium: { 
    base: 200, 
    timeBonus: 100,
    multiplier: 1.2 
  },
  hard: { 
    base: 400, 
    timeBonus: 200,
    multiplier: 1.5 
  }
}

const QUESTION_TYPE_MULTIPLIERS = {
  multiple_choice: 1.0,
  true_false: 0.8,      // Easier, less points
  free_text: 1.3,       // Harder, more points  
  image_guess: 1.5,     // Hardest, most points
  ranking: 1.2          // Good points for ranking (requires thinking)
}

export const calculateScore = (
  question: Question,
  playerAnswer: string | number,
  timeToAnswer: number, 
  timeLimit: number
): number => {
  // First check if answer is correct
  const isCorrect = validateAnswer(question, playerAnswer)
  if (!isCorrect) return 0
  
  const difficulty = question.difficulty || 'medium'
  const questionType = question.type || 'multiple_choice'
  
  // Get base scoring config
  const scoreConfig = POINT_VALUES[difficulty]
  if (!scoreConfig) {
    console.warn(`Unknown difficulty: ${difficulty}, using medium`)
    const mediumConfig = POINT_VALUES.medium
    const typeMultiplier = QUESTION_TYPE_MULTIPLIERS[questionType] || 1.0
    const adjustedBaseScore = Math.round(mediumConfig.base * typeMultiplier)
    const timeLimitMs = timeLimit * 1000
    const timeRatio = Math.max(0, (timeLimitMs - timeToAnswer) / timeLimitMs)
    const timeBonus = Math.round(mediumConfig.timeBonus * typeMultiplier * timeRatio)
    const finalScore = Math.round((adjustedBaseScore + timeBonus) * mediumConfig.multiplier)
    return Math.max(finalScore, Math.round(adjustedBaseScore * 0.3))
  }

  // Calculate base score with type multiplier
  const typeMultiplier = QUESTION_TYPE_MULTIPLIERS[questionType] || 1.0
  const adjustedBaseScore = Math.round(scoreConfig.base * typeMultiplier)

  // Calculate time bonus (faster = more bonus)
  const timeLimitMs = timeLimit * 1000
  const timeRatio = Math.max(0, (timeLimitMs - timeToAnswer) / timeLimitMs)
  const timeBonus = Math.round(scoreConfig.timeBonus * typeMultiplier * timeRatio)

  // Apply difficulty multiplier
  const finalScore = Math.round((adjustedBaseScore + timeBonus) * scoreConfig.multiplier)

  return Math.max(finalScore, Math.round(adjustedBaseScore * 0.3)) // Min 30% of base
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
  } else if (requiresRanking(question)) {
    // Ranking question
    if (typeof answer === 'string') {
      try {
        const order = answer.split(',').map(num => parseInt(num.trim()))
        return order.map(index => question.items[index]).join(' → ')
      } catch {
        return 'Invalid ranking'
      }
    }
    return 'Invalid ranking'
  }
  return 'Unknown answer'
}

export const calculatePlayerRank = (players: Array<{ score: number }>, playerId: string): number => {
  const sorted = [...players].sort((a, b) => b.score - a.score)
  return sorted.findIndex(p => (p as any).id === playerId) + 1
}
