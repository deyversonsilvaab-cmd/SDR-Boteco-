# v2.10.0 — Funil: próximo passo, visita confirmada e captação de WhatsApp

Baseado nas conversas reais do direct (set/2026).

## O que mudou
1. **Visita confirmada** (`visita_confirmada`): "Logo vou fazer uma visita", "vou passar aí sábado", "sábado tô aí com a galera", "amanhã vou conhecer".
   Antes caía no fallback "Quero te passar a informação certa…". Agora responde:
   > Oba, vai ser um prazer te receber! 🍻 + endereço + convite para receber cardápio/promoções no WhatsApp.
   Botões: **Como chegar** + **Promoções no Whats**.
   Perguntas ("vou passar aí, tem estacionamento?") continuam indo para a intenção certa.
2. **"Parou o happy?"**: agora é `promocao_chopp` (antes fallback).
3. **Depois do preço sempre tem próximo passo** (`item_cardapio`, exceto pratos do almoço):
   texto termina com "Bora vir provar? Te separo uma mesa…" e botões **Reservar mesa**, **Cardápio**, **Como chegar**.
   Pratos do almoço: **Cardápio** + **Como chegar**.
4. **Promoção de chopp**: **Reservar mesa** + **Como chegar** + **Promoções no Whats**.
5. **Endereço**: **Como chegar** + **Promoções no Whats**.

## Captação de WhatsApp (opt-in)
O botão **Promoções no Whats** abre o WhatsApp do restaurante (19 99785-8351) com a mensagem pronta
"Quero receber o cardápio e as promoções do Sr. Boteco no WhatsApp". Quando o cliente envia, ele mesmo dá o opt-in.
**Reservar mesa** abre o mesmo WhatsApp com "Olá! Quero reservar uma mesa no Sr. Boteco".
Links editáveis em `knowledge.json` → `links.whatsapp_optin` e `links.whatsapp_reserva`.

## ManyChat
Nada obrigatório: o fluxo já monta 1/2/3 botões por `ai_cta_count` e `ai_cta_N_label/url`.
Novos tipos de CTA: `reserva`, `whatsapp_optin`.

## Testes
`npm run check` — todos passando (novo: `funil-tests.mjs`).
