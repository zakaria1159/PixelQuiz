// test-game.js - Automated game simulation for testing
// Note: --players N = number of non-host players (host is always added by server)
//       Total in game = N + 1 (host). Minimum N=1 to start.
//
// Usage:
//   node test-game.js                         # 3 players, basic scenario
//   node test-game.js --players 5             # 5 players, basic scenario
//   node test-game.js --scenario challenge    # 3 players, last player challenges last question
//   node test-game.js --players 1 --scenario challenge  # 2 total (host+1) → auto-approve challenge

const { io } = require('socket.io-client')

const args = process.argv.slice(2)
const playerCount = parseInt(args[args.indexOf('--players') + 1]) || 3
const scenario = args[args.indexOf('--scenario') + 1] || 'basic'
const SERVER = 'http://localhost:3003'

const sleep = (ms) => new Promise(res => setTimeout(res, ms))
const randomDelay = (min, max) => sleep(min + Math.random() * (max - min))
const gameCode = 'TEST' + Math.random().toString(36).slice(2, 6).toUpperCase()

const RESET = '\x1b[0m', BOLD = '\x1b[1m', GREEN = '\x1b[32m'
const RED = '\x1b[31m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', DIM = '\x1b[2m'

const log = (label, msg, color = RESET) =>
  console.log(`${color}${BOLD}[${label}]${RESET} ${msg}`)
const divider = () => console.log(`${DIM}${'─'.repeat(60)}${RESET}`)

function connect(label) {
  return new Promise((resolve, reject) => {
    const socket = io(SERVER, { transports: ['websocket'] })
    socket.once('connect', () => { log(label, `connected (${socket.id})`, CYAN); resolve(socket) })
    socket.once('connect_error', err => reject(new Error(`${label}: ${err.message}`)))
    setTimeout(() => reject(new Error(`${label} connection timeout`)), 5000)
  })
}

