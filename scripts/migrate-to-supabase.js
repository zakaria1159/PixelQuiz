#!/usr/bin/env node
// One-time migration: reads all questions/*.json files and upserts them into Supabase
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-to-supabase.js

require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const QUESTIONS_DIR = path.join(__dirname, '..', 'questions')
const COMMON_FIELDS = new Set(['id', 'type', 'category', 'question', 'difficulty', 'timeLimit', 'explanation'])

function toRow(q, lang) {
  const { id, type, category, question, difficulty, timeLimit, explanation, ...rest } = q
  return {
    id,
    lang,
    category: category || 'unknown',
    type,
    question,
    difficulty,
    time_limit: timeLimit ?? null,
    explanation: explanation ?? null,
    data: rest,
  }
}

function loadDir(dir, lang) {
  const rows = []
  if (!fs.existsSync(dir)) return rows
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue
    try {
      const questions = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
      for (const q of questions) {
        rows.push(toRow(q, lang))
      }
    } catch (e) {
      console.error(`Failed to read ${file}:`, e.message)
    }
  }
  return rows
}

async function migrate() {
  const enRows = loadDir(QUESTIONS_DIR, 'en')
  const frRows = loadDir(path.join(QUESTIONS_DIR, 'fr'), 'fr')
  const allRows = [...enRows, ...frRows]

  console.log(`Migrating ${enRows.length} EN + ${frRows.length} FR = ${allRows.length} total questions...`)

  // Upsert in batches of 200
  const BATCH = 200
  let inserted = 0
  for (let i = 0; i < allRows.length; i += BATCH) {
    const batch = allRows.slice(i, i + BATCH)
    const { error } = await supabase.from('questions').upsert(batch, { onConflict: 'id,lang' })
    if (error) {
      console.error(`Batch ${i / BATCH + 1} failed:`, error.message)
    } else {
      inserted += batch.length
      console.log(`  Upserted ${inserted}/${allRows.length}`)
    }
  }

  console.log('Migration complete.')
}

migrate().catch(err => {
  console.error(err)
  process.exit(1)
})
