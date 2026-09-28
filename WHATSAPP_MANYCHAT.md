# WhatsApp no ManyChat — Sr. Boteco Limeira v2.11.2

## Princípio do fluxo

O WhatsApp é um canal único de atendimento. O bot recebe, entende e responde o que sabe. Quando a informação não estiver validada ou o assunto exigir uma pessoa, a conversa é aberta para atendimento humano **no mesmo WhatsApp**.

Nunca encaminhe o cliente para outro número, outro WhatsApp, site, app, perfil ou canal para resolver um atendimento humano.

## Endpoint

`POST https://sdr-boteco.vercel.app/api/manychat`

Header de produção:

`x-webhook-secret: <WEBHOOK_SECRET já configurado>`

## Body recomendado

```json
{
  "subscriber_id": "{{id}}",
  "first_name": "{{first_name}}",
  "username": "{{phone}}",
  "message": "{{last_text_input}}",
  "last_intent": "{{ai_intent}}",
  "last_topic": "{{ai_topic}}",
  "last_bot_reply": "{{ai_last_bot_reply}}",
  "channel": "whatsapp",
  "event_type": "direct",
  "atendimento_humano": "{{atendimento_humano}}",
  "atendimento_humano_em": "{{atendimento_humano_em}}"
}
```

Use as variáveis reais disponíveis no seletor do ManyChat; não cole placeholders como texto literal.

## Campos para mapear

Resposta principal:

- `reply` → `ai_reply`
- `intent` → `ai_intent`
- `topic` → `ai_topic`
- `handoff` → `ai_handoff`
- `handoff_reason` → `ai_handoff_reason`
- `next_action` → `ai_next_action`

CTAs:

- `cta_count` → `ai_cta_count`
- `cta_1_type` → `ai_cta_1_type`
- `cta_1_label` → `ai_cta_1_label`
- `cta_1_url` → `ai_cta_1_url`

Opt-in existente:

- `optin_promocoes` → `ai_optin_promocoes`
- `optin_origem` → `ai_optin_origem`

## Ordem do fluxo

1. Trigger: WhatsApp → usuário envia uma mensagem, executar sempre.
2. Se `atendimento_humano=true`, o webhook retorna `next_action="silencio_humano"`; encerre sem enviar nada.
3. Faça a External Request.
4. Salve os campos retornados.
5. Se `ai_next_action = silencio_humano`, encerre.
6. Envie **somente** `{{ai_reply}}`.
7. Salve memória:
   - `ai_last_bot_reply = {{ai_reply}}`
   - `ai_last_intent = {{ai_intent}}`
   - `ai_last_topic = {{ai_topic}}`
8. Se `ai_handoff=true`:
   - `atendimento_humano = true`
   - `atendimento_humano_em = agora`
   - marcar conversa como aberta;
   - notificar/atribuir internamente o responsável;
   - **não adicionar botão ou link**.
9. Se não houver handoff, avaliar CTA permitido.

## CTAs permitidos no WhatsApp

Só renderize URL button quando `ai_cta_count = 1` E o tipo for um destes:

### Cardápio

`ai_cta_1_type = cardapio`

Botão: `{{ai_cta_1_label}}`
URL: `{{ai_cta_1_url}}`

### Localização

`ai_cta_1_type = localizacao`

Botão: `{{ai_cta_1_label}}`
URL: `{{ai_cta_1_url}}`

### Pedido para retirada

`ai_cta_1_type = pedido_retirada`

Botão: `{{ai_cta_1_label}}`
URL: `{{ai_cta_1_url}}`

Para qualquer outro `cta_type`, não renderize botão no WhatsApp.

## Proibido no fluxo do WhatsApp

Não manter botões fixos como:

- Falar no WhatsApp
- Enviar currículo
- iFood
- Promoções no Whats
- Reservar mesa

Não usar `whatsapp_link`, `whatsapp_vagas_link`, `ifood_link`, `google_review_link` ou outros links para montar botões no WhatsApp.

Não usar IA nativa/AI Step do ManyChat. Toda inteligência permanece no webhook da Vercel.

## Handoff humano

Exemplos que devem abrir a conversa humana no mesmo WhatsApp:

- "quero reservar uma mesa"
- "meu pedido veio errado"
- "quero falar com uma pessoa"
- "quero mandar currículo"
- "preciso de orçamento para um evento"
- assunto desconhecido ou informação não validada

O cliente recebe uma resposta acolhedora e a conversa fica aberta. Não é enviado para outro destino.

## Pausa humana

Quando `atendimento_humano=true`, o bot permanece em silêncio. Se `atendimento_humano_em` for enviado, a pausa pode expirar conforme `HUMAN_PAUSE_HOURS` (padrão 12h). Para devolver antes, limpe `atendimento_humano`.

## Testes de aceite

- `oi` → recepção humana, sem botão;
- `qual valor da Tábua Mista?` → preço, sem botão;
- `promoção de chopp?` → resposta, sem botão;
- `me manda o cardápio` → somente **Ver cardápio**;
- `onde fica?` → somente **Como chegar**;
- `quero pedido para retirada` → somente **Pedir para retirar**;
- `quero fazer um pedido` → pergunta retirada ou entrega, sem botão;
- `vocês fazem entrega?` → informa iFood, sem link/botão;
- reserva/reclamação/vaga/humano/orçamento → `handoff=true`, conversa aberta, sem link/botão;
- durante `atendimento_humano=true` → silêncio do bot.


### Compatibilidade
O webhook ainda devolve `marcar_conversa_aberta=true` junto de `handoff=true`, mas o campo não precisa ser criado no ManyChat. Use `ai_handoff` como única condição de pausa/atendimento humano.

### Feedback do pedido
No WhatsApp, o fluxo de feedback não deve adicionar botão ou link de Google Review. Mesmo em nota 5, enviar apenas o agradecimento. O Instagram mantém sua política própria de avaliação.
