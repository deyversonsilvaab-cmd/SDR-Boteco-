# Prompt de execução — ManyChat completo — SDR Sr. Boteco v2.8.0

> Objetivo: atualizar a estrutura do ManyChat para trabalhar corretamente com o webhook v2.8.0, incluindo CTA contextual, memória de conversa, promoções, comentários, WhatsApp/handoff e a avaliação 1–5. Não usar a IA paga do ManyChat. Não alterar `WEBHOOK_SECRET`; o usuário cola o valor manualmente.

## 1. Pré-validação

1. Confirmar que o webhook publicado é:
   `https://sdr-boteco.vercel.app/api/manychat`
2. Abrir o GET do endpoint e confirmar:
   - `ok: true`
   - `version: "2.8.0"`
   - `channels: ["instagram","whatsapp"]`
3. Se a versão não for 2.8.0, NÃO alterar os fluxos ainda. Publicar primeiro o ZIP v2.8.0 e repetir o GET.

## 2. Custom Fields necessários

Reutilize os campos existentes e crie apenas os que faltarem.

### Contexto da IA/webhook
- `ai_reply` — Texto
- `ai_intent` — Texto
- `ai_topic` — Texto
- `ai_last_bot_reply` — Texto
- `ai_last_intent` — Texto
- `ai_last_topic` — Texto
- `ai_needs_human` — Boolean/Text conforme a conta
- `ai_next_action` — Texto
- `ai_cta_type` — Texto
- `ai_cta_label` — Texto
- `ai_cta_url` — Texto
- `ai_app_version` — Texto

### Avaliação — campos persistentes
- `avaliacao_pendente` — Boolean (ou Text com `true/false`)
- `avaliacao_nota` — Number
- `avaliacao_feedback_pendente` — Boolean (ou Text)
- `avaliacao_feedback` — Texto

### Avaliação — campos temporários vindos do webhook
- `ai_avaliacao_salva` — Boolean/Text
- `ai_avaliacao_nota` — Number/Text
- `ai_avaliacao_pendente` — Boolean/Text
- `ai_avaliacao_feedback_pendente` — Boolean/Text
- `ai_avaliacao_feedback` — Texto

### WhatsApp/handoff
- `atendimento_humano` — Boolean/Text
- `ai_handoff` — Boolean/Text
- `ai_handoff_reason` — Texto

## 3. External Request principal — Instagram Default Reply

Manter `POST` para:
`https://sdr-boteco.vercel.app/api/manychat`

Header:
- `x-webhook-secret`: usar o segredo já configurado. NÃO inserir o valor em documentação/prompt.

Body JSON: manter as variáveis reais já existentes e acrescentar os campos de avaliação. Não digitar placeholders literalmente; selecionar as variáveis pelo picker do ManyChat.

Estrutura lógica:

```json
{
  "subscriber_id": "<ID real do contato>",
  "first_name": "<primeiro nome real>",
  "username": "<username real>",
  "message": "<última mensagem real do usuário>",
  "last_intent": "<ai_last_intent>",
  "last_topic": "<ai_last_topic>",
  "last_bot_reply": "<ai_last_bot_reply>",
  "channel": "instagram",
  "event_type": "direct",
  "avaliacao_pendente": "<avaliacao_pendente>",
  "avaliacao_feedback_pendente": "<avaliacao_feedback_pendente>",
  "avaliacao_nota": "<avaliacao_nota>"
}
```

Mapear a resposta:
- `reply` → `ai_reply`
- `intent` → `ai_intent`
- `topic` → `ai_topic`
- `needs_human` → `ai_needs_human`
- `next_action` → `ai_next_action`
- `cta_type` → `ai_cta_type`
- `cta_label` → `ai_cta_label`
- `cta_url` → `ai_cta_url`
- `app_version` → `ai_app_version`
- `handoff` → `ai_handoff`
- `handoff_reason` → `ai_handoff_reason`
- `avaliacao_salva` → `ai_avaliacao_salva`
- `avaliacao_nota` → `ai_avaliacao_nota`
- `avaliacao_pendente` → `ai_avaliacao_pendente`
- `avaliacao_feedback_pendente` → `ai_avaliacao_feedback_pendente`
- `avaliacao_feedback` → `ai_avaliacao_feedback`

