// server.js - Socket.io Game Server with Hybrid Question Support
const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
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
  },
  {
    id: '3',
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
    id: '4',
    type: 'multiple_choice',
    question: 'Which country has won the most FIFA World Cups?',
    options: ['Germany', 'Argentina', 'Brazil', 'France'],
    correctAnswer: 2,
    timeLimit: 15,
    category: 'sports',
    difficulty: 'medium',
    explanation: 'Brazil has won the FIFA World Cup 5 times (1958, 1962, 1970, 1994, 2002).'
  },
  {
    id: '5',
    type: 'free_text',
    question: 'What Spanish city is famous for the Sagrada Família cathedral?',
    correctAnswer: 'Barcelona',
    acceptableAnswers: ['barcelona', 'barcelona spain', 'barcelone'],
    caseSensitive: false,
    exactMatch: true,
    timeLimit: 15,
    category: 'geography',
    difficulty: 'medium',
    explanation: 'The Sagrada Família in Barcelona was designed by Antoni Gaudí and has been under construction since 1882.'
  },
  {
    id: '6',
    type: 'free_text',
    question: 'Who painted the famous artwork "La Joconde" (Mona Lisa)?',
    correctAnswer: 'Leonardo da Vinci',
    acceptableAnswers: ['leonardo da vinci', 'da vinci'], // Removed just "leonardo"
    caseSensitive: false,
    exactMatch: true,
    timeLimit: 15,
    category: 'art',
    difficulty: 'medium',
    explanation: 'Leonardo da Vinci painted the Mona Lisa between 1503-1519.'
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
      // Single word answers - check for similarity
      if (normalizedUserAnswer.includes(normalizedCorrectAnswer) || normalizedCorrectAnswer.includes(normalizedUserAnswer)) {
        console.log('✅ Single word partial match')
        return true
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
  } else {
    return typeof answer === 'string' ? answer : 'Invalid answer'
  }
}

// Helper function to get correct answer display text
function getCorrectAnswerDisplayText(question) {
  if (question.type === 'multiple_choice' || question.type === 'true_false') {
    return question.options && question.options[question.correctAnswer] ? question.options[question.correctAnswer] : 'Unknown'
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
        
        // Broadcast the reveal state update to all players
        io.to(gameCode).emit('reveal-state-updated', {
          currentRevealIndex: game.currentRevealIndex,
          gameState: game
        })
      } else {
        // Move to final results
        console.log('🏁 Moving to final results')
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

      // Check if player can challenge (has challenges remaining, didn't get it right)
      const playerAnswer = game.answers[socket.id]?.[questionIndex]
      if (!playerAnswer || playerAnswer.isCorrect) {
        socket.emit('error', { message: 'Cannot challenge correct answers' })
        return
      }

      console.log(`🏛️ Challenge submitted by ${playerObj.name} for Q${questionIndex + 1}: "${explanation}"`)

      // Start voting phase for this challenge
      const challenge = {
        id: `${socket.id}_${questionIndex}_${Date.now()}`,
        challengerId: socket.id,
        challengerName: playerObj.name,
        questionIndex,
        question: game.questions[questionIndex],
        playerAnswer: playerAnswer.answer,
        explanation: explanation.trim(),
        potentialScore: game.questionScores?.[questionIndex]?.[socket.id] || 0,
        submittedAt: Date.now()
      }

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

      if (totalVotes >= totalVoters) {
        // Voting complete - resolve challenge
        const approveVotes = game.challengeVotes[challengeId].approve.length
        const rejectVotes = game.challengeVotes[challengeId].reject.length
        const challengePassed = approveVotes > rejectVotes

        console.log(`🏛️ Challenge voting complete: ${approveVotes} approve, ${rejectVotes} reject - ${challengePassed ? 'PASSED' : 'REJECTED'}`)

        io.to(gameCode).emit('challenge-resolved', {
          challengeId,
          passed: challengePassed,
          votes: { approve: approveVotes, reject: rejectVotes }
        })
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
        // Calculate score but store it separately for later reveal
        let score = 0
        if (playerAnswerData.isCorrect) {
          const baseScore = currentQuestion.difficulty === 'easy' ? 100 : 
                           currentQuestion.difficulty === 'hard' ? 400 : 200
          const timeBonus = Math.max(0, Math.floor((currentQuestion.timeLimit * 1000 - playerAnswerData.time) / 100))
          score = baseScore + timeBonus
        }
        
        // Store calculated score for this question (but don't add to player.score yet)
        if (!game.questionScores) game.questionScores = {}
        if (!game.questionScores[game.currentQuestionIndex]) game.questionScores[game.currentQuestionIndex] = {}
        game.questionScores[game.currentQuestionIndex][player.id] = score
        
        console.log(`📊 ${player.name}: ${playerAnswerData.isCorrect ? '✅' : '❌'} (${score} pts calculated, not awarded yet) in ${(playerAnswerData.time / 1000).toFixed(1)}s - ${currentQuestion.difficulty}/${currentQuestion.type}`)
      }
    })
  }
 // game.processingTimeUp = false
  game.currentQuestionIndex++
  
  if (game.currentQuestionIndex >= game.questions.length) {
    // Game finished
    game.gameStatus = 'reveal_phase'
    game.currentRevealIndex = 0 // Initialize reveal index
    game.readyPlayers = {} // Initialize ready players structure
    for (let i = 0; i < game.questions.length; i++) {
      game.readyPlayers[i] = [game.hostId] // Host is ready by default for all questions
      console.log(`✅ Host auto-ready for question ${i}`)
    }
    game.updatedAt = Date.now()
    game.isProcessingNextQuestion = false // Reset flag
    
    console.log('🏁 Game finished - entering reveal phase')
    
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
            score: answerData.isCorrect ? 10 : 0
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