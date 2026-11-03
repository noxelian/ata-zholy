import { Rng } from './rng'
import type { ChoiceDef, Ctx, Group, LogEntry, Person, Step } from './types'
import { GROUPS, born, type BirthFacts } from './birth'
import { CHOICES, EVENTS, HAZARDS } from './events'

export const ENGINE_VERSION = 1
const MAX_AGE = 104

export interface LifeOptions {
  seed: number
  /** Force the ancestor's people; random by population otherwise. */
  group?: Group
  /** Replay recorded choices (shared links). */
  choices?: number[]
  /** Pick choices automatically like a typical person of the time (statistics runs). */
  auto?: boolean
  /** Copy birth facts (sex, people, region, year, way) from this person: used to compare with peers. */
  like?: BirthFacts
  /**
   * 'ancestor' (default): the person is someone's ancestor, so they survive at least until their first child —
   * deaths before that become close calls. 'any': any child of the time, can die at any age.
   */
  mode?: LifeMode
}
export type LifeMode = 'ancestor' | 'any'

/**
 * One life, advanced a year at a time. Everything comes from one seeded generator,
 * so the same seed + group + choices replays the same life.
 */
export class Life {
  readonly p: Person
  readonly choices: number[] = []
  private readonly r: Rng
  private readonly replay: number[]
  private readonly auto: boolean
  private pending: ChoiceDef | null = null
  private done = new Set<string>()
  private started = false
  private yearStart = 0
  readonly mode: LifeMode

  constructor(o: LifeOptions) {
    this.r = new Rng(o.seed)
    this.replay = o.choices ? [...o.choices] : []
    this.auto = !!o.auto
    this.mode = o.mode ?? 'ancestor'
    this.p = born(this.r, o.seed, o.group, o.like)
    if (this.mode === 'ancestor') this.p.flags.add('ancestor')
  }

  /** Ancestor mode: the person must live to leave a child. */
  get ancestor(): boolean {
    return this.mode === 'ancestor'
  }

  get waiting(): ChoiceDef | null {
    return this.pending
  }

  private ctx(): Ctx {
    return { p: this.p, year: this.p.year, age: this.p.age, r: this.r }
  }

  next(): Step {
    const p = this.p
    if (this.pending) throw new Error('choice pending')
    if (!p.alive) return { kind: 'death', year: p.year, age: p.age, entries: [] }
    if (!this.started) {
      this.started = true
    } else {
      p.year++
      p.age++
    }
    // The birth lines are written by born(); show them with the first year.
    this.yearStart = p.year === p.birthYear ? 0 : p.log.length
    return this.runChoices() ?? this.finishYear()
  }

  choose(i: number): Step {
    const ch = this.pending
    if (!ch) throw new Error('no choice pending')
    this.pending = null
    this.applyChoice(ch, i)
    return this.runChoices() ?? this.finishYear()
  }

  /** Choices come first in a year: they change what can happen. Returns a step if the player must choose. */
  private runChoices(): Step | null {
    const p = this.p
    for (const ch of CHOICES) {
      if (this.done.has(ch.id) || !ch.when(this.ctx())) continue
      this.done.add(ch.id)
      let pick: number | undefined
      if (this.replay.length) pick = this.replay.shift()
      else if (this.auto) pick = Number(this.r.weighted(Object.fromEntries(ch.typical(this.ctx()).map((w, i) => [String(i), w]))))
      if (pick === undefined) {
        this.pending = ch
        const entries = p.log.slice(this.yearStart)
        // Lines already shown with the question are not repeated after the answer.
        this.yearStart = p.log.length
        return { kind: 'choice', year: p.year, age: p.age, choice: ch, entries }
      }
      this.applyChoice(ch, pick)
    }
    return null
  }

  private applyChoice(ch: ChoiceDef, i: number) {
    const opt = ch.options[Math.max(0, Math.min(ch.options.length - 1, i))]
    this.choices.push(ch.options.indexOf(opt))
    this.log(`ch.${ch.id}.${opt.id}`, 'calm')
    opt.apply(this.ctx())
  }

