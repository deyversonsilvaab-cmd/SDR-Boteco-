# v2.9.6 — Endereço no anúncio, cliente irritado com robô e fallback sem repetição

Caso real (DM do Instagram, resposta a anúncio):
1. "Faltou o endereço né véio..." → antes caía em **reclamação** ("Foi mal… fala com a equipe").
2. "O dever é da administração" → fallback genérico.
3. "Não sou robô pra trocar msg com robô" → **o mesmo fallback repetido**.

## O que mudou
- **Endereço completo na base**: `empresa.endereco_completo` = R. Carlos Gomes, 1321 - Centro, Limeira - SP (Pátio Limeira Shopping). Toda resposta de localização passa a trazer a rua + botão **Como chegar**.
- **"Faltou/esqueceu/não colocaram o endereço (ou horário)"** → responde a informação na hora ("Foi mal, faltou mesmo! Ficamos no…"). Não é mais tratado como reclamação. Problema de pedido ("pedido veio faltando molho") continua reclamação.
- **Frustração com robô** (`humano_frustracao`): "não sou robô…", "quero falar com uma pessoa" → assume e oferece a equipe (botão **Falar no WhatsApp**). Pergunta "vocês são robô?" → resposta transparente: atendimento automático + opção de falar com pessoa.
- **Crítica curta** (`feedback_critica` / `feedback_critica_local`): "o dever é da administração", "descaso", "deveriam ter colocado…" → reconhece ("Tem razão, valeu pelo toque") e, se o assunto era endereço, repete o endereço com **Como chegar**.
- **Fallback nunca repete**: se a última resposta já foi fallback (`last_intent = outro`, `last_topic = fallback` ou `last_bot_reply`), a próxima vira `outro_repetido` e passa pra equipe.
- Novas intenções são determinísticas (a IA não reescreve).
- WhatsApp: "faltou o endereço" responde o endereço em vez de abrir handoff de reclamação.

## ManyChat
Nada novo obrigatório. Confirme apenas que o External Request envia `last_intent` ({{ai_intent}}), `last_topic` ({{ai_topic}}) e, se possível, `last_bot_reply` ({{ai_reply}}) — é isso que ativa o anti-repetição e o contexto da crítica.
Os CTAs continuam vindo por `cta_type/cta_label/cta_url` (localizacao → Como chegar; whatsapp → Falar no WhatsApp).

## Testes
`address-bot-tests.mjs` (13 casos) incluído em `npm run check`. Suíte completa passando.
