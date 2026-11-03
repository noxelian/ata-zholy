import type { ChoiceDef, Ctx, EventDef, Hazard } from './types'
import { FAMINE21_REGION, FAMINE_Q, FAMINE_REGION, baseQ } from './data'

// ---------- helpers ----------
export const kz = (c: Ctx) => c.p.group === 'kazakh'
export const home = (c: Ctx) => c.p.way !== 'abroad'
export const has = (c: Ctx, f: string) => c.p.flags.has(f)
export const set = (c: Ctx, ...f: string[]) => f.forEach(x => c.p.flags.add(x))
export const del = (c: Ctx, ...f: string[]) => f.forEach(x => c.p.flags.delete(x))
export const male = (c: Ctx) => c.p.sex === 'm'
/** Not at the front, in captivity, in a camp or in the labour army: free to study, marry, work. */
export const free = (c: Ctx) => !['front', 'captive', 'camp', 'alzhir', 'trudarmy'].some(f => c.p.flags.has(f))
/** Ancestor mode passes this flag: the first child must survive. */
export const needChild = (c: Ctx) => c.p.flags.has('ancestor') && c.p.childYears.length === 0
export const y = (c: Ctx, a: number, b = a) => c.year >= a && c.year <= b
export const hist = (id: string, year: number, extra: (c: Ctx) => boolean = () => true, minAge = 4): EventDef => ({
  id,
  once: true,
  tone: 'history',
  when: c => c.year === year && c.age >= minAge && home(c) && extra(c),
  chance: () => 1,
})

export function jobFor(c: Ctx): string {
  const p = c.p
  if (p.edu === 'uni') return c.r.pick(['job.teacher', 'job.doctor', 'job.engineer', 'job.agronomist'])
  if (p.edu === 'tech') return c.r.pick(['job.teacher', 'job.medic', 'job.accountant', 'job.mechanic'])
  if (p.flags.has('craft') && c.r.chance(0.5)) return 'job.craft'
  if (p.flags.has('tech') && c.year >= 1925 && c.r.chance(0.5)) return c.r.pick(['job.railway', 'job.mechanic'])
  if (p.flags.has('horseman') && c.year >= 1930 && c.r.chance(0.4)) return 'job.horses'
  if (p.way === 'nomad' || p.way === 'seminomad') return c.year < 1930 ? 'job.herder' : 'job.kolkhoz'
  if (p.way === 'town') return c.r.pick(['job.worker', 'job.railway', 'job.worker'])
  if (c.year < 1930) return 'job.farmer'
  if (p.place === 'arka' && c.r.chance(0.25)) return 'job.miner'
  return 'job.kolkhoz'
}

/** Marriage ages: docs 7.6 (Kazakh women ~17, men ~25 before the war; after 1945 women 20–24, men 22–27). */
export function marryChance(c: Ctx): number {
  const a = c.age
  if (c.year >= 1946) return male(c) ? (a < 22 ? 0.05 : a <= 27 ? 0.25 : 0.15) : a < 19 ? 0.06 : a <= 24 ? 0.25 : 0.15
  if (kz(c)) return male(c) ? (a < 22 ? 0.03 : a <= 30 ? 0.2 : 0.12) : a < 16 ? 0 : a <= 19 ? 0.35 : 0.2
  return male(c) ? (a < 20 ? 0.03 : a <= 26 ? 0.22 : 0.12) : a < 17 ? 0.03 : a <= 22 ? 0.25 : 0.15
}

/** Births per married year (docs 7.6: Kazakh women 5–7 births; Russian/Ukrainian 4–5 before 1925 births, ~2.5 after). */
function birthChance(c: Ctx): number {
  const yr = c.year
  if (kz(c) || c.p.group === 'uzbek' || c.p.group === 'uighur') return yr < 1960 ? 0.3 : yr < 1975 ? 0.24 : 0.14
  return yr < 1930 ? 0.22 : yr < 1946 ? 0.14 : yr < 1960 ? 0.11 : 0.06
}

