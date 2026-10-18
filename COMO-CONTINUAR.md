# Náutilo · código-fonte

Este ramo (`codigo-fonte`) tem o código do Náutilo. O ramo `main` tem só o site publicado (gerado a partir daqui).

## Gerar o site
```
./standalone/build.sh && python3 standalone/single.py   # cria dist-gh/ (a versão sobe sozinha)
```
As notas da versão vão em `standalone/notes.txt` (uma por linha).

## Testar
```
NODE_PATH=$(npm root -g) node standalone/test/suite.js   # ~13 min, Playwright
```

## Publicar
Copiar o conteúdo de `dist-gh/` para a raiz do ramo `main` (manter o `vercel.json`) e enviar.
A Vercel (projeto `oceanum`, endereço https://oceanum-movaa.vercel.app) publica a partir do GitHub.
