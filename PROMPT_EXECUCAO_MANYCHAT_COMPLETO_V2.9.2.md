# Prompt de execução — ManyChat completo — SDR Sr. Boteco v2.9.2

> Nota: a v2.9.2 altera a IA integrada no webhook, mas não exige ativar AI Step do ManyChat.
>
> Objetivo: alinhar o ManyChat ao webhook v2.9.2 sem usar a IA paga do ManyChat, sem alterar o `WEBHOOK_SECRET` e sem criar automações concorrentes. Esta versão corrige a avaliação 1–5, adiciona CTA de avaliação Google para nota 5 e deixa as URLs de ação escondidas em botões no Instagram.

## 1. Pré-validação obrigatória

1. Confirmar o webhook: `https://sdr-boteco.vercel.app/api/manychat`.
2. Abrir o GET do endpoint e confirmar:
   - `ok: true`
   - `version: "2.9.2"`
   - `channels: ["instagram","whatsapp"]`
3. Se a versão não for 2.9.2, não alterar os fluxos ainda. Publicar primeiro o ZIP v2.9.2.
4. Não mexer em OAuth, permissões Meta ou `WEBHOOK_SECRET` durante este ajuste.

## 2. Custom Fields necessários

### Contexto principal
- `ai_reply` — Texto
- `ai_intent` — Texto
- `ai_topic` — Texto
- `ai_last_bot_reply` — Texto
- `ai_last_intent` — Texto
- `ai_last_topic` — Texto
- `ai_needs_human` — Boolean/Text
- `ai_next_action` — Texto
- `ai_app_version` — Texto

### CTA contextual
- `ai_cta_count` — Number/Text
- `ai_cta_type` — Texto
- `ai_cta_label` — Texto
- `ai_cta_url` — Texto
- `ai_cta_1_type` / `ai_cta_1_label` / `ai_cta_1_url`
- `ai_cta_2_type` / `ai_cta_2_label` / `ai_cta_2_url`
- `ai_cta_3_type` / `ai_cta_3_label` / `ai_cta_3_url`

### Avaliação
Campos persistentes:
- `avaliacao_pendente` — Boolean/Text
- `avaliacao_nota` — Number/Text
- `avaliacao_feedback_pendente` — Boolean/Text
- `avaliacao_feedback` — Texto

Campos temporários do webhook:
- `ai_avaliacao_salva`
- `ai_avaliacao_nota`
- `ai_avaliacao_pendente`
- `ai_avaliacao_feedback_pendente`
- `ai_avaliacao_feedback`

### WhatsApp/handoff
- `atendimento_humano`
- `ai_handoff`
- `ai_handoff_reason`

## 3. External Request principal — Instagram Default Reply

POST para `https://sdr-boteco.vercel.app/api/manychat`.

Header:
- `x-webhook-secret`: usar o segredo já configurado na conta. Não registrar o valor neste documento.

Body lógico — selecionar as variáveis reais pelo picker do ManyChat, nunca digitar placeholders como texto:

```json
{
  "subscriber_id": "<ID real>",
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
- `app_version` → `ai_app_version`
- `cta_count` → `ai_cta_count`
- `cta_type` → `ai_cta_type`
- `cta_label` → `ai_cta_label`
- `cta_url` → `ai_cta_url`
- `cta_1_type/label/url` → campos `ai_cta_1_*`
- `cta_2_type/label/url` → campos `ai_cta_2_*`
- `cta_3_type/label/url` → campos `ai_cta_3_*`
- `handoff` → `ai_handoff`
- `handoff_reason` → `ai_handoff_reason`
- `avaliacao_salva` → `ai_avaliacao_salva`
- `avaliacao_nota` → `ai_avaliacao_nota`
- `avaliacao_pendente` → `ai_avaliacao_pendente`
- `avaliacao_feedback_pendente` → `ai_avaliacao_feedback_pendente`
- `avaliacao_feedback` → `ai_avaliacao_feedback`

Depois de resposta válida, atualizar sempre:
- `ai_last_bot_reply = ai_reply`
- `ai_last_intent = ai_intent`
- `ai_last_topic = ai_topic`

## 4. Remover definitivamente o bloco fixo de botões

Excluir do Default Reply os blocos fixos atuais como:
- `Faça o seu pedido!`
- `É só tocar aqui 👇`
- botão fixo `Cardápio`
- botão fixo `Falar no WhatsApp`

Eles não podem aparecer em todas as mensagens.

O webhook v2.9.2 já devolve a intenção e os CTAs corretos. O fluxo do ManyChat deve apenas renderizar o `ai_reply` e os botões indicados pelos campos CTA.

## 5. Matriz dos botões — conferir URLs exatamente

Use estas combinações. Não deixe a URL aparente no texto da DM.

- `cardapio` → **Cardápio** → `https://botequimpatiolimeira.saipos.com/home?utm_id=97757_v0_s00_e0_tv0`
- `pedido` → **Fazer pedido** ou **Pedido direto** → mesmo link do cardápio/pedido
- `ifood` → **iFood** → `https://www.ifood.com.br/delivery/limeira-sp/sr-boteco-shopping-patio-limeita-centro/c318d733-afe4-4098-80af-296be4eb0c72`
- `99food` → **99Food** → `https://99app.com/99food/food/`
- `localizacao` → **Como chegar** → `https://maps.app.goo.gl/sr7PgRhUxaNuzg8e8`
- `whatsapp` → **Falar no WhatsApp** → `https://wa.me/5519997858351`
- `rh` → **Enviar currículo** → `https://wa.me/5517996022567`
- `avaliacao_google` → **Avaliar no Google** → usar `ai_cta_url` retornado pelo webhook

