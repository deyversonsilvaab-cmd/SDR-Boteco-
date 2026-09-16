# SDR Sr. Boteco — Correções v2.1.1

Esta versão corrige os pontos encontrados na auditoria da v2.1.0 revisada sem alterar a lógica determinística do Instagram.

## Correções principais

1. **Prioridade de reclamação no WhatsApp**
   - `oi, tive um problema`, `oi quero estorno`, `boa noite quero cancelar`, `obrigado quero reembolso` e equivalentes fazem handoff.
   - `sem problema, valeu`, `problema resolvido` e `deu tudo certo` não geram falso handoff.

2. **Resposta coerente com o handoff**
   - Reclamação não herda mais texto de pedido, cardápio, iFood ou 99Food.
   - Pedido explícito de atendente não recebe o link do mesmo WhatsApp em que a pessoa já está conversando.
   - Negociação/orçamento/grande quantidade não recebe checkout antes da equipe.
   - Handoffs de reclamação e negociação também atualizam `intent`/`topic` para manter o histórico do ManyChat coerente.

3. **Guardrails da IA**
   - Mantidos os bloqueios de preço, URL e informações removidas.
   - Adicionada validação conservadora de horários, números, dias da semana, meios de pagamento e outros marcadores objetivos. Se a IA acrescentar um marcador não autorizado em `fatos_para_esta_resposta`, o webhook descarta a redação da IA e usa a resposta determinística.
   - `temperature` reduzida para `0.2`.

4. **Segurança do webhook**
   - Em produção (`VERCEL_ENV=production` ou `NODE_ENV=production`), `WEBHOOK_SECRET` ausente faz o POST retornar 401. O webhook não fica aberto por erro de configuração.

5. **Compatibilidade ManyChat**
   - `wa`, `WhatsApp`, `WhatsApp Business` e variantes contendo `whatsapp` são normalizadas para `channel: "whatsapp"`.
   - `atendimento_humano` e `bot_pausado` aceitam `true`, `1`, `yes`, `sim` e `on`.

## Validação

Executar:

```bash
npm run check
```

A suíte cobre:

- 19 cenários históricos do Instagram;
- Dynamic Block e RH;
- reserva, reclamação, negociação, handoff e silêncio humano no WhatsApp;
- casos de borda de saudação/despedida + reclamação;
- expressões benignas que não devem acionar handoff;
- aliases de canal e flags do ManyChat;
- tentativa simulada da IA de inventar horário;
- fail-closed de `WEBHOOK_SECRET` em produção.

## Deploy

Antes do deploy na Vercel, confirme obrigatoriamente:

- `WEBHOOK_SECRET` configurado;
- `OPENAI_API_KEY` se quiser a camada de humanização (o bot funciona sem ela);
- o mesmo `x-webhook-secret` configurado nas External Requests do ManyChat;
- fluxo do WhatsApp enviando `channel: "whatsapp"` e `atendimento_humano`.