function waitFor(socket, event, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for '${event}'`)), timeout)
    socket.once(event, data => { clearTimeout(timer); resolve(data) })
  })
}

function pickAnswer(question, playerIndex, totalPlayers) {
  const shouldAnswerWrong = scenario === 'challenge' && playerIndex === totalPlayers - 1

  if (question.type === 'multiple_choice' || question.type === 'true_false' || question.type === 'speed_buzz') {
    if (shouldAnswerWrong)
      return String(question.options.findIndex((_, i) => i !== question.correctAnswer))
    return String(question.correctAnswer)
  }
  if (question.type === 'free_text' || question.type === 'image_guess') {
    return shouldAnswerWrong ? 'wronganswer' : question.correctAnswer
  }
  if (question.type === 'fill_blank' || question.type === 'pixel_reveal') {
    return shouldAnswerWrong ? 'wrongword' : question.correctAnswer
  }
  if (question.type === 'ranking') {
    return shouldAnswerWrong
      ? [...question.correctOrder].reverse().join(',')
      : question.correctOrder.join(',')
  }
  if (question.type === 'closest_wins') {
    // Simulate different guesses — spread players around the correct answer
    const spread = question.correctAnswer * 0.3
    const offset = shouldAnswerWrong
      ? spread * (0.5 + Math.random())  // intentionally far off
      : spread * (Math.random() - 0.5)  // close-ish guess
    return String(Math.round(question.correctAnswer + offset))
  }
  if (question.type === 'letter_game') {
    const letter = question.letter.toLowerCase()
    // Simple word banks per letter for testing
    const wordBank = {
      a: ['Alice', 'Ant', 'Argentina', 'Apple', 'Actor', 'Axe'],
      b: ['Bob', 'Bear', 'Brazil', 'Banana', 'Baker', 'Bottle'],
      s: ['Sarah', 'Snake', 'Spain', 'Strawberry', 'Surgeon', 'Sofa'],
    }
    const defaults = question.categories.map((_, i) => `${question.letter}word${i + 1}`)
    const answers = (wordBank[letter] || defaults)
    if (shouldAnswerWrong) {
      // Submit wrong letter words for most categories
      return answers.map((_, i) => i % 2 === 0 ? 'wrongword' : answers[i]).join(',')
    }
    return answers.slice(0, question.categories.length).join(',')
  }
  return '0'
}

async function playQuestion(question, questionIndex, totalQuestions, playerSockets, hostSocket) {
  divider()
  log('GAME', `Q${questionIndex + 1}/${totalQuestions}: ${BOLD}${question.question}${RESET}`, YELLOW)
  log('GAME', `${question.type} | ${question.difficulty}`, DIM)

  await Promise.all(playerSockets.map(async (socket, i) => {
    await randomDelay(200, 2000)
    const answer = pickAnswer(question, i, playerSockets.length)
    const tag = scenario === 'challenge' && i === playerSockets.length - 1
      ? ` ${RED}(wrong)${RESET}` : ''
    log(`P${i + 1}`, `answering: ${BOLD}${answer}${RESET}${tag}`)
    socket.emit('submit-answer', gameCode, answer)
  }))

  // Send time-up from all clients (host + all players) with slight delays
  // to simulate the real race condition — this is what was causing skips
  await sleep(200)
  log('HOST', `sending time-up for Q${questionIndex + 1}`, DIM)
  hostSocket.emit('time-up', { gameCode, questionIndex })

  // Simulate other clients also sending time-up slightly later (within 2s window)
  for (let i = 0; i < playerSockets.length; i++) {
    await sleep(100 + Math.random() * 300)
    log(`P${i + 1}`, `sending time-up for Q${questionIndex + 1}`, DIM)
    playerSockets[i].emit('time-up', { gameCode, questionIndex })
  }
}

async function run() {
  divider()
  console.log(`${BOLD}${CYAN}MetaQuizz Test Runner${RESET}`)
  console.log(`  Game code : ${BOLD}${gameCode}${RESET}`)
  console.log(`  Players   : ${BOLD}${playerCount}${RESET}`)
  console.log(`  Scenario  : ${BOLD}${scenario}${RESET}`)
  divider()

  // Connect all sockets
  const hostSocket = await connect('HOST')
  const playerSockets = []
  for (let i = 0; i < playerCount; i++)
    playerSockets.push(await connect(`P${i + 1}`))

  // Create game
  log('HOST', `creating game ${gameCode}`, YELLOW)
  hostSocket.emit('host-create-game', gameCode)
  await waitFor(hostSocket, 'game-created')
  log('HOST', 'game created ✓', GREEN)

  // Players join
  for (let i = 0; i < playerSockets.length; i++) {
    playerSockets[i].emit('player-join-game', { gameCode, playerName: `Player${i + 1}` })
    await waitFor(hostSocket, 'player-joined')
    log(`P${i + 1}`, `joined as Player${i + 1}`, GREEN)
  }

  // Start game — server will emit question-start for Q1
  await sleep(300)
  log('HOST', 'starting game...', YELLOW)
  hostSocket.emit('host-start-game', gameCode)

  // --- Question loop ---
  // Server emits question-start for each question.
  // After the last question all players answer, server emits game-finished (reveal_phase).
  let lastQuestionIndex = 0
  let totalQuestions = 0
  let expectedIndex = 0
  let skipsDetected = 0

  while (true) {
    const qData = await waitFor(hostSocket, 'question-start', 15000)
    lastQuestionIndex = qData.questionIndex
    totalQuestions = qData.totalQuestions

    // Verify no question was skipped
    if (qData.questionIndex !== expectedIndex) {
      log('ERROR', `🚨 SKIP DETECTED! Expected Q${expectedIndex + 1}, got Q${qData.questionIndex + 1}`, RED)
      skipsDetected++
    } else {
      log('GAME', `✓ Q${qData.questionIndex + 1} received in order`, GREEN)
    }
    expectedIndex = qData.questionIndex + 1

    // Drain question-start on player sockets
    for (const s of playerSockets) s.once('question-start', () => {})

    await playQuestion(qData.question, qData.questionIndex, qData.totalQuestions, playerSockets, hostSocket)

    // After the last question, server emits game-finished (reveal_phase) instead of question-start
    if (qData.questionIndex + 1 >= qData.totalQuestions) {
      log('GAME', 'last question answered — waiting for reveal phase...', DIM)
      break
    }
  }

  if (skipsDetected === 0) {
    log('TEST', `✅ No question skips detected — all ${totalQuestions} questions played in order`, GREEN)
  } else {
    log('TEST', `❌ ${skipsDetected} skip(s) detected!`, RED)
  }

  // Wait for game-finished (reveal_phase) — signals all questions are done
  const revealStart = await waitFor(hostSocket, 'game-finished', 20000)
  if (revealStart.gameState?.gameStatus !== 'reveal_phase') {
    throw new Error(`Expected reveal_phase, got: ${revealStart.gameState?.gameStatus}`)
  }
  log('GAME', 'entered reveal phase', YELLOW)
  divider()

  // --- Challenge scenario ---
  if (scenario === 'challenge') {
    await sleep(500)
    const challenger = playerSockets[playerSockets.length - 1]
    log(`P${playerSockets.length}`, `challenging Q${lastQuestionIndex + 1}`, RED)
    challenger.emit('challenge-question', gameCode, lastQuestionIndex, 'My answer should be accepted!')

    // Always wait for challenge-voting — even with 2 players the host must vote
    const challengeData = await waitFor(hostSocket, 'challenge-voting', 5000)
    const voterSockets = [hostSocket, ...playerSockets.slice(0, -1)]
    log('GAME', `voting started — ${voterSockets.length} voter(s)`, YELLOW)
    for (const voter of voterSockets) {
      await sleep(300)
      voter.emit('vote-challenge', gameCode, challengeData.challenge.id, 'approve')
      log('GAME', 'vote: approve', GREEN)
    }

    const resolution = await waitFor(hostSocket, 'challenge-resolved', 10000)
    log(
      'GAME',
      `challenge ${resolution.passed ? `${GREEN}PASSED` : `${RED}REJECTED`}${RESET} — score awarded: ${BOLD}${resolution.scoreAwarded}${RESET}`,
      resolution.passed ? GREEN : RED
    )
    divider()
  }

  // --- Advance through all reveals ---
  // Register listener BEFORE sending reveals to avoid race condition
  const finalResultsPromise = waitFor(hostSocket, 'game-finished', 15000)

  log('HOST', `advancing ${totalQuestions} reveal(s)`, YELLOW)
  for (let i = 0; i < totalQuestions; i++) {
    await sleep(300)
    hostSocket.emit('next-question-reveal', gameCode)
    log('HOST', `reveal ${i + 1}/${totalQuestions}`, DIM)
    for (const socket of playerSockets) {
      await sleep(50)
      socket.emit('player-ready', { gameCode, questionIndex: i, playerId: socket.id })
    }
  }

  // Now await the already-registered listener
  const finalData = await finalResultsPromise
  if (finalData.gameState?.gameStatus !== 'final_results') {
    throw new Error(`Expected final_results, got: ${finalData.gameState?.gameStatus}`)
  }

  // --- Print results ---
  divider()
  console.log(`${BOLD}${CYAN}Final Results${RESET}`)
  divider()

  const results = finalData.gameState.finalResults || []
  results.forEach((player, rank) => {
    const medal = ['🥇', '🥈', '🥉'][rank] || `#${rank + 1}`
    console.log(
      `  ${medal}  ${BOLD}${player.playerName}${RESET} — ${GREEN}${BOLD}${player.score} pts${RESET}` +
      `  ${DIM}(${(player.totalTime / 1000).toFixed(1)}s total)${RESET}`
    )
    player.questionResults?.forEach(r => {
      const icon = r.isCorrect ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`
      console.log(
        `       ${icon}  Q${r.questionIndex + 1}: ${BOLD}${r.score} pts${RESET}` +
        `  ${DIM}${(r.time / 1000).toFixed(1)}s${RESET}`
      )
    })
  })

  divider()
  log('DONE', 'test complete ✓', GREEN)

  for (const s of playerSockets) s.disconnect()
  hostSocket.disconnect()
  process.exit(0)
}

run().catch(err => {
  console.error(`\n${RED}${BOLD}ERROR:${RESET} ${err.message}`)
  process.exit(1)
})