// ---------- choices ----------
export const CHOICES_BASE: ChoiceDef[] = [
  {
    id: 'school',
    when: c => c.age === 9 && home(c),
    q: c =>
      c.year < 1920
        ? kz(c)
          ? 'chq.school.mullah'
          : ['tatar', 'uzbek', 'uighur'].includes(c.p.group)
            ? 'chq.school.mekteb'
            : 'chq.school.church'
        : c.year < 1930
          ? 'chq.school.soviet'
          : 'chq.school.likbez',
    options: [
      { id: 'go', apply: c => ((c.p.literate = true), (c.p.edu = 'school')) },
      { id: 'home', apply: c => set(c, 'early_work') },
    ],
    typical: c => (c.year < 1920 ? (kz(c) ? (male(c) ? [0.12, 0.88] : [0.04, 0.96]) : [0.35, 0.65]) : c.year < 1930 ? [0.4, 0.6] : [0.85, 0.15]),
  },
  {
    id: 'study',
    when: c => c.age === 16 && c.p.literate && c.year >= 1922 && home(c) && free(c),
    options: [
      { id: 'go', apply: c => ((c.p.edu = c.r.chance(0.25) ? 'uni' : 'tech'), (c.p.way = 'town'), set(c, 'student')) },
      { id: 'stay', apply: () => {} },
    ],
    typical: c => (c.year < 1935 ? [0.2, 0.8] : [0.35, 0.65]),
  },
  {
    id: 'collect',
    when: c => c.year === 1930 && kz(c) && home(c) && (c.p.way === 'nomad' || c.p.way === 'seminomad'),
    q: c => (c.age < 15 ? 'chq.collect.child' : 'chq.collect'),
    options: [
      { id: 'join', apply: c => ((c.p.way = 'village'), set(c, 'settled')) },
      { id: 'flee', apply: c => ((c.p.way = 'abroad'), set(c, 'fled', 'flight')) },
      { id: 'town', apply: c => ((c.p.way = 'town'), set(c, 'to_town')) },
    ],
    typical: () => [0.72, 0.16, 0.12],
  },
  {
    id: 'collect_peasant',
    when: c => c.year === 1930 && !kz(c) && home(c) && c.p.way === 'village' && c.age >= 15,
    options: [
      { id: 'join', apply: () => {} },
      { id: 'town', apply: c => ((c.p.way = 'town'), set(c, 'to_town')) },
    ],
    typical: () => [0.8, 0.2],
  },
  {
    id: 'famine',
    when: c => c.year === 1932 && kz(c) && home(c) && c.p.way !== 'town',
    q: c => (c.age < 15 ? 'chq.famine.child' : 'chq.famine'),
    options: [
      { id: 'stay', apply: () => {} },
      { id: 'city', apply: c => ((c.p.way = 'town'), set(c, 'to_town')) },
      { id: 'leave', apply: c => ((c.p.way = 'abroad'), set(c, 'fled', 'flight')) },
    ],
    typical: () => [0.62, 0.2, 0.18],
  },
  {
    id: 'front',
    when: c => male(c) && c.year >= 1941 && c.year <= 1943 && c.age === 17 && home(c) && free(c) && ['kazakh', 'russian', 'ukrainian', 'tatar', 'uzbek', 'uighur'].includes(c.p.group),
    options: [
      { id: 'volunteer', apply: c => set(c, 'front', 'volunteer') },
      { id: 'wait', apply: () => {} },
    ],
    typical: () => [0.3, 0.7],
  },
  {
    id: 'homefront',
    when: c => !male(c) && c.year === 1941 && c.age >= 16 && c.age <= 45 && home(c) && free(c) && !has(c, 'student') && c.p.group !== 'german',
    options: [
      { id: 'kolkhoz', apply: c => set(c, 'homefront') },
      { id: 'factory', apply: c => ((c.p.way = 'town'), set(c, 'homefront', 'factory')) },
      { id: 'nurse', apply: c => set(c, 'front', 'nurse') },
    ],
    typical: () => [0.72, 0.24, 0.04],
  },
  {
    id: 'virgin',
    when: c => c.year === 1954 && c.age >= 18 && c.age <= 40 && home(c) && free(c) && c.p.way !== 'town',
    options: [
      { id: 'go', apply: c => ((c.p.job = 'job.tractor'), set(c, 'virgin')) },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.2, 0.8],
  },
  {
    id: 'emigrate_ru',
    when: c => c.year === 1993 && (c.p.group === 'russian' || c.p.group === 'ukrainian') && home(c),
    options: [
      { id: 'go', apply: c => ((c.p.way = 'abroad'), set(c, 'to_russia')) },
      { id: 'stay', apply: () => {} },
    ],
    typical: c => (c.age >= 65 ? [0.12, 0.88] : [0.25, 0.75]),
  },
  {
    id: 'emigrate',
    when: c => c.year === 1992 && c.p.group === 'german' && home(c),
    options: [
      { id: 'go', apply: c => ((c.p.way = 'abroad'), set(c, 'to_germany')) },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.65, 0.35],
  },
]

