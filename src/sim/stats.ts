import { Life } from './engine'
import type { Person } from './types'

export interface PeerStats {
  /** Of 100 children born like this one, how many reached 5 / 60. */
  survive5: number
  survive60: number
  /** Of 100 peers, how many died younger than this person (only after death). */
  outlived: number
}

/** Simulates `n` lives with the same birth facts and typical choices. Seeds are fixed so numbers are stable. */
export function peerStats(p: Person, n = 1000): PeerStats {
  let s5 = 0
  let s60 = 0
  let younger = 0
  const like = { sex: p.sex, group: p.group, region: p.region, birthYear: p.birthYear, way: p.wayAtBirth }
  for (let i = 0; i < n; i++) {
    const peer = new Life({ seed: (p.seed ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0 || 1, like, auto: true, mode: 'any' }).runToEnd()
    const a = peer.deathAge ?? 0
    if (a >= 5) s5++
    if (a >= 60) s60++
    if (p.deathAge !== undefined && a < p.deathAge) younger++
  }
  return { survive5: Math.round((100 * s5) / n), survive60: Math.round((100 * s60) / n), outlived: Math.round((100 * younger) / n) }
}
