'use client'

import { useEffect, useState } from 'react'
import { useGame } from '@/hooks/useGame'
import { useGameStore } from '@/stores/gameStore'
import { useParams, useSearchParams } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { SharedGameView } from '@/components/game/SharedGameView'
import { Lobby } from '@/components/game/Lobby'
import { QuestionReveal } from '@/components/game/QuestionReveal'
import { GameResults } from '@/components/game/GameResults'
import { BetweenQuestions } from '@/components/game/BetweenQuestions'
import { GameCountdown } from '@/components/game/GameCountdown'
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
    voteChallenge,
    playerReady,
    nextQuestionReveal,
    isHost,
    readyPlayers,                    // ✅ ADD THIS
    getReadyPlayersForQuestion,
    currentChallenge,
    challengeVoting,
    hasUsedChallenge,
    voteTimeLeft,
    challengeResult,
    dismissChallengeResult,
    questionScores,
    isAbandoned,
  } = useGame({ gameCode, playerName, isHost: false })

  const questionStartTime = useGameStore(state => state.questionStartTime)

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

  

  // Abandoned state
  if (isAbandoned) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at 50% -10%, #13154a 0%, #09090f 70%)', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '320px' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>😴</div>
          <h2 style={{ color: 'white', fontWeight: 800, fontSize: '22px', marginBottom: '8px' }}>Game abandoned</h2>
          <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '32px', lineHeight: 1.5 }}>
            You were away for a while. The game has likely moved on without you.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, #4f46e5, #4338ca)', border: 'none', color: 'white', fontWeight: 800, fontSize: '16px', cursor: 'pointer' }}
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  // Loading state
  if (!isConnected) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at 50% -10%, #13154a 0%, #09090f 70%)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#52525b', fontSize: '13px', fontWeight: 600 }}>Connecting…</p>
          {connectionError && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>{connectionError}</p>}
        </div>
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

  

  // Reveal phase - show question by question results (players can challenge here)
  if (gameStatus === 'reveal_phase') {
    return (
      <QuestionReveal
        gameState={gameState}
        currentPlayerId={detectedPlayerId}
        isHost={false} // Add this
        onFinishReveals={isHost ? handleNextQuestionReveal : handleNextReveal}
        onChallengeQuestion={handleChallengeQuestion}
        onVoteChallenge={voteChallenge}
        onPlayerReady={handlePlayerReady} // Add this
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
        isHost={false}
      />
    )
  }

  // Main game room view — lobby
  return (
    <>
      <Lobby
        gameCode={gameCode}
        players={players}
        currentPlayerId={currentPlayer?.id || ''}
        isHost={false}
        questionCount={gameState?.questions?.length}
        onLeaveGame={handleLeaveGame}
      />

      {isJoining && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-5xl mb-4">🚀</div>
            <p className="text-white font-bold text-lg">Joining game room...</p>
          </div>
        </div>
      )}
    </>
  )
}