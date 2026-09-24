/**
 * Gera as imagens do site a partir de "../075 - CDB VITOR/Recursos Site".
 *
 * AVIF primeiro, WebP como reserva. Sem JPG: WebP passa de 97% de suporte e o
 * terceiro formato só engordaria o repositório.
 *
 * Cada foto sai em várias larguras pra alimentar o srcset, de modo que o
 * celular não baixe a versão de desktop. As larguras foram escolhidas a partir
 * do tamanho em que cada imagem aparece no layout, contando DPR 2.
 *
 * Grava assets/img/manifesto.json com largura e altura de cada arquivo, que é
 * de onde saem os width/height do HTML (sem eles o layout salta e o CLS sobe).
 *
 * Uso: node scripts/processar-imagens.mjs   (ou npm run imagens)
 */
import sharp from 'sharp'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'

const R = '../075 - CDB VITOR/Recursos Site/'
const OUT = 'assets/img/'
mkdirSync(OUT, { recursive: true })

const manifesto = {}

/** Gera avif + webp de uma fonte, em cada largura pedida. */
async function gerar(origem, base, larguras, { alt = false, extrair = null, qAvif = 52, qWebp = 80 } = {}) {
  if (!existsSync(R + origem)) throw new Error(`falta o arquivo: ${R + origem}`)
  for (const w of larguras) {
    let img = sharp(R + origem)
    if (extrair) img = img.extract(extrair)
    img = img.resize({ width: w, withoutEnlargement: true })

    for (const [ext, opts] of [
      ['avif', { quality: qAvif, effort: 6 }],
      ['webp', { quality: qWebp, alphaQuality: alt ? 100 : 80, effort: 5 }],
    ]) {
      const arq = `${base}-${w}.${ext}`
      const buf = await img.clone()[ext](opts).toBuffer()
      writeFileSync(OUT + arq, buf)
      const m = await sharp(buf).metadata()
      manifesto[arq] = { w: m.width, h: m.height, kb: +(buf.length / 1024).toFixed(1) }
    }
  }
  const p = manifesto[`${base}-${larguras[0]}.webp`]
  console.log(
    `${base.padEnd(22)} ${p.w}x${p.h}  ${larguras.length} larguras  ` +
      larguras
        .map((w) => `${w}:${manifesto[`${base}-${w}.avif`].kb}/${manifesto[`${base}-${w}.webp`].kb}kb`)
        .join('  ')
  )
}

/**
 * Recorta um lettering do fundo sólido em que ele veio, devolvendo alfa de
 * verdade. O header é transparente por cima da foto do hero, então imagem com
 * fundo chapado apareceria como um retângulo azul.
 *
 * Cada pixel é a mistura do fundo com uma das cores do lettering. Projetando
 * a diferença (pixel - fundo) sobre cada cor candidata e ficando com a de
 * menor resíduo, sai a cor certa e o quanto ela cobre — que vira o alfa. Isso
 * preserva o antialiasing sem deixar a franja azul que um chroma key deixaria.
 */
async function recortarFundo(origem, { fundo, cores, caixa }) {
  const { data, info } = await sharp(R + origem).raw().toBuffer({ resolveWithObject: true })
  const out = Buffer.alloc(info.width * info.height * 4)
  const dirs = cores.map((F) => {
    const d = F.map((c, i) => c - fundo[i])
    return { F, d, n: d.reduce((s, v) => s + v * v, 0) }
  })

  for (let p = 0; p < info.width * info.height; p++) {
    const i = p * info.channels
    const d = [data[i] - fundo[0], data[i + 1] - fundo[1], data[i + 2] - fundo[2]]
    let melhor = null
    for (const c of dirs) {
      const t = Math.min(Math.max((d[0] * c.d[0] + d[1] * c.d[1] + d[2] * c.d[2]) / c.n, 0), 1)
      const res = Math.hypot(d[0] - t * c.d[0], d[1] - t * c.d[1], d[2] - t * c.d[2])
      if (!melhor || res < melhor.res) melhor = { res, t, F: c.F }
    }
    // Abaixo de 0.08 é o ringing do JPEG no fundo; acima de 0.92, miolo do glifo.
    const a = melhor.t < 0.08 ? 0 : melhor.t > 0.92 ? 1 : melhor.t
    const o = p * 4
    out[o] = melhor.F[0]
    out[o + 1] = melhor.F[1]
    out[o + 2] = melhor.F[2]
    out[o + 3] = Math.round(a * 255)
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).extract(caixa)
}

