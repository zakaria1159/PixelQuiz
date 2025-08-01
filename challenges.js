// challenges.js - Challenge and Voting System
const { calculateScore, getMaxScore } = require('./scoring')

// Challenge phases
const CHALLENGE_PHASES = {
  SELECTION: 'selection',      // Players select questions to challenge
  EXPLANATION: 'explanation',  // Challenger explains their case
  VOTING: 'voting',           // Other players vote
  RESOLUTION: 'resolution'    // Results applied
}

// Challenge settings
const CHALLENGE_CONFIG = {
  MAX_CHALLENGES_PER_PLAYER: 2,
  EXPLANATION_TIME: 30, // seconds
  VOTING_TIME: 20,      // seconds
  MIN_VOTERS: 1,        // Minimum voters needed (excluding challenger)
  MAJORITY_THRESHOLD: 0.5 // 50% majority needed
}

/**
 * Initialize challenge system for a game
 * @param {Array} players - Array of player objects
 * @returns {Object} - Challenge state
 */
function initializeChallenges(players) {
  const challengeState = {
    phase: null,
    challenges: [],
    currentChallengeIndex: 0,
    playerChallenges: {},
    votes: {},
    results: []
  }

  // Initialize each player's challenge data
  players.forEach(player => {
    challengeState.playerChallenges[player.id] = {
      challengesRemaining: CHALLENGE_CONFIG.MAX_CHALLENGES_PER_PLAYER,
      challengedQuestions: [],
      canVote: true
    }
  })

  return challengeState
}

/**
 * Check if a player can challenge a question
 * @param {Object} challengeState - Current challenge state
 * @param {string} playerId - Player ID
 * @param {number} questionIndex - Question index to challenge
 * @returns {Object} - { canChallenge: boolean, reason?: string }
 */
function canPlayerChallenge(challengeState, playerId, questionIndex) {
  const playerData = challengeState.playerChallenges[playerId]
  
  if (!playerData) {
    return { canChallenge: false, reason: 'Player not found' }
  }

  if (playerData.challengesRemaining <= 0) {
    return { canChallenge: false, reason: 'No challenges remaining' }
  }

  if (playerData.challengedQuestions.includes(questionIndex)) {
    return { canChallenge: false, reason: 'Question already challenged' }
  }

  // Check if question was already answered correctly
  // (Players typically challenge questions they got wrong)
  return { canChallenge: true }
}

/**
 * Submit a challenge for a question
 * @param {Object} challengeState - Current challenge state
 * @param {string} playerId - Challenger player ID
 * @param {string} playerName - Challenger player name
 * @param {number} questionIndex - Question index
 * @param {Object} question - Question object
 * @param {string} playerAnswer - Player's original answer
 * @param {string} explanation - Challenger's explanation
 * @returns {Object} - Updated challenge state
 */
function submitChallenge(challengeState, playerId, playerName, questionIndex, question, playerAnswer, explanation) {
  const validation = canPlayerChallenge(challengeState, playerId, questionIndex)
  if (!validation.canChallenge) {
    throw new Error(validation.reason)
  }

  const challenge = {
    id: `${playerId}_${questionIndex}_${Date.now()}`,
    challengerId: playerId,
    challengerName: playerName,
    questionIndex,
    question,
    playerAnswer,
    explanation: explanation.trim(),
    potentialScore: getMaxScore(question),
    submittedAt: Date.now(),
    status: 'pending' // pending, voting, resolved
  }

  // Add to challenges list
  challengeState.challenges.push(challenge)
  challengeState.playerChallenges[playerId].challengesRemaining--
  challengeState.playerChallenges[playerId].challengedQuestions.push(questionIndex)

  console.log(`🏛️ Challenge submitted by ${playerName} for Q${questionIndex + 1}: "${explanation}"`)
  
  return challengeState
}

/**
 * Start voting phase for current challenge
 * @param {Object} challengeState - Current challenge state
 * @param {Array} players - All players in game
 * @returns {Object} - Updated state with voting info
 */
function startVoting(challengeState, players) {
  if (challengeState.challenges.length === 0) {
    return challengeState
  }

  const currentChallenge = challengeState.challenges[challengeState.currentChallengeIndex]
  challengeState.phase = CHALLENGE_PHASES.VOTING
  
  // Initialize votes for this challenge
  challengeState.votes[currentChallenge.id] = {
    approve: [],
    reject: [],
    abstain: [],
    totalVoters: players.filter(p => p.id !== currentChallenge.challengerId).length
  }

  currentChallenge.status = 'voting'
  
  console.log(`🗳️ Voting started for challenge: ${currentChallenge.challengerName} - Q${currentChallenge.questionIndex + 1}`)
  
  return challengeState
}

