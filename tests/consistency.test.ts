import { expect, test } from 'vitest'
import { Life, decodeLife } from '../src/sim/engine'
import { GROUPS } from '../src/sim/birth'

function lives(n: number, mode: 'ancestor' | 'any') {
  const out = []
  for (let i = 1; i <= n; i++) {
    const seed = (i * 2246822519) >>> 0
    const life = new Life({ seed, mode, group: i % 4 === 0 ? GROUPS[i % GROUPS.length] : undefined })
    let guard = 0
    while (life.p.alive && guard++ < 200) {
      let s = life.next()
      while (s.kind === 'choice') s = life.choose((seed >> guard % 16) % s.choice.options.length)
    }
    out.push(life.p)
  }
  return out
}

test('every ancestor leaves a surviving child', () => {
  for (const p of lives(4000, 'ancestor')) expect(p.childYears.length, `seed ${p.seed}`).toBeGreaterThan(0)
})

test('lives make sense', { timeout: 120000 }, () => {
  const bad: string[] = []
  for (const p of lives(6000, 'ancestor').concat(lives(3000, 'any'))) {
    const keys = p.log.map(e => e.key)
    const yearOf = (k: string) => p.log.find(e => e.key === k)?.year
    // Nothing that needs freedom happens in captivity or in ALZhIR.
    const spans: [string, string[]][] = [
      ['war.captive', ['captive.back', 'death.captive']],
      ['spouse.arrested.alzhir', ['alzhir.free']],
      ['repressed.camp', ['camp.free']],
      ['repressed.commuted', ['camp.free']],
      ['trudarmy', ['trudarmy.back']],
      ['war.draft', ['war.back', 'war.back.medal', 'war.invalid', 'war.captive', 'death.war', 'death.missing']],
      ['war.volunteer', ['war.back', 'war.back.medal', 'war.invalid', 'war.captive', 'death.war', 'death.missing']],
    ]
    for (const [from, to] of spans) {
      const i = keys.indexOf(from)
      if (i < 0) continue
      let j = keys.findIndex((k, n) => n > i && to.includes(k))
      if (j < 0) j = keys.length
      const inside = keys.slice(i + 1, j).filter(k => /^(war\.draft|graduate|marry|widow\.remarry|child\.|ch\.homefront|ch\.study|ch\.virgin|ch\.front|rare\.(zhambyl|auezov|baikonur|car|plane|wolf_hunt|brother)|tex\.(?!hard))/.test(k))
      if (inside.length) bad.push(`${p.seed}: ${from} then ${inside.join(',')}`)
    }
    // Abroad until the return: nothing that only happens at home.
    for (const fled of ['ch.collect.flee', 'ch.famine.leave']) {
      const i = keys.indexOf(fled)
      if (i < 0) continue
      let j = keys.findIndex((k, n) => n > i && k === 'flight.return')
      if (j < 0) j = keys.length
      const inside = keys.slice(i + 1, j).filter(k => /^(war\.draft|ch\.postwar|ch\.career|ch\.virgin|hist\.1941|repressed)/.test(k))
      if (inside.length) bad.push(`${p.seed}: abroad but ${inside.join(',')}`)
    }
    // Family texture follows the real family.
    for (const e of p.log) {
      if (e.key === 'tex.family.school' && !p.childYears.some(b => e.year - b === 7)) bad.push(`${p.seed}: school without a 7-year-old`)
      if (e.key === 'tex.old.grandkids' && !p.log.some(x => x.key === 'grandchild' && x.year <= e.year)) bad.push(`${p.seed}: grandkids before a grandchild`)
      if (e.key === 'tex.kolkhoz.workdays' && e.year >= 1966) bad.push(`${p.seed}: workdays in ${e.year}`)
    }
    // A husband is lost only once.
    if (keys.includes('spouse.war') && keys.some(k => k.startsWith('spouse.arrested'))) bad.push(`${p.seed}: husband arrested and then killed at the front`)
    // An execution is the end of a life.
    if (keys.includes('repressed.shot') && p.deathCause !== 'shot') bad.push(`${p.seed}: shot but lived`)
    // A grandchild needs a grown child.
    const g = yearOf('grandchild')
    if (g !== undefined && g - p.childYears[0] < 18) bad.push(`${p.seed}: grandchild too early`)
    // The Alash autonomy was proclaimed in December 1917.
    const a = yearOf('hist.alash')
    if (a !== undefined && a !== 1917) bad.push(`${p.seed}: alash in ${a}`)
    const z = yearOf('spouse.arrested.alzhir')
    if (z !== undefined && z < 1938) bad.push(`${p.seed}: ALZhIR in ${z}`)
  }
  expect(bad.slice(0, 20)).toEqual([])
})

