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
      await pg.click('#ff')
      let shotChoice = bname === 'chrome' && !group
      const t0 = Date.now()
      while (Date.now() - t0 < 120000) {
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
      if (!(await pg.$('.card-img[src]'))) problems.push(`${bname} ${lang} ${group}: no end card`)
      const text = await pg.evaluate(() => document.body.innerText)
      if (/\b(ch|chq|card|ev|hist|near|death|job|reg|way|grp|fl)\.[a-z]/.test(text)) problems.push(`${bname} ${lang}: raw key in text`)
      if (bname === 'chrome') {
        await pg.screenshot({ path: `test-results/flow/${lang}-${group || 'random'}-end.png`, fullPage: false })
        const card = await pg.$('.card-img')
        await card.screenshot({ path: `test-results/flow/${lang}-${group || 'random'}-card.png` })
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
// Seed 4: the first year already asks a question (Codex review, blocker 1).
{
  const b = await chromium.launch({ channel: 'chrome' })
  const pg = await b.newPage({ ...devices['Pixel 7'] })
  pg.on('pageerror', e => problems.push(`seed4 pageerror ${e.message}`))
  await pg.goto(url + '?l=1.4...')
  await pg.click('#watch')
  const t0 = Date.now()
  while (Date.now() - t0 < 90000) {
    const opts = await pg.$$('.opt')
    if (opts.length) await opts[0].click()
    if (await pg.$('.card-img[src]')) break
    await pg.waitForTimeout(200)
  }
  if (!(await pg.$('.card-img[src]'))) problems.push('seed4: stuck')
  for (const bad of ['?l=1.1.bad.0.', '?l=1.1.kazakh.x.']) {
    await pg.goto(url + bad)
    if (await pg.$('#watch')) problems.push(`broken link ${bad} offered`)
    if (!(await pg.$('#born'))) problems.push(`broken link ${bad} broke the page`)
  }
  await b.close()
}
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'ALL OK')
if (problems.length) process.exit(1)