### Renderização recomendada

1. Sempre enviar `ai_reply`.
2. Se `ai_cta_count = 0`, encerrar sem botão.
3. Se `ai_cta_count = 1`, adicionar somente o botão de `ai_cta_1_type`.
4. Se `ai_cta_count = 2`, adicionar botões 1 e 2.
5. Se `ai_cta_count = 3`, adicionar botões 1, 2 e 3.
6. Para delivery, a v2.9.2 devolve normalmente 3 botões: **Pedido direto**, **iFood**, **99Food**.

Se a interface do ManyChat não aceitar label dinâmico, use condições por `ai_cta_1_type`, `ai_cta_2_type` e `ai_cta_3_type` e escreva o rótulo fixo correspondente. A URL pode ser o campo `ai_cta_N_url` ou a URL oficial acima.

## 6. Avaliação 1–5 — estrutura correta

### Problema que existia

A mensagem de pesquisa era enviada, mas a resposta `5` entrava como mensagem comum. Sem `avaliacao_pendente=true`, o webhook não pode interpretar um número isolado como nota com segurança.

### Antes de perguntar a nota

No fluxo de pesquisa:
1. `avaliacao_pendente = true`
2. `avaliacao_feedback_pendente = false`
3. Limpar `avaliacao_feedback` se desejar iniciar uma nova pesquisa.
4. Enviar:
   `E aí! Como foi seu pedido no Sr. Boteco? De 1 a 5, que nota você dá pra gente? ⭐ É só me mandar o número de 1 a 5.`
5. Não anexar nenhum botão comercial nessa pergunta.

A resposta do cliente deve voltar pelo Default Reply, que envia `avaliacao_pendente` ao webhook.

### Nota 5

O webhook retorna:
- `intent = avaliacao_nota`
- `avaliacao_nota = 5`
- `avaliacao_salva = true`
- `avaliacao_feedback_pendente = false`
- `cta_type = avaliacao_google`
- botão **Avaliar no Google**

No ManyChat:
1. Salvar `avaliacao_nota = ai_avaliacao_nota`.
2. `avaliacao_pendente = false`.
3. Enviar `ai_reply`.
4. Mostrar somente o botão **Avaliar no Google** usando `ai_cta_url`.
5. Não mostrar Cardápio, Pedido ou WhatsApp junto da avaliação.

### Nota 4

O webhook agradece e pergunta, de forma leve, o que faltou para virar 5 estrelas.
- `avaliacao_feedback_pendente = true`
- sem botão comercial

Salvar a nota e aguardar a próxima frase como feedback.

### Nota 3

O webhook agradece e pergunta o que pode melhorar.
- `avaliacao_feedback_pendente = true`
- sem CTA comercial

### Notas 1 ou 2

O webhook agradece a sinceridade e pede uma frase explicando o que aconteceu ou o que pode melhorar.
- `avaliacao_feedback_pendente = true`
- sem CTA comercial

### Mensagem de feedback seguinte

Quando `avaliacao_feedback_pendente=true`, a próxima mensagem é enviada normalmente ao webhook. Ele retorna:
- `intent = avaliacao_feedback`
- `avaliacao_feedback` preenchido
- `avaliacao_feedback_pendente = false`

No ManyChat:
1. salvar `avaliacao_feedback = ai_avaliacao_feedback`;
2. zerar `avaliacao_feedback_pendente`;
3. enviar `ai_reply`;
4. não adicionar botão comercial.

