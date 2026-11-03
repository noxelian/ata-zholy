import { expect, test } from 'vitest'
import { writeFileSync, mkdirSync } from 'node:fs'
import { Life } from '../src/sim/engine'
import { TABLES, ev } from '../src/i18n/texts'
import { CHOICES_19 } from '../src/sim/era19'
import type { Person } from '../src/sim/types'

const aliveIn = (p: Person, y: number) => p.birthYear <= y && (p.deathYear ?? 9999) >= y

// XIX century: child deaths, juts, cholera and the risings should match the estimates in docs/era-19.md §3 and §6.
test('XIX century calibration', { timeout: 180000 }, () => {
  const lives: Person[] = []
  for (let i = 1; i <= 10000; i++) lives.push(new Life({ seed: i * 7919, era: 'xix', mode: 'any', auto: true }).runToEnd())
  const u5 = lives.filter(p => (p.deathAge ?? 0) < 5).length / lives.length
  const u1 = lives.filter(p => (p.deathAge ?? 0) < 1).length / lives.length
  const adults = lives.filter(p => (p.deathAge ?? 0) >= 20)
  const deaths = (cause: string) => lives.filter(p => p.deathCause === cause).length
  // The west in the big jut of 1879–80: deaths in those two years among people living there.
  const west = lives.filter(p => ['oral', 'aktobe', 'kostanai'].includes(p.region) && aliveIn(p, 1879) && p.way !== 'abroad')
  const west1879 = west.filter(p => (p.deathYear ?? 0) <= 1880).length / Math.max(1, west.length)
  const alive1892 = lives.filter(p => aliveIn(p, 1892))
  const cholera1892 = alive1892.filter(p => p.deathCause === 'cholera' && p.deathYear === 1892).length / Math.max(1, alive1892.length)
  const rebels = (flag: string) => lives.filter(p => p.log.some(e => e.key === flag))
  const fell = (ps: Person[]) => ps.filter(p => p.deathCause === 'battle' || p.deathCause === 'katorga').length / Math.max(1, ps.length)
  const kenesary = rebels('ch.e19.kenesary.join')
  const isatai = rebels('ch.e19.isatai.join')
  const anc = Array.from({ length: 2500 }, (_, i) => new Life({ seed: i * 104729 + 3, era: 'xix', auto: true }).runToEnd())
  const choiceCount = (p: Person) => p.log.filter(e => e.key.startsWith('ch.')).length
  const r = {
    under1: u1,
    under5: u5,
    meanAdultDeathAge: adults.reduce((s, p) => s + (p.deathAge ?? 0), 0) / adults.length,
    shareJutDeaths: deaths('jut') / lives.length,
    west1879: west.length,
    diedWest1879_80: west1879,
    cholera1892,
    kenesaryJoined: kenesary.length,
    kenesaryFell: fell(kenesary),
    isataiJoined: isatai.length,
    isataiFell: fell(isatai),
    ancestorChoices: anc.reduce((s, p) => s + choiceCount(p), 0) / anc.length,
    ancestorFewChoices: anc.filter(p => choiceCount(p) < 5).length / anc.length,
    ancestorWithChild: anc.filter(p => p.childYears.length > 0).length / anc.length,
    meanLife: anc.reduce((s, p) => s + (p.deathAge ?? 0), 0) / anc.length,
    sawCensus: anc.filter(p => p.log.some(e => e.key === 'e19.hist.census1897')).length / anc.length,
  }
  mkdirSync('test-results', { recursive: true })
  writeFileSync('test-results/era19.json', JSON.stringify(r, null, 1))
  // §3.1: 22% die in the first year, ≈1/3 before five.
  expect(r.under1, 'infant deaths ≈0.22').toBeGreaterThan(0.18)
  expect(r.under1).toBeLessThan(0.27)
  expect(r.under5, 'under-5 deaths ≈1/3').toBeGreaterThan(0.29)
  expect(r.under5).toBeLessThan(0.4)
  // The big jut adds hunger to ordinary deaths (~2.5% a year for all ages): two years ≈5–6%, with the jut ≈6–9%.
  expect(r.diedWest1879_80, 'deaths in the west in 1879–80').toBeGreaterThan(0.04)
  expect(r.diedWest1879_80).toBeLessThan(0.12)
  expect(r.shareJutDeaths, 'jut is a visible but not the main cause of death').toBeGreaterThan(0.005)
  expect(r.shareJutDeaths).toBeLessThan(0.06)
  // §3.3: cholera went along roads and towns; in the aul it was rare (estimate ≈0.1–0.3% of the living in 1892).
  expect(r.cholera1892).toBeLessThan(0.006)
  // §6.2: a rising cost a fighter about one life in five or four.
  expect(r.kenesaryFell, 'Kenesary fighters fell ≈0.2').toBeGreaterThan(0.08)
  expect(r.kenesaryFell).toBeLessThan(0.35)
  expect(r.isataiFell, 'Isatai fighters fell ≈0.25').toBeGreaterThan(0.12)
  expect(r.isataiFell).toBeLessThan(0.4)
  expect(r.ancestorWithChild).toBe(1)
  expect(r.ancestorChoices, '6–9 choices in a life on average').toBeGreaterThanOrEqual(5)
})

// Every text a XIX-century life can show exists in Russian (Kazakh and English come later).
test('XIX century texts exist in Russian', { timeout: 120000 }, () => {
  const ru = TABLES.ru
  const missing = new Set<string>()
  const keys = new Set<string>()
  for (let i = 1; i <= 4000; i++) {
    const life = new Life({ seed: i * 2654435761 >>> 0, era: 'xix', mode: i % 2 ? 'ancestor' : 'any' })
    let guard = 0
    while (life.p.alive && guard++ < 200) {
      let s = life.next()
      while (s.kind === 'choice') {
        keys.add(s.choice.q?.({ p: life.p, year: s.year, age: s.age } as never) ?? `chq.${s.choice.id}`)
        s = life.choose((i + guard) % s.choice.options.length)
      }
    }
    const p = life.p
    keys.add(`e19.birth.where`)
    keys.add(`e19.reg.${p.region}`)
    for (const e of p.log) {
      keys.add(e.key)
      if (e.big && !e.key.startsWith('ch.') && !e.key.startsWith('death.') && !e.key.startsWith('near.') && e.key.startsWith('e19.')) keys.add('card.' + e.key)
      const t = ev('ru', e.key, p.sex, { ...e.vars, name: 'X', age: e.age }).text
      if (t === e.key || /[{}[\]|]/.test(t)) missing.add(`${e.key}: ${t}`)
    }
    if (p.deathCause) keys.add(`card.death.${p.deathCause}`)
  }
  for (const ch of CHOICES_19) if (ch.id.startsWith('e19.')) for (const o of ch.options) keys.add(`ch.${ch.id}.${o.id}.btn`), keys.add(`ch.${ch.id}.${o.id}.hint`), keys.add(`ch.${ch.id}.${o.id}`)
  for (const k of keys) if (!(k in ru)) missing.add(`missing ${k}`)
  // Card lines are short and start in lower case.
  for (const [k, v] of Object.entries(ru)) {
    if (!k.startsWith('card.e19.')) continue
    const t = typeof v === 'string' ? v : v.t
    const plain = t.replace(/\[([^|\]]*)\|([^\]]*)\]/g, (_, a: string, b: string) => (a.length > b.length ? a : b))
    if (plain.length > 45 || plain[0] !== plain[0].toLowerCase()) missing.add(`card too long or capitalised: ${k}`)
  }
  expect([...missing].slice(0, 40)).toEqual([])
})
