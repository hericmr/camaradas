# Reorganização do jogo "Senta a Carimbada, camarada!"

Plano de trabalho pra reestruturar o jogo por **temas (leis)**, cada um com suas fases
dentro, e criar uma tela de entrada especial. Documento vivo — atualizar conforme as
decisões forem fechando.

**Status: implementado** (todos os 7 passos da seção 7 aplicados — `jogos/intro.html`,
`jogos/mesa.html`, `CARIMBO_TEMAS` em `public/jogos/progresso.js`, dropdown por tema
nas 9 fases + resumo, link de entrada em `index.html`).

## 1. Estrutura por temas (confirmado)

Hoje as 9 fases são uma lista única no dropdown. A nova organização agrupa por lei/documento:

- **Mundo 1 — Lei 8.662/93** (regulamentação da profissão)
  - Fase 1 · Lei 8.662/93 (art. 4º × art. 5º)
- **Mundo 2 — Código de Ética Profissional**
  - Fase 2 · Código de Ética
- **Mundo 3 — Lei Orgânica do Município de Santos**
  - Fase 4 · princípios, vedações e competências
  - Fase 5a · poderes
  - Fase 5b · tributação/saúde/proteção
  - Fase 5c · pegadinhas
  - Fase 5d · números
  - Fase 5e · assistência/proteção social

**Fase 3 ("tudo junto")** mistura Lei 8.662 + Código de Ética — não é uma lei própria.
**Confirmado:** vira fase bônus listada nos **dois mundos** (Mundo 1 e Mundo 2) — é só
um link a mais em cada lista, não duplica arquivo.

## 2. Tela de entrada (em desenho)

Referência: tela de título de **Papers, Please** — título aparece em golpes, no ritmo
da música, antes de qualquer menu.

### Dados reais do Theme.ogg (analisados com ffmpeg + numpy/scipy)

- Duração total: 103s
- Tempo estimado: **~100 BPM** (batida a cada ~0.6s), muito regular no início da faixa
- Primeiros onsets fortes detectados: `0.65s · 1.25s · 1.84s · 2.44s` (quase exatamente
  a cada 600ms)
- Acentos mais fortes (prováveis início de frase musical) a cada ~8 batidas: `~0.65s,
  ~5.46s, ~10.25s, ~18.44s`

### Sequência proposta

O título "SENTA A CARIMBADA, camarada!" tem 4 blocos naturais — um por batida:

| t (s) | Evento |
|---|---|
| 0.00 | tela escura, música começa a tocar |
| 0.65 | carimbo bate → "SENTA" aparece |
| 1.25 | carimbo bate → "A" aparece |
| 1.84 | carimbo bate → "CARIMBADA," aparece |
| 2.44 | "camarada!" (cursiva) escreve/aparece — sem baque de carimbo, efeito de assinatura |
| ~2.44–5.46 | segura o título completo na tela, música seguindo |
| ~5.46 (próximo acento) | mostra prompt "toque pra continuar" / avança sozinho pra escolha de tema |

Efeitos reaproveitados do que já existe: `stamp.mp3` no baque de cada palavra,
animação `.hit`/`.seal` do carimbador, fontes Agitprop (bloco) + Minhaletra2 (cursiva)
já usadas no título da navbar.

### Gesto do jogador (resolve autoplay)

Como todo o efeito depende do áudio tocar em sincronia, a tela de entrada precisa de
**um toque inicial do jogador** (ex.: "toque pra começar") que dispara `audio.play()`
e o cronômetro da animação juntos — isso também garante que o navegador libere o
autoplay com som (sem depender do fallback de "retoma no próximo clique" que o
`musica.js` já tem pra outras páginas).

**Confirmado:** a intro toca **toda vez** que o jogador entra pela landing page
principal (é curta, ~3-5s, então repetir não cansa e reforça o clima).

Essa intro é uma página nova (`jogos/intro.html`) que vira o novo link de entrada a
partir do `index.html` do site, no lugar do link direto pra fase 1. Ao terminar (ou
ao tocar/apertar uma tecla pra pular), leva pra tela de escolha de tema (item 3).

