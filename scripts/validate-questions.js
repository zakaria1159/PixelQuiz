#!/usr/bin/env node
// Data validation for all question JSON files.
// Run: node scripts/validate-questions.js
// Exits with code 1 if any errors are found (suitable for CI/pre-deploy hooks).

const fs = require('fs')
const path = require('path')

const VALID_TYPES = new Set([
  'multiple_choice', 'true_false', 'fill_blank', 'ranking', 'closest_wins',
  'speed_buzz', 'free_text', 'clue_chain', 'animal_sound', 'flag_guess',
  'image_guess', 'pixel_reveal', 'music_guess', 'letter_game',
])
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard'])

const DIRS = [
  { dir: path.join(__dirname, '..', 'questions'), lang: 'en' },
  { dir: path.join(__dirname, '..', 'questions', 'fr'), lang: 'fr' },
]

let errors = 0
let warnings = 0
let totalChecked = 0

function error(file, id, msg) {
  console.error(`  ERROR  [${file}] id=${id ?? '?'}: ${msg}`)
  errors++
}

function warn(file, id, msg) {
  console.warn(`  WARN   [${file}] id=${id ?? '?'}: ${msg}`)
  warnings++
}

function validateQuestion(q, file) {
  const id = q.id
  totalChecked++

  // --- Universal fields ---
  if (!id || typeof id !== 'string') error(file, id, 'missing or invalid id')
  if (!q.type || !VALID_TYPES.has(q.type)) error(file, id, `unknown type: "${q.type}"`)
  if (!q.category || typeof q.category !== 'string') error(file, id, 'missing category')
  if (!q.question || typeof q.question !== 'string') error(file, id, 'missing question text')
  if (!VALID_DIFFICULTIES.has(q.difficulty)) error(file, id, `invalid difficulty: "${q.difficulty}"`)
  if (q.timeLimit != null && (typeof q.timeLimit !== 'number' || q.timeLimit <= 0)) {
    error(file, id, `invalid timeLimit: ${q.timeLimit}`)
  }

  // --- Type-specific rules ---
  switch (q.type) {
    case 'multiple_choice': {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        error(file, id, 'options must be an array with at least 2 items')
        break
      }
      if (typeof q.correctAnswer !== 'number' || !Number.isInteger(q.correctAnswer)) {
        error(file, id, `correctAnswer must be an integer index, got: ${JSON.stringify(q.correctAnswer)}`)
      } else if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
        error(file, id, `correctAnswer index ${q.correctAnswer} is out of range [0..${q.options.length - 1}]`)
      }
      break
    }

    case 'speed_buzz': {
      // speed_buzz is a hybrid: with options it behaves like multiple_choice,
      // without options it behaves like free_text (player types the answer)
      if (Array.isArray(q.options)) {
        if (q.options.length < 2) {
          error(file, id, 'options must have at least 2 items')
        } else if (typeof q.correctAnswer !== 'number' || !Number.isInteger(q.correctAnswer)) {
          error(file, id, `correctAnswer must be an integer index when options are present, got: ${JSON.stringify(q.correctAnswer)}`)
        } else if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
          error(file, id, `correctAnswer index ${q.correctAnswer} is out of range [0..${q.options.length - 1}]`)
        }
      } else {
        if (!q.correctAnswer || typeof q.correctAnswer !== 'string') {
          error(file, id, 'correctAnswer must be a non-empty string when no options are present')
        }
      }
      break
    }

    case 'true_false': {
      if (typeof q.correctAnswer !== 'number' || (q.correctAnswer !== 0 && q.correctAnswer !== 1)) {
        error(file, id, `correctAnswer must be 0 (True) or 1 (False), got: ${JSON.stringify(q.correctAnswer)}`)
      }
      break
    }

    case 'fill_blank':
    case 'free_text': {
      if (!q.correctAnswer || typeof q.correctAnswer !== 'string') {
        error(file, id, 'correctAnswer must be a non-empty string')
      }
      break
    }

    case 'ranking': {
      if (!Array.isArray(q.items) || q.items.length < 2) {
        error(file, id, 'items must be an array with at least 2 elements')
      }
      if (!Array.isArray(q.correctOrder)) {
        error(file, id, 'correctOrder must be an array')
      } else {
        if (q.items && q.correctOrder.length !== q.items.length) {
          error(file, id, `correctOrder length (${q.correctOrder.length}) != items length (${q.items?.length})`)
        }
        const sorted = [...q.correctOrder].sort((a, b) => a - b)
        const expected = q.items ? q.items.map((_, i) => i) : []
        if (JSON.stringify(sorted) !== JSON.stringify(expected)) {
          error(file, id, `correctOrder contains invalid indices: ${JSON.stringify(q.correctOrder)}`)
        }
      }
      break
    }

    case 'closest_wins': {
      if (typeof q.correctAnswer !== 'number') {
        error(file, id, `correctAnswer must be a number, got: ${JSON.stringify(q.correctAnswer)}`)
      }
      break
    }

    case 'clue_chain': {
      if (!Array.isArray(q.clues) || q.clues.length < 2) {
        error(file, id, 'clues must be an array with at least 2 items')
      }
      if (!q.correctAnswer || typeof q.correctAnswer !== 'string') {
        error(file, id, 'correctAnswer must be a non-empty string')
      }
      break
    }

    case 'animal_sound': {
      if (!q.audioUrl || typeof q.audioUrl !== 'string') {
        error(file, id, 'missing audioUrl')
      }
      if (!q.correctAnswer || typeof q.correctAnswer !== 'string') {
        error(file, id, 'correctAnswer must be a non-empty string')
      }
      break
    }

    case 'flag_guess': {
      if (!q.countryCode || typeof q.countryCode !== 'string' || q.countryCode.length !== 2) {
        error(file, id, `countryCode must be a 2-char string, got: ${JSON.stringify(q.countryCode)}`)
      }
      if (!q.correctAnswer || typeof q.correctAnswer !== 'string') {
        error(file, id, 'correctAnswer must be a non-empty string')
      }
      break
    }

    case 'image_guess':
    case 'pixel_reveal': {
      if (!q.imageUrl || typeof q.imageUrl !== 'string') {
        error(file, id, 'missing imageUrl')
      }
      if (!q.correctAnswer || typeof q.correctAnswer !== 'string') {
        error(file, id, 'correctAnswer must be a non-empty string')
      }
      break
    }

    case 'music_guess': {
      if (!q.deezerQuery || typeof q.deezerQuery !== 'string') {
        error(file, id, 'missing deezerQuery')
      }
      if (!q.correctAnswer || typeof q.correctAnswer !== 'string') {
        error(file, id, 'correctAnswer must be a non-empty string')
      }
      if (!q.artist) warn(file, id, 'missing artist field')
      if (!q.songTitle) warn(file, id, 'missing songTitle field')
      break
    }

    case 'letter_game': {
      if (!q.letter || typeof q.letter !== 'string' || q.letter.length !== 1) {
        error(file, id, `letter must be a single character, got: ${JSON.stringify(q.letter)}`)
      }
      if (!Array.isArray(q.categories) || q.categories.length === 0) {
        error(file, id, 'categories must be a non-empty array')
      }
      break
    }
  }
}

