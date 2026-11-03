// Renders end cards for given seeds (choices: always the first option) in each language.
import { chromium, devices } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:5350/'
const seeds = (process.argv[3] ?? '340,9,33,463').split(',')
const b = await chromium.launch({ channel: 'chrome' })
for (const lang of ['ru', 'kz']) for (const seed of seeds) {
  const pg = await b.newPage({ ...devices['Pixel 7'] })
  await pg.goto(url)
  await pg.evaluate(l => localStorage.setItem('lang', l), lang)
  await pg.goto(url + `?l=3.${Number(seed).toString(36)}...`)
  await pg.click('#watch')
  const t0 = Date.now()
  while (Date.now() - t0 < 90000) {
    const o = await pg.$$('.opt')
    if (o.length) await o[0].click()
    if (await pg.$('.card-img[src]')) break
    await pg.waitForTimeout(150)
  }
  await (await pg.$('.card-img')).screenshot({ path: `test-results/flow/card-${lang}-${seed}.png` })
  await pg.close()
}
await b.close()