  private finishYear(): Step {
    const p = this.p
    const start = this.yearStart
    for (const ev of EVENTS) {
      if (ev.once && this.done.has(ev.id)) continue
      const c = this.ctx()
      if (!ev.when(c)) continue
      if (!this.r.chance(ev.chance(c))) continue
      if (ev.once) this.done.add(ev.id)
      const res = ev.apply?.(c)
      if (res && res.silent) continue
      this.log(res?.key ?? ev.id, ev.tone ?? 'calm', res?.vars, ev.big)
      if (res && res.die) this.die(res.die)
      if (!p.alive) break
    }
    if (p.alive) this.deathRoll()
    const entries = p.log.slice(start)
    if (!p.alive) return { kind: 'death', year: p.year, age: p.age, entries }
    return { kind: 'year', year: p.year, age: p.age, entries }
  }

  private deathRoll() {
    const p = this.p
    const c = this.ctx()
    const risks = HAZARDS.map(h => ({ id: h.id, q: Math.max(0, Math.min(1, h.q(c))) })).filter(h => h.q > 0)
    let survive = 1
    for (const h of risks) survive *= 1 - h.q
    const qTotal = p.age >= MAX_AGE ? 1 : 1 - survive
    if (!this.r.chance(qTotal)) return
    const sum = risks.reduce((s, h) => s + h.q, 0) || 1
    let x = this.r.next() * sum
    let cause = risks[risks.length - 1]?.id ?? 'old'
    for (const h of risks) {
      x -= h.q
      if (x < 0) {
        cause = h.id
        break
      }
    }
    this.die(cause)
  }

  die(cause: string) {
    const p = this.p
    if (!p.alive) return
    if (this.mode === 'ancestor' && p.childYears.length === 0 && p.age < 95) {
      // A close call instead of death: this person still has descendants to leave.
      if (cause === 'shot') {
        // The sentence was commuted: rewrite the arrest line instead of telling of an execution.
        p.flags.add('camp')
        const arrest = [...p.log].reverse().find(e => e.key === 'repressed.shot')
        if (arrest) arrest.key = 'repressed.commuted'
        return
      }
      const flag = `near_${cause}`
      if (!p.flags.has(flag)) {
        p.flags.add(flag)
        this.log(`near.${cause}`, 'bad', undefined, ['famine', 'famine21', 'war', 'missing', 'flight', 'deport', 'shot', 'camp', 'trudarmy'].includes(cause))
      }
      return
    }
    p.alive = false
    p.deathYear = p.year
    p.deathAge = p.age
    p.deathCause = cause
    this.log(`death.${cause}`, 'grief', undefined, true)
  }

  log(key: string, tone: LogEntry['tone'], vars?: LogEntry['vars'], big?: boolean) {
    this.p.log.push({ year: this.p.year, age: this.p.age, key, vars, tone, big })
  }

  /** Runs to the end without stopping (statistics, replays). */
  runToEnd(): Person {
    let guard = 0
    while (this.p.alive && guard++ < 200) {
      let s = this.next()
      while (s.kind === 'choice') s = this.choose(0)
    }
    return this.p
  }
}

/** Life link code: version.seed.group.choices.mode — seed in base36. */
export function encodeLife(seed: number, group: Group | undefined, choices: number[], mode: LifeMode = 'ancestor'): string {
  return [ENGINE_VERSION, seed.toString(36), group ?? '', choices.join(''), mode === 'any' ? 'a' : ''].join('.')
}

export function decodeLife(code: string): { seed: number; group?: Group; choices: number[]; mode: LifeMode } | null {
  const [v, s, g, ch, m] = code.split('.')
  if (Number(v) !== ENGINE_VERSION || !s) return null
  const seed = parseInt(s, 36)
  if (!Number.isFinite(seed) || seed <= 0 || seed > 0xffffffff || !/^[0-9a-z]+$/.test(s)) return null
  if (g && !(GROUPS as string[]).includes(g)) return null
  if (ch && !/^[0-2]*$/.test(ch)) return null
  return { seed, group: (g || undefined) as Group | undefined, choices: (ch ?? '').split('').filter(Boolean).map(Number), mode: m === 'a' ? 'any' : 'ancestor' }
}
