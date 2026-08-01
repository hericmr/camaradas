/* Lista canônica das fases do jogo, usada tanto pelas próprias fases (pra salvar o resultado)
   quanto pela tela de resumo (pra listar e ler o progresso de todas). */
const CARIMBO_FASES = [
  { id: '8662', nome: 'Fase 1 · Lei 8.662/93', href: './carimbo-8662.html' },
  { id: 'etica', nome: 'Fase 2 · Código de Ética', href: './carimbo-etica.html' },
  { id: 'completo', nome: 'Fase 3 · Tudo junto', href: './carimbo-completo.html' },
  { id: 'santos', nome: 'Fase 4 · Santos: princípios, vedações e competências', href: './carimbo-santos.html' },
  { id: 'santos-poderes', nome: 'Fase 5a · Santos: poderes', href: './carimbo-santos-poderes.html' },
  { id: 'santos-politicas', nome: 'Fase 5b · Santos: tributação/saúde/proteção', href: './carimbo-santos-politicas.html' },
  { id: 'santos-pegadinhas', nome: 'Fase 5c · Santos: pegadinhas', href: './carimbo-santos-pegadinhas.html' },
  { id: 'santos-numeros', nome: 'Fase 5d · Santos: números', href: './carimbo-santos-numeros.html' },
  { id: 'santos-assistencia', nome: 'Fase 5e · Santos: assistência/proteção social', href: './carimbo-santos-assistencia.html' },
];

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
