import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CampoMinado } from '../src/campo-minado.js';
import { BOMBAS_BLOCO, novoJogo, rejeitaSemAlterar, todasCoordenadas } from '../support/fixtures.js';

const posicoesBombas = jogo => jogo.inspecionar().flatMap((linha, l) =>
  linha.flatMap((casa, c) => casa.bomba ? [{ linha: l, coluna: c }] : []));

describe('CT06 — Revelação e ações inválidas', () => {
  it('revela uma casa numerada e inicia a partida', () => {
    const jogo = novoJogo();
    const estado = jogo.revelar(2, 4);
    assert.equal(estado.status, 'jogando');
    assert.equal(estado.segurasReveladas, 1);
    assert.equal(estado.tabuleiro[2][4].conteudo, 4);
    assert.equal(estado.tabuleiro[2][4].revelada, true);
    assert.equal(estado.tabuleiro[2][5].conteudo, null);
  });

  it('repetir a abertura de uma casa revelada não altera nada', () => {
    const jogo = novoJogo();
    jogo.revelar(2, 4);
    const antes = jogo.estado;
    assert.deepEqual(jogo.revelar(2, 4), antes);
    assert.deepEqual(jogo.estado, antes);
  });

  for (const [nome, linha, coluna] of [
    ['linha negativa', -1, 0], ['linha 14', 14, 0], ['coluna negativa', 0, -1],
    ['coluna 18', 0, 18], ['linha fracionária', 0.5, 0], ['coluna fracionária', 0, 0.5],
    ['texto', '0', 0], ['null', 0, null], ['NaN', NaN, 0], ['infinito', Infinity, 0],
  ]) {
    it(`rejeita ${nome} ao revelar ou marcar, sem mudar a partida`, () => {
      const jogo = novoJogo();
      rejeitaSemAlterar(jogo, () => jogo.revelar(linha, coluna), /Coordenada inválida/);
      rejeitaSemAlterar(jogo, () => jogo.alternarBandeira(linha, coluna), /Coordenada inválida/);
    });
  }

  it('os métodos retornam o estado atualizado como uma cópia', () => {
    const jogo = novoJogo();
    const estado = jogo.revelar(2, 4);
    assert.deepEqual(estado, jogo.estado);
    estado.segurasReveladas = 99;
    estado.tabuleiro[2][4].conteudo = 99;
    assert.equal(jogo.estado.segurasReveladas, 1);
    assert.equal(jogo.estado.tabuleiro[2][4].conteudo, 4);
  });
});

describe('CT07 — Primeiro clique seguro', () => {
  it('transfere a bomba clicada sem reduzir a quantidade de 40', () => {
    const jogo = novoJogo();
    jogo.revelar(0, 0);
    const grade = jogo.inspecionar();
    assert.equal(grade[0][0].bomba, false);
    assert.equal(grade[2][4].bomba, true);
    assert.equal(posicoesBombas(jogo).length, 40);
    assert.equal(new Set(posicoesBombas(jogo).map(p => `${p.linha},${p.coluna}`)).size, 40);
    assert.equal(jogo.estado.status, 'jogando');
    assert.equal(jogo.estado.primeiraRevelacaoPendente, false);
    assert.equal(jogo.estado.explosao, null);
  });

  it('o primeiro clique é seguro, mas pode mostrar um número diferente de zero', () => {
    const jogo = novoJogo();
    jogo.revelar(0, 0);
    assert.equal(jogo.estado.tabuleiro[0][0].conteudo, 3);
  });

  it('recalcula todos os números depois de transferir a bomba', () => {
    const jogo = novoJogo();
    jogo.revelar(0, 0);
    const bombas = posicoesBombas(jogo);
    const grade = jogo.inspecionar();
    for (const { linha, coluna } of todasCoordenadas()) {
      if (grade[linha][coluna].bomba) continue;
      const esperado = bombas.filter(b => Math.abs(b.linha - linha) <= 1 && Math.abs(b.coluna - coluna) <= 1).length;
      assert.equal(grade[linha][coluna].adjacentes, esperado);
    }
  });

  it('não altera a posição das bombas quando o primeiro clique já é seguro', () => {
    const jogo = novoJogo();
    const antes = posicoesBombas(jogo);
    jogo.revelar(2, 4);
    assert.deepEqual(posicoesBombas(jogo), antes);
  });

  it('a transferência não coloca a bomba numa casa com bandeira', () => {
    const jogo = novoJogo();
    jogo.alternarBandeira(2, 4);
    jogo.revelar(0, 0);
    const grade = jogo.inspecionar();
    assert.equal(grade[2][4].bomba, false);
    assert.equal(grade[2][4].bandeira, true);
    assert.equal(grade[2][5].bomba, true);
  });

  it('um clique inválido não consome a proteção', () => {
    const jogo = novoJogo();
    assert.throws(() => jogo.revelar(-1, 0), /Coordenada inválida/);
    assert.equal(jogo.estado.primeiraRevelacaoPendente, true);
    jogo.revelar(0, 0);
    assert.equal(jogo.estado.status, 'jogando');
  });

  it('marcar, tentar abrir e desmarcar uma casa preserva a proteção inicial', () => {
    const jogo = novoJogo();
    jogo.alternarBandeira(0, 0);
    rejeitaSemAlterar(jogo, () => jogo.revelar(0, 0), /Remova a bandeira/);
    assert.equal(jogo.estado.primeiraRevelacaoPendente, true);
    jogo.alternarBandeira(0, 0);
    jogo.revelar(0, 0);
    assert.equal(jogo.estado.status, 'jogando');
  });

  it('somente a primeira revelação é protegida; a segunda pode explodir', () => {
    const jogo = novoJogo();
    jogo.revelar(0, 0);
    jogo.revelar(0, 1);
    assert.equal(jogo.estado.status, 'perdeu');
    assert.deepEqual(jogo.estado.explosao, { linha: 0, coluna: 1 });
  });
});