// ---------- events ----------
export const EVENTS_MAIN: EventDef[] = [
  // Arrival by deportation: Koreans 1937, Germans 1941.
  {
    id: 'deport.korean',
    once: true,
    big: true,
    tone: 'bad',
    when: c => c.p.group === 'korean' && c.year === 1937,
    chance: () => 1,
    apply: c => ((c.p.way = 'village'), set(c, 'deported', 'deport_winter')),
  },
  {
    id: 'deport.german',
    once: true,
    big: true,
    tone: 'bad',
    when: c => c.p.group === 'german' && c.year === 1941,
    chance: () => 1,
    apply: c => ((c.p.way = 'village'), set(c, 'deported', 'deport_winter', 'special_settler')),
  },
  {
    id: 'trudarmy',
    once: true,
    big: true,
    tone: 'bad',
    when: c => c.p.group === 'german' && y(c, 1942) && ((male(c) && c.age >= 15 && c.age <= 55) || (!male(c) && c.age >= 16 && c.age <= 45)),
    chance: c => (male(c) ? 0.9 : 0.45),
    apply: c => set(c, 'trudarmy'),
  },
  {
    id: 'trudarmy.back',
    once: true,
    tone: 'good',
    when: c => has(c, 'trudarmy') && c.year >= 1946,
    chance: () => 0.7,
    apply: c => del(c, 'trudarmy'),
  },
  {
    id: 'settler.free',
    once: true,
    big: true,
    tone: 'good',
    when: c => has(c, 'special_settler') && c.year === 1955,
    chance: () => 1,
    apply: c => del(c, 'special_settler'),
  },

  // Childhood and family.
  { id: 'sibling.lost', tone: 'grief', when: c => c.age >= 1 && c.age <= 12 && home(c), chance: c => Math.min(0.12, baseQ(2, c.year, true) * 2.2) },
  {
    id: 'likbez',
    once: true,
    tone: 'good',
    when: c => !c.p.literate && c.age >= 14 && c.age <= 45 && c.year >= 1928 && c.year <= 1940 && home(c),
    chance: () => 0.09,
    apply: c => void (c.p.literate = true),
  },
  {
    id: 'work',
    once: true,
    tone: 'calm',
    when: c => c.age === (has(c, 'early_work') ? 12 : c.p.literate && c.year >= 1922 ? 17 : 15) && !c.p.job && !has(c, 'student'),
    chance: () => 1,
    apply: c => {
      c.p.job = jobFor(c)
      return { vars: { job: c.p.job } }
    },
  },
  {
    id: 'graduate',
    once: true,
    big: true,
    tone: 'good',
    when: c => has(c, 'student') && c.age >= (c.p.edu === 'uni' ? 21 : 19) && free(c),
    chance: () => 1,
    apply: c => {
      del(c, 'student')
      c.p.job = jobFor(c)
      return { key: c.p.edu === 'uni' ? 'graduate.uni' : 'graduate.tech', vars: { job: c.p.job } }
    },
  },
  {
    id: 'kolkhoz.job',
    once: true,
    tone: 'calm',
    when: c => c.year === 1931 && (c.p.job === 'job.herder' || c.p.job === 'job.farmer') && home(c) && c.p.way !== 'town',
    chance: () => 1,
    apply: c => void (c.p.job = 'job.kolkhoz'),
  },
  {
    id: 'child',
    tone: 'good',
    when: c =>
      c.p.spouse === 'yes' && (male(c) ? c.age <= 52 || needChild(c) : c.age <= 44 || (needChild(c) && c.age <= 48)) && free(c) && (!has(c, 'widowed') || needChild(c)),
    chance: c =>
      needChild(c) && c.age >= (male(c) ? 36 : 32) ? 1 : birthChance(c) * (c.p.way === 'town' ? 0.8 : 1) * (y(c, 1931, 1933) && kz(c) ? 0.35 : 1),
    apply: c => {
      const p = c.p
      p.children++
      // Childbirth was dangerous for mothers (оценка: ~1% per birth before 1940, falling later).
      if (!male(c) && c.r.chance(c.year < 1940 ? 0.009 : c.year < 1960 ? 0.004 : 0.001)) {
        return { key: 'child.mother_risk', die: 'childbirth' }
      }
      const lostRoll = c.r.chance(Math.min(0.9, baseQ(0, c.year, true) + 4 * baseQ(2, c.year, true)))
      // In ancestor mode the first surviving child is the line we descend from.
      const lost = lostRoll && !needChild(c)
      if (lost) {
        p.childrenLost++
        return { key: 'child.lost', vars: { n: p.children } }
      }
      p.childYears.push(c.year)
      if (p.children === 1 && !p.flags.has('first_child_logged')) {
        p.flags.add('first_child_logged')
        p.log.push({ year: c.year, age: c.age, key: 'child.first', tone: 'good', big: true })
        return { silent: true }
      }
      if (c.r.chance(0.015)) {
        p.children++
        p.childYears.push(c.year)
        p.log.push({ year: c.year, age: c.age, key: 'rare.twins', tone: 'good', big: true })
        return { silent: true }
      }
      return { key: 'child.more', vars: { n: p.children } }
    },
  },
  {
    id: 'grandchild',
    once: true,
    tone: 'good',
    big: true,
    when: c => c.p.childYears.length > 0 && c.year - c.p.childYears[0] >= 18,
    chance: () => 0.25,
    apply: c => void (c.p.grandchildren = 1),
  },
  {
    id: 'pension',
    once: true,
    tone: 'calm',
    when: c => c.year >= 1956 && c.age === (male(c) ? 60 : 55) && home(c),
    chance: () => 1,
  },

  // 1916 and the civil war.
  {
    id: '1916.flee',
    once: true,
    big: true,
    tone: 'bad',
    when: c => c.year === 1916 && kz(c) && (c.p.region === 'zhetisu' || c.p.region === 'kostanai'),
    chance: c => (c.p.region === 'zhetisu' ? 0.22 : 0.05),
    apply: c => set(c, 'fled1916'),
  },
  {
    id: '1916.back',
    once: true,
    tone: 'calm',
    when: c => has(c, 'fled1916') && c.year >= 1917 && c.year <= 1920,
    chance: () => 0.45,
    apply: c => del(c, 'fled1916'),
  },
  hist('hist.1916', 1916, c => kz(c) && !has(c, 'fled1916'), 3),
  hist('hist.1917', 1917),
  hist('hist.alash', 1917, kz, 6),
  hist('hist.1920', 1920),
  { id: 'famine21.loss', once: true, big: true, tone: 'grief', when: c => y(c, 1921, 1922) && home(c), chance: c => (kz(c) ? 0.25 : 0.12) },
  hist('hist.1925', 1925, kz, 8),
  hist('hist.1928', 1928, kz, 8),
  hist('hist.turksib', 1930, c => c.p.region === 'zhetisu' || c.p.region === 'shygys', 8),

  // Ashtarshylyk: the personal lines. Mortality is in HAZARDS.
  { id: 'famine.start', once: true, big: false, tone: 'bad', when: c => c.year === 1931 && kz(c) && home(c), chance: () => 1 },
  { id: 'famine.loss', once: true, big: true, tone: 'grief', when: c => c.year === 1932 && kz(c) && (home(c) || has(c, 'fled')), chance: () => 0.75 },
  {
    id: 'famine.europ',
    once: true,
    tone: 'bad',
    when: c => c.year === 1932 && !kz(c) && home(c),
    chance: () => 0.5,
  },
  {
    id: 'famine.survived',
    once: true,
    big: true,
    tone: 'history',
    when: c => c.year === 1934 && kz(c) && c.age >= 2,
    chance: () => 1,
    apply: c => (set(c, 'famine'), { key: c.p.way === 'abroad' ? 'famine.survived.abroad' : has(c, 'near_famine') ? 'famine.survived.near' : 'famine.survived' }),
  },
  {
    id: 'flight.return',
    tone: 'good',
    big: true,
    when: c => has(c, 'fled') && c.p.way === 'abroad' && c.year >= 1933 && c.year <= 1937,
    chance: () => 0.1,
    apply: c => ((c.p.way = 'village'), set(c, 'returned')),
  },
  { id: 'flight.stay', once: true, big: true, tone: 'calm', when: c => has(c, 'fled') && c.p.way === 'abroad' && c.year === 1938, chance: () => 1 },
  {
    id: 'famine.orphan',
    once: true,
    big: true,
    tone: 'grief',
    when: c => c.year === 1933 && kz(c) && c.age >= 2 && c.age <= 13 && c.p.way !== 'abroad',
    chance: () => 0.07,
    apply: c => set(c, 'orphan'),
  },
  hist('hist.1936', 1936, () => true, 8),

  // 1937–1938.
  {
    id: 'repressed',
    once: true,
    big: true,
    tone: 'bad',
    when: c => y(c, 1937, 1938) && c.age >= 20 && home(c) && free(c),
    // docs 7.5: ~3% of adult men arrested over 1937–38; risk groups ×3–×10.
    chance: c =>
      (male(c) ? 0.013 : 0.0015) *
      (c.p.edu === 'uni' || c.p.edu === 'tech' ? 3 : 1) *
      (has(c, 'returned') || has(c, 'fled1916') ? 2 : 1) *
      (c.p.group === 'korean' || c.p.group === 'german' ? 2 : 1) *
      (has(c, 'official') ? 3 : 1) *
      (has(c, 'madrasa') ? 2 : 1) *
      (has(c, 'komsomol') ? 1.3 : 1),
    apply: c => {
      set(c, 'repressed_any')
      if (c.r.chance(0.2)) return { key: 'repressed.shot', die: 'shot' }
      set(c, 'camp')
      return { key: 'repressed.camp' }
    },
  },
  {
    id: 'spouse.arrested',
    once: true,
    big: true,
    tone: 'grief',
    when: c => !male(c) && c.p.spouse === 'yes' && y(c, 1937, 1938) && home(c) && !needChild(c),
    chance: () => 0.015,
    apply: c => {
      set(c, 'widowed')
      // The first women reached ALZhIR in January 1938.
      if (c.year >= 1938 && c.r.chance(0.15)) {
        set(c, 'alzhir', 'repressed_any')
        return { key: 'spouse.arrested.alzhir' }
      }
    },
  },
  { id: 'alzhir.free', once: true, big: true, tone: 'good', when: c => has(c, 'alzhir') && c.year >= 1943, chance: c => (c.year >= 1946 ? 1 : 0.3), apply: c => del(c, 'alzhir') },
  { id: 'repressed.family', once: true, tone: 'grief', when: c => y(c, 1937, 1938) && home(c) && c.age >= 3, chance: () => 0.025 },
  { id: 'camp.free', once: true, big: true, tone: 'good', when: c => has(c, 'camp') && (c.year >= 1943 || (needChild(c) && c.year >= 1942)), chance: c => (c.year >= 1955 || needChild(c) ? 1 : 0.2), apply: c => del(c, 'camp') },
  { id: 'rehab', once: true, tone: 'calm', when: c => c.p.flags.has('repressed_any') && c.year >= 1956, chance: () => 0.1 },
  hist('hist.koreans', 1937, c => c.p.group !== 'korean' && (c.p.region === 'syr' || c.p.region === 'zhetisu'), 6),

  // War.
  hist('hist.1941', 1941, c => c.p.group !== 'german', 3),
  {
    id: 'war.draft',
    once: true,
    big: true,
    tone: 'bad',
    when: c =>
      male(c) && y(c, 1941, 1945) && c.age >= 18 && c.age <= 50 && home(c) && free(c) && !has(c, 'veteran') && !has(c, 'student') &&
      ['kazakh', 'russian', 'ukrainian', 'tatar', 'uzbek', 'uighur'].includes(c.p.group),
    chance: c => (c.year === 1941 ? 0.4 : c.year === 1942 ? 0.5 : c.year === 1943 ? 0.4 : c.year === 1944 ? 0.25 : 0.05) * (c.age > 40 ? 0.5 : 1),
    apply: c => set(c, 'front'),
  },
  { id: 'war.volunteer', once: true, big: true, tone: 'bad', when: c => has(c, 'volunteer') && c.year >= 1941, chance: () => 1 },
  { id: 'war.nurse', once: true, big: true, tone: 'bad', when: c => has(c, 'nurse') && c.year >= 1941, chance: () => 1 },
  {
    id: 'war.captive',
    once: true,
    big: true,
    tone: 'bad',
    // docs 7.5: ~10% of the mobilised were captured, ~18% of them came back.
    when: c => has(c, 'front') && !has(c, 'nurse') && y(c, 1941, 1943),
    chance: c => (c.year === 1943 ? 0.02 : 0.05),
    apply: c => (del(c, 'front'), set(c, 'captive')),
  },
  {
    id: 'captive.back',
    once: true,
    big: true,
    tone: 'calm',
    when: c => has(c, 'captive') && c.year === 1945,
    chance: () => 1,
    apply: c => (del(c, 'captive'), set(c, 'veteran')),
  },
  { id: 'war.wounded', tone: 'bad', when: c => has(c, 'front') && y(c, 1941, 1945) && !has(c, 'wounded'), chance: () => 0.22, apply: c => set(c, 'wounded') },
  {
    id: 'war.invalid',
    once: true,
    tone: 'calm',
    big: true,
    when: c => has(c, 'front') && has(c, 'wounded') && y(c, 1942, 1944),
    chance: () => 0.18,
    apply: c => (del(c, 'front'), set(c, 'veteran')),
  },
  {
    id: 'war.back',
    once: true,
    big: true,
    tone: 'good',
    when: c => has(c, 'front') && c.year === 1945,
    chance: () => 1,
    apply: c => {
      del(c, 'front')
      set(c, 'veteran')
      return c.r.chance(0.25) ? { key: 'war.back.medal' } : undefined
    },
  },
  { id: 'homefront.line', once: true, big: true, tone: 'calm', when: c => has(c, 'homefront') && c.year === 1942, chance: () => 1 },
  { id: 'spouse.war', once: true, big: true, tone: 'grief', when: c => !male(c) && c.p.spouse === 'yes' && y(c, 1942, 1945) && !needChild(c) && !has(c, 'widowed'), chance: () => 0.1, apply: c => set(c, 'widowed') },
  { id: 'war.kid', once: true, tone: 'calm', when: c => y(c, 1942) && c.age >= 6 && c.age <= 15 && home(c), chance: () => 1 },
  hist('hist.deportees', 1944, c => c.p.group !== 'german', 6),
  hist('hist.1945', 1945),
  { id: 'widow.remarry', once: true, tone: 'good', when: c => has(c, 'widowed') && c.year >= 1946 && c.age <= 40 && free(c), chance: () => 0.12, apply: c => del(c, 'widowed') },

  // After the war.
  {
    id: 'polygon',
    once: true,
    big: true,
    tone: 'bad',
    when: c => c.p.region === 'shygys' && c.year === 1949 && home(c),
    chance: () => 0.2,
    apply: c => set(c, 'polygon'),
  },
  hist('hist.1949', 1949, c => !has(c, 'polygon')),
  hist('hist.1954', 1954, c => !has(c, 'virgin')),
  { id: 'virgin.line', once: true, big: true, tone: 'calm', when: c => has(c, 'virgin') && c.year === 1955, chance: () => 1 },
  hist('hist.1961', 1961),
  {
    id: 'aral',
    once: true,
    big: true,
    tone: 'bad',
    when: c => c.p.region === 'syr' && c.year === 1978 && home(c),
    chance: () => 0.5,
    apply: c => set(c, 'aral'),
  },
  hist('hist.1986', 1986, () => true, 10),
  hist('hist.1989', 1989, c => has(c, 'polygon') || c.p.region === 'shygys', 10),
  hist('hist.1991', 1991),
  hist('hist.1993', 1993),
  { id: 'russia.line', once: true, big: true, tone: 'calm', when: c => has(c, 'to_russia') && c.year === 1994, chance: () => 1 },
  {
    id: 'oralman',
    once: true,
    big: true,
    tone: 'good',
    when: c => (has(c, 'fled') || has(c, 'fled1916') || has(c, 'famine')) && kz(c) && c.year >= 1992 && c.year <= 2000 && home(c),
    chance: () => 0.025,
  },
  { id: 'germany.line', once: true, big: true, tone: 'calm', when: c => has(c, 'to_germany') && c.year === 1993, chance: () => 1 },
]


