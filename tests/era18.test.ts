import { expect, test } from 'vitest'
import { writeFileSync, mkdirSync } from 'node:fs'
import { Life } from '../src/sim/engine'
import type { Person } from '../src/sim/types'

// XVIII century: losses of 1723–1727 and child deaths should match the estimates in docs/era-18.md §3.
test('XVIII century calibration', { timeout: 120000 }, () => {
  const lives: Person[] = []
  for (let i = 1; i <= 8000; i++) lives.push(new Life({ seed: i * 7919, era: 'xviii', mode: 'any', auto: true }).runToEnd())
  const hit = lives.filter(p => ['zhetisu', 'shygys', 'syr'].includes(p.log.find(e => e.key.startsWith('e18.birth'))?.vars?.region?.toString().split('.')[2] ?? '') && p.birthYear <= 1723 && (p.deathYear ?? 0) >= 1723)
  const diedAktaban = hit.filter(p => (p.deathYear ?? 0) <= 1727).length / Math.max(1, hit.length)
  const u5 = lives.filter(p => (p.deathAge ?? 0) < 5).length / lives.length
  const anc = Array.from({ length: 2000 }, (_, i) => new Life({ seed: i * 104729 + 3, era: 'xviii', auto: true }).runToEnd())
  const r = {
    hit1723: hit.length,
    diedAktaban,
    under5: u5,
    ancestorChoices: anc.reduce((s, p) => s + p.log.filter(e => e.key.startsWith('ch.')).length, 0) / anc.length,
    ancestorWithChild: anc.filter(p => p.childYears.length > 0).length / anc.length,
    meanLife: anc.reduce((s, p) => s + (p.deathAge ?? 0), 0) / anc.length,
  }
  mkdirSync('test-results', { recursive: true })
  writeFileSync('test-results/era18.json', JSON.stringify(r, null, 1))
  expect(r.diedAktaban, 'deaths 1723–27 in the hardest-hit regions ≈0.3 (+ ordinary deaths)').toBeGreaterThan(0.25)
  expect(r.diedAktaban).toBeLessThan(0.5)
  expect(r.under5, 'under-5 deaths ≈0.45').toBeGreaterThan(0.38)
  expect(r.under5).toBeLessThan(0.55)
  expect(r.ancestorWithChild).toBe(1)
  expect(r.ancestorChoices).toBeGreaterThan(4)
})