describe('CT08 — Expansão de áreas vazias', () => {
  it('abrir zero revela a área conectada e sua fronteira numerada', () => {
    const jogo = novoJogo();
    jogo.revelar(13, 17);
    assert.equal(jogo.estado.tabuleiro[13][17].conteudo, 0);
    assert.equal(jogo.estado.tabuleiro[2][4].conteudo, 4);
    assert.equal(jogo.estado.segurasReveladas, 212);
    assert.equal(jogo.estado.status, 'ganhou');
  });

  it('a expansão nunca abre uma bomba', () => {
    const jogo = novoJogo();
    jogo.revelar(13, 17);
    for (const casa of jogo.inspecionar().flat()) {
      if (casa.bomba) assert.equal(casa.revelada, false);
    }
    assert.equal(jogo.estado.tabuleiro.flat().filter(c => c.conteudo === 'bomba').length, 0);
  });

  it('uma casa numerada não inicia a expansão', () => {
    const jogo = novoJogo();
    jogo.revelar(2, 4);
    assert.equal(jogo.inspecionar().flat().filter(c => c.revelada).length, 1);
  });

  it('pula casas seguras com bandeira e não vence enquanto uma delas estiver fechada', () => {
    const jogo = novoJogo();
    jogo.alternarBandeira(13, 17);
    jogo.revelar(13, 16);
    assert.equal(jogo.estado.segurasReveladas, 211);
    assert.equal(jogo.estado.status, 'jogando');
    assert.deepEqual(jogo.estado.tabuleiro[13][17], { revelada: false, bandeira: true, conteudo: null });
  });

  it('revelar a última casa segura após remover a bandeira completa as 212', () => {
    const jogo = novoJogo();
    jogo.alternarBandeira(13, 17);
    jogo.revelar(13, 16);
    jogo.alternarBandeira(13, 17);
    jogo.revelar(13, 17);
    assert.equal(jogo.estado.segurasReveladas, 212);
    assert.equal(jogo.estado.status, 'ganhou');
  });

  it('bombas sinalizadas não impedem a expansão nem exigem outras bandeiras para vencer', () => {
    const jogo = novoJogo();
    jogo.alternarBandeira(0, 0);
    jogo.revelar(13, 17);
    assert.equal(jogo.estado.status, 'ganhou');
    assert.equal(jogo.estado.bandeiras, 1);
    assert.equal(jogo.inspecionar()[0][0].bandeira, true);
  });
});

