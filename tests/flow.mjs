// Plays full lives in a phone-sized browser in every language; screenshots to test-results/flow/.
import { chromium, webkit, devices } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const url = process.argv[2] ?? 'http://localhost:5350/'
mkdirSync('test-results/flow', { recursive: true })
const problems = []
for (const [bname, type, dev] of [['chrome', chromium, devices['Pixel 7']], ['webkit', webkit, devices['iPhone 13']]]) {
  const b = await type.launch(bname === 'chrome' ? { channel: 'chrome' } : {})
  for (const lang of ['ru', 'kz', 'en']) {
    for (const group of ['', 'kazakh', 'german']) {
      const ctx = await b.newContext({ ...dev })
      const pg = await ctx.newPage()
      pg.on('pageerror', e => problems.push(`${bname} ${lang} pageerror ${e.message}`))
      pg.on('console', m => m.type() === 'error' && problems.push(`${bname} ${lang} console ${m.text()}`))
      await pg.goto(url)
      await pg.evaluate(l => localStorage.setItem('lang', l), lang)
      await pg.reload()
      if (group) {
        await pg.click('summary')
        await pg.click(`[data-g="${group}"]`)
      }
      await pg.click('#born')
      await pg.waitForSelector('#go')
      if (bname === 'chrome' && !group) await pg.screenshot({ path: `test-results/flow/${lang}-birth.png` })
      await pg.click('#go')
      let shotChoice = bname === 'chrome' && !group
      const t0 = Date.now()
      while (Date.now() - t0 < 240000) {
        if (await pg.isVisible('#ff') && !(await pg.$('#ff.on'))) await pg.click('#ff')
        const opts = await pg.$$('.opt')
        if (opts.length) {
          if (shotChoice) {
            await pg.screenshot({ path: `test-results/flow/${lang}-choice.png` })
            shotChoice = false
          }
          await opts[Math.floor(Math.random() * opts.length)].click()
        }
        if (await pg.$('.card-img[src]')) break
        await pg.waitForTimeout(200)
      }
      if (!(await pg.$('.card-img[src]'))) {
        const state = await pg.evaluate(() => ({ head: document.querySelector('.life-head')?.textContent, sheet: document.querySelector('.sheet')?.textContent?.slice(0, 120), paused: document.querySelector('#pp')?.textContent }))
        problems.push(`${bname} ${lang} ${group}: no end card ${JSON.stringify(state)}`)
        await pg.screenshot({ path: `test-results/flow/stuck-${bname}-${lang}-${group || 'random'}.png` })
        await ctx.close()
        continue
      }
      const text = await pg.evaluate(() => document.body.innerText)
      if (/\b(ch|chq|card|ev|hist|near|death|job|reg|way|grp|fl)\.[a-z]/.test(text)) problems.push(`${bname} ${lang}: raw key in text`)
      if (bname === 'chrome') {
        await pg.screenshot({ path: `test-results/flow/${lang}-${group || 'random'}-end.png`, fullPage: false })
        const card = await pg.$('.card-img')
        await card.screenshot({ path: `test-results/flow/${lang}-${group || 'random'}-card.png` })
      }
      // Forks: every choice is listed with alternatives; going back asks the same question again.
      const forks = await pg.$$('.fork')
      const choicesMade = await pg.evaluate(() => document.querySelectorAll('.fork').length)
      if (!choicesMade && !(await pg.$('.forks .lead'))) problems.push(`${bname} ${lang} ${group}: no forks section`)
      if (bname === 'chrome' && lang === 'ru' && forks.length) {
        await (await pg.$('.forks')).screenshot({ path: `test-results/flow/forks-${group || 'random'}.png` })
      }
      // Shared link replays the same life.
      const link = await pg.evaluate(() => [...document.querySelectorAll('.lead')][0].innerText)
      if (group === 'kazakh') {
        const shared = await pg.evaluate(() => document.querySelector('.end')?.getAttribute('data-link'))
        await pg.goto(shared)
        await pg.click('#watch')
        await pg.waitForSelector('.card-img[src]', { timeout: 120000 })
        const again = await pg.evaluate(() => [...document.querySelectorAll('.lead')][0].innerText)
        if (again.split('\n')[0] !== link.split('\n')[0]) problems.push(`${bname} ${lang}: shared link gave another life: ${again} vs ${link}`)
      }
      await ctx.close()
      process.stdout.write(`${bname} ${lang} ${group || 'random'}: ${link.split('\n')[0]}\n`)
    }
  }
  await b.close()
}
// Earlier eras: a full life in each, every language, in Chrome.
{
  const b = await chromium.launch({ channel: 'chrome' })
  for (const era of ['xv', 'xviii', 'xix']) for (const lang of ['ru', 'kz', 'en']) {
    const pg = await b.newPage({ ...devices['Pixel 7'] })
    pg.on('pageerror', e => problems.push(`${era} ${lang} pageerror ${e.message}`))
    await pg.goto(url)
    await pg.evaluate(l => localStorage.setItem('lang', l), lang)
    await pg.reload()
    await pg.click(`[data-e="${era}"]`)
    await pg.click('#born')
    await pg.waitForSelector('#go')
    await pg.click('#go')
    for (let t0 = Date.now(); Date.now() - t0 < 240000; ) {
      // "Faster" is hidden while a question is open (a choice can come in the very first year).
      if (await pg.isVisible('#ff') && !(await pg.$('#ff.on'))) await pg.click('#ff')
      const o = await pg.$$('.opt')
      if (o.length) await o[Math.floor(Math.random() * o.length)].click()
      if (await pg.$('.card-img[src]')) break
      await pg.waitForTimeout(150)
    }
    if (!(await pg.$('.card-img[src]'))) problems.push(`${era} ${lang}: no end card`)
    else {
      const text = await pg.evaluate(() => document.body.innerText)
      if (/\b(ch|chq|card|e15|e18|e19|hist|near|death|job|reg|way|tex|fl)\.[a-z]/.test(text)) problems.push(`${era} ${lang}: raw key in text`)
      const forks = await pg.$$('.fork')
      if (!forks.length && !(await pg.$('.forks .lead'))) problems.push(`${era} ${lang}: no forks section`)
      if (lang === 'ru') await (await pg.$('.card-img')).screenshot({ path: `test-results/flow/era-${era}-card.png` })
      if (lang === 'ru' && forks.length) await (await pg.$('.forks')).screenshot({ path: `test-results/flow/era-${era}-forks.png` })
      process.stdout.write(`${era} ${lang}: ${(await pg.$eval('.lead', e => e.textContent)).split('\n')[0]}\n`)
    }
    await pg.close()
  }
  await b.close()
}
// Going back to a fork replays the life up to it and asks again.
{
  const b = await chromium.launch({ channel: 'chrome' })
  const pg = await b.newPage({ ...devices['Pixel 7'] })
  pg.on('pageerror', e => problems.push(`rewind pageerror ${e.message}`))
  await pg.goto(url + '?l=2.4...')
  await pg.evaluate(() => localStorage.setItem('lang', 'ru'))
  await pg.goto(url + '?l=2.4...')
  await pg.click('#watch')
  for (let t0 = Date.now(); Date.now() - t0 < 90000; ) {
    const o = await pg.$$('.opt')
    if (o.length) await o[0].click()
    if (await pg.$('.card-img[src]')) break
    await pg.waitForTimeout(150)
  }
  const forkYears = await pg.$$eval('.fork .y', els => els.map(e => e.textContent))
  if (forkYears.length < 3) problems.push(`rewind: only ${forkYears.length} forks`)
  const target = forkYears[2]
  await (await pg.$$('.fork .link-btn'))[2].click()
  await pg.waitForSelector('.opt', { timeout: 60000 })
  const asked = await pg.$eval('.sheet h2', e => e.textContent)
  if (!target || !asked.startsWith(target.split(' ·')[0])) problems.push(`rewind asked "${asked}" for fork "${target}"`)
  await b.close()
}
// Seed 4: the first year already asks a question (Codex review, blocker 1).
{
  const b = await chromium.launch({ channel: 'chrome' })
  const pg = await b.newPage({ ...devices['Pixel 7'] })
  pg.on('pageerror', e => problems.push(`seed4 pageerror ${e.message}`))
  await pg.goto(url + '?l=2.4...')
  await pg.click('#watch')
  const t0 = Date.now()
  while (Date.now() - t0 < 90000) {
    const opts = await pg.$$('.opt')
    if (opts.length) await opts[0].click()
    if (await pg.$('.card-img[src]')) break
    await pg.waitForTimeout(200)
  }
  if (!(await pg.$('.card-img[src]'))) problems.push('seed4: stuck')
  for (const bad of ['?l=2.1.bad.0.', '?l=2.1.kazakh.x.']) {
    await pg.goto(url + bad)
    if (await pg.$('#watch')) problems.push(`broken link ${bad} offered`)
    if (!(await pg.$('#born'))) problems.push(`broken link ${bad} broke the page`)
  }
  await b.close()
}
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'ALL OK')
if (problems.length) process.exit(1)
