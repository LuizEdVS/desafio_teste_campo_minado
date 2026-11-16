# Validação local

Verificação realizada em 16/11/2026, no Windows, com Node.js `v24.22.1`.

Comando executado na raiz do projeto:

```sh
node --test
```

Resultado:

```text
tests 128
suites 10
pass 128
fail 0
cancelled 0
skipped 0
todo 0
```

A suíte verifica o tabuleiro de 18 colunas por 14 linhas, exatamente 40 bombas e 212 casas seguras. Também cobre todos os números de 0 a 8, os quatro cantos, as quatro bordas, primeiro clique seguro, expansão de zeros, bandeiras, vitória, derrota, reinício e rejeição de ações inválidas sem alteração do estado.

Também foi executado `node exemplo.js`, demonstrando primeiro clique protegido, bandeira, derrota por bomba e vitória após reinício com 212 casas seguras reveladas.

O workflow executa os testes em Node.js 22 e 24. Os resultados da integração contínua ficam na aba [Actions do repositório](https://github.com/LuizEdVS/desafio_teste_campo_minado/actions).
