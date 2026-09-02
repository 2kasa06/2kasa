import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 900, height: 1300 } })
await p.goto('file://' + process.argv[2], { waitUntil: 'load' })
await p.waitForTimeout(800)
const r = await p.evaluate(() => {
  const sh = document.querySelector('.sheet')
  sh.style.height = 'auto'; sh.style.overflow = 'visible'
  sh.querySelectorAll(':scope > section').forEach(s => s.style.flex = '0 0 auto')
  const out = { natural: +sh.getBoundingClientRect().height.toFixed(1), limit: 1122.5, secs: [] }
  sh.querySelectorAll(':scope > section').forEach(s => {
    out.secs.push({ cls: s.className, h: +s.getBoundingClientRect().height.toFixed(1) })
  })
  out.over = +(out.natural - 1122.5).toFixed(1)
  return out
})
console.log(JSON.stringify(r))
await b.close()
