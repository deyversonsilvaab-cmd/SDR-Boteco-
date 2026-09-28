# Prompt de execução — ManyChat WhatsApp v2.11.1

Você é especialista sênior em ManyChat e deve revisar/configurar a automação de WhatsApp do Sr. Boteco Limeira.

## Objetivo obrigatório

O WhatsApp deve funcionar como uma recepção humana em um único canal:

- receber o cliente;
- entender o assunto;
- responder quando o webhook souber a informação;
- quando não souber ou precisar de uma pessoa, abrir a conversa para atendimento humano no MESMO WhatsApp;
- nunca encaminhar o cliente para outro número, outro WhatsApp, site, app ou canal para resolver atendimento humano;
- usar botões de link somente em três situações: cardápio solicitado, localização solicitada e pedido explícito para retirada.

Não use AI Step/IA nativa do ManyChat. Toda inteligência fica em `https://sdr-boteco.vercel.app/api/manychat`.

## 1. Localize a automação principal

Encontre a automação/Default Reply do WhatsApp que executa quando o usuário envia uma mensagem. Ela deve rodar para todas as mensagens que não estejam em pausa humana.

Não alterar automações do Instagram.

## 2. External Request

Método: POST

URL: `https://sdr-boteco.vercel.app/api/manychat`

Headers:

- `Content-Type: application/json`
- `x-webhook-secret`: manter o segredo já configurado; não exibir nem substituir.

Body lógico:

```json
{
  "subscriber_id": "{{id}}",
  "first_name": "{{first_name}}",
  "username": "{{phone}}",
  "message": "{{last_text_input}}",
  "last_intent": "{{ai_last_intent}}",
  "last_topic": "{{ai_last_topic}}",
  "last_bot_reply": "{{ai_last_bot_reply}}",
  "channel": "whatsapp",
  "event_type": "direct",
  "atendimento_humano": "{{atendimento_humano}}",
  "atendimento_humano_em": "{{atendimento_humano_em}}"
}
```

Use as variáveis reais selecionadas na interface do ManyChat. Não deixe placeholders literais.

## 3. Campos necessários

Confirmar/criar:

- `ai_reply` — Texto
- `ai_intent` — Texto
- `ai_topic` — Texto
- `ai_last_intent` — Texto
- `ai_last_topic` — Texto
- `ai_last_bot_reply` — Texto
- `ai_handoff` — Booleano/Texto compatível
- `ai_handoff_reason` — Texto
- `ai_next_action` — Texto
- `ai_marcar_aberta` — Booleano/Texto compatível
- `ai_cta_count` — Número
- `ai_cta_1_type` — Texto
- `ai_cta_1_label` — Texto
- `ai_cta_1_url` — Texto
- `atendimento_humano` — Booleano
- `atendimento_humano_em` — Data e hora

Se o fluxo de promoções por opt-in já existir, preservar também `ai_optin_promocoes`, `ai_optin_origem` e a tag `OPTIN_PROMO_WHATSAPP`.

## 4. Mapear resposta do webhook

- `reply` → `ai_reply`
- `intent` → `ai_intent`
- `topic` → `ai_topic`
- `handoff` → `ai_handoff`
- `handoff_reason` → `ai_handoff_reason`
- `next_action` → `ai_next_action`
- `marcar_conversa_aberta` → `ai_marcar_aberta`
- `cta_count` → `ai_cta_count`
- `cta_1_type` → `ai_cta_1_type`
- `cta_1_label` → `ai_cta_1_label`
- `cta_1_url` → `ai_cta_1_url`

## 5. Silêncio durante atendimento humano

Se `ai_next_action = silencio_humano`, encerrar imediatamente sem enviar mensagem, botão ou fallback.

## 6. Enviar a resposta

Enviar SOMENTE `{{ai_reply}}`.

Não acrescentar rodapé, cardápio, WhatsApp, link, CTA comercial ou frase pronta.

Depois salvar:

- `ai_last_bot_reply = {{ai_reply}}`
- `ai_last_intent = {{ai_intent}}`
- `ai_last_topic = {{ai_topic}}`

