# Bot Sr. Boteco — ManyChat + Vercel + OpenAI

Webhook para responder mensagens do Instagram via ManyChat usando OpenAI, com regra de não inventar preços.

## 1. Arquivos principais

- `api/manychat.js` — endpoint que o ManyChat chama.
- `data/knowledge.json` — base de conhecimento: produtos, preços, regras e links.
- `.env.example` — variáveis que devem ser cadastradas na Vercel.
- `vercel.json` — configuração do deploy.

## 2. Como subir no GitHub

1. Crie um repositório chamado `bot-sr-boteco`.
2. Envie todos estes arquivos para o repositório.
3. Entre na Vercel e clique em **Add New Project**.
4. Importe o repositório.
5. Em **Environment Variables**, cadastre:

```env
OPENAI_API_KEY=sua_chave_da_openai
OPENAI_MODEL=gpt-5.5
WEBHOOK_SECRET=uma_senha_forte_criada_por_voce
BUSINESS_NAME=Sr. Boteco Limeira
```

6. Clique em **Deploy**.

## 3. URL que será usada no ManyChat

Depois do deploy, a Vercel vai gerar uma URL parecida com:

```txt
https://bot-sr-boteco.vercel.app/api/manychat
```

Abra essa URL no navegador. Se aparecer `Webhook online`, está funcionando.

## 4. Configuração no ManyChat

No Flow Builder:

1. Crie um bloco para receber mensagens do Instagram.
2. Adicione uma ação **External Request**.
3. Method: `POST`.
4. URL: `https://SEU-PROJETO.vercel.app/api/manychat`.
5. Headers:

```txt
Content-Type: application/json
x-webhook-secret: sua_senha_do_WEBHOOK_SECRET
```

6. Body JSON:

```json
{
  "subscriber_id": "{{subscriber.id}}",
  "first_name": "{{first_name}}",
  "username": "{{username}}",
  "message": "{{last_input_text}}"
}
```

7. Salve a resposta `$.reply` em um campo personalizado, por exemplo: `ai_reply`.
8. No próximo bloco, envie a mensagem:

```txt
{{ai_reply}}
```

Também pode salvar:

- `$.intent` em `ai_intent`
- `$.needs_human` em `ai_needs_human`
- `$.lead_temperature` em `ai_lead_temperature`

## 5. Como editar preços

Abra `data/knowledge.json` e altere somente os itens dentro de `produtos_precos`.

Exemplo:

```json
{
  "nome": "Fondue Salgado",
  "aliases": ["fondue salgado", "fundi salgado", "salgado"],
  "valor": "R$ 99,90",
  "descricao": "Opção salgada do fondue."
}
```

Se um preço não estiver nessa base, a IA foi instruída a não inventar.

## 6. Teste local opcional

```bash
npm install
cp .env.example .env
npm run dev
```

Em outro terminal:

```bash
WEBHOOK_SECRET=sua_senha npm run test:local
```

## 7. Observação importante sobre modelo

O modelo fica na variável `OPENAI_MODEL`. Se sua conta não tiver acesso ao modelo configurado, troque o valor por outro modelo disponível na sua conta OpenAI.
