// server.js - Socket.io Game Server with Hybrid Question Support
require('dotenv').config()
const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const { calculateScore, getMaxScore } = require('./scoring')
const cors = require('cors')
const Anthropic = require('@anthropic-ai/sdk')
const fs = require('fs')
const path = require('path')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Load questions from JSON files at startup
const questionsDir = path.join(__dirname, 'questions')
let allQuestions = []
try {
  for (const file of fs.readdirSync(questionsDir)) {
    if (!file.endsWith('.json')) continue
    const content = fs.readFileSync(path.join(questionsDir, file), 'utf8')
    const questions = JSON.parse(content)
    allQuestions = allQuestions.concat(questions)
  }
  console.log(`📚 Loaded ${allQuestions.length} questions from library (${fs.readdirSync(questionsDir).filter(f => f.endsWith('.json')).length} categories)`)
} catch (e) {
  console.error('Failed to load questions:', e.message)
}

// Smart text normalization - removes accents and normalizes case
function normalizeText(text) {
  if (!text || typeof text !== 'string') return ''
  
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces (helps with "da Vinci" vs "Davinci")
    .trim()
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
}

// Helper function to calculate longest common subsequence
function longestCommonSubsequence(str1, str2) {
  const m = str1.length
  const n = str2.length
  const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0))
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  
  // Reconstruct the LCS
  let i = m, j = n
  const lcs = []
  while (i > 0 && j > 0) {
    if (str1[i - 1] === str2[j - 1]) {
      lcs.unshift(str1[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }
  
  return lcs.join('')
}

// Calculate participation ratio bonus
function calculateParticipationRatioBonus(game, questionIndex) {
  const totalPlayers = game.players.length

  // Not enough players for a meaningful ratio — skip bonus/penalty
  if (totalPlayers < 4) {
    console.log(`📊 Participation ratio bonus skipped (${totalPlayers} players < 4)`)
    return 0
  }

  const correctAnswers = game.players.filter(player => {
    const answerData = game.answers[player.id]?.[questionIndex]
    return answerData && answerData.isCorrect
  }).length

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
  
  console.log(`📊 Participation ratio for Q${questionIndex + 1}: ${correctAnswers}/${totalPlayers} = ${(participationRatio * 100).toFixed(1)}% (bonus: ${(ratioBonus * 100).toFixed(1)}%)`)
  
  return ratioBonus
}

// Default time limits by question type (in seconds)
const DEFAULT_TIME_LIMITS = {
  true_false: 15,
  multiple_choice: 20,
  ranking: 30,
  closest_wins: 20,
  free_text: 40,
  image_guess: 40,
  fill_blank: 30,
  letter_game: 60,
  speed_buzz: 10,
  pixel_reveal: 45,
  flag_guess: 20,
  music_guess: 30,
  animal_sound: 20,
  clue_chain: 60,
}

function getTimeLimit(question) {
  return question.timeLimit || DEFAULT_TIME_LIMITS[question.type] || 20
}

/**
 * Music guess: returns { isCorrect, partial }
 * partial=true means artist name matched (half credit), partial=false means title matched (full credit)
 */
function validateMusicGuessAnswer(question, playerAnswer) {
  if (!playerAnswer || playerAnswer.toString().trim() === '') return { isCorrect: false, partial: false }

  const norm = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  const lcs = longestCommonSubsequence
  const similar = (a, b) => {
    const la = norm(a), lb = norm(b)
    if (la === lb) return true
    const l = lcs(la, lb)
    return l.length / Math.max(la.length, lb.length) >= 0.82
  }

  const userAnswer = playerAnswer.toString().trim()

  // Check title (correctAnswer / songTitle field) — full credit
  const titleTargets = [question.correctAnswer, question.songTitle].filter(Boolean)
  for (const t of titleTargets) {
    if (similar(userAnswer, t)) {
      console.log(`✅ Music title match: "${userAnswer}" ~ "${t}" → full credit`)
      return { isCorrect: true, partial: false }
    }
  }
  // Check acceptableAnswers (title variants) — full credit
  if (question.acceptableAnswers) {
    for (const a of question.acceptableAnswers) {
      if (similar(userAnswer, a)) {
        console.log(`✅ Music acceptable match: "${userAnswer}" ~ "${a}" → full credit`)
        return { isCorrect: true, partial: false }
      }
    }
  }

  // Check artist — half credit
  if (question.artist && similar(userAnswer, question.artist)) {
    console.log(`⚡ Music artist match: "${userAnswer}" ~ "${question.artist}" → partial credit`)
    return { isCorrect: true, partial: true }
  }

  console.log(`❌ Music guess no match: "${userAnswer}"`)
  return { isCorrect: false, partial: false }
}

// Helper function to validate answers based on question type
function validateAnswer(question, playerAnswer) {
  // Check if answer is empty or invalid
  if (!playerAnswer || playerAnswer.toString().trim() === '') {
    console.log('❌ Empty answer provided')
    return false
  }

  if (question.type === 'multiple_choice' || question.type === 'true_false' || question.type === 'speed_buzz') {
    // For multiple choice, true/false, and speed buzz, compare numbers
    const answerIndex = parseInt(playerAnswer)
    if (isNaN(answerIndex)) {
      console.log('❌ Invalid number for multiple choice:', playerAnswer)
      return false
    }
    const isCorrect = answerIndex === question.correctAnswer
    console.log(`🔍 Multiple choice validation: ${answerIndex} === ${question.correctAnswer} = ${isCorrect}`)
    return isCorrect
  } else if (question.type === 'ranking') {
    // For ranking questions, compare the order of items
    const userAnswer = playerAnswer.toString().trim()
    if (userAnswer === '') {
      console.log('❌ Empty ranking answer')
      return false
    }

    try {
      // Parse the comma-separated answer (e.g., "0,2,1")
      const userOrder = userAnswer.split(',').map(i => parseInt(i.trim()))
      
      // Check if all indexes are valid
      if (userOrder.some(isNaN) || userOrder.length !== question.correctOrder.length) {
        console.log('❌ Invalid ranking format or length')
        return false
      }

      // Check for exact match
      const isExactMatch = userOrder.every((item, index) => item === question.correctOrder[index])
      if (isExactMatch) {
        console.log('✅ Exact ranking match')
        return true
      }

      // Check for partial credit (if allowed)
      if (question.allowPartialCredit !== false) {
        const correctMatches = userOrder.filter((item, index) => item === question.correctOrder[index]).length
        const partialCreditPercentage = correctMatches / question.correctOrder.length
        
        if (partialCreditPercentage >= 0.5) { // At least 50% correct
          console.log(`✅ Partial ranking credit: ${(partialCreditPercentage * 100).toFixed(1)}%`)
          return true
        } else {
          console.log(`❌ Ranking validation: insufficient partial credit (${(partialCreditPercentage * 100).toFixed(1)}% < 50%)`)
        }
      }
      
      console.log('❌ Ranking validation: no match found')
      return false
    } catch (error) {
      console.log('❌ Error parsing ranking answer:', error)
      return false
    }
  } else if (question.type === 'flag_guess') {
    const userAnswer = playerAnswer.toString().trim()
    if (!userAnswer) return false
    // Reject ISO codes and abbreviations (≤3 characters)
    if (userAnswer.length <= 3) {
      console.log('❌ Flag answer too short (ISO code / abbreviation rejected):', userAnswer)
      return false
    }
    const norm = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
    const u = norm(userAnswer)
    if (u === norm(question.correctAnswer)) return true
    if (question.acceptableAnswers) {
      for (const alias of question.acceptableAnswers) {
        if (u === norm(alias)) return true
      }
    }
    // Allow minor typos via LCS similarity >= 0.82
    const c = norm(question.correctAnswer)
    const lcs = longestCommonSubsequence(u, c)
    const sim = lcs.length / Math.max(u.length, c.length)
    return sim >= 0.82
  } else if (question.type === 'free_text' || question.type === 'image_guess' || question.type === 'animal_sound' || question.type === 'clue_chain') {
    // For free text and image guess, use smart text matching
    const userAnswer = playerAnswer.toString().trim()
    if (userAnswer === '') {
      console.log('❌ Empty text answer')
      return false
    }

    // Normalize both answers for comparison
    const normalizedUserAnswer = normalizeText(userAnswer)
    const normalizedCorrectAnswer = normalizeText(question.correctAnswer)
    
    console.log(`🔍 Text validation:`)
    console.log(`  Original: "${userAnswer}" → Normalized: "${normalizedUserAnswer}"`)
    console.log(`  Correct: "${question.correctAnswer}" → Normalized: "${normalizedCorrectAnswer}"`)
    
    // Check exact match after normalization
    if (normalizedUserAnswer === normalizedCorrectAnswer) {
      console.log('✅ Exact match found (after normalization)')
      return true
    }
    
    // Check acceptable answers for exact matches (after normalization)
    if (question.acceptableAnswers && question.acceptableAnswers.length > 0) {
      for (const acceptable of question.acceptableAnswers) {
        const normalizedAcceptable = normalizeText(acceptable)
        console.log(`  Checking acceptable: "${acceptable}" → "${normalizedAcceptable}"`)
        if (normalizedUserAnswer === normalizedAcceptable) {
          console.log('✅ Acceptable answer match:', acceptable)
          return true
        }
      }
    }
    
    // If exact match is required, stop here — no partial matching
    if (question.exactMatch === true) {
      console.log('❌ Exact match required, no match found')
      return false
    }

    // Check for partial matches in normalized text
    const correctWords = normalizedCorrectAnswer.split(' ')
    const userWords = normalizedUserAnswer.split(' ')

    // For multi-word answers, require more than just one word match
    if (correctWords.length > 1) {
      // Require at least 70% of the key words to match
      const matchedWords = correctWords.filter(correctWord =>
        userWords.some(userWord =>
          userWord === correctWord ||
          (correctWord.length > 3 && userWord.includes(correctWord)) ||
          (userWord.length > 3 && correctWord.includes(userWord))
        )
      )

      const matchPercentage = matchedWords.length / correctWords.length

      if (matchPercentage >= 0.7) {
        console.log(`✅ Partial match: ${matchedWords.length}/${correctWords.length} words (${(matchPercentage * 100).toFixed(1)}%)`)
        return true
      } else {
        console.log(`❌ Insufficient word match: ${matchedWords.length}/${correctWords.length} words (${(matchPercentage * 100).toFixed(1)}% < 70%)`)
        return false
      }
    } else {
      // Single word answers - use LCS character similarity
      const minLength = Math.min(normalizedUserAnswer.length, normalizedCorrectAnswer.length)
      const maxLength = Math.max(normalizedUserAnswer.length, normalizedCorrectAnswer.length)

      if (minLength === 0) {
        console.log('❌ Empty word after normalization')
        return false
      }

      const lcs = longestCommonSubsequence(normalizedUserAnswer, normalizedCorrectAnswer)
      const similarity = lcs.length / maxLength

      if (similarity >= 0.9 && minLength >= 3) {
        console.log(`✅ Single word similarity match: ${(similarity * 100).toFixed(1)}% (LCS: ${lcs.length}/${maxLength})`)
        return true
      } else {
        console.log(`❌ Insufficient similarity: ${(similarity * 100).toFixed(1)}% < 90% or too short`)
        return false
      }
    }
  }
  
  if (question.type === 'closest_wins') {
    // Winner is resolved after all players answer — always pending at submit time
    return false
  }

  if (question.type === 'pixel_reveal') {
    // Same matching logic as image_guess
    const userAnswer = playerAnswer.toString().trim()
    if (!userAnswer) return false

    const normalizedUser = normalizeText(userAnswer)
    const normalizedCorrect = normalizeText(question.correctAnswer)

    if (normalizedUser === normalizedCorrect) {
      console.log(`✅ Pixel reveal exact match: "${userAnswer}"`)
      return true
    }
    if (question.acceptableAnswers) {
      for (const alt of question.acceptableAnswers) {
        if (normalizedUser === normalizeText(alt)) {
          console.log(`✅ Pixel reveal acceptable answer: "${alt}"`)
          return true
        }
      }
    }
    // Partial word matching (same as free_text)
    const correctWords = normalizedCorrect.split(' ')
    const userWords = normalizedUser.split(' ')
    if (correctWords.length > 1) {
      const matched = correctWords.filter(cw => userWords.some(uw => uw === cw || (cw.length > 3 && uw.includes(cw))))
      if (matched.length / correctWords.length >= 0.7) {
        console.log(`✅ Pixel reveal partial match: ${matched.length}/${correctWords.length} words`)
        return true
      }
    }
    console.log(`❌ Pixel reveal no match: "${userAnswer}" vs "${question.correctAnswer}"`)
    return false
  }

  if (question.type === 'fill_blank') {
    const userWord = playerAnswer.toString().trim()
    if (!userWord) return false

    const normalize = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    const normalizedUser = normalize(userWord)
    const normalizedCorrect = normalize(question.correctAnswer)

    if (normalizedUser === normalizedCorrect) {
      console.log(`✅ Fill-blank exact match: "${userWord}"`)
      return true
    }

    if (question.acceptableAnswers) {
      for (const alt of question.acceptableAnswers) {
        if (normalizedUser === normalize(alt)) {
          console.log(`✅ Fill-blank acceptable answer match: "${alt}"`)
          return true
        }
      }
    }

    console.log(`❌ Fill-blank no match: "${userWord}" vs "${question.correctAnswer}"`)
    return false
  }

  if (question.type === 'letter_game') {
    const validCount = countLetterGameValid(question, playerAnswer)
    console.log(`🔤 Letter game: ${validCount}/${question.categories.length} valid answers starting with '${question.letter}'`)
    return validCount > 0
  }

  return false
}

// Count how many letter_game answers are valid (non-empty and start with the correct letter)
// Used as a fast fallback when AI validation is unavailable
function countLetterGameValid(question, playerAnswer) {
  if (!playerAnswer) return 0
  const letter = question.letter.toLowerCase()
  const entries = playerAnswer.toString().split(',')
  let valid = 0
  entries.forEach(entry => {
    const word = entry.trim()
    if (word.length > 0 && word[0].toLowerCase() === letter) valid++
  })
  return valid
}

// Use Claude to validate all players' letter_game answers in one API call.
// Returns { playerId: { Category: true/false, ... }, ... }
// Falls back to letter-only check if the API call fails.
async function validateLetterGameWithAI(question, playerAnswerMap) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY not set — falling back to letter-only validation')
    return null
  }

  // Build a compact description of every player's answers
  const lines = Object.entries(playerAnswerMap).map(([playerId, rawAnswer]) => {
    const entries = rawAnswer.toString().split(',')
    const pairs = question.categories
      .map((cat, i) => `${cat}: "${entries[i]?.trim() || ''}"`)
      .join(', ')
    return `${playerId}: ${pairs}`
  })

  const prompt = `You are judging a Scattergories-style word game. The required starting letter is "${question.letter}".

For each player's answers, mark each category answer as true (valid) or false (invalid).
An answer is valid when ALL of these are true:
  1. It is non-empty (blank or missing answers are ALWAYS false)
  2. It is a real, recognisable word or proper noun (not gibberish or clearly made up)
  3. It genuinely belongs to the stated category
  4. It starts with the letter "${question.letter}" (case-insensitive)

Categories: ${question.categories.join(', ')}

Player answers:
${lines.join('\n')}

Reply with ONLY a JSON object — no explanation, no markdown:
{
  "<playerId>": { ${question.categories.map(c => `"${c}": true`).join(', ')} },
  ...
}

Be reasonably lenient: accept nicknames, common brand names used generically, and well-known regional terms.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.content[0].text.trim()
    // Strip optional markdown code fences
    const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    const result = JSON.parse(json)
    console.log('🤖 AI letter_game validation result:', JSON.stringify(result, null, 2))
    return result
  } catch (err) {
    console.error('❌ AI letter_game validation failed:', err.message)
    return null
  }
}

// Helper function to get display text for answers
function getAnswerDisplayText(question, answer) {
  if (question.type === 'multiple_choice' || question.type === 'true_false' || question.type === 'speed_buzz') {
    const answerIndex = parseInt(answer)
    return question.options && question.options[answerIndex] ? question.options[answerIndex] : 'Invalid option'
  } else if (question.type === 'ranking') {
    // For ranking questions, convert the comma-separated string back to readable format
    try {
      const order = answer.toString().split(',').map(num => parseInt(num.trim()))
      return order.map(index => question.items[index]).join(' → ')
    } catch (error) {
      console.log('Error parsing ranking answer:', error)
      return 'Invalid ranking'
    }
  } else if (question.type === 'closest_wins') {
    const unit = question.unit ? ` ${question.unit}` : ''
    return `${answer}${unit}`
  } else if (question.type === 'letter_game') {
    const entries = answer.toString().split(',')
    return question.categories
      .map((cat, i) => `${cat}: ${entries[i]?.trim() || '—'}`)
      .join(' | ')
  } else if (answer === 'NO_ANSWER') {
    return '—'
  } else {
    return typeof answer === 'string' ? answer : 'Invalid answer'
  }
}

// Helper function to get correct answer display text
function getCorrectAnswerDisplayText(question) {
  if (question.type === 'multiple_choice' || question.type === 'true_false' || question.type === 'speed_buzz') {
    return question.options && question.options[question.correctAnswer] ? question.options[question.correctAnswer] : 'Unknown'
  } else if (question.type === 'ranking') {
    if (question.correctOrder && question.items) {
      return question.correctOrder.map(index => question.items[index]).join(' → ')
    }
    return 'Unknown ranking'
  } else if (question.type === 'closest_wins') {
    const unit = question.unit ? ` ${question.unit}` : ''
    return `${question.correctAnswer}${unit}`
  } else if (question.type === 'fill_blank' || question.type === 'pixel_reveal') {
    return question.correctAnswer
  } else if (question.type === 'letter_game') {
    return `Any word starting with '${question.letter}' for each category`
  } else {
    return question.correctAnswer
  }
}

// Helper function to get random questions — guarantees one question per type
function getRandomQuestions(settings = {}) {
  const { categories = [], types = [], questionCount = 10 } = settings

  let pool = allQuestions
  if (categories.length > 0) pool = pool.filter(q => categories.includes(q.category))
  if (types.length > 0) pool = pool.filter(q => types.includes(q.type))
  if (pool.length === 0) pool = allQuestions // fallback if filters yield nothing

  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(questionCount, shuffled.length))
}

const app = express()
const server = createServer(app)
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:3000"]
  : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
})

// Game state storage
const games = new Map()
const players = new Map()

// Generate random game codes
const generateGameCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Create initial game state
const createGameState = (gameCode, hostId) => ({
  id: gameCode,
  hostId,
  players: [],
  spectators: [],
  questions: [],
  currentQuestion: null,
  currentQuestionIndex: 0,
  gameStatus: 'waiting',
  answers: {},
  questionStartTime: 0,
  settings: {
    maxPlayers: 10,
    questionsPerGame: 8,
    timePerQuestion: 15,
    categories: ['pop_culture'],
    difficulty: 'mixed',
    aiGenerated: false,
    showExplanations: true,
    allowSpectators: false
  },
  createdAt: Date.now(),
  updatedAt: Date.now()
})

// Socket connection handling
io.on('connection', (socket) => {
  console.log('🔌 New connection:', socket.id)

  // Host creates a game
  socket.on('host-create-game', ({ gameCode, hostName }) => {
    try {
      if (games.has(gameCode)) {
        const existingGame = games.get(gameCode)
        if (existingGame.hostId === socket.id) {
          console.log('🔄 Host rejoining existing game:', gameCode)
          socket.join(gameCode)
          players.set(socket.id, { gameCode, isHost: true })
          socket.emit('game-created', { gameCode, gameState: existingGame })
          return
        } else {
          socket.emit('error', { message: 'Game code already exists' })
          return
        }
      }

      const gameState = createGameState(gameCode, socket.id)
      
      gameState.players.push({
        id: socket.id,
        name: hostName || 'Host',
        isHost: true,
        score: 0,
        joinedAt: Date.now()
      })
      
      games.set(gameCode, gameState)
      players.set(socket.id, { gameCode, isHost: true })
      socket.join(gameCode)
      
      console.log('🎮 Game created:', gameCode, 'by host:', socket.id)
      socket.emit('game-created', { gameCode, gameState })
    } catch (error) {
      console.error('Error creating game:', error)
      socket.emit('error', { message: 'Failed to create game' })
    }
  })

  // Player joins a game
  socket.on('player-join-game', ({ gameCode, playerName }) => {
    try {
      const game = games.get(gameCode)
      if (!game) {
        socket.emit('join-error', { message: 'Game not found' })
        return
      }

      if (game.gameStatus !== 'waiting') {
        socket.emit('join-error', { message: 'Game has already started' })
        return
      }

      const existingPlayer = game.players.find(p => p.id === socket.id)
      if (existingPlayer) {
        console.log('🔄 Player rejoining:', playerName, 'in game:', gameCode)
        socket.join(gameCode)
        players.set(socket.id, { gameCode, isHost: false })
        socket.emit('player-joined', { player: existingPlayer, gameState: game })
        return
      }

      if (game.players.length >= game.settings.maxPlayers) {
        socket.emit('join-error', { message: 'Game is full' })
        return
      }

      const player = {
        id: socket.id,
        name: playerName,
        score: 0,
        isHost: false,
        connected: true,
        avatar: '',
        joinedAt: Date.now()
      }

      game.players.push(player)
      game.updatedAt = Date.now()
      players.set(socket.id, { gameCode, isHost: false })
      socket.join(gameCode)

      console.log('👤 Player joined:', playerName, 'in game:', gameCode)
      io.to(gameCode).emit('player-joined', { player, gameState: game })
    } catch (error) {
      console.error('Error joining game:', error)
      socket.emit('join-error', { message: 'Failed to join game' })
    }
  })

  // Player rejoins after refresh / reconnect
  socket.on('rejoin-game', ({ gameCode, playerName, isHost }) => {
    try {
      const game = games.get(gameCode)
      if (!game) {
        socket.emit('rejoin-error', { message: 'Game not found' })
        return
      }

      if (isHost) {
        // Restore host
        game.hostId = socket.id
        // Also update host's player entry so grace-period timeout doesn't evict them
        const hostPlayer = game.players.find(p => p.isHost)
        if (hostPlayer) {
          hostPlayer.id = socket.id
          hostPlayer.connected = true
          delete hostPlayer.disconnectedAt
          delete hostPlayer.disconnectedSocketId
        }
        players.set(socket.id, { gameCode, isHost: true })
        socket.join(gameCode)
        console.log(`🔄 Host rejoined: ${gameCode}`)
        socket.emit('rejoin-success', { gameState: game, isHost: true })
        return
      }

      // Find player by name
      const player = game.players.find(p => p.name === playerName)
      if (!player) {
        socket.emit('rejoin-error', { message: 'Player not found in game' })
        return
      }

      // Remap answers from old socket ID to new one
      if (game.answers && game.answers[player.id]) {
        game.answers[socket.id] = game.answers[player.id]
        delete game.answers[player.id]
      }

      // Update socket ID and clear disconnection marker
      player.id = socket.id
      player.connected = true
      delete player.disconnectedAt
      delete player.disconnectedSocketId
      players.set(socket.id, { gameCode, isHost: false })
      socket.join(gameCode)

      // Check if player already answered the current question
      const alreadyAnswered = game.answers?.[socket.id]?.[game.currentQuestionIndex] !== undefined

      console.log(`🔄 Player rejoined: ${playerName} in ${gameCode} (answered: ${alreadyAnswered})`)
      socket.emit('rejoin-success', { gameState: game, isHost: false, alreadyAnswered })
    } catch (error) {
      console.error('Error rejoining game:', error)
      socket.emit('rejoin-error', { message: 'Failed to rejoin' })
    }
  })

  // Player leaves a game
  socket.on('player-leave-game', (gameCode) => {
    try {
      const game = games.get(gameCode)
      if (!game) return

      const playerIndex = game.players.findIndex(p => p.id === socket.id)
      if (playerIndex !== -1) {
        const player = game.players[playerIndex]
        game.players.splice(playerIndex, 1)
        game.updatedAt = Date.now()

        console.log('👋 Player left:', player.name, 'from game:', gameCode)
        io.to(gameCode).emit('player-left', { playerId: socket.id, gameState: game })

        if (game.players.length === 0) {
          games.delete(gameCode)
          console.log('🗑️ Game deleted:', gameCode)
        }
      }

      players.delete(socket.id)
      socket.leave(gameCode)
    } catch (error) {
      console.error('Error leaving game:', error)
    }
  })

  // Host starts the game
  socket.on('host-start-game', async (data) => {
    // Support both old string format and new object format { gameCode, settings }
    const gameCode = typeof data === 'string' ? data : data?.gameCode
    const settings = (typeof data === 'object' && data?.settings) ? data.settings : {}
    const solo = typeof data === 'object' && data?.solo === true
    try {
      const game = games.get(gameCode)
      if (!game) {
        socket.emit('error', { message: 'Game not found' })
        return
      }

      const player = players.get(socket.id)
      if (!player || !player.isHost) {
        socket.emit('error', { message: 'Only host can start the game' })
        return
      }

      if (!solo && game.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players to start' })
        return
      }

      const questions = getRandomQuestions(settings)
      game.questions = questions
      game.currentQuestionIndex = 0
      game.currentQuestion = questions[0]
      game.gameStatus = 'question'
      game.questionStartTime = Date.now()
      game.updatedAt = Date.now()

      console.log('🚀 Game started:', gameCode)
      console.log('📝 Loaded questions:', questions.length)
      console.log('🎯 First question:', game.currentQuestion.question, '(Type:', game.currentQuestion.type + ')')

      game.gameStatus = 'starting'
      io.to(gameCode).emit('game-starting', { gameState: game, countdown: 4 })

      // 4-second countdown before first question
      await new Promise(resolve => setTimeout(resolve, 4000))

      game.gameStatus = 'question'
      game.questionStartTime = Date.now()
      game.updatedAt = Date.now()

      io.to(gameCode).emit('question-start', {
        question: game.currentQuestion,
        questionIndex: 0,
        totalQuestions: questions.length,
        timeLimit: getTimeLimit(game.currentQuestion)
      })
    } catch (error) {
      console.error('Error starting game:', error)
      socket.emit('error', { message: 'Failed to start game' })
    }
  })

  // Player submits an answer
  socket.on('submit-answer', (gameCode, answerText) => {
    console.log('📝 Answer received:', { gameCode, answer: answerText, playerId: socket.id })
    try {
      const game = games.get(gameCode)
      if (!game || game.gameStatus !== 'question') {
        console.log('⚠️ Game not in question state, ignoring answer submission')
        return
      }

      const player = players.get(socket.id)
      if (!player) {
        socket.emit('error', { message: 'Player not found' })
        return
      }

      if (game.answers[socket.id] && game.answers[socket.id][game.currentQuestionIndex] !== undefined) {
        console.log('⚠️ Player already answered this question')
        return
      }

      const currentQuestion = game.currentQuestion
      if (!currentQuestion) {
        socket.emit('error', { message: 'No current question' })
        return
      }

      if (!game.answers[socket.id]) {
        game.answers[socket.id] = {}
      }

      const answerTime = Date.now() - game.questionStartTime
      let isCorrect, partial = false
      if (currentQuestion.type === 'music_guess') {
        const result = validateMusicGuessAnswer(currentQuestion, answerText)
        isCorrect = result.isCorrect
        partial = result.partial
      } else {
        isCorrect = validateAnswer(currentQuestion, answerText)
      }

      game.answers[socket.id][game.currentQuestionIndex] = {
        answer: answerText,
        time: answerTime,
        isCorrect: isCorrect,
        partial: partial,
      }

      // Track speed_buzz correct-answer order for rank-based scoring
      if (currentQuestion.type === 'speed_buzz' && isCorrect) {
        if (!game.speedBuzzRanks) game.speedBuzzRanks = {}
        if (!game.speedBuzzRanks[game.currentQuestionIndex]) game.speedBuzzRanks[game.currentQuestionIndex] = []
        game.speedBuzzRanks[game.currentQuestionIndex].push(socket.id)
        const rank = game.speedBuzzRanks[game.currentQuestionIndex].length
        console.log(`⚡ Speed Buzz: ${game.players.find(p=>p.id===socket.id)?.name} answered correctly — rank #${rank}`)
        // Tell this player their rank immediately
        socket.emit('speed-buzz-rank', { rank, questionIndex: game.currentQuestionIndex })
      }

      const playerObj = game.players.find(p => p.id === socket.id)
      console.log('📝 Answer submitted:', playerObj?.name, 'answered:', answerText, 'Correct:', isCorrect, 'Question type:', currentQuestion.type)

      const answeredPlayerIds = Object.keys(game.answers).filter(playerId => 
        game.answers[playerId] && game.answers[playerId][game.currentQuestionIndex]
      )
      
      io.to(gameCode).emit('answer-status-updated', {
        answeredPlayers: answeredPlayerIds,
        totalPlayers: game.players.length
      })

      const answeredPlayersCount = game.players.filter(player => 
        game.answers[player.id] && 
        game.answers[player.id][game.currentQuestionIndex] !== undefined
      ).length

      console.log(`📊 Progress: ${answeredPlayersCount}/${game.players.length} players answered`)

      // Check if any answers were auto-submitted by time-up handler
      const hasAutoSubmittedAnswers = game.players.some(player => {
        const answer = game.answers[player.id]?.[game.currentQuestionIndex]
        return answer && answer.wasTimeUp
      })

      if (answeredPlayersCount === game.players.length && !hasAutoSubmittedAnswers) {
        const snapIndex = game.currentQuestionIndex
        console.log('✅ All players answered naturally, moving to next question in 2 seconds...')
        setTimeout(() => {
          // Guard: only advance if we're still on the same question
          if (game.currentQuestionIndex === snapIndex && game.gameStatus === 'question') {
            moveToNextQuestion(gameCode)
          } else {
            console.log('⚠️ Question already advanced by time-up, skipping duplicate moveToNextQuestion')
          }
        }, 2000)
      } else if (answeredPlayersCount === game.players.length && hasAutoSubmittedAnswers) {
        console.log('⚠️ All players answered but some were auto-submitted, letting time-up handler manage advancement')
      }
    } catch (error) {
      console.error('Error submitting answer:', error)
      socket.emit('error', { message: 'Failed to submit answer' })
    }
  })

  // Handle time-up for questions
  socket.on('time-up', ({ gameCode, questionIndex: clientQuestionIndex } = {}) => {
    try {
      const game = games.get(gameCode)
      if (!game || game.gameStatus !== 'question') {
        console.log('⚠️ Time-up ignored - game not in question state')
        return
      }

      const currentQuestionIndex = game.currentQuestionIndex

      // Reject stale time-up events from clients that are behind
      if (clientQuestionIndex !== undefined && clientQuestionIndex !== currentQuestionIndex) {
        console.log(`⚠️ Time-up ignored - client sent Q${clientQuestionIndex + 1} but server is on Q${currentQuestionIndex + 1}`)
        return
      }

      // Improved duplicate prevention with timestamp
      const now = Date.now()
      if (game.lastProcessedTimeUpQuestion === currentQuestionIndex &&
          game.lastTimeUpTimestamp &&
          (now - game.lastTimeUpTimestamp) < 2000) {
        console.log('⚠️ Already processed time-up for question', currentQuestionIndex + 1, 'within 2 seconds')
        return
      }

      game.lastProcessedTimeUpQuestion = currentQuestionIndex
      game.lastTimeUpTimestamp = now
      console.log('⏰ Processing time-up for question:', currentQuestionIndex + 1)
  
      // Auto-submit proper "no answer" entries for players who didn't answer
      game.players.forEach(player => {
        if (!game.answers[player.id] || game.answers[player.id][currentQuestionIndex] === undefined) {
          if (!game.answers[player.id]) {
            game.answers[player.id] = {}
          }
          
          // ✅ FIX: Create proper "no answer" entry instead of empty/random
          let noAnswerEntry = {
            answer: "NO_ANSWER", // Clear indicator that no answer was submitted
            time: getTimeLimit(game.currentQuestion) * 1000, // Full time used
            isCorrect: false, // Always wrong
            wasTimeUp: true // Flag to indicate this was auto-submitted
          }
          
          game.answers[player.id][currentQuestionIndex] = noAnswerEntry
          console.log('⏰ Auto-submitted NO_ANSWER for:', player.name, 'type:', game.currentQuestion.type)
        }
      })
  
      setTimeout(() => {
        if (game.currentQuestionIndex === currentQuestionIndex && game.gameStatus === 'question') {
          console.log('✅ Moving to next question after time-up verification')
          moveToNextQuestion(gameCode)
        } else {
          console.log('⚠️ Question already advanced, skipping duplicate moveToNextQuestion')
        }
      }, 1000)
    } catch (error) {
      console.error('Error handling time-up:', error)
    }
  })

  // Handle manual next question from host
  socket.on('next-question', (gameCode) => {
    try {
      const game = games.get(gameCode)
      if (!game) {
        socket.emit('error', { message: 'Game not found' })
        return
      }

      const player = players.get(socket.id)
      if (!player || !player.isHost) {
        socket.emit('error', { message: 'Only host can manually advance questions' })
        return
      }

      if (game.gameStatus !== 'question') {
        socket.emit('error', { message: 'Game not in question state' })
        return
      }

      console.log('⏭️ Host manually advancing to next question')
      moveToNextQuestion(gameCode)
    } catch (error) {
      console.error('Error handling manual next question:', error)
      socket.emit('error', { message: 'Failed to advance question' })
    }
  })

  // Handle next question reveal (for reveal phase)
  socket.on('next-question-reveal', (gameCode) => {
    try {
      const game = games.get(gameCode)
      if (!game) {
        socket.emit('error', { message: 'Game not found' })
        return
      }

      const player = players.get(socket.id)
      if (!player || !player.isHost) {
        socket.emit('error', { message: 'Only host can control reveals' })
        return
      }

      if (game.gameStatus !== 'reveal_phase') {
        socket.emit('error', { message: 'Game not in reveal phase' })
        return
      }

      // Initialize reveal state if not exists
      if (!game.currentRevealIndex) game.currentRevealIndex = 0

      // Move to next question in reveal phase
      if (game.currentRevealIndex < game.questions.length - 1) {
        game.currentRevealIndex++
        console.log(`🎭 Host advancing to reveal question ${game.currentRevealIndex + 1}`)
        
        // Add processed text fields to the game state for reveals
        const processedGameState = { ...game }
        if (processedGameState.answers) {
          processedGameState.answers = {}
          game.players.forEach(player => {
            processedGameState.answers[player.id] = {}
            game.questions.forEach((question, index) => {
              const answerData = game.answers[player.id]?.[index]
              if (answerData) {
                processedGameState.answers[player.id][index] = {
                  ...answerData,
                  playerAnswerText: getAnswerDisplayText(question, answerData.answer),
                  correctAnswerText: getCorrectAnswerDisplayText(question)
                }
              }
            })
          })
        }
        
        // Broadcast the reveal state update to all players
        io.to(gameCode).emit('reveal-state-updated', {
          currentRevealIndex: game.currentRevealIndex,
          gameState: processedGameState
        })
      } else {
        // Move to final results
        console.log('🏁 Moving to final results')
        game.gameStatus = 'final_results'
        
        // Apply all stored question scores to players with participation ratio bonus
        if (game.questionScores) {
          game.players.forEach(player => {
            player.score = 0 // Reset score
            for (let questionIndex = 0; questionIndex < game.questions.length; questionIndex++) {
              const questionScore = game.questionScores[questionIndex]?.[player.id] || 0
              
              // The scores already include participation bonus from moveToNextQuestion
              player.score += questionScore
            }
            console.log(`📊 Final score for ${player.name}: ${player.score} pts`)
          })
        }

        // Generate final results
        const detailedResults = game.players.map(player => {
          const questionResults = game.questions.map((question, index) => {
            const answerData = game.answers[player.id]?.[index]
            if (answerData) {
              // Use the already-calculated score with participation bonus
              const finalScore = game.questionScores?.[index]?.[player.id] || 0
              
              return {
                questionIndex: index,
                question: question.question,
                playerAnswer: answerData.answer,
                playerAnswerText: getAnswerDisplayText(question, answerData.answer),
                correctAnswer: question.correctAnswer,
                correctAnswerText: getCorrectAnswerDisplayText(question),
                isCorrect: answerData.isCorrect,
                time: answerData.time,
                score: finalScore
              }
            }
            return null
          }).filter(Boolean)
          
          const totalTime = questionResults.reduce((sum, result) => sum + result.time, 0)
          
          return {
            playerId: player.id,
            playerName: player.name,
            score: player.score,
            totalTime,
            questionResults
          }
        })
        
        detailedResults.sort((a, b) => {
          if (a.score !== b.score) {
            return b.score - a.score
          }
          return a.totalTime - b.totalTime
        })
        
        game.finalResults = detailedResults
        
        console.log('🏁 Game finished:', gameCode)
        console.log('📊 Final results:', detailedResults.map(r => 
          `${r.playerName}: ${r.score} pts (${(r.totalTime / 1000).toFixed(1)}s total)`
        ))
        
        io.to(gameCode).emit('game-finished', { gameState: game })
      }

    } catch (error) {
      console.error('Error handling next question reveal:', error)
      socket.emit('error', { message: 'Failed to advance reveal' })
    }
  })

  // Handle challenge submission during reveal phase
  socket.on('challenge-question', (gameCode, questionIndex, explanation) => {
    try {
      const game = games.get(gameCode)
      if (!game || game.gameStatus !== 'reveal_phase') {
        socket.emit('error', { message: 'Not in reveal phase' })
        return
      }

      const player = players.get(socket.id)
      if (!player) {
        socket.emit('error', { message: 'Player not found' })
        return
      }

      const playerObj = game.players.find(p => p.id === socket.id)
      if (!playerObj) {
        socket.emit('error', { message: 'Player not in game' })
        return
      }

      // Initialize challenge tracking if not exists
      if (!game.playerChallenges) {
        game.playerChallenges = {}
      }
      if (!game.playerChallenges[socket.id]) {
        game.playerChallenges[socket.id] = {
          challengesRemaining: 1, // One challenge per game
          hasChallenged: false
        }
      }

      // Check if player has already used their challenge
      if (game.playerChallenges[socket.id].hasChallenged) {
        socket.emit('error', { message: 'You have already used your challenge for this game' })
        return
      }

      // Check if player can challenge (didn't get it right)
      const playerAnswer = game.answers[socket.id]?.[questionIndex]
      if (!playerAnswer || playerAnswer.isCorrect) {
        socket.emit('error', { message: 'Cannot challenge correct answers' })
        return
      }

      console.log(`🏛️ Challenge submitted by ${playerObj.name} for Q${questionIndex + 1}: "${explanation}"`)

      // Mark that player has used their challenge
      game.playerChallenges[socket.id].hasChallenged = true
      game.playerChallenges[socket.id].challengesRemaining = 0

      // Calculate potential score (what they would get if challenge passes)
      // Uses the same base values as the main scoring system but no time bonus
      // (passing timeToAnswer = timeLimit gives timeRatio = 0, so timeBonus = 0)
      const currentQuestion = game.questions[questionIndex]
      const potentialScore = calculateScore(currentQuestion, true, getTimeLimit(currentQuestion) * 1000, getTimeLimit(currentQuestion))

      // Start voting phase for this challenge
      const challenge = {
        id: `${socket.id}_${questionIndex}_${Date.now()}`,
        challengerId: socket.id,
        challengerName: playerObj.name,
        questionIndex,
        question: game.questions[questionIndex],
        playerAnswer: playerAnswer.answer,
        explanation: explanation.trim(),
        potentialScore: potentialScore,
        submittedAt: Date.now()
      }

      // Store challenge in game state
      if (!game.challenges) game.challenges = []
      game.challenges.push(challenge)

      // Initialize voting
      const voters = game.players.filter(p => p.id !== socket.id)

      // No one left to vote (challenger is the only player) — auto-approve
      if (voters.length === 0) {
        console.log(`🏛️ Not enough voters (${voters.length}) — auto-approving challenge`)

        if (!game.questionScores) game.questionScores = {}
        if (!game.questionScores[questionIndex]) game.questionScores[questionIndex] = {}

        const ratioBonus = calculateParticipationRatioBonus(game, questionIndex)
        const bonusAmount = Math.floor(challenge.potentialScore * ratioBonus)
        const finalChallengeScore = challenge.potentialScore + bonusAmount

        game.questionScores[questionIndex][socket.id] = finalChallengeScore
        const challenger = game.players.find(p => p.id === socket.id)
        if (challenger) challenger.score += finalChallengeScore

        io.to(gameCode).emit('challenge-resolved', {
          challengeId: challenge.id,
          passed: true,
          votes: { approve: 0, reject: 0 },
          scoreAwarded: finalChallengeScore
        })
        io.to(gameCode).emit('game-state-updated', { gameState: game })
        return
      }

      const VOTE_TIMEOUT_MS = 20000
      io.to(gameCode).emit('challenge-voting', {
        challenge,
        voters: voters.map(p => ({ id: p.id, name: p.name })),
        votingTime: VOTE_TIMEOUT_MS / 1000
      })

      // Server-side timeout: auto-reject if not all votes arrive in time
      setTimeout(() => {
        const votes = game.challengeVotes?.[challenge.id]
        if (!votes) return // Already resolved
        const totalVotes = (votes.approve?.length || 0) + (votes.reject?.length || 0)
        const totalVoters = game.players.length - 1
        if (totalVotes < totalVoters) {
          console.log(`⏰ Vote timeout for challenge ${challenge.id} — auto-rejecting (${totalVotes}/${totalVoters} votes received)`)
          // Mark as resolved by deleting the votes entry
          delete game.challengeVotes[challenge.id]
          io.to(gameCode).emit('challenge-resolved', {
            challengeId: challenge.id,
            passed: false,
            votes: { approve: votes.approve?.length || 0, reject: votes.reject?.length || 0 },
            scoreAwarded: 0,
            timedOut: true
          })
        }
      }, VOTE_TIMEOUT_MS + 2000) // +2s grace period

    } catch (error) {
      console.error('Error handling challenge:', error)
      socket.emit('error', { message: 'Failed to process challenge' })
    }
  })

  // Handle challenge votes
  socket.on('vote-challenge', (gameCode, challengeId, vote) => {
    try {
      const game = games.get(gameCode)
      if (!game) {
        socket.emit('error', { message: 'Game not found' })
        return
      }

      const player = players.get(socket.id)
      if (!player) {
        socket.emit('error', { message: 'Player not found' })
        return
      }

      console.log(`🗳️ Vote received from ${game.players.find(p => p.id === socket.id)?.name}: ${vote}`)

      // Find the challenge to check if this player is the challenger
      const challenge = game.challenges?.find(c => c.id === challengeId)
      if (!challenge) {
        socket.emit('error', { message: 'Challenge not found' })
        return
      }

      // PREVENT CHALLENGER FROM VOTING ON THEIR OWN CHALLENGE
      if (challenge.challengerId === socket.id) {
        console.log(`❌ Challenger ${game.players.find(p => p.id === socket.id)?.name} attempted to vote on their own challenge - BLOCKED`)
        socket.emit('error', { message: 'You cannot vote on your own challenge' })
        return
      }

      // Initialize challenge votes if not exists
      if (!game.challengeVotes) game.challengeVotes = {}
      if (!game.challengeVotes[challengeId]) {
        game.challengeVotes[challengeId] = { approve: [], reject: [] }
      }

      // Remove any existing vote from this player
      game.challengeVotes[challengeId].approve = game.challengeVotes[challengeId].approve.filter(v => v !== socket.id)
      game.challengeVotes[challengeId].reject = game.challengeVotes[challengeId].reject.filter(v => v !== socket.id)

      // Add new vote
      game.challengeVotes[challengeId][vote].push(socket.id)

      // Check if voting is complete
      const totalVoters = game.players.length - 1 // Exclude challenger
      const totalVotes = game.challengeVotes[challengeId].approve.length + game.challengeVotes[challengeId].reject.length

      console.log(`🗳️ Voting progress: ${totalVotes}/${totalVoters} votes (excluding challenger)`)

      if (totalVotes >= totalVoters) {
        // Voting complete - resolve challenge
        const approveVotes = game.challengeVotes[challengeId].approve.length
        const rejectVotes = game.challengeVotes[challengeId].reject.length
        const challengePassed = approveVotes > rejectVotes

        // Clear votes so the server-side timeout doesn't re-resolve
        delete game.challengeVotes[challengeId]

        console.log(`🏛️ Challenge voting complete: ${approveVotes} approve, ${rejectVotes} reject - ${challengePassed ? 'PASSED' : 'REJECTED'}`)

        // Find the challenge object to get the correct data
        const challenge = game.challenges?.find(c => c.id === challengeId)
        
        // Update the challenge object with the result
        if (challenge) {
          challenge.passed = challengePassed
          challenge.voteResults = { approve: approveVotes, reject: rejectVotes }
        }
        
        // Apply challenge result if passed
        if (challengePassed && challenge) {
          const challengerId = challenge.challengerId
          const questionIndex = challenge.questionIndex
          
          // Update the player's score for this question
          if (!game.questionScores) game.questionScores = {}
          if (!game.questionScores[questionIndex]) game.questionScores[questionIndex] = {}
          
          // Award the potential score to the challenger (WITHOUT time bonus)
          const baseScore = challenge.potentialScore
          
          // Apply participation ratio bonus to challenge score
          const ratioBonus = calculateParticipationRatioBonus(game, questionIndex)
          const bonusAmount = Math.floor(baseScore * ratioBonus)
          const finalChallengeScore = baseScore + bonusAmount
          
          game.questionScores[questionIndex][challengerId] = finalChallengeScore
          console.log(`🏛️ Challenge PASSED: ${challengerId} awarded ${finalChallengeScore} points (${baseScore} + ${bonusAmount} bonus)`)
          console.log(`📊 Updated question scores for Q${questionIndex}:`, game.questionScores[questionIndex])
          
          // Also update the player's total score
          const player = game.players.find(p => p.id === challengerId)
          if (player) {
            player.score += finalChallengeScore
            console.log(`📊 Updated total score for ${player.name}: ${player.score}`)
          }
        } else if (challengePassed) {
          console.error(`❌ Challenge not found for ID: ${challengeId}`)
        }

        // Get the score awarded to the challenger if challenge passed
        let scoreAwarded = 0
        if (challengePassed && challenge) {
          const challenger = game.players.find(p => p.id === challenge.challengerId)
          if (challenger) {
            // Find the score for this question
            const questionScore = game.questionScores?.[challenge.questionIndex]?.[challenge.challengerId]
            if (questionScore) {
              scoreAwarded = questionScore
            }
          }
        }

        io.to(gameCode).emit('challenge-resolved', {
          challengeId,
          passed: challengePassed,
          votes: { approve: approveVotes, reject: rejectVotes },
          scoreAwarded
        })

        // Send updated game state to all players
        io.to(gameCode).emit('game-state-updated', { gameState: game })
        console.log(`📊 Sending updated game state to ${game.players.length} players`)
        console.log(`📊 Game status: ${game.gameStatus}`)
        console.log(`📊 Players in game:`, game.players.map(p => ({ id: p.id, name: p.name })))
        
        // If game is in final_results status, recalculate final results after challenge
        if (game.gameStatus === 'final_results' && game.finalResults) {
          const detailedResults = game.players.map(player => {
            const questionResults = game.questions.map((question, index) => {
              const answerData = game.answers[player.id]?.[index]
              if (answerData) {
                return {
                  questionIndex: index,
                  question: question.question,
                  playerAnswer: answerData.answer,
                  playerAnswerText: getAnswerDisplayText(question, answerData.answer),
                  correctAnswer: question.correctAnswer,
                  correctAnswerText: getCorrectAnswerDisplayText(question),
                  isCorrect: answerData.isCorrect,
                  time: answerData.time,
                  score: game.questionScores?.[index]?.[player.id] || 0
                }
              }
              return null
            }).filter(Boolean)
            
            const totalTime = questionResults.reduce((sum, result) => sum + result.time, 0)
            
            return {
              playerId: player.id,
              playerName: player.name,
              score: player.score,
              totalTime,
              questionResults
            }
          })
          
          detailedResults.sort((a, b) => {
            if (a.score !== b.score) {
              return b.score - a.score
            }
            return a.totalTime - b.totalTime
          })
          
          game.finalResults = detailedResults
          console.log('📊 Updated final results after challenge:', detailedResults.map(r => 
            `${r.playerName}: ${r.score} pts (${(r.totalTime / 1000).toFixed(1)}s total)`
          ))
          
          // Send updated final results
          io.to(gameCode).emit('game-finished', { gameState: game })
        }

      }

    } catch (error) {
      console.error('Error handling vote:', error)
      socket.emit('error', { message: 'Failed to process vote' })
    }
  })
  // Add this socket handler for player ready events
