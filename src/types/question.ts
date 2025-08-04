export type QuestionType = 'multiple_choice' | 'free_text' | 'true_false' | 'image_guess' | 'ranking'
export type QuestionDifficulty = 'easy' | 'medium' | 'hard'
export type QuestionCategory = 
  | 'pop_culture' 
  | 'gaming' 
  | 'geography' 
  | 'sports' 
  | 'movies' 
  | 'music' 
  | 'science' 
  | 'history'
  | 'streaming'
  | 'memes'

// Base question interface
interface BaseQuestion {
  id: string
  type: QuestionType
  question: string
  timeLimit: number
  category: QuestionCategory
  difficulty: QuestionDifficulty
  explanation?: string
  imageUrl?: string
}

// Multiple choice specific
export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice'
  options: string[]
  correctAnswer: number // Index of correct option
}

// True/False specific (special case of multiple choice)
export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true_false'
  options: ['True', 'False']
  correctAnswer: number // 0 for True, 1 for False
}

// Free text specific
export interface FreeTextQuestion extends BaseQuestion {
  type: 'free_text'
  correctAnswer: string
  acceptableAnswers?: string[] // Alternative correct answers
  caseSensitive?: boolean // Default false
  exactMatch?: boolean // Default false - allows partial matches
}

// Image guess specific
export interface ImageGuessQuestion extends BaseQuestion {
  type: 'image_guess'
  imageUrl: string // Required for this type
  correctAnswer: string
  acceptableAnswers?: string[]
  caseSensitive?: boolean
  exactMatch?: boolean
}

// Ranking specific
export interface RankingQuestion extends BaseQuestion {
  type: 'ranking'
  items: string[] // Items to be ranked
  correctOrder: number[] // Indices of items in correct chronological order
  allowPartialCredit?: boolean // Default true - give partial credit for partially correct rankings
}

// Union type for all questions
export type Question = MultipleChoiceQuestion | TrueFalseQuestion | FreeTextQuestion | ImageGuessQuestion | RankingQuestion

// Type guards for better TypeScript support
export function isMultipleChoiceQuestion(question: Question): question is MultipleChoiceQuestion {
  return question.type === 'multiple_choice'
}

export function isTrueFalseQuestion(question: Question): question is TrueFalseQuestion {
  return question.type === 'true_false'
}

export function isFreeTextQuestion(question: Question): question is FreeTextQuestion {
  return question.type === 'free_text'
}

export function isImageGuessQuestion(question: Question): question is ImageGuessQuestion {
  return question.type === 'image_guess'
}

export function isRankingQuestion(question: Question): question is RankingQuestion {
  return question.type === 'ranking'
}

export function hasOptions(question: Question): question is MultipleChoiceQuestion | TrueFalseQuestion {
  return isMultipleChoiceQuestion(question) || isTrueFalseQuestion(question)
}

export function requiresRanking(question: Question): question is RankingQuestion {
  return isRankingQuestion(question)
}

export function requiresTextInput(question: Question): question is FreeTextQuestion | ImageGuessQuestion {
  return isFreeTextQuestion(question) || isImageGuessQuestion(question)
}

// Answer validation helpers
export function validateAnswer(question: Question, answer: string | number): boolean {
  if (hasOptions(question)) {
    return typeof answer === 'number' && answer === question.correctAnswer
  }
  
  if (requiresTextInput(question)) {
    if (typeof answer !== 'string') return false
    
    const userAnswer = question.caseSensitive ? answer : answer.toLowerCase()
    const correctAnswer = question.caseSensitive ? question.correctAnswer : question.correctAnswer.toLowerCase()
    
    // Check exact match if required
    if (question.exactMatch) {
      return userAnswer === correctAnswer
    }
    
    // Check main answer
    if (userAnswer.includes(correctAnswer) || correctAnswer.includes(userAnswer)) {
      return true
    }
    
    // Check acceptable answers
    if (question.acceptableAnswers) {
      return question.acceptableAnswers.some(acceptable => {
        const acceptableAnswer = question.caseSensitive ? acceptable : acceptable.toLowerCase()
        return userAnswer.includes(acceptableAnswer) || acceptableAnswer.includes(userAnswer)
      })
    }
    
    return false
  }
  
  return false
}