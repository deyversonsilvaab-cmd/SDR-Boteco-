# Prompt de execução e ajuste do ManyChat — SDR Sr. Boteco v2.4.0

Use este roteiro depois de publicar o ZIP/código **v2.4.0** na Vercel. Não ativar IA paga do ManyChat, não alterar `WEBHOOK_SECRET` e não mexer em permissões/OAuth do Meta neste procedimento.

## O que a v2.4.0 já faz no webhook

O webhook continua retornando `reply`, `intent`, `topic`, `next_action`, links e os demais campos existentes. Agora também retorna:

- `app_version`
- `cta_count`
- `cta_type`
- `cta_label`
- `cta_url`
- `localizacao_link`
- `maps_link`

Nas DMs do Instagram, o texto de `reply` já vem sem URLs de Cardápio, WhatsApp, RH e Google Maps. iFood/99Food continuam no texto quando o assunto é delivery.

## Mapeamento novo na Solicitação Externa do ManyChat

No mesmo POST já existente para `/api/manychat`, mantenha o body e headers atuais. Na resposta, mantenha todos os mapeamentos existentes e acrescente campos de usuário do tipo texto:

- `ai_cta_type` ← `cta_type`
- `ai_cta_label` ← `cta_label` (opcional, útil para auditoria)
- `ai_cta_url` ← `cta_url` (opcional, útil para auditoria)
- `ai_localizacao_link` ← `localizacao_link`
- `ai_app_version` ← `app_version` (opcional, recomendado para diagnosticar deploy)

Os campos já existentes continuam:

- `ai_reply` ← `reply`
- `ai_intent` ← `intent`
- `ai_topic` ← `topic` ou `last_topic`
- `ai_next_action` ← `next_action`
- `ai_needs_human` ← `needs_human`
- `ai_last_bot_reply = {{ai_reply}}`
- link de cardápio ← `cardapio_link`
- link WhatsApp ← `whatsapp_link`
- link RH ← `whatsapp_vagas_link`

## Alteração principal no fluxo Instagram Default Reply

Hoje existe um bloco fixo depois de `{{ai_reply}}` com a mensagem **“É só tocar aqui 👇”** e os dois botões **Cardápio** + **Falar no WhatsApp**. Não deixe esse bloco fixo para todas as respostas.

Mantenha o bloco que envia `{{ai_reply}}` exatamente como está. Depois dele, coloque uma **Condição** usando `ai_cta_type`:

1. Se `ai_cta_type = cardapio`
   - enviar um pequeno bloco de CTA (pode manter “É só tocar aqui 👇”);
   - botão único **Cardápio** → campo do link `cardapio_link`/seu campo já mapeado.

2. Se `ai_cta_type = pedido`
   - botão único **Fazer pedido** → `cardapio_link`.

3. Se `ai_cta_type = localizacao`
   - botão único **Como chegar** → `ai_localizacao_link`;
   - destino oficial: `https://maps.app.goo.gl/sr7PgRhUxaNuzg8e8`.

4. Se `ai_cta_type = whatsapp`
   - botão único **Falar no WhatsApp** → `whatsapp_link`.

5. Se `ai_cta_type = rh`
   - botão único **Enviar currículo** → `whatsapp_vagas_link`.

6. Se `ai_cta_type` estiver vazio ou não casar com nenhum valor
   - **não enviar nenhum bloco de botão**;
   - encerrar/seguir o fluxo normalmente.

Não duplique `{{ai_reply}}` dentro dos ramos. A resposta principal já foi enviada antes da condição; os ramos servem somente para adicionar o botão correto.

## Comportamento esperado

- “Oi quero o cardápio” → texto limpo + botão **Cardápio**.
- “Lanche?” → opções de Burger com valores + botão **Cardápio**.
- “Qual o valor da bisteca?” → lista de categorias + botão **Cardápio**.
- “Quero pedir” → texto de pedido + botão **Fazer pedido**.
- “Entrega?” → texto mantém iFood e 99Food + botão **Fazer pedido**.
- “Endereço” / “Onde fica?” → “Pátio Limeira Shopping” + botão **Como chegar**.
- “Promoção” → promoção de chopp completa + botão **Como chegar**.
- “Quero falar com atendente” → texto humano + botão **Falar no WhatsApp**.
- “Vaga de garçom” → orientação do RH + botão **Enviar currículo**.
- “Que horas abre?” → resposta de horário, **sem botão forçado**.
- saudação/agradecimento/brincadeira → resposta normal, **sem botões comerciais automáticos**.

## Comentários do Instagram

Não aplique essa condição ao fluxo separado de comentários se ele não usa os mesmos botões. O webhook mantém `cta_count = 0` para `instagram_comment`, preservando a lógica já corrigida.

## WhatsApp

Não alterar o fluxo do canal WhatsApp por causa desta atualização. A limpeza de links e os CTAs contextuais desta versão são para DM do Instagram; o WhatsApp continua com links no texto quando necessário e mantém handoff/silêncio humano.

## Ordem segura de publicação

1. Publicar o código v2.4.0 na Vercel.
2. Abrir `GET https://sdr-boteco.vercel.app/api/manychat` e confirmar `version: "2.4.0"`.
3. Fazer um teste da Solicitação Externa e confirmar que a resposta possui `cta_type` e `localizacao_link`.
4. Só então substituir o bloco fixo dos dois botões no ManyChat pela Condição descrita acima.
5. Publicar o fluxo ManyChat.
6. Testar de uma conta diferente da página.

## Testes obrigatórios ao vivo

Enviar, um por vez:

- `Oi quero o cardápio`
- `Lanche?`
- `Qual o valor da bisteca?`
- `Quero pedir`
- `Entrega?`
- `Endereço`
- `Promoção`
- `Quero falar com atendente`
- `Vaga de garçom`
- `Que horas abre?`

Critério de aceite: nenhuma URL de Cardápio/WhatsApp/Google Maps/RH deve ficar no meio da DM do Instagram; o botão deve acompanhar o tema da resposta; iFood/99Food continuam no texto de delivery; respostas sem necessidade de CTA não recebem botão.

## Diagnóstico se ainda aparecer link no texto

Antes de editar o código novamente, confirme:

- GET do webhook mostra `version: "2.4.0"`;
- `ai_app_version` (se mapeado) está recebendo `2.4.0`;
- a External Request aponta para `https://sdr-boteco.vercel.app/api/manychat`;
- o fluxo publicado é realmente o **Instagram Default Reply** LIVE;
- não existe outro nó antigo enviando `ai_reply`, link ou botão fixo depois da resposta.

Não alterar OpenAI/ManyChat AI, `WEBHOOK_SECRET`, Meta OAuth ou permissões de canal durante este procedimento.
