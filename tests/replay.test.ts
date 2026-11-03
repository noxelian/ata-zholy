import { expect, test } from 'vitest'
import { Life, decodeLife, encodeLife } from '../src/sim/engine'

test('a shared link replays exactly the same life', () => {
  for (let i = 1; i <= 500; i++) {
    const seed = (i * 2654435761) >>> 0
    const a = new Life({ seed, mode: i % 5 ? 'ancestor' : 'any' })
    let guard = 0
    while (a.p.alive && guard++ < 200) {
      let s = a.next()
      while (s.kind === 'choice') s = a.choose((seed + guard) % s.choice.options.length)
    }
    const code = decodeLife(encodeLife(seed, undefined, a.choices, a.mode))!
    const b = new Life({ seed: code.seed, group: code.group, choices: code.choices, mode: code.mode }).runToEnd()
    expect(b.log.map(e => e.key)).toEqual(a.p.log.map(e => e.key))
    expect(b.deathYear).toBe(a.p.deathYear)
  }
})
