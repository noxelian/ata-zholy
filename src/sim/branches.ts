/**
 * Choices and events that make lives different from each other: childhood, youth, the wedding, career,
 * service at the front, after the war, branches by region and people, children, old age, the 1990s,
 * rare events and everyday texture. Numbers are model estimates (docs/razbor.md, docs/history-data.md).
 */
import type { ChoiceDef, Ctx, EventDef } from './types'
import { del, free, has, home, jobFor, kz, male, marryChance, needChild, set, y } from './events'

const nomadic = (c: Ctx) => c.p.way === 'nomad' || c.p.way === 'seminomad'
const wed = (c: Ctx, key: string) => {
  c.p.spouse = 'yes'
  c.p.log.push({ year: c.year, age: c.age, key, tone: 'good', big: true })
}
/** Moving to a town inside the country; someone living abroad stays abroad (returning is its own event). */
const toTown = (c: Ctx) => {
  // Before the XX century towns were few; a nomad's life does not move into one by marriage.
  if (c.p.way === 'abroad' || c.p.era !== 'xx') return
  c.p.way = 'town'
  set(c, 'moved_town')
}

export const CHOICES_MORE: ChoiceDef[] = [
  // Childhood, age 6: what the child grows up doing. Shapes the first job.
  {
    id: 'childhood',
    variants: true,
    when: c => c.age === 6 && home(c) && free(c),
    q: c => (nomadic(c) ? 'chq.childhood.aul' : c.p.way === 'town' ? 'chq.childhood.town' : 'chq.childhood.village'),
    options: [
      { id: 'outdoors', apply: c => set(c, nomadic(c) ? 'horseman' : c.p.way === 'town' ? 'tech' : 'land') },
      { id: 'craft', apply: c => set(c, 'craft') },
    ],
    typical: () => [0.6, 0.4],
  },
  // Youth, age 13: madrasa before the revolution, komsomol in 1920–1940, factory school in the war years.
  {
    id: 'madrasa',
    when: c => c.age === 13 && c.year < 1920 && kz(c) && male(c) && c.p.literate && home(c),
    options: [
      { id: 'go', apply: c => ((c.p.edu = 'school'), set(c, 'madrasa')) },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.25, 0.75],
  },
  {
    id: 'komsomol',
    when: c => c.age === 14 && y(c, 1921, 1940) && home(c) && free(c),
    options: [
      { id: 'join', apply: c => set(c, 'komsomol') },
      { id: 'no', apply: () => {} },
    ],
    typical: c => (c.year < 1930 ? [0.2, 0.8] : [0.45, 0.55]),
  },
  {
    id: 'fzu',
    when: c => c.age === 14 && y(c, 1941, 1949) && home(c) && free(c) && c.p.way !== 'town',
    options: [
      { id: 'go', apply: c => (toTown(c), (c.p.job = 'job.worker')) },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.3, 0.7],
  },
  // The wedding: how the family is made. Kazakh customs before the 1950s, a simpler choice for others.
  {
    id: 'wedding_kz',
    variants: true,
    when: c => !c.p.spouse && kz(c) && c.year < 1955 && free(c) && (home(c) || needChild(c)) && (male(c) ? c.age >= 19 && (c.age <= 40 || needChild(c)) : c.age >= 16 && (c.age <= 35 || needChild(c))),
    chance: c => (needChild(c) && c.age >= (male(c) ? 34 : 30) ? 1 : marryChance(c) * (y(c, 1941, 1945) ? 0.35 : 1)),
    q: c => (male(c) ? 'chq.wedding_kz.m' : 'chq.wedding_kz.f'),
    options: [
      { id: 'match', apply: c => wed(c, 'marry') },
      { id: 'love', apply: c => (wed(c, 'marry.love'), c.r.chance(0.3) && toTown(c)) },
      { id: 'elope', apply: c => (wed(c, 'marry.elope'), set(c, 'eloped')) },
    ],
    typical: c => (c.year < 1930 ? [0.75, 0.15, 0.1] : [0.5, 0.4, 0.1]),
  },
  {
    id: 'wedding',
    when: c => !c.p.spouse && (!kz(c) || c.year >= 1955) && free(c) && (male(c) ? c.age >= 19 && (c.age <= 40 || needChild(c)) : c.age >= 17 && (c.age <= 35 || needChild(c))),
    chance: c => (needChild(c) && c.age >= (male(c) ? 34 : 30) ? 1 : marryChance(c) * (y(c, 1941, 1945) ? 0.35 : 1)),
    options: [
      { id: 'home', apply: c => wed(c, 'marry') },
      { id: 'away', apply: c => (wed(c, 'marry.away'), toTown(c)) },
    ],
    typical: () => [0.7, 0.3],
  },
  // Career, age 27–40: chairman of the aul soviet before the war (dangerous in 1937), promotion after.
  {
    id: 'career',
    variants: true,
    when: c => c.age >= 27 && c.age <= 40 && y(c, 1924, 1980) && !y(c, 1941, 1945) && home(c) && free(c) && !!c.p.job,
    chance: () => 0.15,
    q: c => (c.year < 1941 ? 'chq.career.chair' : 'chq.career.promo'),
    options: [
      { id: 'accept', apply: c => (set(c, 'official'), c.year >= 1946 && set(c, 'boss')) },
      { id: 'study', apply: c => ((c.p.edu = c.p.edu === 'none' || c.p.edu === 'school' ? 'tech' : c.p.edu), set(c, 'extramural')) },
      { id: 'decline', apply: () => {} },
    ],
    typical: () => [0.4, 0.2, 0.4],
  },
  // At the front: the branch of service. Changes the risk a little (model).
  {
    id: 'regiment',
    variants: true,
    when: c => has(c, 'front') && !has(c, 'nurse') && y(c, 1941, 1944),
    q: c => (has(c, 'horseman') ? 'chq.regiment.horse' : 'chq.regiment.plain'),
    options: [
      { id: 'rifle', apply: c => set(c, 'rifle') },
      { id: 'artillery', apply: c => set(c, 'artillery') },
      {
        id: 'special',
        apply: c => {
          if (has(c, 'horseman')) return set(c, 'cavalry')
          if (c.p.literate) return set(c, 'signal')
          set(c, 'rifle')
          c.p.log.push({ year: c.year, age: c.age, key: 'regiment.no_signal', tone: 'calm' })
        },
      },
    ],
    typical: () => [0.6, 0.25, 0.15],
  },
  // After the war: home to the aul, stay in town, or go to the big construction sites.
  {
    id: 'postwar',
    when: c => c.year === 1946 && c.age >= 17 && c.age <= 50 && home(c) && free(c),
    options: [
      { id: 'village', apply: c => (c.p.way === 'town' && set(c, 'back_home'), (c.p.way = 'village')) },
      { id: 'town', apply: c => toTown(c) },
      { id: 'build', apply: c => (toTown(c), (c.p.job = c.p.place === 'arka' ? 'job.miner' : 'job.builder')) },
    ],
    typical: () => [0.55, 0.3, 0.15],
  },
  // Regions.
  {
    id: 'polygon_move',
    when: c => has(c, 'polygon') && c.year === 1953 && home(c),
    options: [
      { id: 'move', apply: c => (del(c, 'polygon'), set(c, 'left_polygon'), toTown(c)) },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.25, 0.75],
  },
  {
    id: 'aral_move',
    when: c => has(c, 'aral') && c.year === 1979 && home(c),
    options: [
      { id: 'move', apply: c => (del(c, 'aral'), toTown(c)) },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.4, 0.6],
  },
  {
    id: 'oil',
    when: c => (c.p.region === 'adai' || c.p.region === 'oral' || c.p.region === 'aktobe') && c.year === 1964 && c.age >= 18 && c.age <= 45 && home(c) && free(c),
    options: [
      { id: 'go', apply: c => (toTown(c), (c.p.job = 'job.oil')) },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.3, 0.7],
  },
  {
    id: 'karaganda',
    when: c => c.p.region === 'arka' && c.year === 1950 && c.age >= 18 && c.age <= 40 && home(c) && free(c) && c.p.job !== 'job.miner',
    options: [
      { id: 'mine', apply: c => (toTown(c), (c.p.job = 'job.miner')) },
      { id: 'steel', apply: c => (toTown(c), (c.p.job = 'job.steel')) },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.2, 0.15, 0.65],
  },
  {
    id: 'almaty',
    when: c => c.p.region === 'zhetisu' && c.year === 1960 && c.age >= 20 && c.age <= 45 && home(c) && free(c) && c.p.way !== 'town',
    options: [
      { id: 'go', apply: c => toTown(c) },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.3, 0.7],
  },
  {
    id: 'rice',
    when: c => c.p.group === 'korean' && c.year === 1939 && c.age >= 14 && home(c),
    options: [
      { id: 'rice', apply: c => (c.p.job = 'job.rice') },
      { id: 'town', apply: c => toTown(c) },
    ],
    typical: () => [0.7, 0.3],
  },
  {
    id: 'settler_after',
    when: c => c.p.group === 'german' && c.year === 1956 && c.age >= 16 && home(c) && free(c),
    options: [
      { id: 'stay', apply: () => {} },
      { id: 'town', apply: c => toTown(c) },
    ],
    typical: () => [0.6, 0.4],
  },
  // Children: let the eldest go to study in the city?
  {
    id: 'kids',
    when: c => c.p.childYears.length > 0 && c.year - c.p.childYears[0] === 17 && c.year >= 1945 && home(c) && free(c),
    options: [
      { id: 'let', apply: c => set(c, 'kid_city') },
      { id: 'keep', apply: c => set(c, 'kid_home') },
    ],
    typical: c => (c.year < 1960 ? [0.35, 0.65] : [0.6, 0.4]),
  },
  // Old age: the family hearth (қара шаңырақ) with the youngest son, or to the children in town.
  {
    id: 'old',
    variants: true,
    when: c => c.age === 63 && c.year >= 1955 && home(c) && free(c) && c.p.childYears.length > 0,
    q: c => (kz(c) ? 'chq.old.kz' : 'chq.old.plain'),
    options: [
      { id: 'stay', apply: c => set(c, 'old_home') },
      { id: 'town', apply: c => (toTown(c), set(c, 'old_town')) },
    ],
    typical: () => [0.6, 0.4],
  },
  // The 1990s in town.
  {
    id: 'nineties_town',
    when: c => c.year === 1992 && c.age >= 18 && c.age <= 70 && home(c) && c.p.way === 'town' && c.p.group !== 'german',
    options: [
      { id: 'garden', apply: c => set(c, 'dacha') },
      { id: 'trade', apply: c => set(c, 'trader') },
      { id: 'side', apply: c => set(c, 'side_job') },
    ],
    typical: c => (c.age > 55 ? [0.7, 0.05, 0.25] : [0.35, 0.35, 0.3]),
  },
  // The 1990s in the countryside.
  {
    id: 'nineties',
    when: c => c.year === 1992 && c.age >= 18 && c.age <= 70 && home(c) && c.p.way !== 'town' && c.p.group !== 'german',
    options: [
      { id: 'herd', apply: c => set(c, 'own_herd') },
      { id: 'trade', apply: c => set(c, 'trader') },
      { id: 'kids', apply: c => (toTown(c), set(c, 'with_kids')) },
    ],
    typical: c => (c.age > 55 ? [0.4, 0.05, 0.55] : [0.4, 0.35, 0.25]),
  },
]

