# SDR Sr. Boteco — v2.3.0 — Promoção de Chopp

## Fonte oficial cadastrada

- Todos os dias: chopp a partir de **R$ 9,90**.
- Sábado e domingo, das **16h às 20h**: caneca de **340 ml** de **Chopp Ashby e/ou Chopp Brahma** por **R$ 3,99 a caneca**.
- Aviso obrigatório: **consultar disponibilidade no local**.

## Comportamento

- `chopp`, `chope`, `chopinho`, `happy hour`, `promoção`, `Chopp Brahma` e `Chopp Ashby` usam a intenção `promocao_chopp`.
- O webhook **não calcula se a promoção está ativa agora**; apenas informa a janela oficial.
- A promoção de hambúrguer em dobro continua com prioridade própria.
- Os **122 itens / 15 categorias** do cardápio foram preservados.
- Instagram, WhatsApp, Dynamic Block, handoff, silêncio humano, RH e comentários continuam preservados.

## Segurança

- Preços e horários da promoção entram na fonte oficial e passam pelos mesmos guardrails de preço e fatos objetivos.
- A resposta sempre inclui a orientação de consultar disponibilidade no local.
- Nenhuma lógica de estoque ou disponibilidade em tempo real foi adicionada.

## Testes

`npm run check` inclui a nova suíte `promo-tests.mjs` junto das suítes anteriores.
