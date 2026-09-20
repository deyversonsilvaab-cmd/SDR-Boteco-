# SDR Boteco — ManyChat + Instagram + WhatsApp + Vercel

Versão 2.9.1 — avaliação 1–5 com CTA Google, URLs de ação somente em botões no Instagram, fallbacks limpos, Cardápio Fitness, promoções unificadas, Pratos do Dia e cobertura completa do catálogo.

## Fallback Instagram consolidado — v2.9.1

- Corrige os textos de fallback quando URLs são retiradas da DM e substituídas por CTA nativo.
- `outro`, `sem_mensagem` e `erro_seguro` não deixam mais `em`, `:` ou rótulos de link sobrando.
- Quando a mensagem orienta “pelo botão abaixo”, o payload garante o CTA **Falar no WhatsApp**.
- Corrige um falso positivo antigo de saudação: palavras como `coisa` não são mais confundidas com `oi`.
- Mantém o WhatsApp fora da limpeza visual exclusiva do Instagram.
- Nova suíte `fallback-tests.mjs`; pacote consolidado mantém todas as frentes anteriores.


## Avaliação 1–5 + Cardápio Fitness — v2.8.0

- Corrigido o fluxo de avaliação: notas de 1 a 5 só são interpretadas quando existe contexto de pesquisa (`avaliacao_pendente`, `event_type=avaliacao` ou contexto anterior claro).
- O webhook devolve `avaliacao_nota`, `avaliacao_salva`, `avaliacao_pendente`, `avaliacao_feedback_pendente` e `avaliacao_feedback` para o ManyChat persistir nos Custom Fields.
- Notas 1–3 podem coletar um comentário curto; notas 4–5 recebem agradecimento sem CTA comercial.
- A palavra `Avaliação` inicia a pesquisa manualmente.
- Adicionada a categoria **Cardápio Fitness** com 10 itens oficiais transcritos da arte fornecida.
- O catálogo agora contém **141 itens em 17 categorias**.
- `cardápio fitness` abre diretamente a categoria Fitness em vez do cardápio genérico.
- Nenhum horário foi inventado para o Fitness, pois a fonte enviada não informa janela de disponibilidade.
- Novas suítes: `fitness-tests.mjs` e `evaluation-tests.mjs`.


## Promoções unificadas + interação de Burger — v2.7.0

- Pergunta genérica por **promoção/oferta** agora mostra juntas as promoções de **Burger em Dobro** e **Chopp**.
- Pergunta específica continua individual: burger/lanche/terça → Burger em Dobro; chopp/chope/Brahma/Ashby/happy hour → promoção de chopp.
- Consulta normal de burger/lanche mantém os **preços normais** e termina com um convite curto para conhecer a promoção de terça.
- Se o cliente responder `sim`, `quero saber`, `como funciona` etc., a próxima mensagem explica a oferta completa usando o contexto salvo pelo ManyChat.
- Se responder `não`, o bot não insiste.
- Após a lista unificada, responder apenas `burger` ou `chopp` já abre a promoção escolhida.


## Burger em Dobro — v2.6.0

- **Todas as terças-feiras, a partir das 16h:** paga 1 e leva **2 do mesmo burger**.
- A base oficial reconhece `burger em dobro`, `lanche em dobro`, `promoção de lanche`, `promoção de burger`, `promoção de terça`, `paga 1 leva 2` e variações.
- A resposta lista os burgers cadastrados e seus preços: Burguer Salada (R$ 29,90), Burguer Bacon (R$ 33,90) e Burguer Duplo Bacon (R$ 39,90).
- Não existe horário final cadastrado para essa oferta; o bot informa apenas **a partir das 16h** e não inventa encerramento.
- `Fondue doce` permanece fora do catálogo ativo e protegido por guardrail para não receber preço/disponibilidade inventados.



## Pratos do Dia / almoço — v2.5.0

- Incorporada a arte oficial **Pratos do Dia** com 9 pratos e preços.
- Esses pratos são exclusivos do almoço: **segunda a sexta-feira, das 11h às 15h**.
- `Bisteca` passa a responder diretamente com **R$ 19,90**, composição e janela de disponibilidade.
- Itens que existem com preço de almoço e preço Executivo (como Filé de Frango Grelhado, Strogonoff/Estrogonofe, Filé de Frango à Parmegiana e Linguiça Toscana) não escolhem um preço arbitrariamente: mostram as duas opções quando o contexto não estiver claro.
- Se o cliente disser `no almoço`, o bot usa o Prato do Dia; se disser `executivo`, usa o Executivo.
- Perguntas por `pratos do dia`/`almoço` listam as 9 opções e o adicional opcional de bebida por **+R$ 5,00**.
- O catálogo tinha **131 itens em 16 categorias** nesta etapa; na v2.8.0 passou para **141 itens em 17 categorias** com o Fitness.
- A suíte `lunch-tests.mjs` verifica os 9 pratos e percorre **100% dos itens cadastrados**, garantindo que cada nome cadastrado devolva seu valor.


