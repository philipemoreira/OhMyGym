/* =====================================================================
   OH MY GYM — SCRIPT PRINCIPAL
   Por enquanto, esse arquivo cuida só do menu mobile (abrir/fechar o
   painel de navegação no celular). Conforme os próximos blocos forem
   entrando (Instagram, etc.), novas funções vão ser adicionadas aqui,
   sempre comentadas explicando o que fazem.
   ===================================================================== */

/* Espera o HTML inteiro carregar antes de rodar o script, pra garantir
   que os elementos abaixo (menu, botão) já existem na página. */
document.addEventListener("DOMContentLoaded", function () {

  /* -------------------------------------------------------------------
     MENU MOBILE (abrir/fechar)
     - "navToggle" é o botão "hambúrguer" que aparece só em telas pequenas.
     - "navMenu" é o painel com os links que desliza pra dentro da tela.
     ------------------------------------------------------------------- */
  const navToggle = document.getElementById("nav-toggle");
  const navMenu = document.getElementById("nav-menu");

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", function () {
      // Verifica se o menu já está aberto (usando o atributo aria-expanded,
      // que também ajuda leitores de tela a entenderem o estado do botão)
      const estaAberto = navToggle.getAttribute("aria-expanded") === "true";

      // Inverte o estado: se estava aberto, fecha; se estava fechado, abre
      navToggle.setAttribute("aria-expanded", String(!estaAberto));
      navMenu.classList.toggle("is-open");
    });

    // Fecha o menu automaticamente quando a visitante clica em algum link
    // (evita o menu ficar aberto "por cima" da seção pra onde ela navegou)
    const linksDoMenu = navMenu.querySelectorAll("a");
    linksDoMenu.forEach(function (link) {
      link.addEventListener("click", function () {
        navToggle.setAttribute("aria-expanded", "false");
        navMenu.classList.remove("is-open");
      });
    });
  }

  /* -------------------------------------------------------------------
     LOGO DO CABEÇALHO — voltar ao topo sem recarregar a página
     - A logo tem href="#topo" no HTML (funciona mesmo sem JavaScript),
       mas aqui a gente intercepta o clique e faz uma rolagem suave até
       o topo via JavaScript em vez de deixar o navegador "pular" pra
       âncora — fica mais bonito e garante que nunca recarrega a página.
     - Diferente disso, o link "Início" do menu (⁠<a href="index.html">)
       continua recarregando a página normalmente — foi um pedido
       específico do Philipe, pra logo e "Início" se comportarem diferente.
     ------------------------------------------------------------------- */
  const logoTopo = document.getElementById("logo-topo");

  if (logoTopo) {
    logoTopo.addEventListener("click", function (evento) {
      evento.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* -------------------------------------------------------------------
     INDICADOR DE "SEÇÃO ATUAL" NO MENU
     - Enquanto a visitante rola a página, o link do menu que representa
       a seção visível no momento ganha um sublinhado (classe "is-atual",
       ver style.css) — ex: rolando e chegando em "Modalidades", o
       sublinhado sai de "Diferenciais" e aparece em "Modalidades".
     - Pra cada link do menu, descobrimos qual seção ele representa: ou
       pelo próprio href (ex: "#modalidades" → seção com id="modalidades"),
       ou, pro link "Início" (que aponta pro arquivo, não pra âncora),
       pelo atributo "data-secao-alvo" no HTML.
     - Usamos "IntersectionObserver" (API do navegador que avisa quando
       um elemento entra/sai de uma área da tela) em vez de calcular
       manualmente a posição de rolagem — é mais leve e mais preciso.
       A "área" observada é uma faixa fina perto do meio da tela
       (rootMargin abaixo): a seção "atual" é a que está cruzando essa
       faixa no momento.
     - Como as seções de blocos futuros (Planos, Estrutura, Depoimentos,
       Contato) ainda não existem no HTML, elas são ignoradas por
       enquanto — assim que forem criadas (com os mesmos ids já usados
       nos links do menu), o indicador passa a funcionar nelas também,
       sem precisar mexer nesse script de novo.
     ------------------------------------------------------------------- */
  const linksDoMenuPrincipal = document.querySelectorAll(".nav-menu__list a");
  const secoesObservadas = [];

  linksDoMenuPrincipal.forEach(function (link) {
    const href = link.getAttribute("href") || "";
    const idAlvo = link.dataset.secaoAlvo || (href.startsWith("#") ? href.slice(1) : null);
    const secao = idAlvo ? document.getElementById(idAlvo) : null;

    // Só observa se a seção já existir na página (ver nota acima)
    if (secao) {
      secoesObservadas.push({ link: link, secao: secao });
    }
  });

  if (secoesObservadas.length && "IntersectionObserver" in window) {
    const observador = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada) {
          if (!entrada.isIntersecting) return;

          // Achou a seção que está cruzando a faixa observada agora:
          // marca o link correspondente como "atual" e desmarca os outros
          const item = secoesObservadas.find(function (s) {
            return s.secao === entrada.target;
          });
          if (!item) return;

          secoesObservadas.forEach(function (s) {
            s.link.classList.remove("is-atual");
          });
          item.link.classList.add("is-atual");
        });
      },
      {
        // Faixa fina perto do meio vertical da tela (não a tela toda),
        // pra trocar de seção "atual" de forma mais natural, parecida
        // com o que a visitante realmente está lendo no momento
        rootMargin: "-45% 0px -50% 0px",
        threshold: 0,
      }
    );

    secoesObservadas.forEach(function (item) {
      observador.observe(item.secao);
    });
  }

  /* -------------------------------------------------------------------
     FILTRO DA GRADE DE HORÁRIOS (seção Modalidades)
     - Cada botão em ".filtro-modalidades" tem um atributo "data-filtro"
       (ex: "jump", "pilates-solo").
     - Cada aula na grade (cada <li>) tem o mesmo atributo, indicando de
       qual modalidade ela é.
     - Ao clicar num botão, escondemos (via [hidden]) toda aula cujo
       "data-filtro" não bate com o escolhido, e escondemos o card do
       dia inteiro se nenhuma aula dele sobrar visível. O botão "Todos"
       (data-filtro="todos") volta a mostrar tudo.
     ------------------------------------------------------------------- */
  const botoesFiltro = document.querySelectorAll(".filtro-modalidades__btn");
  const grade = document.querySelector(".grade-horarios");
  const mensagemVazia = document.getElementById("grade-vazio");

  if (botoesFiltro.length && grade) {
    botoesFiltro.forEach(function (botao) {
      botao.addEventListener("click", function () {
        const filtroEscolhido = botao.dataset.filtro;

        // Marca visualmente qual botão está ativo no momento
        botoesFiltro.forEach(function (b) {
          b.classList.remove("is-ativo");
        });
        botao.classList.add("is-ativo");

        // Aplica um "fade" rápido antes de trocar o conteúdo, só pra
        // suavizar a troca visual (a classe é removida logo em seguida)
        grade.classList.add("is-filtrando");

        window.setTimeout(function () {
          let existeAlgumaAulaVisivel = false;

          // Passa por cada dia da semana...
          const dias = grade.querySelectorAll(".grade-horarios__dia");
          dias.forEach(function (dia) {
            let diaTemAulaVisivel = false;

            // ...e por cada aula dentro do dia, decidindo se ela
            // deve aparecer ou não com o filtro escolhido
            const aulas = dia.querySelectorAll("li[data-filtro]");
            aulas.forEach(function (aula) {
              const combina =
                filtroEscolhido === "todos" ||
                aula.dataset.filtro === filtroEscolhido;

              aula.hidden = !combina;
              if (combina) {
                diaTemAulaVisivel = true;
                existeAlgumaAulaVisivel = true;
              }
            });

            // Se nenhuma aula desse dia sobrou visível, esconde o card
            // do dia inteiro (evita mostrar um card vazio)
            dia.hidden = !diaTemAulaVisivel;
          });

          // Se o filtro escolhido não bateu com nenhuma aula da grade
          // inteira (ex: modalidade ainda sem horário fixo cadastrado),
          // mostra a mensagem explicando isso em vez de deixar em branco
          if (mensagemVazia) {
            mensagemVazia.hidden = existeAlgumaAulaVisivel;
          }

          grade.classList.remove("is-filtrando");
        }, 150);
      });
    });
  }

  /* -------------------------------------------------------------------
     CABEÇALHO "ENCOLHENDO" AO ROLAR A PÁGINA
     - Quando a visitante rola a página pra baixo (passa de 40px),
       adiciona a classe "is-encolhido" no cabeçalho — o CSS cuida da
       animação (reduz o espaçamento e o tamanho da logo, ver style.css,
       seção 4). Ao voltar pro topo, a classe é removida e ele volta ao
       tamanho normal.
     - Também atualiza a variável --altura-cabecalho (usada pelo menu
       mobile pra saber onde começar) sempre que a altura do cabeçalho
       muda — no carregamento da página, ao redimensionar a janela e
       toda vez que ele encolhe/volta ao normal.
     ------------------------------------------------------------------- */
  const cabecalho = document.querySelector(".site-header");

  if (cabecalho) {
    // Limite de rolagem (em pixels) a partir do qual o cabeçalho encolhe.
    // Um valor pequeno assim faz o efeito acontecer logo no início da
    // rolagem, sem precisar descer muito a página.
    const LIMITE_SCROLL = 40;

    // Atualiza a variável CSS com a altura real do cabeçalho no momento
    function atualizarAlturaCabecalho() {
      document.documentElement.style.setProperty(
        "--altura-cabecalho",
        cabecalho.offsetHeight + "px"
      );
    }

    // Liga/desliga o estado "encolhido" de acordo com a posição do scroll
    function verificarScroll() {
      const roladoPraBaixo = window.scrollY > LIMITE_SCROLL;
      const estavaEncolhido = cabecalho.classList.contains("is-encolhido");

      if (roladoPraBaixo !== estavaEncolhido) {
        cabecalho.classList.toggle("is-encolhido", roladoPraBaixo);
        // Espera a transição do CSS terminar (0.25s) antes de recalcular
        // a altura, senão pega o tamanho "no meio" da animação
        window.setTimeout(atualizarAlturaCabecalho, 260);
      }
    }

    // Roda uma vez já no carregamento (caso a página abra com scroll
    // salvo, ex: ao voltar de outra página) e sempre que a janela mudar
    // de tamanho (a altura do cabeçalho pode mudar entre mobile/desktop)
    atualizarAlturaCabecalho();
    verificarScroll();
    window.addEventListener("scroll", verificarScroll);
    window.addEventListener("resize", atualizarAlturaCabecalho);
  }

  /* -------------------------------------------------------------------
     "REVELAR AO ROLAR" — elementos aparecem suavemente conforme a
     visitante vai descendo a página (pedido do Philipe, 03/09/2026:
     "conforme for descendo as coisas vão aparecendo").
     - Elemento pedido é experimental ("só pra ver como fica") — por
       isso ficou tudo concentrado aqui embaixo, fácil de remover: se
       ele não gostar, é só apagar esse bloco inteiro (e a classe
       ".reveal" / ".reveal.is-visivel" no style.css, seção 9) que o
       site volta a mostrar tudo direto, sem animação.
     - Como funciona: cabeçalhos de seção, cards de diferenciais, o
       card de "modalidade em destaque" e os cards de horário por dia
       começam com a classe ".reveal" (opacidade 0 + levemente descidos,
       ver CSS) e ganham ".reveal--visivel" (opacidade 1, posição
       normal, com transição suave) assim que entram na tela — usando
       "IntersectionObserver", mesma API já usada no indicador de seção
       do menu, mais leve que ficar calculando scroll manualmente.
     - Cada elemento revela só 1 vez (para de observar depois) — não
       fica sumindo/reaparecendo toda vez que a visitante rola pra cima
       e pra baixo, o que ficaria cansativo.
     - Respeita "prefers-reduced-motion": quem tem essa preferência
       ligada no sistema (por enjoo/desconforto com animação) já vê
       tudo aparecendo direto, sem o efeito — tratado aqui e também via
       CSS (seção 9).
     ------------------------------------------------------------------- */
  const prefereMenosMovimento = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // OBS (04/09/2026): ".plano-card" não entra aqui de propósito — os cards
  // de plano agora moram dentro de um carrossel horizontal no celular
  // (".planos__grid"), e cards fora da parte visível do carrossel ficam
  // com a posição real fora da largura da tela (mesmo estando na mesma
  // altura vertical). Como o IntersectionObserver olha a interseção com a
  // TELA TODA (não só o eixo vertical), um card "escondido" pro lado nunca
  // era considerado visível — só aparecia depois de arrastar/clicar a seta
  // até ele. Corrigido observando o carrossel inteiro (".planos__grid") em
  // vez de cada card: aí todos os planos aparecem juntos ao descer a
  // página, independente de já ter navegado o carrossel ou não.
  const elementosParaRevelar = document.querySelectorAll(
    ".section-heading, .card-diferencial, .card-modalidade-destaque, " +
    ".grade-horarios__dia, .planos__grid"
  );

  if (
    elementosParaRevelar.length &&
    "IntersectionObserver" in window &&
    !prefereMenosMovimento
  ) {
    elementosParaRevelar.forEach(function (elemento) {
      elemento.classList.add("reveal");
    });

    const observadorRevelar = new IntersectionObserver(
      function (entradas, observador) {
        entradas.forEach(function (entrada) {
          if (!entrada.isIntersecting) return;

          entrada.target.classList.add("reveal--visivel");
          // Já apareceu uma vez — não precisa continuar observando
          observador.unobserve(entrada.target);
        });
      },
      {
        // Começa a revelar um pouco antes do elemento entrar 100% na
        // tela (threshold baixo + rootMargin negativo embaixo), pra
        // não parecer atrasado em relação ao gesto de rolar
        threshold: 0.15,
        rootMargin: "0px 0px -60px 0px",
      }
    );

    elementosParaRevelar.forEach(function (elemento) {
      observadorRevelar.observe(elemento);
    });
  }

  // ===========================================================================
  // CARROSSEL DOS PLANOS (só existe visualmente no celular — ver CSS)
  // Liga cada grade de planos (".planos__grid[data-carrossel]") aos seus
  // controles (".planos__controles[data-carrossel]") pelo mesmo nome
  // ("musculacao" ou "aulas"): clicar na seta rola pro card vizinho, clicar
  // numa bolinha vai direto pro card daquela posição, e rolar com o dedo
  // atualiza sozinho qual bolinha fica acesa.
  // ===========================================================================
  const gradesDeCarrossel = document.querySelectorAll(".planos__grid[data-carrossel]");

  gradesDeCarrossel.forEach(function (grade) {
    const nome = grade.dataset.carrossel;
    const controles = document.querySelector('.planos__controles[data-carrossel="' + nome + '"]');
    if (!controles) return;

    const botaoAnterior = controles.querySelector(".planos__seta--prev");
    const botaoProximo = controles.querySelector(".planos__seta--next");
    const bolinhas = Array.from(controles.querySelectorAll(".planos__ponto"));
    const cards = Array.from(grade.children);

    // Descobre qual card está mais perto do centro visível do carrossel
    // agora — é o que a gente considera "o card atual"
    function indiceAtual() {
      const centroVisivel = grade.scrollLeft + grade.clientWidth / 2;
      let indiceMaisPerto = 0;
      let menorDistancia = Infinity;

      cards.forEach(function (card, indice) {
        const centroCard = card.offsetLeft + card.offsetWidth / 2;
        const distancia = Math.abs(centroCard - centroVisivel);
        if (distancia < menorDistancia) {
          menorDistancia = distancia;
          indiceMaisPerto = indice;
        }
      });

      return indiceMaisPerto;
    }

    // Rola suavemente até o card do índice pedido
    function irParaCard(indice) {
      const alvo = cards[indice];
      if (!alvo) return;
      alvo.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }

    // Acende a bolinha do card atual e apaga as outras
    function atualizarBolinhas() {
      const atual = indiceAtual();
      bolinhas.forEach(function (bolinha, indice) {
        bolinha.classList.toggle("is-ativo", indice === atual);
      });
    }

    if (botaoAnterior) {
      botaoAnterior.addEventListener("click", function () {
        irParaCard(Math.max(0, indiceAtual() - 1));
      });
    }

    if (botaoProximo) {
      botaoProximo.addEventListener("click", function () {
        irParaCard(Math.min(cards.length - 1, indiceAtual() + 1));
      });
    }

    bolinhas.forEach(function (bolinha, indice) {
      bolinha.addEventListener("click", function () {
        irParaCard(indice);
      });
    });

    // Enquanto o usuário arrasta o carrossel com o dedo, vai atualizando
    // a bolinha acesa — com um pequeno atraso (debounce) pra não ficar
    // recalculando a cada pixel rolado, só quando o dedo já "assentou"
    let temporizadorScroll;
    grade.addEventListener("scroll", function () {
      clearTimeout(temporizadorScroll);
      temporizadorScroll = setTimeout(atualizarBolinhas, 100);
    });
  });

});
