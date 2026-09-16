# Revisão final de produção — SDR Boteco v2.1.0

Data: 15/09/2026

## Resultado

Projeto revisado para operar **Instagram + WhatsApp** no mesmo webhook do ManyChat/Vercel. A versão 2.1.0 adiciona o caminho de WhatsApp com recepção automatizada e handoff para atendimento humano, preservando o comportamento funcional do Instagram 2.0.2.

## Validações concluídas

- `api/manychat.js`: sintaxe Node.js válida, contrato existente preservado e canal normalizado.
- `lib/persona.js`: persona do Instagram preservada e persona específica de WhatsApp adicionada.
- `data/knowledge.json`: JSON válido, base comercial fechada e versão atualizada para 2.1.0.
- 19 cenários críticos legados do Instagram: **19/19 aprovados**.
- Dynamic Block v2 do Instagram: **aprovado** para cardápio e vaga/RH.
- Testes específicos do WhatsApp: **todos aprovados**.
- Comparação de regressão entre v2.0.2 e v2.1.0: respostas e campos funcionais do Instagram ficaram iguais nos 19 cenários auditados.
- `x-webhook-secret` / `WEBHOOK_SECRET` mantidos sem alteração.
- Guardrails contra preço inventado, URL não autorizada e conteúdo comercial removido continuam ativos nos dois canais.

## WhatsApp — comportamento validado

### Cardápio

Entrada:

```text
me manda o cardápio
```

Resultado: o bot resolve sozinho, devolve o link oficial, `handoff=false` e mantém a resposta em uma única parte.

### Reserva

Entrada:

```text
quero reservar mesa pra 8 sábado
```

Resultado: `handoff=true`, `handoff_reason=reserva`, `needs_human=true` e `next_action=handoff_humano`. A mensagem informa que a equipe continuará o atendimento; o bot não confirma a reserva sozinho.

### Reclamação

Entrada:

```text
tive um problema com meu pedido
```

Resultado: `handoff=true`, `handoff_reason=reclamacao` e `next_action=handoff_humano`.

### Humano já atendendo

Com `atendimento_humano=true`, o webhook retorna:

```json
{
  "reply": "",
  "handoff": true,
  "needs_human": true,
  "next_action": "silencio_humano",
  "messages": []
}
```

A IA não é chamada e o bot não fala por cima do atendente.

### Vaga de emprego

No WhatsApp, `intent=vaga` continua direcionando ao canal exclusivo do RH (`https://wa.me/5517996022567`) e **não** entra no handoff do atendimento geral.

## Regressão Instagram

A lógica do Instagram mantém a mesma resolução de intenção, `next_action`, resposta determinística, links e divisão em até três partes da versão 2.0.2. Os campos `channel`, `handoff` e `handoff_reason` foram acrescentados ao payload padrão sem alterar o conteúdo dos campos antigos.

## Health check

`GET /api/manychat` retorna:

```json
{
  "version": "2.1.0",
  "channels": ["instagram", "whatsapp"]
}
```

## Arquivos principais da versão 2.1.0

- `api/manychat.js` — roteamento, contrato, handoff, silêncio humano, travas e integração.
- `lib/persona.js` — personas do Instagram e WhatsApp.
- `data/knowledge.json` — fatos comerciais validados.
- `audit-test.mjs` — regressão dos cenários críticos existentes.
- `whatsapp-tests.mjs` — testes do novo canal e regressão por formatação.
- `WHATSAPP_MANYCHAT.md` — implantação do fluxo do WhatsApp no ManyChat.
- `MANYCHAT_COORDENADAS.md` — configuração existente do Instagram.

## Comando obrigatório antes de cada deploy futuro

```bash
npm run check
```

Somente publicar se todos os testes terminarem sem falhas.