## CTAs contextuais no Instagram — v2.4.0

- Links de Cardápio, WhatsApp, RH e Google Maps saem do texto das DMs do Instagram e passam a ser expostos por CTA contextual.
- O webhook devolve `cta_type`, `cta_label`, `cta_url`, `cta_count` e `localizacao_link` para o ManyChat.
- Cardápio/item → botão **Cardápio**; pedido/delivery → **Fazer pedido**; endereço → **Como chegar**; atendimento → **Falar no WhatsApp**; vaga → **Enviar currículo**.
- Promoção de chopp usa **Como chegar**, coerente com a orientação de consultar disponibilidade no local.
- iFood e 99Food continuam no texto quando a intenção for delivery.
- Comentários e canal WhatsApp não sofrem a limpeza de links.


## Links por botões no Instagram — v2.3.2

Nas DMs do Instagram, os links do **Cardápio** e do **WhatsApp geral** não aparecem mais dentro do texto da resposta. O ManyChat usa os campos `cardapio_link` e `whatsapp_link` para os botões nativos publicados no fluxo. Links de **iFood** e **99Food** continuam no texto quando a intenção é pedido/delivery. O canal WhatsApp e o fluxo de comentários do Instagram não passam por essa limpeza.

## Item não localizado — v2.3.1

Quando o cliente pergunta preço de um item que não casa com o catálogo oficial (ex.: "qual o valor da pizza?"), o bot não inventa preço e não força atendimento humano. Ele lista as categorias registradas e envia o link do cardápio completo para a pessoa escolher uma categoria ou informar outro nome. O intent `cardapio_categorias` é determinístico e não é reescrito pela IA.

Este projeto é o webhook de atendimento do **Sr. Boteco Limeira**. Ele foi estruturado para receber mensagens do ManyChat, identificar a intenção do cliente, consultar uma base fechada de informações comerciais e devolver uma resposta humanizada sem inventar preços, itens, composição, porções, horários ou disponibilidade.

## Promoção oficial de chopp — v2.3.0

- Todos os dias: chopp a partir de **R$ 9,90**.
- Sábado e domingo, das **16h às 20h**: caneca de **340 ml** de **Chopp Ashby e/ou Chopp Brahma** por **R$ 3,99**.
- O bot sempre informa: **consultar disponibilidade no local**.
- `chopp`, `chope`, `chopinho`, `happy hour`, `promoção`, `Brahma` e `Ashby` usam a intenção `promocao_chopp`.
- O webhook não calcula se a promoção está ativa no momento; apenas informa a janela cadastrada.


## Objetivos da versão 2

- Nenhuma mensagem recebida deve ficar sem resposta por falha de interpretação.
- O cliente é chamado pelo primeiro nome quando o ManyChat envia `first_name`.
- Perguntas curtas de continuidade, como `valor?`, `o que acompanha?` e `serve quantas pessoas?`, usam `last_topic` para manter o contexto.
- Preços só podem aparecer quando existem na base `data/knowledge.json`.
- O catálogo interno contém **141 itens em 17 categorias**: 122 itens do cardápio PDF + 9 Pratos do Dia/almoço + 10 itens do Cardápio Fitness cadastrados a partir das artes oficiais fornecidas.
- Busca de cardápio aceita aproximação e erros de escrita; por exemplo, `kibe` → `Quibe Frito` e `bruxeta` → `Brusqueta`.
- Termos genéricos, como `lanche`, `suco`, `chopp` e `executivos`, retornam as opções e valores da categoria em vez de apenas um link.
- Termos ambíguos, como `picanha` ou `batata frita`, retornam as opções relacionadas em vez de escolher um produto arbitrariamente.
- Itens realmente ausentes listam as categorias oficiais; no Instagram os acessos a Cardápio/WhatsApp ficam nos botões nativos, sem URLs poluindo o texto.
- Pedidos e oportunidades de envio do cardápio direcionam para o cardápio/pedido online.
- Delivery oferece pedido direto, iFood e 99Food.
- O atendimento continua funcionando mesmo sem OpenAI: a camada determinística é a fonte da verdade; a IA é usada apenas para humanizar a redação quando configurada.
- Existe resposta segura mesmo se ocorrer um erro interno no webhook.
- O endpoint pode responder no formato JSON tradicional ou no formato **Dynamic Block v2** do ManyChat.
- O WhatsApp usa a mesma base e o mesmo endpoint, com recepção automatizada, handoff para a equipe e silêncio quando um humano assume.
- O comportamento do Instagram permanece isolado do ramo específico de WhatsApp.
- Reclamações e negociações no WhatsApp recebem resposta específica de handoff, sem cardápio/iFood antes da equipe.
- Em produção, `WEBHOOK_SECRET` é obrigatório; sem ele o POST falha fechado com 401.
- A camada de IA usa temperatura baixa e uma validação adicional para horários, números e outros marcadores objetivos não autorizados.
- Comentários do Instagram que abrem o Direct são tratados sem placeholders, sem CTA forçado e com fallback seguro quando o texto real do comentário não chega.

