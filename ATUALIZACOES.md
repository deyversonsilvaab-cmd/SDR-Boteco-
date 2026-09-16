# Atualizações

## 2.3.0 — Promoção oficial de chopp

- Cadastrada promoção oficial em `data/knowledge.json`.
- Todos os dias: chopp a partir de **R$ 9,90**.
- Sábado e domingo, das **16h às 20h**: caneca de **340 ml** de **Chopp Ashby e/ou Chopp Brahma** por **R$ 3,99 a caneca**.
- Toda resposta da promoção inclui **consultar disponibilidade no local**.
- `chopp`, `chope`, `chopinho`, `promoção`, `happy hour`, `Brahma` e `Ashby` passam pela intenção `promocao_chopp`.
- Correções comuns como `choop`, `brama` e `asby` também são reconhecidas.
- A promoção de hambúrguer em dobro mantém prioridade própria.
- Nenhuma lógica de relógio foi adicionada: o bot não afirma que a promoção está ativa “agora”.
- Catálogo preservado byte a byte: **122 itens / 15 categorias**, sem alteração de preços ou descrições.
- Nova suíte `promo-tests.mjs`, incluindo teste de guardrail contra dia/horário inventado pela IA.
- GET health e `package.json` atualizados para **2.3.0**.

## 2.2.1 — Comentários do Instagram → Direct

- Corrige placeholder literal `first_name` / `{{first_name}}`.
- Prioriza `comment_text` real quando `event_type = instagram_comment`.
- Comentário sem texto recebe fallback curto, sem cardápio/WhatsApp.
- Elogios e reações não recebem CTA de venda.
- Perguntas de preço/item usam o cardápio e respondem sem checkout automático.
- Reclamações em comentários não herdam lógica de pedido.
- Mantém link de pedido apenas quando há intenção explícita de pedir/cardápio/delivery.
- Adiciona `comment-tests.mjs` e inclui esses testes em `npm run check`.
- Documenta a remoção do botão fixo `Faça o seu pedido!` no fluxo de comentários do ManyChat.


## 2.2.0 — Cardápio completo + busca aproximada

- Catálogo substituído pelo cardápio atual enviado em PDF (9 páginas), com 122 itens e 15 categorias.
- Link principal atualizado para `https://botequimpatiolimeira.saipos.com/home?utm_id=97757_v0_s00_e0_tv0`.
- Removidos do catálogo ativo itens antigos não presentes no cardápio atual, como Fondue Salgado, Bisteca, Frango Power, Chopp Brahma e Chopp Ashby.
- Busca por item agora aceita correções e aproximação de escrita (`kibe` → `Quibe Frito`, `bruxeta` → `Brusqueta`, `torremo` → `Torresmo`) e similaridade para outros erros.
- Categorias genéricas retornam opções com valores: `lanche` → os 3 Burgers, `suco` → sucos, `chopp` → chopps atuais, `executivos` → pratos executivos.
- Termos ambíguos, como `picanha` e `batata frita`, retornam todas as opções relacionadas em vez de selecionar uma ao acaso.
- Respostas de item passaram a priorizar conteúdo do cardápio e um único link do cardápio digital, evitando despejo de iFood/99Food em perguntas simples de preço.
- Respostas de item/categoria são determinísticas e não passam pela humanização da IA, preservando nomes, preços e listas sem omissões.
- Adicionado `menu-tests.mjs` com validação estrutural do catálogo, contagens por categoria, itens obsoletos, busca aproximada e cenários reais.
- `npm run check` atualizado para rodar auditoria geral + testes de cardápio + WhatsApp/segurança.

## 2.1.1 — Correção de handoff, guardrails e segurança

