import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CampoMinado, coordenadaValida, gerarBombas, listarVizinhos } from '../src/campo-minado.js';
import {
  BOMBAS_BLOCO, VIZINHOS_CENTRO, bombasCom, novoJogo, todasCoordenadas, geradorComSemente,
} from '../support/fixtures.js';

function verificarBombas(bombas) {
  assert.equal(bombas.length, 40);
  assert.equal(new Set(bombas.map(b => `${b.linha},${b.coluna}`)).size, 40);
  for (const { linha, coluna } of bombas) {
    assert.ok(Number.isInteger(linha) && linha >= 0 && linha < 14);
    assert.ok(Number.isInteger(coluna) && coluna >= 0 && coluna < 18);
  }
}

describe('CT01 — Configuração de 18 colunas por 14 linhas', () => {
  it('cria 14 linhas, cada uma com 18 casas', () => {
    const jogo = novoJogo();
    assert.equal(jogo.estado.linhas, 14);
    assert.equal(jogo.estado.colunas, 18);
    assert.equal(jogo.estado.tabuleiro.length, 14);
    assert.ok(jogo.estado.tabuleiro.every(linha => linha.length === 18));
  });

  it('possui exatamente 252 casas, 40 bombas e 212 casas seguras', () => {
    const jogo = novoJogo();
    const casas = jogo.inspecionar().flat();
    assert.equal(casas.length, 252);
    assert.equal(casas.filter(c => c.bomba).length, 40);
    assert.equal(casas.filter(c => !c.bomba).length, 212);
    assert.equal(jogo.estado.totalCasas, 252);
    assert.equal(jogo.estado.totalBombas, 40);
    assert.equal(jogo.estado.totalSeguras, 212);
  });

  it('inicia pronto, sem casas reveladas e com 40 bandeiras disponíveis', () => {
    const estado = novoJogo().estado;
    assert.equal(estado.status, 'pronto');
    assert.equal(estado.segurasReveladas, 0);
    assert.equal(estado.bandeiras, 0);
    assert.equal(estado.bandeirasDisponiveis, 40);
    assert.equal(estado.primeiraRevelacaoPendente, true);
    assert.equal(estado.explosao, null);
  });

  it('oculta todas as bombas e todos os números antes da primeira revelação', () => {
    for (const casa of novoJogo().estado.tabuleiro.flat()) {
      assert.deepEqual(casa, { revelada: false, bandeira: false, conteudo: null });
    }
  });

  it('mantém as casas e linhas independentes', () => {
    const jogo = novoJogo();
    jogo.alternarBandeira(0, 0);
    assert.equal(jogo.estado.tabuleiro[0][0].bandeira, true);
    assert.equal(jogo.estado.tabuleiro[0][1].bandeira, false);
    assert.equal(jogo.estado.tabuleiro[1][0].bandeira, false);
  });
});

describe('CT02 — Geração de bombas sem repetição', () => {
  for (const semente of [0, 1, 7, 42, 123456]) {
    it(`gera 40 posições válidas e distintas com semente ${semente}`, () => {
      verificarBombas(gerarBombas(geradorComSemente(semente)));
    });
  }

  it('termina com gerador constante zero e usa exatamente 40 sorteios', () => {
    let chamadas = 0;
    const bombas = gerarBombas(() => { chamadas += 1; return 0; });
    assert.equal(chamadas, 40);
    assert.deepEqual(bombas, BOMBAS_BLOCO);
  });

  it('aceita valores próximos de um sem produzir coordenadas fora do tabuleiro', () => {
    verificarBombas(gerarBombas(() => 0.9999999999999999));
  });

  it('a mesma semente reproduz o mesmo campo para testes', () => {
    assert.deepEqual(gerarBombas(geradorComSemente(2026)), gerarBombas(geradorComSemente(2026)));
  });

  it('também gera uma partida válida usando o gerador padrão', () => {
    const grade = new CampoMinado().inspecionar();
    assert.equal(grade.flat().filter(c => c.bomba).length, 40);
    assert.equal(grade.flat().length, 252);
  });

  for (const invalido of [null, 3, 'gerador']) {
    it(`rejeita gerador que não é função: ${JSON.stringify(invalido)}`, () => {
      assert.throws(() => gerarBombas(invalido), /deve ser uma função/);
    });
  }

  for (const [nome, valor] of [
    ['negativo', -0.1], ['um', 1], ['NaN', NaN], ['infinito', Infinity],
    ['undefined', undefined], ['texto', '0'], ['null', null],
  ]) {
    it(`rejeita retorno inválido do gerador: ${nome}`, () => {
      assert.throws(() => gerarBombas(() => valor), /entre 0/);
    });
  }
});

