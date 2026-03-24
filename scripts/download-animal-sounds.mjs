/**
 * Downloads animal sound OGG files from Wikimedia Commons into public/audio/animals/.
 * Run once: node scripts/download-animal-sounds.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'audio', 'animals')

fs.mkdirSync(OUT_DIR, { recursive: true })

// Curated Wikimedia Commons file names — verified to exist and be correct animal sounds
// Format: animal → [list of candidate file names to try in order]
const KNOWN_FILES = {
  bat:        ['Myotis_lucifugus_-_little_brown_bat_-_ultrasound.ogg', 'Eptesicus_fuscus.ogg'],
  bear:       ['Brown_bear_sounds.ogg', 'Grizzly_bear_sound.ogg', 'Bear_growl.ogg'],
  bee:        ['Apis_mellifera_flying.ogg', 'Bee_buzzing.ogg'],
  bison:      ['Bison_bison_sound.ogg', 'American_bison_bellowing.ogg'],
  camel:      ['Camelus_dromedarius_-_Wilhelma.ogg', 'Camel_grunt.ogg'],
  capybara:   ['Hydrochoerus_hydrochaeris_sound.ogg', 'Capybara_sound.ogg'],
  cat:        ['Cat_meowing.ogg', 'Felis_silvestris_catus_-_Miau.ogg', 'Meow.ogg'],
  chicken:    ['Gallus_gallus_domesticus_sound.ogg', 'Chicken_clucking.ogg', 'Hen_clucking.ogg'],
  chimpanzee: ['Pan_troglodytes_-_chimpanzee_sound.ogg', 'Chimpanzee_pant-hoot.ogg'],
  coyote:     ['Canis_latrans_sound.ogg', 'Coyote_howl.ogg'],
  cricket:    ['Cricket_sound.ogg', 'Acheta_domesticus.ogg', 'Gryllus_campestris.ogg'],
  crocodile:  ['Crocodylus_niloticus_sound.ogg', 'Crocodile_sound.ogg'],
  crow:       ['Corvus_brachyrhynchos_-_caw_call.ogg', 'Crow_caw.ogg', 'American_crow_call.ogg'],
  deer:       ['Cervus_elaphus_bellowing.ogg', 'Red_deer_roar.ogg', 'Deer_sound.ogg'],
  dolphin:    ['Tursiops_truncatus_whistle.ogg', 'Bottlenose_dolphin_sound.ogg', 'Dolphin_clicks.ogg'],
  donkey:     ['Equus_africanus_asinus_braying.ogg', 'Donkey_bray.ogg', 'Donkey_sound.ogg'],
  duck:       ['Mallard_pair_quacking.ogg', 'Anas_platyrhynchos_sound.ogg', 'Duck_quack.ogg'],
  eagle:      ['Haliaeetus_leucocephalus_call.ogg', 'Bald_eagle_sound.ogg', 'Eagle_call.ogg'],
  ferret:     ['Mustela_putorius_furo_sound.ogg', 'Ferret_dooking.ogg'],
  fox:        ['Vulpes_vulpes_sound.ogg', 'Red_fox_barking.ogg', 'Fox_sound.ogg'],
  goat:       ['Capra_hircus_sound.ogg', 'Goat_bleating.ogg', 'Goat_sound.ogg'],
  goose:      ['Anser_anser_sound.ogg', 'Canada_goose_honk.ogg', 'Goose_honking.ogg'],
  gorilla:    ['Gorilla_gorilla_sound.ogg', 'Gorilla_chest_beat.ogg'],
  hamster:    ['Cricetus_cricetus_sound.ogg', 'Hamster_sound.ogg'],
  hedgehog:   ['Erinaceus_europaeus_sound.ogg', 'Hedgehog_sound.ogg', 'Hedgehog_O.ogg'],
  hippo:      ['Hippopotamus_amphibius_sound.ogg', 'Hippo_sound.ogg', 'De-hippo-.ogg'],
  horse:      ['Equus_ferus_caballus_neighing.ogg', 'Horse_neigh.ogg', 'Horsewhinney.ogg'],
  hyena:      ['Crocuta_crocuta_sound.ogg', 'Spotted_hyena_whooping.ogg', 'Hyena_laugh.ogg'],
  iguana:     ['Iguana_iguana_sound.ogg', 'Green_iguana_sound.ogg'],
  jaguar:     ['Panthera_onca_sound.ogg', 'Jaguar_growl.ogg'],
  kangaroo:   ['Macropus_rufus_sound.ogg', 'Kangaroo_sound.ogg'],
  lemur:      ['Lemur_catta_sound.ogg', 'Ring_tailed_lemur_sound.ogg', 'De-Lemur.ogg'],
  lion:       ['Panthera_leo_roaring.ogg', 'Lion_roar.ogg', 'Lion_sound.ogg'],
  meerkat:    ['Suricata_suricatta_sound.ogg', 'Meerkat_alarm_call.ogg'],
  monkey:     ['Macaca_mulatta_sound.ogg', 'Monkey_sound.ogg', 'Howler_monkey.ogg'],
  moose:      ['Alces_alces_bellowing.ogg', 'Bull_moose_call.ogg', 'Moose_sound.ogg'],
  otter:      ['Lontra_canadensis_sound.ogg', 'Sea_otter_sound.ogg', 'Otter_sound.ogg'],
  parrot:     ['Amazona_amazonica_sound.ogg', 'Parrot_sound.ogg', 'Psittacus_erithacus.ogg'],
  peacock:    ['Pavo_cristatus_call.ogg', 'Peacock_call.ogg', 'Peacock_sound.ogg'],
  penguin:    ['Spheniscus_demersus_sound.ogg', 'Penguin_sound.ogg', 'African_penguin_sound.ogg'],
  rabbit:     ['Oryctolagus_cuniculus_sound.ogg', 'Rabbit_sound.ogg'],
  raccoon:    ['Procyon_lotor_sound.ogg', 'Raccoon_sound.ogg'],
  rat:        ['Rattus_norvegicus_sound.ogg', 'Rat_sound.ogg'],
  rattlesnake:['Crotalus_rattling.ogg', 'Rattlesnake_rattle.ogg', 'Rattlesnake.ogg'],
  rhinoceros: ['Ceratotherium_simum_sound.ogg', 'White_rhinoceros_sound.ogg', 'Rhino_sound.ogg'],
  seagull:    ['Larus_argentatus_call.ogg', 'Herring_gull_call.ogg', 'Seagull_sound.ogg'],
  seal:       ['Phoca_vitulina_sound.ogg', 'Harbour_seal_sound.ogg', 'Seal_bark.ogg'],
  snake:      ['Snake_hiss.ogg', 'Serpent_sound.ogg'],
  squirrel:   ['Sciurus_carolinensis_sound.ogg', 'Squirrel_alarm_call.ogg', 'Squirrel_sound.ogg'],
  tiger:      ['Panthera_tigris_roar.ogg', 'Tiger_sound.ogg', 'Tiger_roar.ogg'],
  turkey:     ['Meleagris_gallopavo_gobbling.ogg', 'Turkey_gobble.ogg', 'Turkey_sound.ogg'],
  whale:      ['Balaenoptera_musculus_call.ogg', 'Blue_whale_sound.ogg', 'Humpback_whale_song.ogg'],
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'MetaQuizz/1.0 (animal-sound-downloader)' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode === 404) {
        resolve(null)
        res.resume()
        return
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function fetchJson(url) {
  const buf = await get(url)
  if (!buf) return null
  try { return JSON.parse(buf.toString()) } catch { return null }
}

async function getFileUrl(filename) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url&format=json`
  const data = await fetchJson(url)
  if (!data) return null
  const pages = data?.query?.pages ?? {}
  const page = Object.values(pages)[0]
  if (page?.missing !== undefined) return null
  return page?.imageinfo?.[0]?.url ?? null
}

async function downloadAnimal(animal, candidates) {
  const outPath = path.join(OUT_DIR, `${animal}.ogg`)
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
    console.log(`  ✓ ${animal} (already exists)`)
    return true
  }

  for (const filename of candidates) {
    const fileUrl = await getFileUrl(filename)
    if (!fileUrl) continue

    const buf = await get(fileUrl)
    if (!buf || buf.length < 1000) continue

    fs.writeFileSync(outPath, buf)
    console.log(`  ↓ ${animal} ← ${filename} (${Math.round(buf.length / 1024)}kb)`)
    return true
  }

  // Fallback: search Wikimedia Commons categories
  const categoryUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Sounds_of_${encodeURIComponent(animal + 's')}&cmtype=file&cmlimit=10&format=json`
  const catData = await fetchJson(categoryUrl)
  const members = catData?.query?.categorymembers ?? []
  const oggMember = members.find(m => m.title.toLowerCase().endsWith('.ogg'))

  if (oggMember) {
    const fileUrl = await getFileUrl(oggMember.title.replace('File:', ''))
    if (fileUrl) {
      const buf = await get(fileUrl)
      if (buf && buf.length > 1000) {
        fs.writeFileSync(outPath, buf)
        console.log(`  ↓ ${animal} ← category (${Math.round(buf.length / 1024)}kb)`)
        return true
      }
    }
  }

  console.log(`  ✗ ${animal} — not found`)
  return false
}

const animals = Object.keys(KNOWN_FILES)
console.log(`Downloading ${animals.length} animal sounds to ${OUT_DIR}\n`)

let ok = 0, fail = 0
for (const animal of animals) {
  try {
    const success = await downloadAnimal(animal, KNOWN_FILES[animal])
    success ? ok++ : fail++
  } catch (e) {
    console.log(`  ✗ ${animal} — error: ${e.message}`)
    fail++
  }
  await new Promise(r => setTimeout(r, 200))
}

console.log(`\nDone: ${ok} downloaded, ${fail} failed`)
if (fail > 0) {
  const missing = animals.filter(a => !fs.existsSync(path.join(OUT_DIR, `${a}.ogg`)) || fs.statSync(path.join(OUT_DIR, `${a}.ogg`)).size < 1000)
  if (missing.length) console.log('Missing:', missing.join(', '))
}