Depois de cada resposta válida, salvar a memória:
- `ai_last_bot_reply = ai_reply`
- `ai_last_intent = ai_intent`
- `ai_last_topic = ai_topic`

Isso é obrigatório para continuidade de burger/promocão e perguntas curtas de contexto.

## 4. Remover os botões fixos antigos

Excluir do Default Reply qualquer bloco fixo que sempre mostre:
- `Faça o seu pedido!`
- `É só tocar aqui 👇`
- botão `Cardápio`
- botão `Falar no WhatsApp`

Esses botões não devem aparecer em todas as respostas.

Substituir por CONDIÇÕES baseadas em `ai_cta_type`. Em cada ramo, enviar `ai_reply` sem URL solta no texto e, quando houver CTA, apenas o botão daquele tema:

- `ai_cta_type = cardapio` → botão **Cardápio** → link oficial do cardápio
- `ai_cta_type = pedido` → botão **Fazer pedido** → link oficial do cardápio/pedido
- `ai_cta_type = localizacao` → botão **Como chegar** → `https://maps.app.goo.gl/sr7PgRhUxaNuzg8e8`
- `ai_cta_type = whatsapp` → botão **Falar no WhatsApp** → `https://wa.me/5519997858351`
- `ai_cta_type = rh` → botão **Enviar currículo** → `https://wa.me/5517996022567`
- vazio/outro → enviar somente `ai_reply`, sem botão

Não criar botão para iFood/99Food; esses nomes podem permanecer no texto quando a intenção for delivery.

## 5. Avaliação 1–5 — correção estrutural obrigatória

### Por que o fluxo antigo falhou

A pergunta de avaliação era enviada, mas a próxima resposta (`5`) caía no Default Reply como uma mensagem comum. Como não havia um estado `avaliacao_pendente`, o bot não tinha como saber com segurança que o número era uma nota.

### Fluxo correto

No fluxo que dispara a pesquisa, ANTES da pergunta:
1. Definir `avaliacao_pendente = true`.
2. Definir `avaliacao_feedback_pendente = false`.
3. Enviar a pergunta, por exemplo:
   `E aí! Como foi seu pedido no Sr. Boteco? De 1 a 5, que nota você dá pra gente? ⭐ É só me mandar o número de 1 a 5.`
4. Não adicionar botões de Cardápio/WhatsApp nessa mensagem.

A próxima mensagem do usuário entra no Default Reply normal. Como o body envia `avaliacao_pendente=true`, o webhook trata `1`, `2`, `3`, `4` ou `5` como nota.

### Após a External Request

Se `ai_intent = avaliacao_nota`:
1. Salvar `avaliacao_nota = ai_avaliacao_nota`.
2. Definir `avaliacao_pendente = false`.
3. Definir `avaliacao_feedback_pendente = ai_avaliacao_feedback_pendente`.
4. Enviar `ai_reply`.
5. Não mostrar CTA comercial.

Comportamento:
- nota 4 ou 5 → agradece e encerra a avaliação;
- nota 1, 2 ou 3 → agradece e pede, de forma leve, uma frase sobre o que pode melhorar.

Se `ai_intent = avaliacao_nota_invalida`:
- manter `avaliacao_pendente = true`;
- enviar `ai_reply` pedindo apenas número de 1 a 5.

Se `ai_intent = avaliacao_feedback`:
1. Salvar `avaliacao_feedback = ai_avaliacao_feedback`.
2. Definir `avaliacao_feedback_pendente = false`.
3. Enviar `ai_reply`.
4. Não adicionar CTA comercial.

IMPORTANTE: não mapear `ai_avaliacao_nota` diretamente e incondicionalmente sobre o campo persistente `avaliacao_nota` em todas as mensagens. Copiar para o campo persistente somente quando `ai_intent = avaliacao_nota`, para uma resposta comum não apagar uma nota já salva.

O usuário também pode escrever `Avaliação`; o webhook inicia a pergunta 1–5 e retorna `avaliacao_pendente=true`.

## 6. Cardápio Fitness — nenhuma automação especial

O Fitness está dentro do webhook e da base oficial. Não criar regras de keyword separadas no ManyChat.

