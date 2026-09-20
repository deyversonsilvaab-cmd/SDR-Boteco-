# SDR Sr. Boteco — v2.9.2 — IA integrada atualizada

## Objetivo

Atualizar somente a camada de humanização da IA sem transformar a IA em fonte de verdade do restaurante.

## Alterações técnicas

- Endpoint OpenAI: `POST https://api.openai.com/v1/responses`.
- Modelo padrão: `gpt-5.6-luna`.
- Fallback: `gpt-4o`.
- Variáveis:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
  - `OPENAI_FALLBACK_MODEL`
- Para GPT-5.x: `reasoning.effort = none`.
- `store = false`.
- Timeout por tentativa: 10 segundos.
- Se o primário falhar por erro compatível com fallback, tenta o modelo secundário.
- Se a OpenAI continuar indisponível, usa os fatos determinísticos já calculados pelo webhook.

## O que NÃO mudou

A OpenAI não escolhe preço, produto, horário, promoção, link, disponibilidade ou condição comercial. Esses fatos continuam vindos da base e das regras determinísticas do webhook.

A IA recebe somente os fatos autorizados para aquela resposta e os reescreve em tom humano. Depois disso, os guardrails ainda validam preço, URL e fatos objetivos. Se a resposta violar as regras, ela é descartada e o texto determinístico é usado.

## Correção adicional

`Olá` passou a ser reconhecido como saudação antes da busca fuzzy do cardápio, evitando correspondência indevida com `cola` / refrigerante.

## Vercel

Configuração esperada em Production:

```env
OPENAI_API_KEY=<manter a chave real somente na Vercel>
OPENAI_MODEL=gpt-5.6-luna
OPENAI_FALLBACK_MODEL=gpt-4o
WEBHOOK_SECRET=<manter o valor atual>
```

Nunca colocar valores reais de `OPENAI_API_KEY` ou `WEBHOOK_SECRET` no GitHub.
