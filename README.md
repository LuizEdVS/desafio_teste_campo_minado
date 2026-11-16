# Desafio — Campo Minado em JavaScript

Campo Minado com **18 colunas, 14 linhas e 40 bombas**, acompanhado de **128 testes automatizados em JavaScript**.

## 1. Concepção do desafio

O desafio consiste em implementar as regras do Campo Minado e comprovar seu funcionamento com testes automatizados. O tabuleiro possui **252 casas**: **40 bombas** e **212 casas seguras**. O jogador deve revelar todas as casas seguras sem abrir uma bomba.

Os testes são escritos em JavaScript e executam diretamente a implementação JavaScript em `src/campo-minado.js`. A avaliação cobre a criação do campo, os números adjacentes, as jogadas, as bandeiras, os erros de entrada e o encerramento da partida.

| Requisito | Como foi atendido |
| --- | --- |
| Explicar a concepção do desafio | Seção 1 deste README |
| Explicar o funcionamento dos casos de teste | Seções 4 e 5 deste README |
| Tabuleiro 18 × 14 com 40 bombas | Configuração fixa do motor e grupos CT01 a CT05 |
| Testes em JavaScript para testar JavaScript | `node:test` e `node:assert/strict` nos arquivos `test/*.test.js` |

O projeto entrega o motor de regras, os testes e uma demonstração no terminal. Uma interface gráfica pode consumir a mesma API futuramente.

## 2. Regras adotadas

- As coordenadas começam em zero: **linha de 0 a 13** e **coluna de 0 a 17**. Os métodos recebem sempre `(linha, coluna)`.
- Cada casa pode ter até oito vizinhos, incluindo as diagonais. Cantos possuem três vizinhos; bordas, cinco.
- Uma casa segura revela um número de 0 a 8, correspondente às bombas vizinhas.
- Abrir zero revela a região vazia conectada e sua fronteira numerada.
- Uma casa com bandeira precisa ser desmarcada antes de ser aberta.
- O jogador vence ao revelar as **212 casas seguras**. Marcar bombas é opcional.

Essas regras de vizinhança, revelação e marcação seguem a descrição do jogo no [manual de Mines, de Simon Tatham](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/doc/mines.html).

### Escolhas específicas deste desafio

| Situação | Comportamento definido |
| --- | --- |
| Primeiro clique em uma bomba | A bomba é transferida para a primeira casa segura sem bandeira, mantendo exatamente 40 bombas. Os números são recalculados. |
| Primeiro clique seguro | As bombas permanecem nas posições originais. |
| Casa inicial numerada | Permitida: a proteção garante segurança, sem garantir um zero. |
| Bandeiras antes da primeira abertura | Permitidas; não consomem a proteção inicial. |
| Limite de bandeiras | 40. O contador representa marcações disponíveis, sem avaliar se estão corretas. |
| Tentar abrir uma casa marcada | Erro; o estado permanece igual. |
| Abrir uma casa já revelada durante a partida | Operação sem efeito; a casa não é contada novamente. |
| Abertura de bomba após a primeira revelação | Derrota imediata; as 40 bombas ficam visíveis no estado público. |
| Estados da partida | `pronto`, `jogando`, `ganhou` ou `perdeu`. |
| Jogadas depois de vitória ou derrota | Bloqueadas; é necessário reiniciar. |
| Reinício com dados inválidos | Erro; a partida anterior é preservada. |

O campo pode ser gerado aleatoriamente ou receber posições fixas para testes. A geração usa uma amostra sem reposição, evitando bombas duplicadas e tentativas de sorteio sem limite. A distribuição aleatória não garante uma solução por dedução sem chutes. O projeto não inclui abertura simultânea de vizinhos por clique em número nem marcação com ponto de interrogação.

## 3. Como executar

Requisito: **Node.js 22 ou superior**. O projeto usa apenas recursos nativos; a instalação de pacotes é dispensada.

Na raiz do projeto:

```sh
node --test
```

Se o npm estiver disponível, o atalho equivalente é:

```sh
npm test
```

Resultado esperado:

