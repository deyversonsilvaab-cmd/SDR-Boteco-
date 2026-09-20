# Deploy Vercel Hobby — v2.9.1

Este pacote mantém o projeto completo e adiciona `.vercelignore` na raiz para impedir que arquivos JavaScript/MJS duplicados dentro de `/api` sejam tratados como Vercel Functions.

## Regra aplicada

```text
api/**
!api/manychat.js
```

Com isso, no deploy a única Function da pasta `/api` deve ser:

```text
api/manychat.js
```

A aplicação continua utilizando:
- `lib/persona.js` na raiz;
- `data/knowledge.json` na raiz;
- `package.json` e `vercel.json` na raiz.

O `.vercelignore` não altera a lógica do bot. Ele apenas controla quais arquivos entram no deployment da Vercel.

## Verificação após commit/deploy

1. Commitar o conteúdo na branch `main`.
2. Aguardar o deploy automático da Vercel.
3. Abrir `https://sdr-boteco.vercel.app/api/manychat`.
4. Confirmar `version: "2.9.1"`.

Recomendação posterior: limpar as duplicatas existentes dentro de `/api` no GitHub para manter o repositório organizado, mesmo que o `.vercelignore` já impeça que elas virem Functions.
