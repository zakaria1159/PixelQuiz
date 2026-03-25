#!/usr/bin/env node
// Fixes multiple_choice questions where correctAnswer is a string instead of an index,
// and true_false questions where correctAnswer is "true"/"false" instead of 0/1.
// Run: node scripts/fix-correct-answers.js

const fs = require('fs')
const path = require('path')

const DIRS = [
  { dir: path.join(__dirname, '..', 'questions'), lang: 'en' },
  { dir: path.join(__dirname, '..', 'questions', 'fr'), lang: 'fr' },
]

let totalFixed = 0
let totalWarnings = 0

for (const { dir, lang } of DIRS) {
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const fp = path.join(dir, file)
    const questions = JSON.parse(fs.readFileSync(fp, 'utf8'))
    let changed = false

    for (const q of questions) {
      if (q.type === 'multiple_choice' && typeof q.correctAnswer === 'string') {
        const idx = q.options?.findIndex(opt =>
          opt.toString().toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()
        )
        if (idx !== -1 && idx !== undefined) {
          console.log(`[${lang}/${file}] Fixed MC: "${q.correctAnswer}" → ${idx} (id: ${q.id})`)
          q.correctAnswer = idx
          totalFixed++
          changed = true
        } else {
          console.warn(`[${lang}/${file}] WARNING: Could not find "${q.correctAnswer}" in options for id: ${q.id}`)
          console.warn(`  options: ${JSON.stringify(q.options)}`)
          totalWarnings++
        }
      }

      if (q.type === 'true_false' && typeof q.correctAnswer === 'string') {
        const val = q.correctAnswer.toLowerCase().trim()
        if (val === 'true') {
          console.log(`[${lang}/${file}] Fixed TF: "true" → 0 (id: ${q.id})`)
          q.correctAnswer = 0
          totalFixed++
          changed = true
        } else if (val === 'false') {
          console.log(`[${lang}/${file}] Fixed TF: "false" → 1 (id: ${q.id})`)
          q.correctAnswer = 1
          totalFixed++
          changed = true
        } else {
          console.warn(`[${lang}/${file}] WARNING: Unknown true_false value "${q.correctAnswer}" for id: ${q.id}`)
          totalWarnings++
        }
      }
    }

    if (changed) {
      fs.writeFileSync(fp, JSON.stringify(questions, null, 2), 'utf8')
    }
  }
}

console.log(`\nDone. Fixed: ${totalFixed}, Warnings: ${totalWarnings}`)
