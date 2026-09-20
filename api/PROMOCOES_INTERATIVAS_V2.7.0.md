# SDR Sr. Boteco — v2.7.0 — Promoções unificadas + interação de Burger

## Objetivo

Melhorar a apresentação das promoções sem alterar preços, cardápio, WhatsApp, comentários, handoff ou CTAs já validados.

## Nova lógica

### Promoção/oferta genérica

Quando o cliente perguntar de forma genérica por `promoção`, `promoções`, `oferta` ou `ofertas`, o bot apresenta **todas as promoções comerciais ativas cadastradas** em uma única resposta:

1. **Burger em Dobro** — terça-feira, a partir das 16h: paga 1 e leva 2 do mesmo burger.
2. **Promoção de Chopp** — todos os dias a partir de R$ 9,90; sábado e domingo, das 16h às 20h, caneca 340 ml de Chopp Ashby e/ou Brahma por R$ 3,99, com aviso de consultar disponibilidade no local.

A resposta termina convidando o cliente a escolher `burger` ou `chopp` para receber os detalhes de uma promoção específica.

### Promoções específicas

- `promoção de burger`, `lanche em dobro`, `terça em dobro`, `paga 1 leva 2` etc. → somente **Burger em Dobro**.
- `promoção de chopp`, `chopp`, `chope`, `Brahma`, `Ashby`, `happy hour` → somente **Promoção de Chopp**.

### Burger / lanche com preço normal + convite

Quando a pessoa pergunta por burger/lanche sem pedir promoção:

1. o bot informa os **preços normais do cardápio**;
2. não despeja a promoção completa de imediato;
3. pergunta: `Já conhece nossa promoção de terça-feira? Se quiser, me responde ‘sim’ que eu te explico como funciona.`

Se a mensagem seguinte demonstrar interesse (`sim`, `quero saber`, `como funciona`, `me explica` etc.), o bot usa o contexto salvo pelo ManyChat (`last_bot_reply`) e responde em uma **nova mensagem** com a promoção completa.

Se a pessoa responder `não`, a conversa segue sem insistência.

## Regras preservadas

- 131 itens / 16 categorias.
- Pratos do Dia: segunda a sexta, 11h às 15h.
- Fondue doce permanece fora do catálogo ativo.
- Promoção de chopp e seus guardrails permanecem intactos.
- CTA contextual do Instagram permanece ativo.
- WhatsApp/handoff, comentários, RH, segurança e Dynamic Block permanecem preservados.
- Nenhuma promoção é marcada como ativa "agora" com base no relógio do servidor.
