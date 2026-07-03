# Bot Sr. Boteco — ManyChat + Vercel + OpenAI

Webhook para responder mensagens do Instagram/WhatsApp via ManyChat usando OpenAI, com respostas rápidas para as principais campanhas e regra para não inventar preços.

## 1. Arquivos principais

- `api/manychat.js` — endpoint que o ManyChat chama.
- `data/knowledge.json` — base de conhecimento: campanhas, respostas, preços autorizados, horários e links.
- `.env.example` — variáveis que devem ser cadastradas na Vercel.
- `vercel.json` — configuração do deploy.
- `audit-test.mjs` — simulação local das principais perguntas.

## 2. Melhorias incluídas nesta versão

- Fondue atualizado sem relação com Dia dos Namorados.
- Resposta de marcação em story/foto mais humana.
- Open Chopp separado de rodízio, jogo e Open em Campo.
- Valores do Open Chopp liberados:
  - Domingo a quinta: R$ 29,90
  - Sexta e sábado: R$ 49,90
  - Horário: 16h às 21h
- Almoço atualizado com texto mais orgânico e opções a partir de R$ 19,90.
- Consulta de preços dos itens do cardápio direcionada para WhatsApp.
- Correção para não classificar “free” e “serviço” como vaga.
- Correção para “guaraná normal” não cair em bebida proteica.
- Novas intenções: `open_chopp`, `happy_hour`, `double_burger`, `feijoada`, `marcacao_story`, `empresa_b2b`, `estacionamento`, `bebidas` e `bebida_sem_alcool`.
- Opção sem álcool atualizada: não temos chopp zero; temos Heineken Zero long neck.

## 3. Como subir no GitHub

1. Crie ou abra o repositório do bot.
2. Substitua os arquivos antigos por estes arquivos atualizados.
3. Envie as alterações para o GitHub.
4. A Vercel deve fazer o deploy automaticamente se o repositório já estiver conectado.

Se for um projeto novo:

1. Entre na Vercel e clique em **Add New Project**.
2. Importe o repositório.
3. Em **Environment Variables**, cadastre:

```env
OPENAI_API_KEY=sua_chave_da_openai
OPENAI_MODEL=gpt-4o
WEBHOOK_SECRET=uma_senha_forte_criada_por_voce
BUSINESS_NAME=Sr. Boteco Limeira
```

4. Clique em **Deploy**.

## 4. URL que será usada no ManyChat

Depois do deploy, a Vercel vai gerar uma URL parecida com:

```txt
https://bot-sr-boteco.vercel.app/api/manychat
```

Abra essa URL no navegador. Se aparecer `Webhook online`, está funcionando.

## 5. Configuração no ManyChat

No Flow Builder:

1. Crie ou abra o bloco que recebe mensagens do Instagram.
2. Adicione uma ação **External Request**.
3. Method: `POST`.
4. URL: `https://SEU-PROJETO.vercel.app/api/manychat`.
5. Headers:

```txt
Content-Type: application/json
x-webhook-secret: sua_senha_do_WEBHOOK_SECRET
```

6. Body JSON recomendado:

```json
{
  "subscriber_id": "{{subscriber.id}}",
  "first_name": "{{first_name}}",
  "username": "{{username}}",
  "message": "{{last_input_text}}",
  "last_intent": "{{ai_intent}}"
}
```

O campo `last_intent` ajuda o bot a responder quando o cliente manda só “valor” depois de perguntar sobre Open Chopp.

7. Salve a resposta `$.reply` em um campo personalizado, por exemplo: `ai_reply`.
8. Salve também:

```txt
$.intent → ai_intent
$.needs_human → ai_needs_human
$.lead_temperature → ai_lead_temperature
```

9. No próximo bloco, envie a mensagem:

```txt
{{ai_reply}}
```

## 6. Como editar preços

Abra `data/knowledge.json` e altere somente os itens dentro de `produtos_precos` ou as campanhas aprovadas.

Exemplo:

```json
{
  "categoria": "Fondue",
  "nome": "Fondue Salgado",
  "aliases": ["fondue salgado", "fundi salgado"],
  "valor": "R$ 99,90",
  "validade": "Das 16h às 21h."
}
```

