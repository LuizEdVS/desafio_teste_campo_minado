export const CONFIGURACAO = Object.freeze({
  colunas: 18, linhas: 14, bombas: 40, casas: 252, seguras: 212,
});

function exigir(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

export function coordenadaValida(linha, coluna) {
  return Number.isInteger(linha) && linha >= 0 && linha < CONFIGURACAO.linhas
    && Number.isInteger(coluna) && coluna >= 0 && coluna < CONFIGURACAO.colunas;
}

function validarCoordenada(linha, coluna) {
  exigir(coordenadaValida(linha, coluna), 'Coordenada inválida: linha de 0 a 13 e coluna de 0 a 17.');
}

export function listarVizinhos(linha, coluna) {
  validarCoordenada(linha, coluna);
  const vizinhos = [];
  for (let dl = -1; dl <= 1; dl += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if ((dl !== 0 || dc !== 0) && coordenadaValida(linha + dl, coluna + dc)) {
        vizinhos.push({ linha: linha + dl, coluna: coluna + dc });
      }
    }
  }
  return vizinhos;
}

// Amostra sem reposição: termina mesmo quando o gerador sempre retorna zero.
export function gerarBombas(aleatorio = Math.random) {
  exigir(typeof aleatorio === 'function', 'O gerador aleatório deve ser uma função.');
  const indices = Array.from({ length: CONFIGURACAO.casas }, (_, i) => i);
  const bombas = [];
  for (let i = 0; i < CONFIGURACAO.bombas; i += 1) {
    const sorteio = aleatorio();
    exigir(typeof sorteio === 'number' && Number.isFinite(sorteio)
      && sorteio >= 0 && sorteio < 1, 'O gerador deve retornar um número entre 0, inclusive, e 1, exclusive.');
    const escolhido = i + Math.floor(sorteio * (indices.length - i));
    [indices[i], indices[escolhido]] = [indices[escolhido], indices[i]];
    bombas.push({ linha: Math.floor(indices[i] / CONFIGURACAO.colunas), coluna: indices[i] % CONFIGURACAO.colunas });
  }
  return bombas;
}

function validarBombas(bombas) {
  exigir(Array.isArray(bombas) && bombas.length === CONFIGURACAO.bombas, 'Informe exatamente 40 bombas.');
  const posicoes = new Set();
  for (const bomba of bombas) {
    exigir(bomba !== null && typeof bomba === 'object', 'Posição de bomba inválida.');
    validarCoordenada(bomba.linha, bomba.coluna);
    const chave = `${bomba.linha},${bomba.coluna}`;
    exigir(!posicoes.has(chave), 'As bombas devem ocupar posições diferentes.');
    posicoes.add(chave);
  }
}

function recalcularNumeros(grade) {
  for (let linha = 0; linha < CONFIGURACAO.linhas; linha += 1) {
    for (let coluna = 0; coluna < CONFIGURACAO.colunas; coluna += 1) {
      const casa = grade[linha][coluna];
      casa.adjacentes = casa.bomba ? 0 : listarVizinhos(linha, coluna)
        .filter(v => grade[v.linha][v.coluna].bomba).length;
    }
  }
}

function criarGrade(bombas) {
  validarBombas(bombas);
  const grade = Array.from({ length: CONFIGURACAO.linhas }, () =>
    Array.from({ length: CONFIGURACAO.colunas }, () => ({
      bomba: false, revelada: false, bandeira: false, adjacentes: 0,
    })));
  for (const { linha, coluna } of bombas) grade[linha][coluna].bomba = true;
  recalcularNumeros(grade);
  return grade;
}

export class CampoMinado {
  #grade;
  #aleatorio = Math.random;
  #status;
  #segurasReveladas;
  #bandeiras;
  #primeiraRevelacaoPendente;
  #explosao;

  constructor(opcoes = {}) {
    this.reiniciar(opcoes);
  }

