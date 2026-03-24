#!/bin/bash
# Finds audio files for each animal via Wikipedia's API and updates question JSONs
# to use direct Wikimedia URLs instead of broken local /audio/animals/*.ogg paths.
# Run: bash scripts/fix-animal-sound-urls.sh

QUESTIONS_DIR="questions"
UA="MetaQuizz/1.0 (animal-sound-fixer)"

animals="bat bear bee bison camel capybara cat chicken chimpanzee coyote cricket crocodile crow deer dolphin donkey duck eagle ferret fox goat goose gorilla hamster hedgehog hippo horse hyena iguana jaguar kangaroo lemur lion meerkat monkey moose otter parrot peacock penguin rabbit raccoon rat rattlesnake rhinoceros seagull seal snake squirrel tiger turkey whale"

wiki_article() {
  case "$1" in
    bat) echo "Bat" ;; bear) echo "Bear" ;; bee) echo "Honey_bee" ;;
    bison) echo "American_bison" ;; camel) echo "Camel" ;; capybara) echo "Capybara" ;;
    cat) echo "Cat" ;; chicken) echo "Chicken" ;; chimpanzee) echo "Chimpanzee" ;;
    coyote) echo "Coyote" ;; cricket) echo "Cricket_(insect)" ;; crocodile) echo "Crocodile" ;;
    crow) echo "Crow" ;; deer) echo "Deer" ;; dolphin) echo "Dolphin" ;;
    donkey) echo "Donkey" ;; duck) echo "Duck" ;; eagle) echo "Eagle" ;;
    ferret) echo "Ferret" ;; fox) echo "Fox" ;; goat) echo "Goat" ;;
    goose) echo "Goose" ;; gorilla) echo "Gorilla" ;; hamster) echo "Hamster" ;;
    hedgehog) echo "Hedgehog" ;; hippo) echo "Hippopotamus" ;; horse) echo "Horse" ;;
    hyena) echo "Hyena" ;; iguana) echo "Iguana" ;; jaguar) echo "Jaguar" ;;
    kangaroo) echo "Kangaroo" ;; lemur) echo "Lemur" ;; lion) echo "Lion" ;;
    meerkat) echo "Meerkat" ;; monkey) echo "Monkey" ;; moose) echo "Moose" ;;
    otter) echo "Otter" ;; parrot) echo "Parrot" ;; peacock) echo "Peafowl" ;;
    penguin) echo "Penguin" ;; rabbit) echo "Rabbit" ;; raccoon) echo "Raccoon" ;;
    rat) echo "Rat" ;; rattlesnake) echo "Rattlesnake" ;; rhinoceros) echo "Rhinoceros" ;;
    seagull) echo "Gull" ;; seal) echo "Pinniped" ;; snake) echo "Snake" ;;
    squirrel) echo "Squirrel" ;; tiger) echo "Tiger" ;; turkey) echo "Wild_turkey" ;;
    whale) echo "Whale" ;;
  esac
}

found=0
not_found=0

for animal in $animals; do
  wiki=$(wiki_article "$animal")
  local_path="/audio/animals/${animal}.ogg"

  # Skip if this animal isn't used in any question file
  if ! grep -qr "\"${local_path}\"" "$QUESTIONS_DIR" 2>/dev/null; then
    continue
  fi

  # Get list of media files from Wikipedia article
  response=$(curl -s -A "$UA" "https://en.wikipedia.org/w/api.php?action=query&titles=${wiki}&prop=images&format=json&imlimit=50")

  # Find first audio file
  audio_file=$(echo "$response" | python3 -c "
import json,sys
d=json.load(sys.stdin)
imgs=list(d.get('query',{}).get('pages',{}).values())[0].get('images',[])
exts=('.ogg','.oga','.flac','.wav','.opus')
hits=[i['title'].replace('File:','') for i in imgs if any(i['title'].lower().endswith(e) for e in exts)]
print(hits[0] if hits else '')
" 2>/dev/null)

  if [ -z "$audio_file" ]; then
    echo "  ✗ $animal (${wiki}) — no audio in Wikipedia article"
    not_found=$((not_found + 1))
    continue
  fi

  # Get direct file URL via Wikimedia API
  encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${audio_file}'))")
  file_url=$(curl -s -A "$UA" "https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encoded}&prop=imageinfo&iiprop=url&format=json" | python3 -c "
import json,sys
d=json.load(sys.stdin)
pages=d.get('query',{}).get('pages',{})
page=list(pages.values())[0]
if 'missing' in page:
  print('')
else:
  info=(page.get('imageinfo') or [{}])[0]
  print(info.get('url',''))
" 2>/dev/null)

  if [ -z "$file_url" ]; then
    echo "  ✗ $animal — could not resolve URL for $audio_file"
    not_found=$((not_found + 1))
    continue
  fi

  # Update all question JSON files: replace local path with external URL
  for f in "$QUESTIONS_DIR"/*.json; do
    if grep -q "\"${local_path}\"" "$f"; then
      sed -i '' "s|\"${local_path}\"|\"${file_url}\"|g" "$f"
      echo "  ✓ $animal → ${audio_file}"
    fi
  done
  found=$((found + 1))

  sleep 0.15
done

echo ""
echo "Done: $found updated, $not_found not found"
echo "Animals without Wikipedia audio will show 'Track not found' in the player."
