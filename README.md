# 075 CBD — site institucional

Site da Confederação Brasileira de Desportos e Lazer. HTML, CSS e JS estático,
sem framework e sem dependência em tempo de execução.

Documentação do projeto (copy, prompt de mockup, memória do cliente) fica na
pasta com acento, `sites/075 - CDB VITOR/`. Aqui mora só o código.

## Rodar

```bash
npm install          # só na primeira vez
node build.mjs       # gera dist/
node scripts/serve.mjs   # http://localhost:3075
```

## Comandos

| Comando | O que faz |
|---|---|
| `node build.mjs` | monta `dist/index.html` com o CSS e o JS embutidos |
| `node scripts/serve.mjs` | serve `dist/` com gzip, como a Vercel |
| `node scripts/revisar.mjs` | print de página inteira, desktop 1440 e mobile 390 |
| `node scripts/revisar.mjs 1024` | print numa largura específica |
| `node scripts/testar.mjs` | console, overflow em 10 larguras, marcação e CLS |
| `node scripts/medir.mjs` | Lighthouse local, celular e desktop |
| `node scripts/processar-imagens.mjs` | regera as imagens a partir de `Recursos Site` |
| `node scripts/baixar-fontes.mjs` | rebaixa as fontes e reescreve `src/css/01-fontes.css` |

`revisar`, `testar` e `medir` precisam do servidor rodando.

## Como o build funciona

`src/index.html` é o esqueleto. Dentro dele:

- `<?p 00-header?>` puxa `src/partials/00-header.html`
- `{{chave}}` vem de `site.config.json`
- `{{wpp|mensagem}}` vira link de WhatsApp com a mensagem já escrita
- `<?se chave?>…<?/se?>` e `<?nao chave?>…<?/nao?>` ligam e desligam blocos
- `/*CSS*/` e `/*JS*/` recebem todo o CSS de `src/css/` e o JS de `src/js/`

O CSS e o JS entram **dentro do HTML** de propósito: o site inteiro cabe numa
resposta só, então não existe round-trip extra antes do primeiro pixel. São
14 KB com gzip.

Os arquivos de CSS são numerados porque o build concatena em ordem alfabética.

## Decisões que valem saber

**Fidelidade ao mockup.** A estrutura, a ordem das seções, as cores e a escala
tipográfica vieram do mockup desktop e mobile por medição de pixel, seção por
seção. Cada título de seção tem o seu tamanho, porque o mockup usa tamanhos
diferentes em cada uma.

**Copy.** O texto é o do `copy-site.md` do projeto. Onde o mockup só condensou a
mesma ideia, ficou a versão do mockup, que foi desenhada pro espaço.

**Seção de transparência (ADPF 854).** O Vitor pediu o selo no menu e uma seção
só pra isso. O texto descreve a regra da ADPF 854 (decisão do STF que derrubou o
orçamento secreto e passou a exigir rastreabilidade e publicidade ativa das emendas)
e afirma que a Confederação a segue. **Não há nenhum número, conta, convênio ou valor
ali** — esses só entram com o dado real vindo do Vitor. O selo é desenhado em CSS, não
é imagem: fica nítido em qualquer tela e acompanha a escala do texto.

**O oitavo item do menu.** Com "Transparência" o menu horizontal deixou de caber:
o botão passava da margem do container. O menu agora vira hambúrguer em 1200px (era
1080), o lettering do header foi de 280 para 240 px e o corpo do menu caiu um ponto.
Medido com o botão encostando exatamente na margem do container em toda largura.

**Fontes self-hosted.** Anton no display, Poppins no corpo, Caveat nos dois
letterings. 68 KB no total; a Caveat vem subsetada só com os caracteres das duas
frases que ela desenha, o que a derruba de 50 KB para 11 KB. Trocar o texto de um
lettering exige rodar `baixar-fontes.mjs` de novo, senão faltam glifos.

**Lettering do header.** O nome por extenso ao lado do brasão veio como JPG com
fundo marinho chapado. O `processar-imagens.mjs` recorta esse fundo devolvendo alfa
de verdade: projeta cada pixel sobre as três cores do lettering e usa o quanto ela
cobre como alfa, o que preserva o antialiasing sem a franja azul de um chroma key.
É necessário porque o header é transparente por cima da foto do hero. O lettering
some abaixo de 620px, onde não cabe ao lado do botão e do hambúrguer.

**Imagens.** AVIF com WebP de reserva, cada foto em várias larguras. Todo `img`
tem `width` e `height`, e é por isso que o CLS é zero.

**Hero.** A foto desbota pela esquerda por `mask-image`, não por gradiente
sobreposto: cortar a foto num `inset` deixava um degrau vertical visível. No
celular a foto vira fundo do hero inteiro, como no mockup.

**Print de revisão.** `revisar.mjs` estica a janela e tira print comum. O
`fullPage` do Chrome remonta o layout numa viewport alta e o hero perde a foto.

## O que ainda falta pra publicar

Em `site.config.json`, os campos vazios somem do HTML em vez de virar link morto.
O build lista o que está faltando a cada execução.

1. **WhatsApp.** Sem ele, todo botão "Fale conosco" cai no e-mail.
2. **Instagram, Facebook, YouTube, LinkedIn.** Sem nenhum, o rodapé mostra
   "Redes sociais em breve" no lugar dos ícones.
3. **CNPJ e endereço.**
4. **E-mail.** O `contato@cbd.org.br` que está lá veio do mockup e precisa ser
   confirmado.
5. **Domínio**, pro `canonical`, o `og:url`, o `robots.txt` e o `sitemap.xml`.
6. **Notícias.** Os três cards são exemplo escrito pelo ChatGPT no mockup, não
   notícia real. Ou entra conteúdo de verdade, ou `mostrarNoticias: false` tira a
   seção inteira do build.
7. **Política de Privacidade e Termos de Uso.** Os dois links do rodapé ainda
   apontam pra âncora do contato.

## Deploy

GitHub e Vercel, como nos outros projetos. O `vercel.json` serve `dist/` sem
instalar nada, então **rodar `node build.mjs` antes de cada push**, porque é o
`dist/` do repositório que vai pro ar.
