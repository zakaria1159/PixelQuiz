export type QuestionType = 'multiple_choice' | 'free_text' | 'true_false' | 'image_guess' | 'ranking' | 'closest_wins' | 'speed_buzz' | 'fill_blank' | 'pixel_reveal' | 'letter_game' | 'flag_guess' | 'music_guess' | 'animal_sound' | 'clue_chain'
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

// Speed Buzz specific — same structure as MC, but rank-based scoring
export interface SpeedBuzzQuestion extends BaseQuestion {
  type: 'speed_buzz'
  options: string[]
  correctAnswer: number // Index of correct option
}

// Pixel Reveal — image starts heavily pixelated and sharpens over time; answer early for more points
export interface PixelRevealQuestion extends BaseQuestion {
  type: 'pixel_reveal'
  imageUrl: string
  correctAnswer: string
  acceptableAnswers?: string[]
  caseSensitive?: boolean
}

// Fill in the blank — question field contains the sentence with ___ as the blank
export interface FillBlankQuestion extends BaseQuestion {
  type: 'fill_blank'
  correctAnswer: string      // The single missing word
  acceptableAnswers?: string[] // Alternative accepted spellings/forms
  caseSensitive?: boolean    // Default false
}

// Closest wins specific
export interface ClosestWinsQuestion extends BaseQuestion {
  type: 'closest_wins'
  correctAnswer: number  // The exact correct number
  unit?: string          // e.g. "million subscribers", "years", "km"
}

// Letter game (Scattergories-style) — given a letter, fill one word per category
export interface LetterGameQuestion extends BaseQuestion {
  type: 'letter_game'
  letter: string       // Single uppercase letter, e.g. 'A'
  categories: string[] // e.g. ['Name', 'Animal', 'Country', 'Fruit/Vegetable', 'Profession', 'Object']
  // No correctAnswer — scored by ratio of valid entries (each word must start with `letter`)
}

// Flag guess — show a country flag, player types the country name
export interface FlagGuessQuestion extends BaseQuestion {
  type: 'flag_guess'
  countryCode: string    // ISO 3166-1 alpha-2 lowercase, e.g. 'fr'
  correctAnswer: string  // Country name, e.g. 'France'
  acceptableAnswers?: string[] // Common aliases e.g. ['USA', 'United States of America']
}

// Music guess — play a Deezer preview clip, player types the song title
export interface MusicGuessQuestion extends BaseQuestion {
  type: 'music_guess'
  deezerQuery: string        // e.g. "bohemian rhapsody queen" — used to fetch preview from Deezer
  correctAnswer: string      // song title
  acceptableAnswers?: string[] // aliases (artist name, alternate titles)
  artist?: string            // for display in reveal
  songTitle?: string         // for display in reveal
}

// Clue chain — 4 hints revealed progressively; answer earlier for more points
export interface ClueChainQuestion extends BaseQuestion {
  type: 'clue_chain'
  clues: string[]          // 4 clues ordered hardest → easiest
  correctAnswer: string
  acceptableAnswers?: string[]
}

// Animal sound — play a short animal sound clip, player types the animal name
export interface AnimalSoundQuestion extends BaseQuestion {
  type: 'animal_sound'
  audioUrl: string           // direct audio URL (Wikimedia Commons OGG)
  correctAnswer: string      // animal name, e.g. 'Lion'
  acceptableAnswers?: string[]
}

// Union type for all questions
export type Question = MultipleChoiceQuestion | TrueFalseQuestion | FreeTextQuestion | ImageGuessQuestion | RankingQuestion | ClosestWinsQuestion | SpeedBuzzQuestion | FillBlankQuestion | PixelRevealQuestion | LetterGameQuestion | FlagGuessQuestion | MusicGuessQuestion | AnimalSoundQuestion | ClueChainQuestion

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

export function hasOptions(question: Question): question is MultipleChoiceQuestion | TrueFalseQuestion | SpeedBuzzQuestion {
  return isMultipleChoiceQuestion(question) || isTrueFalseQuestion(question) || isSpeedBuzzQuestion(question)
}

export function requiresRanking(question: Question): question is RankingQuestion {
  return isRankingQuestion(question)
}

export function requiresTextInput(question: Question): question is FreeTextQuestion | ImageGuessQuestion | MusicGuessQuestion | AnimalSoundQuestion | ClueChainQuestion {
  return isFreeTextQuestion(question) || isImageGuessQuestion(question) || isMusicGuessQuestion(question) || isAnimalSoundQuestion(question) || isClueChainQuestion(question)
}

export function isClosestWinsQuestion(question: Question): question is ClosestWinsQuestion {
  return question.type === 'closest_wins'
}

export function isSpeedBuzzQuestion(question: Question): question is SpeedBuzzQuestion {
  return question.type === 'speed_buzz'
}

export function isFillBlankQuestion(question: Question): question is FillBlankQuestion {
  return question.type === 'fill_blank'
}

export function isPixelRevealQuestion(question: Question): question is PixelRevealQuestion {
  return question.type === 'pixel_reveal'
}

export function isLetterGameQuestion(question: Question): question is LetterGameQuestion {
  return question.type === 'letter_game'
}

export function isFlagGuessQuestion(question: Question): question is FlagGuessQuestion {
  return question.type === 'flag_guess'
}

export function isMusicGuessQuestion(question: Question): question is MusicGuessQuestion {
  return question.type === 'music_guess'
}

export function isAnimalSoundQuestion(question: Question): question is AnimalSoundQuestion {
  return question.type === 'animal_sound'
}

export function isClueChainQuestion(question: Question): question is ClueChainQuestion {
  return question.type === 'clue_chain'
}