describe('CT09 — Bandeiras e limite de marcações', () => {
  it('coloca e remove bandeira, atualizando o contador', () => {
    const jogo = novoJogo();
    jogo.alternarBandeira(0, 0);
    assert.equal(jogo.estado.bandeiras, 1);
    assert.equal(jogo.estado.bandeirasDisponiveis, 39);
    jogo.alternarBandeira(0, 0);
    assert.equal(jogo.estado.bandeiras, 0);
    assert.equal(jogo.estado.bandeirasDisponiveis, 40);
  });

  it('marcar uma bomba não a revela e não inicia a partida', () => {
    const jogo = novoJogo();
    jogo.alternarBandeira(0, 0);
    assert.equal(jogo.estado.status, 'pronto');
    assert.equal(jogo.estado.tabuleiro[0][0].conteudo, null);
    assert.equal(jogo.estado.segurasReveladas, 0);
  });

  it('permite marcar uma casa segura sem informar se a marcação está correta', () => {
    const jogo = novoJogo();
    jogo.alternarBandeira(13, 17);
    assert.deepEqual(jogo.estado.tabuleiro[13][17], { revelada: false, bandeira: true, conteudo: null });
    assert.equal(jogo.estado.bandeirasDisponiveis, 39);
  });

  it('bloqueia a revelação de uma casa marcada', () => {
    const jogo = novoJogo();
    jogo.alternarBandeira(2, 4);
    rejeitaSemAlterar(jogo, () => jogo.revelar(2, 4), /Remova a bandeira/);
  });

  it('bloqueia bandeira numa casa já revelada', () => {
    const jogo = novoJogo();
    jogo.revelar(2, 4);
    rejeitaSemAlterar(jogo, () => jogo.alternarBandeira(2, 4), /casa revelada/);
  });

  it('permite exatamente 40 bandeiras e chega a zero disponíveis', () => {
    const jogo = novoJogo();
    for (const p of BOMBAS_BLOCO) jogo.alternarBandeira(p.linha, p.coluna);
    assert.equal(jogo.estado.bandeiras, 40);
    assert.equal(jogo.estado.bandeirasDisponiveis, 0);
  });

  it('rejeita a 41ª bandeira sem deixar contador negativo', () => {
    const jogo = novoJogo();
    for (const p of BOMBAS_BLOCO) jogo.alternarBandeira(p.linha, p.coluna);
    rejeitaSemAlterar(jogo, () => jogo.alternarBandeira(13, 17), /limite é de 40/);
    assert.equal(jogo.estado.bandeirasDisponiveis, 0);
  });

  it('permite remover uma bandeira no limite e reutilizá-la em outra casa', () => {
    const jogo = novoJogo();
    for (const p of BOMBAS_BLOCO) jogo.alternarBandeira(p.linha, p.coluna);
    jogo.alternarBandeira(0, 0);
    assert.equal(jogo.estado.bandeirasDisponiveis, 1);
    jogo.alternarBandeira(13, 17);
    assert.equal(jogo.estado.bandeirasDisponiveis, 0);
    assert.equal(jogo.estado.bandeiras, 40);
  });

  it('marcar corretamente as 40 bombas não basta para vencer', () => {
    const jogo = novoJogo();
    for (const p of BOMBAS_BLOCO) jogo.alternarBandeira(p.linha, p.coluna);
    assert.equal(jogo.estado.status, 'pronto');
    assert.equal(jogo.estado.segurasReveladas, 0);
  });

  it('bandeiras não alteram bombas nem números adjacentes', () => {
    const jogo = novoJogo();
    const antes = jogo.inspecionar().flat().map(c => [c.bomba, c.adjacentes]);
    jogo.alternarBandeira(0, 0);
    jogo.alternarBandeira(13, 17);
    assert.deepEqual(jogo.inspecionar().flat().map(c => [c.bomba, c.adjacentes]), antes);
  });
});

