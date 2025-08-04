import { Question, QuestionCategory, QuestionDifficulty } from './question'
import { Player, PlayerAnswer } from './player'

export type GameStatus = 'waiting' | 'starting' | 'question' | 'question_results' | 'reveal_phase' | 'final_results' | 'finished'

export interface GameSettings {
  maxPlayers: number
  questionsPerGame: number
  timePerQuestion: number
  categories: QuestionCategory[]
  difficulty: QuestionDifficulty | 'mixed'
  aiGenerated: boolean
  showExplanations: boolean
  allowSpectators: boolean
}

export interface QuestionResult {
  questionIndex: number
  question: string
  playerAnswer: number
  playerAnswerText: string
  correctAnswer: number
  correctAnswerText: string
  isCorrect: boolean
  time: number
  score: number
}

export interface PlayerFinalResult {
  playerId: string
  playerName: string
  score: number
  totalTime: number
  questionResults: QuestionResult[]
}

export interface GameState {
  id: string
  hostId: string
  players: Player[]
  spectators: Player[]
  questions: Question[]
  currentQuestion: Question | null
  currentQuestionIndex: number
  gameStatus: GameStatus
  answers: Record<string, PlayerAnswer>
  questionStartTime: number
  settings: GameSettings
  finalResults?: PlayerFinalResult[]
  createdAt: number
  updatedAt: number
  readyPlayers?: Record<number, string[]>
}

export interface GameStats {
  totalGames: number
  totalPlayers: number
  averageScore: number
  popularCategories: QuestionCategory[]
}