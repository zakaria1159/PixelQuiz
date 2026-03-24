'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Question } from '@/types'
import { useTranslation } from '@/hooks/useTranslation'

interface QuestionRevealProps {
    gameState: any
    currentPlayerId: string
    isHost: boolean
    onFinishReveals: () => void
    onSkipToResults?: () => void
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

function ScorePopup({ score, isCorrect, runningTotal }: { score: number; isCorrect: boolean; runningTotal: number }) {
    const { t } = useTranslation()
    const [visible, setVisible] = useState(false)
    const [floatVisible, setFloatVisible] = useState(false)
    const prevScore = useRef(score)

    useEffect(() => {
        const t1 = setTimeout(() => setVisible(true), 100)
        const t2 = setTimeout(() => setFloatVisible(true), 400)
        return () => { clearTimeout(t1); clearTimeout(t2) }
    }, [])

    useEffect(() => {
        if (prevScore.current !== score) {
            prevScore.current = score
            setVisible(false)
            setFloatVisible(false)
            const t1 = setTimeout(() => setVisible(true), 80)
            const t2 = setTimeout(() => setFloatVisible(true), 380)
            return () => { clearTimeout(t1); clearTimeout(t2) }
        }
    }, [score])

    const isHuge = score >= 400
    const isBig = score >= 200
    const label = !isCorrect || score === 0 ? t('no_points') : isHuge ? t('score_massive') : isBig ? t('score_great') : '✓ Points'

    const scoreColor = !isCorrect || score === 0
        ? '#71717a'
        : isHuge ? '#fde047' : isBig ? '#86efac' : '#ffffff'

    const glowColor = !isCorrect || score === 0
        ? 'none'
        : isHuge ? '0 0 30px rgba(253,224,71,0.6)' : isBig ? '0 0 20px rgba(134,239,172,0.5)' : '0 0 15px rgba(147,197,253,0.4)'

    const labelColor = isCorrect && score > 0
        ? isHuge ? '#facc15' : isBig ? '#4ade80' : '#60a5fa'
        : '#52525b'

    return (
        <div style={{
            textAlign: 'center',
            padding: '20px',
            borderRadius: '16px',
            background: !isCorrect || score === 0
                ? 'rgba(39,39,42,0.3)'
                : isHuge ? 'rgba(78,63,0,0.3)' : isBig ? 'rgba(0,56,28,0.3)' : 'rgba(0,30,56,0.3)',
            border: `1px solid ${!isCorrect || score === 0
                ? 'rgba(82,82,91,0.5)'
                : isHuge ? 'rgba(250,204,21,0.4)' : isBig ? 'rgba(74,222,128,0.4)' : 'rgba(96,165,250,0.4)'}`,
            overflow: 'hidden',
        }}>
            <div style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: '8px',
                color: labelColor,
                opacity: floatVisible ? 1 : 0,
                transform: floatVisible ? 'translateY(0)' : 'translateY(-8px)',
                transition: 'opacity 0.4s ease, transform 0.4s ease',
            }}>
                {label}
            </div>

            <div style={{
                fontWeight: 900,
                fontSize: isHuge ? '52px' : isBig ? '44px' : '36px',
                color: scoreColor,
                transform: visible ? 'scale(1)' : 'scale(0.3)',
                opacity: visible ? 1 : 0,
                transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
                textShadow: glowColor,
                fontVariantNumeric: 'tabular-nums',
            }}>
                {isCorrect && score > 0 ? `+${score}` : score === 0 ? '—' : `+${score}`}
            </div>

            <div style={{
                fontSize: '13px',
                color: '#71717a',
                marginTop: '12px',
                opacity: floatVisible ? 1 : 0,
                transform: floatVisible ? 'translateY(0)' : 'translateY(4px)',
                transition: 'opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s',
            }}>
                {t('total_pts', { n: runningTotal.toLocaleString() })}
            </div>
        </div>
    )
}

