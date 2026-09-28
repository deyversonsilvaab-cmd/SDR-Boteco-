# v2.11.1 — WhatsApp humano, sem redirecionamento e CTAs mínimos

Esta versão refina o WhatsApp sem alterar o comportamento do Instagram.

## Objetivo

O WhatsApp funciona como uma recepção única do Sr. Boteco:

1. recebe a pessoa de forma natural;
2. entende o assunto;
3. responde quando a informação está validada na base;
4. quando não sabe ou o caso exige uma pessoa, mantém a conversa aberta no MESMO WhatsApp para resposta humana;
5. nunca encaminha o cliente para outro número, outro WhatsApp, site, app, perfil ou canal para resolver atendimento humano.

## Botões no WhatsApp

Só podem aparecer quando realmente necessários ou pedidos:

- **Ver cardápio** — quando a pessoa pede cardápio/menu;
- **Como chegar** — quando pede endereço/localização/rota;
- **Fazer pedido para retirada** — quando a retirada no balcão é explícita.

Todos os demais assuntos retornam `cta_count = 0`.

Não há botão automático para:

- preço de item;
- promoções;
- horário;
- pagamento;
- delivery;
- iFood;
- avaliação;
- reserva;
- reclamação;
- vagas;
- negociação/eventos;
- pedido de atendimento humano;
- informação não encontrada.

## Atendimento humano sem redirecionamento

Os casos abaixo retornam `handoff=true`, `next_action="handoff_humano"` e `marcar_conversa_aberta=true`:

- reserva;
- reclamação/cancelamento/estorno;
- pedido explícito por pessoa;
- vaga/currículo;
- orçamento, grande quantidade, evento e negociação;
- informação não validada/assunto desconhecido;
- falha segura quando necessário.

O texto ao cliente não usa linguagem como "vou encaminhar", "vou direcionar", "fale com a equipe" ou "chame outro número".

## Links

No texto do WhatsApp, URLs de ação são removidas.

Além disso, os campos de destinos que não são permitidos no WhatsApp são zerados:

- `whatsapp_link = ""`
- `whatsapp_vagas_link = ""`
- `ifood_link = ""`
- `google_review_link = ""`
- `food99_link = ""`

`cardapio_link` e `maps_link/localizacao_link` continuam disponíveis somente para formar os três CTAs permitidos.

## Pedido

- "quero fazer um pedido" → pergunta se é retirada ou entrega, sem botão;
- "quero fazer um pedido para retirada" → botão **Fazer pedido para retirada**;
- delivery → informa que a entrega é pelo iFood, sem botão/link automático.

## Vaga

No WhatsApp, vaga não manda mais para outro número de RH. A pessoa pode enviar currículo e informar a função na própria conversa; o atendimento fica aberto para continuidade humana.

## Testes

Foi adicionada a suíte `whatsapp-fluxo-tests.mjs`, cobrindo recepção, informação conhecida, CTAs mínimos, handoff local, ausência de URLs e não redirecionamento.
