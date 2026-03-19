// src/stores/gameStore.ts - Game State Management with Zustand
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { GameState, Player, Question, GameSettings, PlayerAnswer } from '@/types'

interface GameStore {
  // State
  gameState: GameState | null
  isHost: boolean
  isConnected: boolean
  connectionError: string | null
  currentPlayer: Player | null
  currentQuestion: Question | null
  questionIndex: number
  totalQuestions: number
  timeLimit: number
  questionResults: any[]
  questionStartTime: number
  answeredPlayers: string[]
  lang: string

  // Actions
  setGameState: (gameState: GameState) => void
  setLang: (lang: string) => void
  updateGameState: (updates: Partial<GameState>) => void
  setIsHost: (isHost: boolean) => void
  setIsConnected: (connected: boolean) => void
  setConnectionError: (error: string | null) => void
  setCurrentPlayer: (player: Player | null) => void
  setCurrentQuestion: (question: Question | null) => void
  setQuestionIndex: (index: number) => void
  setTotalQuestions: (total: number) => void
  setTimeLimit: (limit: number) => void
  setQuestionResults: (results: any[]) => void
  setQuestionStartTime: (time: number) => void
  setAnsweredPlayers: (answeredPlayers: string[]) => void
  
  // Player actions
  addPlayer: (player: Player) => void
  removePlayer: (playerId: string) => void
  updatePlayer: (playerId: string, updates: Partial<Player>) => void
  updatePlayerScore: (playerId: string, score: number) => void
  
  // Game flow actions
  startGame: () => void
  endGame: () => void
  nextQuestion: () => void
  submitAnswer: (playerId: string, answer: PlayerAnswer) => void
  clearAnswers: () => void
  
  // Settings
  updateSettings: (settings: Partial<GameSettings>) => void
  
  // Reset
  resetGame: () => void
  resetStore: () => void
}

const initialGameState: GameState = {
  id: '',
  hostId: '',
  players: [],
  spectators: [],
  questions: [],
  currentQuestion: null,
  currentQuestionIndex: 0,
  gameStatus: 'waiting',
  answers: {},
  questionStartTime: 0,
  settings: {
    maxPlayers: 10,
    questionsPerGame: 8,
    timePerQuestion: 15,
    categories: ['pop_culture'],
    difficulty: 'mixed',
    aiGenerated: false,
    showExplanations: true,
    allowSpectators: false
  },
  createdAt: Date.now(),
  updatedAt: Date.now()
}

