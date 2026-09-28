# Prompt — Deploy SDR Boteco v2.11.0 (Instagram + WhatsApp no mesmo webhook Vercel)

Você é engenheiro sênior responsável pelo webhook `sdr-boteco` (Node 18+, Vercel, ESM). Faça o deploy da versão v2.11.0 a partir do arquivo `sdr-boteco-v2.11.0.zip`, mantendo o Instagram exatamente como está em produção.

## Passos
1. Descompacte `sdr-boteco-v2.11.0.zip` sobre o repositório `deyversonsilvaab-cmd/SDR-Boteco-` (branch `main`), substituindo os arquivos. Não apague variáveis de ambiente nem o `vercel.json`.
2. Rode `npm run check`. Todos os testes precisam passar (inclui `funil-tests.mjs` e `whatsapp-recepcao-tests.mjs`). Se algum falhar, pare e reporte o nome do teste e a saída — não altere teste para "passar".
3. Confira que `api/manychat.js` tem `APP_VERSION = "2.11.0"`.
4. Commit: `feat: v2.10.0–v2.11.0 funil IG, sem 99Food, WhatsApp recepção + conversa aberta` e push na `main` (deploy automático na Vercel, projeto `sdr-boteco`).
5. Na Vercel, confirme as variáveis: `OPENAI_API_KEY`, `WEBHOOK_SECRET` (inalterada) e, opcional, `HUMAN_PAUSE_HOURS=12`.
6. Depois do deploy, valide:
   - `GET https://sdr-boteco.vercel.app/api/manychat` → `version: "2.11.0"` e `channels: ["instagram","whatsapp"]`.
   - `POST` com `{"channel":"instagram","message":"Oi. Quero saber sobre a Tábua Mista.","first_name":"Teste"}` → botões Reservar mesa / Cardápio / Como chegar, sem 99Food.
   - `POST` com `{"channel":"whatsapp","message":"Olá! Quero reservar uma mesa no Sr. Boteco","first_name":"Teste"}` → `handoff: true`, `marcar_conversa_aberta: true` e resposta SEM as palavras direcionar/encaminhar/equipe/atendente/botão.
   - `POST` com `{"channel":"whatsapp","message":"Quero receber o cardápio e as promoções do Sr. Boteco no WhatsApp","first_name":"Teste"}` → `optin_promocoes: "true"`.
   - `POST` com `{"channel":"whatsapp","message":"parar","first_name":"Teste"}` → `optin_promocoes: "false"`.
   (Envie o header `x-webhook-secret` nos POSTs.)

## Não alterar
- Endpoint `/api/manychat`, `WEBHOOK_SECRET`, automações publicadas do Instagram no ManyChat, CTAs `cta_1/2/3`, avaliação 1–5, cardápio/preços/promoções do `knowledge.json`.
- Não usar IA nativa do ManyChat em nenhuma etapa.

## Relatório final
Informe: hash do commit, URL do deploy, resultado de `npm run check` e das 5 validações acima.
