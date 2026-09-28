# v2.10.1 — 99Food fora do bot (ainda não está no ar)

- Removido o 99Food de todas as respostas e botões: marmita, retirada no balcão, delivery, cardápio e pedido.
  - Instagram: marmita/retirada = **Pedir e retirar** + **iFood**; delivery = **Pedido direto** + **iFood**.
  - WhatsApp: links só do cardápio digital e do iFood no texto.
- Nova intenção `food99_indisponivel`: "tem no 99food?" → "Ainda não estamos no 99Food. Por enquanto, dá pra pedir com entrega pelo iFood ou fazer o pedido no cardápio digital e retirar no balcão." + botões Pedido direto / iFood.
- `knowledge.json`: `links.food99` removido e regra da IA atualizada ("nunca oferecer 99Food"). `persona.js` também proíbe citar 99Food.
- Para reativar quando a loja entrar no ar: recadastrar `links.food99` no knowledge.json e voltar os textos/botões (ver diff desta versão).

ManyChat: nada a mudar — o fluxo monta os botões por `ai_cta_count`.
Testes: `npm run check` — todos passando.