```text
tests 128
suites 10
pass 128
fail 0
skipped 0
todo 0
```

Outros comandos:

```sh
# Demonstração com primeiro clique seguro, bandeira, derrota e vitória
node exemplo.js

# Reexecutar os testes ao salvar alterações
node --test --watch

# Executar somente o grupo de vizinhança
node --test --test-name-pattern="CT03"

# Relatório de cobertura com a opção experimental do Node.js
node --test --experimental-test-coverage
```

Os atalhos npm são `npm run demo`, `npm run test:watch` e `npm run test:coverage`. Consulte a [documentação do executor de testes do Node.js](https://nodejs.org/api/test.html) para suas opções.

## 4. Como os casos de teste funcionam

Cada `describe` agrupa uma parte das regras. Cada `it` representa um caso executado. Tabelas geram casos separados para diferentes coordenadas, quantidades de bombas vizinhas e entradas inválidas; o total de 128 inclui essas combinações.

Cada teste segue três etapas:

1. **Preparar:** criar uma partida com posições de bombas conhecidas.
2. **Agir:** revelar uma casa, alternar uma bandeira ou reiniciar.
3. **Verificar:** comparar o resultado real com o esperado usando `assert`.

Exemplo de teste de configuração:

```js
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { CampoMinado } from './src/campo-minado.js';

it('cria 14 linhas, 18 colunas e 40 bombas', () => {
  const jogo = new CampoMinado({ aleatorio: () => 0 });

  assert.equal(jogo.estado.tabuleiro.length, 14);
  assert.ok(jogo.estado.tabuleiro.every(linha => linha.length === 18));
  assert.equal(jogo.inspecionar().flat().filter(casa => casa.bomba).length, 40);
});
```

O exemplo explica a estrutura. As verificações correspondentes já estão nos arquivos de teste.

### Repetibilidade e isolamento

- As partidas dos testes de regras recebem bombas fixas, definidas em `support/fixtures.js`.
- Os testes da geração usam funções controladas ou geradores com semente.
- Cada teste cria sua própria partida; nenhum placar ou tabuleiro é compartilhado.
- Os números esperados são verificados por posições e distâncias conhecidas, incluindo todos os valores de 0 a 8.
- Testes de rejeição comparam o estado público e a grade de diagnóstico antes e depois da tentativa.
- Os testes de integração executam sequências reais até a vitória, a derrota ou o reinício.

Uma falha em qualquer asserção faz o comando terminar com código diferente de zero e reprova a execução no GitHub Actions.

## 5. Catálogo dos casos de teste

| Grupo | Casos | Cobertura | Arquivo |
| --- | ---: | --- | --- |
| CT01 | 5 | Dimensões, 252 casas, 40 bombas, 212 seguras e estado inicial | [tabuleiro.test.js](test/tabuleiro.test.js) |
| CT02 | 19 | Geração sem repetição, sementes, limites do gerador e entradas inválidas | [tabuleiro.test.js](test/tabuleiro.test.js) |
| CT03 | 20 | Cantos, bordas, diagonais, simetria e coordenadas inválidas | [tabuleiro.test.js](test/tabuleiro.test.js) |
| CT04 | 18 | Números de 0 a 8, contagens nos quatro lados e quatro cantos | [tabuleiro.test.js](test/tabuleiro.test.js) |
| CT05 | 16 | Quantidade e posições de bombas, duplicatas e isolamento da entrada | [tabuleiro.test.js](test/tabuleiro.test.js) |
| CT06 | 13 | Revelação, cliques repetidos, retorno dos métodos e rejeição sem mutação | [partida.test.js](test/partida.test.js) |
| CT07 | 8 | Primeiro clique seguro, transferência e recálculo dos números | [partida.test.js](test/partida.test.js) |
| CT08 | 6 | Expansão de zeros, fronteira numerada e casas com bandeira | [partida.test.js](test/partida.test.js) |
| CT09 | 10 | Alternância, limite de 40 bandeiras e contador | [partida.test.js](test/partida.test.js) |
| CT10 | 13 | Vitória, derrota, encerramento, reinício e proteção do estado | [partida.test.js](test/partida.test.js) |
| **Total** | **128** | **10 grupos de testes** | |

### Exemplos de entrada e resultado esperado

| Entrada ou ação | Resultado esperado |
| --- | --- |
| Criar uma partida | 14 linhas × 18 colunas; exatamente 40 bombas |
| Consultar vizinhos de `(0, 0)` | `(0, 1)`, `(1, 0)` e `(1, 1)` |
| Casa central com oito bombas ao redor | Conteúdo revelado igual a `8` |
| Primeiro clique sobre uma bomba | Casa segura; quantidade de bombas permanece 40 |
| Abrir zero | Região conectada e fronteira numerada reveladas |
| Abrir uma casa com bandeira | Erro; nenhuma alteração na partida |
| Colocar a 41ª bandeira | Erro; contador permanece em zero disponíveis |
| Revelar uma bomba após o primeiro clique | Estado `perdeu` e coordenada da explosão registrada |
| Revelar a 212ª casa segura | Estado `ganhou` |
| Tentar revelar linha 14 ou coluna 18 | Erro de coordenada |
| Reiniciar | Casas fechadas, bandeiras zeradas e primeiro clique protegido novamente |

## 6. Organização do projeto

```text
campo-minado/
├── .github/workflows/testes.yml
├── .gitignore
├── README.md
├── VALIDACAO.md
├── exemplo.js
├── package.json
├── src/
│   └── campo-minado.js
├── support/
│   └── fixtures.js
└── test/
    ├── tabuleiro.test.js
    └── partida.test.js
```

## 7. API da implementação

| Exportação | Finalidade |
| --- | --- |
| `CONFIGURACAO` | Configuração fixa e imutável: 18 colunas, 14 linhas e 40 bombas |
| `coordenadaValida(linha, coluna)` | Retorna `true` ou `false` |
| `listarVizinhos(linha, coluna)` | Lista objetos `{ linha, coluna }` ao redor da casa |
| `gerarBombas(aleatorio = Math.random)` | Gera 40 posições distintas dentro dos limites |
| `new CampoMinado({ bombas, aleatorio } = {})` | Cria uma partida com posições fornecidas ou geração aleatória |

Cada posição de bomba é um objeto como `{ linha: 2, coluna: 4 }`. A lista, quando fornecida, precisa ter exatamente 40 posições válidas e diferentes.

| Recurso da partida | Comportamento |
| --- | --- |
| `jogo.estado` | Cópia do estado do jogador: tabuleiro, contadores, status e explosão |
| `jogo.revelar(linha, coluna)` | Abre uma casa e realiza a expansão quando seu número é zero |
| `jogo.alternarBandeira(linha, coluna)` | Coloca ou remove uma bandeira |
| `jogo.reiniciar({ bombas, aleatorio } = {})` | Cria um novo campo e limpa todo o progresso |
| `jogo.inspecionar()` | Cópia completa da grade para diagnóstico e testes locais |

No estado público, cada casa contém `{ revelada, bandeira, conteudo }`. O conteúdo é `null` enquanto oculto, um número de `0` a `8` quando revelado ou `'bomba'` quando exibido após derrota. A interface do jogador deve usar `estado`; `inspecionar()` permite conferir as bombas nos testes e no diagnóstico.

Os métodos que alteram o jogo retornam o estado atualizado como uma cópia. Entradas e ações inválidas geram `Error`, sem modificar a partida.

## 8. Repositório e integração contínua

Repositório: [LuizEdVS/desafio_teste_campo_minado](https://github.com/LuizEdVS/desafio_teste_campo_minado).

```sh
git clone https://github.com/LuizEdVS/desafio_teste_campo_minado.git
cd desafio_teste_campo_minado
node --test
```

O workflow `.github/workflows/testes.yml` executa os testes e a demonstração em **Node.js 22 e 24** a cada push e pull request. Os resultados ficam disponíveis na aba [Actions](https://github.com/LuizEdVS/desafio_teste_campo_minado/actions).