socket.on('player-ready', (data) => {
  try {
    const { gameCode, questionIndex, playerId } = data
    const game = games.get(gameCode)
    
    if (!game) {
      console.log('❌ Game not found for ready event:', gameCode)
      return
    }

    // Initialize ready players structure
    if (!game.readyPlayers) game.readyPlayers = {}
    if (!game.readyPlayers[questionIndex]) game.readyPlayers[questionIndex] = []
    
    // Add player to ready list if not already there
    if (!game.readyPlayers[questionIndex].includes(playerId)) {
      game.readyPlayers[questionIndex].push(playerId)
      console.log(`✅ Player ready: ${playerId} for question ${questionIndex}`)
      console.log(`📊 Ready players for Q${questionIndex}:`, game.readyPlayers[questionIndex])
      
      // Broadcast updated ready status to all players in the game
      const eventData = {
        questionIndex,
        readyPlayers: game.readyPlayers[questionIndex]
      }
      console.log(`📡 Sending ready-status-updated event to room ${gameCode}:`, eventData)
      console.log(`📡 Players in game:`, game.players.map(p => ({ id: p.id, name: p.name })))
      
      // Add a small delay to ensure clients are ready
      setTimeout(() => {
        io.to(gameCode).emit('ready-status-updated', eventData)
        console.log(`📡 Sent ready-status-updated event to ${game.players.length} players for question ${questionIndex}`)
      }, 100)
    } else {
      console.log(`⚠️ Player ${playerId} already marked ready for question ${questionIndex}`)
    }
  } catch (error) {
    console.error('Error handling player ready:', error)
  }
})
  // Move to next reveal or final results
  socket.on('next-reveal', (gameCode) => {
    try {
      const game = games.get(gameCode)
      if (!game) {
        socket.emit('error', { message: 'Game not found' })
        return
      }

      const player = players.get(socket.id)
      if (!player || !player.isHost) {
        socket.emit('error', { message: 'Only host can control reveals' })
        return
      }

      if (game.gameStatus === 'reveal_phase') {
        // Move to next question in reveal phase
        if (!game.currentRevealIndex) game.currentRevealIndex = 0
        
        if (game.currentRevealIndex < game.questions.length - 1) {
          // Move to next question in reveal phase
          game.currentRevealIndex++
          console.log(`🎭 Host advancing to reveal question ${game.currentRevealIndex + 1}`)
          
          // Add processed text fields to the game state for reveals
          const processedGameState = { ...game }
          if (processedGameState.answers) {
            processedGameState.answers = {}
            game.players.forEach(player => {
              processedGameState.answers[player.id] = {}
              game.questions.forEach((question, index) => {
                const answerData = game.answers[player.id]?.[index]
                if (answerData) {
                  processedGameState.answers[player.id][index] = {
                    ...answerData,
                    playerAnswerText: getAnswerDisplayText(question, answerData.answer),
                    correctAnswerText: getCorrectAnswerDisplayText(question)
                  }
                }
              })
            })
          }
          
          // Broadcast the reveal state update to all players
          io.to(gameCode).emit('reveal-state-updated', {
            currentRevealIndex: game.currentRevealIndex,
            gameState: processedGameState
          })
        } else {
          // Move to final results - calculate all scores
          game.gameStatus = 'final_results'
          
          // Apply all stored question scores to players
          if (game.questionScores) {
            game.players.forEach(player => {
              player.score = 0 // Reset score
              for (let questionIndex = 0; questionIndex < game.questions.length; questionIndex++) {
                const questionScore = game.questionScores[questionIndex]?.[player.id] || 0
                player.score += questionScore
              }
              console.log(`📊 Final score for ${player.name}: ${player.score} pts`)
            })
          }

          // Generate final results
          const detailedResults = game.players.map(player => {
            const questionResults = game.questions.map((question, index) => {
              const answerData = game.answers[player.id]?.[index]
              if (answerData) {
                return {
                  questionIndex: index,
                  question: question.question,
                  playerAnswer: answerData.answer,
                  playerAnswerText: getAnswerDisplayText(question, answerData.answer),
                  correctAnswer: question.correctAnswer,
                  correctAnswerText: getCorrectAnswerDisplayText(question),
                  isCorrect: answerData.isCorrect,
                  time: answerData.time,
                  score: game.questionScores?.[index]?.[player.id] || 0
                }
              }
              return null
            }).filter(Boolean)
            
            const totalTime = questionResults.reduce((sum, result) => sum + result.time, 0)
            
            return {
              playerId: player.id,
              playerName: player.name,
              score: player.score,
              totalTime,
              questionResults
            }
          })
          
          detailedResults.sort((a, b) => {
            if (a.score !== b.score) {
              return b.score - a.score
            }
            return a.totalTime - b.totalTime
          })
          
          game.finalResults = detailedResults
          
          console.log('🏁 Game finished:', gameCode)
          console.log('📊 Final results:', detailedResults.map(r => 
            `${r.playerName}: ${r.score} pts (${(r.totalTime / 1000).toFixed(1)}s total)`
          ))
          
          io.to(gameCode).emit('game-finished', { gameState: game })
        }
      }

    } catch (error) {
      console.error('Error moving to next reveal:', error)
      socket.emit('error', { message: 'Failed to move to next reveal' })
    }
  })

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('❌ Player disconnected:', socket.id)

    const player = players.get(socket.id)
    if (player) {
      const game = games.get(player.gameCode)
      if (game) {
        const playerIndex = game.players.findIndex(p => p.id === socket.id)
        if (playerIndex !== -1) {
          const playerObj = game.players[playerIndex]
          // Mark as disconnected but keep in game for 30s grace period (handles mobile background/refresh)
          playerObj.disconnectedAt = Date.now()
          playerObj.disconnectedSocketId = socket.id
          game.updatedAt = Date.now()

          console.log('👋 Player temporarily disconnected:', playerObj.name, '— grace period started')
          io.to(player.gameCode).emit('player-left', { playerId: socket.id, gameState: game })

          // Delayed removal — gives host/players time to rejoin on mobile
          setTimeout(() => {
            const currentGame = games.get(player.gameCode)
            if (!currentGame) return
            const idx = currentGame.players.findIndex(p => p.disconnectedSocketId === socket.id && p.disconnectedAt)
            if (idx === -1) return // Player already rejoined (socket ID updated)
            currentGame.players.splice(idx, 1)
            currentGame.updatedAt = Date.now()
            console.log('🗑️ Removed disconnected player after grace period:', playerObj.name)
            if (currentGame.players.length === 0) {
              games.delete(player.gameCode)
              console.log('🗑️ Game deleted due to no players:', player.gameCode)
            }
          }, 30000)
        }
      }
      players.delete(socket.id)
    }
  })
})

