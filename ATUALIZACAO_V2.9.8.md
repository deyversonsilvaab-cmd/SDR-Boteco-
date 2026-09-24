# v2.9.8 — Marmita e retirada no balcão

Caso real: "Bommmm diaaaa🙏 Vocês fazem marmitas?" caía no fallback.

## Resposta oficial (definida pelo Michel)
"Fazemos sim! Você pode pedir com entrega pelo iFood ou pelo 99Food, ou fazer o pedido no nosso cardápio digital, finalizar e retirar no nosso balcão, que a gente deixa pronto."

- Intenção `marmita`: marmita, marmitex, marmitinha, quentinha, comida pra levar, pra viagem.
- Intenção `retirada_balcao`: "posso pegar/retirar/buscar no balcão", "retirar aí" → "Pode sim! Faz o pedido no cardápio digital, finaliza e retira no balcão…".
- Instagram: 3 botões — **Pedir e retirar** (cardápio digital SAIPOS), **iFood**, **99Food** (`ctas[0..2]`). Sem URL no texto.
- WhatsApp: os três links vão no texto.
- Respostas determinísticas (a IA não reescreve).
- Saudação esticada "Bommmm diaaaa" também é reconhecida.

## ManyChat
Nada obrigatório. Para mostrar os 3 botões, use `ctas[0]`, `ctas[1]`, `ctas[2]` (label/url); se o fluxo usa só `cta_url`, aparece **Pedir e retirar**.

## Testes
`marmita-tests.mjs` incluído em `npm run check`.
