import './style.css'
import { Life, decodeLife, encodeLife, type LifeMode } from './sim/engine'
import { randomSeed } from './sim/rng'
import type { Group, Lang, LogEntry, Person, Step } from './sim/types'
import { GROUPS } from './sim/birth'
import { nameOf } from './sim/names'
import { UI, detectLang, fmt } from './i18n/ui'
import { ev, word } from './i18n/texts'
import { peerStats } from './sim/stats'
import { drawCard } from './card'

const app = document.getElementById('app')!
let lang: Lang = detectLang()
let groupPref: Group | undefined
let mode: LifeMode = 'ancestor'
const t = (k: string, v?: Record<string, string | number>) => fmt(UI[lang][k] ?? UI.ru[k] ?? k, v)

function setLang(l: Lang) {
  lang = l
  document.documentElement.lang = l === 'kz' ? 'kk' : l
  try {
    localStorage.setItem('lang', l)
  } catch {
    /* private mode */
  }
}
setLang(lang)

/** Shows a bottom sheet and hides the play controls under it. */
function openSheet(el: HTMLElement) {
  document.body.classList.add('has-sheet')
  document.body.append(el)
}
function closeSheet(el: HTMLElement) {
  el.remove()
  if (!document.querySelector('.sheet-bg')) document.body.classList.remove('has-sheet')
}

function h(html: string): HTMLElement {
  const d = document.createElement('div')
  d.innerHTML = html.trim()
  return d.firstElementChild as HTMLElement
}
function esc(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}
function toast(msg: string) {
  const el = h(`<div class="toast">${esc(msg)}</div>`)
  document.body.append(el)
  setTimeout(() => el.remove(), 1800)
}

// ---------- Start screen ----------
function start() {
  const shared = new URLSearchParams(location.search).get('l')
  const code = shared ? decodeLife(shared) : null
  app.innerHTML = ''
  const langs = (['kz', 'ru', 'en'] as Lang[])
    .map(l => `<button data-l="${l}" class="${l === lang ? 'on' : ''}">${{ kz: 'ҚАЗ', ru: 'РУС', en: 'ENG' }[l]}</button>`)
    .join('')
  const chips = [`<button data-g="" class="${!groupPref ? 'on' : ''}">${esc(t('random'))}</button>`]
    .concat(GROUPS.map(g => `<button data-g="${g}" class="${groupPref === g ? 'on' : ''}">${esc(word(lang, 'grp.' + g))}</button>`))
    .join('')
  const el = h(`<div class="wrap">
    <div class="top-langs">${langs}</div>
    <div class="orn"></div>
    <div class="hero">
      <h1>${esc(t('title'))}</h1>
      <div class="sub">${esc(t('sub'))}</div>
      <p>${esc(t('intro1'))}</p>
      <p>${esc(t('intro2'))}</p>
    </div>
    ${code ? `<div class="shared-banner">${esc(t('sharedBanner'))}</div><button class="ghost-btn" id="watch">${esc(t('watch'))}</button>` : ''}
    <button class="big-btn" id="born">${esc(t('born'))}</button>
    <details class="settings"><summary>${esc(t('settings'))}</summary>
      <div style="text-align:center;margin-top:6px">${esc(t('whose'))}</div>
      <div class="chips">${chips}</div>
      <div style="text-align:center;margin-top:12px">${esc(t('modeTitle'))}</div>
      <div class="chips"><button data-m="ancestor" class="${mode === 'ancestor' ? 'on' : ''}">${esc(t('modeAncestor'))}</button><button data-m="any" class="${mode === 'any' ? 'on' : ''}">${esc(t('modeAny'))}</button></div>
    </details>
    <div class="orn" style="margin-top:22px"></div>
    <div class="note">
      <h3>${esc(t('howTitle'))}</h3>
      <p>${esc(t('how1'))}</p>
      <p>${esc(t('how2'))}</p>
      <h3>${esc(t('sources'))}</h3>
      <p>${esc(t('srcList'))}</p>
    </div>
  </div>`)
  app.append(el)
  el.querySelectorAll<HTMLButtonElement>('[data-l]').forEach(b => (b.onclick = () => (setLang(b.dataset.l as Lang), start())))
  el.querySelectorAll<HTMLButtonElement>('[data-g]').forEach(
    b =>
      (b.onclick = () => {
        groupPref = (b.dataset.g || undefined) as Group | undefined
        el.querySelectorAll('[data-g]').forEach(x => x.classList.toggle('on', x === b))
      }),
  )
  el.querySelectorAll<HTMLButtonElement>('[data-m]').forEach(
    b =>
      (b.onclick = () => {
        mode = b.dataset.m as LifeMode
        el.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b))
      }),
  )
  el.querySelector<HTMLButtonElement>('#born')!.onclick = () => {
    history.replaceState(null, '', location.pathname)
    play(new Life({ seed: randomSeed(), group: groupPref, mode }), groupPref, false)
  }
  const w = el.querySelector<HTMLButtonElement>('#watch')
  if (w && code) w.onclick = () => play(new Life({ seed: code.seed, group: code.group, choices: code.choices, mode: code.mode }), code.group, true)
}

