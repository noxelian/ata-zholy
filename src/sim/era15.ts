/**
 * XV century, the founding of the Kazakh Khanate: born about 1440–1475, living into the 1520s–1530s.
 * Sources and estimates: docs/era-15.md (section 6 is the engine table). The Kazakhs of that time left no chronicles:
 * dates come from neighbours (Dughlat, Ibn Ruzbihan, Kuhistani), so where historians disagree the texts give a range.
 * Every probability here is an estimate, and the game says so.
 */
import type { ChoiceDef, Ctx, EventDef, Hazard, Region } from './types'
import { addNames, type NameTriple } from './names'
import { COMMON_CHOICES, COMMON_EVENTS, bornEarly, earlyBaseQ, jutEvent, jutHazard, spouseDies } from './early'
import { del, free, has, home, male, needChild, set, y } from './events'

const P = 'e15'

// Names: docs/era-15.md §5 (expert list; names of historical people and of real clans are not used).
const M: NameTriple[] = [
  ['Ораз', 'Ораз', 'Oraz'], ['Тоқтар', 'Токтар', 'Toktar'], ['Құттыбай', 'Куттыбай', 'Kuttybai'], ['Есен', 'Есен', 'Yesen'],
  ['Темір', 'Темир', 'Temir'], ['Арыстан', 'Арыстан', 'Arystan'], ['Бөрібай', 'Борибай', 'Boribai'], ['Жүсіп', 'Жусуп', 'Zhusip'],
  ['Ыбырай', 'Ибрагим', 'Ybyrai'], ['Қарабай', 'Карабай', 'Karabai'], ['Ақбай', 'Акбай', 'Akbai'], ['Сейіт', 'Сеит', 'Seit'],
  ['Хасен', 'Хасен', 'Khasen'], ['Құлназар', 'Кульназар', 'Kulnazar'], ['Байназар', 'Байназар', 'Bainazar'], ['Тілеу', 'Тлеу', 'Tileu'],
]
const F: NameTriple[] = [
  ['Айша', 'Айша', 'Aisha'], ['Пәтима', 'Фатима', 'Patima'], ['Зейнеп', 'Зейнеп', 'Zeinep'], ['Ақбала', 'Акбала', 'Akbala'],
  ['Айбике', 'Айбике', 'Aibike'], ['Нұрбике', 'Нурбике', 'Nurbike'], ['Тоқбике', 'Токбике', 'Tokbike'], ['Қарлығаш', 'Карлыгаш', 'Karlygash'],
  ['Сұлушаш', 'Сулушаш', 'Sulushash'], ['Ақжүніс', 'Акжунис', 'Akzhunis'], ['Ханбике', 'Ханбике', 'Khanbike'], ['Күміс', 'Кумис', 'Kumis'],
]
addNames('kz15', M, F)

const inR = (c: Ctx, rs: Region[]) => rs.includes(c.p.region)
const man = (c: Ctx, a: number, b: number) => male(c) && c.age >= a && c.age <= b
/** Free and not in captivity (the shared `free` also checks the 'captive' flag used here). */
const ok = (c: Ctx) => home(c) && free(c)
const settled = (c: Ctx) => c.p.way === 'village' || c.p.way === 'town'

/** The ulus of Abulkhair: Dasht-i Kipchak and the Syr Darya towns (§2.1). Zhetisu was Moghulistan, the west was Nogai. */
const ULUS: Region[] = ['syr', 'arka', 'kostanai', 'aktobe', 'shygys']
/** Years of war for the Syr Darya towns (§6.1 syr_towns_war): 1470, 1472–1474, 1485–1486, 1490–1494. */
const TOWN_WAR = [1470, 1472, 1473, 1474, 1485, 1486, 1490, 1491, 1492, 1493, 1494]
/** Years a Syr Darya town was taken or sacked (§4.2: 1485, early 1490s, 1504, 1507–08). */
const SACK = [1485, 1486, 1490, 1491, 1504, 1507]
const warYear = (c: Ctx) => TOWN_WAR.includes(c.year)

