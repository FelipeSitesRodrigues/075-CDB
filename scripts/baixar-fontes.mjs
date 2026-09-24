/**
 * Baixa as fontes do Google e grava em assets/fonts, junto com o @font-face
 * em src/css/01-fontes.css.
 *
 * Self-hosted por performance: fonts.googleapis.com custa DNS, TLS e dois
 * round-trips antes de o texto aparecer, e nenhum deles é cacheado entre sites
 * desde que os navegadores particionaram o cache.
 *
 * Só o subset latin. Português cabe inteiro em U+0000-00FF.
 *
 * Uso: node scripts/baixar-fontes.mjs   (ou npm run fontes)
 */
import { writeFileSync, mkdirSync } from 'node:fs'

const FAMILIAS = [
  { css: 'Anton', nome: 'Anton', pesos: [[400, 'normal']] },
  {
    css: 'Poppins',
    nome: 'Poppins',
    pesos: [
      [400, 'normal'],
      [500, 'normal'],
      [600, 'normal'],
      [700, 'normal'],
    ],
  },
  // A Caveat só desenha dois letterings. Pedindo o subset por texto, ela cai de
  // ~50 KB para uns 3 KB, que é o que um enfeite pode custar acima da dobra.
  {
    css: 'Caveat',
    nome: 'Caveat',
    pesos: [[700, 'normal']],
    texto: 'Mais Esporte Futuros Juntos por um Brasil mais inclusivo',
  },
]

// User-agent moderno: sem ele o Google devolve ttf em vez de woff2.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'

mkdirSync('assets/fonts', { recursive: true })
const regras = []

for (const fam of FAMILIAS) {
  for (const [peso, estilo] of fam.pesos) {
    const url =
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam.css)}:wght@${peso}` +
      (fam.texto ? `&text=${encodeURIComponent(fam.texto)}` : '&display=swap')
    const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text()

    // Com &text= volta um bloco só e sem unicode-range. Sem ele, volta um bloco
    // por subset e o latin é o que cobre U+0000-00FF.
    const blocos = css.split('@font-face').filter((b) => b.includes('src:'))
    const bloco = fam.texto ? blocos[0] : blocos.find((b) => b.includes('U+0000-00FF'))
    if (!bloco) throw new Error(`sem subset utilizável em ${fam.nome} ${peso}`)

    // Com &text= a url não termina em .woff2, vem como /l/font?kit=...
    const src = bloco.match(/url\((https:[^)]+)\)/)[1]
    const range = (bloco.match(/unicode-range:\s*([^;]+);/) || [, 'U+0000-00FF'])[1].trim()

    const arq = `${fam.nome.toLowerCase()}-${peso}.woff2`
    const bin = Buffer.from(await (await fetch(src)).arrayBuffer())
    writeFileSync(`assets/fonts/${arq}`, bin)
    console.log(`${arq}  ${(bin.length / 1024).toFixed(1)} KB`)

    regras.push(`@font-face {
  font-family: '${fam.nome}';
  font-style: ${estilo};
  font-weight: ${peso};
  font-display: swap;
  src: url('/assets/fonts/${arq}') format('woff2');
  unicode-range: ${range};
}`)
  }
}

writeFileSync(
  'src/css/01-fontes.css',
  `/* Gerado por scripts/baixar-fontes.mjs. Não editar à mão. */\n${regras.join('\n')}\n`,
  'utf8'
)
console.log('\nsrc/css/01-fontes.css atualizado.')
