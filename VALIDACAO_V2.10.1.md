# Validação v2.10.1

- Versão webhook: `2.10.1`
- Versão package: `2.10.1`
- Versão knowledge: `2.10.1`
- Catálogo: 141 itens / 17 categorias
- OpenAI: Responses API, modelo principal configurável via `OPENAI_MODEL`
- `.vercelignore`: preservado
- Pasta `/api`: somente `manychat.js`
- Testes: 250 PASS / 0 FAIL

Casos adicionais cobertos:

- `Parou o happy?` → promoção de chopp
- `happy birthday` → não vira promoção de chopp
- Tábua Mista → próximo passo com reserva, sem promessa automática
- Água/Molho → sem CTA artificial de reserva
- Horário → Como chegar + Promoções no Whats
- Visita confirmada → Como chegar + Promoções no Whats
- Marmita → Pedido direto + iFood + 99Food
- Frustração com robô → Falar no WhatsApp
