/**
 * All historical numbers in one place. Sources and reasoning: docs/history-data.md (section 7 has the engine table).
 * «И» — straight from a source, «О» — an estimate built on sourced numbers.
 * tests/calibration.test.ts checks that many simulated lives add up to the historical totals.
 */
import type { Group, Region, Way } from './types'

const lerp = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x0, y0] = pts[i - 1]
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
  }
  return pts[pts.length - 1][1]
}

// ---------- Birth ----------
const yearWeights: Record<string, number> = {}
for (let y = 1900; y <= 1935; y++) {
  // Fewer births in uprising, famine and war years (О: population dynamics, docs 1.2).
  let w = 1
  if (y >= 1916 && y <= 1917) w = 0.8
  if (y >= 1919 && y <= 1922) w = 0.7
  if (y >= 1931 && y <= 1934) w = 0.5
  yearWeights[y] = w
}

/**
 * Share of births by people (docs 7.1, О on census 1897/1926/1939).
 * Koreans and most Germans were not born here: they come by the deportation path ('abroad'),
 * weighted by their share among today's descendants (О).
 */
function groupShare(year: number): Partial<Record<Group, number>> {
  const t: [number, number, number, number, number, number][] = [
    // kazakh, russian, ukrainian, uzbek, tatar, uighur
    [0.8, 0.11, 0.03, 0.02, 0.015, 0.015],
    [0.7, 0.15, 0.1, 0.02, 0.013, 0.01],
    [0.58, 0.21, 0.14, 0.02, 0.013, 0.009],
    [0.42, 0.36, 0.12, 0.02, 0.018, 0.006],
  ]
  const row = year <= 1906 ? t[0] : year <= 1915 ? t[1] : year <= 1929 ? t[2] : t[3]
  return { kazakh: row[0], russian: row[1], ukrainian: row[2], uzbek: row[3], tatar: row[4], uighur: row[5], german: 0.04, korean: 0.015 }
}

const groupYears: Partial<Record<Group, Record<string, number>>> = {}

/** Region of birth (docs 7.1, И: census 1926 by gubernia). For Germans/Koreans — where they were sent. */
const region: Record<Group, Partial<Record<Region, number>>> = {
  kazakh: { syr: 0.242, shygys: 0.197, zhetisu: 0.155, oral: 0.129, arka: 0.119, aktobe: 0.088, adai: 0.036, kostanai: 0.034 },
  russian: { shygys: 0.313, arka: 0.309, zhetisu: 0.113, oral: 0.1, syr: 0.065, kostanai: 0.065, aktobe: 0.034, adai: 0.002 },
  ukrainian: { arka: 0.363, kostanai: 0.187, shygys: 0.163, zhetisu: 0.103, aktobe: 0.103, syr: 0.05, oral: 0.03 },
  german: { arka: 0.41, shygys: 0.23, kostanai: 0.21, syr: 0.09, zhetisu: 0.06 },
  tatar: { shygys: 0.3, arka: 0.25, oral: 0.2, zhetisu: 0.15, syr: 0.1 },
  uzbek: { syr: 0.96, zhetisu: 0.04 },
  uighur: { zhetisu: 1 },
  korean: { syr: 0.45, zhetisu: 0.35, arka: 0.2 },
  other: { arka: 0.4, shygys: 0.3, zhetisu: 0.3 },
}