## Links oficiais usados pela automação

- Cardápio/pedido: `https://botequimpatiolimeira.saipos.com/home?utm_id=97757_v0_s00_e0_tv0`
- WhatsApp: `https://wa.me/5519997858351`
- iFood: `https://www.ifood.com.br/delivery/limeira-sp/sr-boteco-shopping-patio-limeita-centro/c318d733-afe4-4098-80af-296be4eb0c72`
- 99Food: `https://99app.com/99food/food/`
- Site: `https://srboteco.com.br/`
- Vagas: `https://wa.me/5517996022567`
- Google Maps / Como chegar: `https://maps.app.goo.gl/sr7PgRhUxaNuzg8e8`

Os currículos são encaminhados diretamente ao RH. O bot não promete vaga, entrevista ou retorno; informa que o perfil será analisado e que o RH entrará em contato caso surja oportunidade compatível.

O 99Food está configurado com o link oficial do serviço. Como não há um deep link específico da loja validado nesta base, a resposta orienta o cliente a procurar por **Sr. Boteco Limeira** no aplicativo.

## Estrutura

```text
.
├── api/
│   └── manychat.js              # webhook principal
├── data/
│   └── knowledge.json           # fonte oficial de fatos, preços e regras
├── lib/
│   └── persona.js               # persona/system prompt da IA
├── audit-test.mjs               # auditoria de cenários críticos
├── menu-tests.mjs               # integridade do cardápio + busca aproximada
├── whatsapp-tests.mjs           # testes de WhatsApp + regressão estrutural
├── comment-tests.mjs            # testes de comentários/Direct + placeholders
├── button-links-tests.mjs       # links de Cardápio/WhatsApp fora do texto nas DMs do Instagram
├── contextual-cta-tests.mjs     # CTA por contexto
├── lunch-tests.mjs              # Pratos do Dia + cobertura integral
├── promo-tests.mjs              # promoções de chopp e burger
├── fitness-tests.mjs            # Cardápio Fitness
├── evaluation-tests.mjs         # avaliação 1–5 e feedback
├── test-local.js                # teste simples do endpoint local
├── MANYCHAT_COORDENADAS.md      # configuração detalhada no ManyChat
├── WHATSAPP_MANYCHAT.md         # configuração do canal WhatsApp e handoff
├── PROMPT_CONFIGURACAO_ADICIONAL.md
├── PROMPT_CORRECAO_E_TESTES_2026-09-16.md
├── PERSONA_E_PROMPT_VERCEL.md   # referência da atualização da persona
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
  "last_bot_reply": "{{ai_last_bot_reply}}",
  "channel": "instagram",
  "event_type": "direct",
  "avaliacao_pendente": "<custom field>",
  "avaliacao_feedback_pendente": "<custom field>",
  "avaliacao_nota": "<custom field>"
}
```

Para o fluxo separado do WhatsApp, use `"channel": "whatsapp"` e envie também o campo `atendimento_humano`.

Os nomes exatos das variáveis de sistema podem variar conforme a interface/conta do ManyChat. O ponto essencial é enviar o **primeiro nome**, a **mensagem recebida** e os campos de contexto salvos após a resposta anterior.

O webhook aceita também diversos nomes alternativos de campo (`text`, `input`, `comment_text`, `story_text`, etc.) para reduzir o risco de uma integração quebrar por pequenas diferenças no payload.

## Resposta JSON padrão

Exemplo resumido:

