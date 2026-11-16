import { CampoMinado } from './src/campo-minado.js';

function mostrar(jogo) {
  const estado = jogo.estado;
  console.log(`\nTabuleiro: ${estado.colunas} × ${estado.linhas}; bombas: ${estado.totalBombas}.`);
  for (const linha of estado.tabuleiro) {
    console.log(linha.map(casa => casa.bandeira ? 'F'
      : casa.conteudo === 'bomba' ? '*'
        : casa.conteudo === null ? '#'
          : casa.conteudo === 0 ? '.' : String(casa.conteudo)).join(' '));
  }
  console.log(`Estado: ${estado.status}. Seguras reveladas: ${estado.segurasReveladas}/212.`);
  console.log(`Bandeiras disponíveis: ${estado.bandeirasDisponiveis}.`);
}

// O gerador constante deixa a demonstração reproduzível.
const jogo = new CampoMinado({ aleatorio: () => 0 });
console.log('Legenda: # fechada; F bandeira; * bomba; . zero.');
console.log('Coordenadas: (linha, coluna), começando em zero.');

jogo.revelar(0, 0);
console.log('Primeiro clique em (0, 0): protegido. A casa mostra o número 3.');
jogo.alternarBandeira(0, 1);
console.log('Bandeira colocada em (0, 1).');
mostrar(jogo);

jogo.revelar(0, 2);
console.log('\nUma bomba foi aberta em (0, 2).');
mostrar(jogo);

jogo.reiniciar();
jogo.revelar(13, 17);
console.log('\nApós reiniciar, a expansão de uma área vazia revela as 212 casas seguras.');
console.log(`Resultado: ${jogo.estado.status}; ${jogo.estado.segurasReveladas} casas seguras reveladas.`);