export const born15 = bornEarly({
  prefix: P,
  names: 'kz15',
  years: [1440, 1475],
  // A little fewer births in the year of the Oirat rout (1456–57) — estimate.
  yearWeight: yr => (yr === 1457 ? 0.8 : 1),
  // §2.1 recommendation: Syr 35%, Saryarka 20%, Zhetisu 15%, Turgai/Aktobe 20%, East 5%, West 5%. Zhetisu is a little
  // lower here (before 1457 it was Moghulistan, not the ulus); the West (Nogai lands until the 1510s) and Mangyshlak are rare.
  region: { syr: 0.35, arka: 0.2, zhetisu: 0.13, kostanai: 0.12, aktobe: 0.1, shygys: 0.05, oral: 0.03, adai: 0.02 },
  // Near the Syr Darya towns some lived settled or half-settled (§2.3); elsewhere almost everyone migrated.
  way: reg => (reg === 'syr' ? { seminomad: 0.6, nomad: 0.28, town: 0.12 } : { seminomad: 0.6, nomad: 0.4 }),
})

export const CHOICES_15: ChoiceDef[] = [
  ...COMMON_CHOICES,
  // §4.1: 1457–1466, leave with Kerey and Zhanibek for the Chu and Kozybasy, or stay in the ulus of Abulkhair.
  // A child does not decide, the family does (same buttons, another question). The game says 50/50 is a guess;
  // Dughlat's ~200 thousand who left is far less than half of the steppe, so the typical share is a bit lower.
  {
    id: 'e15.exodus',
    when: c => y(c, 1457, 1466) && ok(c) && inR(c, ULUS),
    chance: () => 0.3,
    q: c => (c.age < 16 ? 'chq.e15.exodus.child' : 'chq.e15.exodus'),
    options: [
      { id: 'go', apply: c => (set(c, 'e15.kazakh', 'e15.exodus', `e15.road.${c.year}`), (c.p.region = 'zhetisu')) },
      { id: 'stay', apply: c => set(c, 'e15.stayed') },
    ],
    typical: () => [0.4, 0.6],
  },
  // §4.1 second chance: 1469–1471, after Abulkhair's death people of the ulus went over to Kerey and Zhanibek en masse.
  {
    id: 'e15.join',
    when: c => y(c, 1469, 1471) && ok(c) && inR(c, ULUS) && !has(c, 'e15.kazakh'),
    chance: () => 0.5,
    q: c => (c.age < 16 ? 'chq.e15.join.child' : 'chq.e15.join'),
    options: [
      { id: 'join', apply: c => set(c, 'e15.kazakh', 'e15.joined') },
      { id: 'stay', apply: c => set(c, 'e15.ulus') },
    ],
    typical: () => [0.65, 0.35],
  },
  // §4.12: a clever boy may learn from a biy, or later serve a sultan as a nuker.
  {
    id: 'e15.biy',
    when: c => male(c) && c.age === 13 && ok(c),
    chance: () => 0.3,
    options: [
      { id: 'study', apply: c => set(c, 'e15.biy_student') },
      { id: 'nuker', apply: c => set(c, 'e15.nuker') },
      { id: 'home', apply: () => {} },
    ],
    typical: () => [0.25, 0.2, 0.55],
  },
  // Moghulistan natives meet the newcomers (§1: Esen-Buga gave Kerey and Zhanibek the Chu and Kozybasy).
  {
    id: 'e15.guests',
    when: c => y(c, 1458, 1462) && ok(c) && c.p.region === 'zhetisu' && !has(c, 'e15.exodus'),
    chance: () => 0.4,
    q: c => (c.age < 16 ? 'chq.e15.guests.child' : 'chq.e15.guests'),
    options: [
      { id: 'share', apply: c => set(c, 'e15.kazakh', 'e15.shared') },
      { id: 'apart', apply: c => set(c, 'e15.apart') },
    ],
    typical: () => [0.6, 0.4],
  },
  // §1: in 1515–1516 the Nogai mirzas Agish and Alach went over to Kasym with their people.
  {
    id: 'e15.nogai',
    when: c => y(c, 1515, 1516) && ok(c) && inR(c, ['oral', 'adai']) && !has(c, 'e15.kazakh'),
    chance: () => 0.6,
    options: [
      { id: 'go', apply: c => (set(c, 'e15.kazakh', 'e15.to_kasym'), (c.p.region = 'aktobe')) },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.5, 0.5],
  },
  // §6.1 syr_towns_war: in a war year 15% of men 16–45 go; 8% of those who went die.
  {
    id: 'e15.towns',
    when: c => warYear(c) && man(c, 16, 45) && ok(c) && inR(c, ['syr', 'arka', 'zhetisu', 'kostanai', 'aktobe']),
    chance: c => (c.p.region === 'syr' ? 0.25 : 0.12),
    q: c => (c.year < 1480 ? 'chq.e15.towns.70' : c.year < 1490 ? 'chq.e15.towns.85' : 'chq.e15.towns.90'),
    options: [
      { id: 'go', apply: c => set(c, `e15.war.${c.year}`, 'e15.towns') },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.45, 0.55],
  },
  // §4.2: settle near a Syr Darya town (bread, craft; jut hurts less) or keep migrating. Towns were taken in war years.
  {
    id: 'e15.settle',
    when: c => y(c, 1475, 1525) && c.age >= 18 && c.age <= 50 && ok(c) && c.p.region === 'syr' && !settled(c),
    chance: () => 0.06,
    options: [
      { id: 'settle', apply: c => ((c.p.way = 'village'), set(c, 'e15.settled')) },
      { id: 'roam', apply: () => {} },
    ],
    typical: () => [0.25, 0.75],
  },
  // §4.11, §6.2: a caravan to Bukhara or Samarkand. Robbery 5% (15% in the Shaybani war years 1503–1510).
  {
    id: 'e15.caravan',
    when: c => man(c, 20, 50) && ok(c) && !inR(c, ['oral', 'adai']) && y(c, 1460, 1530),
    chance: () => 0.04,
    options: [
      { id: 'go', apply: c => set(c, 'e15.caravan') },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.35, 0.65],
  },
  // §2.2: sheepskin kaftans of the Kazakhs sold in Bukhara at the price of satin (Seyfi Chelebi, XVI c.). Women sewed them.
  {
    id: 'e15.kaftan',
    when: c => !male(c) && c.age >= 16 && c.age <= 50 && ok(c) && !inR(c, ['oral', 'adai']),
    chance: () => 0.07,
    options: [
      { id: 'sell', apply: c => set(c, 'e15.kaftan') },
      { id: 'home', apply: () => {} },
    ],
    typical: () => [0.4, 0.6],
  },
  // §4.7–8: barymta or the biy's court, same pattern as the XVIII century.
  {
    id: 'e15.barymta',
    when: c => man(c, 18, 50) && ok(c),
    chance: () => 0.03,
    options: [
      { id: 'raid', apply: c => set(c, 'e15.raid', `e15.barymta.${c.year}`) },
      { id: 'court', apply: c => set(c, 'e15.court') },
      { id: 'forgive', apply: () => {} },
    ],
    typical: () => [0.35, 0.45, 0.2],
  },
  // §4.10: a pilgrimage to the mausoleum of Khoja Ahmed Yasawi in Yasy. Before 1510 Yasy was held by the Shaybanids.
  {
    id: 'e15.pilgrim',
    when: c => c.age >= 22 && c.age <= 55 && ok(c) && !inR(c, ['oral', 'adai']),
    chance: c => (has(c, 'e15.kin_lost') || c.p.childrenLost > 0 ? 0.05 : 0.02),
    options: [
      { id: 'go', apply: c => set(c, 'e15.pilgrim', `e15.pilgrim.${c.year}`) },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.4, 0.6],
  },
  // 1503–1507: Shaybani's army goes along the winter camps (§6.1 shaybani_raids). Hide in the reeds or drive the herds north.
  {
    id: 'e15.hide',
    when: c => y(c, 1503, 1507) && c.age >= 16 && ok(c) && inR(c, ['syr', 'arka']),
    chance: () => 0.3,
    options: [
      { id: 'reeds', apply: c => set(c, 'e15.reeds') },
      { id: 'north', apply: c => set(c, 'e15.north') },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.35, 0.35, 0.3],
  },
  // §4.4: summer 1508, the answer raid of Ahmed-sultan on Samarkand and Bukhara. Death 5%; the next winter Shaybani struck back.
  {
    id: 'e15.raid1508',
    when: c => c.year === 1508 && man(c, 16, 45) && ok(c) && inR(c, ['syr', 'arka']),
    chance: () => 0.35,
    options: [
      { id: 'go', apply: c => set(c, 'e15.war.1508', 'e15.raid1508') },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.3, 0.7],
  },
  // §4.5: winter 1509–1510 at Ulytau. Leave with the herds (lose cattle) or stand with the force (death 4%).
  {
    id: 'e15.ulytau',
    when: c => c.year === 1510 && man(c, 16, 55) && ok(c) && inR(c, ['arka', 'syr', 'kostanai']),
    options: [
      { id: 'stand', apply: c => set(c, 'e15.war.1510', 'e15.ulytau') },
      { id: 'leave', apply: c => set(c, 'e15.ulytau_left') },
    ],
    typical: () => [0.4, 0.6],
  },
  // §4.6: Kasym's campaigns 1511–1520: south to Sairam and Tashkent, or west against the Nogais. 10% a year, death 6%.
  {
    id: 'e15.kasym',
    when: c => y(c, 1511, 1520) && man(c, 16, 45) && ok(c) && !inR(c, ['adai']),
    chance: () => 0.1,
    options: [
      { id: 'south', apply: c => set(c, `e15.war.${c.year}`, 'e15.kasym_south') },
      { id: 'west', apply: c => set(c, `e15.war.${c.year}`, 'e15.kasym_west') },
      { id: 'stay', apply: () => {} },
    ],
    typical: () => [0.25, 0.2, 0.55],
  },
  // §4.13: 1524–1528, stay with khan Tahir (raids 6% a year) or leave for the settled lands on the Syr Darya (poorer, safer).
  {
    id: 'e15.tahir',
    when: c => y(c, 1524, 1528) && c.age >= 18 && ok(c) && inR(c, ['kostanai', 'aktobe', 'arka', 'zhetisu', 'oral']),
    chance: () => 0.35,
    options: [
      { id: 'stay', apply: c => set(c, 'e15.tahir') },
      { id: 'leave', apply: c => ((c.p.region = 'syr'), (c.p.way = 'village'), set(c, 'e15.left_tahir')) },
    ],
    typical: () => [0.55, 0.45],
  },
  {
    id: 'e15.amenger',
    when: c => !male(c) && has(c, 'widowed_now') && c.age <= 55,
    options: [
      { id: 'accept', apply: c => (del(c, 'widowed_now', 'widowed'), set(c, 'e15.amenger')) },
      { id: 'leave', apply: c => (del(c, 'widowed_now'), set(c, 'e15.left_kin')) },
    ],
    typical: () => [0.65, 0.35],
  },
  {
    id: 'e15.jut_way',
    when: c => has(c, `e15.jut.${c.year - 1}`) && c.age >= 18 && ok(c),
    options: [
      { id: 'migrate', apply: c => set(c, 'e15.jut_migrated') },
      { id: 'slaughter', apply: c => set(c, 'e15.jut_slaughter') },
      { id: 'hire', apply: c => set(c, 'e15.hired') },
    ],
    typical: () => [0.4, 0.35, 0.25],
  },
  {
    id: 'e15.ransom',
    when: c => has(c, 'e15.kin_captive') && ok(c),
    options: [
      { id: 'pay', apply: c => (del(c, 'e15.kin_captive'), set(c, c.r.chance(0.7) ? 'e15.kin_back' : 'e15.kin_lost')) },
      { id: 'wait', apply: c => (del(c, 'e15.kin_captive'), set(c, c.r.chance(0.2) ? 'e15.kin_back' : 'e15.kin_lost')) },
    ],
    typical: () => [0.6, 0.4],
  },
  {
    id: 'e15.old',
    when: c => c.age === 58 && ok(c) && c.p.childYears.length > 0,
    options: [
      { id: 'hearth', apply: c => set(c, 'e15.hearth') },
      { id: 'counsel', apply: c => set(c, 'e15.counsel') },
    ],
    typical: () => [0.65, 0.35],
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
/** A raid or a sack hits the aul this year: cattle are lost, the 'raid' hazard is on for the year. */
const hit = (c: Ctx) => void set(c, `e15.hit.${c.year}`)
/** Captivity after a raid: women and children 1.5× (§6.1 shaybani_raids). */
const captiveQ = (c: Ctx, base: number) => base * (!male(c) || c.age < 15 ? 1.5 : 1)
const takeCaptive = (c: Ctx, base: number) => {
  // The 'e15.captive' event below writes its own line after the raid line.
  if (c.r.chance(captiveQ(c, base))) set(c, 'e15.taken')
}

export const EVENTS_15: EventDef[] = [
  ...COMMON_EVENTS,
  // 1456–57: the Oirats rout Abulkhair near Sygnak; the Syr Darya lands are ravaged (§6.1 oirat_1457: death 3%, captivity 2%).
  once('e15.oirat', c => c.year === 1457 && c.p.region === 'syr', 1, 'bad', true, c => takeCaptive(c, 0.02)),
  histLine('e15.hist.oirat', 1457, c => c.p.region !== 'syr'),
  once('e15.road', c => has(c, 'e15.exodus') && has(c, `e15.road.${c.year}`), 1, 'calm', true),
  // Moghulistan natives see the newcomers arrive.
  once('e15.newcomers', c => y(c, 1458, 1462) && c.p.region === 'zhetisu' && !has(c, 'e15.exodus') && c.age >= 4, 0.5, 'history'),
  histLine('e15.hist.exodus', 1460, c => c.p.region !== 'zhetisu' && !has(c, 'e15.kazakh'), 6),
  // About 1465 (historians name 1456 to 1471): Kerey raised khan. Rare: the ancestor saw it with their own eyes.
  once('e15.shared.line', c => has(c, 'e15.shared') && c.year >= 1461, 0.5, 'good', true),
  once('e15.apart.line', c => has(c, 'e15.apart') && c.year >= 1461, 0.5, 'calm'),
  histLine('e15.hist.khanate', 1465, () => true, 4),
  once('e15.white_felt', c => c.year === 1465 && c.age >= 6 && (has(c, 'e15.kazakh') || c.p.region === 'zhetisu'), 0.12, 'good', true),
  histLine('e15.hist.abulkhair', 1468, () => true, 4),
  // 1469–1471: the ulus breaks up (§6.1 ulus_breakup: death 1% a year, cattle −10% a year).
  once('e15.breakup', c => y(c, 1469, 1471) && inR(c, ['syr', 'arka', 'kostanai', 'aktobe']) && !has(c, 'e15.exodus') && c.age >= 4, 0.5, 'bad', true),
  once('e15.ulus.line', c => has(c, 'e15.ulus') && y(c, 1472, 1476), 0.4, 'calm'),
  once('e15.joined.line', c => has(c, 'e15.joined') && c.year >= 1472, 0.5, 'calm'),
  histLine('e15.hist.towns', 1470, c => inR(c, ['syr', 'arka', 'zhetisu'])),
  histLine('e15.hist.burunduk', 1474, () => true, 8),
  {
    id: 'e15.towns.line',
    tone: 'history',
    big: true,
    when: c => has(c, 'e15.towns') && has(c, `e15.war.${c.year}`) && warYear(c),
    chance: () => 1,
    apply: c => ({ key: c.year < 1480 ? 'e15.towns.line.70' : c.year < 1490 ? 'e15.towns.line.85' : 'e15.towns.line.90' }),
  },
  once('e15.towns.loot', c => has(c, 'e15.towns') && !warYear(c), 0.3, 'good', true),
  // Raids on auls by the river in war years (§6.1: 5% a year), more for those who stayed by the towns.
  { id: 'e15.raid', tone: 'bad', when: c => warYear(c) && c.p.region === 'syr' && home(c) && c.age >= 3, chance: () => 0.05, apply: c => (hit(c), takeCaptive(c, 0.06)) },
  { id: 'e15.sack', tone: 'bad', big: true, when: c => SACK.includes(c.year) && c.p.region === 'syr' && settled(c) && home(c), chance: () => 0.3, apply: c => (hit(c), takeCaptive(c, 0.08)) },
  histLine('e15.hist.peace', 1495, c => inR(c, ['syr', 'arka', 'zhetisu'])),
  once('e15.settled.line', c => has(c, 'e15.settled') && settled(c), 0.3, 'good', true),
  histLine('e15.hist.shaybani', 1501, c => inR(c, ['syr', 'arka', 'zhetisu', 'kostanai'])),
  // 1503–1510: Shaybani's campaigns ravage auls (§6.1: 8% a year; raid participants of 1508 1.5× in the winter of 1508–09).
  {
    id: 'e15.shaybani',
    tone: 'bad',
    big: true,
    when: c => y(c, 1503, 1510) && inR(c, ['syr', 'arka']) && home(c) && c.age >= 3,
    // Hiding in the reeds halves the risk; driving the herds north to Ulytau cuts it more but costs cattle (estimates).
    chance: c => 0.08 * (has(c, 'e15.raid1508') && c.year === 1509 ? 1.5 : 1) * (has(c, 'e15.reeds') ? 0.6 : has(c, 'e15.north') ? 0.4 : 1),
    apply: c => (hit(c), takeCaptive(c, 0.08)),
  },
  once('e15.reeds.line', c => has(c, 'e15.reeds'), 1, 'calm'),
  once('e15.north.line', c => has(c, 'e15.north'), 1, 'calm'),
  once('e15.raid1508.line', c => c.year === 1508 && has(c, 'e15.raid1508'), 1, 'history', true),
  once('e15.revenge1509', c => c.year === 1509 && has(c, 'e15.raid1508'), 1, 'bad'),
  once('e15.ulytau.line', c => c.year === 1510 && has(c, 'e15.ulytau'), 1, 'history', true),
  once('e15.ulytau_left.line', c => c.year === 1510 && has(c, 'e15.ulytau_left'), 1, 'bad'),
  histLine('e15.hist.ulytau', 1510, c => !has(c, 'e15.ulytau') && !has(c, 'e15.ulytau_left')),
  histLine('e15.hist.shaybani_death', 1511),
  histLine('e15.hist.kasym', 1514),
  once('e15.kasym_south.line', c => has(c, 'e15.kasym_south') && has(c, `e15.war.${c.year}`), 1, 'history', true),
  once('e15.kasym_west.line', c => has(c, 'e15.kasym_west') && has(c, `e15.war.${c.year}`), 1, 'history', true),
  once('e15.kasym.loot', c => (has(c, 'e15.kasym_south') || has(c, 'e15.kasym_west')) && c.year >= 1512, 0.3, 'good', true),
  once('e15.to_kasym.line', c => has(c, 'e15.to_kasym'), 1, 'history', true),
  histLine('e15.hist.kasym_death', 1521),
  histLine('e15.hist.tahir', 1523),
  // 1523–1530, decline under Tahir: Nogai and Moghul raids (§6.1 decline_1523: 6% a year), less for those who left for the river.
  {
    id: 'e15.decline',
    tone: 'bad',
    when: c => y(c, 1523, 1530) && inR(c, ['kostanai', 'aktobe', 'oral', 'zhetisu', 'arka']) && home(c) && c.age >= 3,
    chance: c => (has(c, 'e15.tahir') ? 0.06 : 0.04),
    apply: c => (hit(c), takeCaptive(c, 0.04)),
  },
  once('e15.tahir.line', c => has(c, 'e15.tahir') && c.year >= 1527, 0.5, 'bad', true),
  once('e15.left_tahir.line', c => has(c, 'e15.left_tahir'), 1, 'calm', true),
  histLine('e15.hist.tahir_death', 1531),
  { id: 'e15.captive', tone: 'bad', big: true, when: c => has(c, 'e15.taken'), chance: () => 1, apply: c => (del(c, 'e15.taken'), set(c, 'captive', `e15.cap.${c.year}`)) },
  // Captivity: ransom or escape (15% a year); an ancestor who still has no child comes back sooner.
  {
    id: 'e15.captive.free',
    tone: 'good',
    big: true,
    when: c => has(c, 'captive') && !has(c, `e15.cap.${c.year}`),
    chance: c => (needChild(c) && c.age >= 20 ? 0.6 : 0.15),
    apply: c => void del(c, 'captive'),
  },
  once('e15.kin_captive', c => home(c) && c.age >= 15 && (y(c, 1503, 1510) || y(c, 1523, 1530) || (warYear(c) && c.p.region === 'syr')), 0.01, 'bad', false, c => set(c, 'e15.kin_captive')),
  once('e15.kin_back.line', c => has(c, 'e15.kin_back'), 1, 'good', true),
  once('e15.kin_lost.line', c => has(c, 'e15.kin_lost'), 1, 'grief'),
  // Biy's student and the sultan's nuker.
  once('e15.biy.line', c => has(c, 'e15.biy_student') && c.age >= 28 && ok(c), 0.3, 'good', true),
  once('e15.nuker.line', c => has(c, 'e15.nuker') && c.age >= 18 && ok(c), 0.3, 'calm', true),
  once('e15.nuker.back', c => has(c, 'e15.nuker') && c.age >= 32, 0.5, 'calm', false, c => void del(c, 'e15.nuker')),
  // Caravan, kaftans, pilgrimage, barymta.
  once('e15.caravan.line', c => has(c, 'e15.caravan'), 1, 'good', true, c => {
    del(c, 'e15.caravan')
    if (c.r.chance(y(c, 1503, 1510) ? 0.15 : 0.05)) return { key: 'e15.caravan.robbed' }
    return undefined
  }),
  once('e15.kaftan.line', c => has(c, 'e15.kaftan'), 1, 'good', true, c => {
    del(c, 'e15.kaftan')
    if (c.r.chance(y(c, 1503, 1510) ? 0.15 : 0.05)) return { key: 'e15.kaftan.lost' }
    return undefined
  }),
  once('e15.pilgrim.line', c => has(c, 'e15.pilgrim'), 1, 'good', true, c => {
    del(c, 'e15.pilgrim')
    // §6.2: in 1503–1510 the road through the war lands was attacked 5% of the time.
    if (y(c, 1503, 1510) && c.r.chance(0.05)) return { key: 'e15.pilgrim.robbed' }
    return undefined
  }),
  once('e15.raid.line', c => has(c, 'e15.raid'), 1, 'calm', true, c => (del(c, 'e15.raid'), c.r.chance(0.5) ? { key: 'e15.raid.back' } : { key: 'e15.raid.dispute' })),
  once('e15.court.line', c => has(c, 'e15.court'), 1, 'calm', false, c => (del(c, 'e15.court'), c.r.chance(0.7) ? undefined : { key: 'e15.court.long' })),
  once('e15.amenger.line', c => has(c, 'e15.amenger'), 1, 'calm'),
  once('e15.left_kin.line', c => has(c, 'e15.left_kin'), 1, 'calm'),
  once('e15.jut_migrated.line', c => has(c, 'e15.jut_migrated'), 1, 'calm'),
  once('e15.jut_slaughter.line', c => has(c, 'e15.jut_slaughter'), 1, 'calm'),
  once('e15.hired.line', c => has(c, 'e15.hired'), 1, 'calm', true),
  once('e15.hearth.line', c => has(c, 'e15.hearth') && c.age >= 60, 0.5, 'good'),
  once('e15.counsel.line', c => has(c, 'e15.counsel') && c.age >= 59, 0.6, 'good', true),
  // Rare moments (each a few percent of lives).
  once('e15.rare.asan', c => y(c, 1458, 1480) && c.age >= 8 && home(c), 0.003, 'good', true),
  once('e15.rare.herat', c => c.p.region === 'syr' && c.age >= 10 && home(c), 0.003, 'good', true),
  once('e15.rare.sygnak', c => c.p.region === 'syr' && c.age >= 8 && c.age <= 20 && home(c), 0.004, 'good'),
  // Generic disease: no dated plague in the steppe 1440–1530 was found (§3.2). A "bad year" 2% a year (×1.5 on the Syr and in Zhetisu).
  {
    id: 'e15.mor',
    tone: 'bad',
    when: c => home(c) && c.age >= 1,
    chance: c => 0.02 * (inR(c, ['syr', 'zhetisu']) ? 1.5 : 1),
    apply: c => void set(c, `e15.mor.${c.year}`),
  },
  // Jut: 10% a year (§3.3), half for those settled by the river.
  jutEvent(P, c => (settled(c) ? 0.05 : 0.1)),
  spouseDies(P),
]

/** Adult mortality a little higher than in the XVIII century (§3.5): 0.010 / 0.022 / 0.05 / 0.12. Children as in era 18. */
const baseQ15 = (age: number) => (age < 15 ? earlyBaseQ(age) : age < 40 ? 0.01 : age < 60 ? 0.022 : age < 70 ? 0.05 : age < 80 ? 0.12 : 0.2)

export const HAZARDS_15: Hazard[] = [
  { id: 'base', q: c => baseQ15(c.age) },
  jutHazard,
  // Childbirth: the shared birth event gives ~0.9%; §3.5 estimates 1.5% per birth, the rest is added here.
  { id: 'childbirth', q: c => (!male(c) && c.p.log.some(e => e.year === c.year && (e.key === 'child.first' || e.key === 'child.more' || e.key === 'child.lost')) ? 0.006 : 0) },
  { id: 'oirat', q: c => (c.year === 1457 && c.p.region === 'syr' && home(c) ? 0.03 : 0) },
  { id: 'road', q: c => (has(c, `e15.road.${c.year}`) ? 0.02 : 0) },
  { id: 'breakup', q: c => (y(c, 1469, 1471) && inR(c, ['syr', 'arka', 'kostanai', 'aktobe']) && !has(c, 'e15.exodus') ? (has(c, 'e15.kazakh') ? 0.005 : 0.01) : 0) },
  // In a campaign year: towns war 8%, raid of 1508 5%, Ulytau 4%, Kasym's campaigns 6% (§6.1).
  {
    id: 'battle',
    q: c => {
      if (!has(c, `e15.war.${c.year}`)) return 0
      if (c.year === 1508) return 0.05
      if (c.year === 1510) return 0.04
      if (c.year >= 1511) return 0.06
      return 0.08
    },
  },
  // A sultan's nuker rides in war years.
  { id: 'nuker', q: c => (has(c, 'e15.nuker') && c.age >= 16 && (warYear(c) || y(c, 1503, 1520)) ? 0.03 : 0) },
  // A ravaged aul: about one in eight dies in the raid itself or in the hungry winter after (estimate; gives §6.1's ~1% a year).
  { id: 'raid', q: c => (has(c, `e15.hit.${c.year}`) ? (c.age < 5 || c.age >= 60 ? 0.16 : 0.1) : 0) },
  { id: 'captive', q: c => (has(c, 'captive') ? 0.06 : 0) },
  { id: 'feud', q: c => (has(c, `e15.barymta.${c.year}`) ? 0.03 : 0) },
  // Disease in a bad year: §3.2 suggests fall ill 15% and die 50% (plague); no dated plague was found, so the game keeps
  // it generic and lower: 5% in that year.
  { id: 'mor', q: c => (has(c, `e15.mor.${c.year}`) ? 0.05 : 0) },
]
