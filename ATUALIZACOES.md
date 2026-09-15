
## 2.0.1 — RH / vagas

- WhatsApp de vagas alterado para `(17) 99602-2567`.
- Link oficial de currículos: `https://wa.me/5517996022567`.
- Resposta de vaga atualizada com texto aprovado pelo operador.
- Resposta de vaga não passa pela humanização da IA, evitando alteração de instruções de RH.
- Dynamic Block usa botão **Enviar currículo** apontando ao WhatsApp do RH, sem misturar com o WhatsApp geral do restaurante.
- Testes de regressão atualizados.

# Atualizações — versão 2.0.0

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
