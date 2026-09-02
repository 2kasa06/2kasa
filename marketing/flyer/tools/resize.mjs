import { chromium } from 'playwright'
import fs from 'fs'
const SRC = new URL('../../../public/images', import.meta.url).pathname
const OUT = process.argv[2]
fs.mkdirSync(OUT, { recursive: true })
const JOBS = [
  ['hero-illustration.webp', 1800, .92],
  ['age-teens.webp', 620, .90],
  ['age-30s.webp', 620, .90],
  ['age-40s.webp', 620, .90],
  ['age-50s.webp', 620, .90],
]
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage()
await p.goto('about:blank')
for (const [name, maxW, q] of JOBS) {
  const src = 'data:image/webp;base64,' + fs.readFileSync(`${SRC}/${name}`).toString('base64')
  const out = await p.evaluate(async ([src, maxW, q]) => {
    const im = new Image(); im.src = src; await im.decode()
    const s = Math.min(1, maxW / im.naturalWidth)
    const c = document.createElement('canvas')
    c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s)
    const g = c.getContext('2d')
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height)
    g.drawImage(im, 0, 0, c.width, c.height)
    return { d: c.toDataURL('image/jpeg', q), w: c.width, h: c.height, ow: im.naturalWidth, oh: im.naturalHeight }
  }, [src, maxW, q])
  const buf = Buffer.from(out.d.split(',')[1], 'base64')
  fs.writeFileSync(`${OUT}/${name.replace(/\.webp$/, '.jpg')}`, buf)
  console.log(name, `${out.ow}x${out.oh} -> ${out.w}x${out.h}`, (buf.length / 1024).toFixed(0) + 'KB')
}
await b.close()