export const useGameStore = create<GameStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      gameState: null,
      isHost: false,
      isConnected: false,
      connectionError: null,
      currentPlayer: null,
      currentQuestion: null,
      questionIndex: 0,
      totalQuestions: 0,
      timeLimit: 15,
      questionResults: [],
      questionStartTime: 0,
      answeredPlayers: [],
      lang: 'en',

      // Basic setters
      setLang: (lang) => set({ lang }, false, 'setLang'),

      setGameState: (gameState) =>
        set({ gameState: { ...gameState, updatedAt: Date.now() } }, false, 'setGameState'),

      updateGameState: (updates) =>
        set((state) => ({
          gameState: state.gameState 
            ? { ...state.gameState, ...updates, updatedAt: Date.now() }
            : null
        }), false, 'updateGameState'),

      setIsHost: (isHost) => 
        set({ isHost }, false, 'setIsHost'),

      setIsConnected: (isConnected) => 
        set({ isConnected, connectionError: isConnected ? null : get().connectionError }, false, 'setIsConnected'),

      setConnectionError: (connectionError) => 
        set({ connectionError }, false, 'setConnectionError'),

      setCurrentPlayer: (currentPlayer) => 
        set({ currentPlayer }, false, 'setCurrentPlayer'),

      setCurrentQuestion: (currentQuestion) => 
        set({ currentQuestion }, false, 'setCurrentQuestion'),

      setQuestionIndex: (questionIndex) => 
        set({ questionIndex }, false, 'setQuestionIndex'),

      setTotalQuestions: (totalQuestions) => 
        set({ totalQuestions }, false, 'setTotalQuestions'),

      setTimeLimit: (timeLimit) => 
        set({ timeLimit }, false, 'setTimeLimit'),

      setQuestionResults: (questionResults) => 
        set({ questionResults }, false, 'setQuestionResults'),

      setQuestionStartTime: (questionStartTime) => 
        set({ questionStartTime }, false, 'setQuestionStartTime'),

      setAnsweredPlayers: (answeredPlayers) =>
        set({ answeredPlayers }, false, 'setAnsweredPlayers'),

      // Player management
      addPlayer: (player) =>
        set((state) => ({
          gameState: state.gameState 
            ? {
                ...state.gameState,
                players: [...state.gameState.players, player],
                updatedAt: Date.now()
              }
            : null
        }), false, 'addPlayer'),

      removePlayer: (playerId) =>
        set((state) => ({
          gameState: state.gameState 
            ? {
                ...state.gameState,
                players: state.gameState.players.filter(p => p.id !== playerId),
                updatedAt: Date.now()
              }
            : null
        }), false, 'removePlayer'),

      updatePlayer: (playerId, updates) =>
        set((state) => ({
          gameState: state.gameState 
            ? {
                ...state.gameState,
                players: state.gameState.players.map(p => 
                  p.id === playerId ? { ...p, ...updates } : p
                ),
                updatedAt: Date.now()
              }
            : null
        }), false, 'updatePlayer'),

      updatePlayerScore: (playerId, newScore) =>
        set((state) => ({
          gameState: state.gameState 
            ? {
                ...state.gameState,
                players: state.gameState.players.map(p => 
                  p.id === playerId ? { ...p, score: newScore } : p
                ),
                updatedAt: Date.now()
              }
            : null
        }), false, 'updatePlayerScore'),

      // Game flow
      startGame: () =>
        set((state) => ({
          gameState: state.gameState 
            ? {
                ...state.gameState,
                gameStatus: 'question',
                currentQuestionIndex: 0,
                updatedAt: Date.now()
              }
            : null
        }), false, 'startGame'),

      endGame: () =>
        set((state) => ({
          gameState: state.gameState 
            ? {
                ...state.gameState,
                gameStatus: 'finished',
                updatedAt: Date.now()
              }
            : null
        }), false, 'endGame'),

      nextQuestion: () =>
        set((state) => ({
          gameState: state.gameState 
            ? {
                ...state.gameState,
                currentQuestionIndex: state.gameState.currentQuestionIndex + 1,
                answers: {},
                questionStartTime: Date.now(),
                updatedAt: Date.now()
              }
            : null
        }), false, 'nextQuestion'),



      submitAnswer: (playerId, answer) =>
        set((state) => ({
          gameState: state.gameState 
            ? {
                ...state.gameState,
                answers: {
                  ...state.gameState.answers,
                  [playerId]: answer
                },
                updatedAt: Date.now()
              }
            : null
        }), false, 'submitAnswer'),

      clearAnswers: () =>
        set((state) => ({
          gameState: state.gameState 
            ? {
                ...state.gameState,
                answers: {},
                updatedAt: Date.now()
              }
            : null
        }), false, 'clearAnswers'),

      // Settings
      updateSettings: (settingsUpdate) =>
        set((state) => ({
          gameState: state.gameState 
            ? {
                ...state.gameState,
                settings: { ...state.gameState.settings, ...settingsUpdate },
                updatedAt: Date.now()
              }
            : null
        }), false, 'updateSettings'),

      // Reset functions
      resetGame: () =>
        set((state) => ({
          gameState: state.gameState 
            ? {
                ...state.gameState,
                currentQuestionIndex: 0,
                currentQuestion: null,
                answers: {},
                gameStatus: 'waiting',
                players: state.gameState.players.map(p => ({ ...p, score: 0 })),
                updatedAt: Date.now()
              }
            : null
        }), false, 'resetGame'),

      resetStore: () =>
        set({
          gameState: null,
          isHost: false,
          isConnected: false,
          connectionError: null,
          currentPlayer: null
        }, false, 'resetStore'),
    }),
    {
      name: 'game-store',
      // Only enable devtools in development
      enabled: process.env.NODE_ENV === 'development'
    }
  )
)

// Selector hooks for better performance
export const useGameState = () => useGameStore(state => state.gameState)
export const useIsHost = () => useGameStore(state => state.isHost)
export const useIsConnected = () => useGameStore(state => state.isConnected)
export const useConnectionError = () => useGameStore(state => state.connectionError)
export const useCurrentPlayer = () => useGameStore(state => state.currentPlayer)
export const usePlayers = () => useGameStore(state => state.gameState?.players || [])
export const useGameStatus = () => useGameStore(state => state.gameState?.gameStatus || 'waiting')
export const useCurrentQuestion = () => useGameStore(state => state.gameState?.currentQuestion)
export const useGameSettings = () => useGameStore(state => state.gameState?.settings || initialGameState.settings)