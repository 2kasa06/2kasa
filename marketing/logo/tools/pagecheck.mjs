import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 900, height: 1300 } })
await p.goto('file://' + process.argv[2], { waitUntil: 'load' })
await p.waitForTimeout(900)
console.log(JSON.stringify(await p.evaluate(() => {
  const LIMIT = 1122.5
  return [...document.querySelectorAll('.page')].map((pg, i) => {
    pg.style.height = 'auto'; pg.style.overflow = 'visible'
    pg.querySelectorAll(':scope > *').forEach(s => s.style.flex = '0 0 auto')
    const h = +pg.getBoundingClientRect().height.toFixed(1)
    pg.style.height = '297mm'; pg.style.overflow = 'hidden'
    return { page: i + 1, natural: h, over: +(h - LIMIT).toFixed(1) }
  })
})))
await b.close()
