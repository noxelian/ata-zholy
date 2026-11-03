export type Lang = 'kz' | 'ru' | 'en'
export type Sex = 'm' | 'f'
export type Group = 'kazakh' | 'russian' | 'ukrainian' | 'german' | 'tatar' | 'uzbek' | 'uighur' | 'korean' | 'other'
export type Region = 'zhetisu' | 'syr' | 'arka' | 'shygys' | 'oral' | 'adai' | 'kostanai' | 'aktobe'
/** How the family lives. Changes over a life: nomads settle, villagers move to town. */
export type Way = 'nomad' | 'seminomad' | 'village' | 'town' | 'abroad'
export type Tone = 'calm' | 'good' | 'bad' | 'grief' | 'history'

export interface LogEntry {
  year: number
  age: number
  /** Text key in i18n `ev` table. */
  key: string
  vars?: Record<string, string | number>
  tone: Tone
  /** Big events are highlighted and go to the card. */
  big?: boolean
}

export interface Person {
  seed: number
  sex: Sex
  group: Group
  region: Region
  birthYear: number
  name: string
  way: Way
  wayAtBirth: Way
  /** Where the person lives now if not the birth region (city name key or region). */
  place: Region
  year: number
  age: number
  alive: boolean
  literate: boolean
  edu: 'none' | 'school' | 'tech' | 'uni'
  job: string | null
  spouse: string | null
  children: number
  childrenLost: number
  /** Birth years of children who lived past early childhood. */
  childYears: number[]
  grandchildren: number
  /** Story flags: 'famine', 'war', 'wounded', 'fled', 'returned', 'deported', 'repressed', 'virgin' ... */
  flags: Set<string>
  deathYear?: number
  deathAge?: number
  deathCause?: string
  log: LogEntry[]
}

export interface Ctx {
  p: Person
  year: number
  age: number
  r: import('./rng').Rng
}

export interface EventDef {
  id: string
  /** Is the event possible this year for this person? */
  when: (c: Ctx) => boolean
  /** Probability this year (0..1). */
  chance: (c: Ctx) => number
  /** Changes the person. May add more log lines; the default line is `ev.<id>`. */
  apply?: (c: Ctx) => void | { key?: string; vars?: Record<string, string | number>; silent?: boolean; die?: string }
  tone?: Tone
  big?: boolean
  once?: boolean
}

export interface ChoiceDef {
  id: string
  when: (c: Ctx) => boolean
  /** Button and outcome texts depend on the question variant (key suffix after `chq.<id>.`). */
  variants?: boolean
  /** Question text key; default `chq.<id>`. */
  q?: (c: Ctx) => string
  options: { id: string; apply: (c: Ctx) => void }[]
  /** Offered only with this probability per year (rolled the same way live and on replay). Default: always. */
  chance?: (c: Ctx) => number
  /** Line about what is at stake, key; default `chs.<id>` if present. */
  stake?: (c: Ctx) => string
  /** How a typical person of that time chose (used by the statistics run). */
  typical: (c: Ctx) => number[]
}

/** A yearly death risk that is active under some condition. */
export interface Hazard {
  id: string
  /** Probability to die this year from this cause (0..1), 0 if not active. */
  q: (c: Ctx) => number
}

export type Step =
  | { kind: 'year'; year: number; age: number; entries: LogEntry[] }
  | { kind: 'choice'; year: number; age: number; choice: ChoiceDef; entries: LogEntry[] }
  | { kind: 'death'; year: number; age: number; entries: LogEntry[] }
