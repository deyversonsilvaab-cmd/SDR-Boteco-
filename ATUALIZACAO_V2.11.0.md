# v2.11.0 — WhatsApp com a mesma estrutura do Instagram (Vercel) + recepção e conversa aberta

Mesmo endpoint do Instagram: `POST https://sdr-boteco.vercel.app/api/manychat` com `"channel": "whatsapp"`.
**Sem IA do ManyChat** — toda a inteligência fica no webhook da Vercel.

## Regras de atendimento no WhatsApp
- O bot SEMPRE faz a recepção: entende o assunto e responde com as informações cadastradas quando sabe.
- Quando não sabe ou o assunto precisa de uma pessoa (reserva, reclamação, orçamento/evento, pedido de atendente, item não cadastrado):
  acolhe, pede os detalhes que faltam e diz no máximo **"vou buscar essa informação e já te respondo por aqui"**.
  O payload volta com `handoff=true` e `marcar_conversa_aberta=true` para a conversa ficar aberta para resposta humana.
- **Nunca** diz que vai direcionar, encaminhar, transferir, chamar a equipe/atendente, nem fala em botão.
  Trava dupla: regra no prompt da IA + filtro no código que troca qualquer resposta com essas palavras.
- Nunca manda o link do próprio WhatsApp (19 99785-8351) dentro do WhatsApp.

## Mensagens que chegam dos botões do Instagram
| Mensagem pronta | O que o bot faz |
|---|---|
| "Olá! Quero reservar uma mesa no Sr. Boteco" | Pede nome, dia, horário e nº de pessoas; conversa fica aberta (`handoff=true`) |
| "Quero receber o cardápio e as promoções do Sr. Boteco no WhatsApp" | Confirma o opt-in; `optin_promocoes="true"`, `optin_origem="instagram_cta"` |
| "vim do instagram" / "vi no insta" | Recepção: "Que bom te ver por aqui! Me conta o que você precisa…" |
| parar / sair / parar promoções / cancelar promoções / não quero mais | Confirma o descadastro; `optin_promocoes="false"` |

## Pausa humana
Quando `atendimento_humano=true`, o bot fica em silêncio (`next_action="silencio_humano"`).
Novo: se o ManyChat enviar `atendimento_humano_em` (data/hora), a pausa expira sozinha depois de 12h
(ajustável pela variável `HUMAN_PAUSE_HOURS` na Vercel). Sem a data, continua como antes.

## Novos campos no payload
- `optin_promocoes`: "true" | "false" | ""
- `optin_origem`: "instagram_cta" | ""
- `marcar_conversa_aberta`: true | false

## Configuração no ManyChat (automação "Resposta padrão do WhatsApp")
Campos de usuário necessários: `atendimento_humano` (Verdadeiro/Falso), `atendimento_humano_em` (Data e hora),
`whatsapp_promocoes_optin` (Verdadeiro/Falso), `whatsapp_promocoes_optin_em` (Data e hora), `whatsapp_promocoes_origem` (Texto),
`ai_reply`, `ai_intent`, `ai_topic`, `ai_handoff`, `ai_next_action`, `ai_last_bot_reply`, `ai_optin_promocoes`, `ai_optin_origem`, `ai_marcar_aberta` (Texto).
Tag: `OPTIN_PROMO_WHATSAPP`.

1. Gatilho: WhatsApp → "O usuário envia uma mensagem" (Resposta padrão), executar sempre. **Não usar "Reconhecer intenção (IA)" nem "Etapa de IA".**
2. Solicitação externa (POST) para `https://sdr-boteco.vercel.app/api/manychat`, header `x-webhook-secret`, body:
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
3. Mapear resposta: `reply→ai_reply`, `intent→ai_intent`, `topic→ai_topic`, `handoff→ai_handoff`, `next_action→ai_next_action`,
   `optin_promocoes→ai_optin_promocoes`, `optin_origem→ai_optin_origem`, `marcar_conversa_aberta→ai_marcar_aberta`.
4. Condição `ai_next_action = silencio_humano` → encerrar sem enviar nada.
5. Enviar mensagem de WhatsApp com `{{ai_reply}}` e salvar `ai_last_bot_reply = {{ai_reply}}`.
6. Condição `ai_optin_promocoes = true` → adicionar tag `OPTIN_PROMO_WHATSAPP`, `whatsapp_promocoes_optin = true`,
   `whatsapp_promocoes_optin_em = agora`, `whatsapp_promocoes_origem = {{ai_optin_origem}}`.
7. Condição `ai_optin_promocoes = false` → remover tag `OPTIN_PROMO_WHATSAPP`, `whatsapp_promocoes_optin = false`.
8. Condição `ai_marcar_aberta = true` → `atendimento_humano = true`, `atendimento_humano_em = agora`,
   **Marcar conversa como aberta** e **Notificar responsável** (Michel).
9. Para devolver ao bot antes das 12h: limpar `atendimento_humano` (ou usar a automação existente "WhatsApp - Voltar pro Bot").

## Testes
`npm run check` — todos passando (novo: `whatsapp-recepcao-tests.mjs`, inclui varredura de frases proibidas e IA "desobediente").
