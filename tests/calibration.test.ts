import { writeFileSync, mkdirSync } from 'node:fs'
import { expect, test } from 'vitest'
import { Life } from '../src/sim/engine'
import type { Person } from '../src/sim/types'

function run(n: number, group?: Person['group'], mode: 'any' | 'ancestor' = 'any') {
  const out: Person[] = []
  for (let i = 1; i <= n; i++) out.push(new Life({ seed: i * 7919, group, auto: true, mode }).runToEnd())
  return out
}

test('calibration report', { timeout: 120000 }, () => {
  const anc = run(5000, undefined, 'ancestor')
  const ancestor = {
    mean_life: (anc.reduce((s, p) => s + (p.deathAge ?? 0), 0) / anc.length).toFixed(1),
    choices_per_life: (anc.reduce((s, p) => s + p.log.filter(e => e.key.startsWith('ch.')).length, 0) / anc.length).toFixed(2),
    near_per_life: (anc.reduce((s, p) => s + p.log.filter(e => e.key.startsWith('near.')).length, 0) / anc.length).toFixed(2),
    with_children: ((100 * anc.filter(p => p.children > 0).length) / anc.length).toFixed(1) + '%',
  }
  const all = run(20000)
  const kz = all.filter(p => p.group === 'kazakh')
  const share = (a: Person[], f: (p: Person) => boolean) => ((100 * a.filter(f).length) / Math.max(1, a.length)).toFixed(1) + '%'
  const alive1930 = kz.filter(p => (p.deathYear ?? 9999) >= 1930 && p.birthYear <= 1930)
  const famineDead = alive1930.filter(p => (p.deathYear ?? 0) <= 1933)
  const byGroup: Record<string, number> = {}
  all.forEach(p => (byGroup[p.group] = (byGroup[p.group] ?? 0) + 1))
  const men1910_25 = all.filter(p => p.sex === 'm' && p.birthYear >= 1910 && p.birthYear <= 1925 && (p.deathYear ?? 9999) >= 1941 && p.group !== 'german' && p.group !== 'korean')
  const drafted = men1910_25.filter(p => p.log.some(e => e.key.startsWith('war.') || e.key === 'death.war' || e.key === 'death.missing'))
  const warDead = men1910_25.filter(p => p.deathCause === 'war' || p.deathCause === 'missing' || p.deathCause === 'captive')
  const mean = (a: Person[]) => (a.reduce((s, p) => s + (p.deathAge ?? 0), 0) / Math.max(1, a.length)).toFixed(1)
  const causes: Record<string, number> = {}
  all.forEach(p => (causes[p.deathCause ?? '?'] = (causes[p.deathCause ?? '?'] ?? 0) + 1))
  const choices = all.reduce((s, p) => s + p.log.filter(e => e.key.startsWith('ch.')).length, 0) / all.length
  mkdirSync('test-results', { recursive: true })
  writeFileSync('test-results/calibration.json',
    JSON.stringify(
      {
        ancestor,
        groups: byGroup,
        died_before_1: share(all, p => (p.deathAge ?? 0) < 1),
        died_before_5: share(all, p => (p.deathAge ?? 0) < 5),
        reached_60: share(all, p => (p.deathAge ?? 0) >= 60),
        mean_life_all: mean(all),
        mean_life_kz: mean(kz),
        kz_alive_1930_died_by_1933: share(alive1930, p => famineDead.includes(p)),
        men_1910_25_alive41_drafted: share(men1910_25, p => drafted.includes(p)),
        men_1910_25_alive41_war_dead: share(men1910_25, p => warDead.includes(p)),
        war_dead_of_drafted: share(drafted, p => warDead.includes(p)),
        repressed: share(all, p => p.flags.has('repressed_any')),
        choices_per_life: choices.toFixed(2),
        causes,
      },
      null,
      1,
    ),
  )
  // Historical ranges (docs/history-data.md, section 7).
  const pct = (a: Person[], f: (p: Person) => boolean) => a.filter(f).length / Math.max(1, a.length)
  const famine = pct(alive1930, p => famineDead.includes(p) && (p.deathCause === 'famine' || p.deathCause === 'flight'))
  expect(famine, 'Asharshylyk: 33–42% of Kazakhs').toBeGreaterThan(0.33)
  expect(famine).toBeLessThan(0.45)
  const draft = pct(men1910_25, p => drafted.includes(p))
  expect(draft, 'drafted ~0.8').toBeGreaterThan(0.7)
  expect(draft).toBeLessThan(0.88)
  const warD = pct(drafted, p => warDead.includes(p))
  expect(warD, 'killed of drafted ~0.35–0.45').toBeGreaterThan(0.33)
  expect(warD).toBeLessThan(0.48)
  const u5 = pct(all.filter(p => p.birthYear <= 1915), p => (p.deathAge ?? 0) < 5)
  expect(u5, 'under-5 deaths before 1915 ~0.38–0.40').toBeGreaterThan(0.32)
  expect(u5).toBeLessThan(0.46)
})
