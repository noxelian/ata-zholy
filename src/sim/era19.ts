/**
 * XIX century: born about 1810–1850, living into the 1890s. Sources and estimates: docs/era-19.md (section 6 is the engine table).
 * There are no data on the mortality of nomadic Kazakhs in this century: every probability is an estimate, and the game says so.
 */
import type { ChoiceDef, Ctx, EventDef, Hazard, Region } from './types'
import { addNames, type NameTriple } from './names'
import { COMMON_CHOICES, COMMON_EVENTS, bornEarly, jutEvent, jutHazard, spouseDies } from './early'
import { del, free, has, home, male, set, y } from './events'

const P = 'e19'

// Names: docs/era-19.md §5 (expert selection, no frequency data).
const M: NameTriple[] = [
  ['Құнанбай', 'Кунанбай', 'Kunanbai'], ['Исатай', 'Исатай', 'Isatai'], ['Есет', 'Есет', 'Eset'], ['Жанқожа', 'Жанкожа', 'Zhankozha'],
  ['Наурызбай', 'Наурызбай', 'Nauryzbai'], ['Байтақ', 'Байтак', 'Baitak'], ['Ыбырай', 'Ибрай', 'Ybyrai'], ['Сүйінбай', 'Суюнбай', 'Suyinbai'],
  ['Құдайберген', 'Кудайберген', 'Kudaibergen'], ['Жиенбай', 'Джиенбай', 'Zhienbai'], ['Тілеу', 'Тлеу', 'Tileu'], ['Бекет', 'Бекет', 'Beket'],
  ['Досан', 'Досан', 'Dosan'], ['Мырзабек', 'Мурзабек', 'Myrzabek'], ['Жәрдем', 'Джардем', 'Zhardem'], ['Құттыбай', 'Куттыбай', 'Kuttybai'],
  ['Сейдахмет', 'Сейдахмет', 'Seidakhmet'], ['Әбілқайыр', 'Абулхаир', 'Abilkaiyr'], ['Тәжі', 'Таджи', 'Tazhi'], ['Бөкен', 'Бокен', 'Boken'],
]
const F: NameTriple[] = [
  ['Зере', 'Зере', 'Zere'], ['Ұлжан', 'Улжан', 'Ulzhan'], ['Бопай', 'Бопай', 'Bopai'], ['Айғаным', 'Айганым', 'Aiganym'],
  ['Сара', 'Сара', 'Sara'], ['Ақбала', 'Акбала', 'Akbala'], ['Балқадиша', 'Балкадиша', 'Balkadisha'], ['Қаракөз', 'Каракоз', 'Karakoz'],
  ['Күнімжан', 'Кунимжан', 'Kunimzhan'], ['Айман', 'Айман', 'Aiman'], ['Шолпан', 'Шолпан', 'Sholpan'], ['Ұлбосын', 'Улбосын', 'Ulbosyn'],
  ['Бибі', 'Биби', 'Bibi'], ['Тоқжан', 'Токжан', 'Tokzhan'], ['Айша', 'Айша', 'Aisha'], ['Мәриям', 'Мариям', 'Mariyam'],
  ['Зейнеп', 'Зейнеп', 'Zeinep'], ['Батима', 'Батима', 'Batima'],
]
addNames('kz19', M, F)

const WEST: Region[] = ['oral', 'aktobe', 'kostanai']
/** Regions under the Steppe statute of 1868 (Ural, Turgai, Akmola, Semipalatinsk oblasts). */
const STEPPE: Region[] = ['oral', 'aktobe', 'kostanai', 'arka', 'shygys']
const inR = (c: Ctx, rs: Region[]) => rs.includes(c.p.region)
const man = (c: Ctx, a: number, b: number) => male(c) && c.age >= a && c.age <= b
const adult = (c: Ctx, a = 16, b = 65) => c.age >= a && c.age <= b
/** Leaving the country ends taking part in a rising (and its follow-up lines). */
const leaveRisings = (c: Ctx) => del(c, 'e19.isatai', 'e19.kenesary', 'e19.eset', 'e19.zhankozha', 'e19.ural', 'e19.adai')

/** At home and free (not in Khiva captivity, not abroad). `free` also checks the 'captive' flag. */
const ok = (c: Ctx) => home(c) && free(c)
/** Lost most of the herd: the way to the жатақ choice. */
const poor = (c: Ctx, p: number) => {
  if (c.r.chance(p)) set(c, 'e19.poor')
}