## 7. Handoff sem redirecionamento

Se `ai_handoff = true` OU `ai_marcar_aberta = true`:

1. definir `atendimento_humano = true`;
2. definir `atendimento_humano_em = agora`;
3. marcar a conversa como aberta;
4. notificar/atribuir internamente o responsável;
5. encerrar o fluxo.

NÃO mostrar botão.
NÃO enviar outro número.
NÃO enviar WhatsApp do RH.
NÃO enviar link de atendimento.
NÃO enviar iFood/cardápio como compensação.

O humano responde na mesma conversa.

## 8. Botões permitidos

Não criar nenhum botão fixo.

Somente se `ai_handoff != true` e `ai_cta_count = 1`, avaliar `ai_cta_1_type`.

### Se `cardapio`
Criar URL button com:
- texto: `{{ai_cta_1_label}}`
- URL: `{{ai_cta_1_url}}`

### Se `localizacao`
Criar URL button com:
- texto: `{{ai_cta_1_label}}`
- URL: `{{ai_cta_1_url}}`

### Se `pedido_retirada`
Criar URL button com:
- texto: `{{ai_cta_1_label}}`
- URL: `{{ai_cta_1_url}}`

### Qualquer outro tipo
Não mostrar botão.

## 9. Remover do WhatsApp quaisquer botões antigos/fixos

Excluir/desativar do fluxo WhatsApp, se existirem:

- Falar no WhatsApp
- Enviar currículo
- iFood
- Pedido direto genérico
- Avaliar no Google
- Promoções no Whats
- Reservar mesa
- Cardápio em toda resposta
- Como chegar em toda resposta

Cardápio/Como chegar/Pedido para retirada só aparecem quando o webhook devolver explicitamente um dos três tipos autorizados.

## 10. Comportamento esperado

`oi`
→ resposta receptiva e humana, sem botão.

`qual o valor da Tábua Mista?`
→ responde preço/composição validada, sem botão.

`tem promoção de chopp?`
→ responde promoção, sem botão.

`me manda o cardápio`
→ texto curto + apenas botão **Ver cardápio**.

`cardápio fitness`
→ lista/informa conforme webhook + botão de cardápio porque o menu foi explicitamente solicitado.

`fit`
→ responde opções fitness, sem botão automático.

`onde fica?`
→ informa endereço + apenas **Como chegar**.

`quero fazer pedido para retirada`
→ apenas **Fazer pedido para retirada**.

`quero fazer um pedido`
→ pergunta se é retirada ou entrega, sem botão nesse primeiro momento.

`vocês fazem entrega?`
→ informa que trabalha com iFood, sem botão/link automático.

`quero reservar mesa`
→ pede nome/dia/horário/pessoas, abre conversa humana, sem botão.

`meu pedido veio errado`
→ acolhe e pede detalhes, abre conversa humana, sem botão.

`quero falar com uma pessoa`
→ acolhe, abre conversa humana, sem botão.

`quero mandar currículo`
→ pede currículo/função por aqui, abre conversa humana, sem mandar para outro número.

`preciso de orçamento para evento`
→ pede detalhes e abre conversa humana, sem link.

assunto não reconhecido
→ resposta segura + conversa aberta para humano no mesmo WhatsApp.

## 11. Testes antes de publicar

Executar todos os exemplos acima em contato de teste.

Validar em cada resposta:

- nenhum URL aparece no texto;
- nenhum botão aparece fora das três situações autorizadas;
- handoff nunca oferece link/atalho externo;
- `atendimento_humano=true` silencia o bot nas mensagens seguintes;
- memória (`ai_last_*`) continua sendo salva;
- Instagram não foi alterado.

## 12. Relatório final

Antes de publicar, mostrar:

- automação alterada;
- campos criados/reutilizados;
- body final da External Request;
- mappings;
- condições de handoff;
- condições dos 3 CTAs;
- botões antigos removidos/desativados;
- resultado dos testes.

Só publicar depois de tudo validado.
