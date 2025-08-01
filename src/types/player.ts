// src/types/player.ts - Updated PlayerAnswer for hybrid system
export interface Player {
  id: string
  name: string
  score: number
  isHost: boolean
  connected: boolean
  avatar: string
  joinedAt: number
}

export interface PlayerAnswer {
  playerId: string
  questionId: string
  answer: string | number // Can be either text or option index
  answerText?: string // The display text of the answer (for multiple choice)
  timeToAnswer: number
  timestamp: number
}

// src/lib/scoreCalculator.ts - Updated scoring for hybrid questions
// src/hooks/useGame.ts - Updated answer submission