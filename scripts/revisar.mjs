/**
 * Print de página inteira sem usar o fullPage do Chrome.
 *
 * O fullPage remonta o layout numa viewport alta e quebra posicionamento
 * absoluto dentro de seção com altura em vh: o hero deste site perde a foto.
 * Aqui a janela é esticada até a altura da página e o print é comum.
 *
 * Uso:
 *   node scripts/revisar.mjs                 desktop 1440 e mobile 390
 *   node scripts/revisar.mjs 1440            só uma largura
 */
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.BASE_URL || 'http://localhost:3075'
const larguras = process.argv[2] ? [Number(process.argv[2])] : [1440, 390]

mkdirSync('revisao', { recursive: true })

const navegador = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--hide-scrollbars', '--force-device-scale-factor=1'],
})

for (const largura of larguras) {
  const movel = largura < 700
  const pag = await navegador.newPage()
  await pag.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await pag.setViewport({ width: largura, height: 900, deviceScaleFactor: movel ? 2 : 1, isMobile: movel })
  await pag.goto(BASE + '/', { waitUntil: 'networkidle0' })

  const alt = await pag.evaluate(() => document.documentElement.scrollHeight)
  await pag.setViewport({ width: largura, height: alt, deviceScaleFactor: movel ? 2 : 1, isMobile: movel })
  await pag.evaluate(() => window.scrollTo(0, 0))
  await new Promise((r) => setTimeout(r, 450))

  const saida = `revisao/${movel ? 'mobile' : 'desktop'}-${largura}.png`
  await pag.screenshot({ path: saida })
  console.log(`${saida}  ${largura}x${alt}`)
  await pag.close()
}

await navegador.close()