```json
{
  "ok": true,
  "channel": "instagram",
  "handoff": false,
  "handoff_reason": "",
  "reply": "Mariana, ...",
  "intent": "cardapio",
  "topic": "cardapio",
  "last_topic": "cardapio",
  "needs_human": false,
  "lead_temperature": "quente",
  "next_action": "abrir_cardapio",
  "avaliacao_pendente": false,
  "avaliacao_salva": false,
  "avaliacao_nota": "",
  "avaliacao_feedback_pendente": false,
  "avaliacao_feedback": "",
  "cardapio_link": "https://botequimpatiolimeira.saipos.com/home?utm_id=97757_v0_s00_e0_tv0",
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


## Comentários do Instagram → Direct

Na v2.2.1, `event_type: "instagram_comment"` é tratado como **mensagem privada enviada no Direct após um comentário em post/Reel**. O webhook não considera esse evento uma resposta pública.

Regras principais:

- se o ManyChat enviar o texto real do comentário, o bot responde ao conteúdo;
- elogios/reação (`Top`, `Amei`, emojis, etc.) recebem agradecimento curto, sem cardápio ou WhatsApp;
- perguntas de item/preço usam o cardápio interno e respondem o valor sem empurrar checkout;
- pedido explícito, cardápio ou delivery continuam podendo receber o link correto;
- reclamações não recebem CTA comercial; o bot pede detalhes para encaminhar corretamente;
- se o texto do comentário não chegar ao webhook, a resposta é apenas `Vi seu comentário no nosso post. Como posso te ajudar por aqui?`, sem links;
- placeholders literais como `first_name`, `{{first_name}}` e `comment_text` são descartados e nunca devem aparecer para o cliente.

No ManyChat, o fluxo de comentários deve enviar **variáveis reais**, não texto digitado literalmente. Exemplo:

```json
{
  "first_name": "CAMPO_REAL_DE_PRIMEIRO_NOME",
  "comment_text": "CAMPO_REAL_COM_TEXTO_DO_COMENTARIO",
  "event_type": "instagram_comment",
  "channel": "instagram"
}
```

Se o workspace não disponibilizar o texto do comentário, deixe `comment_text` vazio; o fallback seguro cuidará da conversa. Remova do fluxo qualquer mensagem ou botão fixo como **“Faça o seu pedido!”**. Envie somente `{{ai_reply}}` e deixe o webhook decidir quando existe intenção de venda.

## WhatsApp e handoff humano

No WhatsApp, o bot resolve sozinho saudações, cardápio, horário, localização, pagamentos, delivery e itens validados. Assuntos particulares — como reserva, reclamação, negociação, pedido especial, item não validado ou pedido explícito por atendente — retornam `handoff: true` e `next_action: "handoff_humano"`.

Quando o ManyChat enviar `atendimento_humano: true` (ou `bot_pausado: true`), o webhook retorna `reply: ""`, `messages: []` e `next_action: "silencio_humano"`. Assim, o bot não responde por cima da equipe.

As respostas do WhatsApp são entregues em uma única mensagem (`reply_part_1`); `reply_part_2` e `reply_part_3` ficam vazios. Consulte `WHATSAPP_MANYCHAT.md` para montar o fluxo separado no ManyChat.

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

## Cardápio interno e aproximação de escrita

A v2.2.0 incorpora o cardápio atual enviado em PDF, com **122 itens** distribuídos em 15 categorias. Perguntas de preço ou produto são resolvidas primeiro pela base interna.

A busca usa três camadas: correspondência exata/alias, correções ortográficas conhecidas e aproximação por similaridade. Assim, erros comuns não viram fallback desnecessário. Exemplos: `kibe` → `Quibe Frito`, `bruxeta` → `Brusqueta`, `torremo` → `Torresmo`.

Quando o termo representa uma categoria (`lanche`, `suco`, `chopp`, `executivos`), o bot lista as opções e seus valores. Quando o termo é ambíguo (`picanha`, `batata frita`), ele mostra as alternativas relacionadas. Somente itens realmente ausentes são encaminhados ao cardápio/WhatsApp para confirmação.

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

## Persona humanizada

A voz do atendimento está isolada em `lib/persona.js`. O handler envia para essa persona o primeiro nome, o contexto da conversa (`last_intent`, `last_topic`, `last_bot_reply`), a intenção detectada, os fatos permitidos e o `event_type`.

O tom foi ajustado para conversa curta e natural de boteco, com no máximo um emoji, sem CTA forçado e sem frases de atendimento robótico. `story_reply`, `story_mention` e `instagram_comment` recebem instruções específicas de tom. Mensagens claramente fora de contexto, como pedido de Robux, são tratadas com humor leve sem despejar cardápio ou WhatsApp.

A persona não substitui as travas determinísticas: preços, produtos, horários, promoções, disponibilidade e URLs continuam limitados aos fatos validados pela aplicação.

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

Em produção, `WEBHOOK_SECRET` é obrigatório. Se estiver ausente, o webhook recusa POSTs com HTTP 401 (fail-closed). Em desenvolvimento local, a ausência do segredo continua permitida para facilitar testes.

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
