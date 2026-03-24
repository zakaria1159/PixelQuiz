'use client'

import { useEffect, useState, useRef } from 'react'
import socketManager from '@/lib/socket'
import type { GameState, GameStatus } from '@/types/game'

interface PlayerAnswer {
  playerId: string
  playerName: string
  answer: string
}

interface SpectatorState {
  gameState: GameState | null
  gameStatus: GameStatus | null
  spectatorCount: number
  playerAnswers: Record<string, PlayerAnswer> // playerId → answer
  correctAnswerText: string | null
  timeLimit: number
  questionStartTime: number
  isConnected: boolean
  error: string | null
}

export function useSpectator(gameCode: string) {
  const [state, setState] = useState<SpectatorState>({
    gameState: null,
    gameStatus: null,
    spectatorCount: 0,
    playerAnswers: {},
    correctAnswerText: null,
    timeLimit: 30,
    questionStartTime: 0,
    isConnected: false,
    error: null,
  })
  const gameCodeRef = useRef(gameCode)

  useEffect(() => {
    const socket = socketManager.connect()

    const joinAsSpectator = () => {
      socketManager.spectatorJoin(gameCodeRef.current)
    }

    // Join on connect
    socket.on('connect', () => {
      setState(s => ({ ...s, isConnected: true }))
      joinAsSpectator()
    })

    // Rejoin on reconnect (Manager-level event)
    socket.io.on('reconnect', () => {
      joinAsSpectator()
    })

    // If already connected, join immediately
    if (socket.connected) {
      setState(s => ({ ...s, isConnected: true }))
      joinAsSpectator()
    }

    socket.on('disconnect', () => {
      setState(s => ({ ...s, isConnected: false }))
    })

    socketManager.onSpectatorJoined(({ gameState }) => {
      setState(s => ({
        ...s,
        gameState,
        gameStatus: gameState.gameStatus,
        error: null,
      }))
    })

    socketManager.onSpectatorError(({ message }) => {
      setState(s => ({ ...s, error: message }))
    })

    socketManager.onSpectatorCountUpdated(({ count }) => {
      setState(s => ({ ...s, spectatorCount: count }))
    })

    socketManager.onGameStateUpdated(({ gameState }) => {
      setState(s => ({
        ...s,
        gameState,
        gameStatus: gameState.gameStatus,
      }))
    })

    socketManager.onQuestionStart((data) => {
      setState(s => ({
        ...s,
        gameStatus: 'question',
        playerAnswers: {}, // reset per question
        correctAnswerText: null, // reset per question
        timeLimit: data.timeLimit,
        questionStartTime: Date.now(),
      }))
    })

    socketManager.onPlayerAnswered((data) => {
      setState(s => ({
        ...s,
        playerAnswers: {
          ...s.playerAnswers,
          [data.playerId]: data,
        },
      }))
    })

    socketManager.onQuestionScores((data) => {
      setState(s => ({
        ...s,
        gameStatus: 'question_results',
        correctAnswerText: data.correctAnswerText ?? null,
      }))
    })

    socketManager.onGameFinished(({ gameState }) => {
      setState(s => ({
        ...s,
        gameState,
        gameStatus: 'final_results',
      }))
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.io.off('reconnect')
      socketManager.offAllGameEvents()
    }
  }, [])

  return state
}