Se um preço não estiver nessa base, o bot deve direcionar para o WhatsApp e não inventar valor.

## 7. Teste local opcional

```bash
npm install
cp .env.example .env
npm run dev
```

Em outro terminal:

```bash
WEBHOOK_SECRET=sua_senha npm run test:local
```

Para rodar a varredura de intenções:

```bash
npm run audit
```

## 8. Observação importante sobre modelo

O modelo fica na variável `OPENAI_MODEL`. Se sua conta não tiver acesso ao modelo configurado, troque o valor por outro modelo disponível na sua conta OpenAI.

## Campanha Open Chopp — tráfego pago

As respostas prontas do anúncio ficam em `data/knowledge.json`, no bloco:

```json
respostas_anuncio_open_chopp
```

O webhook reconhece perguntas sobre:

- valor do Open Chopp;
- Open Chopp hoje;
- localização;
- reserva e mesa;
- desafio do placar;
- combo frango a passarinho + calabresa;
- família, criança, casal, turma e aniversário;
- horário, pagamento, taxa e regra individual;
- bebida sem álcool / Heineken Zero long neck;
- almoço;
- grupos e happy hour de empresa;
- comentários curtos e palpites de placar.

Para mensagens curtas como `Valor?` ou `Que horas?` vindas do anúncio, envie no External Request um campo de contexto, por exemplo:

```json
{
  "message": "{{last_text_input}}",
  "last_intent": "open_chopp",
  "last_topic": "anuncio_open_chopp"
}
```

Isso ajuda o sistema a responder com o valor e horário do Open Chopp, em vez de tratar a pergunta como genérica do cardápio.

## Fluxo Fondue — dúvida sobre valor por pessoa/casal

Foi adicionada uma resposta direta para perguntas como:

- “Valor por pessoa ou casal?”
- “Esse valor é pro casal?”
- “Serve 2 pessoas?”
- “É individual?”
- “Para quantas pessoas serve?”

Resposta usada pelo sistema:

```text
Isso mesmo 😊

O valor não é por pessoa, é do prato de fondue feito para servir 2 pessoas.

🧀 O Fondue Salgado sai por R$ 99,90
🍫 O Fondue Doce sai por R$ 89,90

Ele fica disponível das 16h às 21h.
```

Para melhorar o contexto no ManyChat, envie no External Request:

```json
{
  "message": "{{last text input}}",
  "last_intent": "fondue",
  "last_topic": "fondue"
}
```


## Ajuste obrigatório no ManyChat para Instagram

Para o robô responder conversas e marcações, o ManyChat precisa chamar o webhook em cada gatilho. Apenas a mensagem de boas-vindas não aciona a IA.

### Conversas / Direct
No fluxo de Direct, depois da mensagem inicial, adicione um bloco **External Request** apontando para `/api/manychat` e envie no body:

```json
{
  "message": "{{last_text_input}}",
  "first_name": "{{first_name}}",
  "username": "{{username}}",
  "last_intent": "{{last_intent}}",
  "last_topic": "{{last_topic}}"
}
```

Mapeie a resposta `$.reply` para o campo/resposta exibida no ManyChat.

### Marcação em story
Crie um gatilho de **Instagram Story Mention / Menção no Story**. Nesse gatilho, chame o mesmo webhook enviando:

```json
{
  "message": "mencionou você no próprio story",
  "event_type": "story_mention",
  "first_name": "{{first_name}}",
  "username": "{{username}}"
}
```

Também é possível usar a mensagem fixa diretamente no ManyChat:

```text
Aaa que demais ver sua marcação 😍

Obrigado por compartilhar esse momento com a gente.

Ficamos felizes demais de fazer parte do seu passeio.

Volta mais vezes, viu? 🍻
```

### Fondue

A resposta de Fondue deve apresentar as duas opções completas com acompanhamentos:

- Fondue Salgado — R$ 99,90: torradas, iscas de frango empanado, contrafilé, calabresa e batata frita.
- Fondue Doce — R$ 89,90: morango, uva, banana, brownie e marshmallow.

Regra: o valor é do prato feito para servir 2 pessoas, não é por pessoa. Disponível das 16h às 21h.

