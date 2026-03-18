// src/lib/socket.ts - Socket.io Client Configuration
import { io, Socket } from 'socket.io-client'

class SocketManager {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect() {
    if (this.socket && this.socket.connected) {
      console.log('🔌 Socket already connected')
      return this.socket
    }

    console.log('🔌 Connecting to server...')
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3003'
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    })

    this.socket.on('connect', () => {
      console.log('🔌 Connected to server:', this.socket?.id)
    })

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server')
    })

    this.socket.on('connect_error', (error) => {
      console.error('🔴 Connection error:', error)
    })

    this.socket.on('error', (error) => {
      console.error('🔴 Socket error:', error)
      // Don't show connection errors for normal game state transitions
      if (error.message && !error.message.includes('Game not in question state')) {
        console.error('🔴 Game error:', error.message)
      }
    })

    return this.socket
  }

  private setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('🔌 Connected to server:', this.socket?.id)
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason)
      
      if (reason === 'io server disconnect') {
        // Server disconnected the client, reconnect manually
        this.socket?.connect()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('🔴 Connection error:', error.message)
      this.reconnectAttempts++
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('🔴 Max reconnection attempts reached')
      }
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts')
      this.reconnectAttempts = 0
    })

    this.socket.on('reconnect_failed', () => {
      console.error('🔴 Failed to reconnect to server')
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket(): Socket | null {
    return this.socket
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }

  // Game-specific methods
  createGame(gameCode: string, hostName: string) {
    this.socket?.emit('host-create-game', { gameCode, hostName })
  }

  joinGame(gameCode: string, playerName: string) {
    if (this.socket) {
      this.socket.emit('player-join-game', { gameCode, playerName })
    }
  }

  leaveGame(gameCode: string) {
    this.socket?.emit('player-leave-game', gameCode)
  }

  startGame(gameCode: string, settings?: { categories: string[]; types: string[]; questionCount: number }, solo?: boolean) {
    if (this.socket) {
      this.socket.emit('host-start-game', { gameCode, settings: settings ?? {}, solo: solo ?? false })
    }
  }

  nextReveal(gameCode: string) {
    if (this.socket?.connected) {
      console.log('📡 Sending next-reveal event')
      this.socket.emit('next-reveal', gameCode)
    } else {
      console.error('Socket not connected for next-reveal')
    }
  }

  playerReady(gameCode: string, questionIndex: number, playerId: string) {
    if (this.socket?.connected) {
      console.log('📡 Sending player-ready event:', { gameCode, questionIndex, playerId })
      this.socket.emit('player-ready', { gameCode, questionIndex, playerId })
    } else {
      console.error('Socket not connected for player-ready')
    }
  }
  
  challengeQuestion(gameCode: string, questionIndex: number, explanation: string) {
    if (this.socket?.connected) {
      console.log('📡 Sending challenge-question event')
      this.socket.emit('challenge-question', gameCode, questionIndex, explanation)
    } else {
      console.error('Socket not connected for challenge-question')
    }
  }

  submitAnswer(gameCode: string, answer: string) {
    if (this.socket?.connected) {
      console.log('📝 Submitting answer via socket:', answer, typeof answer)
      console.log('📝 Game code:', gameCode)
      this.socket.emit('submit-answer', gameCode, answer)
    } else {
      console.error('Socket not connected')
    }
  }

  timeUp(gameCode: string, questionIndex: number) {
    if (this.socket) {
      this.socket.emit('time-up', { gameCode, questionIndex })
    }
  }

  nextQuestion(gameCode: string) {
    if (this.socket) {
      this.socket.emit('next-question', gameCode)
    }
  }

  nextQuestionReveal(gameCode: string) {
    if (this.socket?.connected) {
      console.log('📡 Sending next-question-reveal event')
      this.socket.emit('next-question-reveal', gameCode)
    } else {
      console.error('Socket not connected for next-question-reveal')
    }
  }

  skipReveal(gameCode: string) {
    if (this.socket?.connected) {
      console.log('📡 Sending skip-reveal event')
      this.socket.emit('skip-reveal', gameCode)
    } else {
      console.error('Socket not connected for skip-reveal')
    }
  }

  // Event listener helpers
  onGameCreated(callback: (data: any) => void) {
    this.socket?.on('game-created', callback)
  }

  onPlayerJoined(callback: (data: any) => void) {
    this.socket?.on('player-joined', callback)
  }

  onPlayerLeft(callback: (data: any) => void) {
    this.socket?.on('player-left', callback)
  }

  onGameStarting(callback: (data: any) => void) {
    this.socket?.on('game-starting', callback)
  }

  onQuestionStart(callback: (data: any) => void) {
    this.socket?.on('question-start', callback)
  }

  onQuestionResults(callback: (data: any) => void) {
    this.socket?.on('question-results', callback)
  }

  onQuestionScores(callback: (data: any) => void) {
    this.socket?.on('question-scores', callback)
  }

  onGameFinished(callback: (data: any) => void) {
    this.socket?.on('game-finished', callback)
  }

  onGameStateUpdated(callback: (data: any) => void) {
    this.socket?.on('game-state-updated', callback)
  }

  onRevealPhaseStart(callback: (data: any) => void) {
    this.socket?.on('reveal-phase-start', callback)
  }

  onAnswerStatusUpdated(callback: (data: { answeredPlayers: string[], totalPlayers: number }) => void) {
    this.socket?.on('answer-status-updated', callback)
  }

  onGameEnded(callback: (data: any) => void) {
    this.socket?.on('game-ended', callback)
  }

  onJoinError(callback: (data: any) => void) {
    this.socket?.on('join-error', callback)
  }

  onError(callback: (data: any) => void) {
    this.socket?.on('error', callback)
  }

  // ADDED: Ready state event listeners
  onPlayerReady(callback: (data: { questionIndex: number, playerId: string, readyPlayers: string[] }) => void) {
    this.socket?.on('player-ready', callback)
  }

 
onReadyStatusUpdated(callback: (data: { questionIndex: number, readyPlayers: string[] }) => void) {
  this.socket?.on('ready-status-updated', callback)
}

  onRevealStateUpdated(callback: (data: { currentRevealIndex: number, gameState: any }) => void) {
    this.socket?.on('reveal-state-updated', callback)
  }

  // Challenge and voting event handlers
  onChallengeVoting(callback: (data: { challenge: any, voters: any[], votingTime: number }) => void) {
    this.socket?.on('challenge-voting', callback)
  }

  onChallengeResolved(callback: (data: { challengeId: string, passed: boolean, votes: { approve: number, reject: number }, scoreAwarded?: number }) => void) {
    this.socket?.on('challenge-resolved', callback)
  }

  rejoinGame(gameCode: string, playerName: string, isHost: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('rejoin-game', { gameCode, playerName, isHost })
    }
  }

  onRejoinSuccess(callback: (data: { gameState: any, isHost: boolean, alreadyAnswered?: boolean }) => void) {
    this.socket?.on('rejoin-success', callback)
  }

  onRejoinError(callback: (data: { message: string }) => void) {
    this.socket?.on('rejoin-error', callback)
  }

  // Vote submission
  voteChallenge(gameCode: string, challengeId: string, vote: 'approve' | 'reject') {
    if (this.socket?.connected) {
      console.log('🗳️ Submitting vote:', vote)
      this.socket.emit('vote-challenge', gameCode, challengeId, vote)
    } else {
      console.error('Socket not connected for vote-challenge')
    }
  }

  // Remove event listeners
  offAllGameEvents() {
    const events = [
      'game-created',
      'player-joined', 
      'player-left',
      'game-starting',
      'game-ended',
      'join-error',
      'error',
      'player-ready',
      'ready-status-updated',
      'reveal-state-updated',
      'challenge-voting',
      'challenge-resolved',
      'rejoin-success',
      'rejoin-error'
    ]
    
    events.forEach(event => {
      this.socket?.off(event)
    })
  }
}

// Create singleton instance
const socketManager = new SocketManager()

export default socketManager

// Export individual functions for convenience
export const {
  connect,
  disconnect,
  getSocket,
  isConnected,
  createGame,
  joinGame,
  leaveGame,
  startGame,
  onGameCreated,
  onPlayerJoined,
  onPlayerLeft,
  onGameStarting,
  onGameEnded,
  onJoinError,
  onError,
  offAllGameEvents
} = socketManager