// ---------- everyday life: small moments between the big ones ----------
const fl = (id: string, when: (c: Ctx) => boolean, chance: number, tone: EventDef['tone'] = 'calm'): EventDef => ({ id, once: true, tone, when: c => home(c) && free(c) && when(c), chance: () => chance })
const nomadic = (c: Ctx) => c.p.way === 'nomad' || c.p.way === 'seminomad'
export const FLAVOR: EventDef[] = [
  fl('fl.jailau', c => nomadic(c) && c.age >= 3 && c.age <= 12 && c.year < 1930, 0.35),
  fl('fl.horse', c => kz(c) && c.age >= 4 && c.age <= 8, 0.3),
  fl('fl.shezhire', c => kz(c) && c.age >= 5 && c.age <= 11, 0.3),
  fl('fl.tales', c => !kz(c) && c.age >= 4 && c.age <= 10, 0.25),
  fl('fl.aitys', c => kz(c) && c.age >= 8 && c.age <= 30 && c.year < 1940, 0.15),
  fl('fl.toi', c => kz(c) && c.age >= 6 && c.age <= 25 && !y(c, 1930, 1934) && !y(c, 1941, 1945), 0.12),
  fl('fl.zhut', c => nomadic(c) && c.year < 1930 && c.age >= 3, 0.07, 'bad'),
  fl('fl.wolf', c => nomadic(c) && c.age >= 5 && c.age <= 14 && c.year < 1932, 0.1),
  fl('fl.train', c => c.age >= 5 && c.age <= 20 && c.year >= 1906 && c.p.way !== 'town', 0.12),
  fl('fl.radio', c => c.year >= 1935 && c.year <= 1950 && c.age >= 5, 0.15),
  fl('fl.cinema', c => c.year >= 1934 && c.year <= 1955 && c.age >= 6 && c.age <= 40, 0.15),
  fl('fl.light', c => c.year >= 1950 && c.year <= 1968 && c.p.way !== 'town', 0.12, 'good'),
  fl('fl.tv', c => c.year >= 1962 && c.year <= 1978, 0.14, 'good'),
  fl('fl.house', c => c.year >= 1953 && c.year <= 1980 && c.age >= 25 && c.age <= 55 && c.p.spouse === 'yes', 0.08, 'good'),
  fl('fl.medal', c => c.year >= 1946 && c.year <= 1985 && c.age >= 30 && c.age <= 60, 0.04, 'good'),
  fl('fl.resort', c => c.year >= 1958 && c.year <= 1988 && c.age >= 35 && c.age <= 65, 0.05, 'good'),
  fl('fl.perestroika', c => c.year >= 1987 && c.year <= 1990 && c.age >= 15, 0.5),
  fl('fl.nineties', c => c.year >= 1992 && c.year <= 1997 && c.age >= 15, 0.5, 'bad'),
  fl('fl.jubilee', c => c.age >= 60 && c.age <= 80 && c.p.childYears.length >= 2 && c.p.grandchildren > 0 && c.year >= 1950, 0.12, 'good'),
]

