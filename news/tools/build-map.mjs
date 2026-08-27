#!/usr/bin/env node
// 都道府県のSVGパスを地方ごとにまとめ、news/lib/japan-map.mjs を生成する。
//
//   npm run news:map
//
// 生成物はコミットされるので、実行時に @svg-maps/japan は要らない。
// 地方の区分を変えたいときだけ、このファイルを直して再実行する。

import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const REGIONS = [
  { id: 'hokkaido', label: '北海道', prefectures: ['hokkaido'] },
  { id: 'tohoku', label: '東北', prefectures: ['aomori', 'iwate', 'miyagi', 'akita', 'yamagata', 'fukushima'] },
  { id: 'kanto', label: '関東', prefectures: ['ibaraki', 'tochigi', 'gunma', 'saitama', 'chiba', 'tokyo', 'kanagawa'] },
  { id: 'chubu', label: '中部', prefectures: ['niigata', 'toyama', 'ishikawa', 'fukui', 'yamanashi', 'nagano', 'gifu', 'shizuoka', 'aichi'] },
  { id: 'kinki', label: '近畿', prefectures: ['mie', 'shiga', 'kyoto', 'osaka', 'hyogo', 'nara', 'wakayama'] },
  { id: 'chugoku', label: '中国', prefectures: ['tottori', 'shimane', 'okayama', 'hiroshima', 'yamaguchi'] },
  { id: 'shikoku', label: '四国', prefectures: ['tokushima', 'kagawa', 'ehime', 'kochi'] },
  { id: 'kyushu', label: '九州', prefectures: ['fukuoka', 'saga', 'nagasaki', 'kumamoto', 'oita', 'miyazaki', 'kagoshima'] },
  { id: 'okinawa', label: '沖縄', prefectures: ['okinawa'] },
]

/**
 * このデータのパスは 'm'（相対moveto）と 'z' しか使わない多角形。
 * moveto に続く座標の並びは暗黙の相対 lineto として扱う。
 *
 * @returns 部分パスごとの絶対座標の配列
 */
function parseSubpaths(d) {
  const subpaths = []
  let current = null
  let cx = 0
  let cy = 0
  let startX = 0
  let startY = 0

  for (const chunk of d.split(/(?=[mz])/i)) {
    const command = chunk.trim()[0]
    if (!command) continue

    if (command.toLowerCase() === 'z') {
      // 閉じたら現在点は部分パスの始点に戻る
      cx = startX
      cy = startY
      continue
    }

    const nums = (chunk.slice(1).match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number)
    current = []
    subpaths.push(current)
    for (let i = 0; i + 1 < nums.length; i += 2) {
      cx += nums[i]
      cy += nums[i + 1]
      if (i === 0) {
        startX = cx
        startY = cy
      }
      current.push([cx, cy])
    }
  }
  return subpaths.filter((points) => points.length >= 2)
}

/**
 * 絶対座標のパス文字列にする。
 *
 * 相対座標のパスは単純に連結できない。2つ目以降の 'm' が前のパスの終点を
 * 基準にしてしまい、県がまるごとずれる。地方単位にまとめる前に絶対化しておく。
 */
function toAbsolutePath(d) {
  const round = (n) => +n.toFixed(1)
  return parseSubpaths(d)
    .map(
      (points) =>
        `M${round(points[0][0])},${round(points[0][1])}` +
        points
          .slice(1)
          .map(([x, y]) => `L${round(x)},${round(y)}`)
          .join('') +
        'Z',
    )
    .join('')
}

/** 多角形の符号付き面積（靴紐公式） */
function areaOf(points) {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % points.length]
    sum += x1 * y2 - x2 * y1
  }
  return sum / 2
}

/** 多角形の重心 */
function centroidOf(points) {
  const area = areaOf(points)
  if (Math.abs(area) < 1e-9) {
    // 面積がほぼ0の細長い形は、頂点の平均で代用する
    const n = points.length
    return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n]
  }
  let cx = 0
  let cy = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % points.length]
    const cross = x1 * y2 - x2 * y1
    cx += (x1 + x2) * cross
    cy += (y1 + y2) * cross
  }
  return [cx / (6 * area), cy / (6 * area)]
}

/**
 * ピンを置く点。
 *
 * 外接矩形の中心は使えない。東京の島嶼部のような離れた小島が矩形を広げ、
 * 中心が海に落ちる。主要な陸地（最大面積の5%以上）だけを対象に、
 * 面積で重み付けした重心を取る。
 */
function anchorOf(subpaths) {
  const parts = subpaths
    .map((points) => ({ points, area: Math.abs(areaOf(points)) }))
    .filter((part) => part.area > 0)
  if (parts.length === 0) return [0, 0]

  const maxArea = Math.max(...parts.map((p) => p.area))
  const main = parts.filter((part) => part.area >= maxArea * 0.05)

  let totalArea = 0
  let x = 0
  let y = 0
  for (const part of main) {
    const [px, py] = centroidOf(part.points)
    x += px * part.area
    y += py * part.area
    totalArea += part.area
  }
  return [+(x / totalArea).toFixed(1), +(y / totalArea).toFixed(1)]
}

function bboxOf(subpaths) {
  const points = subpaths.flat()
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return {
    x: +x.toFixed(1),
    y: +y.toFixed(1),
    w: +(Math.max(...xs) - x).toFixed(1),
    h: +(Math.max(...ys) - y).toFixed(1),
  }
}

// 本土から遠く、元データでも別枠に置かれている地方。
// 描画側で「別枠」と分かる囲みを付けるための印。
const INSETS = new Set(['okinawa'])

const source = require('@svg-maps/japan')
const map = source.Japan || source.default || source
const byId = new Map(map.locations.map((l) => [l.id, l]))

const regions = REGIONS.map((region) => {
  const raw = region.prefectures.map((id) => {
    const found = byId.get(id)
    if (!found) throw new Error(`都道府県が見つからない: ${id}`)
    return found.path.trim()
  })
  const subpaths = raw.flatMap(parseSubpaths)
  const box = bboxOf(subpaths)
  return {
    id: region.id,
    label: region.label,
    prefectures: region.prefectures.length,
    d: raw.map(toAbsolutePath).join(''),
    box,
    pin: anchorOf(subpaths),
    inset: INSETS.has(region.id),
  }
})

const out = `// 自動生成。直接編集しないこと。
// 生成: npm run news:map  （元データは news/tools/build-map.mjs）
//
// 地図データの出典:
//   MapSVG (https://mapsvg.com/maps/japan) — Creative Commons Attribution 4.0 International
//   npm パッケージ @svg-maps/japan (Victor Cazanave) を経由
// 変更点: 47都道府県のパスを9地方に結合し、外接矩形とピン位置を付加した。

export const viewBox = '${map.viewBox}'

export const attribution = {
  text: '地図: MapSVG / @svg-maps/japan (CC BY 4.0) を地方単位に結合',
  href: 'https://mapsvg.com/maps/japan',
  license: 'https://creativecommons.org/licenses/by/4.0/',
}

export const regions = ${JSON.stringify(regions, null, 2)}
`

const target = path.join(ROOT, 'news/lib/japan-map.mjs')
await fs.writeFile(target, out, 'utf8')
console.log(`生成しました: ${path.relative(ROOT, target)}`)
for (const region of regions) {
  console.log(
    `  ${region.label.padEnd(4)} ${String(region.prefectures).padStart(2)}県  ` +
      `矩形 x${region.box.x} y${region.box.y} w${region.box.w} h${region.box.h}  ピン ${region.pin}`,
  )
}