test('lives from the review replay without contradictions', () => {
  for (const code of ['3.7uxzfm..000.', '3.1knsxik..000.', '3.1h1ygy6..000.', '3.1v41.kazakh.010110201.', '3.10lu..01011011.']) {
    const d = decodeLife(code)!
    const p = new Life({ seed: d.seed, group: d.group, choices: d.choices, mode: d.mode }).runToEnd()
    const keys = p.log.map(e => e.key)
    expect(p.childYears.length, code).toBeGreaterThan(0)
    expect(keys.includes('spouse.war') && keys.some(k => k.startsWith('spouse.arrested')), code).toBe(false)
    const camp = p.log.find(e => e.key === 'repressed.camp' || e.key === 'repressed.commuted')?.year
    const out = p.log.find(e => e.key === 'camp.free')?.year ?? 9999
    if (camp) expect(p.log.some(e => (e.key === 'marry' || e.key === 'widow.remarry') && e.year > camp && e.year < out), code).toBe(false)
  }
})

test('broken links are refused', () => {
  for (const code of ['3.1.bad.0.', '3.1.kazakh.x.', '3..kazakh..', '4.1...', '3.-5...', '3.zzzzzzzzzz...', '3.1.kazakh.9.']) {
    expect(decodeLife(code), code).toBeNull()
  }
  expect(decodeLife('3.abc.kazakh.012.')).not.toBeNull()
})

test('earlier eras make sense', { timeout: 180000 }, () => {
  const bad: string[] = []
  for (const era of ['xv', 'xviii', 'xix'] as const) {
    for (let i = 1; i <= 3000; i++) {
      const seed = (i * 2654435761 + era.length) >>> 0
      const life = new Life({ seed, era, mode: i % 3 ? 'ancestor' : 'any' })
      let guard = 0
      while (life.p.alive && guard++ < 200) {
        let s = life.next()
        while (s.kind === 'choice') {
          if (life.p.flags.has('captive')) bad.push(`${era} ${seed}: asked ${s.choice.id} in ${s.year} while captive`)
          s = life.choose((seed >> guard % 16) % s.choice.options.length)
        }
      }
      const p = life.p
      const keys = p.log.map(e => e.key)
      // No railways, teachers or tractors before the XX century.
      if (p.job && !['job.herder', 'job.craft', 'job.trade', 'job.horses'].includes(p.job)) bad.push(`${era} ${seed}: job ${p.job}`)
      // In captivity: no personal choices or family events until freed.
      const i0 = keys.findIndex(k => /^e1[589]\.captive$/.test(k))
      if (i0 >= 0) {
        let j = keys.findIndex((k, n) => n > i0 && /captive\.(free|back)|ransom|death\./.test(k))
        if (j < 0) j = keys.length
        const inside = keys.slice(i0 + 1, j).filter(k => /^(ch\.|marry|child\.)/.test(k) && !/^ch\.e1[589]\.ransom/.test(k))
        if (inside.length) bad.push(`${era} ${seed}: captive then ${inside.join(',')}`)
      }
      // Nobody dies in a rising they left by going abroad.
      if (p.deathCause === 'battle' && p.way === 'abroad') bad.push(`${era} ${seed}: battle death abroad`)
      // Every ancestor leaves a child.
      if (life.mode === 'ancestor' && !p.childYears.length) bad.push(`${era} ${seed}: ancestor without a child`)
    }
  }
  expect(bad.slice(0, 20)).toEqual([])
})

test('captives of 1723 get no choices until freed', () => {
  for (const code of ['3.r..02..xviii', '3.eoi..002..xviii']) {
    const d = decodeLife(code)!
    const life = new Life({ seed: d.seed, choices: d.choices, mode: d.mode, era: d.era })
    let guard = 0
    while (life.p.alive && guard++ < 200) {
      let s = life.next()
      while (s.kind === 'choice') {
        expect(life.p.flags.has('captive'), `${code}: ${s.choice.id} in ${s.year} while captive`).toBe(false)
        s = life.choose(0)
      }
    }
  }
})