describe('CT10 — Vitória, derrota, reinício e isolamento', () => {
  it('revelar uma bomba depois do primeiro clique encerra com derrota', () => {
    const jogo = novoJogo();
    jogo.revelar(2, 4);
    jogo.revelar(0, 0);
    assert.equal(jogo.estado.status, 'perdeu');
    assert.deepEqual(jogo.estado.explosao, { linha: 0, coluna: 0 });
    assert.equal(jogo.estado.tabuleiro[0][0].revelada, true);
    assert.equal(jogo.estado.tabuleiro[0][0].conteudo, 'bomba');
    assert.equal(jogo.estado.segurasReveladas, 1);
  });

  it('a derrota mostra as 40 bombas e mantém números fechados ocultos', () => {
    const jogo = novoJogo();
    jogo.revelar(2, 4);
    jogo.revelar(0, 0);
    assert.equal(jogo.estado.tabuleiro.flat().filter(c => c.conteudo === 'bomba').length, 40);
    assert.equal(jogo.estado.tabuleiro[3][4].conteudo, null);
    assert.equal(jogo.estado.tabuleiro[0][1].revelada, false);
  });

  for (const resultado of ['ganhou', 'perdeu']) {
    it(`bloqueia novas jogadas e bandeiras depois de ${resultado}`, () => {
      const jogo = novoJogo();
      if (resultado === 'ganhou') jogo.revelar(13, 17);
      else { jogo.revelar(2, 4); jogo.revelar(0, 0); }
      assert.equal(jogo.estado.status, resultado);
      rejeitaSemAlterar(jogo, () => jogo.revelar(3, 4), /A partida já terminou/);
      rejeitaSemAlterar(jogo, () => jogo.alternarBandeira(0, 1), /A partida já terminou/);
    });
  }

  it('pode vencer sem colocar nenhuma bandeira', () => {
    const jogo = novoJogo();
    jogo.revelar(13, 17);
    assert.equal(jogo.estado.status, 'ganhou');
    assert.equal(jogo.estado.segurasReveladas, 212);
    assert.equal(jogo.estado.bandeiras, 0);
  });

  const novasBombas = BOMBAS_BLOCO.map(p => ({ linha: 13 - p.linha, coluna: 17 - p.coluna }));
  for (const origem of ['jogando', 'ganhou', 'perdeu']) {
    it(`reinicia uma partida que estava ${origem}`, () => {
      const jogo = novoJogo();
      jogo.alternarBandeira(0, 1);
      if (origem === 'ganhou') jogo.revelar(13, 17);
      else {
        jogo.revelar(2, 4);
        if (origem === 'perdeu') jogo.revelar(0, 0);
      }
      assert.equal(jogo.estado.status, origem);
      const estado = jogo.reiniciar({ bombas: novasBombas });
      assert.equal(estado.status, 'pronto');
      assert.equal(estado.segurasReveladas, 0);
      assert.equal(estado.bandeiras, 0);
      assert.equal(estado.bandeirasDisponiveis, 40);
      assert.equal(estado.primeiraRevelacaoPendente, true);
      assert.equal(estado.explosao, null);
      assert.ok(estado.tabuleiro.flat().every(c => !c.revelada && !c.bandeira && c.conteudo === null));
      assert.equal(jogo.inspecionar()[0][0].bomba, false);
      assert.equal(jogo.inspecionar()[13][17].bomba, true);
      assert.equal(posicoesBombas(jogo).length, 40);
      jogo.revelar(13, 17);
      assert.notEqual(jogo.estado.status, 'perdeu');
    });
  }

  it('reinício inválido preserva a partida anterior por completo', () => {
    const jogo = novoJogo();
    jogo.revelar(2, 4);
    rejeitaSemAlterar(jogo, () => jogo.reiniciar({ bombas: [] }), /exatamente 40/);
    rejeitaSemAlterar(jogo, () => jogo.reiniciar({ aleatorio: () => 1 }), /entre 0/);
    rejeitaSemAlterar(jogo, () => jogo.reiniciar({ aleatorio: null }), /deve ser uma função/);
  });

  it('reiniciar sem posições usa novamente o gerador configurado', () => {
    let chamadas = 0;
    const jogo = new CampoMinado({ aleatorio: () => { chamadas += 1; return 0; } });
    jogo.revelar(2, 4);
    jogo.reiniciar();
    assert.equal(chamadas, 80);
    assert.deepEqual(posicoesBombas(jogo), BOMBAS_BLOCO);
    assert.equal(jogo.estado.status, 'pronto');
  });

  it('bombas fornecidas dispensam o sorteio na criação e no reinício', () => {
    const aleatorio = () => { throw new Error('O sorteio não deveria ser chamado.'); };
    const jogo = new CampoMinado({ bombas: BOMBAS_BLOCO, aleatorio });
    jogo.reiniciar({ bombas: novasBombas });
    assert.equal(posicoesBombas(jogo).length, 40);
  });

  it('a inspeção devolve uma cópia que não altera o campo real', () => {
    const jogo = novoJogo();
    const grade = jogo.inspecionar();
    grade[0][0].bomba = false;
    grade[2][4].adjacentes = 99;
    grade[0].push({ bomba: true });
    assert.equal(jogo.inspecionar()[0][0].bomba, true);
    assert.equal(jogo.inspecionar()[2][4].adjacentes, 4);
    assert.equal(jogo.inspecionar()[0].length, 18);
  });

  it('partidas novas não compartilham casas, bandeiras ou contadores', () => {
    const primeira = novoJogo();
    const segunda = novoJogo();
    primeira.alternarBandeira(0, 0);
    primeira.revelar(2, 4);
    assert.equal(segunda.estado.bandeiras, 0);
    assert.equal(segunda.estado.segurasReveladas, 0);
    assert.equal(segunda.estado.tabuleiro[0][0].bandeira, false);
    assert.equal(segunda.estado.status, 'pronto');
  });
});