## 3. Tela de escolha de tema (confirmado)

**Metáfora "mesa de trabalho" com dossiês/pastas** — reaproveita a estética que o jogo
já tem (a `.desk`/mesa e o painel de "consultar a lei" já existem em `carimbo.css`).
Cada mundo é representado como uma pasta/dossiê sobre a mesa; o jogador "abre" a pasta
do tema pra ver as fases dentro. Visual a desenhar em cima do que já existe (paper,
ink, seals), não do zero.

## 4. Extensibilidade (confirmado)

**Sim**, o usuário pretende adicionar novos temas/leis em breve — vale a pena migrar
`CARIMBO_FASES` (hoje lista plana em `public/jogos/progresso.js`) para uma estrutura
aninhada `CARIMBO_TEMAS = [{ id, nome, fases: [...] }]` desde já. Essa estrutura passa
a ser a fonte única de verdade usada por:
- tela de escolha de tema (novo)
- tela de resumo de progresso (`carimbo-progresso.html`, já existe — precisa migrar
  pra iterar por tema em vez de lista plana)
- dropdown de navegação dentro de cada fase (item 5)

Isso também facilita adicionar um 4º mundo no futuro só editando um array, sem tocar
nas páginas de fase existentes.

## 5. Dropdown de navegação dentro de cada fase (proposta)

Não perguntado diretamente, mas decorre das decisões acima: como agora existe uma tela
dedicada de escolha de tema (mesa/dossiês), o dropdown dentro de cada fase passa a
mostrar **só as fases do mesmo mundo** + um link "← trocar de tema" que volta pra mesa.
Menos redundante que repetir as 9 fases agrupadas dentro do dropdown.
→ Se o usuário preferir manter as 9 fases agrupadas por tema dentro do próprio
dropdown (sem precisar voltar pra mesa), é só avisar antes de eu implementar.

## 6. Impacto técnico esperado (alto nível, não é o plano de implementação final)

- Novo arquivo de dados compartilhado (`CARIMBO_TEMAS` aninhado) substituindo/estendendo
  `CARIMBO_FASES` em `public/jogos/progresso.js`
- Nova página de intro (`jogos/intro.html` ou similar)
- Nova página de escolha de tema
- Ajuste do dropdown nos 9 arquivos de fase + tela de resumo de progresso
- Ajuste do link de entrada em `index.html` (hoje aponta direto pra `carimbo-8662.html`)
- Observação à parte (não faz parte deste pedido, só registro): as 9 páginas de fase
  ainda têm bastante lógica JS duplicada arquivo a arquivo — se algum dia unificarmos
  isso num motor só, essa reorganização por temas fica mais fácil de manter também.

## 7. Plano de implementação (ordem sugerida)

1. **`CARIMBO_TEMAS`** — migrar `public/jogos/progresso.js` da lista plana
   `CARIMBO_FASES` pra estrutura aninhada por tema (mantendo compatibilidade dos dados
   já salvos em `localStorage`, que são por `faseId` e não mudam de formato).
2. **`jogos/intro.html`** — tela de título com a animação sincronizada ao Theme.ogg
   (sequência da seção 2), gesto de toque inicial, avança pra mesa ao final ou ao
   pular.
3. **`jogos/mesa.html`** (nome provisório) — tela de escolha de tema, metáfora de
   dossiês/pastas sobre a mesa, usando `CARIMBO_TEMAS`; mostra também o progresso
   salvo de cada tema (reaproveitando `carimboLerProgresso()`).
4. **Migrar `jogos/carimbo-progresso.html`** pra iterar por tema usando
   `CARIMBO_TEMAS` em vez da lista plana.
5. **Atualizar dropdown** nos 9 arquivos de fase pra mostrar só as fases do mundo
   atual + link "trocar de tema" (seção 5).
6. **Atualizar `index.html`** — link principal do jogo passa a apontar pra
   `jogos/intro.html` em vez de `jogos/carimbo-8662.html`.
7. Build, testes visuais (build + screenshot headless) e deploy.

Este plano ainda não foi implementado — é o próximo passo depois que o usuário revisar
este documento.