// Track duplicate IDs within each language
for (const { dir, lang } of DIRS) {
  console.log(`\nValidating ${lang.toUpperCase()} questions in ${dir}...`)
  const seenIds = new Map() // id → file

  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const fp = path.join(dir, file)
    let questions
    try {
      questions = JSON.parse(fs.readFileSync(fp, 'utf8'))
    } catch (e) {
      console.error(`  ERROR  [${file}]: invalid JSON — ${e.message}`)
      errors++
      continue
    }

    if (!Array.isArray(questions)) {
      console.error(`  ERROR  [${file}]: root must be a JSON array`)
      errors++
      continue
    }

    for (const q of questions) {
      // Check for duplicate IDs within the same language
      if (q.id) {
        if (seenIds.has(q.id)) {
          error(file, q.id, `duplicate id — also in ${seenIds.get(q.id)}`)
        } else {
          seenIds.set(q.id, file)
        }
      }
      validateQuestion(q, `${lang}/${file}`)
    }
  }
}

console.log(`\n${'─'.repeat(50)}`)
console.log(`Checked: ${totalChecked} questions`)
console.log(`Errors:  ${errors}`)
console.log(`Warnings: ${warnings}`)
console.log('─'.repeat(50))

if (errors > 0) {
  console.error(`\nFailed with ${errors} error(s).`)
  process.exit(1)
} else {
  console.log('\nAll questions valid.')
  process.exit(0)
}
