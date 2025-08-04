// server.js - Socket.io Game Server with Hybrid Question Support
const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const { calculateScore, getMaxScore } = require('./scoring')
const cors = require('cors')

// Sample questions for the game - Mixed types with enhanced text matching
const sampleQuestions = [
  {
    id: '1',
    type: 'multiple_choice',
    question: 'Which streaming platform is known for its purple branding?',
    options: ['YouTube', 'Twitch', 'TikTok', 'Instagram'],
    correctAnswer: 1,
    timeLimit: 15,
    category: 'streaming',
    difficulty: 'easy',
    explanation: 'Twitch uses purple as its primary brand color and is the leading live streaming platform for gaming.'
  },
  {
    id: '2',
    type: 'true_false',
    question: 'TikTok was originally called Musical.ly',
    options: ['True', 'False'],
    correctAnswer: 0,
    timeLimit: 10,
    category: 'pop_culture',
    difficulty: 'easy',
    explanation: 'Musical.ly was acquired by ByteDance and rebranded as TikTok in 2018.'
  },
  {
    id: '3',
    type: 'ranking',
    question: 'Rank the Lord of the Rings trilogy movies in chronological order (earliest to latest):',
    items: ['The Fellowship of the Ring', 'The Two Towers', 'The Return of the King'],
    correctOrder: [0, 1, 2], // Fellowship -> Two Towers -> Return of the King
    timeLimit: 20,
    category: 'movies',
    difficulty: 'easy',
    explanation: 'The Fellowship of the Ring (2001) → The Two Towers (2002) → The Return of the King (2003)',
    allowPartialCredit: true
  },
  {
    id: '4',
    type: 'free_text',
    question: 'What is the capital city of France?',
    correctAnswer: 'Paris',
    acceptableAnswers: ['paris', 'city of paris', 'paris france'],
    caseSensitive: false,
    exactMatch: true, // Only exact matches (after normalization)
    timeLimit: 12,
    category: 'geography',
    difficulty: 'easy',
    explanation: 'Paris has been the capital of France since 987 AD.'
  }
]

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

// Helper function to validate answers based on question type
function validateAnswer(question, playerAnswer) {
  // Check if answer is empty or invalid
  if (!playerAnswer || playerAnswer.toString().trim() === '') {
    console.log('❌ Empty answer provided')
    return false
  }

  if (question.type === 'multiple_choice' || question.type === 'true_false') {
    // For multiple choice and true/false, compare numbers
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
  } else if (question.type === 'free_text' || question.type === 'image_guess') {
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
    
    // Check for partial matches in normalized text (MORE RESTRICTIVE)
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
      
      if (matchPercentage >= 0.7) { // At least 70% of words must match
        console.log(`✅ Partial match: ${matchedWords.length}/${correctWords.length} words (${(matchPercentage * 100).toFixed(1)}%)`)
        return true
      } else {
        console.log(`❌ Insufficient word match: ${matchedWords.length}/${correctWords.length} words (${(matchPercentage * 100).toFixed(1)}% < 70%)`)
      }
    } else {
      // Single word answers - check for similarity (MORE RESTRICTIVE)
      // Require at least 90% character similarity for single words (increased from 80%)
      const minLength = Math.min(normalizedUserAnswer.length, normalizedCorrectAnswer.length)
      const maxLength = Math.max(normalizedUserAnswer.length, normalizedCorrectAnswer.length)
      
      if (minLength === 0) {
        console.log('❌ Empty word after normalization')
        return false
      }
      
      // Calculate similarity using longest common subsequence
      const lcs = longestCommonSubsequence(normalizedUserAnswer, normalizedCorrectAnswer)
      const similarity = lcs.length / maxLength
      
      if (similarity >= 0.9 && minLength >= 3) { // Increased to 90% similarity and minimum 3 chars
        console.log(`✅ Single word similarity match: ${(similarity * 100).toFixed(1)}% (LCS: ${lcs.length}/${maxLength})`)
        return true
      } else {
        console.log(`❌ Insufficient similarity: ${(similarity * 100).toFixed(1)}% < 90% or too short`)
        return false
      }
    }
    
    // For strict matching, stop here
    if (question.exactMatch === true) {
      console.log('❌ Exact match required, no match found')
      return false
    }
    
    console.log('❌ No exact match found')
    return false
  }
  
  return false
}

// Helper function to get display text for answers
function getAnswerDisplayText(question, answer) {
  if (question.type === 'multiple_choice' || question.type === 'true_false') {
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
  } else {
    return typeof answer === 'string' ? answer : 'Invalid answer'
  }
}

// Helper function to get correct answer display text
function getCorrectAnswerDisplayText(question) {
  if (question.type === 'multiple_choice' || question.type === 'true_false') {
    return question.options && question.options[question.correctAnswer] ? question.options[question.correctAnswer] : 'Unknown'
  } else if (question.type === 'ranking') {
    // For ranking questions, show the correct order
    if (question.correctOrder && question.items) {
      return question.correctOrder.map(index => question.items[index]).join(' → ')
    }
    return 'Unknown ranking'
  } else {
    return question.correctAnswer
  }
}

