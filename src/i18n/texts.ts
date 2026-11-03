import type { Lang, Sex } from '../sim/types'
import { fmt } from './ui'
import { EV_RU } from './ev.ru'
import { EV_KZ } from './ev.kz'
import { EV_EN } from './ev.en'

export interface EvText {
  /** Main text. `[он|она]` picks by sex, `{var}` inserts values. */
  t: string
  /** Optional short source label shown under historical events. */
  src?: string
}
export type EvTable = Record<string, string | EvText>

const TABLES: Record<Lang, EvTable> = { ru: EV_RU, kz: EV_KZ, en: EV_EN }

function sexed(s: string, sex: Sex): string {
  return s.replace(/\[([^|\]]*)\|([^\]]*)\]/g, (_, m, f) => (sex === 'm' ? m : f))
}

export function ev(lang: Lang, key: string, sex: Sex, vars: Record<string, string | number> = {}): { text: string; src?: string } {
  const raw = TABLES[lang][key] ?? TABLES.ru[key]
  if (raw === undefined) return { text: key }
  const e = typeof raw === 'string' ? { t: raw } : raw
  // Vars may themselves be keys (place names, jobs) — translate them too.
  const tv: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(vars)) {
    if (typeof v === 'string' && (TABLES[lang][v] ?? TABLES.ru[v]) !== undefined) {
      const inner = TABLES[lang][v] ?? TABLES.ru[v]
      tv[k] = sexed(typeof inner === 'string' ? inner : inner.t, sex)
    } else tv[k] = v
  }
  return { text: sexed(fmt(e.t, tv), sex), src: e.src }
}

export function word(lang: Lang, key: string, sex: Sex = 'm'): string {
  return ev(lang, key, sex).text
}
