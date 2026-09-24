/**
 * Lighthouse local, celular e desktop, contra o dist/ servido com gzip.
 *
 * É a mesma medida do PageSpeed Insights, só que sem a rede real no meio.
 * Serve pra pegar regressão; o número oficial sai no PageSpeed depois do deploy.
 *
 * Uso: node scripts/medir.mjs   (com o servidor rodando)
 */
import lighthouse from 'lighthouse'
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const ENDERECO = (process.env.BASE_URL || 'http://localhost:3075') + '/'

const navegador = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--remote-debugging-port=9222', '--no-sandbox'],
})
const porta = Number(new globalThis.URL(navegador.wsEndpoint()).port)

for (const aparelho of ['mobile', 'desktop']) {
  const r = await lighthouse(
    ENDERECO,
    { port: porta, output: 'json', logLevel: 'error' },
    {
      extends: 'lighthouse:default',
      settings: {
        formFactor: aparelho,
        screenEmulation:
          aparelho === 'desktop'
            ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }
            : undefined,
        throttling:
          aparelho === 'desktop'
            ? { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 }
            : undefined,
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    }
  )
  const c = r.lhr.categories
  const a = r.lhr.audits
  console.log(`\n== ${aparelho.toUpperCase()} ==`)
  console.log(
    `  performance ${Math.round(c.performance.score * 100)}   ` +
      `acessibilidade ${Math.round(c.accessibility.score * 100)}   ` +
      `boas práticas ${Math.round(c['best-practices'].score * 100)}   ` +
      `seo ${Math.round(c.seo.score * 100)}`
  )
  console.log(
    `  FCP ${a['first-contentful-paint'].displayValue}   LCP ${a['largest-contentful-paint'].displayValue}   ` +
      `TBT ${a['total-blocking-time'].displayValue}   CLS ${a['cumulative-layout-shift'].displayValue}   ` +
      `SI ${a['speed-index'].displayValue}`
  )
  const lcpEl = a['largest-contentful-paint-element']
  if (lcpEl && lcpEl.details && lcpEl.details.items && lcpEl.details.items[0]) {
    const no = lcpEl.details.items[0].items?.[0]?.node
    if (no) console.log(`  elemento do LCP: ${no.snippet?.slice(0, 90)}`)
  }
  for (const id of Object.keys(a)) {
    const au = a[id]
    if (au.score !== null && au.score < 0.9 && au.details?.overallSavingsMs > 60) {
      console.log(`  a melhorar: ${au.title} (${Math.round(au.details.overallSavingsMs)} ms)`)
    }
  }
  for (const cat of ['accessibility', 'seo', 'best-practices']) {
    for (const ref of c[cat].auditRefs) {
      const au = a[ref.id]
      if (au && au.score !== null && au.score < 1 && au.scoreDisplayMode === 'binary') {
        console.log(`  ${cat}: ${au.title}`)
      }
    }
  }
}

await navegador.close()
