import { expect, test } from 'vitest'
import { Life } from '../src/sim/engine'
import { ev } from '../src/i18n/texts'
import { EV_RU } from '../src/i18n/ev.ru'
import { EV_KZ } from '../src/i18n/ev.kz'
import { EV_EN } from '../src/i18n/ev.en'
import { CHOICES } from '../src/sim/events'
import { GROUPS } from '../src/sim/birth'
import type { Lang } from '../src/sim/types'

const LANGS: Lang[] = ['ru', 'kz', 'en']
const TABLES = { ru: EV_RU, kz: EV_KZ, en: EV_EN }

test('every key in Russian exists in Kazakh and English', () => {
  const ru = Object.keys(EV_RU)
  for (const l of ['kz', 'en'] as const) {
    const missing = ru.filter(k => !(k in TABLES[l]))
    expect(missing, `missing in ${l}`).toEqual([])
  }
})

test('every text a life can show is translated and fully filled in', () => {
  const bad = new Set<string>()
  const keys = new Set<string>()
  for (let i = 1; i <= 3000; i++) {
    const group = i % 3 === 0 ? GROUPS[i % GROUPS.length] : undefined
    const life = new Life({ seed: i * 104729, group, auto: true, mode: i % 2 ? 'ancestor' : 'any' })
    const p = life.runToEnd()
    for (const e of p.log) {
      keys.add(e.key)
      if (e.big) keys.add('card.' + e.key)
    }
    for (const lang of LANGS) {
      for (const e of p.log) {
        const t = ev(lang, e.key, p.sex, { ...e.vars, name: 'X', age: e.age }).text
        if (t === e.key || /[{}[\]|]/.test(t)) bad.add(`${lang} ${e.key}: ${t}`)
      }
    }
  }
  // Choice buttons and questions.
  for (const ch of CHOICES) for (const o of ch.options) keys.add(`ch.${ch.id}.${o.id}.btn`)
  for (const lang of LANGS) for (const k of keys) {
    if (k.startsWith('card.')) continue
    if (!(k in TABLES[lang]) && !(k in EV_RU)) bad.add(`${lang} missing ${k}`)
  }
  expect([...bad].slice(0, 40)).toEqual([])
})
