# Revisão final de produção — SDR Boteco v2.11.2

- Instagram preservado, sem mudança na lógica de CTAs já existente.
- WhatsApp atualizado para atendimento em um único canal: informação conhecida é respondida; casos humanos permanecem na mesma conversa.
- Reserva, reclamação, pedido de pessoa, vaga/currículo, negociação/evento e assunto não validado retornam `handoff=true`, `marcar_conversa_aberta=true` e nenhum CTA externo.
- URLs removidas do texto do WhatsApp.
- Links de WhatsApp, RH, iFood, Google Review e 99Food ficam vazios no payload do canal WhatsApp para impedir reaproveitamento indevido por blocos antigos.
- Cardápio/Maps também ficam vazios por padrão e só são liberados no payload quando existe CTA permitido naquela mensagem.
- CTAs permitidos no WhatsApp: `cardapio`, `localizacao`, `pedido_retirada`.
- Item/preço, promoção, horário, pagamento, delivery e avaliação não recebem botão automático no WhatsApp.
- Pedido genérico pergunta se é retirada ou entrega antes de oferecer ação.
- Vaga/currículo não envia mais para outro WhatsApp no canal WhatsApp; o currículo pode ser enviado na própria conversa.
- Pausa humana por `atendimento_humano` e expiração por `HUMAN_PAUSE_HOURS` preservadas.
- Catálogo preservado: 141 itens / 17 categorias, incluindo Fitness e Pratos do Dia.
- IA integrada/guardrails preservados.
- `APP_VERSION`, `package.json` e `knowledge._meta.versao` alinhados em `2.11.1`.
- `npm run check`: 281 linhas PASS / 0 FAIL na validação consolidada.
- `.vercelignore` preservado para deploy Hobby.

- Botão de retirada agora é `Pedir para retirar` (18 caracteres).
- ManyChat não precisa criar/mapear `ai_marcar_aberta`; `ai_handoff` é a condição única do atendimento humano.
- Feedback do pedido no WhatsApp não deve exibir CTA Google Review.
