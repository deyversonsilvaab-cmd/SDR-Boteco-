# Deploy limpo Vercel — SDR Boteco v2.9.1

Este pacote contém somente os arquivos necessários para produção.

Estrutura correta:

- api/manychat.js
- data/knowledge.json
- lib/persona.js
- package.json
- vercel.json
- .env.example
- .gitignore

IMPORTANTE: dentro da pasta `api/` deve existir SOMENTE `manychat.js`.
Não envie testes, documentação, `package.json`, `vercel.json`, `lib/`, `data/` ou outra pasta `api/` para dentro de `api/`.

A Vercel transforma arquivos `.js`, `.mjs` e `.ts` dentro de `/api` em Functions. No plano Hobby há limite de 12 Functions por deploy. O repositório atual tinha diversos testes e uma cópia aninhada do projeto dentro de `/api`, gerando mais de 12 Functions.

Depois de limpar o repositório, o deploy deve gerar somente o endpoint `/api/manychat`.
