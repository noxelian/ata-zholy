/**
 * Eras of the game. Each era has its own birth, choices, events and death risks.
 * XX century: born 1900–1935 (sim/data.ts, events.ts, branches.ts). Earlier eras: docs/era-*.md.
 */
import type { Rng } from './rng'
import type { ChoiceDef, EraId, EventDef, Group, Hazard, Person } from './types'
import { GROUPS, born as bornXX, type BirthFacts } from './birth'
import { CHOICES as CHOICES_XX, EVENTS as EVENTS_XX, HAZARDS as HAZARDS_XX } from './content'
import { CHOICES_18, EVENTS_18, HAZARDS_18, born18 } from './era18'
import { CHOICES_15, EVENTS_15, HAZARDS_15, born15 } from './era15'
import { CHOICES_19, EVENTS_19, HAZARDS_19, born19 } from './era19'

export interface Era {
  id: EraId
  /** Text key prefix for era-specific texts ('' for the XX century). */
  prefix: string
  /** Years shown on the life bar. */
  span: [number, number]
  /** Years of big events marked on the bar. */
  marks: number[]
  /** Peoples the player can pick for this era (empty: no choice). */
  groups: Group[]
  born: (r: Rng, seed: number, group?: Group, like?: BirthFacts) => Person
  choices: ChoiceDef[]
  events: EventDef[]
  hazards: Hazard[]
}

export const ERAS: Partial<Record<EraId, Era>> = {
  xv: {
    id: 'xv',
    prefix: 'e15',
    span: [1440, 1540],
    marks: [1457, 1465, 1468, 1485, 1510, 1521],
    groups: [],
    born: born15,
    choices: CHOICES_15,
    events: EVENTS_15,
    hazards: HAZARDS_15,
  },
  xix: {
    id: 'xix',
    prefix: 'e19',
    span: [1800, 1900],
    marks: [1822, 1837, 1847, 1856, 1868, 1879, 1891],
    groups: [],
    born: born19,
    choices: CHOICES_19,
    events: EVENTS_19,
    hazards: HAZARDS_19,
  },
  xviii: {
    id: 'xviii',
    prefix: 'e18',
    span: [1700, 1800],
    marks: [1723, 1730, 1741, 1758, 1771, 1781, 1785],
    groups: [],
    born: born18,
    choices: CHOICES_18,
    events: EVENTS_18,
    hazards: HAZARDS_18,
  },
  xx: {
    id: 'xx',
    prefix: '',
    span: [1900, 2000],
    marks: [1916, 1921, 1932, 1937, 1941, 1954, 1986, 1991],
    groups: GROUPS,
    born: bornXX,
    choices: CHOICES_XX,
    events: EVENTS_XX,
    hazards: HAZARDS_XX,
  },
}

export const ERA_IDS: EraId[] = ['xv', 'xviii', 'xix', 'xx']

export function eraOf(id: string | undefined): Era {
  return ERAS[(id as EraId) ?? 'xx'] ?? ERAS.xx!
}
