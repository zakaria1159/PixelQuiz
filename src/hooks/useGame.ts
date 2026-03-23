// src/hooks/useGame.ts - Main game hook that connects Socket.io with Zustand
import { useEffect, useCallback, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import socketManager from '@/lib/socket'
import { useGameStore } from '@/stores/gameStore'
import { Player, GameState, Question } from '@/types'
import { getAnswerDisplayText } from '@/lib/scoreCalculator'

interface UseGameOptions {
  gameCode?: string
  playerName?: string
  isHost?: boolean
  autoConnect?: boolean
}

export const useGame = (options: UseGameOptions = {}) => {
  const router = useRouter()
  const { gameCode, playerName, isHost = false, autoConnect = true } = options
  
  // Store state and actions
  const {
    gameState,
    isConnected,
    connectionError,
    currentPlayer,
    answeredPlayers,
    setGameState,
    setIsHost,
    setIsConnected,
    setConnectionError,
    setCurrentPlayer,
    addPlayer,
    removePlayer,
    updatePlayer,
    resetStore,
    setCurrentQuestion,
    setQuestionIndex,
    setTotalQuestions,
    setTimeLimit,
    setQuestionResults,
    setQuestionStartTime,
    setAnsweredPlayers
  } = useGameStore()

  // Track ready states for consensus system
  const [readyPlayers, setReadyPlayers] = useState<{[questionIndex: number]: string[]}>({})
  
  // Challenge system state
  const [questionScores, setQuestionScores] = useState<any>(null)
  const [currentChallenge, setCurrentChallenge] = useState<any>(null)
  const [challengeVoting, setChallengeVoting] = useState<any>(null)
  const [voteTimeLeft, setVoteTimeLeft] = useState(20)
  const [challengeResult, setChallengeResult] = useState<any>(null)


  const [isAbandoned, setIsAbandoned] = useState(false)

  // Track if we've already connected to avoid duplicate connections
  const hasConnected = useRef(false)
  const currentGameCode = useRef<string | null>(null)
  const hiddenAt = useRef<number | null>(null)

  // Connect to socket on mount
  useEffect(() => {
    if (autoConnect && !hasConnected.current) {
      const socket = socketManager.connect()
      
      // Listen for connection events
      socket.on('connect', () => {
        console.log('🔌 Socket connected:', socket.id)
        setIsConnected(true)
        hasConnected.current = true

        if (isHost) setIsHost(true)

        // Auto-rejoin if we have a game code (handles refresh/reconnect)
        if (gameCode && playerName) {
          console.log('🔄 Attempting rejoin:', gameCode, playerName)
          socketManager.rejoinGame(gameCode, playerName, isHost)
        }
      })

      socket.on('disconnect', () => {
        console.log('❌ Socket disconnected')
        setIsConnected(false)
        hasConnected.current = false
      })

      socket.on('connect_error', (error) => {
        console.error('🔴 Connection error:', error)
        setIsConnected(false)
        setConnectionError('Failed to connect to server')
      })

      socket.on('error', (error) => {
        console.error('🔴 Socket error:', error)
        // Don't show connection errors for normal game state transitions
        if (error.message && !error.message.includes('Game not in question state')) {
          setConnectionError(error.message)
        }
      })
    }

    // Handle tab switch / app background on mobile
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now()
      } else if (document.visibilityState === 'visible') {
        const awayMs = hiddenAt.current ? Date.now() - hiddenAt.current : 0
        hiddenAt.current = null

        // Away for more than 90 seconds — treat as abandoned
        if (awayMs > 90 * 1000) {
          setIsAbandoned(true)
          return
        }

        if (gameCode && playerName) {
          const socket = socketManager.getSocket()
          if (!socket || !socket.connected) {
            console.log('📱 Page visible — socket lost, reconnecting...')
            socketManager.connect()
          } else {
            console.log('📱 Page visible — re-syncing state...')
            socketManager.rejoinGame(gameCode, playerName, isHost)
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (currentGameCode.current) {
        socketManager.leaveGame(currentGameCode.current)
      }
      socketManager.offAllGameEvents()
      // Remove raw connection listeners registered above
      const s = socketManager.getSocket()
      if (s) {
        s.off('connect')
        s.off('disconnect')
        s.off('connect_error')
        s.off('error')
      }
    }
  }, [autoConnect, isHost, gameCode, playerName, setIsConnected, setIsHost, setConnectionError])

  // Setup socket event listeners
  useEffect(() => {
    // Rejoin success — restore full game state after refresh/reconnect
    socketManager.onRejoinSuccess((data) => {
      console.log('🔄 Rejoin successful')
      setGameState(data.gameState)
      currentGameCode.current = gameCode || null
      if (data.isHost) {
        setIsHost(true)
      }
      const socket = socketManager.getSocket()
      if (socket && data.gameState.players) {
        const me = data.gameState.players.find((p: any) =>
          data.isHost ? p.isHost : p.name === playerName
        )
        if (me) setCurrentPlayer(me)
      }
    })

    socketManager.onRejoinError((data) => {
      console.log('⚠️ Rejoin failed:', data.message)
      // Only treat as abandoned if we were previously in a game.
      // A null currentGameCode means this is a fresh load — ignore the error.
      if (currentGameCode.current) {
        setIsAbandoned(true)
      }
    })

    // Game created (host only)
    socketManager.onGameCreated((data: { gameCode: string; gameState: GameState }) => {
      console.log('🎮 Game created:', data.gameCode)
      setGameState(data.gameState)
      currentGameCode.current = data.gameCode
      
      // Set current player for host
      const socket = socketManager.getSocket()
      if (socket && data.gameState.players) {
        const currentPlayer = data.gameState.players.find(p => p.id === socket.id)
        if (currentPlayer) {
          setCurrentPlayer(currentPlayer)
          console.log('👤 Set current player (host):', currentPlayer.name, 'ID:', currentPlayer.id)
        }
      }
    })

    // Player joined
    socketManager.onPlayerJoined((data: { player: Player; gameState: GameState }) => {
      console.log('👤 Player joined:', data.player.name)
      console.log('📊 Updated game state:', data.gameState)
      console.log('👥 Players in game:', data.gameState.players.length)
      setGameState(data.gameState)
      
      // Set current player for joining player
      const socket = socketManager.getSocket()
      if (socket && data.gameState.players) {
        const currentPlayer = data.gameState.players.find(p => p.id === socket.id)
        if (currentPlayer) {
          setCurrentPlayer(currentPlayer)
          console.log('👤 Set current player (joined):', currentPlayer.name, 'ID:', currentPlayer.id)
        }
      }
    })

    // Player left
    socketManager.onPlayerLeft((data: { playerId: string; gameState: GameState }) => {
      console.log('👋 Player left:', data.playerId)
      setGameState(data.gameState)
    })

    // Game starting
    socketManager.onGameStarting((data: { gameState: GameState }) => {
      console.log('🚀 Game starting:', data.gameState)
      setGameState(data.gameState)
    })

    // Between-question leaderboard scores
    socketManager.onQuestionScores((data: any) => {
      console.log('📊 Question scores received:', data.questionIndex + 1)
      setQuestionScores(data)
    })

    // Question start
    socketManager.onQuestionStart((data: {
      question: Question,
      questionIndex: number,
      totalQuestions: number,
      timeLimit: number
    }) => {
      console.log('🎯 Question started:', data.questionIndex + 1, 'of', data.totalQuestions)
      setQuestionScores(null) // clear between-question screen
      setCurrentQuestion(data.question)
      setQuestionIndex(data.questionIndex)
      setTotalQuestions(data.totalQuestions)
      setTimeLimit(data.timeLimit)
      setQuestionStartTime(Date.now())
      setAnsweredPlayers([])
      setReadyPlayers(prev => ({ ...prev, [data.questionIndex]: [] }))
      // Ensure gameStatus transitions to 'question' (it may be 'starting' for first question)
      const current = useGameStore.getState().gameState
      if (current && current.gameStatus !== 'question') {
        setGameState({ ...current, gameStatus: 'question', currentQuestion: data.question, currentQuestionIndex: data.questionIndex })
      }
    })

    // Question results
    socketManager.onQuestionResults((data: { 
      question: any; 
      results: any[]; 
      gameState: GameState 
    }) => {
      console.log('📊 Question results:', data.results)
      setQuestionResults(data.results)
      setGameState(data.gameState)
    })

    // Game finished
    socketManager.onGameFinished((data: { gameState: GameState }) => {
      console.log('🏁 Game finished:', data.gameState)
      setQuestionScores(null)
      setGameState(data.gameState)
    })

    // Game state updated
    socketManager.onGameStateUpdated((data: { gameState: GameState }) => {
      console.log('🔄 Game state updated')
      console.log('📊 New game state:', data.gameState)
      console.log('📊 Game status:', data.gameState.gameStatus)
      console.log('📊 Players:', data.gameState.players)
      console.log('📊 Ready players from server:', data.gameState.readyPlayers)
      setGameState(data.gameState)
      
      // Set current player based on socket ID
      const socket = socketManager.getSocket()
      if (socket && data.gameState.players) {
        const currentPlayer = data.gameState.players.find(p => p.id === socket.id)
        if (currentPlayer) {
          setCurrentPlayer(currentPlayer)
          console.log('👤 Set current player:', currentPlayer.name, 'ID:', currentPlayer.id)
        }
      }
      
      // Only update readyPlayers if the server data is not empty
      // This prevents the ready players from being reset when a challenge is resolved
      if (data.gameState.readyPlayers && Object.keys(data.gameState.readyPlayers).length > 0) {
        setReadyPlayers(data.gameState.readyPlayers)
        console.log('📊 Updated readyPlayers from game state:', data.gameState.readyPlayers)
      } else {
        console.log('📊 Skipping readyPlayers update - server data is empty')
      }
    })

    // Game ended
    socketManager.onGameEnded((data: { reason: string }) => {
      console.log('🏁 Game ended:', data.reason)
      // Show end game message or redirect
      alert(`Game ended: ${data.reason}`)
      router.push('/')
    })

    // Join error
    socketManager.onJoinError((data: { message: string }) => {
      console.error('❌ Join error:', data.message)
      setConnectionError(data.message)
    })

    // General error
    socketManager.onError((data: { message: string }) => {
      console.error('🔴 Game error:', data.message)
      setConnectionError(data.message)
    })

    // Answer status updated
    socketManager.onAnswerStatusUpdated((data: { answeredPlayers: string[], totalPlayers: number }) => {
      console.log('👍 Answer status updated:', data.answeredPlayers.length, 'of', data.totalPlayers)
      setAnsweredPlayers(data.answeredPlayers)
    })

    // ADDED: Player ready event listener
    socketManager.onPlayerReady((data: { questionIndex: number, playerId: string, readyPlayers: string[] }) => {
      console.log('👍 Player ready update:', data)
      setReadyPlayers(prev => ({
        ...prev,
        [data.questionIndex]: data.readyPlayers
      }))
    })

    // ADDED: Ready status updated event
    socketManager.onReadyStatusUpdated((data: { questionIndex: number, readyPlayers: string[] }) => {
      console.log('📊 Ready status updated:', data)
      console.log('📊 Current readyPlayers state:', readyPlayers)
      setReadyPlayers(prev => {
        const newState = {
          ...prev,
          [data.questionIndex]: data.readyPlayers
        }
        console.log('📊 New readyPlayers state:', newState)
        return newState
      })
    })



    // ADDED: Reveal state updated event
    socketManager.onRevealStateUpdated((data: { currentRevealIndex: number, gameState: GameState }) => {
      console.log('🎭 Reveal state updated:', data.currentRevealIndex)
      setGameState(data.gameState)
    })




    // ADDED: Challenge voting event
    socketManager.onChallengeVoting((data: { challenge: any, voters: any[], votingTime: number }) => {
      console.log('🏛️ Challenge voting started:', data)
      setCurrentChallenge(data.challenge)
      setChallengeVoting(data)
      setVoteTimeLeft(data.votingTime) // Start the timer
    })

    // ADDED: Challenge resolved event
    socketManager.onChallengeResolved((data: { challengeId: string, passed: boolean, votes: { approve: number, reject: number }, scoreAwarded?: number }) => {
      console.log('🏛️ Challenge resolved:', data)
      setCurrentChallenge(null)
      setChallengeVoting(null)
      setVoteTimeLeft(20) // Reset timer
      

      
      // Set challenge result for popup
      setChallengeResult({
        passed: data.passed,
        votes: data.votes,
        challengeId: data.challengeId,
        scoreAwarded: data.scoreAwarded
      })
      
      // Log the updated game state to see if scores changed
      if (data.passed) {
        console.log('🏛️ Challenge PASSED - checking for score updates...')
        console.log('📊 Current game state:', gameState)
      }
      
      // The server will send a game-state-updated event after this
      // which will update the game state with the new scores
    })

    // Cleanup function
    return () => {
      socketManager.offAllGameEvents()
    }
  }, [setGameState, setConnectionError, router, setAnsweredPlayers, readyPlayers, setReadyPlayers])

  // Game actions
  const createGame = useCallback((code: string) => {
    const socket = socketManager.getSocket()
    if (!socket || !socket.connected) {
      setConnectionError('Not connected to server')
      return false
    }

    console.log('🎮 Creating game with code:', code)
    socketManager.createGame(code, playerName || 'Host')
    currentGameCode.current = code
    return true
  }, [setConnectionError])

  const joinGame = useCallback((code: string, name: string) => {
    console.log('🔍 joinGame called with:', { code, name })
    console.log('🔍 socketManager.isConnected():', socketManager.isConnected())
    console.log('🔍 socketManager.getSocket():', socketManager.getSocket())
    console.log('🔍 socket connected:', socketManager.getSocket()?.connected)
    
    // Wait for connection to be established
    if (!socketManager.getSocket()?.connected) {
      console.log('⏳ Waiting for socket connection...')
      setConnectionError('Waiting for connection to establish...')
      return false
    }
    
    if (!socketManager.isConnected()) {
      console.log('❌ Not connected to server')
      setConnectionError('Not connected to server')
      return false
    }

    if (!name.trim()) {
      console.log('❌ Player name is required')
      setConnectionError('Player name is required')
      return false
    }

    console.log('👤 Joining game:', code, 'as', name)
    socketManager.joinGame(code, name.trim())
    currentGameCode.current = code
    
    // Set initial game state
    setGameState({
      id: code,
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
    })
    
    return true
  }, [setConnectionError, setGameState])

  const leaveGame = useCallback(() => {
    if (currentGameCode.current) {
      console.log('👋 Leaving game:', currentGameCode.current)
      socketManager.leaveGame(currentGameCode.current)
      currentGameCode.current = null
      resetStore()
    }
  }, [resetStore])

  const startGame = useCallback((settings?: Record<string, any>, solo?: boolean) => {
    if (!currentGameCode.current) {
      setConnectionError('No active game')
      return false
    }

    const minPlayers = solo ? 1 : 2
    if ((gameState?.players?.length || 0) < minPlayers) {
      setConnectionError(`Need at least ${minPlayers} player${minPlayers > 1 ? 's' : ''} to start`)
      return false
    }

    console.log('🚀 Starting game', settings)
    socketManager.startGame(currentGameCode.current, settings, solo)
    return true
  }, [gameState, setConnectionError])

  const reconnect = useCallback(() => {
    console.log('🔄 Attempting to reconnect...')
    hasConnected.current = false
    setConnectionError(null)
    
    const socket = socketManager.connect()
    setIsConnected(socket.connected)
    hasConnected.current = true
  }, [setIsConnected, setConnectionError])

  const disconnect = useCallback(() => {
    console.log('❌ Disconnecting...')
    leaveGame()
    socketManager.disconnect()
    setIsConnected(false)
    hasConnected.current = false
  }, [leaveGame, setIsConnected])

  const submitAnswer = useCallback((answer: string | number) => {
    if (!currentGameCode.current || !gameState?.currentQuestion) {
      console.error('No active game or current question')
      return
    }
    
    console.log('📝 Submitting answer:', answer)
    
    // Convert to appropriate format for backend
    const answerPayload = {
      answer,
      answerText: getAnswerDisplayText(gameState.currentQuestion, answer),
      timestamp: Date.now()
    }
    
    socketManager.submitAnswer(currentGameCode.current, String(answer))

  }, [gameState?.currentQuestion])

  const nextReveal = useCallback(() => {
    if (!currentGameCode.current) {
      console.error('No active game for reveal')
      return false
    }
    console.log('🎭 Moving to next reveal')
    socketManager.nextReveal(currentGameCode.current)
    return true
  }, [])
  
  const challengeQuestion = useCallback((questionIndex: number, explanation: string) => {
    if (!currentGameCode.current) {
      console.error('No active game for challenge')
      return false
    }
    console.log('🏛️ Challenging question:', questionIndex, explanation)
    socketManager.challengeQuestion(currentGameCode.current, questionIndex, explanation)
    return true
  }, [])

  const voteChallenge = useCallback((challengeId: string, vote: 'approve' | 'reject') => {
    if (!currentGameCode.current) {
      console.error('No active game for voting')
      return false
    }
    console.log('🗳️ Voting on challenge:', challengeId, vote)
    socketManager.voteChallenge(currentGameCode.current, challengeId, vote)
    return true
  }, [])

  const timeUp = useCallback(() => {
    if (!currentGameCode.current) {
      console.error('No active game')
      return
    }
    // Read fresh from store — gameState.currentQuestionIndex lags behind because
    // question-start updates the separate `questionIndex` field, not gameState itself.
    const questionIndex = useGameStore.getState().questionIndex
    console.log('⏰ Time up - auto-submitting for Q', questionIndex + 1)
    socketManager.timeUp(currentGameCode.current, questionIndex)
  }, [])

  const playerReady = useCallback((questionIndex: number, playerId: string) => {
    if (!currentGameCode.current) {
      console.error('No active game for player ready')
      return false
    }
    console.log('✅ Player ready:', questionIndex, playerId)
    socketManager.playerReady(currentGameCode.current, questionIndex, playerId)
    return true
  }, [])

  const nextQuestion = useCallback(() => {
    if (!currentGameCode.current || !gameState) {
      console.error('No active game or game state')
      return
    }
    
    console.log('⏭️ Moving to next question')
    socketManager.nextQuestion(currentGameCode.current)
  }, [gameState])

  const nextQuestionReveal = useCallback(() => {
    if (!currentGameCode.current || !gameState) {
      console.error('No active game or game state')
      return
    }
    
    console.log('🎭 Moving to next question reveal')
    socketManager.nextQuestionReveal(currentGameCode.current)
  }, [gameState])

  

  // Helper to get ready players for a specific question
  const getReadyPlayersForQuestion = useCallback((questionIndex: number) => {
    return readyPlayers[questionIndex] || []
  }, [readyPlayers])

  // Helper to check if current player has used their challenge
  const hasUsedChallenge = useMemo(() => {
    if (!gameState || !currentPlayer?.id) return false
    const playerChallenges = (gameState as any).playerChallenges
    return playerChallenges?.[currentPlayer.id]?.hasChallenged || false
  }, [gameState, currentPlayer?.id])

  // Voting timer effect
  useEffect(() => {
    if (challengeVoting && voteTimeLeft > 0) {
      const timer = setTimeout(() => {
        setVoteTimeLeft(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (challengeVoting && voteTimeLeft === 0) {
      // Timer expired - clear voting state
      setChallengeVoting(null)
      setCurrentChallenge(null)
    }
  }, [challengeVoting, voteTimeLeft])

  // Dismiss challenge result popup
  const dismissChallengeResult = useCallback(() => {
    setChallengeResult(null)
  }, [])

      // Return game state and actions
    return {
      // State
      questionScores,
      gameState,
      isConnected,
      connectionError,
      currentPlayer,
      isHost: useGameStore(state => state.isHost),
      players: gameState?.players || [],
      gameStatus: gameState?.gameStatus || 'waiting',
      currentQuestion: gameState?.currentQuestion,
      answeredPlayers,
      readyPlayers,
      currentChallenge,
      challengeVoting,
      hasUsedChallenge,
      voteTimeLeft,
      challengeResult,
      
      // Actions
      createGame,
      joinGame,
      leaveGame,
      startGame,
      reconnect,
      disconnect,
      submitAnswer,
      timeUp,
      nextQuestion,
      nextQuestionReveal,
      nextReveal,
      challengeQuestion,
      voteChallenge,
      playerReady,
      dismissChallengeResult,
      
      
      // Utilities
      clearError: () => setConnectionError(null),
      isAbandoned,
      dismissAbandoned: () => setIsAbandoned(false),
      isInGame: !!currentGameCode.current,
    gameCode: currentGameCode.current,
    playerCount: gameState?.players?.length || 0,
    canStartGame: (gameState?.players?.length || 0) >= (isHost ? 1 : 2),
    getReadyPlayersForQuestion
  }
}