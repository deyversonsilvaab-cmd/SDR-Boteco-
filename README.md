# SDR Boteco — ManyChat + Instagram + Vercel

Versão 2.0.0 — revisão de produção em 15/09/2026.

Este projeto é o webhook de atendimento do **Sr. Boteco Limeira**. Ele foi estruturado para receber mensagens do ManyChat, identificar a intenção do cliente, consultar uma base fechada de informações comerciais e devolver uma resposta humanizada sem inventar preços, itens, composição, porções, horários ou disponibilidade.

## Objetivos da versão 2

- Nenhuma mensagem recebida deve ficar sem resposta por falha de interpretação.
- O cliente é chamado pelo primeiro nome quando o ManyChat envia `first_name`.
- Perguntas curtas de continuidade, como `valor?`, `o que acompanha?` e `serve quantas pessoas?`, usam `last_topic` para manter o contexto.
- Preços só podem aparecer quando existem na base `data/knowledge.json`.
- Itens sem dados validados recebem cardápio + WhatsApp, em vez de uma resposta inventada.
- Pedidos e oportunidades de envio do cardápio direcionam para o cardápio/pedido online.
- Delivery oferece pedido direto, iFood e 99Food.
- O atendimento continua funcionando mesmo sem OpenAI: a camada determinística é a fonte da verdade; a IA é usada apenas para humanizar a redação quando configurada.
- Existe resposta segura mesmo se ocorrer um erro interno no webhook.
- O endpoint pode responder no formato JSON tradicional ou no formato **Dynamic Block v2** do ManyChat.

## Links oficiais usados pela automação

- Cardápio/pedido: `https://botequimpatiolimeira.saipos.com/home`
- WhatsApp: `https://wa.me/5519997858351`
- iFood: `https://www.ifood.com.br/delivery/limeira-sp/sr-boteco-shopping-patio-limeita-centro/c318d733-afe4-4098-80af-296be4eb0c72`
- 99Food: `https://99app.com/99food/food/`
- Site: `https://srboteco.com.br/`
- Vagas: `https://wa.me/5517991034703`

O 99Food está configurado com o link oficial do serviço. Como não há um deep link específico da loja validado nesta base, a resposta orienta o cliente a procurar por **Sr. Boteco Limeira** no aplicativo.

## Estrutura

```text
.
├── api/
│   └── manychat.js              # webhook principal
├── data/
│   └── knowledge.json           # fonte oficial de fatos, preços e regras
├── audit-test.mjs               # auditoria de cenários críticos
├── test-local.js                # teste simples do endpoint local
├── MANYCHAT_COORDENADAS.md      # configuração detalhada no ManyChat
├── PROMPT_CONFIGURACAO_ADICIONAL.md
├── REVISAO_FINAL.md
├── package.json
├── vercel.json
└── .env.example
```

## Endpoint

Após publicar no Vercel:

```text
POST https://SEU-PROJETO.vercel.app/api/manychat
```

Health check:

```text
GET https://SEU-PROJETO.vercel.app/api/manychat
```

## Corpo recomendado enviado pelo ManyChat

```json
{
  "subscriber_id": "{{id}}",
  "first_name": "{{first_name}}",
  "username": "{{username}}",
  "message": "{{last_text_input}}",
  "last_intent": "{{ai_intent}}",
  "last_topic": "{{ai_topic}}",
  "channel": "instagram"
}
```

Os nomes exatos das variáveis de sistema podem variar conforme a interface/conta do ManyChat. O ponto essencial é enviar o **primeiro nome**, a **mensagem recebida** e os campos de contexto salvos após a resposta anterior.

O webhook aceita também diversos nomes alternativos de campo (`text`, `input`, `comment_text`, `story_text`, etc.) para reduzir o risco de uma integração quebrar por pequenas diferenças no payload.

## Resposta JSON padrão

Exemplo resumido:

```json
{
  "ok": true,
  "reply": "Mariana, ...",
  "intent": "cardapio",
  "topic": "cardapio",
  "last_topic": "cardapio",
  "needs_human": false,
  "lead_temperature": "quente",
  "next_action": "abrir_cardapio",
  "cardapio_link": "https://botequimpatiolimeira.saipos.com/home",
  "whatsapp_link": "https://wa.me/5519997858351",
  "reply_part_1": "Mariana, ...",
  "reply_part_2": "",
  "reply_part_3": ""
}
```

No ManyChat, salve no mínimo:

- `$.reply` → `ai_reply`
- `$.intent` → `ai_intent`
- `$.topic` → `ai_topic`
- `$.lead_temperature` → `ai_lead_temperature`
- `$.next_action` → `ai_next_action`
- `$.reply_part_1` → `ai_reply_part_1`
- `$.reply_part_2` → `ai_reply_part_2`
- `$.reply_part_3` → `ai_reply_part_3`

Use `MANYCHAT_COORDENADAS.md` para a configuração completa.

