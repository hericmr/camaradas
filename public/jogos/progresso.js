/* Estrutura canônica do jogo: temas (leis) e as fases dentro de cada um.
   Fonte única de verdade usada pela mesa de escolha de tema, pela tela de
   resumo de progresso e pelo dropdown de navegação dentro de cada fase. */
const CARIMBO_TEMAS = [
  {
    id: 'lei8662',
    nome: 'Lei 8.662/93',
    subtitulo: 'Regulamentação da profissão',
    fases: [
      { id: '8662', nome: 'Fase 1 · Lei 8.662/93', href: './carimbo-8662.html' },
      { id: 'completo', nome: 'Fase 3 · Tudo junto', href: './carimbo-completo.html', bonus: true },
    ],
  },
  {
    id: 'etica',
    nome: 'Código de Ética',
    subtitulo: 'Código de Ética Profissional',
    fases: [
      { id: 'etica', nome: 'Fase 2 · Código de Ética', href: './carimbo-etica.html' },
      { id: 'completo', nome: 'Fase 3 · Tudo junto', href: './carimbo-completo.html', bonus: true },
    ],
  },
  {
    id: 'santos',
    nome: 'Lei Orgânica de Santos',
    subtitulo: 'Lei Orgânica do Município de Santos',
    fases: [
      { id: 'santos', nome: 'Fase 4 · princípios, vedações e competências', href: './carimbo-santos.html' },
      { id: 'santos-poderes', nome: 'Fase 5a · poderes', href: './carimbo-santos-poderes.html' },
      { id: 'santos-politicas', nome: 'Fase 5b · tributação/saúde/proteção', href: './carimbo-santos-politicas.html' },
      { id: 'santos-pegadinhas', nome: 'Fase 5c · pegadinhas', href: './carimbo-santos-pegadinhas.html' },
      { id: 'santos-numeros', nome: 'Fase 5d · números', href: './carimbo-santos-numeros.html' },
      { id: 'santos-assistencia', nome: 'Fase 5e · assistência/proteção social', href: './carimbo-santos-assistencia.html' },
    ],
  },
];

/* Lista plana de todas as fases, sem repetir a fase bônus que aparece em dois temas. */
function carimboTodasFases(){
  const vistos = new Set();
  const lista = [];
  CARIMBO_TEMAS.forEach(tema => tema.fases.forEach(fase => {
    if(!vistos.has(fase.id)){ vistos.add(fase.id); lista.push(fase); }
  }));
  return lista;
}

/* Acha o tema ao qual uma fase pertence (usado pelo dropdown dentro de cada fase). */
function carimboTemaDaFase(faseId){
  return CARIMBO_TEMAS.find(tema => tema.fases.some(fase => fase.id === faseId)) || null;
}

/* Preenche o dropdown de navegação dentro de uma fase: só as fases do mesmo
   tema + atalhos pra trocar de tema e ver o resumo geral. */
function carimboRenderizarDropdownFase(faseIdAtual){
  const nav = document.getElementById('fasesNav');
  const tema = carimboTemaDaFase(faseIdAtual);
  if(!nav || !tema) return;
  const links = tema.fases.map(f=>
    `<a class="fase-link" href="${f.href}"${f.id===faseIdAtual?' aria-current="page"':''}>${f.nome}</a>`
  ).join('');
  nav.innerHTML = `
    <div class="fase-group-label">${tema.nome}</div>
    ${links}
    <div class="fases-divider"></div>
    <a class="fase-link" href="./mesa.html">← trocar de tema</a>
    <a class="fase-link" href="./carimbo-progresso.html">resumo de progresso</a>
  `;
}

/* Preenche o dropdown das telas gerais (mesa e resumo): todos os temas agrupados. */
function carimboRenderizarDropdownGeral(paginaAtualId){
  const nav = document.getElementById('fasesNav');
  if(!nav) return;
  const grupos = CARIMBO_TEMAS.map(tema => `
    <div class="fase-group-label">${tema.nome}</div>
    ${tema.fases.map(f=>`<a class="fase-link" href="${f.href}">${f.nome}</a>`).join('')}
  `).join('');
  nav.innerHTML = `
    <a class="fase-link" href="./mesa.html"${paginaAtualId==='mesa'?' aria-current="page"':''}>escolher tema</a>
    <a class="fase-link" href="./carimbo-progresso.html"${paginaAtualId==='progresso'?' aria-current="page"':''}>resumo de progresso</a>
    <div class="fases-divider"></div>
    ${grupos}
  `;
}

const CARIMBO_PROGRESSO_KEY = 'carimbo.progresso.v1';

function carimboLerProgresso(){
  try{
    return JSON.parse(localStorage.getItem(CARIMBO_PROGRESSO_KEY)) || {};
  }catch(e){
    return {};
  }
}

/* Guarda só a melhor tentativa de cada fase (maior % de acerto; empate desempata pela maior sequência). */
function carimboSalvarProgresso(faseId, correct, total, streak){
  if(!total) return;
  const pct = Math.round(correct/total*100);
  const todos = carimboLerProgresso();
  const atual = todos[faseId];
  const ehMelhor = !atual || pct > atual.pct || (pct === atual.pct && streak > atual.streak);
  if(!ehMelhor) return;
  todos[faseId] = { correct, total, pct, streak, data: new Date().toISOString() };
  try{ localStorage.setItem(CARIMBO_PROGRESSO_KEY, JSON.stringify(todos)); }catch(e){}
}

function carimboLimparProgresso(){
  try{ localStorage.removeItem(CARIMBO_PROGRESSO_KEY); }catch(e){}
}