- Corrigida a prioridade de reclamações no WhatsApp: mensagens como `oi quero estorno`, `boa noite preciso reclamar` e `valeu quero nota fiscal` agora fazem handoff mesmo quando a intenção determinística inicial seria saudação/despedida.
- Mantidas exceções benignas como `sem problema, valeu`, `problema resolvido` e `deu tudo certo`, evitando falso handoff.
- Handoff passou a substituir os fatos comerciais anteriores por uma resposta específica do motivo. Reclamação, negociação e pedido de atendente não recebem cardápio/iFood/99Food antes da equipe.
- Quando o handoff é de reclamação ou negociação, `intent` e `topic` também são normalizados para `reclamacao`/`negociacao`, mantendo contexto e métricas coerentes no ManyChat.
- `channel` é normalizado para `instagram` ou `whatsapp`, incluindo aliases como `wa` e `WhatsApp Business`.
- `atendimento_humano`/`bot_pausado` aceita booleano e valores usuais como `1`, `yes`, `sim` e `on`.
- Em produção, ausência de `WEBHOOK_SECRET` passa a negar o POST (fail-closed).
- Camada de IA configurada com `temperature: 0.2` e guardrail adicional contra horários, números e marcadores objetivos não autorizados nos fatos.
- Suíte de WhatsApp ampliada com casos de borda, conteúdo do handoff, segurança e simulação de IA inventando horário.
- Regressão determinística do Instagram permanece idêntica à v2.0.2 nos 19 cenários auditados.

## 2.1.0 — WhatsApp com handoff humano

- Adicionado canal `whatsapp` no mesmo endpoint `/api/manychat`, sem alterar a resolução do Instagram.
- `channel` passa a ser normalizado e retornado no payload padrão.
- Criado handoff humano com `handoff`, `handoff_reason` e `next_action=handoff_humano`.
- Reclamações, negociações, reservas, pedido por atendente e informações não validadas passam para a equipe no WhatsApp.
- Vagas continuam sendo resolvidas pelo WhatsApp exclusivo do RH, sem handoff para o atendimento geral.
- Quando `atendimento_humano=true` ou `bot_pausado=true`, o webhook retorna `reply=""`, `messages=[]` e `next_action=silencio_humano`.
- Respostas do WhatsApp são mantidas em uma única mensagem; o Instagram preserva a divisão original em até 3 partes.
- Persona do WhatsApp adicionada em `lib/persona.js`, com as mesmas travas comerciais e de segurança do Instagram.
- GET de health atualizado para `version: 2.1.0` e `channels: ["instagram","whatsapp"]`.
- Adicionado `whatsapp-tests.mjs` cobrindo handoff, silêncio humano, cardápio, vaga/RH, formatação por canal e regressão do Instagram.
- `npm run check`: 19/19 testes legados + Dynamic Block + testes de WhatsApp/regressão aprovados.


## 2.0.1 — RH / vagas

- WhatsApp de vagas alterado para `(17) 99602-2567`.
- Link oficial de currículos: `https://wa.me/5517996022567`.
- Resposta de vaga atualizada com texto aprovado pelo operador.
- Resposta de vaga não passa pela humanização da IA, evitando alteração de instruções de RH.
- Dynamic Block usa botão **Enviar currículo** apontando ao WhatsApp do RH, sem misturar com o WhatsApp geral do restaurante.
- Testes de regressão atualizados.

# Atualizações

## 2.2.1 — Comentários do Instagram → Direct

- Corrige placeholder literal `first_name` / `{{first_name}}`.
- Prioriza `comment_text` real quando `event_type = instagram_comment`.
- Comentário sem texto recebe fallback curto, sem cardápio/WhatsApp.
- Elogios e reações não recebem CTA de venda.
- Perguntas de preço/item usam o cardápio e respondem sem checkout automático.
- Reclamações em comentários não herdam lógica de pedido.
- Mantém link de pedido apenas quando há intenção explícita de pedir/cardápio/delivery.
- Adiciona `comment-tests.mjs` e inclui esses testes em `npm run check`.
- Documenta a remoção do botão fixo `Faça o seu pedido!` no fluxo de comentários do ManyChat.
 — versão 2.0.0

Data da revisão: 15/09/2026

