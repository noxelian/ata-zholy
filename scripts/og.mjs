import { chromium } from '@playwright/test'
import { fileURLToPath } from 'node:url'
const b = await chromium.launch({ channel: 'chrome' })
const pg = await b.newPage({ viewport: { width: 1200, height: 630 } })
await pg.goto('file://' + fileURLToPath(new URL('./og.html', import.meta.url)))
await pg.waitForTimeout(1500)
await pg.screenshot({ path: fileURLToPath(new URL('../public/og.png', import.meta.url)) })
await b.close()
