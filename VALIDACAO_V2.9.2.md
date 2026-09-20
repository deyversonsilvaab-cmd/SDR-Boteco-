# Validação — SDR Boteco v2.9.2

- `npm run check`: PASS.
- 156 verificações `PASS` registradas nas suítes.
- 0 verificações `FAIL`.
- `node --check api/manychat.js`: PASS.
- `node --check lib/persona.js`: PASS.
- Catálogo: 141 itens / 17 categorias.
- Avaliação 1–5: preservada.
- Cardápio Fitness: preservado.
- Promoções: preservadas.
- Instagram/WhatsApp/handoff: preservados.
- Fallbacks v2.9.1: preservados.
- OpenAI: Responses API validada com mock local, sem uso de chave real.
- Modelo padrão: `gpt-5.6-luna`.
- Fallback: `gpt-4o`.
- Degradação segura: se a OpenAI falhar, resposta determinística continua funcionando.
- Correção adicional: `Olá` não cai na busca fuzzy de refrigerante.
