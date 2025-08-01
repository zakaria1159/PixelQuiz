import { QuestionCategory } from '@/types/question'

export const categoryEmojis: Record<QuestionCategory, string> = {
  pop_culture: '🌟',
  gaming: '🎮',
  geography: '🌍',
  sports: '⚽',
  movies: '🎬',
  music: '🎵',
  science: '🔬',
  history: '📚',
  streaming: '📺',
  memes: '😂'
}

export const categoryNames: Record<QuestionCategory, string> = {
  pop_culture: 'Pop Culture',
  gaming: 'Gaming',
  geography: 'Geography',
  sports: 'Sports',
  movies: 'Movies',
  music: 'Music',
  science: 'Science',
  history: 'History',
  streaming: 'Streaming',
  memes: 'Memes'
}

export const getCategoryDisplay = (category: QuestionCategory): string => {
  return `${categoryEmojis[category]} ${categoryNames[category]}`
}
