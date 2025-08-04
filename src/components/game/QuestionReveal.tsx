'use client'

import React, { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Question } from '@/types'

interface QuestionRevealProps {
    gameState: any
    currentPlayerId: string
    isHost: boolean
    onFinishReveals: () => void
    onChallengeQuestion: (questionIndex: number, explanation: string) => void
    onVoteChallenge?: (challengeId: string, vote: 'approve' | 'reject') => void
    onPlayerReady?: (questionIndex: number, playerId: string) => void
    readyPlayers?: {[questionIndex: number]: string[]}
    getReadyPlayersForQuestion?: (questionIndex: number) => string[]
    currentChallenge?: any
    challengeVoting?: any
    hasUsedChallenge?: boolean
    voteTimeLeft?: number
    challengeResult?: any
    onDismissChallengeResult?: () => void
}

export function QuestionReveal({
    gameState,
    currentPlayerId,
    isHost,
    onFinishReveals,
    onChallengeQuestion,
    onVoteChallenge,
    onPlayerReady,
    readyPlayers = {},
    getReadyPlayersForQuestion,
    currentChallenge,
    challengeVoting,
    hasUsedChallenge = false,
    voteTimeLeft = 20,
    challengeResult,
    onDismissChallengeResult
}: QuestionRevealProps) {
    // Use server-synchronized reveal index if available, otherwise fall back to local state
    const serverRevealIndex = gameState.currentRevealIndex || 0
    const [currentRevealIndex, setCurrentRevealIndex] = useState(serverRevealIndex)
    const [showingChallenge, setShowingChallenge] = useState(false)
    const [challengeExplanation, setChallengeExplanation] = useState('')
    const [challengeTimeLeft, setChallengeTimeLeft] = useState(30)
    const [isVoting, setIsVoting] = useState(false)

    // Use ready state from props instead of local state
    const currentQuestionReadyPlayers = getReadyPlayersForQuestion ? 
        getReadyPlayersForQuestion(currentRevealIndex) : 
        readyPlayers[currentRevealIndex] || []
    
    // Host is always considered ready by default (they control advancement)
    const effectiveReadyPlayers = isHost && !currentQuestionReadyPlayers.includes(currentPlayerId) 
        ? [...currentQuestionReadyPlayers, currentPlayerId] 
        : currentQuestionReadyPlayers
    
    const isPlayerReady = effectiveReadyPlayers.includes(currentPlayerId)

    // Sync with server reveal index
    useEffect(() => {
        if (gameState.currentRevealIndex !== undefined) {
            setCurrentRevealIndex(gameState.currentRevealIndex)
        }
    }, [gameState.currentRevealIndex])

    // Enhanced Debug logging
    useEffect(() => {
        console.log('🔍 QuestionReveal Debug:', {
            currentPlayerId,
            currentRevealIndex,
            currentQuestionReadyPlayers,
            effectiveReadyPlayers,
            isPlayerReady,
            isHost,
            playersLength: gameState.players.length,
            allReady: effectiveReadyPlayers.length >= gameState.players.length,
            gameState: {
                answers: gameState.answers,
                questionScores: gameState.questionScores,
                players: gameState.players,
                playerAnswers: gameState.playerAnswers,
                questionResults: gameState.questionResults,
                // Log ALL top-level properties to see what's available
                allGameStateKeys: Object.keys(gameState || {}),
                // Check if answers exist and their structure
                answersStructure: gameState.answers ? {
                    keys: Object.keys(gameState.answers),
                    firstPlayerAnswers: gameState.answers[Object.keys(gameState.answers)[0]]
                } : null
            }
        })

        // Additional detailed logging
        console.log('🔍 Full GameState for debugging:', gameState)

        // Check if the "All Players" section is working - that means data exists somewhere
        if (gameState?.players) {
            gameState.players.forEach((player: any) => {
                console.log(`🔍 Player ${player.name} (${player.id}):`)
                console.log('  - answers[playerId]:', gameState.answers?.[player.id])
                console.log('  - playerAnswers[playerId]:', gameState.playerAnswers?.[player.id])
                console.log('  - questionResults for this question:', gameState.questionResults?.[currentRevealIndex]?.[player.id])
                console.log('  - questionScores:', gameState.questionScores?.[currentRevealIndex]?.[player.id])
            })
        }
    }, [currentPlayerId, currentRevealIndex, gameState, currentQuestionReadyPlayers, isPlayerReady])

    // Challenge timer - 30 seconds to explain
    useEffect(() => {
        if (showingChallenge && challengeTimeLeft > 0) {
            const timer = setTimeout(() => {
                setChallengeTimeLeft(prev => prev - 1)
            }, 1000)
            return () => clearTimeout(timer)
        } else if (showingChallenge && challengeTimeLeft === 0) {
            handleChallenge()
        }
    }, [showingChallenge, challengeTimeLeft])



    const handleChallenge = () => {
        if (challengeExplanation.trim()) {
            onChallengeQuestion(currentRevealIndex, challengeExplanation.trim())
            setIsVoting(true)
            setShowingChallenge(false)
        }
    }

    const handleStartChallenge = () => {
        setShowingChallenge(true)
        setChallengeTimeLeft(30)
    }

    const getDisplayAnswer = (question: any, rawAnswer: any) => {
        // Handle no answer case
        if (rawAnswer === "NO_ANSWER" || rawAnswer === null || rawAnswer === undefined || rawAnswer === '') {
            return 'No answer submitted'
        }

        // For multiple choice and true/false questions, convert index to actual text
        if (question.type === 'multiple_choice' && question.options) {
            const optionIndex = parseInt(rawAnswer)
            if (!isNaN(optionIndex) && question.options[optionIndex]) {
                return question.options[optionIndex]
            }
        }

        if (question.type === 'true_false') {
            if (rawAnswer === '0' || rawAnswer === 0) return 'True'
            if (rawAnswer === '1' || rawAnswer === 1) return 'False'
        }

                // For ranking questions, convert comma-separated indexes to text
        if (question.type === 'ranking' && question.items) {
          try {
            const indexes = rawAnswer.split(',').map((i: string) => parseInt(i.trim()))
            const texts = indexes.map((index: number) => question.items[index]).filter(Boolean)
            return texts.join(' → ')
          } catch (e) {
            // If parsing fails, return the raw answer
            return rawAnswer
          }
        }

        // For free text or if conversion fails, return the raw answer
        return rawAnswer
    }

    const currentQuestion = gameState.questions[currentRevealIndex]
    const currentPlayer = gameState.players.find((p: any) => p.id === currentPlayerId)

    // ENHANCED: Better player answer lookup with comprehensive strategies
    let playerAnswer = null
    let isCorrect = false
    let questionScore = 0

    console.log('🔍 Starting answer lookup for player:', currentPlayerId, 'question:', currentRevealIndex)
    console.log('🔍 Current player details:', currentPlayer)
    console.log('🔍 Available game state keys:', Object.keys(gameState || {}))
    console.log('🔍 Game state answers structure:', gameState?.answers)
    console.log('🔍 Game state playerAnswers structure:', gameState?.playerAnswers)
    console.log('🔍 Game state questionResults structure:', gameState?.questionResults)
    console.log('🔍 All players in gameState:', gameState?.players)
    console.log('🔍 Host ID from gameState:', gameState?.hostId)

    // Use the same successful lookup logic as the "All Players" section
    // Strategy 1: Direct lookup by playerId and questionIndex
    if (gameState.answers && gameState.answers[currentPlayerId]) {
        playerAnswer = gameState.answers[currentPlayerId][currentRevealIndex]
        console.log('🔍 Strategy 1 result:', playerAnswer)
    }

    // Strategy 2: If answers are stored differently, try alternative structures
    if (!playerAnswer && gameState.playerAnswers) {
        playerAnswer = gameState.playerAnswers[currentPlayerId]?.[currentRevealIndex]
        console.log('🔍 Strategy 2 result:', playerAnswer)
    }

    // Strategy 3: Look through the questionResults data structure
    if (!playerAnswer && gameState.questionResults) {
        const questionResult = gameState.questionResults[currentRevealIndex]
        if (questionResult && questionResult[currentPlayerId]) {
            playerAnswer = {
                answer: questionResult[currentPlayerId].answer,
                isCorrect: questionResult[currentPlayerId].isCorrect,
                time: questionResult[currentPlayerId].time || 0
            }
            console.log('🔍 Strategy 3 result:', playerAnswer)
        }
    }

    // Strategy 4: Reversed structure - Check if answers are stored as answers[questionIndex][playerId]
    if (!playerAnswer && gameState.answers) {
        const questionAnswers = gameState.answers[currentRevealIndex]
        if (questionAnswers && questionAnswers[currentPlayerId]) {
            playerAnswer = questionAnswers[currentPlayerId]
            console.log('🔍 Strategy 4 (reversed structure) result:', playerAnswer)
        }
    }

    // Strategy 5: Results array
    if (!playerAnswer && gameState.results) {
        const questionResultsArray = gameState.results[currentRevealIndex]
        if (Array.isArray(questionResultsArray)) {
            const playerResult = questionResultsArray.find((result: any) =>
                result.playerId === currentPlayerId || result.playerName === currentPlayer?.name
            )
            if (playerResult) {
                playerAnswer = {
                    answer: playerResult.answer,
                    isCorrect: playerResult.isCorrect,
                    time: playerResult.time || 0
                }
                console.log('🔍 Strategy 5 (results array) result:', playerAnswer)
            }
        }
    }

    // Strategy 6: Look for any property that might contain answers
    if (!playerAnswer) {
        console.log('🔍 Strategy 6: Searching all game state properties...')
        Object.keys(gameState || {}).forEach(key => {
            if (key.toLowerCase().includes('answer') || key.toLowerCase().includes('result')) {
                console.log(`🔍 Found potential answer property: ${key}`, gameState[key])
            }
        })
    }

    // Strategy 7: Try to find the answer by looking up the current player in the "All Players" logic
    if (!playerAnswer) {
        console.log('🔍 Strategy 7: Using "All Players" lookup logic for current player')
        // Use the exact same logic as the "All Players" section
        let playerAnswerData = null

        if (gameState.answers && gameState.answers[currentPlayerId]) {
            playerAnswerData = gameState.answers[currentPlayerId][currentRevealIndex]
            console.log('🔍 Strategy 7 - Strategy 1:', playerAnswerData)
        }

        if (!playerAnswerData && gameState.playerAnswers) {
            playerAnswerData = gameState.playerAnswers[currentPlayerId]?.[currentRevealIndex]
            console.log('🔍 Strategy 7 - Strategy 2:', playerAnswerData)
        }

        if (!playerAnswerData && gameState.questionResults) {
            const questionResult = gameState.questionResults[currentRevealIndex]
            if (questionResult && questionResult[currentPlayerId]) {
                playerAnswerData = {
                    answer: questionResult[currentPlayerId].answer,
                    isCorrect: questionResult[currentPlayerId].isCorrect,
                    time: questionResult[currentPlayerId].time || 0
                }
                console.log('🔍 Strategy 7 - Strategy 3:', playerAnswerData)
            }
        }

        // Strategy 4: Reversed structure
        if (!playerAnswerData && gameState.answers) {
            const questionAnswers = gameState.answers[currentRevealIndex]
            if (questionAnswers && questionAnswers[currentPlayerId]) {
                playerAnswerData = questionAnswers[currentPlayerId]
                console.log('🔍 Strategy 7 - Strategy 4:', playerAnswerData)
            }
        }

        // Strategy 5: Results array
        if (!playerAnswerData && gameState.results) {
            const questionResultsArray = gameState.results[currentRevealIndex]
            if (Array.isArray(questionResultsArray)) {
                const playerResult = questionResultsArray.find((result: any) =>
                    result.playerId === currentPlayerId || result.playerName === currentPlayer?.name
                )
                if (playerResult) {
                    playerAnswerData = {
                        answer: playerResult.answer,
                        isCorrect: playerResult.isCorrect,
                        time: playerResult.time || 0
                    }
                    console.log('🔍 Strategy 7 - Strategy 5:', playerAnswerData)
                }
            }
        }

        if (playerAnswerData) {
            playerAnswer = playerAnswerData
            console.log('🔍 Strategy 7 found answer:', playerAnswer)
        }
    }

    // Strategy 8: Try using host ID if current player is host but answer not found
    if (!playerAnswer && isHost && gameState?.hostId && gameState.hostId !== currentPlayerId) {
        console.log('🔍 Strategy 8: Trying host ID instead of current player ID')
        const hostId = gameState.hostId
        
        if (gameState.answers && gameState.answers[hostId]) {
            playerAnswer = gameState.answers[hostId][currentRevealIndex]
            console.log('🔍 Strategy 8 - Strategy 1 (host ID):', playerAnswer)
        }

        if (!playerAnswer && gameState.playerAnswers) {
            playerAnswer = gameState.playerAnswers[hostId]?.[currentRevealIndex]
            console.log('🔍 Strategy 8 - Strategy 2 (host ID):', playerAnswer)
        }

        if (!playerAnswer && gameState.questionResults) {
            const questionResult = gameState.questionResults[currentRevealIndex]
            if (questionResult && questionResult[hostId]) {
                playerAnswer = {
                    answer: questionResult[hostId].answer,
                    isCorrect: questionResult[hostId].isCorrect,
                    time: questionResult[hostId].time || 0
                }
                console.log('🔍 Strategy 8 - Strategy 3 (host ID):', playerAnswer)
            }
        }

        if (!playerAnswer && gameState.answers) {
            const questionAnswers = gameState.answers[currentRevealIndex]
            if (questionAnswers && questionAnswers[hostId]) {
                playerAnswer = questionAnswers[hostId]
                console.log('🔍 Strategy 8 - Strategy 4 (host ID):', playerAnswer)
            }
        }

        if (!playerAnswer && gameState.results) {
            const questionResultsArray = gameState.results[currentRevealIndex]
            if (Array.isArray(questionResultsArray)) {
                const playerResult = questionResultsArray.find((result: any) =>
                    result.playerId === hostId || result.playerName === 'Host'
                )
                if (playerResult) {
                    playerAnswer = {
                        answer: playerResult.answer,
                        isCorrect: playerResult.isCorrect,
                        time: playerResult.time || 0
                    }
                    console.log('🔍 Strategy 8 - Strategy 5 (host ID):', playerAnswer)
                }
            }
        }
    }

    // Extract values with fallbacks
    if (playerAnswer) {
        isCorrect = playerAnswer.isCorrect || false
        questionScore = gameState.questionScores?.[currentRevealIndex]?.[currentPlayerId] || 0
        console.log('🔍 Final player answer found:', { playerAnswer, isCorrect, questionScore })
        console.log('🔍 Question scores for current question:', gameState.questionScores?.[currentRevealIndex])
        console.log('🔍 Current player ID:', currentPlayerId)
        console.log('🔍 Current reveal index:', currentRevealIndex)
        console.log('🔍 Full questionScores structure:', gameState.questionScores)
        console.log('🔍 Score lookup path:', `gameState.questionScores[${currentRevealIndex}][${currentPlayerId}]`)
        console.log('🔍 Actual score value:', gameState.questionScores?.[currentRevealIndex]?.[currentPlayerId])
    } else {
        console.log('🔍 No player answer found with any strategy')
    }

    // Get all player results for current question with enhanced lookup
    const questionResults = gameState.players.map((player: any) => {
        let playerAnswerData = null

        console.log(`🔍 Looking up data for player ${player.name} (${player.id})`)

        // Try the same lookup strategies for each player
        if (gameState.answers && gameState.answers[player.id]) {
            playerAnswerData = gameState.answers[player.id][currentRevealIndex]
            console.log(`🔍 ${player.name} - Strategy 1:`, playerAnswerData)
        }

        if (!playerAnswerData && gameState.playerAnswers) {
            playerAnswerData = gameState.playerAnswers[player.id]?.[currentRevealIndex]
            console.log(`🔍 ${player.name} - Strategy 2:`, playerAnswerData)
        }

        if (!playerAnswerData && gameState.questionResults) {
            const questionResult = gameState.questionResults[currentRevealIndex]
            if (questionResult && questionResult[player.id]) {
                playerAnswerData = {
                    answer: questionResult[player.id].answer,
                    isCorrect: questionResult[player.id].isCorrect,
                    time: questionResult[player.id].time || 0
                }
                console.log(`🔍 ${player.name} - Strategy 3:`, playerAnswerData)
            }
        }

        // Strategy 4: Reversed structure
        if (!playerAnswerData && gameState.answers) {
            const questionAnswers = gameState.answers[currentRevealIndex]
            if (questionAnswers && questionAnswers[player.id]) {
                playerAnswerData = questionAnswers[player.id]
                console.log(`🔍 ${player.name} - Strategy 4:`, playerAnswerData)
            }
        }

        // Strategy 5: Results array
        if (!playerAnswerData && gameState.results) {
            const questionResultsArray = gameState.results[currentRevealIndex]
            if (Array.isArray(questionResultsArray)) {
                const playerResult = questionResultsArray.find((result: any) =>
                    result.playerId === player.id || result.playerName === player.name
                )
                if (playerResult) {
                    playerAnswerData = {
                        answer: playerResult.answer,
                        isCorrect: playerResult.isCorrect,
                        time: playerResult.time || 0
                    }
                    console.log(`🔍 ${player.name} - Strategy 5:`, playerAnswerData)
                }
            }
        }

        const result = {
            playerId: player.id,
            playerName: player.name,
            answer: playerAnswerData?.answer || 'No answer',
            isCorrect: playerAnswerData?.isCorrect || false,
            score: gameState.questionScores?.[currentRevealIndex]?.[player.id] || 0,
            time: playerAnswerData?.time || 0
        }

        console.log(`🔍 Final result for ${player.name}:`, result)
        return result
    }).sort((a: any, b: any) => b.score - a.score)

    if (currentRevealIndex >= gameState.questions.length) {
        return null
    }

    const handleNextQuestion = () => {
        if (isHost && onFinishReveals) {
            // For host, call the server-synchronized function
            // This will be handled by the parent component
            onFinishReveals()
        } else {
            // For players, this shouldn't be called
            console.log('Players cannot advance questions')
        }
    }

    // FIXED: Proper ready handling with callback using prop values
    const handlePlayerReady = () => {
        if (!isPlayerReady && onPlayerReady) {
            onPlayerReady(currentRevealIndex, currentPlayerId)
        }
    }

    // Calculate running total (sum of all previous questions + current)
    const runningTotal = gameState.players
        .find((p: any) => p.id === currentPlayerId)
        ?.totalScore || questionScore

    return (
        <div className="min-h-screen bg-black p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-4">
                        📊 Results Reveal
                    </h1>
                    <div className="text-xl text-gray-300">
                        Question {currentRevealIndex + 1} of {gameState.questions.length}
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-700 h-4 mt-4 border-2 border-gray-600">
                        <div
                            className="bg-blue-500 h-full transition-all duration-1000"
                            style={{ width: `${((currentRevealIndex + 1) / gameState.questions.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Debug info (remove in production) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mb-4 p-2 bg-gray-900 border border-gray-600 rounded text-xs text-gray-400">
                        <strong>Debug:</strong> Player Answer: {playerAnswer ? JSON.stringify(playerAnswer) : 'null'} |
                        Score: {questionScore} | Ready: {isPlayerReady ? 'Yes' : 'No'} | 
                        Ready Players: {effectiveReadyPlayers.length}/{gameState.players.length} | Host: {isHost ? 'Yes' : 'No'} |
                        Calculation: {gameState.players.length} - {effectiveReadyPlayers.length} = {gameState.players.length - effectiveReadyPlayers.length}
                    </div>
                )}

                {/* Challenge/Voting Status */}
                {showingChallenge && (
                    <div className="mb-6 p-4 bg-yellow-900/30 border-2 border-yellow-400 rounded text-center">
                        <h3 className="text-2xl font-bold text-yellow-400 mb-2">
                            🏛️ Challenge in Progress
                        </h3>
                        <div className="text-4xl font-bold text-white">
                            {challengeTimeLeft}s
                        </div>
                        <p className="text-yellow-300">Time to explain your case!</p>
                    </div>
                )}

                {/* Voting Phase - Only show to non-challengers */}
                {(() => {
                    const shouldShowVoting = challengeVoting && currentChallenge && currentChallenge.challengerId && currentChallenge.challengerId !== currentPlayerId;
                    console.log('🔍 Voting UI Debug:', {
                        challengeVoting,
                        currentChallenge: currentChallenge?.id,
                        challengerId: currentChallenge?.challengerId,
                        currentPlayerId,
                        shouldShowVoting
                    });
                    return shouldShowVoting ? (
                    <div className="mb-6 p-4 bg-purple-900/30 border-2 border-purple-400 rounded">
                        <div className="text-center mb-4">
                            <h3 className="text-2xl font-bold text-purple-400 mb-2">
                                🗳️ Challenge Voting
                            </h3>
                            <div className="text-4xl font-bold text-white">
                                {voteTimeLeft}s
                            </div>
                            <p className="text-purple-300">Vote on {currentChallenge.challengerName}'s challenge</p>
                        </div>
                        
                        {/* Challenge Details */}
                        <div className="bg-gray-800 p-4 rounded border border-gray-600 mb-4">
                            <h4 className="text-lg font-semibold text-white mb-2">Challenge Details:</h4>
                            <div className="text-sm text-gray-300 space-y-2">
                                <div><strong>Challenger:</strong> {currentChallenge.challengerName}</div>
                                <div><strong>Their Answer:</strong> {getDisplayAnswer(currentQuestion, currentChallenge.playerAnswer)}</div>
                                <div><strong>Explanation:</strong> "{currentChallenge.explanation}"</div>
                                <div><strong>Potential Score:</strong> +{currentChallenge.potentialScore} points</div>
                            </div>
                        </div>

                        {/* Voting Buttons */}
                        <div className="flex gap-4 justify-center">
                            <Button
                                onClick={() => onVoteChallenge?.(currentChallenge.id, 'approve')}
                                variant="success"
                                size="lg"
                                className="flex-1 max-w-xs"
                            >
                                ✅ Approve Challenge
                            </Button>
                            <Button
                                onClick={() => onVoteChallenge?.(currentChallenge.id, 'reject')}
                                variant="danger"
                                size="lg"
                                className="flex-1 max-w-xs"
                            >
                                ❌ Reject Challenge
                            </Button>
                        </div>
                    </div>
                ) : null;
                })()}

                {/* Challenge Results */}
                {currentChallenge && currentChallenge.challengerId === currentPlayerId && challengeVoting && (
                    <div className="mb-6 p-4 bg-blue-900/30 border-2 border-blue-400 rounded text-center">
                        <h3 className="text-2xl font-bold text-blue-400 mb-2">
                            🏛️ Your Challenge is Being Voted On
                        </h3>
                        <div className="text-4xl font-bold text-white">
                            {voteTimeLeft}s
                        </div>
                        <p className="text-blue-300">Other players are voting on your challenge...</p>
                    </div>
                )}

                {/* Challenge Result Popup */}
                {challengeResult && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-gray-800 border-2 border-gray-600 rounded-lg p-6 max-w-lg mx-4">
                            <div className="text-center">
                                <h3 className={`text-3xl font-bold mb-6 ${challengeResult.passed ? 'text-green-400' : 'text-red-400'}`}>
                                    {challengeResult.passed ? '✅ Challenge Accepted!' : '❌ Challenge Rejected'}
                                </h3>
                                
                                {/* Vote Results with Enhanced Graph */}
                                <div className="mb-6">
                                    <h4 className="text-lg font-semibold text-white mb-4">🗳️ Anonymous Vote Results</h4>
                                    
                                    {/* Vote Counts */}
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-400">✅</div>
                                            <div className="text-sm text-gray-300">Approve</div>
                                            <div className="text-xl font-bold text-white">{challengeResult.votes.approve}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-red-400">❌</div>
                                            <div className="text-sm text-gray-300">Reject</div>
                                            <div className="text-xl font-bold text-white">{challengeResult.votes.reject}</div>
                                        </div>
                                    </div>
                                    
                                    {/* Enhanced Progress Bar */}
                                    <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
                                        <div 
                                            className={`h-4 rounded-full transition-all duration-500 ${challengeResult.passed ? 'bg-green-500' : 'bg-red-500'}`}
                                            style={{ 
                                                width: `${(challengeResult.votes.approve / (challengeResult.votes.approve + challengeResult.votes.reject)) * 100}%` 
                                            }}
                                        ></div>
                                    </div>
                                    
                                    {/* Vote Percentage */}
                                    <div className="text-sm text-gray-300">
                                        {challengeResult.passed ? 
                                            `${Math.round((challengeResult.votes.approve / (challengeResult.votes.approve + challengeResult.votes.reject)) * 100)}% approved` :
                                            `${Math.round((challengeResult.votes.reject / (challengeResult.votes.approve + challengeResult.votes.reject)) * 100)}% rejected`
                                        }
                                    </div>
                                </div>

                                {/* Points Awarded (only for challenger) */}
                                {challengeResult.passed && currentChallenge?.challengerId === currentPlayerId && (
                                    <div className="mb-6 p-4 bg-green-900/30 border-2 border-green-400 rounded">
                                        <div className="text-center">
                                            <div className="text-4xl mb-2">🎉</div>
                                            <p className="text-green-400 font-bold text-lg">You earned challenge points!</p>
                                            <p className="text-white text-2xl font-bold">
                                                +{challengeResult.scoreAwarded || 'Points'} points
                                            </p>
                                            <p className="text-sm text-gray-300 mt-2">
                                                Challenge points are awarded without time bonus
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={onDismissChallengeResult}
                                    variant="primary"
                                    size="lg"
                                    className="w-full"
                                >
                                    Continue
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Question & Answer Section */}
                    <div>
                        <Card className="p-6 bg-gray-800 border-gray-600">
                            {/* Question */}
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-white mb-4">
                                    {currentQuestion.question}
                                </h2>

                                {/* Question type and difficulty */}
                                <div className="flex gap-2 mb-4">
                                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded border">
                                        {currentQuestion.type.replace('_', ' ').toUpperCase()}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded border ${currentQuestion.difficulty === 'easy' ? 'bg-green-600 text-white border-green-400' :
                                            currentQuestion.difficulty === 'medium' ? 'bg-yellow-600 text-black border-yellow-400' :
                                                'bg-red-600 text-white border-red-400'
                                        }`}>
                                        {currentQuestion.difficulty.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            {/* Correct Answer Reveal */}
                            <div className="mb-6 p-4 bg-green-900/30 border-2 border-green-400 rounded">
                                <h3 className="text-lg font-semibold text-green-400 mb-2">
                                    ✅ Correct Answer:
                                </h3>
                                <p className="text-xl text-white font-bold">
                                    {playerAnswer?.correctAnswerText || 
                                     (currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false'
                                        ? currentQuestion.options?.[currentQuestion.correctAnswer]
                                        : currentQuestion.correctAnswer)}
                                </p>
                            </div>

                            {/* Your Answer */}
                            <div className={`p-4 border-2 rounded mb-6 ${isCorrect
                                ? 'bg-green-900/20 border-green-400'
                                : 'bg-red-900/20 border-red-400'
                                }`}>
                                <h3 className={`text-lg font-semibold mb-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                    {isCorrect ? '✅' : '❌'} Your Answer:
                                </h3>
                                <p className="text-xl text-white font-bold">
                                    {playerAnswer?.playerAnswerText || 
                                     (playerAnswer ? getDisplayAnswer(currentQuestion, playerAnswer.answer) : 'No answer submitted')}
                                </p>
                                <div className="mt-2 text-sm text-gray-300">
                                    Time: {playerAnswer ? (playerAnswer.time / 1000).toFixed(1) : '0.0'}s
                                </div>
                            </div>

                            {/* Score for this question */}
                            <div className="text-center p-4 bg-blue-900/30 border-2 border-blue-400 rounded">
                                <h3 className="text-lg font-semibold text-blue-400 mb-2">
                                    Points Earned:
                                </h3>
                                <p className="text-3xl text-white font-bold">
                                    +{questionScore}
                                </p>
                                <div className="text-sm text-gray-300 mt-2">
                                    Running Total: {runningTotal} points
                                </div>
                                {/* Debug info */}
                                {process.env.NODE_ENV === 'development' && (
                                    <div className="text-xs text-gray-500 mt-2">
                                        Debug: questionScore={questionScore}, currentRevealIndex={currentRevealIndex}, currentPlayerId={currentPlayerId}
                                    </div>
                                )}
                            </div>

                            {/* Challenge Section */}
                            {!isCorrect && !showingChallenge && !challengeVoting && !hasUsedChallenge && (
                                <div className="mt-6">
                                    <Button
                                        onClick={handleStartChallenge}
                                        variant="warning"
                                        size="lg"
                                        className="w-full"
                                    >
                                        🏛️ Challenge This Answer
                                    </Button>
                                    <p className="text-xs text-gray-400 text-center mt-2">
                                        One challenge per game - use it wisely!
                                    </p>
                                </div>
                            )}

                            {/* Challenge Used Indicator */}
                            {hasUsedChallenge && (
                                <div className="mt-6 p-4 bg-gray-700 border-2 border-gray-600 rounded text-center">
                                    <p className="text-gray-400 text-sm">
                                        🏛️ You have used your challenge for this game
                                    </p>
                                </div>
                            )}

                            {/* Challenge Form */}
                            {showingChallenge && (
                                <div className="mt-6 p-4 bg-yellow-900/20 border-2 border-yellow-400 rounded">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-yellow-400">
                                            🏛️ Challenge This Question
                                        </h3>
                                        <div className="text-2xl font-bold text-yellow-400">
                                            {challengeTimeLeft}s
                                        </div>
                                    </div>
                                    <textarea
                                        value={challengeExplanation}
                                        onChange={(e) => setChallengeExplanation(e.target.value)}
                                        placeholder="Explain why your answer should be accepted..."
                                        className="w-full p-3 bg-gray-700 text-white border-2 border-gray-600 rounded resize-none"
                                        rows={3}
                                        maxLength={200}
                                        autoFocus
                                    />
                                    <div className="flex gap-2 mt-4">
                                        <Button
                                            onClick={handleChallenge}
                                            disabled={!challengeExplanation.trim()}
                                            variant="warning"
                                            className="flex-1"
                                        >
                                            Submit Challenge ({challengeTimeLeft}s)
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setShowingChallenge(false)
                                                setChallengeExplanation('')
                                            }}
                                            variant="ghost"
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* All Players Results */}
                    <div>
                        <Card className="p-6 bg-gray-800 border-gray-600">
                            <h3 className="text-xl font-semibold text-white mb-4">
                                📊 All Players - Question {currentRevealIndex + 1}
                            </h3>

                            <div className="space-y-3">
                                {questionResults.map((result: any, index: number) => (
                                    <div
                                        key={result.playerId}
                                        className={`p-3 border-2 rounded ${result.isCorrect ? 'border-green-400 bg-green-900/20' : 'border-red-400 bg-red-900/20'
                                            } ${result.playerId === currentPlayerId ? 'ring-2 ring-blue-400' : ''}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-white">
                                                        {result.playerName}
                                                    </span>
                                                    {result.playerId === currentPlayerId && (
                                                        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                                                            YOU
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-300">
                                                    Answer: <span className="text-white font-medium">
                                                        {result.playerAnswerText || getDisplayAnswer(currentQuestion, result.answer)}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    Time: {(result.time / 1000).toFixed(1)}s
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-lg font-bold ${result.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                                    {result.isCorrect ? '✅' : '❌'}
                                                </div>
                                                <div className="text-sm text-white font-medium">
                                                    +{result.score}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Question Statistics */}
                            <div className="mt-6 p-4 bg-gray-700 border-2 border-gray-600 rounded">
                                <h4 className="text-sm font-semibold text-white mb-2">Question Stats:</h4>
                                <div className="text-xs text-gray-300 space-y-1">
                                    <div>Correct: {questionResults.filter((r: any) => r.isCorrect).length}/{questionResults.length} players</div>
                                    <div>Average time: {(questionResults.reduce((sum: number, r: any) => sum + r.time, 0) / questionResults.length / 1000).toFixed(1)}s</div>
                                    <div>Highest score: {Math.max(...questionResults.map((r: any) => r.score))} pts</div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Ready/Next Question Controls */}
                {!showingChallenge && !challengeVoting && (
                    <div className="text-center mt-8">
                        {!isHost ? (
                            /* Player Ready Button */
                            <div className="space-y-4">
                                <Button
                                    onClick={handlePlayerReady}
                                    disabled={isPlayerReady}
                                    variant={isPlayerReady ? "success" : "secondary"}
                                    size="lg"
                                    className="px-8"
                                >
                                    {isPlayerReady ? "✅ Ready for Next" : "Ready for Next Question"}
                                </Button>
                                <p className="text-gray-300 text-sm">
                                    {isPlayerReady
                                        ? "Waiting for other players and host..."
                                        : "Click when you're ready to move on"}
                                </p>
                            </div>
                        ) : (
                            /* Host Controls */
                            <div className="space-y-4">
                                <div className="mb-4 p-4 bg-gray-800 border-2 border-gray-600 rounded">
                                    <h3 className="text-lg font-semibold text-white mb-2">Player Readiness</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {gameState.players.map((player: any) => (
                                            <div
                                                key={player.id}
                                                className={`p-2 rounded border-2 text-sm ${effectiveReadyPlayers.includes(player.id)
                                                    ? 'bg-green-900/30 border-green-400 text-green-300'
                                                    : 'bg-gray-700 border-gray-500 text-gray-300'
                                                    }`}
                                            >
                                                {effectiveReadyPlayers.includes(player.id) ? '✅' : '⏳'} {player.name}
                                                {player.isHost && (
                                                    <span className="ml-1 text-xs opacity-75">(Host - Auto Ready)</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 text-center">
                                        <span className="text-lg font-bold text-white">
                                            {effectiveReadyPlayers.length -1}/{gameState.players.length}  players ready
                                        </span>
                                    </div>
                                </div>

                                {/* Host Ready Button */}

                                <Button
                                    onClick={handleNextQuestion}
                                    disabled={effectiveReadyPlayers.length < gameState.players.length}
                                    variant="primary"
                                    size="lg"
                                    className="px-8"
                                >
                                    {currentRevealIndex < gameState.questions.length - 1
                                        ? `Next Question →`
                                        : `Show Final Results 🏆`}
                                </Button>
                                <p className="text-gray-300 text-sm">
                                    {effectiveReadyPlayers.length >= gameState.players.length 
                                        ? "All players ready! You can advance anytime."
                                        : `${gameState.players.length - effectiveReadyPlayers.length} player(s) still reviewing...`
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}