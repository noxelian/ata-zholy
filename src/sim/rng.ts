/** Small seeded random generator (mulberry32). The same seed always gives the same life. */
export class Rng {
  private s: number
  constructor(seed: number) {
    this.s = seed >>> 0
  }
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  chance(p: number): boolean {
    return this.next() < p
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]
  }
  /** Picks a key of a weight table. */
  weighted<K extends string>(table: Partial<Record<K, number>>): K {
    const entries = Object.entries(table) as [K, number][]
    const total = entries.reduce((s, [, w]) => s + w, 0)
    let r = this.next() * total
    for (const [k, w] of entries) {
      r -= w
      if (r < 0) return k
    }
    return entries[entries.length - 1][0]
  }
}

export function randomSeed(): number {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  return a[0] || 1
}
