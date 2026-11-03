/**
 * XVIII century: born about 1700–1735. Sources and estimates: docs/era-18.md (section 6 is the engine table).
 * There are no censuses: every probability is an estimate, and the game says so.
 */
import type { ChoiceDef, Ctx, EventDef, Hazard, Region } from './types'
import { addNames, type NameTriple } from './names'
import { COMMON_CHOICES, COMMON_EVENTS, baseHazard, bornEarly, jutEvent, jutHazard, spouseDies } from './early'
import { del, free, has, home, male, set, y } from './events'

const P = 'e18'

const M: NameTriple[] = [
  ['Жәнібек', 'Джанибек', 'Zhanibek'], ['Есет', 'Есет', 'Eset'], ['Тайлақ', 'Тайлак', 'Tailak'], ['Олжабай', 'Олжабай', 'Olzhabai'],
  ['Малайсары', 'Малайсары', 'Malaisary'], ['Бердібек', 'Бердибек', 'Berdibek'], ['Құлсары', 'Кульсары', 'Kulsary'], ['Байбөрі', 'Байбори', 'Baibori'],
  ['Қойбағар', 'Койбагар', 'Koibagar'], ['Атымтай', 'Атымтай', 'Atymtai'], ['Тілеуберді', 'Тлеуберды', 'Tileuberdi'], ['Сарыбай', 'Сарыбай', 'Sarybai'],
  ['Есенгелді', 'Есенгельды', 'Yesengeldi'], ['Қошқар', 'Кошкар', 'Koshkar'], ['Жолдыбай', 'Джолдыбай', 'Zholdybai'], ['Ақберді', 'Акберды', 'Akberdi'],
]
const F: NameTriple[] = [
  ['Айбала', 'Айбала', 'Aibala'], ['Ақтоты', 'Актоты', 'Aktoty'], ['Қарашаш', 'Карашаш', 'Karashash'], ['Бопай', 'Бопай', 'Bopai'],
  ['Ақбөпе', 'Акбопе', 'Akbope'], ['Сырға', 'Сырга', 'Syrga'], ['Ұлбике', 'Улбике', 'Ulbike'], ['Айбике', 'Айбике', 'Aibike'],
  ['Ақжүніс', 'Акжунис', 'Akzhunis'], ['Тоқтабике', 'Токтабике', 'Toktabike'], ['Күнбала', 'Кунбала', 'Kunbala'], ['Назым', 'Назым', 'Nazym'],
]
addNames('kz18', M, F)

const hit1723: Region[] = ['zhetisu', 'shygys', 'syr', 'arka']
const west: Region[] = ['oral', 'aktobe', 'kostanai', 'adai']
const inR = (c: Ctx, rs: Region[]) => rs.includes(c.p.region)
const man = (c: Ctx, a: number, b: number) => male(c) && c.age >= a && c.age <= b

export const born18 = bornEarly({
  prefix: P,
  names: 'kz18',
  years: [1700, 1735],
  yearWeight: y => (y >= 1723 && y <= 1727 ? 0.5 : 1),
  // Rough share of people by region (estimate on zhuz territories, docs/era-18.md §2.1).
  region: { zhetisu: 0.14, syr: 0.16, arka: 0.16, shygys: 0.12, oral: 0.14, adai: 0.05, kostanai: 0.1, aktobe: 0.13 },
  // Towns of the Syr Darya (Turkestan, Sairam) had settled people; elsewhere almost everyone migrated.
  way: reg => (reg === 'syr' ? { seminomad: 0.6, nomad: 0.3, town: 0.1 } : { seminomad: 0.65, nomad: 0.35 }),
})

/** 1723–1727 losses by region (estimate, docs/era-18.md §3.4): 40% of the risk in 1723, 40% in 1724–25, 20% in 1726–27. */
const AKTABAN: Partial<Record<Region, number>> = { zhetisu: 0.3, shygys: 0.3, syr: 0.3, arka: 0.25, kostanai: 0.12, aktobe: 0.12, oral: 0.06, adai: 0.06 }
const AKTABAN_SPLIT: Record<number, number> = { 1723: 0.4, 1724: 0.2, 1725: 0.2, 1726: 0.1, 1727: 0.1 }

