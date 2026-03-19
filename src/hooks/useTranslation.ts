import { useGameStore } from '@/stores/gameStore'
import { translations, TranslationKey } from '@/lib/translations'

export function useTranslation() {
  const lang = useGameStore(state => state.lang)
  const dict = (translations[lang as keyof typeof translations] ?? translations.en) as Record<string, string>

  function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    let str = dict[key] ?? (translations.en as Record<string, string>)[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.split(`{${k}}`).join(String(v))
      }
    }
    return str
  }

  return { t, lang }
}
