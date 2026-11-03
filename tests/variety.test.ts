import { expect, test } from 'vitest'
import { writeFileSync, mkdirSync } from 'node:fs'
import { Life } from '../src/sim/engine'

// Targets from docs/razbor.md: lives must differ from each other and not stand still.
test('lives are varied and full', { timeout: 120000 }, () => {
  const n = 3000
  const paths: Record<string, number> = {}
  let choices = 0, quiet = 0, years = 0, firstSchool = 0, after45 = 0
  for (let i = 1; i <= n; i++) {
    const p = new Life({ seed: i * 7907, auto: true }).runToEnd()
    const ch = p.log.filter(e => e.key.startsWith('ch.'))
    const ids = ch.map(e => e.key.split('.').slice(1).join('.'))
    paths[ids.join('>')] = (paths[ids.join('>')] ?? 0) + 1
    choices += ch.length
    after45 += ch.filter(e => e.year > 1945).length
    if (ids[0]?.startsWith('school')) firstSchool++
    const ys = new Set(p.log.map(e => e.year))
    years += (p.deathAge ?? 0) + 1
    quiet += (p.deathAge ?? 0) + 1 - ys.size
  }
  const top = Math.max(...Object.values(paths)) / n
  const r = {
    choicesPerLife: choices / n,
    after1945PerLife: after45 / n,
    quietShare: quiet / years,
    topPathShare: top,
    firstChoiceSchool: firstSchool / n,
    distinctPaths: Object.keys(paths).length,
  }
  mkdirSync('test-results', { recursive: true })
  writeFileSync('test-results/variety.json', JSON.stringify(r, null, 1))
  expect(r.choicesPerLife).toBeGreaterThan(5.5)
  expect(r.after1945PerLife).toBeGreaterThan(2)
  expect(r.quietShare).toBeLessThan(0.35)
  expect(r.topPathShare).toBeLessThan(0.03)
  expect(r.firstChoiceSchool).toBeLessThan(0.4)
  expect(r.distinctPaths).toBeGreaterThan(1500)
})
