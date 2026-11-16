import assert from 'node:assert/strict';
import { CampoMinado } from '../src/campo-minado.js';

// Duas linhas completas de bombas e quatro bombas na terceira linha.
export const BOMBAS_BLOCO = Array.from({ length: 40 }, (_, i) => ({
  linha: Math.floor(i / 18), coluna: i % 18,
}));

export const VIZINHOS_CENTRO = [
  { linha: 6, coluna: 8 }, { linha: 6, coluna: 9 }, { linha: 6, coluna: 10 },
  { linha: 7, coluna: 8 }, { linha: 7, coluna: 10 },
  { linha: 8, coluna: 8 }, { linha: 8, coluna: 9 }, { linha: 8, coluna: 10 },
];

export function todasCoordenadas() {
  return Array.from({ length: 14 }, (_, linha) =>
    Array.from({ length: 18 }, (_, coluna) => ({ linha, coluna }))).flat();
}

export function bombasCom(desejadas, protegidas = []) {
  const chave = ({ linha, coluna }) => `${linha},${coluna}`;
  const usadas = new Set(desejadas.map(chave));
  const livres = new Set(protegidas.map(chave));
  const bombas = structuredClone(desejadas);
  for (const posicao of todasCoordenadas()) {
    if (bombas.length === 40) break;
    if (!usadas.has(chave(posicao)) && !livres.has(chave(posicao))) bombas.push(posicao);
  }
  assert.equal(bombas.length, 40);
  return bombas;
}

export function novoJogo(bombas = BOMBAS_BLOCO) {
  return new CampoMinado({ bombas });
}

export function rejeitaSemAlterar(jogo, acao, mensagem) {
  const antes = { estado: jogo.estado, grade: jogo.inspecionar() };
  assert.throws(acao, mensagem);
  assert.deepEqual({ estado: jogo.estado, grade: jogo.inspecionar() }, antes);
}

export function geradorComSemente(semente) {
  let estado = semente >>> 0;
  return () => {
    estado = (Math.imul(1664525, estado) + 1013904223) >>> 0;
    return estado / 4294967296;
  };
}
