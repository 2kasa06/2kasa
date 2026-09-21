import { chromium } from 'playwright'
const src = process.argv[2], out = process.argv[3]
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage()
const errs = []
page.on('pageerror', e => errs.push(e.message))
await page.goto('file://' + src, { waitUntil: 'load' })
await page.waitForTimeout(600)
await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true })
await browser.close()
console.log('errors:', errs.length ? errs : 'none')