## Dynamic Block v2 — opcional

Se o corpo do POST contiver:

```json
{
  "response_mode": "dynamic_block"
}
```

o endpoint devolve o formato v2 do ManyChat com mensagens e, quando aplicável, botões de URL para cardápio/pedido, iFood e WhatsApp. Nesse modo, crie previamente no ManyChat os campos:

- `ai_intent`
- `ai_topic`
- `ai_lead_temperature`
- `ai_next_action`
- `ai_needs_human` (True/False)

A configuração tradicional por **External Request + Response Mapping** continua sendo a opção mais simples para implantação e depuração.

## Regras de segurança da informação comercial

`data/knowledge.json` é a única fonte de fatos comerciais da automação.

A aplicação aplica quatro níveis de proteção:

1. **roteamento determinístico:** identifica intenções críticas antes de chamar a IA;
2. **base fechada:** dados ausentes são tratados como não validados;
3. **trava de preço:** se a IA escrever um valor em `R$` que não existe na base, a resposta é descartada;
4. **fallback seguro:** em erro de servidor ou de IA, o cliente recebe cardápio e WhatsApp, nunca silêncio.

Nunca adicione preço por aproximação ou por memória. Atualize o item em `data/knowledge.json` e rode os testes.

## Itens sem informação completa

Alguns produtos citados por clientes podem existir no cardápio real, mas não possuem preço/composição/porção validados no material original deste projeto. Nesses casos a automação **não inventa**. Ela responde imediatamente com:

- link do cardápio atualizado;
- WhatsApp da equipe para confirmação específica;
- contexto salvo para que uma pergunta seguinte não fique perdida.

Isso é intencional e é mais seguro do que preencher lacunas com informação não confirmada.

## Pedido e delivery

Quando o cliente disser frases como:

- `quero fazer um pedido`;
- `manda o cardápio`;
- `quero pedir para retirar`;
- `faz entrega?`;
- `delivery`;

a automação encaminha para o cardápio/pedido online e informa as opções de retirada/entrega conforme o checkout. Para delivery, também apresenta iFood e 99Food.

## Contexto de conversa

Após cada resposta, salve `topic` no campo `ai_topic` do ManyChat e envie esse campo na próxima chamada como `last_topic`.

Exemplo:

1. Cliente: `Tábua Mista`
2. Bot: informa que os detalhes não estão validados e envia cardápio/WhatsApp; `topic = item:tabua_mista`
3. Cliente: `O que acompanha o prato?`
4. O webhook entende que a pergunta continua sendo sobre a Tábua Mista e não responde sobre outro produto.

O mesmo mecanismo funciona para itens catalogados e perguntas como preço, composição e quantidade de pessoas servidas.

## Personalização por nome

O ManyChat deve enviar `first_name` em todas as chamadas possíveis. O webhook usa apenas o nome recebido do contato e nunca cria nome fictício.

Se `first_name` estiver vazio, a resposta continua funcionando sem placeholder. Para cumprir a experiência de atendimento personalizada, confirme no ManyChat se o campo de sistema de primeiro nome está sendo passado no External Request.

## OpenAI

A chave é opcional:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
```

Com chave: a IA reescreve os fatos em tom humano/vendedor consultivo, sujeita às travas do código.

Sem chave ou se a API falhar: o webhook usa a resposta determinística já validada. Portanto, uma indisponibilidade da IA não deve deixar o cliente sem resposta.

## Segurança do webhook

Recomendado no Vercel:

```env
WEBHOOK_SECRET=uma-chave-forte-e-unica
```

E no ManyChat, no External Request:

```text
x-webhook-secret: a-mesma-chave
```

Se `WEBHOOK_SECRET` estiver vazio, o endpoint aceita chamadas sem autenticação. Para produção, não deixe vazio.

## Deploy no Vercel

1. Suba esta pasta para o repositório GitHub conectado ao Vercel.
2. Confirme que a raiz do projeto contém `package.json`, `vercel.json`, `api/` e `data/`.
3. Configure as variáveis de ambiente no Vercel.
4. Faça o deploy.
5. Abra `GET /api/manychat` e confirme `ok: true`.
6. Teste o POST pelo ManyChat antes de publicar a automação para todos os contatos.

## Testes

Execute:

```bash
npm run check
```

ou:

```bash
npm run audit
```

A auditoria cobre, entre outros, os casos que anteriormente podiam ficar sem resposta: saudação, cardápio, pedido, delivery, categorias genéricas, item não validado, continuação de contexto, reserva, forma de pagamento e encaminhamento humano.

## Regra para futuras alterações

Antes de publicar qualquer mudança:

1. altere os fatos em `data/knowledge.json`;
2. não replique preços diretamente no código se puder evitá-lo;
3. adicione/ajuste um teste em `audit-test.mjs`;
4. execute `npm run check`;
5. só então faça deploy.