## Atendimento e segurança

- Webhook principal reestruturado para sempre gerar uma saída segura, inclusive quando a camada de IA estiver indisponível.
- Atendimento baseado em fatos registrados em `data/knowledge.json`.
- Preço, composição, porção, horário e disponibilidade não são estimados quando o dado não existe na base.
- Implementada trava automática contra preços em `R$` não cadastrados.
- Adicionado fallback de erro que devolve cardápio + WhatsApp com HTTP 200 para evitar interrupção do fluxo do ManyChat por erro interno.
- Respostas longas podem ser divididas em até três partes para uso no Direct do Instagram.

## Personalização

- O primeiro nome enviado pelo ManyChat é incorporado à resposta.
- O sistema não usa placeholders ou nomes inventados.
- A camada de IA, quando configurada, funciona somente como humanização da resposta; os fatos continuam sendo definidos pelas regras e pela base fechada.

## Contexto

- `last_topic` e `last_intent` são aceitos no payload.
- Perguntas curtas como `valor?`, `serve quantas pessoas?` e `o que acompanha?` conseguem reutilizar o item/assunto anterior.
- Itens não validados também mantêm um tópico de contexto, impedindo que a pergunta seguinte fique sem referência.

## Cardápio, pedido e delivery

- Cardápio/pedido online configurado como principal caminho de conversão.
- Cliente pode ser orientado a realizar pedido para retirada no local ou entrega conforme as opções apresentadas no checkout.
- Delivery também oferece iFood e 99Food.
- Quando um item não possui informação validada, o cliente recebe cardápio + WhatsApp imediatamente.

## Base de produtos

- Base reorganizada por catálogo estruturado, com aliases para variações de escrita.
- Itens com preço conhecido mantêm o valor registrado.
- Itens com descrição conhecida e preço não validado mantêm o preço como `null`, acionando confirmação pelo WhatsApp quando solicitado.
- Somente opções e campanhas atualmente mantidas na nova base são consideradas pelo bot.

## ManyChat

- Adicionado retorno JSON tradicional para External Request + Response Mapping.
- Adicionado modo opcional `dynamic_block` compatível com resposta v2 para Instagram.
- Retorno inclui `intent`, `topic`, `lead_temperature`, `needs_human`, `next_action`, links e até três partes de resposta.
- Criada documentação completa de configuração em `MANYCHAT_COORDENADAS.md`.
- Criado prompt adicional de implantação em `PROMPT_CONFIGURACAO_ADICIONAL.md`.

## Auditoria

- Criada bateria de testes para situações reais de Direct, incluindo:
  - cliente pedindo cardápio;
  - cliente querendo fazer pedido;
  - saudação sem resposta anterior;
  - categoria genérica de comida;
  - item citado sem dados validados;
  - pergunta de continuidade sobre composição;
  - item com erro de digitação;
  - delivery;
  - preço cadastrado;
  - item sem preço cadastrado;
  - pagamento;
  - reserva;
  - emprego/currículo.

Consulte `REVISAO_FINAL.md` para o resultado da auditoria antes do deploy.

## 2.0.2 — Persona humanizada do Instagram

- Persona da IA isolada em `lib/persona.js` para manutenção segura.
- Tom atualizado para atendimento de boteco: curto, caloroso, natural e sem CTA forçado.
- `event_type` agora é informado ao prompt da IA para adaptar Direct, Story Reply, Story Mention e comentários.
- Contexto `last_intent`, `last_topic` e `last_bot_reply` continua preservado e é reforçado no prompt para evitar repetição.
- Mantidas as proteções existentes contra preço, URL e informações comerciais inventadas.
- Mensagens claramente fora de contexto, como pedido de Robux, recebem resposta bem-humorada sem despejar cardápio ou WhatsApp.
- Contrato de entrada/saída do webhook mantido, inclusive `reply`, `intent`, `topic`, `lead_temperature`, `needs_human` e `next_action`.
