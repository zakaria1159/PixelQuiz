// scoring.js - Dynamic Scoring System

const POINT_VALUES = {
  easy:   { base: 100, timeBonus: 50 },
  medium: { base: 200, timeBonus: 100 },
  hard:   { base: 350, timeBonus: 150 },
}

// Applied once at the end — not stacked with difficulty
const QUESTION_TYPE_MULTIPLIERS = {
  true_false:      0.8,   // Binary guess, low skill ceiling
  multiple_choice: 1.0,   // Baseline
  ranking:         1.1,   // Requires ordering, slightly harder
  closest_wins:    1.1,   // Estimation, no exact answer
  speed_buzz:      1.1,   // Rank-based
  free_text:       1.2,   // No options, must recall
  fill_blank:      1.2,   // Same as free_text
  image_guess:     1.2,   // Visual clue helps
  flag_guess:      1.0,   // Visual clue makes it closer to MC difficulty
  letter_game:     1.2,   // Multi-word recall
  pixel_reveal:    1.4,   // Hardest visual — answering early is very risky
  music_guess:     1.2,   // Audio hint provided — similar difficulty to free_text
  animal_sound:    1.1,   // Short audio clip — recognisable sounds are straightforward
  clue_chain:      1.3,   // No visual/audio aid — pure knowledge, rewarded for early answer
}

/**
 * Formula: score = (base + timeBonus × speedRatio) × typeMultiplier
 * Difficulty is baked into base/timeBonus values — no separate stacking multiplier.
 */
function calculateScore(question, isCorrect, timeToAnswer, timeLimit, creditMultiplier = 1.0) {
  if (!isCorrect) return 0

  const difficulty = question.difficulty || 'medium'
  const questionType = question.type || 'multiple_choice'

  const config = POINT_VALUES[difficulty] ?? POINT_VALUES.medium
  const typeMultiplier = QUESTION_TYPE_MULTIPLIERS[questionType] || 1.0

  const timeLimitMs = timeLimit * 1000
  const speedRatio = Math.max(0, (timeLimitMs - timeToAnswer) / timeLimitMs)

  const rawScore = (config.base + config.timeBonus * speedRatio) * typeMultiplier
  const finalScore = Math.round(rawScore)

  // Floor: 30% of base so slow-but-correct answers still earn something
  const minScore = Math.round(config.base * typeMultiplier * 0.3)

  const adjustedScore = Math.round(Math.max(finalScore, minScore) * creditMultiplier)
  console.log(`📊 Score [${difficulty}/${questionType}]: base=${config.base} bonus=${Math.round(config.timeBonus * speedRatio)} type=${typeMultiplier} credit=${creditMultiplier} → ${adjustedScore} pts`)

  return adjustedScore
}

/**
 * Maximum possible score (answered instantly)
 */
function getMaxScore(question) {
  const difficulty = question.difficulty || 'medium'
  const questionType = question.type || 'multiple_choice'

  const config = POINT_VALUES[difficulty] ?? POINT_VALUES.medium
  const typeMultiplier = QUESTION_TYPE_MULTIPLIERS[questionType] || 1.0

  return Math.round((config.base + config.timeBonus) * typeMultiplier)
}

function getScoringInfo(question) {
  const difficulty = question.difficulty || 'medium'
  const questionType = question.type || 'multiple_choice'

  return {
    difficulty,
    questionType,
    maxScore: getMaxScore(question),
    basePoints: POINT_VALUES[difficulty]?.base,
    typeMultiplier: QUESTION_TYPE_MULTIPLIERS[questionType],
  }
}

function calculateLeaderboard(players) {
  return [...players].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score
    const aTotalTime = a.totalTime || 0
    const bTotalTime = b.totalTime || 0
    if (aTotalTime !== bTotalTime) return aTotalTime - bTotalTime
    return (a.joinedAt || 0) - (b.joinedAt || 0)
  })
}

function getRankSuffix(rank) {
  if (rank === 1) return '🥇 1st'
  if (rank === 2) return '🥈 2nd'
  if (rank === 3) return '🥉 3rd'
  return `#${rank}`
}

function calculateStats(playerResults) {
  const totalQuestions = playerResults.length
  const correctAnswers = playerResults.filter(r => r.isCorrect).length
  const averageTime = playerResults.reduce((sum, r) => sum + r.time, 0) / totalQuestions
  const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

  return {
    totalQuestions,
    correctAnswers,
    accuracy: Math.round(accuracy),
    averageTime: Math.round(averageTime),
    perfectAnswers: playerResults.filter(r => r.isCorrect && r.time < 3000).length,
  }
}

/**
 * Participation ratio bonus — rewards questions that few players got right.
 * Capped at +30% (down from +60%) to prevent single questions dominating the total.
 */
function calculateParticipationRatioBonus(correctAnswers, totalPlayers) {
  const ratio = correctAnswers / totalPlayers

  if (ratio >= 0.8) return -0.10  // Almost everyone got it — slight penalty
  if (ratio >= 0.6) return 0      // Normal
  if (ratio >= 0.4) return 0.10   // +10%
  if (ratio >= 0.2) return 0.20   // +20%
  return 0.30                      // <20% correct — +30%
}

module.exports = {
  calculateScore,
  getMaxScore,
  getScoringInfo,
  calculateLeaderboard,
  getRankSuffix,
  calculateStats,
  calculateParticipationRatioBonus,
  POINT_VALUES,
  QUESTION_TYPE_MULTIPLIERS,
}
