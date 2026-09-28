# Prompt — Deploy SDR Boteco v2.11.1

Atualize o repositório `deyversonsilvaab-cmd/SDR-Boteco-` branch `main` usando o ZIP completo v2.11.1.

Regras:

1. preservar `WEBHOOK_SECRET`, `OPENAI_API_KEY` e demais variáveis da Vercel;
2. manter `.vercelignore` na raiz;
3. dentro de `/api`, manter apenas `manychat.js` como função serverless;
4. rodar `npm run check` e não publicar se houver falha;
5. confirmar `APP_VERSION = "2.11.1"`, `package.json version = 2.11.1` e `knowledge._meta.versao = 2.11.1`;
6. não alterar as automações do Instagram;
7. após deploy, GET `/api/manychat` deve mostrar `version: "2.11.1"` e canais Instagram/WhatsApp.

Validações de WhatsApp após deploy, sempre com `x-webhook-secret`:

- `me manda o cardápio` → `cta_1_type=cardapio`, 1 CTA, sem URL no `reply`;
- `onde fica?` → `cta_1_type=localizacao`, 1 CTA, sem URL no `reply`;
- `quero pedido para retirada` → `cta_1_type=pedido_retirada`, 1 CTA;
- `qual valor da Tábua Mista?` → sem CTA;
- `quero reservar mesa` → `handoff=true`, `marcar_conversa_aberta=true`, sem CTA;
- `quero mandar currículo` → handoff no mesmo WhatsApp, sem link do RH;
- assunto desconhecido → handoff no mesmo WhatsApp, sem URL.

Commit sugerido:

`feat: v2.11.1 whatsapp humano sem redirecionamento e ctas mínimos`
