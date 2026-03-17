'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useGame } from '@/hooks/useGame'
import { useGameStore } from '@/stores/gameStore'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { SharedGameView } from '@/components/game/SharedGameView'
import GameCode from '@/components/game/GameCode'
import { Lobby } from '@/components/game/Lobby'
import { QuestionReveal } from '@/components/game/QuestionReveal'
import { GameResults } from '@/components/game/GameResults'
import { BetweenQuestions } from '@/components/game/BetweenQuestions'
import { GameCountdown } from '@/components/game/GameCountdown'
import type { GameStatus } from '@/types/game'
import socketManager from '@/lib/socket'

export default function HostPage() {
  const params = useParams()
  const gameCode = params.gameId as string
  const playerName = 'Host' // Host doesn't need a player name
  const [isCreating, setIsCreating] = useState(false)

  const {
    gameState,
    isConnected,
    connectionError,
    currentPlayer,
    players,
    gameStatus,
    answeredPlayers,
    createGame,
    joinGame,
    leaveGame,
    startGame,
    clearError,
    submitAnswer,
    timeUp,
    nextQuestion,
    nextReveal,
    challengeQuestion,
    voteChallenge,
    playerReady,
    nextQuestionReveal,
    readyPlayers,                    // ✅ ADD THIS
    getReadyPlayersForQuestion,
    currentChallenge,
    challengeVoting,
    hasUsedChallenge,
    voteTimeLeft,
    challengeResult,
    dismissChallengeResult,
    canStartGame,
    questionScores
  } = useGame({ gameCode, playerName, isHost: true })

  const questionStartTime = useGameStore(state => state.questionStartTime)

  // Create the game when component mounts
  useEffect(() => {
    if (gameCode && !gameState && isConnected) {
      setIsCreating(true)
      // Add a small delay to ensure connection is fully established
      setTimeout(() => {
        const success = createGame(gameCode)
        if (!success) {
          console.error('Failed to create game')
        }
        setIsCreating(false)
      }, 500)
    }
  }, [gameCode, gameState, createGame, isConnected])

  const handleStartGame = (settings: { categories: string[]; types: string[]; questionCount: number }) => {
    if (canStartGame) {
      startGame(settings)
    }
  }

  const handleAnswerSubmit = (answer: string | number) => {
    submitAnswer(answer)
  }

  const handleTimeUp = () => {
    timeUp()
  }

  const handleNextQuestion = () => {
    nextQuestion()
  }

  const handleNextReveal = () => {
    if (nextReveal) {
      nextReveal()
    } else {
      console.error('nextReveal function not available')
    }
  }

  const handleNextQuestionReveal = () => {
    if (nextQuestionReveal) {
      nextQuestionReveal()
    } else {
      console.error('nextQuestionReveal function not available')
    }
  }

  const handleChallengeQuestion = (questionIndex: number, explanation: string) => {
    if (challengeQuestion) {
      challengeQuestion(questionIndex, explanation)
    } else {
      console.error('challengeQuestion function not available')
    }
  }
  const handlePlayerReady = (questionIndex: number, playerId: string) => {
    console.log('🎯 Player ready callback:', { questionIndex, playerId })
    playerReady(questionIndex, playerId)
  }

  // Loading state
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Card className="text-center">
          <div className="text-4xl mb-4">🔌</div>
          <h2 className="text-xl font-bold mb-4 text-white">Connecting to server...</h2>
          <p className="text-gray-300">Please wait while we establish connection</p>
          {connectionError && (
            <div className="mt-4 p-3 bg-red-500/20 rounded-lg border border-red-500">
              <p className="text-red-400 text-sm">{connectionError}</p>
            </div>
          )}
        </Card>
      </div>
    )
  }

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Card className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-bold mb-4 text-white">Connection Error</h2>
          <p className="text-red-400 mb-4">{connectionError}</p>
          <Button onClick={clearError} variant="primary">
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  // Pre-game countdown
  if (gameStatus === 'starting') {
    return <GameCountdown playerCount={players.length} />
  }

  // Between questions leaderboard
  if (questionScores && gameState) {
    return (
      <BetweenQuestions
        questionIndex={questionScores.questionIndex}
        totalQuestions={gameState.questions.length}
        correctAnswerText={questionScores.correctAnswerText}
        leaderboard={questionScores.leaderboard}
        currentPlayerId={currentPlayer?.id || ''}
      />
    )
  }

  // Game is in question state
  if (gameStatus === 'question' && gameState?.currentQuestion) {
    return (
      <SharedGameView
        question={gameState.currentQuestion}
        questionIndex={gameState.currentQuestionIndex}
        totalQuestions={gameState.questions.length}
        timeLimit={gameState.currentQuestion.timeLimit}
        questionStartTime={questionStartTime}
        players={players}
        answeredPlayers={answeredPlayers}
        currentPlayerId={currentPlayer?.id || ''}
        onAnswerSubmit={handleAnswerSubmit}
        onTimeUp={handleTimeUp}
      />
    )
  }

  // Question results state (removed - no longer needed)
  if (gameStatus === 'question_results') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black">
        <Card className="w-full max-w-2xl p-6">
          <h2 className="text-2xl font-bold text-center mb-6 text-white">Processing...</h2>
          <p className="text-center text-gray-300">Moving to next question...</p>
        </Card>
      </div>
    )
  }

  // Reveal phase - show question by question results
  if (gameStatus === 'reveal_phase') {
    return (
      <QuestionReveal
        gameState={gameState}
        currentPlayerId={currentPlayer?.id || ''}
        isHost={true}
        onFinishReveals={handleNextQuestionReveal}
        onChallengeQuestion={handleChallengeQuestion}
        onVoteChallenge={voteChallenge}
        onPlayerReady={handlePlayerReady}
        readyPlayers={readyPlayers}                           // ✅ ADD THIS
        getReadyPlayersForQuestion={getReadyPlayersForQuestion}
        currentChallenge={currentChallenge}
                        challengeVoting={challengeVoting}
                hasUsedChallenge={hasUsedChallenge}
                voteTimeLeft={voteTimeLeft}
                challengeResult={challengeResult}
                onDismissChallengeResult={dismissChallengeResult}
      />
    )
  }

  // Game finished state
  if (gameStatus === 'final_results' && gameState?.finalResults) {
    return (
      <GameResults 
        gameState={gameState} 
        currentPlayer={currentPlayer} 
        isHost={true}
      />
    )
  }

  // Main host view — lobby
  return (
    <>
      <Lobby
        gameCode={gameCode}
        players={players}
        currentPlayerId={currentPlayer?.id || ''}
        isHost={true}
        questionCount={gameState?.questions?.length}
        onStartGame={handleStartGame}
      />

      {isCreating && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-5xl mb-4">🎮</div>
            <p className="text-white font-bold text-lg">Setting up game room...</p>
          </div>
        </div>
      )}
    </>
  )
}