describe('CT03 — Coordenadas e vizinhos, incluindo diagonais', () => {
  const casos = [
    [0, 0, [[0, 1], [1, 0], [1, 1]]],
    [0, 17, [[0, 16], [1, 16], [1, 17]]],
    [13, 0, [[12, 0], [12, 1], [13, 1]]],
    [13, 17, [[12, 16], [12, 17], [13, 16]]],
    [0, 8, [[0, 7], [0, 9], [1, 7], [1, 8], [1, 9]]],
    [13, 8, [[12, 7], [12, 8], [12, 9], [13, 7], [13, 9]]],
    [7, 0, [[6, 0], [6, 1], [7, 1], [8, 0], [8, 1]]],
    [7, 17, [[6, 16], [6, 17], [7, 16], [8, 16], [8, 17]]],
    [7, 9, [[6, 8], [6, 9], [6, 10], [7, 8], [7, 10], [8, 8], [8, 9], [8, 10]]],
  ];
  for (const [linha, coluna, esperados] of casos) {
    it(`a casa (${linha}, ${coluna}) tem os ${esperados.length} vizinhos esperados`, () => {
      assert.equal(coordenadaValida(linha, coluna), true);
      assert.deepEqual(listarVizinhos(linha, coluna), esperados.map(([linha, coluna]) => ({ linha, coluna })));
    });
  }

  it('as 252 casas respeitam limites, simetria e ausência de vizinhos repetidos', () => {
    for (const { linha, coluna } of todasCoordenadas()) {
      const vizinhos = listarVizinhos(linha, coluna);
      const bordaLinha = linha === 0 || linha === 13;
      const bordaColuna = coluna === 0 || coluna === 17;
      assert.equal(vizinhos.length, bordaLinha && bordaColuna ? 3 : bordaLinha || bordaColuna ? 5 : 8);
      assert.equal(new Set(vizinhos.map(v => `${v.linha},${v.coluna}`)).size, vizinhos.length);
      for (const v of vizinhos) {
        assert.ok(Math.abs(v.linha - linha) <= 1 && Math.abs(v.coluna - coluna) <= 1);
        assert.ok(v.linha !== linha || v.coluna !== coluna);
        assert.ok(listarVizinhos(v.linha, v.coluna).some(p => p.linha === linha && p.coluna === coluna));
      }
    }
  });

  for (const [nome, linha, coluna] of [
    ['linha negativa', -1, 0], ['linha 14', 14, 0], ['coluna negativa', 0, -1],
    ['coluna 18', 0, 18], ['linha fracionária', 0.5, 0], ['coluna fracionária', 0, 0.5],
    ['linha em texto', '0', 0], ['coluna null', 0, null], ['NaN', NaN, 0], ['infinito', Infinity, 0],
  ]) {
    it(`rejeita ${nome}`, () => {
      assert.equal(coordenadaValida(linha, coluna), false);
      assert.throws(() => listarVizinhos(linha, coluna), /Coordenada inválida/);
    });
  }
});