### Nota inválida

Se a pessoa responder `8`, texto sem nota etc. durante a pesquisa:
- manter `avaliacao_pendente = true`;
- enviar `ai_reply` pedindo número de 1 a 5.

### Regra de segurança

Não tratar qualquer `1`, `2`, `3`, `4` ou `5` isolado como avaliação fora de contexto. O estado `avaliacao_pendente` é obrigatório, salvo quando o próprio webhook iniciou a avaliação ou o `event_type` é explicitamente de avaliação.

## 7. Cardápio Fitness

Não criar keyword paralela. O webhook resolve diretamente:
- `Fit`
- `Fitness`
- `cardápio fitness`
- `menu fit`
- itens individuais como `Tilápia Low Carb`, `Omelete Fitness`, `Frango Fitness com Cabotiá`.

`Fit` sozinho deve listar os 10 itens do Cardápio Fitness e retornar CTA **Cardápio**.

## 8. Promoções e memória

Não criar automações concorrentes para palavras como `promoção`, `lanche`, `burger`, `chopp`, `sim`.

O webhook já resolve:
- `promoção/oferta` genérica → todas as promoções juntas;
- chopp → promoção de chopp;
- burger/lanche → preços normais + convite da terça em dobro;
- resposta `sim` após convite → explicação da promoção em nova mensagem.

Para isso, salvar sempre `ai_last_bot_reply`, `ai_last_intent` e `ai_last_topic`.

## 9. Comentários e Stories

Manter os fluxos separados.

Comentários:
- `channel = instagram`
- `event_type = instagram_comment`
- `comment_text` = texto real do comentário via picker

Não digitar `comment_text`, `first_name` ou placeholders como texto literal.

Stories:
- manter `story_reply` e `story_mention` com texto/evento real.

## 10. WhatsApp

O WhatsApp não usa os botões de CTA do Instagram. Os links podem continuar no texto.

Enviar:
- `channel = whatsapp`
- `atendimento_humano`
- memória de contexto
- campos de avaliação se a pesquisa também for usada nesse canal

Se `ai_handoff=true`, enviar `ai_reply`, definir `atendimento_humano=true` e encaminhar à equipe. Com humano ativo, o webhook devolve `reply=""` e `next_action="silencio_humano"`.

## 11. Testes obrigatórios após publicar

1. GET → `version: 2.9.2`.
2. DM `Fit` → lista Fitness + botão Cardápio, sem URL no texto.
3. DM `cardápio` → texto limpo + somente Cardápio.
4. DM `quero pedir` → somente Fazer pedido.
5. DM `entrega` → texto limpo + 3 botões: Pedido direto, iFood, 99Food.
6. DM `endereço` → Como chegar.
7. DM `quero falar com atendente` → Falar no WhatsApp.
8. DM `vaga` → Enviar currículo.
9. Iniciar avaliação → responder `5` → agradecimento + somente **Avaliar no Google**.
10. Nova avaliação → `4` → resposta específica + coleta de feedback.
11. Nova avaliação → `3` → pede melhoria.
12. Nova avaliação → `1` ou `2` → resposta empática + coleta feedback.
13. Após nota baixa, responder uma frase → `avaliacao_feedback` salvo.
14. Mandar `5` fora de avaliação → não deve virar avaliação.
15. Confirmar que nenhum link de Cardápio/WhatsApp/iFood/99Food/Maps/RH/Google Review aparece no meio das DMs do Instagram.
16. Confirmar que o antigo bloco fixo `Faça o seu pedido!` + `Cardápio` + `Falar no WhatsApp` não aparece mais.

## 12. Critério visual final

A DM deve parecer uma conversa, não um painel de links:
- texto curto e humano;
- nenhuma URL solta no meio da resposta;
- somente botões relacionados ao assunto;
- avaliação 5 com um único botão **Avaliar no Google**;
- notas 1–4 com resposta específica e sem CTA comercial;
- delivery pode ter até 3 botões porque são três canais reais de pedido.


## Nota específica v2.9.2 — fallbacks do Instagram

- Não crie texto fixo adicional para fallback no ManyChat; envie apenas `{{ai_reply}}`.
- Quando `cta_type = whatsapp`, renderize somente o botão indicado pelo webhook.
- Os intents `outro`, `sem_mensagem` e `erro_seguro` já retornam texto limpo sem URL aparente.
- Não mantenha os antigos botões fixos Cardápio + WhatsApp em todas as mensagens.
