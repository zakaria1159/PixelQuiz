'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useGame } from '@/hooks/useGame'
import { useGameStore } from '@/stores/gameStore'
import { useTranslation } from '@/hooks/useTranslation'
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
  const searchParams = useSearchParams()
  const gameCode = params.gameId as string
  const playerName = searchParams.get('name') || 'Host'
  const isSolo = searchParams.get('solo') === 'true'
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
    questionScores,
    isAbandoned,
  } = useGame({ gameCode, playerName, isHost: true })

  const questionStartTime = useGameStore(state => state.questionStartTime)
  const storeTimeLimit = useGameStore(state => state.timeLimit)
  const setLang = useGameStore(state => state.setLang)
  const { t } = useTranslation()

  // Restore language preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('metaquizz_lang')
    if (saved) setLang(saved)
  }, [])

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

  const handleStartGame = (settings: Record<string, any>) => {
    if (isSolo || canStartGame) {
      startGame(settings, isSolo)
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

  const handleSkipToResults = () => {
    socketManager.skipReveal(gameCode)
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

  // Abandoned state
  if (isAbandoned) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at 50% -10%, #13154a 0%, #09090f 70%)', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '320px' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>😴</div>
          <h2 style={{ color: 'white', fontWeight: 800, fontSize: '22px', marginBottom: '8px' }}>{t('session_ended')}</h2>
          <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '32px', lineHeight: 1.5 }}>
            {t('session_ended_msg')}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, #4f46e5, #4338ca)', border: 'none', color: 'white', fontWeight: 800, fontSize: '16px', cursor: 'pointer' }}
          >
            {t('back_to_home')}
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
          <p style={{ color: '#52525b', fontSize: '13px', fontWeight: 600 }}>{t('connecting')}</p>
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
          <h2 className="text-xl font-bold mb-4 text-white">{t('connection_error')}</h2>
          <p className="text-red-400 mb-4">{connectionError}</p>
          <Button onClick={clearError} variant="primary">
            {t('try_again')}
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
        timeLimit={storeTimeLimit || gameState.currentQuestion.timeLimit}
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
          <h2 className="text-2xl font-bold text-center mb-6 text-white">{t('processing')}</h2>
          <p className="text-center text-gray-300">{t('moving_to_next')}</p>
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
        onSkipToResults={handleSkipToResults}
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
        isSolo={isSolo}
        questionCount={gameState?.questions?.length}
        onStartGame={handleStartGame}
      />

      {isCreating && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-5xl mb-4">🎮</div>
            <p className="text-white font-bold text-lg">{t('setting_up')}</p>
          </div>
        </div>
      )}
    </>
  )
}