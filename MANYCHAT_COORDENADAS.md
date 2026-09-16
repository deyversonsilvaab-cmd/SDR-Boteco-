# Coordenadas de implantação no ManyChat — Instagram

Estas são as configurações que precisam ser feitas dentro do ManyChat. O ZIP resolve a lógica do webhook, mas não consegue criar sozinho os gatilhos, campos e blocos da sua conta ManyChat.

## 1. URL do webhook

Após o deploy no Vercel:

```text
https://SEU-DOMINIO-VERCEL/api/manychat
```

Método: `POST`

Header:

```text
Content-Type: application/json
x-webhook-secret: O_MESMO_VALOR_DO_WEBHOOK_SECRET_NO_VERCEL
```

Use somente HTTPS.

## 2. Campos personalizados a criar

Crie estes campos de usuário no ManyChat:

| Campo | Tipo sugerido | Finalidade |
|---|---|---|
| `ai_reply` | Texto | resposta final completa |
| `ai_reply_part_1` | Texto | primeira parte para Direct |
| `ai_reply_part_2` | Texto | segunda parte, se existir |
| `ai_reply_part_3` | Texto | terceira parte, se existir |
| `ai_intent` | Texto | intenção detectada |
| `ai_topic` | Texto | assunto/item para contexto da próxima mensagem |
| `ai_lead_temperature` | Texto | frio / morno / quente |
| `ai_next_action` | Texto | ação comercial recomendada |
| `ai_needs_human` | Booleano ou Texto | indica necessidade de humano |
| `ai_last_bot_reply` | Texto | opcional, histórico curto |
| `ai_whatsapp_vagas_link` | Texto | link do RH para currículos |

Se usar **Dynamic Block v2**, os campos `ai_intent`, `ai_topic`, `ai_lead_temperature`, `ai_next_action` e `ai_needs_human` precisam existir com esses nomes exatos, pois o próprio JSON tenta preenchê-los.

## 3. Corpo do External Request

Envie algo equivalente a:

```json
{
  "subscriber_id": "CAMPO_ID_DO_CONTATO",
  "first_name": "CAMPO_PRIMEIRO_NOME",
  "username": "CAMPO_USERNAME_INSTAGRAM",
  "message": "ULTIMA_MENSAGEM_DE_TEXTO",
  "last_intent": "CAMPO_ai_intent",
  "last_topic": "CAMPO_ai_topic",
  "last_bot_reply": "CAMPO_ai_last_bot_reply",
  "channel": "instagram"
}
```

No editor do ManyChat, insira as variáveis de sistema pelo seletor da plataforma em vez de digitar os placeholders manualmente. Isso evita enviar o texto do placeholder em vez do valor real.

**Obrigatório para a experiência pedida:** enviar `first_name` e a última mensagem do cliente em todas as rotas possíveis.

## 4. Response Mapping

Mapeie a resposta do webhook:

```text
$.reply                    -> ai_reply
$.reply_part_1             -> ai_reply_part_1
$.reply_part_2             -> ai_reply_part_2
$.reply_part_3             -> ai_reply_part_3
$.intent                   -> ai_intent
$.topic                    -> ai_topic
$.lead_temperature         -> ai_lead_temperature
$.next_action              -> ai_next_action
$.needs_human              -> ai_needs_human
$.whatsapp_vagas_link       -> ai_whatsapp_vagas_link
```

O campo `ai_topic` é o mais importante para perguntas de continuidade.

## 5. Envio da resposta no Direct

Após o External Request:

1. Envie `ai_reply_part_1`.
2. Se `ai_reply_part_2` não estiver vazio, envie a segunda mensagem.
3. Se `ai_reply_part_3` não estiver vazio, envie a terceira mensagem.
4. Salve opcionalmente `ai_reply` em `ai_last_bot_reply`.

Não envie as partes 2 e 3 quando estiverem vazias.

### Alternativa

Se você não quiser dividir mensagens, envie somente `ai_reply`. A divisão em partes existe para tornar a automação mais robusta no Instagram.

### Rota específica de vagas — modo External Request

Quando `ai_intent = vaga`, mantenha a resposta retornada pelo webhook e, se quiser usar botão adicional no ManyChat, configure:

```text
Texto do botão: Enviar currículo
URL: ai_whatsapp_vagas_link
```

O link atual autorizado do RH é `https://wa.me/5517996022567`. Não direcione currículos para o WhatsApp geral do restaurante. O webhook não promete contratação, entrevista ou retorno; informa somente que o RH analisará o perfil e entrará em contato se surgir oportunidade compatível.

## 6. Default Reply — rede de segurança principal

No Instagram, configure a **Resposta Padrão / Default Reply** para disparar quando o usuário enviar uma mensagem que não foi capturada por outra automação.

Estrutura recomendada:

```text
[Default Reply]
      ↓
[External Request -> /api/manychat]
      ↓ sucesso
[Enviar ai_reply_part_1]
      ↓
[Condições para parte 2 e parte 3]
      ↓
[Fim]
```

Configure para cobrir as mensagens diretas de modo amplo. Esse fluxo é o que evita situações em que o cliente escreve algo como `Olá tem alguém?`, `Burgers`, `picanha?` ou `quero fazer um pedido` e fica sem resposta.

## 7. Fallback do bloco externo — obrigatório

No bloco de External Request/Dynamic Block, configure um fallback do próprio ManyChat.

Mensagem sugerida:

```text
Quero te ajudar sem te passar nenhuma informação errada. Você pode conferir o cardápio e fazer seu pedido aqui:
https://botequimpatiolimeira.saipos.com/home?utm_id=97757_v0_s00_e0_tv0

Se preferir falar com a equipe:
https://wa.me/5519997858351
```

