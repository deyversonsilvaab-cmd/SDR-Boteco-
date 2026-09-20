# SDR Sr. Boteco — v2.9.1 — Fallback Instagram consolidado

## Objetivo
Corrigir os fallbacks do Instagram que ficavam com texto quebrado depois que URLs passaram a ser removidas do corpo da mensagem e renderizadas como botões do ManyChat.

## Alterações
- `outro`: resposta limpa e CTA **Falar no WhatsApp**.
- `sem_mensagem`: resposta limpa e CTA **Falar no WhatsApp**.
- `erro_seguro`: resposta de instabilidade limpa e CTA **Falar no WhatsApp**.
- A v2.9.1 consolidada garante que a frase "pelo botão abaixo" nunca seja enviada sem o CTA correspondente.
- WhatsApp continua com links no corpo quando aplicável.

## Frentes preservadas
- 141 itens / 17 categorias do catálogo.
- Cardápio Fitness.
- Pratos do Dia e almoço segunda a sexta, 11h–15h.
- Avaliação 1–5 + Google para nota 5.
- Promoções de chopp e Burger em Dobro, inclusive fluxo interativo.
- CTA contextual do Instagram.
- iFood / 99Food / pedido direto.
- Comentários, Stories, RH, WhatsApp, handoff humano e guardrails.

## Testes
A suíte `fallback-tests.mjs` cobre fallback desconhecido, mensagem vazia, erro fatal controlado, preservação do WhatsApp e versão do health check.