/** Mesmo srcset de gerar(), mas a partir de um sharp já pronto. */
async function gerarDe(img, base, larguras) {
  for (const w of larguras) {
    const r = img.clone().resize({ width: w, withoutEnlargement: true })
    for (const [ext, opts] of [
      ['avif', { quality: 72, effort: 6 }],
      ['webp', { quality: 92, alphaQuality: 100, effort: 5 }],
    ]) {
      const arq = `${base}-${w}.${ext}`
      const buf = await r.clone()[ext](opts).toBuffer()
      writeFileSync(OUT + arq, buf)
      const m = await sharp(buf).metadata()
      manifesto[arq] = { w: m.width, h: m.height, kb: +(buf.length / 1024).toFixed(1) }
    }
  }
  const p = manifesto[`${base}-${larguras[0]}.webp`]
  console.log(
    `${base.padEnd(22)} ${p.w}x${p.h}  ${larguras.length} larguras  ` +
      larguras.map((w) => `${w}:${manifesto[`${base}-${w}.avif`].kb}/${manifesto[`${base}-${w}.webp`].kb}kb`).join('  ')
  )
}

// ---------------------------------------------------------------------- hero
// Desktop: a foto ocupa pouco mais da metade da largura da tela.
await gerar('DESKTOP/IMAGEM HERO DESKTOP.png', 'hero-desktop', [1672, 1280, 960], { qAvif: 55 })
// Mobile: a foto é o fundo do hero inteiro, retrato.
await gerar('MOBILE/IMAGEM HERO MOBILE.png', 'hero-mobile', [900, 760, 640, 540], { qAvif: 55 })

// --------------------------------------------------------------- quem somos
await gerar('03 - MAIS QUE ESPORTE.png', 'quem-somos-1', [860, 640, 430])
// A segunda foto do bloco é o recorte do menino de costas ("mais pessoas mais
// futuros"), tirado da mesma imagem que ilustra a terceira notícia.
await gerar('05C - ACOMPANHE NOSSAS ATIVIDADES.png', 'quem-somos-2', [380], {
  extrair: { left: 22, top: 196, width: 330, height: 275 },
})

// ------------------------------------------------------------------ frentes
await gerar('04A - DIFERENTES CAMINHOS.png', 'frente-esporte', [760, 560, 380])
await gerar('04B - DIFERENTES CAMINHOS.png', 'frente-cultura', [760, 560, 380])
await gerar('04C - DIFERENTES CAMINHOS.png', 'frente-lazer', [760, 560, 380])

// ----------------------------------------------------------------- notícias
await gerar('05A - ACOMPANHE NOSSAS ATIVIDADES.png', 'noticia-1', [760, 560, 380])
await gerar('05B - ACOMPANHE NOSSAS ATIVIDADES.png', 'noticia-2', [455, 380])
// A 05C veio recortada de um print e trouxe uma tira da imagem vizinha na
// borda esquerda. O extract corta essa tira antes de gerar as versões.
await gerar('05C - ACOMPANHE NOSSAS ATIVIDADES.png', 'noticia-3', [446, 380], {
  extrair: { left: 16, top: 0, width: 446, height: 471 },
})

// ---------------------------------------------------------------------- cta
await gerar('06 - VAMOS CONSTRUIR UM BRASIL.png', 'cta-rio', [1920, 1400, 980], { qAvif: 48 })

// --------------------------------------------------------------------- logo
await gerar('02 - LOGO PNG.png', 'logo', [320, 200], { alt: true, qAvif: 70, qWebp: 90 })

// ---------------------------------------------------------------- lettering
// O nome por extenso que fica ao lado do brasão no header. Veio como JPG com
// fundo marinho chapado; sai daqui com fundo transparente.
await gerarDe(
  await recortarFundo('01B - CONFEDERAÇÃO BRASILEIRA DESPORTE E LAZER.jpg', {
    fundo: [1, 25, 59],
    cores: [
      [255, 255, 255], // CONFEDERAÇÃO BRASILEIRA
      [17, 177, 79], //   DE DESPORTOS e a barra da esquerda
      [255, 208, 9], //   & LAZER e a barra da direita
    ],
    // caixa medida no arquivo: tira a margem morta em volta do lettering
    caixa: { left: 85, top: 129, width: 1433, height: 231 },
  }),
  'lettering',
  [560, 320]
)

// O favicon e o ícone de PWA precisam ser png quadrado com fundo.
for (const s of [32, 180, 512]) {
  const buf = await sharp(R + '02 - LOGO PNG.png')
    .resize({ width: Math.round(s * 0.86), height: Math.round(s * 0.86), fit: 'contain', background: '#011537' })
    .extend({
      top: Math.round(s * 0.07),
      bottom: Math.round(s * 0.07),
      left: Math.round(s * 0.07),
      right: Math.round(s * 0.07),
      background: '#011537',
    })
    .png({ compressionLevel: 9 })
    .toBuffer()
  writeFileSync(`${OUT}icone-${s}.png`, buf)
}
console.log('icone-32 / 180 / 512 gerados')

writeFileSync(OUT + 'manifesto.json', JSON.stringify(manifesto, null, 1), 'utf8')

const total = Object.values(manifesto).reduce((s, m) => s + m.kb, 0)
console.log(`\n${Object.keys(manifesto).length} arquivos, ${(total / 1024).toFixed(2)} MB no total.`)
console.log('Tamanhos em assets/img/manifesto.json (use no width/height do HTML).')
