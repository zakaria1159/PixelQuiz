'use client'

import { useEffect, useState } from 'react'
import { useGame } from '@/hooks/useGame'
import { useParams, useSearchParams } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { SharedGameView } from '@/components/game/SharedGameView'
import { QuestionReveal } from '@/components/game/QuestionReveal'
import type { GameStatus } from '@/types/game'
import socketManager from '@/lib/socket'

export default function GamePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const gameCode = params.gameId as string
  const playerName = searchParams.get('name') || ''

  const {
    gameState,
    isConnected,
    connectionError,
    currentPlayer,
    players,
    gameStatus,
    answeredPlayers,
    joinGame,
    leaveGame,
    clearError,
    submitAnswer,
    timeUp,
    nextQuestion,
    // Add these for the reveal system
    nextReveal,
    challengeQuestion,
    playerReady,
    nextQuestionReveal,
    isHost,
    readyPlayers,                    // ✅ ADD THIS
    getReadyPlayersForQuestion 
  } = useGame({ gameCode, playerName, isHost: false })

  const [isJoining, setIsJoining] = useState(false)

  // Join the game when component mounts
  useEffect(() => {
    if (gameCode && !gameState && isConnected) {
      setIsJoining(true)
      // Add a small delay to ensure connection is fully established
      setTimeout(() => {
        const success = joinGame(gameCode, playerName)
        if (!success) {
          console.error('Failed to join game')
        }
        setIsJoining(false)
      }, 500)
    }
  }, [gameCode, gameState, joinGame, isConnected, playerName])

  const handleLeaveGame = () => {
    leaveGame()
    window.location.href = '/'
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
    // Players can't control reveals, only host can
    console.log('Players cannot control reveals')
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

  

  const possiblePlayerIds = [
    { method: 'currentPlayer?.id', value: currentPlayer?.id },
    { method: 'socket.id', value: socketManager.getSocket()?.id },
    { method: 'gameState.hostId', value: gameState?.hostId },
    { method: 'first player in gameState.players', value: gameState?.players?.[0]?.id },
    { method: 'non-host player', value: gameState?.players?.find(p => p.id !== gameState?.hostId)?.id }
  ]
  
  console.log('🔍 Possible player IDs:', possiblePlayerIds)
  
  // Updated QuestionReveal call with better player ID detection
  const detectedPlayerId = currentPlayer?.id || 
                           socketManager.getSocket()?.id || 
                           gameState?.players?.find(p => p.id !== gameState?.hostId)?.id || 
                           gameState?.players?.[0]?.id || 
                           ''
  
  console.log('🔍 Using player ID:', detectedPlayerId)

  

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

  

  // Reveal phase - show question by question results (players can challenge here)
  if (gameStatus === 'reveal_phase') {
    return (
      <QuestionReveal
        gameState={gameState}
        currentPlayerId={detectedPlayerId}
        isHost={false} // Add this
        onFinishReveals={isHost ? handleNextQuestionReveal : handleNextReveal}
        onChallengeQuestion={handleChallengeQuestion}
        onPlayerReady={handlePlayerReady} // Add this
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
                    {result.playerId === currentPlayer?.id && (
                      <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 border border-blue-400">YOU</span>
                    )}
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

          {/* Show only current player's detailed results */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Your Performance</h3>
            {gameState.finalResults
              .filter(result => result.playerId === currentPlayer?.id)
              .map((result) => (
                <div key={result.playerId} className="border-2 border-gray-600 rounded-none p-4 bg-gray-700">
                  <h4 className="font-medium mb-3 text-white">{result.playerName} (You)</h4>
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

          {/* Back to lobby button */}
          <div className="text-center mt-8">
            <Button
              onClick={() => window.location.href = '/'}
              variant="primary"
              size="lg"
            >
              Play Again
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Main game room view
  return (
    <div className="min-h-screen p-8 bg-black">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Game Room</h1>
          <p className="text-gray-300">Game Code: {gameCode}</p>
          {currentPlayer && (
            <p className="text-gray-300">Playing as: {currentPlayer.name}</p>
          )}
        </div>

        {/* Game Status */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Players List */}
          <Card>
            <h2 className="text-xl font-bold mb-4 text-white">Players ({players.length})</h2>
            {players.length === 0 ? (
              <p className="text-gray-300">No players yet...</p>
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
                      {player.id === currentPlayer?.id && (
                        <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 border border-blue-400">YOU</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-300">Score: {player.score}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Game Code Section */}
          <Card>
            <h2 className="text-xl font-bold mb-4 text-white">Game Code</h2>
            <div className="p-4 bg-gray-700 border-2 border-gray-600">
              <div className="text-sm text-gray-300 mb-2">Share this code with friends:</div>
              <div className="flex items-center space-x-2">
                <code className="text-2xl font-mono font-bold text-white bg-gray-800 px-4 py-2 border-2 border-gray-600">
                  {gameCode}
                </code>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(gameCode)
                    // You could add a toast notification here
                  }}
                  variant="secondary"
                  size="sm"
                >
                  Copy
                </Button>
              </div>
            </div>
          </Card>

          {/* Game Info */}
          <Card>
            <h2 className="text-xl font-bold mb-4 text-white">Game Status</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-700 border-2 border-gray-600">
                <div className="text-sm text-gray-300 mb-1">Status</div>
                <div className="text-lg font-bold capitalize text-white">{gameStatus}</div>
              </div>

              {gameStatus === 'waiting' && (
                <div className="p-4 bg-blue-500/20 border-2 border-blue-500">
                  <p className="text-blue-300">Waiting for host to start the game...</p>
                </div>
              )}

              {(gameStatus as string) === 'reveal_phase' && (
                <div className="p-4 bg-yellow-500/20 border-2 border-yellow-500">
                  <p className="text-yellow-300">Revealing results...</p>
                </div>
              )}

              <Button
                onClick={handleLeaveGame}
                variant="danger"
                size="lg"
                className="w-full"
              >
                Leave Game
              </Button>
            </div>
          </Card>
        </div>

        {/* Loading State */}
        {isJoining && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <Card className="text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h2 className="text-xl font-bold mb-4 text-white">Joining Game...</h2>
              <p className="text-gray-300">Connecting to game room</p>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}