O webhook já possui fallback interno, mas o fallback do ManyChat protege também contra indisponibilidade de rede, domínio, Vercel ou falha antes de a requisição chegar ao servidor.

## 8. Resposta a Story

Crie/edite o gatilho de resposta a Story e encaminhe a mensagem/reação para o mesmo webhook.

Payload recomendado:

```json
{
  "first_name": "CAMPO_PRIMEIRO_NOME",
  "username": "CAMPO_USERNAME_INSTAGRAM",
  "message": "RESPOSTA_OU_REACAO_DO_STORY",
  "last_intent": "CAMPO_ai_intent",
  "last_topic": "CAMPO_ai_topic",
  "event_type": "story_reply",
  "channel": "instagram"
}
```

## 9. Menção em Story

Use o gatilho de menção em Story. Se não houver texto aproveitável, envie:

```json
{
  "first_name": "CAMPO_PRIMEIRO_NOME",
  "username": "CAMPO_USERNAME_INSTAGRAM",
  "event_type": "story_mention",
  "channel": "instagram"
}
```

O webhook reconhece o evento e gera uma resposta de relacionamento.

## 10. Comentários de posts e Reels → mensagem privada no Direct

Use uma automação separada de comentários. O webhook considera `event_type = instagram_comment` como a **mensagem privada enviada no Direct depois do comentário**, não como resposta pública.

Envie o texto real do comentário quando o ManyChat disponibilizar esse campo:

```json
{
  "first_name": "CAMPO_REAL_PRIMEIRO_NOME",
  "username": "CAMPO_USERNAME_INSTAGRAM",
  "comment_text": "CAMPO_REAL_TEXTO_DO_COMENTARIO",
  "event_type": "instagram_comment",
  "last_intent": "CAMPO_ai_intent",
  "last_topic": "CAMPO_ai_topic",
  "last_bot_reply": "CAMPO_ai_last_bot_reply",
  "channel": "instagram"
}
```

**Não digite literalmente** `first_name`, `{{first_name}}`, `comment_text` ou `TEXTO_DO_COMENTARIO` se esses textos não forem variáveis reais do seu workspace. Se o texto do comentário não estiver disponível, envie o campo vazio: a v2.2.1 responde de forma neutra, sem cardápio e sem WhatsApp.

No bloco que envia a mensagem ao cliente:

1. mapeie `$.reply` → `ai_reply`;
2. envie **somente** `{{ai_reply}}`;
3. remova qualquer rodapé, botão ou texto fixo `Faça o seu pedido!`;
4. não acrescente cardápio/WhatsApp por fora do webhook;
5. mantenha a automação separada de Direct, Story Reply e Story Mention.

Comportamento esperado: elogio → agradece; pergunta de preço → responde preço do cardápio; pedido explícito → pode enviar checkout; reclamação → pede detalhes sem CTA comercial; comentário sem texto → abre a conversa de forma curta.

## 11. Dynamic Block v2 — modo opcional

Se quiser que o próprio endpoint construa mensagens com botões, adicione ao corpo:

```json
{
  "response_mode": "dynamic_block"
}
```

Nesse modo o retorno segue a estrutura `version: v2` e pode adicionar botões como:

- Cardápio / Pedir
- iFood
- Falar no WhatsApp
- Enviar currículo, quando a intenção for vaga

Use este modo somente depois de testar o formato no seu workspace. A versão por External Request + Response Mapping é mais fácil de depurar e permite ver todos os campos de saída separadamente.

## 12. Regras para não perder mensagem

- Não coloque a inteligência principal em palavras-chave isoladas; use o Default Reply como rede ampla.
- Não deixe um External Request sem fallback.
- Não bloqueie mensagens genéricas como `oi`, `??`, `tem alguém?`, `burgers` ou erros de digitação.
- Sempre passe `ai_topic` de volta como `last_topic` na mensagem seguinte.
- Não apague o contexto logo após uma resposta de produto.
- Não envie resposta vazia quando `ai_reply_part_2` ou `ai_reply_part_3` estiver vazio.
- Não use uma automação paralela que responda antes do webhook à mesma mensagem, para evitar duplicidade.

## 13. Variáveis no Vercel

Em **Project > Settings > Environment Variables**:

```text
WEBHOOK_SECRET=chave_forte
OPENAI_API_KEY=sua_chave_opcional
OPENAI_MODEL=gpt-4o
BUSINESS_NAME=Sr. Boteco Limeira
```

Depois de alterar variáveis, faça novo deploy.

## 14. Teste de aceite antes de publicar

Envie pelo Instagram, usando uma conta de teste, no mínimo:

```text
Oi, quero saber sobre a Tábua Mista
O que acompanha o prato?
Olá tem alguém?
Queria o cardápio
Burgers
Vocês têm picanha?
Foundie
Olá, boa noite. Queria fazer um pedido
Qual o valor da bisteca?
Vocês entregam?
Aceita vale alimentação?
Quero reservar uma mesa
Quero mandar meu currículo
Tem vaga de garçom?
```

Critérios de aprovação:

- 100% recebem resposta;
- o primeiro nome aparece quando disponível no contato;
- nenhum preço não cadastrado é criado;
- item sem dado validado recebe cardápio + WhatsApp;
- pedido recebe link de pedido;
- delivery apresenta os canais configurados;
- a pergunta seguinte continua no contexto do item anterior;
- erro de rede cai no fallback e não deixa a conversa parada;
- mensagens de vaga/currículo retornam o WhatsApp do RH `https://wa.me/5517996022567`, nunca o WhatsApp geral.