/** Way of life at birth. Kazakhs: docs 7.2 (О on Dakhshleiger). */
function way(group: Group, reg: Region, year: number): Partial<Record<Way, number>> {
  if (group === 'german' || group === 'korean') return { abroad: 1 }
  if (group === 'kazakh') {
    let mobile = year <= 1915 ? 0.7 : year <= 1929 ? 0.6 : 0.3
    if (reg === 'adai' || reg === 'aktobe' || reg === 'kostanai') mobile += 0.15
    if (reg === 'arka' || reg === 'zhetisu') mobile -= 0.15
    mobile = Math.min(0.92, mobile)
    // Fully nomadic: about a third of the mobile ones, more in the west.
    const nomadPart = reg === 'adai' || reg === 'oral' ? 0.55 : 0.3
    const town = year < 1928 ? 0.02 : 0.05
    return { nomad: mobile * nomadPart, seminomad: mobile * (1 - nomadPart), village: Math.max(0.03, 1 - mobile - town), town }
  }
  if (group === 'tatar') return { town: 0.55, village: 0.45 }
  if (group === 'uzbek' || group === 'uighur') return { village: 0.75, town: 0.25 }
  return { village: 0.8, town: 0.2 }
}

function context(year: number, group: Group): string | null {
  if (group === 'german' || group === 'korean') return null
  if (year <= 1905) return 'hist.birth.empire'
  if (year <= 1915) return 'hist.birth.stolypin'
  if (year <= 1917) return 'hist.birth.1916'
  if (year <= 1922) return 'hist.birth.civil'
  if (year <= 1928) return 'hist.birth.nep'
  return 'hist.birth.collect'
}

export const BIRTH = {
  yearWeights,
  groupYears,
  groupShare,
  region,
  way,
  context,
  siblings: [2, 7] as [number, number],
}

// ---------- Ordinary mortality (docs 7.3, 7.4; О) ----------
/** Probability that a newborn dies in the first year. Under-5 ≈0.38–0.40 before 1915, ≈0.33 in the 1920s. */
export const imr = (y: number) => lerp([[1900, 0.28], [1915, 0.27], [1926, 0.23], [1939, 0.19], [1950, 0.12], [1960, 0.07], [1970, 0.05], [1990, 0.04], [2000, 0.03]], y)

/** Adult yearly death risk by age band and period (docs 7.4). */
function adultBand(age: number, year: number, male: boolean): number {
  // [15–39, 40–59, 60–69, 70–79, 80+]
  let b: number[]
  if (year < 1941) b = [0.008, 0.018, 0.04, 0.1, 0.18]
  else if (year <= 1945) b = [0.01, 0.022, 0.05, 0.12, 0.2]
  else if (year <= 1970) b = [0.003, 0.01, 0.03, 0.08, 0.16]
  else if (year <= 1990) b = male ? [0.004, 0.015, 0.035, 0.085, 0.16] : [0.0018, 0.008, 0.025, 0.07, 0.15]
  else b = male ? [0.005, 0.02, 0.045, 0.095, 0.17] : [0.002, 0.009, 0.028, 0.075, 0.15]
  if (age < 40) return b[0]
  if (age < 60) return b[1]
  if (age < 70) return b[2]
  if (age < 80) return b[3]
  return b[4]
}

export function baseQ(age: number, year: number, male: boolean): number {
  if (age === 0) return imr(year)
  if (age < 5) return imr(year) * 0.1
  if (age < 15) return imr(year) * 0.012
  return adultBand(age, year, male)
}

/** Kazakh famine deaths by year (И: 33–42% of Kazakhs died 1930–33; this split gives ≈38% after modifiers). */
export const FAMINE_Q: Record<number, number> = { 1930: 0.04, 1931: 0.13, 1932: 0.22, 1933: 0.11 }
/** Regional famine multipliers (О on Alekseenko's relative losses). */
export const FAMINE_REGION: Partial<Record<Region, number>> = { shygys: 1.35, arka: 1.15, oral: 1, aktobe: 1, syr: 0.95, zhetisu: 0.95, adai: 1, kostanai: 1 }
/** Famine 1921–22 (О: ~1 mln died; west and north ~15%, south and east ~3%). */
export const FAMINE21_REGION: Partial<Record<Region, number>> = { oral: 0.08, aktobe: 0.08, kostanai: 0.08, arka: 0.07, adai: 0.05, zhetisu: 0.015, shygys: 0.015, syr: 0.015 }