export const CHOICES_18: ChoiceDef[] = [
  ...COMMON_CHOICES,
  {
    id: 'e18.flight',
    when: c => c.year === 1723 && home(c) && (inR(c, hit1723) || c.p.region === 'kostanai'),
    q: c => (c.age < 15 ? 'chq.e18.flight.child' : 'chq.e18.flight'),
    options: [
      { id: 'south', apply: c => ((c.p.way = 'abroad'), set(c, 'e18.south', 'e18.fled')) },
      { id: 'west', apply: c => (set(c, 'e18.west', 'e18.fled', 'e18.from_east'), (c.p.region = c.r.chance(0.5) ? 'kostanai' : 'aktobe')) },
      { id: 'stay', apply: c => set(c, 'e18.stay') },
    ],
    typical: () => [0.45, 0.35, 0.2],
  },
  {
    id: 'e18.militia',
    when: c => y(c, 1726, 1729) && man(c, 16, 45) && home(c) && free(c),
    chance: () => 0.5,
    options: [
      { id: 'go', apply: c => set(c, 'e18.militia') },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.4, 0.6],
  },
  {
    id: 'e18.batyr',
    when: c => y(c, 1731, 1765) && man(c, 17, 40) && home(c) && free(c) && !has(c, 'e18.batyr_done'),
    chance: () => 0.08,
    options: [
      { id: 'go', apply: c => (set(c, 'e18.batyr', 'e18.batyr_done'), c.p.flags.add(`e18.batyr_from.${c.year}`)) },
      { id: 'stay', apply: c => set(c, 'e18.batyr_done') },
    ],
    typical: () => [0.3, 0.7],
  },
  {
    id: 'e18.return',
    when: c => y(c, 1758, 1762) && home(c) && free(c) && c.age >= 16 && (has(c, 'e18.from_east') || c.p.region === 'arka'),
    chance: () => 0.4,
    options: [
      { id: 'go', apply: c => ((c.p.region = c.r.chance(0.6) ? 'zhetisu' : 'shygys'), set(c, 'e18.returned_east')) },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.5, 0.5],
  },
  {
    id: 'e18.trade',
    when: c => y(c, 1745, 1785) && c.age >= 18 && c.age <= 60 && home(c) && free(c) && inR(c, ['oral', 'aktobe', 'kostanai', 'arka', 'shygys']) && !has(c, 'e18.traded'),
    chance: () => 0.1,
    options: [
      { id: 'go', apply: c => set(c, 'e18.traded', 'e18.trade') },
      { id: 'stay', apply: c => set(c, 'e18.traded') },
    ],
    typical: () => [0.4, 0.6],
  },
  {
    id: 'e18.barymta',
    when: c => man(c, 18, 50) && home(c) && free(c) && !has(c, 'e18.barymta_done'),
    chance: () => 0.03,
    options: [
      { id: 'raid', apply: c => set(c, 'e18.barymta_done', 'e18.raid') },
      { id: 'court', apply: c => set(c, 'e18.barymta_done', 'e18.court') },
      { id: 'forgive', apply: c => set(c, 'e18.barymta_done') },
    ],
    typical: () => [0.35, 0.45, 0.2],
  },
  {
    id: 'e18.biy',
    when: c => male(c) && c.age === 12 && home(c),
    chance: () => 0.3,
    options: [
      { id: 'study', apply: c => set(c, 'e18.biy_student') },
      { id: 'home', apply: () => {} },
    ],
    typical: () => [0.3, 0.7],
  },
  {
    id: 'e18.amenger',
    when: c => !male(c) && has(c, 'widowed_now') && c.age <= 55,
    options: [
      { id: 'accept', apply: c => (del(c, 'widowed_now', 'widowed'), set(c, 'e18.amenger')) },
      { id: 'leave', apply: c => (del(c, 'widowed_now'), set(c, 'e18.left_kin')) },
    ],
    typical: () => [0.6, 0.4],
  },
  {
    id: 'e18.torghut',
    when: c => c.year === 1771 && man(c, 16, 50) && home(c) && free(c) && inR(c, ['oral', 'kostanai', 'arka', 'zhetisu', 'aktobe']),
    options: [
      { id: 'chase', apply: c => set(c, 'e18.torghut') },
      { id: 'away', apply: () => {} },
    ],
    typical: () => [0.3, 0.7],
  },
  {
    id: 'e18.pugachev',
    when: c => c.year === 1774 && man(c, 16, 50) && home(c) && free(c) && inR(c, ['oral', 'aktobe']),
    options: [
      { id: 'join', apply: c => set(c, 'e18.pugachev') },
      { id: 'away', apply: () => {} },
    ],
    typical: () => [0.2, 0.8],
  },
  {
    id: 'e18.syrym',
    when: c => c.year === 1785 && man(c, 16, 60) && home(c) && free(c) && inR(c, ['oral', 'aktobe', 'kostanai']),
    options: [
      { id: 'join', apply: c => set(c, 'e18.syrym') },
      { id: 'khan', apply: c => set(c, 'e18.khan_side') },
      { id: 'leave', apply: c => set(c, 'e18.left_line') },
    ],
    typical: () => [0.35, 0.3, 0.35],
  },
  {
    id: 'e18.jut_way',
    when: c => has(c, `e18.jut.${c.year - 1}`) && c.age >= 18 && home(c) && free(c),
    options: [
      { id: 'migrate', apply: c => set(c, 'e18.jut_migrated') },
      { id: 'slaughter', apply: c => set(c, 'e18.jut_slaughter') },
      { id: 'hire', apply: c => set(c, 'e18.hired') },
    ],
    typical: () => [0.4, 0.35, 0.25],
  },
  {
    id: 'e18.old',
    when: c => c.age === 60 && home(c) && free(c) && c.p.childYears.length > 0,
    options: [
      { id: 'hearth', apply: c => set(c, 'e18.hearth') },
      { id: 'pilgrim', apply: c => set(c, 'e18.pilgrim') },
    ],
    typical: () => [0.75, 0.25],
  },
  {
    id: 'e18.ransom',
    when: c => has(c, 'e18.kin_captive') && home(c) && free(c),
    options: [
      { id: 'pay', apply: c => (del(c, 'e18.kin_captive'), set(c, c.r.chance(0.7) ? 'e18.kin_back' : 'e18.kin_lost')) },
      { id: 'wait', apply: c => (del(c, 'e18.kin_captive'), set(c, c.r.chance(0.2) ? 'e18.kin_back' : 'e18.kin_lost')) },
    ],
    typical: () => [0.6, 0.4],
  },
]

