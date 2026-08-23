/**
 * dist-preview/ のビルド結果を、1枚の自己完結HTMLにまとめます。
 * JS・CSS をインライン化し、public/images の画像を data URI に置き換えます。
 *
 *   npm run build:preview   →  dist-preview/beauty-produce.html
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const outDir = path.join(root, 'dist-preview')

// public/images/*.webp を data URI に
const imageDir = path.join(root, 'public', 'images')
const images = {}
for (const file of readdirSync(imageDir)) {
  const base64 = readFileSync(path.join(imageDir, file)).toString('base64')
  images['/images/' + file] = `data:image/webp;base64,${base64}`
}

let html = readFileSync(path.join(outDir, 'preview.html'), 'utf8')

// CSS をインライン化
html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (match, href) => {
  if (href.startsWith('http')) return match
  const css = readFileSync(path.join(outDir, href.replace(/^\.?\//, '')), 'utf8')
  return `<style>\n${css}\n</style>`
})

// JS をインライン化（画像パスは data URI に差し替え）
html = html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (match, src) => {
  let js = readFileSync(path.join(outDir, src.replace(/^\.?\//, '')), 'utf8')
  for (const [from, to] of Object.entries(images)) {
    js = js.split(`"${from}"`).join(`"${to}"`)
  }
  return `<script type="module">\n${js}\n</script>`
})

const outFile = path.join(outDir, 'beauty-produce.html')
writeFileSync(outFile, html)

console.log(
  `wrote ${path.relative(root, outFile)} (${(statSync(outFile).size / 1048576).toFixed(2)} MB)`
)