describe('CT04 — Números de bombas adjacentes', () => {
  for (let quantidade = 0; quantidade <= 8; quantidade += 1) {
    it(`mostra ${quantidade} quando há ${quantidade} bombas ao redor da casa central`, () => {
      const centro = { linha: 7, coluna: 9 };
      const bombas = bombasCom(VIZINHOS_CENTRO.slice(0, quantidade), [...VIZINHOS_CENTRO, centro]);
      const jogo = novoJogo(bombas);
      assert.equal(jogo.inspecionar()[7][9].adjacentes, quantidade);
      jogo.revelar(7, 9);
      assert.equal(jogo.estado.tabuleiro[7][9].conteudo, quantidade);
    });
  }

  for (const [linha, coluna, vizinhos] of [
    [0, 0, [[0, 1], [1, 0], [1, 1]]],
    [0, 17, [[0, 16], [1, 16], [1, 17]]],
    [13, 0, [[12, 0], [12, 1], [13, 1]]],
    [13, 17, [[12, 16], [12, 17], [13, 16]]],
    [0, 8, [[0, 7], [0, 9], [1, 7], [1, 8], [1, 9]]],
    [13, 8, [[12, 7], [12, 8], [12, 9], [13, 7], [13, 9]]],
    [7, 0, [[6, 0], [6, 1], [7, 1], [8, 0], [8, 1]]],
    [7, 17, [[6, 16], [6, 17], [7, 16], [8, 16], [8, 17]]],
  ]) {
    it(`conta ${vizinhos.length} bombas na borda ou canto (${linha}, ${coluna})`, () => {
      const bombas = bombasCom(vizinhos.map(([linha, coluna]) => ({ linha, coluna })), [{ linha, coluna }]);
      const jogo = novoJogo(bombas);
      jogo.revelar(linha, coluna);
      assert.equal(jogo.estado.tabuleiro[linha][coluna].conteudo, vizinhos.length);
    });
  }

  it('todos os números conferem com as distâncias até as bombas conhecidas', () => {
    const grade = novoJogo().inspecionar();
    for (const { linha, coluna } of todasCoordenadas()) {
      if (grade[linha][coluna].bomba) continue;
      const esperado = BOMBAS_BLOCO.filter(b => Math.abs(b.linha - linha) <= 1
        && Math.abs(b.coluna - coluna) <= 1).length;
      assert.equal(grade[linha][coluna].adjacentes, esperado);
    }
  });
});

describe('CT05 — Validação das posições de bombas', () => {
  for (const [nome, bombas] of [
    ['lista vazia', []], ['39 bombas', BOMBAS_BLOCO.slice(1)],
    ['41 bombas', [...BOMBAS_BLOCO, { linha: 13, coluna: 17 }]], ['null', null], ['objeto', {}],
  ]) {
    it(`rejeita ${nome}`, () => {
      assert.throws(() => new CampoMinado({ bombas }), /exatamente 40/);
    });
  }

  for (const [nome, posicao] of [
    ['linha negativa', { linha: -1, coluna: 0 }], ['linha 14', { linha: 14, coluna: 0 }],
    ['coluna negativa', { linha: 0, coluna: -1 }], ['coluna 18', { linha: 0, coluna: 18 }],
    ['linha fracionária', { linha: 1.5, coluna: 0 }], ['texto', { linha: '0', coluna: 0 }],
    ['sem coordenadas', {}], ['null', null],
  ]) {
    it(`rejeita bomba com ${nome}`, () => {
      const bombas = structuredClone(BOMBAS_BLOCO);
      bombas[0] = posicao;
      assert.throws(() => new CampoMinado({ bombas }), /inválida/);
    });
  }

  it('rejeita duas bombas na mesma casa', () => {
    const bombas = structuredClone(BOMBAS_BLOCO);
    bombas[1] = bombas[0];
    assert.throws(() => new CampoMinado({ bombas }), /posições diferentes/);
  });

  it('rejeita lista esparsa com posições ausentes', () => {
    const bombas = structuredClone(BOMBAS_BLOCO);
    delete bombas[5];
    assert.throws(() => new CampoMinado({ bombas }), /Posição de bomba inválida/);
  });

  it('não permite alterar o campo modificando a lista fornecida', () => {
    const bombas = structuredClone(BOMBAS_BLOCO);
    const jogo = novoJogo(bombas);
    bombas[0].linha = 13;
    bombas.splice(1);
    assert.equal(jogo.inspecionar()[0][0].bomba, true);
    assert.equal(jogo.inspecionar().flat().filter(c => c.bomba).length, 40);
  });
});