const once = (id: string, when: (c: Ctx) => boolean, chance: number | ((c: Ctx) => number), tone: EventDef['tone'] = 'calm', big = false, apply?: EventDef['apply']): EventDef => ({
  id,
  once: true,
  tone,
  big,
  when,
  chance: typeof chance === 'number' ? () => chance : chance,
  apply,
})
const histLine = (id: string, year: number, when: (c: Ctx) => boolean = () => true, minAge = 5) =>
  once(id, c => c.year === year && c.age >= minAge && (home(c) || id === 'e18.hist.dzungaria') && when(c), 1, 'history')

export const EVENTS_18: EventDef[] = [
  ...COMMON_EVENTS,
  // Big history lines.
  histLine('e18.hist.tauke', 1710),
  once('e18.aktaban', c => c.year === 1723 && (inR(c, hit1723) || c.p.region === 'kostanai' || c.p.way === 'abroad'), 1, 'bad', true),
  once('e18.refugees', c => c.year === 1723 && inR(c, ['oral', 'aktobe', 'adai']) && !has(c, 'e18.fled'), 1, 'bad'),
  once('e18.captive', c => c.year === 1723 && inR(c, hit1723) && !has(c, 'e18.south'), c => (c.p.region === 'arka' ? 0.01 : 0.03) * (has(c, 'e18.stay') ? 3 : 1), 'bad', true, c => set(c, 'captive18')),
  once('e18.captive.free', c => has(c, 'captive18') && c.year >= 1725, 0.15, 'good', true, c => del(c, 'captive18')),
  once('e18.south.life', c => has(c, 'e18.south') && c.year === 1724, 1, 'bad'),
  once('e18.home_again', c => has(c, 'e18.south') && c.p.way === 'abroad' && y(c, 1726, 1736), 0.3, 'good', true, c => {
    c.p.way = 'seminomad'
    c.p.region = c.r.chance(0.5) ? 'syr' : 'arka'
  }),
  histLine('e18.hist.ordabasy', 1726),
  once('e18.bulanty', c => c.year === 1727 && has(c, 'e18.militia'), 1, 'history', true),
  once('e18.anyrakay', c => c.year === 1730 && has(c, 'e18.militia'), 1, 'history', true),
  histLine('e18.hist.anyrakay', 1730, c => !has(c, 'e18.militia')),
  histLine('e18.hist.oath1731', 1731, c => inR(c, west)),
  histLine('e18.hist.oath1740', 1740, c => inR(c, ['arka', 'shygys', 'kostanai'])),
  once('e18.raid1741', c => c.year === 1741 && inR(c, ['arka', 'shygys']) && home(c) && c.age >= 5, 0.3, 'bad', true),
  once('e18.batyr.loot', c => has(c, 'e18.batyr'), 0.25, 'good', true),
  {
    id: 'e18.batyr.back',
    once: true,
    tone: 'good',
    big: true,
    when: c => has(c, 'e18.batyr') && [...c.p.flags].some(f => f.startsWith('e18.batyr_from.') && c.year - Number(f.split('.')[2]) >= 5),
    chance: () => 0.5,
    apply: c => del(c, 'e18.batyr'),
  },
  histLine('e18.hist.abulkhair', 1748, c => inR(c, west)),
  histLine('e18.hist.uralban', 1756, c => c.p.region === 'oral'),
  histLine('e18.hist.dzungaria', 1758),
  once('e18.returned.line', c => has(c, 'e18.returned_east') && free(c), 0.5, 'good', true),
  once('e18.trade.line', c => has(c, 'e18.trade'), 1, 'calm', true, c => (del(c, 'e18.trade'), c.r.chance(0.15) ? { key: 'e18.trade.cheated' } : undefined)),
  once('e18.raid.line', c => has(c, 'e18.raid'), 1, 'calm', true, c => (del(c, 'e18.raid'), c.r.chance(0.5) ? { key: 'e18.raid.back' } : { key: 'e18.raid.dispute' })),
  once('e18.court.line', c => has(c, 'e18.court'), 1, 'calm', false, c => void del(c, 'e18.court')),
  once('e18.biy.line', c => has(c, 'e18.biy_student') && c.age >= 28 && home(c) && free(c), 0.3, 'good', true),
  once('e18.amenger.line', c => has(c, 'e18.amenger'), 1, 'calm'),
  once('e18.left_kin.line', c => has(c, 'e18.left_kin'), 1, 'calm'),
  histLine('e18.hist.abylai_khan', 1771),
  once('e18.torghut.line', c => c.year === 1771 && has(c, 'e18.torghut'), 1, 'history', true),
  once('e18.pugachev.line', c => c.year === 1774 && has(c, 'e18.pugachev'), 1, 'history', true),
  histLine('e18.hist.abylai_death', 1781),
  once('e18.syrym.line', c => y(c, 1786, 1792) && has(c, 'e18.syrym'), 0.3, 'history', true),
  once('e18.khan_side.line', c => has(c, 'e18.khan_side') && c.year >= 1786, 1, 'calm'),
  once('e18.left_line.line', c => has(c, 'e18.left_line') && c.year >= 1786, 1, 'calm'),
  once('e18.kin_captive', c => home(c) && c.age >= 15 && (y(c, 1723, 1745) || (inR(c, west) && y(c, 1758, 1790))), 0.006, 'bad', false, c => set(c, 'e18.kin_captive')),
  once('e18.kin_back.line', c => has(c, 'e18.kin_back'), 1, 'good', true),
  once('e18.kin_lost.line', c => has(c, 'e18.kin_lost'), 1, 'grief'),
  once('e18.jut_migrated.line', c => has(c, 'e18.jut_migrated'), 1, 'calm'),
  once('e18.jut_slaughter.line', c => has(c, 'e18.jut_slaughter'), 1, 'calm'),
  once('e18.hired.line', c => has(c, 'e18.hired'), 1, 'calm', true),
  once('e18.hearth.line', c => has(c, 'e18.hearth') && c.age >= 62, 0.5, 'good'),
  once('e18.pilgrim.line', c => has(c, 'e18.pilgrim'), 1, 'good', true),
  jutEvent(P, c => (inR(c, ['zhetisu', 'shygys']) && y(c, 1751, 1761) ? 0.25 : 0.1)),
  spouseDies(P),
]

