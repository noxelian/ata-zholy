import { expect, test } from 'vitest'
import { writeFileSync, mkdirSync } from 'node:fs'
import { Life } from '../src/sim/engine'
import type { Person } from '../src/sim/types'

// XV century: child deaths, war losses and choices should match the estimates in docs/era-15.md §3, §6.
test('XV century calibration', { timeout: 120000 }, () => {
  const lives: Person[] = []
  for (let i = 1; i <= 8000; i++) lives.push(new Life({ seed: i * 7919, era: 'xv', mode: 'any', auto: true }).runToEnd())
  const u5 = lives.filter(p => (p.deathAge ?? 0) < 5).length / lives.length
  // Men who reached 16: share who died in war (battles, a sultan's service, raids on the aul).
  const men = lives.filter(p => p.sex === 'm' && (p.deathAge ?? 0) >= 16)
  const war = men.filter(p => ['battle', 'nuker', 'raid', 'oirat', 'breakup'].includes(p.deathCause ?? '')).length / Math.max(1, men.length)
  const adults = lives.filter(p => (p.deathAge ?? 0) >= 15)
  const anc = Array.from({ length: 2000 }, (_, i) => new Life({ seed: i * 104729 + 3, era: 'xv', auto: true }).runToEnd())
  const choices = anc.map(p => p.log.filter(e => e.key.startsWith('ch.')).length)
  const r = {
    under5: u5,
    menWarDeaths: war,
    adultMeanLife: adults.reduce((s, p) => s + (p.deathAge ?? 0), 0) / Math.max(1, adults.length),
    captive: lives.filter(p => p.log.some(e => e.key === 'e15.captive')).length / lives.length,
    ancestorChoices: choices.reduce((a, b) => a + b, 0) / anc.length,
    ancestorChoicesMin: Math.min(...choices),
    ancestorUnder5Choices: choices.filter(n => n < 5).length / anc.length,
    ancestorWithChild: anc.filter(p => p.childYears.length > 0).length / anc.length,
    meanLife: anc.reduce((s, p) => s + (p.deathAge ?? 0), 0) / anc.length,
    exodus: anc.filter(p => p.log.some(e => e.key.startsWith('ch.e15.exodus'))).length / anc.length,
    rareWhiteFelt: anc.filter(p => p.log.some(e => e.key === 'e15.white_felt')).length / anc.length,
    rareAsan: anc.filter(p => p.log.some(e => e.key === 'e15.rare.asan')).length / anc.length,
    causes: Object.fromEntries(Object.entries(lives.reduce<Record<string, number>>((m, p) => ((m[p.deathCause ?? '?'] = (m[p.deathCause ?? '?'] ?? 0) + 1), m), {})).map(([k, v]) => [k, +(v / lives.length).toFixed(4)])),
  }
  mkdirSync('test-results', { recursive: true })
  writeFileSync('test-results/era15.json', JSON.stringify(r, null, 1))
  expect(r.under5, 'under-5 deaths ≈0.45').toBeGreaterThan(0.38)
  expect(r.under5).toBeLessThan(0.55)
  expect(r.menWarDeaths, 'war deaths of grown men: a few percent to ~15%').toBeGreaterThan(0.02)
  expect(r.menWarDeaths).toBeLessThan(0.18)
  expect(r.ancestorWithChild).toBe(1)
  expect(r.ancestorChoices).toBeGreaterThan(5)
  expect(r.rareWhiteFelt, 'rare moments stay rare').toBeLessThan(0.1)
  expect(r.rareAsan).toBeLessThan(0.1)
})

test('XV century: any answers still leave a child, and a link replays the same life', () => {
  for (let i = 1; i <= 1500; i++) {
    const seed = (i * 2654435761) >>> 0
    const a = new Life({ seed, era: 'xv' })
    let guard = 0
    while (a.p.alive && guard++ < 200) {
      let s = a.next()
      while (s.kind === 'choice') s = a.choose((seed + guard) % s.choice.options.length)
    }
    expect(a.p.childYears.length, `seed ${seed}`).toBeGreaterThan(0)
    const b = new Life({ seed, era: 'xv', choices: a.choices }).runToEnd()
    expect(b.log.map(e => e.key)).toEqual(a.p.log.map(e => e.key))
  }
})