// ---------- consequences of the choices, rare events, everyday texture ----------
const once = (id: string, when: (c: Ctx) => boolean, chance: number | ((c: Ctx) => number), tone: EventDef['tone'] = 'calm', big = false, apply?: EventDef['apply']): EventDef => ({
  id,
  once: true,
  tone,
  big,
  when,
  chance: typeof chance === 'number' ? () => chance : chance,
  apply,
})

export const EVENTS_MORE: EventDef[] = [
  // Consequences.
  once('madrasa.line', c => has(c, 'madrasa') && c.age === 15, 1, 'calm', true),
  once('komsomol.line', c => has(c, 'komsomol') && c.age === 16 && free(c), 0.6),
  once('eloped.peace', c => has(c, 'eloped') && free(c) && home(c), 0.5, 'good'),
  once('career.chair.line', c => has(c, 'official') && c.year < 1941 && free(c), 1, 'calm', true),
  once('career.boss.line', c => has(c, 'boss') && free(c), 1, 'good', true),
  once('extramural.line', c => has(c, 'extramural') && free(c), 0.5, 'good', true, c => ((c.p.job = jobFor(c)), { vars: { job: c.p.job } })),
  once('cavalry.line', c => has(c, 'cavalry') && has(c, 'front'), 1, 'bad'),
  once('back_home.line', c => has(c, 'back_home') && c.year === 1947, 1, 'calm'),
  once('polygon.left', c => has(c, 'left_polygon') && c.year === 1954, 1, 'good', true),
  once('kid_city.line', c => has(c, 'kid_city') && c.p.childYears.length > 0 && c.year - c.p.childYears[0] >= 22, 1, 'good', true),
  once('kid_home.line', c => has(c, 'kid_home') && c.p.childYears.length > 0 && c.year - c.p.childYears[0] >= 20, 0.6, 'calm'),
  once('old_home.line', c => has(c, 'old_home') && c.age >= 65 && free(c), 0.6, 'calm'),
  once('old_town.line', c => has(c, 'old_town') && c.age >= 64, 0.6, 'calm'),
  once('herd.line', c => has(c, 'own_herd') && c.year >= 1994, 0.5, 'calm'),
  once('trader.line', c => has(c, 'trader') && c.year >= 1993, 0.7, 'calm', true),
  once('dacha.line', c => has(c, 'dacha') && c.year >= 1993, 0.6, 'calm'),
  once('side_job.line', c => has(c, 'side_job') && c.year >= 1993, 0.6, 'calm'),
  once('steel.line', c => c.p.job === 'job.steel' && c.year === 1959 && home(c), 0.6, 'history'),
  once('oil.line', c => c.p.job === 'job.oil' && c.year >= 1966, 0.8, 'calm', true),
  // The 1953 hydrogen bomb test: people from nearby villages were taken away for the day (model).
  once('polygon.1953', c => has(c, 'polygon') && c.year === 1953, 1, 'bad', false),

  // Rare events.
  once('rare.kemin1911', c => c.p.region === 'zhetisu' && c.year === 1911 && home(c), 1, 'history'),
  once('rare.sel1921', c => c.p.region === 'zhetisu' && c.year === 1921 && home(c), 0.4, 'history'),
  once('rare.zhambyl', c => kz(c) && c.p.region === 'zhetisu' && y(c, 1936, 1944) && c.age >= 8 && home(c) && free(c), 0.012, 'good', true),
  once('rare.auezov', c => c.p.region === 'shygys' && y(c, 1925, 1955) && c.age >= 10 && c.p.literate && home(c) && free(c), 0.003, 'good', true),
  once('rare.baikonur', c => (c.p.region === 'syr' || c.p.region === 'arka') && y(c, 1957, 1975) && home(c) && free(c), 0.006, 'good', true),
  once('rare.brother', c => y(c, 1956, 1990) && (has(c, 'famine') || has(c, 'fled') || has(c, 'deported')) && home(c) && free(c), 0.003, 'good', true),
  once('rare.hero_mother', c => !male(c) && c.p.childYears.length >= 10 && c.year >= 1944, 1, 'good', true),
  once('rare.car', c => y(c, 1965, 1990) && c.age >= 30 && c.age <= 65 && home(c) && free(c), 0.006, 'good', true),
  once('rare.plane', c => y(c, 1958, 1985) && c.age >= 20 && home(c) && free(c), 0.012, 'good'),
  once('rare.wolf_hunt', c => male(c) && nomadic(c) && has(c, 'horseman') && c.age >= 14 && c.age <= 30 && c.year < 1935 && home(c) && free(c), 0.01, 'good', true),
  once('rare.fire', c => c.age >= 10 && home(c) && free(c) && c.year < 1975, 0.002, 'bad', true),

  // Everyday texture: one small line in some quiet years, picked to fit the time and the person.
  {
    id: 'tex',
    tone: 'calm',
    when: c => c.age >= 8 && home(c) && free(c),
    chance: () => 0.45,
    apply: c => {
      const pool = texture(c)
      if (!pool.length) return { silent: true }
      return { key: c.r.pick(pool) }
    },
  },
]