export const HAZARDS_18: Hazard[] = [
  baseHazard,
  jutHazard,
  {
    id: 'aktaban',
    q: c => {
      const share = AKTABAN_SPLIT[c.year]
      if (!share) return 0
      let m = 1
      if (has(c, 'e18.south')) m = c.year === 1723 ? 0.6 : 1.2
      else if (has(c, 'e18.west')) m = 0.8
      else if (has(c, 'e18.stay')) m = 1.3
      const age = c.age < 5 || c.age >= 60 ? 1.6 : 1
      const reg = has(c, 'e18.fled') && !has(c, 'e18.south') ? (AKTABAN[c.p.region] ?? 0.12) + 0.1 : (AKTABAN[c.p.region] ?? 0.12)
      return Math.min(0.6, reg * share * m * age)
    },
  },
  { id: 'smallpox', q: c => ((y(c, 1743, 1744) || y(c, 1755, 1758)) && inR(c, ['zhetisu', 'shygys']) ? (c.age < 10 ? 0.028 : 0.016) : 0.0) },
  { id: 'captive', q: c => (has(c, 'captive18') ? 0.08 : 0) },
  { id: 'battle', q: c => (has(c, 'e18.militia') ? (c.year === 1727 ? 0.08 : c.year === 1730 ? 0.1 : 0) : 0) },
  { id: 'batyr', q: c => (has(c, 'e18.batyr') ? 0.05 : 0) },
  { id: 'raid1741', q: c => (c.year === 1741 && inR(c, ['arka', 'shygys']) && home(c) ? 0.04 : 0) },
  { id: 'torghut', q: c => (c.year === 1771 && has(c, 'e18.torghut') ? 0.05 : 0) },
  { id: 'pugachev', q: c => (c.year === 1774 && has(c, 'e18.pugachev') ? 0.1 : 0) },
  { id: 'syrym', q: c => (has(c, 'e18.syrym') && y(c, 1785, 1797) ? 0.02 : 0) },
  { id: 'feud', q: c => (has(c, 'e18.raid') ? 0.03 : 0) },
]
