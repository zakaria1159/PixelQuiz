// scoring.js - Dynamic Scoring System
const POINT_VALUES = {
    easy: { 
      base: 100, 
      timeBonus: 50,
      multiplier: 1.0 
    },
    medium: { 
      base: 200, 
      timeBonus: 100,
      multiplier: 1.2 
    },
    hard: { 
      base: 400, 
      timeBonus: 200,
      multiplier: 1.5 
    }
  }
  
  const QUESTION_TYPE_MULTIPLIERS = {
    multiple_choice: 1.0,
    true_false: 0.8,      // Easier, less points
    free_text: 1.3,       // Harder, more points  
    image_guess: 1.5,     // Hardest, most points
    ranking: 1.2          // Good points for ranking (requires thinking)
  }
  
  /**
   * Calculate score for a player's answer
   * @param {Object} question - The question object
   * @param {boolean} isCorrect - Whether the answer was correct
   * @param {number} timeToAnswer - Time taken to answer (ms)
   * @param {number} timeLimit - Question time limit (seconds)
   * @returns {number} - Calculated score
   */
  function calculateScore(question, isCorrect, timeToAnswer, timeLimit) {
    if (!isCorrect) return 0
  
    const difficulty = question.difficulty || 'medium'
    const questionType = question.type || 'multiple_choice'
    
    // Get base scoring config
    const scoreConfig = POINT_VALUES[difficulty]
    if (!scoreConfig) {
      console.warn(`Unknown difficulty: ${difficulty}, using medium`)
      scoreConfig = POINT_VALUES.medium
    }
  
    // Calculate base score with type multiplier
    const typeMultiplier = QUESTION_TYPE_MULTIPLIERS[questionType] || 1.0
    const adjustedBaseScore = Math.round(scoreConfig.base * typeMultiplier)
  
    // Calculate time bonus (faster = more bonus)
    const timeLimitMs = timeLimit * 1000
    const timeRatio = Math.max(0, (timeLimitMs - timeToAnswer) / timeLimitMs)
    const timeBonus = Math.round(scoreConfig.timeBonus * typeMultiplier * timeRatio)
  
    // Apply difficulty multiplier
    const finalScore = Math.round((adjustedBaseScore + timeBonus) * scoreConfig.multiplier)
  
    console.log(`📊 Score calculation for ${difficulty}/${questionType}:`)
    console.log(`  Base: ${scoreConfig.base} × ${typeMultiplier} = ${adjustedBaseScore}`)
    console.log(`  Time bonus: ${timeBonus} (${(timeRatio * 100).toFixed(1)}% speed)`)
    console.log(`  Final: ${finalScore} pts`)
  
    return Math.max(finalScore, Math.round(adjustedBaseScore * 0.3)) // Min 30% of base
  }
  
  /**
   * Calculate total possible score for a question
   * @param {Object} question - The question object
   * @returns {number} - Maximum possible score
   */
  function getMaxScore(question) {
    const difficulty = question.difficulty || 'medium'
    const questionType = question.type || 'multiple_choice'
    
    const scoreConfig = POINT_VALUES[difficulty]
    const typeMultiplier = QUESTION_TYPE_MULTIPLIERS[questionType] || 1.0
    
    const maxBaseScore = Math.round(scoreConfig.base * typeMultiplier)
    const maxTimeBonus = Math.round(scoreConfig.timeBonus * typeMultiplier)
    
    return Math.round((maxBaseScore + maxTimeBonus) * scoreConfig.multiplier)
  }
  
  /**
   * Get scoring info for display purposes
   * @param {Object} question - The question object
   * @returns {Object} - Scoring breakdown
   */
  function getScoringInfo(question) {
    const difficulty = question.difficulty || 'medium'
    const questionType = question.type || 'multiple_choice'
    
    return {
      difficulty,
      questionType,
      maxScore: getMaxScore(question),
      basePoints: POINT_VALUES[difficulty].base,
      difficultyMultiplier: POINT_VALUES[difficulty].multiplier,
      typeMultiplier: QUESTION_TYPE_MULTIPLIERS[questionType]
    }
  }
  
  /**
   * Calculate leaderboard with proper sorting
   * @param {Array} players - Array of player objects
   * @returns {Array} - Sorted leaderboard
   */
  function calculateLeaderboard(players) {
    return [...players].sort((a, b) => {
      // Primary sort: Total score (descending)
      if (a.score !== b.score) {
        return b.score - a.score
      }
      
      // Secondary sort: Total time (ascending - faster is better)
      const aTotalTime = a.totalTime || 0
      const bTotalTime = b.totalTime || 0
      if (aTotalTime !== bTotalTime) {
        return aTotalTime - bTotalTime
      }
      
      // Tertiary sort: Join time (ascending - earlier is better)
      return (a.joinedAt || 0) - (b.joinedAt || 0)
    })
  }
  
  /**
   * Get rank suffix for display (1st, 2nd, 3rd, etc.)
   * @param {number} rank - The rank number (1-based)
   * @returns {string} - Formatted rank
   */
  function getRankSuffix(rank) {
    if (rank === 1) return '🥇 1st'
    if (rank === 2) return '🥈 2nd' 
    if (rank === 3) return '🥉 3rd'
    return `#${rank}`
  }
  
  /**
   * Calculate performance statistics
   * @param {Object} playerResults - Player's question results
   * @returns {Object} - Performance stats
   */
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
      perfectAnswers: playerResults.filter(r => r.isCorrect && r.time < 3000).length
    }
  }
  
  /**
   * Calculate participation ratio bonus based on how many players got the question correct
   * @param {number} correctAnswers - Number of players who answered correctly
   * @param {number} totalPlayers - Total number of players
   * @returns {number} - Bonus multiplier (-0.2 to +0.6)
   */
  function calculateParticipationRatioBonus(correctAnswers, totalPlayers) {
    const participationRatio = correctAnswers / totalPlayers
    
    // Bonus calculation:
    // - If 80%+ got it right: -20% penalty (too easy)
    // - If 60-80% got it right: 0% (normal difficulty)
    // - If 40-60% got it right: +20% bonus (moderate difficulty)
    // - If 20-40% got it right: +40% bonus (hard)
    // - If <20% got it right: +60% bonus (very hard)
    
    let ratioBonus = 0
    if (participationRatio >= 0.8) {
      ratioBonus = -0.2 // -20% penalty
    } else if (participationRatio >= 0.6) {
      ratioBonus = 0 // No bonus/penalty
    } else if (participationRatio >= 0.4) {
      ratioBonus = 0.2 // +20% bonus
    } else if (participationRatio >= 0.2) {
      ratioBonus = 0.4 // +40% bonus
    } else {
      ratioBonus = 0.6 // +60% bonus
    }
    
    return ratioBonus
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
    QUESTION_TYPE_MULTIPLIERS
  }