// Helper function to move to next question
async function moveToNextQuestion(gameCode) {
  const game = games.get(gameCode)
  if (!game) return
  console.log('🔍 moveToNextQuestion called:')
  console.log('  - Current question index:', game.currentQuestionIndex)
  console.log('  - Game status:', game.gameStatus)
  console.log('  - Total questions:', game.questions.length)
  console.log('  - Call stack:', new Error().stack.split('\n')[1])

  // Prevent duplicate processing with a flag
  if (game.isProcessingNextQuestion) {
    console.log('⚠️ Already processing next question, skipping duplicate call')
    return
  }
  
  game.isProcessingNextQuestion = true

  console.log(`🔄 Moving from question ${game.currentQuestionIndex + 1} to ${game.currentQuestionIndex + 2}`)

  // Calculate scores for the current question but DON'T update player scores yet
  const currentQuestion = game.currentQuestion
  let questionScores = {}

  // For closest_wins: resolve winner(s) before scoring
  if (currentQuestion && currentQuestion.type === 'closest_wins') {
    const entries = game.players
      .map(player => {
        const answerData = game.answers[player.id]?.[game.currentQuestionIndex]
        if (!answerData || answerData.wasTimeUp) return null
        const num = parseFloat(answerData.answer)
        if (isNaN(num)) return null
        return { playerId: player.id, value: num, diff: Math.abs(num - currentQuestion.correctAnswer) }
      })
      .filter(Boolean)

    if (entries.length > 0) {
      const minDiff = Math.min(...entries.map(e => e.diff))
      entries.forEach(e => {
        if (e.diff === minDiff) {
          game.answers[e.playerId][game.currentQuestionIndex].isCorrect = true
          console.log(`🎯 Closest wins: ${e.playerId} guessed ${e.value} (diff: ${e.diff}) — WINNER`)
        }
      })
    }
  }

  if (currentQuestion) {
    // Pre-compute speed_buzz rank multipliers
    const SPEED_BUZZ_RANK_MULTIPLIERS = [1.0, 0.75, 0.5, 0.25]
    const speedBuzzRanks = game.speedBuzzRanks?.[game.currentQuestionIndex] || []

    // For letter_game: run AI validation once for all players before scoring
    let aiValidation = null
    if (currentQuestion.type === 'letter_game') {
      const playerAnswerMap = {}
      game.players.forEach(player => {
        const answerData = game.answers[player.id]?.[game.currentQuestionIndex]
        if (answerData && !answerData.wasTimeUp) {
          playerAnswerMap[player.id] = answerData.answer
        }
      })
      if (Object.keys(playerAnswerMap).length > 0) {
        aiValidation = await validateLetterGameWithAI(currentQuestion, playerAnswerMap)
      }
    }

    game.players.forEach(player => {
      const playerAnswerData = game.answers[player.id]?.[game.currentQuestionIndex]
      if (playerAnswerData) {
        let baseScore

        if (currentQuestion.type === 'speed_buzz') {
          // Rank-based scoring: max score × rank multiplier
          const maxScore = getMaxScore(currentQuestion)
          const rank = speedBuzzRanks.indexOf(player.id) // -1 if wrong
          const rankMultiplier = rank >= 0 ? (SPEED_BUZZ_RANK_MULTIPLIERS[rank] ?? 0.25) : 0
          baseScore = Math.round(maxScore * rankMultiplier)
          console.log(`⚡ Speed Buzz ${player.name}: rank #${rank + 1}, maxScore=${maxScore}, multiplier=${rankMultiplier}, score=${baseScore}`)
        } else if (currentQuestion.type === 'letter_game') {
          // Ratio-based scoring: (validAnswers / totalCategories) × maxScore
          const maxScore = getMaxScore(currentQuestion)
          let validCount

          if (aiValidation && aiValidation[player.id]) {
            // AI-validated: count categories marked true
            validCount = Object.values(aiValidation[player.id]).filter(Boolean).length
            // Store validation detail on the answer for the reveal phase
            playerAnswerData.letterGameValidation = aiValidation[player.id]
          } else {
            // Fallback: count words starting with the correct letter
            validCount = countLetterGameValid(currentQuestion, playerAnswerData.answer)
          }

          const ratio = validCount / currentQuestion.categories.length
          baseScore = Math.round(maxScore * ratio)
          // isCorrect = true if at least one valid answer
          playerAnswerData.isCorrect = validCount > 0
          console.log(`🔤 Letter Game ${player.name}: ${validCount}/${currentQuestion.categories.length} valid (${(ratio * 100).toFixed(0)}%), score=${baseScore}`)
        } else {
          // Calculate score using the proper scoring system
          const creditMultiplier = playerAnswerData.partial ? 0.5 : 1.0
          baseScore = calculateScore(
            currentQuestion,
            playerAnswerData.isCorrect,
            playerAnswerData.time,
            getTimeLimit(currentQuestion),
            creditMultiplier
          )
        }
        
        // Speed buzz and letter_game use their own scoring — skip participation ratio bonus
        let bonusAmount = 0
        let finalScore = baseScore

        if (currentQuestion.type !== 'speed_buzz' && currentQuestion.type !== 'letter_game') {
          // Calculate participation ratio bonus
          const totalPlayers = game.players.length
          const correctAnswers = game.players.filter(p => {
            const answerData = game.answers[p.id]?.[game.currentQuestionIndex]
            return answerData && answerData.isCorrect
          }).length

          const participationRatio = correctAnswers / totalPlayers
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
          bonusAmount = Math.floor(baseScore * ratioBonus)
          finalScore = baseScore + bonusAmount
        }
        
        // Store both base score and final score (with participation bonus)
        if (!game.questionScores) game.questionScores = {}
        if (!game.questionScores[game.currentQuestionIndex]) game.questionScores[game.currentQuestionIndex] = {}
        game.questionScores[game.currentQuestionIndex][player.id] = finalScore
        
        // Store base scores separately for reference
        if (!game.baseScores) game.baseScores = {}
        if (!game.baseScores[game.currentQuestionIndex]) game.baseScores[game.currentQuestionIndex] = {}
        game.baseScores[game.currentQuestionIndex][player.id] = baseScore
        
        console.log(`📊 ${player.name}: ${playerAnswerData.isCorrect ? '✅' : '❌'} (${baseScore} + ${bonusAmount} = ${finalScore} pts) in ${(playerAnswerData.time / 1000).toFixed(1)}s - ${currentQuestion.difficulty}/${currentQuestion.type}`)
      }
    })
  }
  // Update each player's cumulative score so clients see live scores
  const completedIndex = game.currentQuestionIndex
  game.players.forEach(player => {
    const earned = game.questionScores[completedIndex]?.[player.id] || 0
    player.score = (player.score || 0) + earned
  })

  // Build leaderboard for the between-question screen
  const leaderboard = [...game.players]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map((player, i) => ({
      playerId: player.id,
      playerName: player.name,
      earned: game.questionScores[completedIndex]?.[player.id] || 0,
      total: player.score || 0,
      isCorrect: game.answers[player.id]?.[completedIndex]?.isCorrect || false,
      rank: i + 1,
    }))

  const completedQuestion = game.questions[completedIndex]
  io.to(gameCode).emit('question-scores', {
    questionIndex: completedIndex,
    correctAnswerText: getCorrectAnswerDisplayText(completedQuestion),
    leaderboard,
  })

  game.currentQuestionIndex++

  if (game.currentQuestionIndex >= game.questions.length) {
    // All questions answered - move to reveal phase
    game.gameStatus = 'reveal_phase'
    game.currentRevealIndex = 0 // Initialize reveal index
    game.readyPlayers = {} // Initialize ready players structure
    for (let i = 0; i < game.questions.length; i++) {
      game.readyPlayers[i] = [game.hostId] // Host is ready by default for all questions
    }
    game.updatedAt = Date.now()
    game.isProcessingNextQuestion = false // Reset flag
    
    console.log('🏁 Game finished - entering reveal phase')
    
    const detailedResults = game.players.map(player => {
      const questionResults = game.questions.map((question, index) => {
        const answerData = game.answers[player.id]?.[index]
        if (answerData) {
          // Use the already-calculated score with participation bonus
          const finalScore = game.questionScores?.[index]?.[player.id] || 0
          
          return {
            questionIndex: index,
            question: question.question,
            playerAnswer: answerData.answer,
            playerAnswerText: getAnswerDisplayText(question, answerData.answer),
            correctAnswer: question.correctAnswer,
            correctAnswerText: getCorrectAnswerDisplayText(question),
            isCorrect: answerData.isCorrect,
            time: answerData.time,
            score: finalScore
          }
        }
        return null
      }).filter(Boolean)
      
      const totalTime = questionResults.reduce((sum, result) => sum + result.time, 0)
      
      return {
        playerId: player.id,
        playerName: player.name,
        score: player.score,
        totalTime,
        questionResults
      }
    })
    
    detailedResults.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score
      }
      return a.totalTime - b.totalTime
    })
    
    game.finalResults = detailedResults

    console.log('🏁 Game finished:', gameCode)
    console.log('📊 Final results:', detailedResults.map(r =>
      `${r.playerName}: ${r.score} pts (${(r.totalTime / 1000).toFixed(1)}s total)`
    ))

    // Pause so players see the final between-question leaderboard before the end screen
    await new Promise(resolve => setTimeout(resolve, 4500))
    if (!games.get(gameCode)) return

    io.to(gameCode).emit('game-finished', { gameState: game })
  } else {
    // Pause for the between-question leaderboard screen (4.5s), then start next question
    await new Promise(resolve => setTimeout(resolve, 4500))

    // Guard: game might have been cancelled during the delay
    if (!games.get(gameCode)) return

    game.currentQuestion = game.questions[game.currentQuestionIndex]
    game.gameStatus = 'question'
    game.questionStartTime = Date.now()
    game.updatedAt = Date.now()
    game.isProcessingNextQuestion = false

    console.log(`🎯 Question ${game.currentQuestionIndex + 1}/${game.questions.length}:`, game.currentQuestion.question, '(Type:', game.currentQuestion.type + ')')

    io.to(gameCode).emit('question-start', {
      question: game.currentQuestion,
      questionIndex: game.currentQuestionIndex,
      totalQuestions: game.questions.length,
      timeLimit: getTimeLimit(game.currentQuestion)
    })

    io.to(gameCode).emit('answer-status-updated', {
      answeredPlayers: [],
      totalPlayers: game.players.length
    })

    io.to(gameCode).emit('game-state-updated', { gameState: game })
  }
}

// Deezer preview proxy (avoids CORS issues from browser)
app.get('/api/deezer-preview', async (req, res) => {
  const q = req.query.q
  if (!q) return res.status(400).json({ error: 'Missing query' })
  try {
    const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`)
    const data = await response.json()
    const preview = data.data?.[0]?.preview
    if (preview) {
      res.json({ previewUrl: preview })
    } else {
      res.status(404).json({ error: 'No preview found' })
    }
  } catch (err) {
    res.status(500).json({ error: 'Deezer API error' })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeGames: games.size,
    activePlayers: players.size
  })
})

const PORT = process.env.PORT || 3003

server.listen(PORT, () => {
  console.log(`🎮 Game server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
})