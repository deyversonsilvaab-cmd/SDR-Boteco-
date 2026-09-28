# Prompt de execução — ManyChat WhatsApp v2.11.2

Você é especialista sênior em ManyChat e WhatsApp. Ajuste o fluxo do Sr. Boteco para usar o webhook v2.11.2. Não ativar AI Step e não criar outra IA.

## Objetivo
Recepcionar o cliente com linguagem humana, entender o assunto e responder automaticamente quando a base souber. Quando depender de pessoa ou a informação não estiver validada, manter o cliente NESTA MESMA conversa e abrir atendimento humano. Nunca mandar para outro número, outro WhatsApp, site ou canal para atendimento humano.

## External Request
POST `https://sdr-boteco.vercel.app/api/manychat` com o `x-webhook-secret` já existente. Enviar `channel=whatsapp`, mensagem real, nome quando disponível, `last_intent`, `last_topic`, `last_bot_reply`, estados de avaliação e `atendimento_humano`.

## Campos necessários
Mapear: `reply→ai_reply`, `intent→ai_intent`, `topic→ai_topic`, `handoff→ai_handoff`, `handoff_reason→ai_handoff_reason`, `next_action→ai_next_action`, `app_version→ai_app_version`, `cta_count`, `cta_1_type`, `cta_1_label`, `cta_1_url` e os campos de avaliação já existentes.

**NÃO é necessário criar `ai_marcar_aberta`.** O webhook ainda pode devolver `marcar_conversa_aberta` por compatibilidade, mas a automação deve usar apenas `ai_handoff`.

## Atendimento humano
Se `ai_handoff = true`:
1. enviar `ai_reply`;
2. definir `atendimento_humano=true`;
3. pausar respostas automáticas;
4. deixar a conversa aberta no Inbox para a pessoa continuar ali mesmo.

Não mostrar botão, link ou mensagem mandando o cliente para outro destino.

## Política de botões do WhatsApp
Só permitir botão em três situações:
- pedido explícito de cardápio → **Ver cardápio**;
- pedido explícito de endereço/localização → **Como chegar**;
- pedido explícito para retirada → **Pedir para retirar**.

`Pedir para retirar` tem 18 caracteres. Não usar mais `Fazer pedido para retirada`.

Qualquer outro assunto: **sem botão de link**, inclusive preço, promoções, horário, pagamento, delivery, reserva, reclamação, vaga, atendimento humano e avaliação.

## Feedback do pedido
Revisar a automação antiga `Feedback do Pedido - WhatsApp`. Se existir botão **Avaliar no Google**, removê-lo no WhatsApp. Para nota 5, agradecer em texto, sem link e sem botão. Não alterar a política do Instagram.

## Tradução do Chrome
Antes de editar campos, desativar a tradução automática do Chrome na página do ManyChat para evitar nomes visualmente traduzidos/embaralhados.

## Memória
Após cada resposta automática salvar `ai_last_bot_reply=ai_reply`, `ai_last_intent=ai_intent` e `ai_last_topic=ai_topic`.

## Teste real obrigatório
Usar contato de teste e enviar:
1. `me manda o cardápio` → botão Ver cardápio;
2. `onde fica?` → botão Como chegar;
3. `quero fazer um pedido para retirada` → botão Pedir para retirar;
4. `quero reservar mesa` → resposta humana inicial + handoff, sem botão;
5. `qual o valor da Tábua Mista?` → preço, sem botão;
6. avaliação 5 em estado pendente → agradecimento, sem Google button/link.

Antes de publicar, informar alterações feitas e resultado dos testes.