// ---------- Life screen ----------
const MARKS = [1916, 1921, 1932, 1937, 1941, 1954, 1986, 1991]

function play(life: Life, group: Group | undefined, replay: boolean) {
  const p = life.p
  const seed = p.seed
  app.innerHTML = ''
  window.scrollTo(0, 0)
  const head = h(`<div class="life-head"><div class="row"><span class="name"></span><span class="age"></span></div>
    <div class="century"><div class="fill"></div>${MARKS.map(y => `<div class="mark" style="left:${y - 1900}%"></div>`).join('')}<div class="me"></div></div></div>`)
  const feed = h(`<div class="feed"></div>`)
  const controls = h(`<div class="controls"><button id="pp"></button><button id="ff"></button></div>`)
  app.append(head, feed, controls)
  const name = nameOf(p, lang)
  head.querySelector('.name')!.textContent = name

  let paused = false
  let fast = replay
  let timer = 0
  const pp = controls.querySelector<HTMLButtonElement>('#pp')!
  const ff = controls.querySelector<HTMLButtonElement>('#ff')!
  const syncBtns = () => {
    pp.textContent = paused ? t('play') : t('pause')
    ff.textContent = t('faster')
    ff.classList.toggle('on', fast)
  }
  pp.onclick = () => {
    paused = !paused
    syncBtns()
    if (!paused) schedule(50)
  }
  ff.onclick = () => {
    fast = !fast
    syncBtns()
  }
  syncBtns()

  const updateHead = () => {
    head.querySelector('.age')!.innerHTML = `${p.year} · <b>${p.age}</b> ${esc(t('age'))}`
    const x = Math.max(0, Math.min(100, p.year - 1900))
    ;(head.querySelector('.fill') as HTMLElement).style.width = `${x}%`
    ;(head.querySelector('.me') as HTMLElement).style.left = `${x}%`
  }

  const addYear = (year: number, entries: LogEntry[]) => {
    if (!entries.length) return
    const box = h(`<div class="year"><div class="y">${year} · ${entries[0].age} ${esc(t('age'))}</div></div>`)
    for (const e of entries) {
      const { text, src } = ev(lang, e.key, p.sex, { ...e.vars, name })
      const cls = ['entry', e.tone, e.big ? 'big' : ''].join(' ')
      box.append(h(`<div class="${cls}">${esc(text)}${src ? `<span class="src">${esc(t('sources'))}: ${esc(src)}</span>` : ''}</div>`))
    }
    feed.append(box)
    box.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }

  const schedule = (ms: number) => {
    clearTimeout(timer)
    timer = window.setTimeout(tick, ms)
  }

  const handle = (s: Step) => {
    updateHead()
    addYear(s.year, s.entries)
    if (s.kind === 'death') {
      setTimeout(() => end(life, group), 1400)
      return
    }
    if (s.kind === 'choice') {
      askChoice(life, name, s, i => handle(life.choose(i)))
      return
    }
    const busy = s.entries.length > 0
    const ms = fast ? (busy ? 420 : 70) : busy ? 1500 + 450 * (s.entries.length - 1) : 230
    if (!paused) schedule(ms)
  }
  const tick = () => {
    if (paused) return
    handle(life.next())
  }

  // Birth: first step, then the reveal sheet with the first "wow" stat.
  const first = life.next()
  updateHead()
  addYear(first.year, first.entries)
  // A choice can come in the very first year (born in 1930 or 1932).
  const goOn = () => (first.kind === 'choice' ? askChoice(life, name, first, i => handle(life.choose(i))) : schedule(500))
  if (replay) {
    goOn()
    return
  }
  const st = peerStats(p, 400)
  const sheet = h(`<div class="sheet-bg"><div class="sheet">
    <h2>${esc(t('bornTitle', { name, born: t(p.sex === 'm' ? 'bornM' : 'bornF') }))}</h2>
    <p>${esc(ev(lang, 'birth.where', p.sex, { year: p.birthYear, region: 'reg.' + p.region, way: 'way.' + p.wayAtBirth, grp: 'grpof.' + p.group }).text)}</p>
    <p class="stat">${esc(ev(lang, 'birth.stat', p.sex, { n5: st.survive5, n60: st.survive60 }).text)}</p>
    <button class="big-btn" id="go">${esc(t('keep'))}</button>
  </div></div>`)
  openSheet(sheet)
  sheet.querySelector<HTMLButtonElement>('#go')!.onclick = () => {
    closeSheet(sheet)
    goOn()
  }
  void seed
}