export const born19 = bornEarly({
  prefix: P,
  names: 'kz19',
  years: [1810, 1850],
  // Rough share of people by region (estimate on zhuz territories, docs/era-19.md §1.1): the Middle zhuz in Sary-Arka and
  // on the Irtysh, the Junior zhuz from the Bukey Horde to Turgai, the Senior zhuz in Zhetysu and on the Syr Darya.
  region: { zhetisu: 0.15, syr: 0.15, arka: 0.18, shygys: 0.1, oral: 0.14, adai: 0.05, kostanai: 0.1, aktobe: 0.13 },
  // Almost everyone migrated; on the Mangyshlak the routes were longest. Жатақ (settled poor) appear only through choices.
  way: reg => (reg === 'adai' ? { nomad: 0.7, seminomad: 0.3 } : reg === 'syr' || reg === 'zhetisu' ? { seminomad: 0.7, nomad: 0.3 } : { seminomad: 0.6, nomad: 0.4 }),
})

/**
 * Yearly death risk without medicine (estimate, docs/era-19.md §3.1 and §6.1): about 22% die in the first year and another
 * 12% by five (≈1/3 before five, with smallpox and juts added below); adults 1.1% at 20–40, 2.2% at 40–60, 5–6% after 60.
 * Lower than the XVIII century: Muslim groups of the empire lost fewer infants than the Orthodox, and the milk diet helped.
 */
function q19(age: number): number {
  if (age === 0) return 0.22
  if (age < 5) return 0.033
  if (age < 15) return 0.005
  if (age < 20) return 0.007
  if (age < 40) return 0.011
  if (age < 60) return 0.022
  if (age < 70) return 0.05
  if (age < 80) return 0.1
  return 0.2
}

/** Cholera years (docs/era-19.md §3.3): 1830 in the west (Orenburg), 1848, 1872 ⚠ (weak), 1892. */
const CHOLERA: Record<number, number> = { 1830: 1, 1848: 1, 1872: 0.5, 1892: 1 }
/** Big juts of the west (§3.2): winter 1879–80 (59% of the herd in Turgai and Irgiz uezds) and 1891–92 (17.5%). */
const bigJut = (c: Ctx) => inR(c, WEST) && (y(c, 1879, 1880) || y(c, 1891, 1892))