export function QuestionReveal({
    gameState,
    currentPlayerId,
    isHost,
    onFinishReveals,
    onSkipToResults,
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
    const { t } = useTranslation()
    const serverRevealIndex = gameState.currentRevealIndex || 0
    const [currentRevealIndex, setCurrentRevealIndex] = useState(serverRevealIndex)
    const [showExplanation, setShowExplanation] = useState(false)
    const [showingChallenge, setShowingChallenge] = useState(false)
    const [challengeExplanation, setChallengeExplanation] = useState('')
    const [challengeTimeLeft, setChallengeTimeLeft] = useState(30)
    const [isVoting, setIsVoting] = useState(false)

    const currentQuestionReadyPlayers = getReadyPlayersForQuestion
        ? getReadyPlayersForQuestion(currentRevealIndex)
        : readyPlayers[currentRevealIndex] || []

    const effectiveReadyPlayers = isHost && !currentQuestionReadyPlayers.includes(currentPlayerId)
        ? [...currentQuestionReadyPlayers, currentPlayerId]
        : currentQuestionReadyPlayers

    const isPlayerReady = effectiveReadyPlayers.includes(currentPlayerId)

    useEffect(() => {
        if (gameState.currentRevealIndex !== undefined) {
            setCurrentRevealIndex(gameState.currentRevealIndex)
            setShowExplanation(false)
        }
    }, [gameState.currentRevealIndex])

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
        if (rawAnswer === "NO_ANSWER" || rawAnswer === null || rawAnswer === undefined || rawAnswer === '') {
            return t('no_answer')
        }

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

        if (question.type === 'ranking' && question.items) {
            try {
                const indexes = rawAnswer.split(',').map((i: string) => parseInt(i.trim()))
                const texts = indexes.map((index: number) => question.items[index]).filter(Boolean)
                return texts.join(' → ')
            } catch (e) {
                return rawAnswer
            }
        }

        return rawAnswer
    }

    const currentQuestion = gameState.questions[currentRevealIndex]
    const currentPlayer = gameState.players.find((p: any) => p.id === currentPlayerId)

    // ENHANCED: Better player answer lookup with comprehensive strategies
    let playerAnswer = null
    let isCorrect = false
    let questionScore = 0

    // Strategy 1: Direct lookup by playerId and questionIndex
    if (gameState.answers && gameState.answers[currentPlayerId]) {
        playerAnswer = gameState.answers[currentPlayerId][currentRevealIndex]
    }

    // Strategy 2: If answers are stored differently, try alternative structures
    if (!playerAnswer && gameState.playerAnswers) {
        playerAnswer = gameState.playerAnswers[currentPlayerId]?.[currentRevealIndex]
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
        }
    }

    // Strategy 4: Reversed structure - Check if answers are stored as answers[questionIndex][playerId]
    if (!playerAnswer && gameState.answers) {
        const questionAnswers = gameState.answers[currentRevealIndex]
        if (questionAnswers && questionAnswers[currentPlayerId]) {
            playerAnswer = questionAnswers[currentPlayerId]
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
            }
        }
    }

    // Strategy 6: Look for any property that might contain answers
    if (!playerAnswer) {
        Object.keys(gameState || {}).forEach(key => {
            // intentionally silent — debug logging removed
        })
    }

    // Strategy 7: Try to find the answer by looking up the current player in the "All Players" logic
    if (!playerAnswer) {
        let playerAnswerData = null

        if (gameState.answers && gameState.answers[currentPlayerId]) {
            playerAnswerData = gameState.answers[currentPlayerId][currentRevealIndex]
        }

        if (!playerAnswerData && gameState.playerAnswers) {
            playerAnswerData = gameState.playerAnswers[currentPlayerId]?.[currentRevealIndex]
        }

        if (!playerAnswerData && gameState.questionResults) {
            const questionResult = gameState.questionResults[currentRevealIndex]
            if (questionResult && questionResult[currentPlayerId]) {
                playerAnswerData = {
                    answer: questionResult[currentPlayerId].answer,
                    isCorrect: questionResult[currentPlayerId].isCorrect,
                    time: questionResult[currentPlayerId].time || 0
                }
            }
        }

        if (!playerAnswerData && gameState.answers) {
            const questionAnswers = gameState.answers[currentRevealIndex]
            if (questionAnswers && questionAnswers[currentPlayerId]) {
                playerAnswerData = questionAnswers[currentPlayerId]
            }
        }

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
                }
            }
        }

        if (playerAnswerData) {
            playerAnswer = playerAnswerData
        }
    }

    // Strategy 8: Try using host ID if current player is host but answer not found
    if (!playerAnswer && isHost && gameState?.hostId && gameState.hostId !== currentPlayerId) {
        const hostId = gameState.hostId

        if (gameState.answers && gameState.answers[hostId]) {
            playerAnswer = gameState.answers[hostId][currentRevealIndex]
        }

        if (!playerAnswer && gameState.playerAnswers) {
            playerAnswer = gameState.playerAnswers[hostId]?.[currentRevealIndex]
        }

        if (!playerAnswer && gameState.questionResults) {
            const questionResult = gameState.questionResults[currentRevealIndex]
            if (questionResult && questionResult[hostId]) {
                playerAnswer = {
                    answer: questionResult[hostId].answer,
                    isCorrect: questionResult[hostId].isCorrect,
                    time: questionResult[hostId].time || 0
                }
            }
        }

        if (!playerAnswer && gameState.answers) {
            const questionAnswers = gameState.answers[currentRevealIndex]
            if (questionAnswers && questionAnswers[hostId]) {
                playerAnswer = questionAnswers[hostId]
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
                }
            }
        }
    }

    // Extract values with fallbacks
    if (playerAnswer) {
        isCorrect = playerAnswer.isCorrect || false
        questionScore = gameState.questionScores?.[currentRevealIndex]?.[currentPlayerId] || 0
    }

    // Get all player results for current question with enhanced lookup
    const questionResults = gameState.players.map((player: any) => {
        let playerAnswerData = null

        if (gameState.answers && gameState.answers[player.id]) {
            playerAnswerData = gameState.answers[player.id][currentRevealIndex]
        }

        if (!playerAnswerData && gameState.playerAnswers) {
            playerAnswerData = gameState.playerAnswers[player.id]?.[currentRevealIndex]
        }

        if (!playerAnswerData && gameState.questionResults) {
            const questionResult = gameState.questionResults[currentRevealIndex]
            if (questionResult && questionResult[player.id]) {
                playerAnswerData = {
                    answer: questionResult[player.id].answer,
                    isCorrect: questionResult[player.id].isCorrect,
                    time: questionResult[player.id].time || 0
                }
            }
        }

        if (!playerAnswerData && gameState.answers) {
            const questionAnswers = gameState.answers[currentRevealIndex]
            if (questionAnswers && questionAnswers[player.id]) {
                playerAnswerData = questionAnswers[player.id]
            }
        }

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
                }
            }
        }

        return {
            playerId: player.id,
            playerName: player.name,
            answer: playerAnswerData?.answer || 'No answer',
            isCorrect: playerAnswerData?.isCorrect || false,
            score: gameState.questionScores?.[currentRevealIndex]?.[player.id] || 0,
            time: playerAnswerData?.time || 0,
            letterGameValidation: playerAnswerData?.letterGameValidation || null,
            playerAnswerText: playerAnswerData?.playerAnswerText || null
        }
    }).sort((a: any, b: any) => b.score - a.score)

    if (currentRevealIndex >= gameState.questions.length) {
        return null
    }

    const handleNextQuestion = () => {
        if (isHost && onFinishReveals) {
            onFinishReveals()
        }
    }

    const handlePlayerReady = () => {
        if (!isPlayerReady && onPlayerReady) {
            onPlayerReady(currentRevealIndex, currentPlayerId)
        }
    }

    const runningTotal = gameState.players
        .find((p: any) => p.id === currentPlayerId)
        ?.totalScore || questionScore

    // ── Dynamic Live Rankings ──
    const computeRankingsAt = (upToIndex: number) => {
        return gameState.players
            .map((player: any) => {
                let total = 0
                for (let i = 0; i <= upToIndex; i++) {
                    total += gameState.questionScores?.[i]?.[player.id] || 0
                }
                return { playerId: player.id, playerName: player.name, total }
            })
            .sort((a: any, b: any) => b.total - a.total)
    }

    const currentRankings = computeRankingsAt(currentRevealIndex)
    const prevRankings = currentRevealIndex > 0 ? computeRankingsAt(currentRevealIndex - 1) : null

    const diffLabel = (playerId: string, idx: number) => {
        if (!prevRankings) return null
        const prevIdx = prevRankings.findIndex((r: any) => r.playerId === playerId)
        if (prevIdx === -1) return null
        const delta = prevIdx - idx
        if (delta > 0) return { text: `▲${delta}`, color: '#4ade80' }
        if (delta < 0) return { text: `▼${Math.abs(delta)}`, color: '#f87171' }
        return { text: '—', color: '#52525b' }
    }

    const MEDALS = ['🥇', '🥈', '🥉']

    // Correct answer display text
    const correctAnswerDisplay = playerAnswer?.correctAnswerText ||
        (currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false'
            ? currentQuestion.options?.[currentQuestion.correctAnswer]
            : currentQuestion.correctAnswer)

    const difficultyColor = currentQuestion.difficulty === 'easy'
        ? { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', text: '#4ade80' }
        : currentQuestion.difficulty === 'medium'
        ? { bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.3)', text: '#fbbf24' }
        : { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#f87171' }

    return (
        <>
            <style>{`
                @keyframes slideUpFadeIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes popIn {
                    0%   { opacity: 0; transform: scale(0.7); }
                    60%  { transform: scale(1.08); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes glowPulse {
                    0%, 100% { box-shadow: 0 0 20px rgba(74,222,128,0.2); }
                    50%       { box-shadow: 0 0 40px rgba(74,222,128,0.5); }
                }
            `}</style>

            <div style={{
                height: '100svh',
                overflow: 'hidden',
                background: 'radial-gradient(ellipse at 50% -10%, #13154a 0%, #09090f 60%)',
                display: 'flex',
                flexDirection: 'column',
                padding: '16px 20px 0',
                paddingBottom: isHost && !showingChallenge && !challengeVoting ? 'calc(64px + env(safe-area-inset-bottom))' : 0,
            }}>
                {/* ── Top Bar ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#6366f1', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        MetaQuizz
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#52525b' }}>
                        Q{currentRevealIndex + 1}/{gameState.questions.length}
                    </span>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden', marginBottom: '16px', flexShrink: 0 }}>
                    <div style={{
                        height: '100%',
                        borderRadius: '99px',
                        background: 'linear-gradient(90deg,#6366f1,#818cf8)',
                        width: `${((currentRevealIndex + 1) / gameState.questions.length) * 100}%`,
                        transition: 'width 0.8s ease',
                    }} />
                </div>

                {/* ── Two-column body ── */}
                <div className="reveal-body">
                {/* LEFT COLUMN */}
                <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {/* ── Question Card ── */}
                    <div style={{
                        borderRadius: '20px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '18px 20px',
                    }}>
                        <p style={{ fontSize: '15px', fontWeight: 700, color: 'white', lineHeight: 1.5, margin: 0, marginBottom: '12px' }}>
                            {currentQuestion.question}
                        </p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{
                                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                                padding: '3px 10px', borderRadius: '99px',
                                background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8',
                            }}>
                                {currentQuestion.type.replace(/_/g, ' ')}
                            </span>
                            <span style={{
                                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                                padding: '3px 10px', borderRadius: '99px',
                                background: difficultyColor.bg, border: `1px solid ${difficultyColor.border}`, color: difficultyColor.text,
                            }}>
                                {currentQuestion.difficulty}
                            </span>
                        </div>
                    </div>

                    {/* ── Player Readiness (host view) ── */}
                    {!showingChallenge && !challengeVoting && (
                        <div style={{
                            borderRadius: '20px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            padding: '14px 20px',
                        }}>
                            {!isHost ? (
                                <p style={{ textAlign: 'center', fontSize: '13px', color: '#52525b', margin: 0 }}>
                                    {t('waiting_for_host_reveal')}
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {gameState.players.map((player: any) => {
                                        const ready = effectiveReadyPlayers.includes(player.id)
                                        return (
                                            <div
                                                key={player.id}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '5px',
                                                    padding: '4px 10px', borderRadius: '99px',
                                                    background: ready ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                                                    border: `1px solid ${ready ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                                    fontSize: '11px', fontWeight: 600,
                                                    color: ready ? '#4ade80' : '#52525b',
                                                }}
                                            >
                                                <span style={{
                                                    width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                                                    background: ready ? '#4ade80' : '#3f3f46',
                                                }} />
                                                {player.name}
                                                {player.isHost && <span style={{ fontSize: '9px', opacity: 0.5 }}>(host)</span>}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Correct Answer Card ── */}
                    <div style={{
                        borderRadius: '20px',
                        background: 'rgba(74,222,128,0.1)',
                        border: '1px solid rgba(74,222,128,0.25)',
                        padding: '18px 20px',
                        animation: 'glowPulse 2s ease infinite',
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                            {t('correct_answer_heading')}
                        </div>
                        {currentQuestion.type === 'letter_game' ? (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '48px', fontWeight: 900, color: '#fbbf24', marginBottom: '4px' }}>{currentQuestion.letter}</div>
                                <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0 }}>
                                    Any valid English word starting with <strong style={{ color: '#fde68a' }}>{currentQuestion.letter}</strong> for each category
                                </p>
                            </div>
                        ) : (
                            <p style={{ fontSize: '20px', fontWeight: 900, color: 'white', margin: 0 }}>
                                {correctAnswerDisplay}
                            </p>
                        )}
                    </div>

                    {/* ── Explanation Toggle ── */}
                    {currentQuestion.explanation && !['music_guess', 'animal_sound', 'clue_chain'].includes(currentQuestion.type) && (
                        <div>
                            <button
                                onClick={() => setShowExplanation(v => !v)}
                                style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    borderRadius: '14px',
                                    border: '1px solid rgba(251,191,36,0.3)',
                                    background: 'rgba(251,191,36,0.08)',
                                    color: '#fbbf24',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'background 0.15s',
                                }}
                            >
                                <span>{showExplanation ? '▲' : '💡'}</span>
                                {showExplanation ? 'Hide explanation' : 'Show explanation'}
                            </button>
                            {showExplanation && (
                                <div style={{
                                    marginTop: '8px',
                                    padding: '14px 16px',
                                    borderRadius: '14px',
                                    background: 'rgba(251,191,36,0.06)',
                                    border: '1px solid rgba(251,191,36,0.15)',
                                    fontSize: '13px',
                                    color: '#d4d4d8',
                                    lineHeight: '1.6',
                                    animation: 'slideUpFadeIn 0.2s ease both',
                                }}>
                                    {currentQuestion.explanation}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Your Result Card ── */}
                    <div style={{
                        borderRadius: '20px',
                        background: isCorrect ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${isCorrect ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.2)'}`,
                        padding: '18px 20px',
                        animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: isCorrect ? '#4ade80' : '#f87171', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                            {isCorrect ? t('your_answer_correct') : t('your_answer_wrong')}
                        </div>

                        {currentQuestion.type === 'letter_game' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {(currentQuestion.categories || []).map((cat: string, i: number) => {
                                    const entries = (playerAnswer?.answer || '').split(',')
                                    const word = entries[i]?.trim() || ''
                                    const validation = playerAnswer?.letterGameValidation
                                    const isValid = validation ? validation[cat] === true : null
                                    return (
                                        <div key={cat} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '8px 12px', borderRadius: '10px',
                                            background: isValid === true ? 'rgba(74,222,128,0.1)' : isValid === false ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                                            border: `1px solid ${isValid === true ? 'rgba(74,222,128,0.3)' : isValid === false ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.07)'}`,
                                        }}>
                                            <span style={{ fontSize: '12px', color: '#71717a', width: '100px', flexShrink: 0 }}>{cat}</span>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: word ? 'white' : '#52525b', flex: 1, textAlign: 'center' }}>{word || '—'}</span>
                                            <span style={{ width: '20px', textAlign: 'right' }}>{isValid === true ? '✅' : isValid === false ? '❌' : ''}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p style={{ fontSize: '17px', fontWeight: 800, color: 'white', margin: 0, marginBottom: '8px' }}>
                                {playerAnswer?.playerAnswerText ||
                                    (playerAnswer ? getDisplayAnswer(currentQuestion, playerAnswer.answer) : t('no_answer'))}
                            </p>
                        )}

                        <div style={{ fontSize: '11px', color: '#52525b', marginTop: '6px' }}>
                            {t('time_display', { n: playerAnswer ? (playerAnswer.time / 1000).toFixed(1) : '0.0' })}
                        </div>

                        {/* Score popup inline */}
                        <div style={{ marginTop: '14px' }}>
                            <ScorePopup score={questionScore} isCorrect={isCorrect} runningTotal={runningTotal} />
                        </div>
                    </div>

                </div>{/* end left inner */}
                </div>{/* end left column */}

                {/* RIGHT COLUMN */}
                <div className="reveal-right-col" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {/* ── Live Rankings ── */}
                    <div style={{
                        borderRadius: '20px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '18px 20px',
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
                            {t('live_rankings')}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {currentRankings.map((entry: any, idx: number) => {
                                const isMe = entry.playerId === currentPlayerId
                                const diff = diffLabel(entry.playerId, idx)
                                return (
                                    <div
                                        key={entry.playerId}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px 14px',
                                            borderRadius: '14px',
                                            background: isMe ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${isMe ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                                            animation: `slideUpFadeIn 0.4s ease ${idx * 0.07}s both`,
                                        }}
                                    >
                                        <div style={{ width: '26px', textAlign: 'center', flexShrink: 0 }}>
                                            {idx < 3
                                                ? <span style={{ fontSize: '18px' }}>{MEDALS[idx]}</span>
                                                : <span style={{ fontSize: '12px', fontWeight: 700, color: '#52525b' }}>{idx + 1}</span>
                                            }
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <span style={{ fontWeight: 700, color: isMe ? '#a5b4fc' : 'white', fontSize: '13px' }}>
                                                {entry.playerName}
                                            </span>
                                            {isMe && (
                                                <span style={{
                                                    marginLeft: '6px', fontSize: '9px', fontWeight: 700,
                                                    background: 'rgba(99,102,241,0.3)', color: '#818cf8',
                                                    padding: '1px 6px', borderRadius: '99px',
                                                }}>you</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: 900, color: isMe ? '#a5b4fc' : '#a1a1aa', flexShrink: 0 }}>
                                            {entry.total.toLocaleString()}
                                        </div>
                                        {diff && (
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: diff.color, flexShrink: 0, minWidth: '28px', textAlign: 'right' }}>
                                                {diff.text}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* ── All Answers This Question ── */}
                    <div style={{
                        borderRadius: '20px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '18px 20px',
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
                            {t('all_answers_heading', { n: currentRevealIndex + 1 })}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {questionResults.map((result: any, index: number) => (
                                <div
                                    key={result.playerId}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px',
                                        padding: '10px 14px',
                                        borderRadius: '14px',
                                        background: result.isCorrect ? 'rgba(74,222,128,0.06)' : 'rgba(239,68,68,0.06)',
                                        border: `1px solid ${result.isCorrect ? 'rgba(74,222,128,0.18)' : 'rgba(239,68,68,0.15)'}`,
                                        outline: result.playerId === currentPlayerId ? '1px solid rgba(99,102,241,0.4)' : 'none',
                                        outlineOffset: '1px',
                                    }}
                                >
                                    <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>
                                        {result.isCorrect ? '✅' : '❌'}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                                            <span style={{ fontWeight: 700, color: result.playerId === currentPlayerId ? '#a5b4fc' : 'white', fontSize: '13px' }}>
                                                {result.playerName}
                                            </span>
                                            {result.playerId === currentPlayerId && (
                                                <span style={{
                                                    fontSize: '9px', fontWeight: 700,
                                                    background: 'rgba(99,102,241,0.3)', color: '#818cf8',
                                                    padding: '1px 5px', borderRadius: '99px',
                                                }}>you</span>
                                            )}
                                        </div>
                                        {currentQuestion.type === 'letter_game' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                {(currentQuestion.categories || []).map((cat: string, i: number) => {
                                                    const entries = (result.answer || '').split(',')
                                                    const word = entries[i]?.trim() || ''
                                                    const isValid = result.letterGameValidation ? result.letterGameValidation[cat] === true : null
                                                    return (
                                                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                                                            <span style={{ color: '#52525b', width: '80px', flexShrink: 0 }}>{cat}</span>
                                                            <span style={{ fontWeight: 600, color: word ? 'white' : '#3f3f46' }}>{word || '—'}</span>
                                                            {isValid !== null && <span>{isValid ? '✅' : '❌'}</span>}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '12px', color: '#a1a1aa' }}>
                                                {result.playerAnswerText || getDisplayAnswer(currentQuestion, result.answer)}
                                            </div>
                                        )}
                                        <div style={{ fontSize: '10px', color: '#52525b', marginTop: '2px' }}>
                                            {(result.time / 1000).toFixed(1)}s
                                        </div>
                                    </div>
                                    {result.score > 0 && (
                                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#4ade80', flexShrink: 0, alignSelf: 'center' }}>
                                            +{result.score}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Challenge Section ── */}
                    {!isCorrect && !showingChallenge && !challengeVoting && !hasUsedChallenge && (
                        <div style={{
                            borderRadius: '20px',
                            background: 'rgba(245,158,11,0.08)',
                            border: '1px solid rgba(245,158,11,0.25)',
                            padding: '16px 20px',
                            textAlign: 'center',
                        }}>
                            <button
                                onClick={handleStartChallenge}
                                style={{
                                    width: '100%',
                                    padding: '12px 24px',
                                    borderRadius: '14px',
                                    background: 'rgba(245,158,11,0.15)',
                                    border: '1px solid rgba(245,158,11,0.4)',
                                    color: '#fbbf24',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    letterSpacing: '0.03em',
                                }}
                            >
                                {t('challenge_button')}
                            </button>
                            <p style={{ fontSize: '11px', color: '#52525b', margin: '8px 0 0' }}>
                                {t('challenge_limit')}
                            </p>
                        </div>
                    )}

                    {hasUsedChallenge && (
                        <div style={{
                            borderRadius: '20px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            padding: '14px 20px',
                            textAlign: 'center',
                            fontSize: '12px',
                            color: '#52525b',
                        }}>
                            {t('challenge_used')}
                        </div>
                    )}

                    {/* Challenge Form */}
                    {showingChallenge && (
                        <div style={{
                            borderRadius: '20px',
                            background: 'rgba(245,158,11,0.1)',
                            border: '1px solid rgba(245,158,11,0.3)',
                            padding: '18px 20px',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24' }}>{t('challenge_form_title')}</span>
                                <span style={{ fontSize: '20px', fontWeight: 900, color: '#fbbf24' }}>{challengeTimeLeft}s</span>
                            </div>
                            <textarea
                                value={challengeExplanation}
                                onChange={(e) => setChallengeExplanation(e.target.value)}
                                placeholder={t('challenge_explain_placeholder')}
                                rows={3}
                                maxLength={200}
                                autoFocus
                                style={{
                                    width: '100%',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(245,158,11,0.3)',
                                    color: 'white',
                                    padding: '12px',
                                    fontSize: '14px',
                                    resize: 'none',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    fontFamily: 'inherit',
                                }}
                            />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                                <button
                                    onClick={handleChallenge}
                                    disabled={!challengeExplanation.trim()}
                                    style={{
                                        flex: 1,
                                        padding: '11px',
                                        borderRadius: '12px',
                                        background: challengeExplanation.trim() ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${challengeExplanation.trim() ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                        color: challengeExplanation.trim() ? '#fbbf24' : '#52525b',
                                        fontWeight: 700,
                                        fontSize: '13px',
                                        cursor: challengeExplanation.trim() ? 'pointer' : 'default',
                                    }}
                                >
                                    {t('challenge_submit', { n: challengeTimeLeft })}
                                </button>
                                <button
                                    onClick={() => { setShowingChallenge(false); setChallengeExplanation('') }}
                                    style={{
                                        flex: 1,
                                        padding: '11px',
                                        borderRadius: '12px',
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        color: '#71717a',
                                        fontWeight: 700,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {t('cancel')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Challenge in progress (showing challenge timer banner) */}
                    {showingChallenge && (
                        <div style={{
                            borderRadius: '20px',
                            background: 'rgba(245,158,11,0.1)',
                            border: '1px solid rgba(245,158,11,0.3)',
                            padding: '16px 20px',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24', marginBottom: '6px' }}>
                                {t('challenge_in_progress')}
                            </div>
                            <div style={{ fontSize: '36px', fontWeight: 900, color: 'white' }}>{challengeTimeLeft}s</div>
                            <p style={{ fontSize: '12px', color: '#fbbf24', margin: '4px 0 0' }}>{t('challenge_in_progress_msg')}</p>
                        </div>
                    )}

                    {/* Voting Phase for non-challengers */}
                    {(() => {
                        const shouldShowVoting = challengeVoting && currentChallenge && currentChallenge.challengerId && currentChallenge.challengerId !== currentPlayerId
                        return shouldShowVoting ? (
                            <div style={{
                                borderRadius: '20px',
                                background: 'rgba(139,92,246,0.1)',
                                border: '1px solid rgba(139,92,246,0.3)',
                                padding: '18px 20px',
                            }}>
                                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#a78bfa', marginBottom: '6px' }}>
                                        {t('challenge_voting_title')}
                                    </div>
                                    <div style={{ fontSize: '36px', fontWeight: 900, color: 'white' }}>{voteTimeLeft}s</div>
                                    <p style={{ fontSize: '12px', color: '#c4b5fd', margin: '4px 0 0' }}>
                                        {t('vote_on', { name: currentChallenge.challengerName })}
                                    </p>
                                </div>

                                <div style={{
                                    borderRadius: '14px',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    padding: '14px 16px',
                                    marginBottom: '14px',
                                }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                                        {t('challenge_details')}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6 }}>
                                        <div><span style={{ color: '#71717a' }}>{t('challenger_label')}</span> <span style={{ color: 'white', fontWeight: 700 }}>{currentChallenge.challengerName}</span></div>
                                        <div><span style={{ color: '#71717a' }}>{t('their_answer_label')}</span> <span style={{ color: 'white', fontWeight: 700 }}>{getDisplayAnswer(currentQuestion, currentChallenge.playerAnswer)}</span></div>
                                        <div><span style={{ color: '#71717a' }}>{t('reason_label')}</span> <span style={{ color: '#e4e4e7' }}>&quot;{currentChallenge.explanation}&quot;</span></div>
                                        <div><span style={{ color: '#71717a' }}>{t('potential_label')}</span> <span style={{ color: '#4ade80', fontWeight: 700 }}>+{currentChallenge.potentialScore} pts</span></div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => onVoteChallenge?.(currentChallenge.id, 'approve')}
                                        style={{
                                            flex: 1, padding: '12px',
                                            borderRadius: '12px',
                                            background: 'rgba(74,222,128,0.15)',
                                            border: '1px solid rgba(74,222,128,0.4)',
                                            color: '#4ade80', fontWeight: 800, fontSize: '13px', cursor: 'pointer',
                                        }}
                                    >
                                        {t('approve')}
                                    </button>
                                    <button
                                        onClick={() => onVoteChallenge?.(currentChallenge.id, 'reject')}
                                        style={{
                                            flex: 1, padding: '12px',
                                            borderRadius: '12px',
                                            background: 'rgba(239,68,68,0.12)',
                                            border: '1px solid rgba(239,68,68,0.3)',
                                            color: '#f87171', fontWeight: 800, fontSize: '13px', cursor: 'pointer',
                                        }}
                                    >
                                        {t('reject')}
                                    </button>
                                </div>
                            </div>
                        ) : null
                    })()}

                    {/* Challenger waiting for votes */}
                    {currentChallenge && currentChallenge.challengerId === currentPlayerId && challengeVoting && (
                        <div style={{
                            borderRadius: '20px',
                            background: 'rgba(99,102,241,0.1)',
                            border: '1px solid rgba(99,102,241,0.3)',
                            padding: '18px 20px',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#818cf8', marginBottom: '6px' }}>
                                {t('your_challenge_voting')}
                            </div>
                            <div style={{ fontSize: '36px', fontWeight: 900, color: 'white' }}>{voteTimeLeft}s</div>
                            <p style={{ fontSize: '12px', color: '#a5b4fc', margin: '4px 0 0' }}>{t('other_players_voting')}</p>
                        </div>
                    )}

                </div>{/* end right column */}
                </div>{/* end two-column body */}
            </div>

            {/* ── Host Next button — fixed footer, always visible ── */}
            {isHost && !showingChallenge && !challengeVoting && (
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '12px 20px',
                    paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
                    background: 'rgba(9,9,15,0.9)',
                    backdropFilter: 'blur(12px)',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    zIndex: 40,
                    display: 'flex',
                    gap: '10px',
                }}>
                    {currentRevealIndex < gameState.questions.length - 1 && onSkipToResults && (
                        <button
                            onClick={onSkipToResults}
                            style={{
                                flexShrink: 0,
                                padding: '14px 18px',
                                borderRadius: '14px',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                color: '#a1a1aa',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {t('skip_to_results')}
                        </button>
                    )}
                    <button
                        onClick={handleNextQuestion}
                        style={{
                            flex: 1,
                            padding: '14px',
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                            border: 'none',
                            color: 'white',
                            fontWeight: 800,
                            fontSize: '15px',
                            cursor: 'pointer',
                            boxShadow: '0 0 30px rgba(79,70,229,0.4)',
                        }}
                    >
                        {currentRevealIndex < gameState.questions.length - 1 ? t('next_question_btn') : t('final_results_btn')}
                    </button>
                </div>
            )}

            {/* ── Challenge Result Modal ── */}
            {challengeResult && (
                <div style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 50,
                    padding: '20px',
                }}>
                    <div style={{
                        borderRadius: '24px',
                        background: '#0f0f1a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '32px 28px',
                        width: '100%',
                        maxWidth: '420px',
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{
                                fontSize: '24px', fontWeight: 900,
                                color: challengeResult.passed ? '#4ade80' : '#f87171',
                                marginBottom: '24px',
                            }}>
                                {challengeResult.passed ? t('challenge_accepted') : t('challenge_rejected')}
                            </h3>

                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
                                    {t('vote_results_heading')}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '14px' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px' }}>✅</div>
                                        <div style={{ fontSize: '11px', color: '#71717a' }}>{t('approve_label')}</div>
                                        <div style={{ fontSize: '20px', fontWeight: 900, color: 'white' }}>{challengeResult.votes.approve}</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px' }}>❌</div>
                                        <div style={{ fontSize: '11px', color: '#71717a' }}>{t('reject_label')}</div>
                                        <div style={{ fontSize: '20px', fontWeight: 900, color: 'white' }}>{challengeResult.votes.reject}</div>
                                    </div>
                                </div>

                                <div style={{ width: '100%', height: '8px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '8px' }}>
                                    <div style={{
                                        height: '100%',
                                        borderRadius: '99px',
                                        background: challengeResult.passed ? '#4ade80' : '#f87171',
                                        width: `${(challengeResult.votes.approve / (challengeResult.votes.approve + challengeResult.votes.reject)) * 100}%`,
                                        transition: 'width 0.6s ease',
                                    }} />
                                </div>

                                <div style={{ fontSize: '12px', color: '#71717a' }}>
                                    {challengeResult.passed
                                        ? t('percent_approved', { n: Math.round((challengeResult.votes.approve / (challengeResult.votes.approve + challengeResult.votes.reject)) * 100) })
                                        : t('percent_rejected', { n: Math.round((challengeResult.votes.reject / (challengeResult.votes.approve + challengeResult.votes.reject)) * 100) })}
                                </div>
                            </div>

                            {challengeResult.passed && currentChallenge?.challengerId === currentPlayerId && (
                                <div style={{
                                    borderRadius: '16px',
                                    background: 'rgba(74,222,128,0.1)',
                                    border: '1px solid rgba(74,222,128,0.25)',
                                    padding: '16px',
                                    marginBottom: '20px',
                                    textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
                                    <p style={{ fontWeight: 800, color: '#4ade80', fontSize: '14px', margin: '0 0 4px' }}>
                                        {t('you_earned_points')}
                                    </p>
                                    <p style={{ fontSize: '24px', fontWeight: 900, color: 'white', margin: '0 0 6px' }}>
                                        +{challengeResult.scoreAwarded || 'Points'} points
                                    </p>
                                    <p style={{ fontSize: '11px', color: '#52525b', margin: 0 }}>
                                        {t('challenge_no_time_bonus')}
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={onDismissChallengeResult}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '14px',
                                    background: 'rgba(99,102,241,0.2)',
                                    border: '1px solid rgba(99,102,241,0.4)',
                                    color: 'white',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                }}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