function askChoice(life: Life, name: string, s: Extract<Step, { kind: 'choice' }>, done: (i: number) => void) {
  const p = life.p
  const ch = s.choice
  const opts = ch.options
    .map((o, i) => {
      const btn = ev(lang, `ch.${ch.id}.${o.id}.btn`, p.sex, { name }).text
      const hint = ev(lang, `ch.${ch.id}.${o.id}.hint`, p.sex, { name })
      const hintText = hint.text === `ch.${ch.id}.${o.id}.hint` ? '' : hint.text
      return `<button class="opt" data-i="${i}">${esc(btn)}${hintText ? `<small>${esc(hintText)}</small>` : ''}</button>`
    })
    .join('')
  const q = ev(lang, ch.q?.({ p, year: s.year, age: s.age } as never) ?? `chq.${ch.id}`, p.sex, { name, year: s.year, age: s.age })
  const sheet = h(`<div class="sheet-bg"><div class="sheet">
    <h2>${esc(t('choiceTitle', { year: s.year, name, age: s.age }))}</h2>
    <p>${esc(q.text)}</p>${opts}</div></div>`)
  openSheet(sheet)
  sheet.querySelectorAll<HTMLButtonElement>('.opt').forEach(
    b =>
      (b.onclick = () => {
        closeSheet(sheet)
        done(Number(b.dataset.i))
      }),
  )
}

// ---------- End screen ----------
async function end(life: Life, group: Group | undefined) {
  const p = life.p
  const code = encodeLife(p.seed, group, life.choices, life.mode)
  const url = `${location.origin}${location.pathname}?l=${code}`
  const st = peerStats(p, 1500)
  const name = nameOf(p, lang)
  app.innerHTML = ''
  window.scrollTo(0, 0)
  const el = h(`<div class="wrap end" data-link="${esc(url)}">
    <div class="orn"></div>
    <h2>${esc(t('endTitle'))}</h2>
    <p class="lead">${esc(t('endLead', { name, from: p.birthYear, to: p.deathYear ?? '' }))}<br>${esc(t(p.sex === 'm' ? 'outlivedM' : 'outlivedF', { n: st.outlived }))} (${esc(t('byModel'))})</p>
    <img class="card-img" alt="" />
    <button class="big-btn" id="share">${esc(t('share'))}</button>
    <div class="row2"><button class="ghost-btn" id="dl">${esc(t('download'))}</button><button class="ghost-btn" id="link">${esc(t('copyLink'))}</button></div>
    <p class="lead" style="margin-top:14px">${esc(t('tellFamily'))}</p>
    <button class="ghost-btn" id="again">${esc(t('again'))}</button>
  </div>`)
  app.append(el)
  const blob = await drawCard(p, lang, st, url)
  const img = el.querySelector('img')!
  img.src = URL.createObjectURL(blob)
  const file = new File([blob], `ata-zholy-${p.birthYear}.png`, { type: 'image/png' })
  el.querySelector<HTMLButtonElement>('#share')!.onclick = async () => {
    const data: ShareData = { files: [file], text: `${t('cardAsk')} ${url}` }
    try {
      if (navigator.canShare?.(data)) await navigator.share(data)
      else if (navigator.share) await navigator.share({ text: `${t('cardAsk')} ${url}`, url })
      else download(file)
    } catch {
      /* cancelled */
    }
  }
  el.querySelector<HTMLButtonElement>('#dl')!.onclick = () => download(file)
  el.querySelector<HTMLButtonElement>('#link')!.onclick = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast(t('copied'))
    } catch {
      prompt('', url)
    }
  }
  el.querySelector<HTMLButtonElement>('#again')!.onclick = () => {
    history.replaceState(null, '', location.pathname)
    start()
  }
}

function download(file: File) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(file)
  a.download = file.name
  a.click()
}

export type { Person }
start()