export const CHOICES_19: ChoiceDef[] = [
  ...COMMON_CHOICES,
  // 1. Isatai and Makhambet against khan Zhangir, 1836–1838 (Bukey Horde).
  {
    id: 'e19.isatai',
    when: c => y(c, 1836, 1837) && man(c, 16, 55) && c.p.region === 'oral' && ok(c),
    options: [
      { id: 'join', apply: c => set(c, 'e19.isatai') },
      { id: 'help', apply: c => set(c, 'e19.isatai_help') },
      { id: 'away', apply: c => set(c, 'e19.isatai_away') },
    ],
    typical: () => [0.3, 0.3, 0.4],
  },
  // 2. Kenesary, 1837–1847: the rising went across the steppe, but not to every aul (§6.1: 0.5 a year a rumour, one choice).
  {
    id: 'e19.kenesary',
    when: c => y(c, 1838, 1845) && man(c, 16, 50) && inR(c, ['arka', 'kostanai', 'aktobe', 'syr']) && ok(c),
    chance: () => 0.25,
    options: [
      { id: 'join', apply: c => set(c, 'e19.kenesary', `e19.kenesary_from.${c.p.region}`) },
      { id: 'help', apply: c => set(c, 'e19.kenesary_help') },
      { id: 'away', apply: c => set(c, 'e19.kenesary_away') },
    ],
    typical: () => [0.25, 0.35, 0.4],
  },
  // 4. Eset Kotibaruly, 1847–1858 (Aktobe, Turgai): local actions, so a rare choice.
  {
    id: 'e19.eset',
    when: c => y(c, 1847, 1856) && man(c, 16, 50) && inR(c, ['aktobe', 'kostanai']) && ok(c),
    chance: () => 0.12,
    options: [
      { id: 'join', apply: c => set(c, 'e19.eset') },
      { id: 'line', apply: c => set(c, 'e19.eset_line') },
    ],
    typical: () => [0.3, 0.7],
  },
  // 3. Zhankozha, end of 1856 (Kazaly fort area).
  {
    id: 'e19.zhankozha',
    when: c => c.year === 1856 && man(c, 16, 60) && c.p.region === 'syr' && ok(c),
    options: [
      { id: 'join', apply: c => set(c, 'e19.zhankozha') },
      { id: 'khiva', apply: c => (leaveRisings(c), (c.p.way = 'abroad'), set(c, 'e19.abroad.south', 'e19.khiva')) },
      { id: 'stay', apply: c => set(c, 'e19.fort') },
    ],
    typical: () => [0.25, 0.15, 0.6],
  },
  // 7. Moving beyond the border: from the Syr Darya line south (1853–63), from the Irtysh and Zhetysu to Qing lands (1864–82).
  {
    id: 'e19.migrate',
    when: c => adult(c, 18, 60) && ok(c) && ((c.p.region === 'syr' && y(c, 1853, 1863)) || (inR(c, ['shygys', 'zhetisu']) && y(c, 1864, 1882))),
    chance: () => 0.05,
    q: c => (c.p.region === 'syr' ? 'chq.e19.migrate.south' : 'chq.e19.migrate.east'),
    options: [
      { id: 'go', apply: c => (leaveRisings(c), (c.p.way = 'abroad'), set(c, c.p.region === 'syr' ? 'e19.abroad.south' : 'e19.abroad.east')) },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.25, 0.75],
  },
  // 5. Against the Steppe statute, 1868–69 (Ural and Turgai oblasts).
  {
    id: 'e19.ural',
    when: c => y(c, 1868, 1869) && man(c, 16, 60) && inR(c, WEST) && ok(c),
    options: [
      { id: 'join', apply: c => set(c, 'e19.ural') },
      { id: 'pay', apply: c => set(c, 'e19.paid') },
      { id: 'leave', apply: c => (set(c, 'e19.ural_leave'), poor(c, 0.2)) },
    ],
    typical: () => [0.25, 0.55, 0.2],
  },
  // 6. The Adai rising, 1870 (Mangyshlak).
  {
    id: 'e19.adai',
    when: c => c.year === 1870 && man(c, 16, 60) && c.p.region === 'adai' && ok(c),
    options: [
      { id: 'join', apply: c => set(c, 'e19.adai') },
      { id: 'south', apply: c => (leaveRisings(c), (c.p.way = 'abroad'), set(c, 'e19.abroad.south', 'e19.adai_south')) },
      { id: 'submit', apply: c => set(c, 'e19.adai_submit') },
    ],
    typical: () => [0.35, 0.25, 0.4],
  },
  // 8. After losing the herd: settle near a fort as жатақ, work for a bai, or keep migrating half-hungry.
  {
    id: 'e19.zhatak',
    when: c => has(c, 'e19.poor') && c.year >= 1830 && adult(c, 18, 60) && ok(c) && (c.p.way === 'nomad' || c.p.way === 'seminomad'),
    options: [
      { id: 'settle', apply: c => ((c.p.way = 'village'), set(c, 'e19.zhatak')) },
      { id: 'malai', apply: c => set(c, 'e19.malai') },
      { id: 'roam', apply: c => set(c, 'e19.roam') },
    ],
    typical: () => [0.35, 0.35, 0.3],
  },
  // 14. Surviving a jut: to the line for hay, help from kin (асар), or slaughter the weak animals.
  {
    id: 'e19.jut_way',
    when: c => has(c, `e19.jut.${c.year - 1}`) && adult(c, 18, 70) && ok(c),
    options: [
      { id: 'hay', apply: c => (set(c, 'e19.jut_hay'), poor(c, 0.2)) },
      { id: 'kin', apply: c => (set(c, 'e19.jut_kin'), poor(c, 0.3)) },
      { id: 'slaughter', apply: c => (set(c, 'e19.jut_slaughter'), poor(c, 0.45)) },
    ],
    typical: () => [0.3, 0.4, 0.3],
  },
  // 9. A child of 8–11: the Russian-Kazakh school (Khan's Horde 1841, Turgai 1864, other uezds from the 1880s ⚠), the mullah, or home.
  {
    id: 'e19.school',
    when: c =>
      ok(c) &&
      c.p.childYears.some(b => c.year - b >= 8 && c.year - b <= 11) &&
      ((c.p.region === 'oral' && c.year >= 1841) || (inR(c, ['kostanai', 'aktobe']) && c.year >= 1864) || c.year >= 1880),
    chance: () => 0.4,
    options: [
      { id: 'school', apply: c => set(c, 'e19.kid_school', `e19.kid_from.${c.year}`) },
      { id: 'madrasa', apply: c => set(c, 'e19.kid_madrasa', `e19.kid_from.${c.year}`) },
      { id: 'home', apply: () => {} },
    ],
    typical: c => (has(c, 'e19.zhatak') ? [0.2, 0.35, 0.45] : [0.08, 0.32, 0.6]),
  },
  // 10. A fair: the Khan's Horde fair (from 1833), Koyandy (from 1848), barter yards of the line towns.
  {
    id: 'e19.fair',
    when: c =>
      adult(c, 18, 60) &&
      ok(c) &&
      ((c.p.region === 'oral' && c.year >= 1833) || (inR(c, ['arka', 'shygys']) && c.year >= 1848) || inR(c, ['kostanai', 'aktobe'])),
    chance: () => 0.12,
    q: c => (c.p.region === 'oral' ? 'chq.e19.fair.horde' : inR(c, ['arka', 'shygys']) ? 'chq.e19.fair.koyandy' : 'chq.e19.fair.yard'),
    options: [
      { id: 'sell', apply: c => set(c, 'e19.fair_sell') },
      { id: 'barter', apply: c => set(c, 'e19.fair_barter') },
      { id: 'skip', apply: () => {} },
    ],
    typical: () => [0.35, 0.35, 0.3],
  },
  // 11. Volost elections every three years after the statutes of 1867–68 (Mangyshlak from 1870).
  {
    id: 'e19.volost',
    when: c => c.year >= 1868 && (c.year - 1868) % 3 === 0 && man(c, 25, 65) && ok(c) && (c.p.region !== 'adai' || c.year >= 1871),
    chance: () => 0.35,
    options: [
      { id: 'bribe', apply: c => set(c, 'e19.bribe') },
      { id: 'honest', apply: c => set(c, 'e19.honest') },
      { id: 'run', apply: c => set(c, c.r.chance(0.35) ? 'e19.volost_won' : 'e19.volost_lost') },
    ],
    typical: () => [0.35, 0.5, 0.15],
  },
  // 12. Settlers on the winter pastures, 1885–1900: hire out, rent out the қыстау, or keep apart.
  {
    id: 'e19.settlers',
    when: c => has(c, 'e19.settlers_seen') && adult(c, 16, 65) && ok(c),
    chance: () => 0.5,
    options: [
      { id: 'hire', apply: c => set(c, 'e19.hire') },
      { id: 'rent', apply: c => set(c, 'e19.rent') },
      { id: 'apart', apply: c => set(c, 'e19.apart') },
    ],
    typical: () => [0.35, 0.2, 0.45],
  },
  // 13. A great memorial feast (ас) with races and an aitys.
  {
    id: 'e19.as',
    when: c => adult(c, 16, 60) && ok(c),
    chance: () => 0.03,
    options: [
      { id: 'go', apply: c => set(c, 'e19.as_go') },
      { id: 'give', apply: c => set(c, 'e19.as_give') },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.45, 0.25, 0.3],
  },
  {
    id: 'e19.amenger',
    when: c => !male(c) && has(c, 'widowed_now') && c.age <= 55,
    options: [
      { id: 'accept', apply: c => (del(c, 'widowed_now', 'widowed'), set(c, 'e19.amenger')) },
      { id: 'leave', apply: c => (del(c, 'widowed_now'), set(c, 'e19.left_kin')) },
    ],
    typical: () => [0.6, 0.4],
  },
  {
    id: 'e19.old',
    when: c => c.age === 60 && ok(c) && c.p.childYears.length > 0,
    options: [
      { id: 'hearth', apply: c => set(c, 'e19.hearth') },
      { id: 'pilgrim', apply: c => set(c, 'e19.pilgrim') },
    ],
    typical: () => [0.75, 0.25],
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
const histLine = (id: string, year: number, when: (c: Ctx) => boolean = () => true, minAge = 5) => once(id, c => c.year === year && c.age >= minAge && home(c) && when(c), 1, 'history')
/** Years since a flag like `e19.kid_from.1870` was set. */
const since = (c: Ctx, pre: string) => {
  const f = [...c.p.flags].find(x => x.startsWith(pre))
  return f ? c.year - Number(f.slice(pre.length)) : -1
}

export const EVENTS_19: EventDef[] = [
  ...COMMON_EVENTS,
  // Khan power abolished, forts and okrugs.
  histLine('e19.hist.ustav1822', 1822, c => inR(c, ['arka', 'shygys'])),
  histLine('e19.hist.zhangir', 1823, c => c.p.region === 'oral'),
  histLine('e19.hist.ustav1824', 1824, c => inR(c, ['kostanai', 'aktobe', 'adai'])),
  histLine('e19.hist.akmola', 1830, c => c.p.region === 'arka'),
  histLine('e19.hist.okrugs', 1831, c => c.p.region === 'shygys'),
  histLine('e19.hist.fair1833', 1833, c => c.p.region === 'oral'),
  // The south under Kokand and Khiva.
  once('e19.hist.kokand', c => c.age === 10 && home(c) && ((c.p.region === 'syr' && c.year < 1853) || (c.p.region === 'zhetisu' && c.year < 1850)), 1, 'history'),
  { id: 'e19.levy', tone: 'bad', when: c => home(c) && c.age >= 8 && ((c.p.region === 'syr' && c.year < 1864) || (c.p.region === 'zhetisu' && c.year < 1861)), chance: () => 0.06, apply: c => poor(c, 0.15) },
  once('e19.captive', c => c.p.region === 'syr' && c.year < 1853 && c.age >= 8 && c.age <= 40 && ok(c), 0.002, 'bad', true, c => set(c, 'captive', 'e19.captive')),
  once('e19.captive.free', c => has(c, 'e19.captive'), 0.2, 'good', true, c => del(c, 'captive', 'e19.captive')),
  // Isatai and Makhambet.
  once('e19.isatai.line', c => c.year === 1837 && has(c, 'e19.isatai'), 1, 'history', true),
  once('e19.isatai.end', c => c.year === 1838 && has(c, 'e19.isatai'), 1, 'history', true),
  histLine('e19.hist.isatai_end', 1838, c => inR(c, ['oral', 'aktobe']) && !has(c, 'e19.isatai')),
  once('e19.isatai.taken', c => c.year === 1839 && (has(c, 'e19.isatai_help') || c.p.log.some(e => e.key === 'e19.isatai.end')) && home(c), 0.4, 'bad', false, c => poor(c, 0.5)),
  once('e19.isatai_away.line', c => c.year === 1839 && has(c, 'e19.isatai_away'), 1, 'calm'),
  // Kenesary.
  histLine('e19.hist.kenesary', 1837, c => inR(c, ['arka', 'kostanai', 'aktobe', 'syr'])),
  histLine('e19.hist.akmola1838', 1838, c => c.p.region === 'arka' && !has(c, 'e19.kenesary')),
  histLine('e19.hist.khan1841', 1841, c => inR(c, ['arka', 'kostanai', 'aktobe', 'syr']) && !has(c, 'e19.kenesary')),
  once('e19.kenesary.line', c => has(c, 'e19.kenesary') && c.year <= 1845, 0.5, 'history', true),
  once('e19.kenesary.south', c => has(c, 'e19.kenesary') && c.year === 1846, 1, 'history', true, c => void (c.p.region = 'zhetisu')),
  {
    id: 'e19.kenesary.end',
    once: true,
    tone: 'history',
    big: true,
    when: c => has(c, 'e19.kenesary') && c.year === 1847,
    chance: () => 1,
    apply: c => {
      const from = [...c.p.flags].find(f => f.startsWith('e19.kenesary_from.'))
      if (c.r.chance(0.5) && from) {
        c.p.region = from.split('.')[2] as Region
        return { key: 'e19.kenesary.home' }
      }
      return undefined
    },
  },
  histLine('e19.hist.kenesary1847', 1847, c => c.p.region !== 'adai' && ![...c.p.flags].some(f => f.startsWith('e19.kenesary_from.'))),
  once('e19.kenesary.raid', c => inR(c, ['arka', 'kostanai']) && y(c, 1838, 1846) && c.age >= 5 && home(c) && !has(c, 'e19.kenesary'), 0.06, 'bad', false, c => poor(c, 0.15)),
  once('e19.kenesary_help.line', c => has(c, 'e19.kenesary_help') && c.year >= 1839, 0.2, 'bad', false, c => poor(c, 0.3)),
  once('e19.kenesary_away.line', c => has(c, 'e19.kenesary_away'), 1, 'calm'),
  // Eset.
  once('e19.eset.line', c => has(c, 'e19.eset'), 0.5, 'history', true),
  once('e19.eset.amnesty', c => has(c, 'e19.eset') && c.year === 1858, 1, 'history', true, c => void del(c, 'e19.eset')),
  once('e19.eset_line.line', c => has(c, 'e19.eset_line'), 0.6, 'calm'),
  // The Bukey Horde, the Syr Darya and the south.
  histLine('e19.hist.zhangir_school', 1841, c => c.p.region === 'oral'),
  histLine('e19.hist.zhankozha1845', 1845, c => c.p.region === 'syr'),
  histLine('e19.hist.zhangir_death', 1845, c => c.p.region === 'oral'),
  histLine('e19.hist.kopal', 1847, c => c.p.region === 'zhetisu'),
  histLine('e19.hist.koyandy', 1848, c => c.p.region === 'arka'),
  histLine('e19.hist.akmeshit', 1853, c => c.p.region === 'syr'),
  histLine('e19.hist.verny', 1854, c => c.p.region === 'zhetisu'),
  once('e19.syr_line', c => c.p.region === 'syr' && y(c, 1849, 1857) && adult(c, 14, 60) && ok(c), 0.15, 'bad'),
  // Zhankozha.
  once('e19.zhankozha.line', c => c.year === 1857 && has(c, 'e19.zhankozha'), 1, 'history', true, c => poor(c, 0.5)),
  histLine('e19.hist.zhankozha', 1857, c => c.p.region === 'syr' && !c.p.log.some(e => e.key === 'e19.zhankozha.line')),
  once('e19.fort.line', c => has(c, 'e19.fort') && c.year >= 1857, 1, 'calm'),
  // Life beyond the border and the way back.
  once('e19.khiva.line', c => has(c, 'e19.khiva'), 1, 'calm', true),
  once('e19.abroad.south.line', c => has(c, 'e19.abroad.south') && !has(c, 'e19.khiva') && !has(c, 'e19.adai_south'), 1, 'calm', true),
  once('e19.adai_south.line', c => has(c, 'e19.adai_south'), 1, 'calm', true),
  once('e19.abroad.east.line', c => has(c, 'e19.abroad.east'), 1, 'calm', true),
  {
    id: 'e19.abroad.back',
    once: true,
    tone: 'good',
    big: true,
    // Adai: after 1870 they were allowed to roam wider, so most came back soon. The Ili region was returned to China in 1881,
    // and part of its people resettled to Zhetysu in 1883–84. From Khiva and Kokand lands: a slow trickle.
    when: c => c.p.way === 'abroad' && (has(c, 'e19.abroad.south') ? c.year >= (has(c, 'e19.adai_south') ? 1871 : 1860) : c.year >= 1868),
    chance: c => (has(c, 'e19.adai_south') ? 0.3 : has(c, 'e19.abroad.east') ? (y(c, 1883, 1884) ? 0.4 : 0.02) : 0.06),
    apply: c => {
      c.p.way = 'seminomad'
      if (has(c, 'e19.abroad.east') && y(c, 1883, 1884)) {
        c.p.region = 'zhetisu'
        return { key: 'e19.abroad.back.ili' }
      }
      return undefined
    },
  },
  // Conquest of the south, the border with China, schools.
  histLine('e19.hist.1864', 1864, c => inR(c, ['syr', 'zhetisu'])),
  histLine('e19.hist.chuguchak', 1864, c => inR(c, ['shygys', 'zhetisu'])),
  histLine('e19.hist.altynsarin', 1864, c => c.p.region === 'kostanai'),
  // The statutes of 1867–68.
  histLine('e19.hist.turkestan1867', 1867, c => inR(c, ['syr', 'zhetisu'])),
  histLine('e19.hist.statute1868', 1868, c => inR(c, STEPPE)),
  once('e19.ural.line', c => c.year === 1869 && has(c, 'e19.ural'), 1, 'history', true, c => poor(c, 0.4)),
  histLine('e19.hist.ural1869', 1869, c => inR(c, WEST) && !has(c, 'e19.ural')),
  once('e19.paid.line', c => has(c, 'e19.paid') && c.year >= 1869, 1, 'calm'),
  once('e19.ural_leave.line', c => has(c, 'e19.ural_leave') && c.year >= 1869, 1, 'calm', true),
  // Adai, 1870.
  once('e19.adai.line', c => c.year === 1870 && has(c, 'e19.adai'), 1, 'history', true),
  once('e19.adai_submit.line', c => c.year === 1870 && has(c, 'e19.adai_submit'), 1, 'calm'),
  once('e19.adai.raid', c => c.year === 1870 && c.p.region === 'adai' && home(c) && c.age >= 5, 0.15, 'bad', true, c => poor(c, 0.5)),
  histLine('e19.hist.adai1870', 1870, c => inR(c, ['oral', 'aktobe'])),
  histLine('e19.hist.adai_after', 1871, c => c.p.region === 'adai'),
  // Kulja, 1871 and 1881–84.
  histLine('e19.hist.kulja', 1871, c => inR(c, ['zhetisu', 'shygys'])),
  histLine('e19.hist.kulja1881', 1881, c => inR(c, ['zhetisu', 'shygys'])),
  // Juts: ordinary ones (§3.2: 8% strong + 2% very heavy a year; ×1.3 in the west, ×0.7 in Zhetysu) and the two big western ones.
  {
    id: 'e19.jut1879',
    once: true,
    tone: 'bad',
    big: true,
    when: c => c.year === 1879 && inR(c, WEST) && home(c) && c.age >= 3,
    chance: () => 0.8,
    apply: c => (set(c, 'e19.jut.1879', 'jut_now'), poor(c, 0.5)),
  },
  {
    id: 'e19.jut1891',
    once: true,
    tone: 'bad',
    big: true,
    when: c => c.year === 1891 && inR(c, WEST) && home(c) && c.age >= 3,
    chance: () => 0.6,
    apply: c => (set(c, 'e19.jut.1891', 'jut_now'), poor(c, 0.25)),
  },
  jutEvent(P, c => (bigJut(c) ? 0 : 0.1 * (inR(c, WEST) ? 1.3 : c.p.region === 'zhetisu' ? 0.7 : 1))),
  once('e19.jut_hay.line', c => has(c, 'e19.jut_hay'), 1, 'calm'),
  once('e19.jut_kin.line', c => has(c, 'e19.jut_kin'), 1, 'calm'),
  once('e19.jut_slaughter.line', c => has(c, 'e19.jut_slaughter'), 1, 'calm'),
  // Poverty: жатақ, малай or roaming.
  once('e19.zhatak.line', c => has(c, 'e19.zhatak') && ok(c), 0.6, 'calm', true),
  once('e19.malai.line', c => has(c, 'e19.malai') && ok(c), 0.6, 'calm', true),
  once('e19.roam.line', c => has(c, 'e19.roam') && ok(c), 0.6, 'calm'),
  // Schools: the line comes when the child is grown.
  once('e19.kid_school.line', c => has(c, 'e19.kid_school') && since(c, 'e19.kid_from.') >= 9 && home(c), 0.5, 'good', true),
  once('e19.kid_madrasa.line', c => has(c, 'e19.kid_madrasa') && since(c, 'e19.kid_from.') >= 7 && home(c), 0.5, 'good'),
  // Fairs, elections, settlers, the ас.
  once('e19.fair_sell.line', c => has(c, 'e19.fair_sell'), 1, 'calm', true, c => (c.r.chance(0.15) ? { key: 'e19.fair.cheated' } : undefined)),
  once('e19.fair_barter.line', c => has(c, 'e19.fair_barter'), 1, 'calm'),
  once('e19.bribe.line', c => has(c, 'e19.bribe'), 1, 'calm'),
  once('e19.honest.line', c => has(c, 'e19.honest'), 0.7, 'calm'),
  once('e19.volost_won.line', c => has(c, 'e19.volost_won'), 1, 'calm', true, c => void set(c, `e19.volost_from.${c.year}`)),
  once('e19.volost_lost.line', c => has(c, 'e19.volost_lost'), 1, 'calm'),
  once('e19.volost.complaint', c => has(c, 'e19.volost_won') && since(c, 'e19.volost_from.') >= 1 && since(c, 'e19.volost_from.') <= 3, 0.3, 'bad'),
  {
    id: 'e19.settlers.come',
    once: true,
    tone: 'history',
    when: c => y(c, 1885, 1900) && inR(c, ['arka', 'shygys', 'kostanai', 'zhetisu']) && home(c) && c.age >= 5,
    // §6.1: 0.1 a year in 1885–90, 0.25 after the law of 1889 and the statute of 1891 (peak of resettlement in 1896).
    chance: c => (c.year <= 1890 ? 0.1 : 0.25),
    apply: c => void set(c, 'e19.settlers_seen'),
  },
  once('e19.hire.line', c => has(c, 'e19.hire'), 1, 'calm', true),
  once('e19.rent.line', c => has(c, 'e19.rent'), 1, 'calm'),
  once('e19.land_lost', c => has(c, 'e19.rent') && c.year >= 1891 && home(c), 0.15, 'bad', true),
  once('e19.apart.line', c => has(c, 'e19.apart'), 0.7, 'calm'),
  {
    id: 'e19.as_go.line',
    once: true,
    tone: 'good',
    big: true,
    when: c => has(c, 'e19.as_go'),
    chance: () => 1,
    // At a big ас one could hear the famous akyns of the region (years from docs/era-19.md §1, ⚠ where weak).
    apply: c => {
      const r = c.p.region
      if (r === 'zhetisu' && y(c, 1840, 1895) && c.r.chance(0.3)) return { key: 'e19.as.suyunbai' }
      if (r === 'arka' && y(c, 1855, 1895) && c.r.chance(0.3)) return { key: 'e19.as.birzhan' }
      return undefined
    },
  },
  once('e19.as_give.line', c => has(c, 'e19.as_give'), 1, 'calm'),
  // Epidemics.
  once('e19.cholera1848', c => c.year === 1848 && home(c) && c.age >= 5, 0.5, 'bad'),
  once('e19.cholera1892', c => c.year === 1892 && home(c) && c.age >= 5, 1, 'history'),
  histLine('e19.hist.statute1891', 1891, c => inR(c, STEPPE)),
  histLine('e19.hist.census1897', 1897),
  // Rare: famous people of the time, seen or heard only from afar. No words are put into their mouths.
  once('e19.rare.shokan', c => inR(c, ['zhetisu', 'arka', 'shygys']) && y(c, 1855, 1864) && c.age >= 12 && ok(c), 0.004, 'good', true),
  once('e19.rare.makhambet', c => inR(c, ['oral', 'aktobe']) && y(c, 1846, 1885) && c.age >= 10 && ok(c), 0.004, 'good', true),
  once('e19.rare.sara', c => c.p.region === 'zhetisu' && y(c, 1871, 1873) && c.age >= 10 && ok(c), 0.03, 'good', true),
  once('e19.rare.akan', c => c.p.region === 'arka' && y(c, 1865, 1900) && c.age >= 10 && ok(c), 0.003, 'good', true),
  once('e19.rare.altynsarin', c => inR(c, ['kostanai', 'aktobe']) && y(c, 1879, 1889) && c.age >= 10 && ok(c), 0.004, 'good', true),
  once('e19.rare.abai', c => c.p.region === 'shygys' && y(c, 1885, 1900) && c.age >= 10 && ok(c), 0.008, 'good', true),
  // Family.
  once('e19.amenger.line', c => has(c, 'e19.amenger'), 1, 'calm'),
  once('e19.left_kin.line', c => has(c, 'e19.left_kin'), 1, 'calm'),
  once('e19.hearth.line', c => has(c, 'e19.hearth') && c.age >= 62, 0.5, 'good'),
  once('e19.pilgrim.line', c => has(c, 'e19.pilgrim'), 1, 'good', true),
  // Everyday texture of the century: one small line in some quiet years.
  {
    id: 'e19.tex',
    tone: 'calm',
    when: c => c.age >= 7 && ok(c),
    chance: () => 0.1,
    apply: c => {
      const out = ['e19.tex.qystau', 'e19.tex.dombra']
      if (inR(c, ['arka', 'shygys', 'syr', 'kostanai'])) out.push('e19.tex.caravan')
      if (c.year >= 1869 && inR(c, STEPPE)) out.push('e19.tex.tax')
      if (c.age <= 13) out.push('e19.tex.mekteb')
      if (c.p.way === 'village') out.push('e19.tex.zhatak')
      if (inR(c, ['oral', 'aktobe', 'kostanai']) && c.year < 1868) out.push('e19.tex.ticket')
      return { key: c.r.pick(out) }
    },
  },
  spouseDies(P),
]

export const HAZARDS_19: Hazard[] = [
  { id: 'base', q: c => q19(c.age) },
  jutHazard,
  // The big western juts: hunger after the herd died (estimate on top of the ordinary jut risk; §3.1: child deaths ×1.5).
  { id: 'jut', q: c => (bigJut(c) && has(c, `e19.jut.${c.year >= 1891 ? 1891 : 1879}`) && home(c) ? (c.age < 5 || c.age >= 60 ? 0.04 : 0.008) : 0) },
  // Smallpox, measles, typhus: a constant background with no numbers (§3.3 ⚠); smallpox stands for them.
  { id: 'smallpox', q: c => (c.age < 10 ? 0.003 : 0.001) },
  // Cholera went along roads and towns; nomadic auls suffered less (§3.3). The engine table gives 2% infected × 50% for a nomad,
  // but the count for the whole steppe in 1892 (~1.1 thousand dead ⚠) is far lower, so here: 0.1% a year in the aul,
  // ten times more for жатақ near forts and for townspeople.
  {
    id: 'cholera',
    q: c => {
      const k = CHOLERA[c.year]
      if (!k || !home(c)) return 0
      if (c.year === 1830 && !inR(c, ['oral', 'aktobe'])) return 0
      return k * (c.p.way === 'village' || c.p.way === 'town' ? 0.01 : 0.001)
    },
  },
  // Kokand and Khiva rule in the south (§3.5: 1% a year of violence against someone in the family; the hero ≈0.2%).
  { id: 'kokand', q: c => (home(c) && c.age >= 12 && ((c.p.region === 'syr' && c.year < 1864) || (c.p.region === 'zhetisu' && c.year < 1861)) ? 0.002 : 0) },
  { id: 'captive', q: c => (has(c, 'e19.captive') ? 0.06 : 0) },
  // Battles of the risings (§6.2): Isatai 0.25 over 1837–38; Kenesary 0.2 over a campaign; Eset 0.1; Zhankozha 0.2;
  // 1869 ≈0.05 in battle; Adai 0.2.
  {
    id: 'battle',
    q: c => {
      // Someone who left for Khiva, Kokand or the Qing lands is out of the rising.
      if (c.p.way === 'abroad') return 0
      let q = 0
      if (has(c, 'e19.isatai')) q += c.year === 1837 ? 0.1 : c.year === 1838 ? 0.17 : 0
      if (has(c, 'e19.kenesary') && c.year <= 1847) q += c.year === 1847 ? 0.06 : 0.025
      if (has(c, 'e19.eset') && c.year <= 1858) q += 0.025
      if (has(c, 'e19.zhankozha') && y(c, 1856, 1857)) q += 0.11
      if (has(c, 'e19.ural') && c.year === 1869) q += 0.05
      if (has(c, 'e19.adai') && c.year === 1870) q += 0.2
      return q
    },
  },
  // After 1869 more than 500 were sentenced to death or hard labour (§3.4: 0.15 with the battle risk above, so ≈0.1 here).
  { id: 'katorga', q: c => (has(c, 'e19.ural') && c.year === 1869 && c.p.way !== 'abroad' ? 0.1 : 0) },
  // Raids on auls by armed detachments of either side: Kenesary years, 1869 in the west, Baikov's raids on Mangyshlak in 1870.
  {
    id: 'punitive',
    q: c => {
      if (!home(c)) return 0
      if (inR(c, ['arka', 'kostanai']) && y(c, 1838, 1846)) return 0.002
      if (inR(c, WEST) && c.year === 1869) return 0.003
      if (c.p.region === 'adai' && c.year === 1870) return 0.01
      return 0
    },
  },
  // A volost head made enemies among the losing "party" (estimate).
  { id: 'feud', q: c => (has(c, 'e19.volost_won') && since(c, 'e19.volost_from.') >= 0 && since(c, 'e19.volost_from.') <= 3 ? 0.004 : 0) },
]