  get estado() {
    return structuredClone({
      colunas: CONFIGURACAO.colunas,
      linhas: CONFIGURACAO.linhas,
      totalCasas: CONFIGURACAO.casas,
      totalBombas: CONFIGURACAO.bombas,
      totalSeguras: CONFIGURACAO.seguras,
      status: this.#status,
      segurasReveladas: this.#segurasReveladas,
      bandeiras: this.#bandeiras,
      bandeirasDisponiveis: CONFIGURACAO.bombas - this.#bandeiras,
      primeiraRevelacaoPendente: this.#primeiraRevelacaoPendente,
      explosao: this.#explosao,
      tabuleiro: this.#grade.map(linha => linha.map(casa => ({
        revelada: casa.revelada,
        bandeira: casa.bandeira,
        conteudo: casa.revelada || (this.#status === 'perdeu' && casa.bomba)
          ? (casa.bomba ? 'bomba' : casa.adjacentes) : null,
      }))),
    });
  }

  // Diagnóstico para testes locais. A interface do jogador deve usar estado.
  inspecionar() {
    return structuredClone(this.#grade);
  }

  reiniciar({ bombas, aleatorio = this.#aleatorio } = {}) {
    exigir(typeof aleatorio === 'function', 'O gerador aleatório deve ser uma função.');
    // Prepara e valida tudo antes de substituir uma partida existente.
    const grade = criarGrade(bombas === undefined ? gerarBombas(aleatorio) : bombas);
    this.#grade = grade;
    this.#aleatorio = aleatorio;
    this.#status = 'pronto';
    this.#segurasReveladas = 0;
    this.#bandeiras = 0;
    this.#primeiraRevelacaoPendente = true;
    this.#explosao = null;
    return this.estado;
  }

  #exigirAtivo() {
    exigir(this.#status !== 'ganhou' && this.#status !== 'perdeu', 'A partida já terminou. Reinicie para jogar novamente.');
  }

  #protegerPrimeiroClique(linha, coluna) {
    if (!this.#grade[linha][coluna].bomba) return;
    // Transfere somente a bomba clicada para a primeira casa livre sem bandeira.
    for (const casas of this.#grade) {
      const destino = casas.find(casa => !casa.bomba && !casa.bandeira);
      if (destino) {
        destino.bomba = true;
        this.#grade[linha][coluna].bomba = false;
        recalcularNumeros(this.#grade);
        return;
      }
    }
  }

  #abrirArea(linha, coluna) {
    const pendentes = [{ linha, coluna }];
    while (pendentes.length > 0) {
      const atual = pendentes.pop();
      const casa = this.#grade[atual.linha][atual.coluna];
      if (casa.revelada || casa.bandeira || casa.bomba) continue;
      casa.revelada = true;
      this.#segurasReveladas += 1;
      if (casa.adjacentes === 0) pendentes.push(...listarVizinhos(atual.linha, atual.coluna));
    }
  }

  revelar(linha, coluna) {
    validarCoordenada(linha, coluna);
    this.#exigirAtivo();
    const casa = this.#grade[linha][coluna];
    exigir(!casa.bandeira, 'Remova a bandeira antes de revelar a casa.');
    if (casa.revelada) return this.estado;
    if (this.#primeiraRevelacaoPendente) {
      this.#protegerPrimeiroClique(linha, coluna);
      this.#primeiraRevelacaoPendente = false;
    }
    this.#status = 'jogando';
    if (casa.bomba) {
      casa.revelada = true;
      this.#explosao = { linha, coluna };
      this.#status = 'perdeu';
    } else {
      this.#abrirArea(linha, coluna);
      if (this.#segurasReveladas === CONFIGURACAO.seguras) this.#status = 'ganhou';
    }
    return this.estado;
  }

  alternarBandeira(linha, coluna) {
    validarCoordenada(linha, coluna);
    this.#exigirAtivo();
    const casa = this.#grade[linha][coluna];
    exigir(!casa.revelada, 'Uma casa revelada não pode receber bandeira.');
    if (casa.bandeira) {
      casa.bandeira = false;
      this.#bandeiras -= 1;
    } else {
      exigir(this.#bandeiras < CONFIGURACAO.bombas, 'O limite é de 40 bandeiras.');
      casa.bandeira = true;
      this.#bandeiras += 1;
    }
    return this.estado;
  }
}