// Helper function to get random questions
function getRandomQuestions(count = 5) {
  const shuffled = [...sampleQuestions].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, Math.min(count, sampleQuestions.length))
}

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
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
  socket.on('host-create-game', (gameCode) => {
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
        name: 'Host',
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
  socket.on('host-start-game', (gameCode) => {
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

      if (game.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players to start' })
        return
      }

      const questions = getRandomQuestions(5)
      game.questions = questions
      game.currentQuestionIndex = 0
      game.currentQuestion = questions[0]
      game.gameStatus = 'question'
      game.questionStartTime = Date.now()
      game.updatedAt = Date.now()

      console.log('🚀 Game started:', gameCode)
      console.log('📝 Loaded questions:', questions.length)
      console.log('🎯 First question:', game.currentQuestion.question, '(Type:', game.currentQuestion.type + ')')
      
      io.to(gameCode).emit('game-starting', { gameState: game })
      io.to(gameCode).emit('question-start', { 
        question: game.currentQuestion,
        questionIndex: 0,
        totalQuestions: questions.length,
        timeLimit: game.currentQuestion.timeLimit
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
      const isCorrect = validateAnswer(currentQuestion, answerText)

      game.answers[socket.id][game.currentQuestionIndex] = {
        answer: answerText,
        time: answerTime,
        isCorrect: isCorrect
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
        console.log('✅ All players answered naturally, moving to next question in 2 seconds...')
        setTimeout(() => {
          moveToNextQuestion(gameCode)
        }, 2000) // Increased delay to 2 seconds
      } else if (answeredPlayersCount === game.players.length && hasAutoSubmittedAnswers) {
        console.log('⚠️ All players answered but some were auto-submitted, letting time-up handler manage advancement')
      }
    } catch (error) {
      console.error('Error submitting answer:', error)
      socket.emit('error', { message: 'Failed to submit answer' })
    }
  })

  // Handle time-up for questions
  socket.on('time-up', (gameCode) => {
    try {
      const game = games.get(gameCode)
      if (!game || game.gameStatus !== 'question') {
        console.log('⚠️ Time-up ignored - game not in question state')
        return
      }
  
      const currentQuestionIndex = game.currentQuestionIndex
      
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
            time: game.currentQuestion.timeLimit * 1000, // Full time used
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
      const currentQuestion = game.questions[questionIndex]
      const baseScore = currentQuestion.difficulty === 'easy' ? 100 :
                       currentQuestion.difficulty === 'medium' ? 150 : 200
      
      // CHALLENGE SCORE SHOULD NOT INCLUDE TIME BONUS
      // Challenge should never be higher than someone who answered correctly
      const potentialScore = baseScore

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
      io.to(gameCode).emit('challenge-voting', {
        challenge,
        voters: voters.map(p => ({ id: p.id, name: p.name })),
        votingTime: 20 // 20 seconds to vote
      })

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
          game.players.splice(playerIndex, 1)
          game.updatedAt = Date.now()

          console.log('👋 Player disconnected:', playerObj.name)
          io.to(player.gameCode).emit('player-left', { playerId: socket.id, gameState: game })

          if (game.players.length === 0) {
            games.delete(player.gameCode)
            console.log('🗑️ Game deleted due to no players:', player.gameCode)
          }
        }
      }
      players.delete(socket.id)
    }
  })
})

// Helper function to move to next question
function moveToNextQuestion(gameCode) {
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
  
  if (currentQuestion) {
    game.players.forEach(player => {
      const playerAnswerData = game.answers[player.id]?.[game.currentQuestionIndex]
      if (playerAnswerData) {
        // Calculate score using the proper scoring system
        const baseScore = calculateScore(
          currentQuestion,
          playerAnswerData.isCorrect,
          playerAnswerData.time,
          currentQuestion.timeLimit
        )
        
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
        
        const bonusAmount = Math.floor(baseScore * ratioBonus)
        const finalScore = baseScore + bonusAmount
        
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
 // game.processingTimeUp = false
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
    io.to(gameCode).emit('game-finished', { gameState: game })
  } else {
    // Move to next question
    game.currentQuestion = game.questions[game.currentQuestionIndex]
    game.gameStatus = 'question'
    game.questionStartTime = Date.now()
    game.updatedAt = Date.now()
    game.isProcessingNextQuestion = false // Reset flag
    
    console.log(`🎯 Question ${game.currentQuestionIndex + 1}/${game.questions.length}:`, game.currentQuestion.question, '(Type:', game.currentQuestion.type + ')')
    
    io.to(gameCode).emit('question-start', {
      question: game.currentQuestion,
      questionIndex: game.currentQuestionIndex,
      totalQuestions: game.questions.length,
      timeLimit: game.currentQuestion.timeLimit
    })
    
    io.to(gameCode).emit('answer-status-updated', {
      answeredPlayers: [],
      totalPlayers: game.players.length
    })
    
    io.to(gameCode).emit('game-state-updated', { gameState: game })
  }
}

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