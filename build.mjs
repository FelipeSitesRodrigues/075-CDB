/**
 * Build do site da CBD.
 *
 * Monta dist/index.html a partir de src/, com CSS e JS embutidos no HTML.
 * Embutir é de propósito: o site inteiro cabe numa resposta só, então não há
 * round-trip extra pra CSS nem pra JS e o first paint não fica bloqueado.
 *
 * - src/index.html é o shell. <?p nome?> puxa src/partials/nome.html.
 * - {{chave}} vem de site.config.json. Chave vazia apaga o bloco marcado com
 *   <?se chave?> ... <?/se?>, pra não sobrar link morto no ar.
 * - assets/ é copiado inteiro pra dist/assets/.
 *
 * Uso: node build.mjs   (ou npm run build)
 */
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const cfg = JSON.parse(readFileSync('site.config.json', 'utf8'))
const ler = (p) => readFileSync(p, 'utf8')

// ---------------------------------------------------------------- css e js
const ordemCss = readdirSync('src/css').filter((f) => f.endsWith('.css')).sort()
const css = ordemCss.map((f) => ler(join('src/css', f))).join('\n')

// Minificação conservadora: tira comentário e espaço redundante, mantém tudo
// que o navegador precisa. Nada de reescrever seletor nem de reordenar regra.
const minCss = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/\s*([{};:,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .replace(/\n/g, '')
    .trim()

const minJs = (s) =>
  s
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()

const js = ler('src/js/app.js')

// ---------------------------------------------------------------- montagem
let html = ler('src/index.html')

// partials, com uma volta a mais caso um partial inclua outro
for (let i = 0; i < 3; i++) {
  html = html.replace(/<\?p ([\w-]+)\?>/g, (_, nome) => ler(`src/partials/${nome}.html`))
}

// chaves derivadas, pra não repetir a mesma condição em vários partials
cfg.temRedes = !!(cfg.instagram || cfg.facebook || cfg.youtube || cfg.linkedin)

// blocos condicionais: <?se chave?>...<?/se?> e o inverso, <?nao chave?>...<?/nao?>
html = html.replace(/<\?se ([\w]+)\?>([\s\S]*?)<\?\/se\?>/g, (_, chave, dentro) =>
  cfg[chave] ? dentro : ''
)
html = html.replace(/<\?nao ([\w]+)\?>([\s\S]*?)<\?\/nao\?>/g, (_, chave, dentro) =>
  cfg[chave] ? '' : dentro
)

// Link de WhatsApp com a mensagem daquele bloco já escrita: {{wpp|mensagem}}.
// É a regra da casa, um botão por serviço, com o assunto preenchido. Sem número
// cadastrado, cai no e-mail com o mesmo assunto, pra nunca virar link morto.
const linkWpp = (msg) =>
  cfg.whatsapp
    ? `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(msg)}`
    : `mailto:${cfg.email}?subject=${encodeURIComponent('Contato pelo site da CBD')}&body=${encodeURIComponent(msg)}`

html = html.replace(/\{\{wpp\|([^}]+)\}\}/g, (_, msg) => linkWpp(msg.trim()))

// variáveis simples
html = html.replace(/\{\{([\w]+)\}\}/g, (_, chave) => {
  if (chave === 'ano') return String(new Date().getFullYear())
  if (chave === 'whatsappLink') return linkWpp(cfg.whatsappMensagem || '')
  return cfg[chave] ?? ''
})

html = html.replace('/*CSS*/', minCss(css)).replace('/*JS*/', minJs(js))

// ---------------------------------------------------------------- escrita
if (existsSync('dist')) rmSync('dist', { recursive: true })
mkdirSync('dist', { recursive: true })
writeFileSync('dist/index.html', html, 'utf8')
if (existsSync('assets')) cpSync('assets', 'dist/assets', { recursive: true })
for (const f of ['robots.txt', 'sitemap.xml']) {
  if (existsSync(`src/${f}`)) cpSync(`src/${f}`, `dist/${f}`)
}

// ---------------------------------------------------------------- relatório
const kb = (s) => (Buffer.byteLength(s, 'utf8') / 1024).toFixed(1) + ' KB'
console.log(`dist/index.html  ${kb(html)}   (css ${kb(minCss(css))} + js ${kb(minJs(js))} embutidos)`)

const faltando = ['whatsapp', 'instagram', 'facebook', 'youtube', 'linkedin', 'endereco', 'cnpj'].filter(
  (k) => !cfg[k]
)
if (faltando.length) {
  console.log(`\nAinda sem valor em site.config.json: ${faltando.join(', ')}`)
  console.log('Esses blocos saíram do HTML em vez de virar link morto.')
  if (!cfg.whatsapp) console.log('Sem whatsapp, os botões "Fale conosco" caem no e-mail.')
}
