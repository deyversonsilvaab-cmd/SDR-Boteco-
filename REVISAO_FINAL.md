# Revisão final de produção — SDR Boteco v2.0.2

Data: 15/09/2026

## Resultado

Projeto revisado para uso como webhook de atendimento do Instagram via ManyChat + Vercel, mantendo o contrato da API e adicionando a persona humanizada solicitada.

### Validações concluídas

- `api/manychat.js`: sintaxe Node.js válida e integração preservada.
- `lib/persona.js`: persona/system prompt isolado do handler para manutenção segura.
- `data/knowledge.json`: JSON válido; base comercial continua fechada e sem criação de fatos.
- 19 cenários críticos automatizados: **19/19 aprovados**.
- 2 testes adicionais de integração do Dynamic Block v2: **aprovados** (cardápio e vaga/RH).
- Campos mínimos do contrato mantidos: `reply`, `intent`, `topic`, `lead_temperature`, `needs_human`, `next_action`.
- `x-webhook-secret` / `WEBHOOK_SECRET` mantidos sem alteração.
- `event_type` passa a ser informado ao prompt da IA para adaptar Direct, resposta a Story, menção em Story e comentário.
- `last_intent`, `last_topic` e `last_bot_reply` continuam disponíveis para manter o contexto e reduzir repetição.
- Proteções contra preço inventado, URL não autorizada e conteúdo comercial removido continuam ativas.

## Casos de aceite da atualização de persona

### Fora de contexto / troll

Entrada de teste:

```text
Consegue me doar robux?
```

Resultado determinístico: intenção `fora_contexto`, tom leve, sem cardápio e sem WhatsApp forçados. Com OpenAI configurada, a persona pode reescrever mantendo a mesma restrição factual.

### Pedido

Mensagens de intenção clara de pedido continuam com `intent=pedido` e direcionamento para o cardápio/pedido oficial. A persona foi instruída a responder de forma curta e calorosa, sem encerrar com `Faça o seu pedido!`.

### Reserva

A resposta coleta:

- nome;
- dia/data;
- horário;
- número de pessoas.

O bot não confirma a reserva sozinho. `needs_human=true` e `next_action=coletar_reserva` continuam disponíveis para o ManyChat.

## Persona por evento

- `direct`: conversa normal, objetiva e natural.
- `story_reply`: responde ao conteúdo/reação do Story sem transformar tudo em venda.
- `story_mention`: agradece a marcação sem CTA forçado.
- `instagram_comment`: resposta pública mais curta; continuidade individual pode ser levada ao Direct.

## Segurança comercial preservada

A IA continua funcionando somente como camada de redação. A aplicação determina intenção e fornece `fatos_para_esta_resposta`. A resposta gerada é descartada se trouxer preço não permitido, URL não autorizada ou informação comercial removida.

O arquivo `data/knowledge.json` continua sendo a fonte de fatos comerciais. Dados ausentes não devem ser completados por memória ou suposição.

## Arquivos principais da versão 2.0.2

- `api/manychat.js` — roteamento, contrato, travas e integração.
- `lib/persona.js` — voz/persona da IA.
- `data/knowledge.json` — fatos comerciais validados.
- `PERSONA_E_PROMPT_VERCEL.md` — documento de referência da solicitação.
- `audit-test.mjs` — testes de regressão, incluindo o caso Robux.
- `MANYCHAT_COORDENADAS.md` — configuração operacional do ManyChat.

## Comando obrigatório antes de cada deploy futuro

```bash
npm run check
```

Somente publicar se todos os testes terminarem sem falhas.
