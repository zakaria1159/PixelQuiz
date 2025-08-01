'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useGame } from '@/hooks/useGame'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { SharedGameView } from '@/components/game/SharedGameView'
import GameCode from '@/components/game/GameCode'
import { QuestionReveal } from '@/components/game/QuestionReveal'
import { GameStatus } from '@/types'
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
    playerReady,
    nextQuestionReveal,
    readyPlayers,                    // ✅ ADD THIS
    getReadyPlayersForQuestion,  
    canStartGame
  } = useGame({ gameCode, playerName, isHost: true })

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

  const handleStartGame = () => {
    if (canStartGame) {
      startGame()
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

  // Game is in question state
  if (gameStatus === 'question' && gameState?.currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <SharedGameView
          question={gameState.currentQuestion}
          questionIndex={gameState.currentQuestionIndex}
          totalQuestions={gameState.questions.length}
          timeLimit={gameState.currentQuestion.timeLimit}
          players={players}
          answeredPlayers={answeredPlayers}
          currentPlayerId={currentPlayer?.id || ''}
          onAnswerSubmit={handleAnswerSubmit}
          onTimeUp={handleTimeUp}
        />
      </div>
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
        onPlayerReady={handlePlayerReady}
        readyPlayers={readyPlayers}                           // ✅ ADD THIS
        getReadyPlayersForQuestion={getReadyPlayersForQuestion}
      />
    )
  }

  // Game finished state
  if (gameStatus === 'final_results' && gameState?.finalResults) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black">
        <Card className="w-full max-w-6xl p-6">
          <h2 className="text-2xl font-bold text-center mb-6 text-white">🏆 Game Results</h2>

          {/* Leaderboard */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-white">Leaderboard</h3>
            <div className="space-y-3">
              {gameState.finalResults.map((result, index) => (
                <div key={result.playerId} className="flex justify-between items-center p-4 bg-gray-700 border-2 border-gray-600">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <span className="font-medium text-white">{result.playerName}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{result.score} pts</div>
                    <div className="text-sm text-gray-300">
                      Total time: {(result.totalTime / 1000).toFixed(1)}s
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Question Analysis */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Question Analysis</h3>
            <div className="space-y-4">
              {gameState.finalResults.map((result) => (
                <div key={result.playerId} className="border-2 border-gray-600 rounded-none p-4 bg-gray-700">
                  <h4 className="font-medium mb-3 text-white">{result.playerName}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {result.questionResults.map((qResult) => (
                      <div key={qResult.questionIndex} className="text-sm p-3 border-2 border-gray-600 bg-gray-800 h-32 flex flex-col justify-between">
                        <div className="font-medium text-white">Q{qResult.questionIndex + 1}</div>
                        <div className={`text-xs font-bold ${qResult.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                          {qResult.isCorrect ? '✅ Correct' : '❌ Wrong'}
                        </div>
                        <div className="text-xs text-gray-300">
                          Time: {(qResult.time / 1000).toFixed(1)}s
                        </div>
                        <div className="text-xs text-gray-300">
                          Your Answer: <span className="font-bold">{qResult.playerAnswerText}</span>
                        </div>
                        <div className="text-xs text-gray-300">
                          Correct: <span className="font-bold text-green-400">{qResult.correctAnswerText}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Back to lobby button */}
          <div className="text-center mt-8">
            <Button
              onClick={() => window.location.href = '/'}
              variant="primary"
              size="lg"
            >
              Back to Lobby
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Main host view
  return (
    <div className="min-h-screen p-8 bg-black">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Game Host</h1>
          <p className="text-gray-300">Manage your game session</p>
        </div>

        {/* Game Code */}
        {gameState && (
          <div className="mb-8">
            <GameCode code={gameCode} size="lg" />
          </div>
        )}

        {/* Game Status */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Players List */}
          <Card>
            <h2 className="text-xl font-bold mb-4 text-white">Players ({players.length})</h2>
            {players.length === 0 ? (
              <p className="text-gray-300">Waiting for players to join...</p>
            ) : (
              <div className="space-y-2">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-gray-700 border-2 border-gray-600">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-500 rounded-none flex items-center justify-center mr-3 border-2 border-purple-400">
                        <span className="text-white font-bold">{player.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="font-medium text-white">{player.name}</span>
                      {player.isHost && (
                        <span className="ml-2 text-xs bg-yellow-500 text-black px-2 py-1 border border-yellow-400">HOST</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-300">Score: {player.score}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Game Controls */}
          <Card>
            <h2 className="text-xl font-bold mb-4 text-white">Game Controls</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-700 border-2 border-gray-600">
                <div className="text-sm text-gray-300 mb-1">Status</div>
                <div className="text-lg font-bold capitalize text-white">{gameStatus}</div>
              </div>

              {gameStatus === 'waiting' && (
                <div className="p-4 bg-blue-500/20 border-2 border-blue-500">
                  <p className="text-blue-300">Waiting for players to join...</p>
                </div>
              )}

              {(gameStatus as string) === 'reveal_phase' && (
                <div className="p-4 bg-yellow-500/20 border-2 border-yellow-500">
                  <p className="text-yellow-300">Revealing results...</p>
                </div>
              )}

              <Button
                onClick={handleStartGame}
                disabled={!canStartGame || gameStatus !== 'waiting'}
                variant="success"
                size="lg"
                className="w-full"
              >
                {canStartGame ? 'Start Game' : 'Need at least 2 players'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Loading State */}
        {isCreating && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <Card className="text-center">
              <div className="text-4xl mb-4">🎮</div>
              <h2 className="text-xl font-bold mb-4 text-white">Creating Game...</h2>
              <p className="text-gray-300">Setting up your game room</p>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}