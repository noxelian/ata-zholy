/**
 * Shared parts of the eras before censuses (XV, XVIII, XIX centuries): a nomadic Kazakh birth, mortality without
 * medicine (estimates, docs/era-*.md section 3), family life and everyday moments reused from the XX century.
 * All probabilities here are estimates, and the game says so on screen.
 */
import type { Rng } from './rng'
import type { ChoiceDef, Ctx, EventDef, Group, Hazard, Person, Region, Sex, Way } from './types'
import type { BirthFacts } from './birth'
import { pickName } from './names'
import { CHOICES, EVENTS } from './content'

export interface EarlyBirth {
  /** Text prefix of the era, e.g. 'e18'. */
  prefix: string
  /** Name list key, e.g. 'kz18'. */
  names: string
  years: [number, number]
  /** Weight of a birth year (fewer births in catastrophes). */
  yearWeight?: (y: number) => number
  region: Partial<Record<Region, number>>
  way: (reg: Region) => Partial<Record<Way, number>>
}

/** A newborn of an early era. Same order of random draws as the XX century so seeds stay stable within an era. */
export function bornEarly(cfg: EarlyBirth) {
  return (r: Rng, seed: number, _group?: Group, like?: BirthFacts): Person => {
    const yw: Record<string, number> = {}
    for (let y = cfg.years[0]; y <= cfg.years[1]; y++) yw[y] = cfg.yearWeight?.(y) ?? 1
    const year = like?.birthYear ?? Number(r.weighted(yw))
    const group: Group = 'kazakh'
    const sex: Sex = like?.sex ?? (r.chance(0.512) ? 'm' : 'f')
    const region: Region = like?.region ?? r.weighted(cfg.region)
    const way: Way = like?.way ?? r.weighted(cfg.way(region))
    const p: Person = {
      seed,
      era: 'xx',
      sex,
      group,
      region,
      birthYear: year,
      name: pickName(r, cfg.names, sex),
      way,
      wayAtBirth: way,
      place: region,
      year,
      age: 0,
      alive: true,
      literate: false,
      edu: 'none',
      job: null,
      spouse: null,
      children: 0,
      childrenLost: 0,
      childYears: [],
      grandchildren: 0,
      flags: new Set(),
      log: [],
    }
    const siblings = r.int(2, 7)
    p.log.push({ year, age: 0, key: `${cfg.prefix}.birth.${way}`, vars: { region: `${cfg.prefix}.reg.${region}`, sib: siblings }, tone: 'good' })
    p.log.push({ year, age: 0, key: `${cfg.prefix}.ctx.birth`, tone: 'history' })
    return p
  }
}

/** Yearly death risk without medicine (estimate; under-5 deaths ≈0.45, docs/era-18.md §3.1, §3.6). */
export function earlyBaseQ(age: number): number {
  if (age === 0) return 0.28
  if (age < 5) return 0.065
  if (age < 15) return 0.006
  if (age < 40) return 0.009
  if (age < 60) return 0.02
  if (age < 70) return 0.045
  if (age < 80) return 0.11
  return 0.2
}

/** Family life, nomad flavour and everyday texture from the XX century that fit any nomadic era. */
const COMMON_EVENT_IDS = ['sibling.lost', 'work', 'child', 'grandchild', 'fl.jailau', 'fl.horse', 'fl.shezhire', 'fl.aitys', 'fl.toi', 'fl.wolf', 'eloped.peace', 'rare.wolf_hunt', 'tex']
export const COMMON_EVENTS: EventDef[] = EVENTS.filter(e => COMMON_EVENT_IDS.includes(e.id))
const COMMON_CHOICE_IDS = ['childhood', 'wedding_kz']
export const COMMON_CHOICES: ChoiceDef[] = CHOICES.filter(c => COMMON_CHOICE_IDS.includes(c.id))

export const baseHazard: Hazard = { id: 'base', q: c => earlyBaseQ(c.age) }

/** Repeated jut (zhut) years: a line in the life and a small extra risk for the young and old. */
export function jutEvent(prefix: string, yearly: (c: Ctx) => number): EventDef {
  return {
    id: `${prefix}.jut`,
    tone: 'bad',
    when: c => c.p.way !== 'abroad' && c.age >= 3 && !c.p.flags.has(`${prefix}.jut.${c.year - 1}`),
    chance: yearly,
    apply: c => {
      c.p.flags.add(`${prefix}.jut.${c.year}`)
      c.p.flags.add('jut_now')
    },
  }
}

/** One extra year of risk after a jut (hunger for children and the old). */
export const jutHazard: Hazard = {
  id: 'jut',
  q: c => {
    if (!c.p.flags.has('jut_now')) return 0
    c.p.flags.delete('jut_now')
    return c.age < 5 || c.age >= 60 ? 0.04 : 0.008
  },
}

/** A spouse dies (outside the big catastrophes): widowhood, and for a widow the custom of әмеңгерлік. */
export function spouseDies(prefix: string): EventDef {
  return {
    id: `${prefix}.spouse_dies`,
    once: true,
    tone: 'grief',
    big: true,
    when: c => c.p.spouse === 'yes' && c.age >= 25 && c.age <= 65 && !c.p.flags.has('widowed') && !(c.p.flags.has('ancestor') && c.p.childYears.length === 0),
    chance: () => 0.012,
    apply: c => {
      c.p.flags.add('widowed')
      c.p.flags.add('widowed_now')
    },
  }
}