function texture(c: Ctx): string[] {
  const p = c.p
  const out: string[] = []
  const yr = c.year
  if (y(c, 1931, 1934) || y(c, 1941, 1945)) {
    out.push('tex.hard.bread', 'tex.hard.wait')
    return out
  }
  if (nomadic(c) && yr < 1930) out.push('tex.nomad.move', 'tex.nomad.kumys', 'tex.nomad.foal')
  if (p.job === 'job.kolkhoz' || p.job === 'job.horses' || p.job === 'job.tractor') {
    out.push('tex.kolkhoz.harvest', 'tex.kolkhoz.drought')
    // Collective farms paid in workdays until the 1966 reform.
    if (yr < 1966) out.push('tex.kolkhoz.workdays')
  }
  if (p.job === 'job.miner' || p.job === 'job.steel' || p.job === 'job.oil' || p.job === 'job.worker' || p.job === 'job.builder') out.push('tex.work.shift', 'tex.work.plan', 'tex.work.hostel')
  if (p.job === 'job.teacher') out.push('tex.teacher.class', 'tex.teacher.letter')
  if (p.job === 'job.craft') out.push('tex.craft.order', 'tex.craft.felt')
  if (p.way === 'town' && yr >= 1955) out.push('tex.town.flat', 'tex.town.queue')
  // Schools for everyone came only in the XX century.
  if (c.p.era === 'xx' && p.childYears.some(b => yr - b === 7)) out.push('tex.family.school')
  if (has(c, 'kid_city') && p.childYears.length && yr - p.childYears[0] >= 19) out.push('tex.family.letter')
  if (kz(c)) out.push('tex.kz.guests')
  // Nauryz was not officially celebrated from 1926 to 1988.
  if (kz(c) && (yr < 1926 || yr >= 1988)) out.push('tex.kz.nauryz')
  if (yr >= 1960) out.push('tex.radio.song', 'tex.summer.relatives')
  if (c.age >= 55) out.push('tex.old.health')
  if (c.age >= 55 && p.grandchildren > 0) out.push('tex.old.grandkids')
  if (c.age < 18) out.push(c.p.era === 'xx' ? 'tex.kid.friends' : 'tex.kid.aul', 'tex.kid.river')
  return out
}