Exemplos que o Default Reply deve resolver automaticamente:
- `cardápio fitness` → lista 10 itens;
- `frango fitness com cabotiá` → R$ 19,90;
- `tilápia low carb` → R$ 34,90;
- `omelete fitness` → R$ 22,90;
- `salada fitness com frango` → R$ 24,90.

A categoria não possui horário específico cadastrado; não adicionar horário manualmente no ManyChat.

## 7. Promoções e continuidade

Não criar keywords concorrentes que roubem a mensagem do Default Reply.

O webhook já faz:
- `promoção`, `oferta`, `quais promoções` → mostra Burger em Dobro + promoção de chopp juntas;
- `chopp`, `chope`, `happy hour`, `Brahma`, `Ashby` → promoção de chopp;
- `promoção de burger`, `lanche em dobro`, `terça`, `paga 1 leva 2` → Burger em Dobro;
- consulta normal de burger/lanche → preços normais + convite para conhecer a terça em dobro;
- resposta `sim`, `quero saber`, `como funciona` após esse convite → nova mensagem com a promoção.

Para isso funcionar, `ai_last_bot_reply`, `ai_last_intent` e `ai_last_topic` precisam ser atualizados após toda resposta.

## 8. Comentários do Instagram

Manter automação separada.

Body deve usar:
- `channel: "instagram"`
- `event_type: "instagram_comment"`
- `comment_text`: texto REAL do comentário selecionado pelo picker do ManyChat

Não digitar `comment_text`, `first_name` ou `{{first_name}}` como texto literal.

Comentários não usam o bloco de CTA contextual do Default Reply. Enviar apenas `ai_reply`, salvo quando o próprio fluxo tiver uma ação específica planejada.

## 9. Story Reply / Story Mention

Manter automações separadas, enviando `event_type` correspondente e o texto/evento real. Não criar CTA fixo em toda resposta.

## 10. WhatsApp

Usar o mesmo endpoint com:
- `channel: "whatsapp"`
- `atendimento_humano`: Custom Field atual
- os mesmos campos de contexto
- os campos de avaliação caso a pesquisa também seja usada no WhatsApp

Se `ai_handoff = true`:
1. enviar `ai_reply`;
2. definir `atendimento_humano = true`;
3. atribuir/notificar equipe;
4. nas próximas mensagens o webhook retorna `next_action = silencio_humano` e `reply=""`.

Vagas continuam indo ao WhatsApp do RH e não entram no handoff geral.

## 11. Testes obrigatórios depois de publicar

Executar com contato real de teste:

1. `GET /api/manychat` → versão 2.8.0.
2. DM `cardápio fitness` → 10 itens + somente CTA Cardápio.
3. DM `quanto custa a tilápia low carb?` → R$ 34,90.
4. DM `tem bisteca?` → R$ 19,90 + segunda a sexta 11h–15h.
5. DM `promoção` → Burger em Dobro + Chopp juntos.
6. DM `lanche` → preços normais + pergunta sobre promoção de terça.
7. Responder `sim` → nova mensagem explica Burger em Dobro.
8. DM `endereço` → texto + somente botão Como chegar.
9. DM `quero pedir` → texto + somente botão Fazer pedido.
10. Iniciar pesquisa de avaliação; responder `5` → agradecimento, sem cardápio/WhatsApp, e campo `avaliacao_nota=5` salvo.
11. Nova pesquisa; responder `2` → pede feedback; responder `demorou muito` → salva `avaliacao_feedback`.
12. Responder `8` durante pesquisa → pede número de 1 a 5 e mantém `avaliacao_pendente=true`.
13. Mandar apenas `5` SEM pesquisa pendente → não deve ser interpretado automaticamente como nota.
14. Comentário `Top demais` → Direct curto, sem CTA de venda.
15. Comentário `qual o valor do kibe?` → Quibe R$ 40,90.
16. WhatsApp com `atendimento_humano=true` → silêncio.

## 12. Critério de aceite visual

No Instagram, depois do ajuste:
- nenhum link de Cardápio/WhatsApp/Maps deve ficar no meio do texto da DM;
- não deve aparecer o par fixo Cardápio + WhatsApp em toda mensagem;
- cada assunto mostra somente o CTA coerente, ou nenhum CTA;
- avaliação não mostra CTA comercial;
- o texto e a linguagem humana atuais devem ser preservados.
