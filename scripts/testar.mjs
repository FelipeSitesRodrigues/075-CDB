/**
 * Conferência automática antes de mostrar o site.
 *
 * - erro de console e requisição que falhou
 * - overflow horizontal em várias larguras, com o nome do elemento culpado
 * - imagem sem width/height (é o que faz o layout saltar e o CLS subir)
 * - link sem destino, âncora que não existe e imagem sem alt
 * - CLS medido de verdade, rolando a página
 *
 * Uso: node scripts/testar.mjs
 */
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.BASE_URL || 'http://localhost:3075'
const LARGURAS = [360, 390, 414, 600, 768, 900, 1024, 1280, 1440, 1920]

const navegador = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--hide-scrollbars'],
})

let falhas = 0
const erro = (m) => {
  falhas++
  console.log('  FALHA  ' + m)
}

const pag = await navegador.newPage()
const consoleErros = []
const redeErros = []
pag.on('console', (m) => {
  if (m.type() === 'error') consoleErros.push(m.text())
})
pag.on('requestfailed', (r) => redeErros.push(r.url() + ' :: ' + r.failure().errorText))
pag.on('response', (r) => {
  if (r.status() >= 400) redeErros.push(r.status() + ' ' + r.url())
})

await pag.setViewport({ width: 1440, height: 900 })
await pag.goto(BASE + '/', { waitUntil: 'networkidle0' })

console.log('CONSOLE E REDE')
if (consoleErros.length) consoleErros.forEach((e) => erro('console: ' + e))
if (redeErros.length) redeErros.forEach((e) => erro('rede: ' + e))
if (!consoleErros.length && !redeErros.length) console.log('  ok, sem erro')

// ------------------------------------------------------------------- marcação
console.log('\nMARCAÇÃO')
const marcacao = await pag.evaluate(() => {
  const r = { semDim: [], semAlt: [], ancoraMorta: [], hrefVazio: [], h1: 0 }
  r.h1 = document.querySelectorAll('h1').length
  for (const img of document.images) {
    const src = img.currentSrc || img.src
    if (!img.getAttribute('width') || !img.getAttribute('height')) r.semDim.push(src)
    if (img.alt === null) r.semAlt.push(src)
  }
  for (const a of document.querySelectorAll('a')) {
    const h = a.getAttribute('href')
    if (!h || h === '#') r.hrefVazio.push(a.textContent.trim().slice(0, 40))
    else if (h.startsWith('#') && !document.getElementById(h.slice(1))) r.ancoraMorta.push(h)
  }
  return r
})
if (marcacao.h1 !== 1) erro(`a página tem ${marcacao.h1} h1, deveria ter 1`)
marcacao.semDim.forEach((s) => erro('imagem sem width/height: ' + s))
marcacao.semAlt.forEach((s) => erro('imagem sem alt: ' + s))
marcacao.ancoraMorta.forEach((s) => erro('âncora sem destino: ' + s))
marcacao.hrefVazio.forEach((s) => erro('link sem href: ' + s))
if (!falhas) console.log('  ok, 1 h1, toda imagem com alt e dimensão, toda âncora existe')

// --------------------------------------------------------------- overflow
console.log('\nOVERFLOW HORIZONTAL')
for (const w of LARGURAS) {
  await pag.setViewport({ width: w, height: 900, deviceScaleFactor: 1, isMobile: w < 700 })
  await new Promise((r) => setTimeout(r, 180))
  const res = await pag.evaluate((largura) => {
    const doc = document.documentElement
    const estouro = doc.scrollWidth > largura + 1
    const culpados = []
    if (estouro) {
      for (const el of document.body.querySelectorAll('*')) {
        const c = el.getBoundingClientRect()
        if (c.width === 0) continue
        if (c.right > largura + 1.5 || c.left < -1.5) {
          const est = getComputedStyle(el)
          if (est.position === 'fixed' || est.visibility === 'hidden') continue
          culpados.push(
            el.tagName.toLowerCase() +
              (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '') +
              ` [${Math.round(c.left)}..${Math.round(c.right)}]`
          )
        }
      }
    }
    return { scrollWidth: doc.scrollWidth, estouro, culpados: culpados.slice(0, 5) }
  }, w)
  if (res.estouro) {
    erro(`${w}px: scrollWidth ${res.scrollWidth}`)
    res.culpados.forEach((c) => console.log('           ' + c))
  } else {
    console.log(`  ${String(w).padStart(4)}px  ok`)
  }
}

// -------------------------------------------------------------------- CLS
console.log('\nCLS COM ROLAGEM (mobile 390)')
const pag2 = await navegador.newPage()
await pag2.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true })
await pag2.evaluateOnNewDocument(() => {
  window.__cls = 0
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value
  }).observe({ type: 'layout-shift', buffered: true })
})
await pag2.goto(BASE + '/', { waitUntil: 'networkidle0' })
await pag2.evaluate(async () => {
  const passo = window.innerHeight * 0.8
  for (let y = 0; y < document.body.scrollHeight; y += passo) {
    window.scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 140))
  }
  window.scrollTo(0, 0)
  await new Promise((r) => setTimeout(r, 300))
})
const cls = await pag2.evaluate(() => window.__cls)
console.log(`  CLS ${cls.toFixed(4)}`)
if (cls > 0.1) erro(`CLS acima de 0,1`)

await navegador.close()
console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.')
process.exit(falhas ? 1 : 0)
