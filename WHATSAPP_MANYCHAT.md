# WhatsApp no ManyChat — Sr. Boteco Limeira v2.1.1

Este documento descreve como ligar o canal WhatsApp ao mesmo webhook já usado pelo Instagram, mantendo os fluxos separados.

## Endpoint

```text
POST https://sdr-boteco.vercel.app/api/manychat
```

Header obrigatório em produção (`WEBHOOK_SECRET` deve estar configurado na Vercel):

```text
x-webhook-secret: <seu segredo>
```

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
  "atendimento_humano": "{{atendimento_humano}}"
}
```

O campo `atendimento_humano` deve ser um campo de usuário booleano no ManyChat. O webhook também aceita `bot_pausado` com a mesma função. Para tolerar variações do ManyChat, valores `true`, `1`, `yes`, `sim` e `on` também são reconhecidos como ativo.

## Campos de resposta para mapear

- `reply` → `ai_reply`
- `intent` → `ai_intent`
- `topic` → `ai_topic`
- `needs_human` → `ai_needs_human`
- `handoff` → `ai_handoff`
- `handoff_reason` → `ai_handoff_reason`
- `next_action` → `ai_next_action`

Depois da chamada, salve também:

```text
ai_last_bot_reply = {{ai_reply}}
```

## Fluxo recomendado

1. Gatilho: usuário envia mensagem no WhatsApp, configurado para executar toda vez.
2. External Request: envie o body acima para `/api/manychat`.
3. Salve `ai_last_bot_reply`.
4. Se `ai_next_action = silencio_humano`, encerre o fluxo sem enviar mensagem.
5. Se `ai_handoff = true`:
   - envie `{{ai_reply}}`;
   - defina `atendimento_humano = true`;
   - atribua/notifique um atendente;
   - opcionalmente aplique a tag `lead_handoff`.
6. Caso contrário, envie `{{ai_reply}}` e mantenha a conversa normal com o bot.

## Quando há handoff

O WhatsApp passa para a equipe quando houver, entre outros. Na v2.1.1, termos fortes de reclamação vencem saudações/despedidas; por exemplo, `oi quero estorno` e `obrigado quero reembolso` fazem handoff. Expressões benignas como `sem problema, valeu` não fazem handoff:

- reserva, aniversário, grupo ou evento;
- reclamação, atraso, erro, cancelamento, estorno, reembolso ou cobrança indevida;
- orçamento, encomenda, negociação, desconto, grande quantidade, buffet ou evento corporativo;
- pedido explícito para falar com atendente;
- item não encontrado ou informação que precise ser confirmada pela equipe.

O bot **não** faz handoff geral para vaga de emprego. Nesse caso ele envia o WhatsApp exclusivo do RH.

## Silêncio durante atendimento humano

Quando `atendimento_humano=true` ou `bot_pausado=true`, a resposta é um no-op:

```json
{
  "reply": "",
  "handoff": true,
  "needs_human": true,
  "next_action": "silencio_humano",
  "messages": []
}
```

Enquanto esse campo estiver verdadeiro, o bot não responde naquela conversa. Ao encerrar o atendimento humano, altere `atendimento_humano` para `false` para devolver a conversa ao bot.

## Formatação por canal

- WhatsApp: uma única mensagem, em `reply_part_1`; `reply_part_2` e `reply_part_3` ficam vazios.
- Instagram: mantém a lógica existente de até três partes.

## Checklist pós-deploy

1. `GET /api/manychat` deve retornar `version: "2.1.1"` e `channels: ["instagram","whatsapp"]`.
2. Instagram: teste uma DM pedindo o cardápio e confirme que o comportamento continua igual.
3. WhatsApp: `me manda o cardápio` → sem handoff.
4. WhatsApp: `quero reservar mesa pra 8` → handoff humano.
5. WhatsApp com `atendimento_humano=true` → nenhuma mensagem enviada pelo bot.
6. Antes de publicar qualquer alteração futura, rode `npm run check`.
