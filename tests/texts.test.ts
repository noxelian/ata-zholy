import { expect, test } from 'vitest'
import { Life } from '../src/sim/engine'
import { ERA_IDS, ERAS } from '../src/sim/eras'
import { ev } from '../src/i18n/texts'
import { TABLES } from '../src/i18n/texts'
import { CHOICES } from '../src/sim/content'
import { GROUPS } from '../src/sim/birth'
import type { Lang } from '../src/sim/types'

const LANGS: Lang[] = ['ru', 'kz', 'en']
const EV_RU = TABLES.ru

test('every key in Russian exists in Kazakh and English', () => {
  const ru = Object.keys(EV_RU)
  for (const l of ['kz', 'en'] as const) {
    const missing = ru.filter(k => !(k in TABLES[l]))
    expect(missing, `missing in ${l}`).toEqual([])
  }
})

test('every text a life can show is translated and fully filled in', { timeout: 120000 }, () => {
  const bad = new Set<string>()
  const keys = new Set<string>()
  for (let i = 1; i <= 4000; i++) {
    const group = i % 3 === 0 ? GROUPS[i % GROUPS.length] : undefined
    // Every era, in turn; peoples can be chosen only in the XX century.
    const era = ERA_IDS[i % ERA_IDS.length]
    const life = new Life({ seed: i * 104729, group: era === 'xx' ? group : undefined, era, auto: true, mode: i % 2 ? 'ancestor' : 'any' })
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
  const ALL_CHOICES = [...new Set([...CHOICES, ...ERA_IDS.flatMap(e => ERAS[e]!.choices)])]
  for (const ch of ALL_CHOICES) if (!ch.variants) for (const o of ch.options) keys.add(`ch.${ch.id}.${o.id}.btn`)
  // Choices with variants: every variant seen in lives needs buttons for every option.
  for (const k of [...keys]) {
    if (!k.startsWith('ch.')) continue
    // Choice ids may contain dots: find the choice whose `ch.<id>.<option>.` prefix fits, the rest is the variant.
    for (const ch of ALL_CHOICES) {
      if (!ch.variants) continue
      for (const o of ch.options) {
        const pre = `ch.${ch.id}.${o.id}.`
        if (k.startsWith(pre) && !k.endsWith('.btn') && !k.includes('.btn.') && !k.includes('.hint')) {
          const variant = k.slice(pre.length)
          for (const o2 of ch.options) keys.add(`ch.${ch.id}.${o2.id}.btn.${variant}`)
        }
      }
    }
  }
  for (const lang of LANGS) for (const k of keys) {
    if (k.startsWith('card.')) continue
    if (!(k in TABLES[lang]) && !(k in EV_RU)) bad.add(`${lang} missing ${k}`)
  }
  expect([...bad].slice(0, 40)).toEqual([])
})
