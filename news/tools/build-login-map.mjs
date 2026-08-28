#!/usr/bin/env node
// ログイン画面の背景に敷く日本地図を書き出す。
//
//   npm run news:login-map
//
// ログイン画面は PHP 単体で動くため、地図データ（japan-map.mjs）を
// 直接読めない。ここで静的な SVG にして server/public/assets/ に置く。
//
// 社内には別のポータルがあり、ログイン画面が似ていると
// どちらに入ろうとしているのか分からなくなる。このサイトでしか
// 出てこない形を背景に置いて、一目で区別が付くようにする。

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { viewBox, regions, attribution } from '../lib/japan-map.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const TARGET = path.join(ROOT, 'server/public/assets/japan.svg')

// 背景として敷くので、輪郭が分かる程度の淡い色を焼き込む。
// 背景画像は CSS の色を継げないため、ここで指定しておく必要がある。
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="日本地図">
<title>日本地図</title>
<desc>${attribution.text}（${attribution.href}）</desc>
<g fill="#2a6d88" stroke="#5fe0ff" stroke-width="0.6" stroke-linejoin="round">
${regions.map((r) => `<path d="${r.d}"/>`).join('\n')}
</g>
</svg>
`

await fs.mkdir(path.dirname(TARGET), { recursive: true })
await fs.writeFile(TARGET, svg, 'utf8')
console.log(`書き出しました: ${path.relative(ROOT, TARGET)}（${(svg.length / 1024).toFixed(0)}KB）`)
