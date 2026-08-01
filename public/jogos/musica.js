/* Música-tema do jogo, ligada por padrão, mas sempre sob controle do jogador
   (quem desligar uma vez tem essa escolha lembrada em localStorage daí em diante). */
(function(){
  const CHAVE = 'carimbo.musica';
  const audio = new Audio('../Theme.ogg');
  audio.loop = true;
  audio.volume = 0.35;
  audio.preload = 'none';

  function ligada(){
    const pref = localStorage.getItem(CHAVE);
    return pref === null ? true : pref === '1';
  }

  function tocar(){
    audio.play().catch(()=>{
      // autoplay bloqueado pelo navegador: retoma assim que o jogador interagir com a página
      const retomar = ()=>{ audio.play().catch(()=>{}); };
      document.addEventListener('pointerdown', retomar, { once:true });
      document.addEventListener('keydown', retomar, { once:true });
    });
  }

  function atualizarBotao(){
    const btn = document.getElementById('musicaBtn');
    if(!btn) return;
    const tocando = !audio.paused;
    btn.textContent = tocando ? 'pausar música' : 'tocar música';
    btn.setAttribute('aria-pressed', String(tocando));
    btn.classList.toggle('on', tocando);
  }

  function alternarMusica(){
    if(audio.paused){
      localStorage.setItem(CHAVE, '1');
      tocar();
    } else {
      audio.pause();
      localStorage.setItem(CHAVE, '0');
    }
    atualizarBotao();
  }

  audio.addEventListener('play', atualizarBotao);
  audio.addEventListener('pause', atualizarBotao);
  window.alternarMusica = alternarMusica;

  document.addEventListener('DOMContentLoaded', ()=>{
    atualizarBotao();
    if(ligada()) tocar();
  });
})();
