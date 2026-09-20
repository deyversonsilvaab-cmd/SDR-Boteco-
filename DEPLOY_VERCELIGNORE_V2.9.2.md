# Deploy Vercel Hobby — v2.9.2

O projeto mantém `.vercelignore` na raiz com:

```text
api/**
!api/manychat.js
```

Objetivo: somente `api/manychat.js` deve ser tratado como Function intencional. Isso protege o deploy contra duplicatas antigas que possam permanecer no repositório.

Variáveis de produção esperadas no Vercel:

```env
OPENAI_API_KEY=<valor real somente no Vercel>
OPENAI_MODEL=gpt-5.6-luna
OPENAI_FALLBACK_MODEL=gpt-4o
WEBHOOK_SECRET=<manter valor atual>
BUSINESS_NAME=Sr. Boteco Limeira
```

Após o deploy, `GET /api/manychat` deve informar `version: 2.9.2`, `openai_api: responses`, `model: gpt-5.6-luna` e `fallback_model: gpt-4o`.
