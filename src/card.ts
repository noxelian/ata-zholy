import type { Lang, Person } from './sim/types'
import type { PeerStats } from './sim/stats'
import { UI, fmt } from './i18n/ui'
import { ev } from './i18n/texts'
import { nameOf } from './sim/names'

const W = 1080
const H = 1350
const GOLD = '#d9a441'
const CREAM = '#f3e6cf'
const MUTED = '#c4ae90'

/** Ram's horn ornament, the same shape as public/orn.svg (44×22 units). */
function horn(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.save()
  g.translate(x, y)
  g.scale(s, s)
  g.beginPath()
  g.moveTo(22, 20)
  g.lineTo(22, 12)
  g.bezierCurveTo(22, 6, 17, 3, 13, 4)
  g.bezierCurveTo(9, 5, 8, 10, 11, 11.5)
  g.bezierCurveTo(13.5, 12.6, 15.5, 10.5, 14.5, 8.6)
  g.moveTo(22, 12)
  g.bezierCurveTo(22, 6, 27, 3, 31, 4)
  g.bezierCurveTo(35, 5, 36, 10, 33, 11.5)
  g.bezierCurveTo(30.5, 12.6, 28.5, 10.5, 29.5, 8.6)
  g.restore()
}

function band(g: CanvasRenderingContext2D, y: number, flip = false) {
  g.save()
  g.strokeStyle = GOLD
  g.lineWidth = 2.6
  g.lineCap = 'round'
  if (flip) {
    g.translate(0, y * 2)
    g.scale(1, -1)
  }
  const s = 2.2
  for (let x = 60; x < W - 60; x += 44 * s) {
    horn(g, x, y - 22 * s, s)
    g.stroke()
  }
  g.beginPath()
  g.moveTo(60, y - 2)
  g.lineTo(W - 60, y - 2)
  g.stroke()
  g.restore()
}

function wrap(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (g.measureText(next).width > maxW && cur) {
      lines.push(cur)
      cur = w
    } else cur = next
  }
  if (cur) lines.push(cur)
  return lines
}

export async function drawCard(p: Person, lang: Lang, st: PeerStats, url: string): Promise<Blob> {
  await document.fonts.ready
  try {
    await Promise.all([document.fonts.load('700 80px "Noto Serif"'), document.fonts.load('400 30px "Noto Sans"')])
  } catch {
    /* fall back to system fonts */
  }
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const ui = (k: string, v?: Record<string, string | number>) => fmt(UI[lang][k] ?? UI.ru[k], v)
  const name = nameOf(p, lang)

  // Background: dark felt with a warm glow.
  const bg = g.createRadialGradient(W / 2, 360, 80, W / 2, 600, 900)
  bg.addColorStop(0, '#4a2219')
  bg.addColorStop(1, '#1d0f0b')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  band(g, 120)
  band(g, H - 134, true)

  g.textAlign = 'center'
  g.fillStyle = GOLD
  g.font = '600 34px "Noto Sans", sans-serif'
  g.fillText(ui(p.sex === 'm' ? 'cardHeadM' : 'cardHeadF'), W / 2, 200)

  g.fillStyle = CREAM
  g.font = '700 92px "Noto Serif", serif'
  let fs = 92
  while (g.measureText(name).width > W - 160 && fs > 50) {
    fs -= 4
    g.font = `700 ${fs}px "Noto Serif", serif`
  }
  g.fillText(name, W / 2, 300)

  g.font = '500 54px "Noto Serif", serif'
  g.fillStyle = GOLD
  g.fillText(`${p.birthYear} — ${p.deathYear ?? ''}`, W / 2, 380)

  g.font = '400 34px "Noto Sans", sans-serif'
  g.fillStyle = MUTED
  const origin = ev(lang, p.wayAtBirth === 'abroad' ? `card.origin.abroad.${p.group}` : 'card.origin', p.sex, { region: 'reg.' + p.region, way: 'wayc.' + p.wayAtBirth, grp: 'grpof.' + p.group }).text
  let oy = 440
  for (const l of wrap(g, origin, W - 200)) {
    g.fillText(l, W / 2, oy)
    oy += 44
  }
  if (p.job) {
    g.fillText(ev(lang, 'card.job', p.sex, { job: p.job }).text, W / 2, oy)
    oy += 44
  }

  // Life lines: the big moments, shortest versions, centred in the free space.
  const lines = p.log
    .filter(e => e.big)
    .map(e => ({ year: e.year, text: ev(lang, 'card.' + e.key, p.sex, { ...e.vars, name, age: e.age }).text }))
    .filter(l => !l.text.startsWith('card.'))
  // Bottom block first (children, peer statistic, "simulated" note): it decides how much room the lines get.
  g.textAlign = 'center'
  g.font = '600 32px "Noto Sans", sans-serif'
  const statLines = wrap(g, ui(p.sex === 'm' ? 'outlivedM' : 'outlivedF', { n: st.outlived }), W - 160)
  let kids = p.children > 0 ? ui('cardChildren', { n: p.children }) : ''
  if (p.childrenLost > 0) kids += ` (${ui('cardLostChildren', { n: p.childrenLost })})`
  g.font = '400 30px "Noto Sans", sans-serif'
  const kidLines = kids ? wrap(g, kids, W - 160) : []
  let by = H - 190
  g.font = '600 32px "Noto Sans", sans-serif'
  g.fillStyle = CREAM
  for (let i = statLines.length - 1; i >= 0; i--) {
    g.fillText(statLines[i], W / 2, by)
    by -= 40
  }
  g.font = '400 30px "Noto Sans", sans-serif'
  g.fillStyle = MUTED
  for (let i = kidLines.length - 1; i >= 0; i--) {
    g.fillText(kidLines[i], W / 2, by)
    by -= 38
  }
  g.font = 'italic 500 22px "Noto Serif", serif'
  g.fillStyle = MUTED
  g.fillText(ui('cardModel'), W / 2, H - 150)

  // Life lines: keep the first ones and always the last (the death), centred in the free space.
  g.font = '400 38px "Noto Sans", sans-serif'
  const LH = 48
  const GAP = 20
  const top = oy + 40
  const bottom = by - 20
  let blocks = lines.map(l => ({ ...l, parts: wrap(g, l.text, W - 350) }))
  const height = () => blocks.reduce((sum, b) => sum + b.parts.length * LH + GAP, 0) - GAP
  while (blocks.length > 2 && height() > bottom - top) blocks = [...blocks.slice(0, blocks.length - 2), blocks[blocks.length - 1]]
  let y = top + Math.max(0, (bottom - top - height()) / 2) + 34
  g.textAlign = 'left'
  for (const b of blocks) {
    g.fillStyle = GOLD
    g.font = '700 38px "Noto Sans", sans-serif'
    g.fillText(String(b.year), 120, y)
    g.fillStyle = CREAM
    g.font = '400 38px "Noto Sans", sans-serif'
    b.parts.forEach((part, i) => g.fillText(part, 250, y + i * LH))
    y += b.parts.length * LH + GAP
  }

  g.textAlign = 'center'
  g.fillStyle = GOLD
  g.font = '700 38px "Noto Serif", serif'
  g.fillText(ui('cardAsk'), W / 2, H - 44)
  g.font = '400 26px "Noto Sans", sans-serif'
  g.fillStyle = MUTED
  const u = new URL(url)
  g.fillText((u.host + u.pathname).replace(/\/$/, ''), W / 2, H - 12)

  return await new Promise<Blob>(res => c.toBlob(b => res(b!), 'image/png'))
}