/**
 * Submit a vote for a challenge
 * @param {Object} challengeState - Current challenge state
 * @param {string} challengeId - Challenge ID
 * @param {string} voterId - Voter player ID
 * @param {string} voterName - Voter player name
 * @param {string} vote - 'approve', 'reject', or 'abstain'
 * @returns {Object} - Updated challenge state
 */
function submitVote(challengeState, challengeId, voterId, voterName, vote) {
  const voteData = challengeState.votes[challengeId]
  if (!voteData) {
    throw new Error('Challenge not found for voting')
  }

  const challenge = challengeState.challenges.find(c => c.id === challengeId)
  if (challenge.challengerId === voterId) {
    throw new Error('Challenger cannot vote on their own challenge')
  }

  // Remove any existing vote from this voter
  voteData.approve = voteData.approve.filter(v => v.voterId !== voterId)
  voteData.reject = voteData.reject.filter(v => v.voterId !== voterId)
  voteData.abstain = voteData.abstain.filter(v => v.voterId !== voterId)

  // Add new vote
  const voteRecord = { voterId, voterName, timestamp: Date.now() }
  voteData[vote].push(voteRecord)

  console.log(`🗳️ Vote submitted: ${voterName} voted "${vote}" on ${challenge.challengerName}'s challenge`)

  return challengeState
}

/**
 * Check if voting is complete for current challenge
 * @param {Object} challengeState - Current challenge state
 * @returns {boolean} - Whether voting is complete
 */
function isVotingComplete(challengeState) {
  const currentChallenge = challengeState.challenges[challengeState.currentChallengeIndex]
  if (!currentChallenge) return false

  const voteData = challengeState.votes[currentChallenge.id]
  if (!voteData) return false

  const totalVotes = voteData.approve.length + voteData.reject.length + voteData.abstain.length
  return totalVotes >= voteData.totalVoters
}

/**
 * Resolve a challenge based on votes
 * @param {Object} challengeState - Current challenge state
 * @param {Object} game - Game state for score updates
 * @returns {Object} - Resolution result
 */
function resolveChallenge(challengeState, game) {
  const currentChallenge = challengeState.challenges[challengeState.currentChallengeIndex]
  const voteData = challengeState.votes[currentChallenge.id]

  const approveVotes = voteData.approve.length
  const rejectVotes = voteData.reject.length
  const abstainVotes = voteData.abstain.length
  const totalVotes = approveVotes + rejectVotes + abstainVotes

  // Calculate if challenge passed (majority of non-abstain votes)
  const decisiveVotes = approveVotes + rejectVotes
  const challengePassed = decisiveVotes > 0 && (approveVotes / decisiveVotes) > CHALLENGE_CONFIG.MAJORITY_THRESHOLD

  const resolution = {
    challengeId: currentChallenge.id,
    challengerName: currentChallenge.challengerName,
    questionIndex: currentChallenge.questionIndex,
    passed: challengePassed,
    votes: {
      approve: approveVotes,
      reject: rejectVotes,
      abstain: abstainVotes,
      total: totalVotes
    },
    scoreAwarded: 0
  }

  // Award points if challenge passed
  if (challengePassed) {
    const scoreAwarded = currentChallenge.potentialScore
    
    // Find player and update score
    const player = game.players.find(p => p.id === currentChallenge.challengerId)
    if (player) {
      player.score += scoreAwarded
      resolution.scoreAwarded = scoreAwarded
      console.log(`✅ Challenge APPROVED: ${currentChallenge.challengerName} awarded ${scoreAwarded} points`)
    }
  } else {
    console.log(`❌ Challenge REJECTED: ${currentChallenge.challengerName} receives no points`)
  }

  currentChallenge.status = 'resolved'
  challengeState.results.push(resolution)

  return resolution
}

/**
 * Move to next challenge or end challenge phase
 * @param {Object} challengeState - Current challenge state
 * @returns {boolean} - Whether there are more challenges
 */
function moveToNextChallenge(challengeState) {
  challengeState.currentChallengeIndex++
  
  if (challengeState.currentChallengeIndex >= challengeState.challenges.length) {
    challengeState.phase = CHALLENGE_PHASES.RESOLUTION
    return false // No more challenges
  }
  
  return true // More challenges remain
}

/**
 * Get challenge summary for display
 * @param {Object} challengeState - Current challenge state
 * @returns {Object} - Summary data
 */
function getChallengeSummary(challengeState) {
  return {
    totalChallenges: challengeState.challenges.length,
    resolvedChallenges: challengeState.results.length,
    currentPhase: challengeState.phase,
    challengesRemaining: challengeState.challenges.length - challengeState.currentChallengeIndex,
    results: challengeState.results
  }
}

module.exports = {
  CHALLENGE_PHASES,
  CHALLENGE_CONFIG,
  initializeChallenges,
  canPlayerChallenge,
  submitChallenge,
  startVoting,
  submitVote,
  isVotingComplete,
  resolveChallenge,
  moveToNextChallenge,
  getChallengeSummary
}