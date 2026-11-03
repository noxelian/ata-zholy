import type { Group, Person, Region, Sex, Way } from './types'
import type { Rng } from './rng'
import { pickName } from './names'
import { BIRTH } from './data'

export const GROUPS: Group[] = ['kazakh', 'russian', 'ukrainian', 'german', 'tatar', 'uzbek', 'uighur', 'korean']

export type BirthFacts = Pick<Person, 'sex' | 'group' | 'region' | 'birthYear'> & { way: Way; era?: Person['era'] }

function birthYear(r: Rng): number {
  return Number(r.weighted(BIRTH.yearWeights))
}

/** Creates a newborn. Every random draw happens in a fixed order so seeds replay. */
export function born(r: Rng, seed: number, forceGroup?: Group, like?: BirthFacts): Person {
  const year = like?.birthYear ?? (forceGroup ? Number(r.weighted(BIRTH.groupYears[forceGroup] ?? BIRTH.yearWeights)) : birthYear(r))
  const group: Group = like?.group ?? forceGroup ?? r.weighted(BIRTH.groupShare(year))
  const sex: Sex = like?.sex ?? (r.chance(0.512) ? 'm' : 'f')
  const region: Region = like?.region ?? r.weighted(BIRTH.region[group])
  const way: Way = like?.way ?? r.weighted(BIRTH.way(group, region, year))
  const p: Person = {
    seed,
    era: 'xx',
    sex,
    group,
    region,
    birthYear: year,
    name: pickName(r, group, sex),
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
  const siblings = r.int(BIRTH.siblings[0], BIRTH.siblings[1])
  p.log.push({ year, age: 0, key: way === 'abroad' ? `birth.abroad.${group}` : `birth.${way}`, vars: { region: 'reg.' + region, grp: 'grpof.' + group, sib: siblings }, tone: 'good', big: false })
  const ctx = BIRTH.context(year, group)
  if (ctx) p.log.push({ year, age: 0, key: ctx, tone: 'history' })
  return p
}
