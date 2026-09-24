/* Tudo que o site precisa de JS cabe aqui: entrada ao rolar, estado do header,
   menu do celular e item ativo do menu. Sem biblioteca. */
(function () {
  'use strict'

  var doc = document

  // --------------------------------------------------- entrada ao aparecer
  // O estado final é o normal no CSS, então se isto não rodar o conteúdo
  // continua visível. Cada elemento é observado uma vez só.
  var alvos = doc.querySelectorAll('.reveal')
  if ('IntersectionObserver' in window && alvos.length) {
    var obs = new IntersectionObserver(
      function (linhas) {
        for (var i = 0; i < linhas.length; i++) {
          if (linhas[i].isIntersecting) {
            linhas[i].target.classList.add('visivel')
            obs.unobserve(linhas[i].target)
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.06 }
    )
    for (var i = 0; i < alvos.length; i++) obs.observe(alvos[i])
  } else {
    for (var j = 0; j < alvos.length; j++) alvos[j].classList.add('visivel')
  }

  // ------------------------------------------------------ header ao rolar
  var topo = doc.getElementById('topo')
  var rolando = false

  function marcaRolagem() {
    topo.classList.toggle('rolou', window.scrollY > 24)
    rolando = false
  }

  window.addEventListener(
    'scroll',
    function () {
      if (!rolando) {
        rolando = true
        window.requestAnimationFrame(marcaRolagem)
      }
    },
    { passive: true }
  )
  marcaRolagem()

  // ------------------------------------------------------- menu do celular
  var hamb = doc.querySelector('.topo__hamb')
  var menu = doc.getElementById('menu-mobile')

  function fechaMenu() {
    menu.hidden = true
    hamb.setAttribute('aria-expanded', 'false')
    hamb.setAttribute('aria-label', 'Abrir menu')
    doc.body.style.overflow = ''
    marcaRolagem()
  }

  if (hamb && menu) {
    hamb.addEventListener('click', function () {
      var aberto = hamb.getAttribute('aria-expanded') === 'true'
      if (aberto) return fechaMenu()
      menu.hidden = false
      hamb.setAttribute('aria-expanded', 'true')
      hamb.setAttribute('aria-label', 'Fechar menu')
      doc.body.style.overflow = 'hidden'
      // com o menu aberto o header não pode continuar transparente sobre o hero
      topo.classList.add('rolou')
    })

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) fechaMenu()
    })

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) {
        fechaMenu()
        hamb.focus()
      }
    })

    // Voltar pro desktop com o menu aberto deixaria o body travado.
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1080 && !menu.hidden) fechaMenu()
    })
  }

  // ------------------------------------------------------ item ativo do menu
  var links = doc.querySelectorAll('.topo__nav a[href^="#"]')
  var secoes = []
  for (var k = 0; k < links.length; k++) {
    var alvo = doc.getElementById(links[k].getAttribute('href').slice(1))
    if (alvo) secoes.push({ link: links[k], el: alvo })
  }

  if ('IntersectionObserver' in window && secoes.length) {
    var visiveis = {}
    var obsSec = new IntersectionObserver(
      function (linhas) {
        for (var i = 0; i < linhas.length; i++) {
          visiveis[linhas[i].target.id] = linhas[i].isIntersecting
        }
        var atual = null
        for (var s = 0; s < secoes.length; s++) {
          if (visiveis[secoes[s].el.id]) atual = secoes[s].link
        }
        // No topo da página o ativo é sempre o primeiro, mesmo que a página
        // inteira caiba na viewport e várias seções cruzem a faixa ao mesmo tempo.
        if (window.scrollY < 120) atual = links[0]
        for (var l = 0; l < links.length; l++) links[l].classList.remove('ativo')
        if (atual) atual.classList.add('ativo')
      },
      // a faixa fica logo abaixo do header: a seção "ativa" é a que está ali
      { rootMargin: '-45% 0px -50% 0px' }
    )
    for (var m = 0; m < secoes.length; m++) obsSec.observe(secoes[m].el)
  }
})()