/** War risk by branch of service (model: the infantry carried the heaviest losses; cavalry was cut down in 1941–42). */
function warFactor(c: Ctx): number {
  if (has(c, 'artillery') || has(c, 'signal')) return 0.75
  if (has(c, 'cavalry')) return c.year <= 1942 ? 1.25 : 0.9
  if (has(c, 'rifle')) return 1.0
  return 1
}

// ---------- yearly death risks ----------
export const HAZARDS_BASE: Hazard[] = [
  {
    id: 'base',
    q: c => baseQ(c.age, c.year, c.p.sex === 'm'),
  },
  {
    id: 'famine21',
    q: c => {
      if (!y(c, 1921, 1922) || !home(c)) return 0
      const q = FAMINE21_REGION[c.p.region] ?? 0.02
      const age = c.age < 5 ? 1.5 : c.age > 55 ? 1.4 : 1
      return q * age
    },
  },
  { id: 'uprising', q: c => (y(c, 1916, 1917) && kz(c) && c.p.region === 'zhetisu' ? 0.05 : 0) },
  { id: 'typhus', q: c => (y(c, 1919, 1921) && home(c) ? 0.012 : 0) },
  {
    id: 'famine',
    q: c => {
      const base = FAMINE_Q[c.year] ?? 0
      if (!base) return 0
      // docs 7.5: non-Kazakhs ~8% in 1932–33.
      if (!kz(c)) return home(c) && y(c, 1932, 1933) ? 0.04 : 0
      const p = c.p
      let m = 1
      if (p.way === 'abroad') m = 0.4
      else if (p.way === 'town') m = 0.5
      else if (has(c, 'settled')) m = 1.1
      else if (p.way === 'nomad' || p.way === 'seminomad') m = 1.05
      else m = 0.85
      const age = c.age < 5 ? 1.5 : c.age >= 60 ? 1.4 : c.age >= 15 && c.age < 50 ? 0.8 : 1
      const reg = p.way === 'abroad' ? 1 : (FAMINE_REGION[p.region] ?? 1)
      return Math.min(0.75, base * m * age * reg)
    },
  },
  {
    id: 'flight',
    q: c => {
      if (!has(c, 'flight')) return 0
      c.p.flags.delete('flight')
      return 0.2
    },
  },
  {
    id: 'deport',
    q: c => {
      if (!has(c, 'deport_winter')) return 0
      if (c.year >= 1943 || (c.p.group === 'korean' && c.year >= 1939)) {
        c.p.flags.delete('deport_winter')
        return 0
      }
      return c.age < 5 || c.age > 55 ? 0.12 : 0.05
    },
  },
  { id: 'trudarmy', q: c => (has(c, 'trudarmy') && y(c, 1942, 1945) ? 0.045 : 0) },
  { id: 'camp', q: c => (has(c, 'camp') ? (y(c, 1942, 1943) ? 0.2 : 0.08) : has(c, 'alzhir') ? 0.03 : 0) },
  { id: 'captive', q: c => (has(c, 'captive') && y(c, 1941, 1945) ? 0.45 : 0) },
  {
    id: 'war',
    q: c => {
      if (!has(c, 'front')) return 0
      const r = ({ 1941: 0.19, 1942: 0.21, 1943: 0.16, 1944: 0.12, 1945: 0.05 }[c.year] ?? 0) * warFactor(c)
      return has(c, 'nurse') ? r * 0.3 : r
    },
  },
  { id: 'missing', q: c => (has(c, 'front') && y(c, 1941, 1943) ? 0.06 : 0) },
  { id: 'hunger47', q: c => (y(c, 1946, 1947) && home(c) ? 0.006 : 0) },
  { id: 'mine', q: c => (c.p.job === 'job.miner' && c.age < 60 ? 0.004 : 0) },
  { id: 'polygon', q: c => (has(c, 'polygon') && c.age >= 40 ? 0.005 : 0) },
  { id: 'shot', q: () => 0 },
]

export const EVENTS_BASE: EventDef[] = [...EVENTS_MAIN, ...FLAVOR]
