import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 })
await p.goto('file://' + process.argv[2], { waitUntil: 'load' })
await p.waitForTimeout(900)
await p.locator('.sheet').screenshot({ path: process.argv[3] })
await b.close()
