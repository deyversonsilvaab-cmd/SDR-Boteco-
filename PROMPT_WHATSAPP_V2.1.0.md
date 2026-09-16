# Prompt para atualizar o código na Vercel — Adicionar canal WhatsApp (atendimento humano-assistido)

**Projeto:** SDR Sr. Boteco Limeira
**Endpoint atual:** `https://sdr-boteco.vercel.app/api/manychat`
**Versão atual:** 2.0.2 → **nova versão: 2.1.0**
**Objetivo:** rodar o WhatsApp na MESMA base do Instagram, sem uma atrapalhar a outra, com a lógica de **recepção + handoff pra humano**.

---

## 1. O que muda (visão geral)

O Instagram continua **exatamente igual**. O WhatsApp entra como um **caminho novo**, escolhido pelo campo `channel` que o ManyChat manda no corpo da requisição:

- `channel = "instagram"` (ou vazio) → comportamento atual, sem 1 vírgula de mudança.
- `channel = "whatsapp"` → novo comportamento: recepcionista que resolve o simples sozinho e **passa pro humano** o que for particular.

**Garantia de não-interferência:** toda a lógica nova fica dentro de `if (channel === "whatsapp")`. Nada no fluxo do Instagram é alterado. É o mesmo deploy, a mesma `knowledge.json`, o mesmo `WEBHOOK_SECRET`.

Diferenças do WhatsApp:

1. **Handoff humano** — quando o cliente precisa de algo particular, o bot avisa que vai chamar a equipe e marca `handoff = true` / `next_action = "handoff_humano"`.
2. **Silêncio quando o humano assume** — se o ManyChat sinalizar que o atendimento está com uma pessoa (`atendimento_humano = true`), o webhook devolve uma resposta VAZIA (o bot não fala por cima do atendente).
3. **Mensagem única** — WhatsApp aceita textos longos, então não quebra em 3 partes como no Instagram.

---

## 2. Prompt pronto pra colar (no Cursor / Claude Code / etc., com o repositório aberto)

> Estou adicionando o canal **WhatsApp** ao webhook do SDR Sr. Boteco, mantendo o Instagram 100% intacto. A base é Next.js/Node ESM na Vercel, com `api/manychat.js`, `lib/persona.js` e `data/knowledge.json`. O bot é determinístico (fatos seguros) + camada de humanização por IA (gpt-4o) que só reescreve, nunca inventa preço/link/informação.
>
> Faça EXATAMENTE as mudanças abaixo. Não altere o caminho do Instagram: tudo que for específico do WhatsApp deve ficar sob `channel === "whatsapp"`. Suba a versão para **2.1.0**.
>
> ### A) `lib/persona.js`
>
> 1. Mude a assinatura para `buildSystemPrompt({ eventType = "direct", channel = "instagram" } = {})`.
> 2. Mantenha TODO o prompt atual do Instagram para `channel !== "whatsapp"`.
> 3. Quando `channel === "whatsapp"`, retorne um prompt de sistema com estas diretrizes (mesma pegada de boteco, gente boa, sem parecer robô): 
>    - Papel: **recepcionista do Sr. Boteco no WhatsApp**. Recebe bem, manda o cardápio quando faz sentido, entende o que a pessoa precisa e conduz. O atendimento pode ser continuado por uma pessoa da equipe.
>    - Tom: português informal e caloroso, frases curtas. No WhatsApp pode usar de 1 a 4 linhas (um pouco mais que o Instagram), mas **sem textão**. No máximo 1 emoji.
>    - Use o primeiro nome real (`cliente.first_name`) quando existir. Nunca invente nome nem use placeholders.
>    - **Regras comerciais e de segurança idênticas às do Instagram** (itens 9 a 18 do prompt atual): `fatos_para_esta_resposta` é a única fonte; nunca criar/completar preço, item, horário, promoção, reserva, entrega; preservar valores e URLs exatos; não confirmar reserva/estoque/disponibilidade; nunca falar de IA/webhook/JSON/Vercel/ManyChat.
>    - **Handoff:** quando `proxima_acao` for `"handoff_humano"`, avise a pessoa de forma calorosa que **já vai chamar alguém da equipe pra continuar** (ex.: "já te passo pra equipe pra acertar isso certinho, tá?" / "vou chamar alguém do time aqui pra te ajudar com isso 👍"). **Nunca prometa prazo** ("em 5 min", "já já") nem invente que "vou verificar e volto". Não repita link se não for necessário.
>    - Adaptação de evento: no WhatsApp trate tudo como `direct` (conversa normal).
>    - Formato: gere UMA resposta, sem listas internas nem rótulos técnicos. Retorne SOMENTE JSON válido no formato `{"reply":"texto"}`.
>
> ### B) `api/manychat.js`
>
> 1. **Normalização do canal.** Em `extractCustomer`, normalize o canal: `channel: safeText(body?.channel || "instagram", 30).toLowerCase()`. Crie um helper `isWhatsapp(customer)` que retorna `customer.channel.includes("whatsapp") || customer.channel === "wa"`.
> 2. **Guard de silêncio (humano assumiu).** Crie: 
>    ```js
>    function humanIsHandling(body) {  const v = body?.atendimento_humano ?? body?.bot_pausado ??            body?.custom_fields?.atendimento_humano ?? body?.custom_fields?.bot_pausado;  return v === true || String(v ?? "").toLowerCase() === "true";}
>
>    ```
>    No handler POST, logo depois de resolver `customer`, se `isWhatsapp(customer) && humanIsHandling(body)`, devolva um payload no-op: `{ ok:true, request_id, channel:"whatsapp", reply:"", handoff:true, needs_human:true, next_action:"silencio_humano", messages:[] }` e retorne (não chama IA, não responde nada). Para o Instagram, `humanIsHandling` é ignorado — não muda nada.
> 3. **Política de handoff do WhatsApp.** Crie: 
>    ```js
>    function whatsappHandoffReason(resolved, text) {  if (resolved.intent === "vaga") return null;            // vaga vai pro link do RH, não é handoff  if (includesAny(text, ["reclamacao","reclamar","problema","atraso","errado",      "cancelar","estorno","reembolso","nota fiscal","cobranca indevida"])) return "reclamacao";  if (includesAny(text, ["orcamento","encomenda","fechar pedido","negociar","desconto",      "atacado","grande quantidade","festa","buffet","evento corporativo","fornecedor"])) return "negociacao";  if (["reserva","humano","item_inativo","item_nao_encontrado","outro"].includes(resolved.intent)) return resolved.intent;  if (resolved.needs_human) return "confirmar_com_equipe";  return null;}
>
>    ```
>    Depois de `resolveIntent`, **apenas quando** **`isWhatsapp(customer)`**, aplique: 
>    ```js
>    let handoff = false, handoffReason = "";if (isWhatsapp(customer)) {  const reason = whatsappHandoffReason(resolved, normalizeText(message));  if (reason) {    handoff = true;    handoffReason = reason;    resolved.needs_human = true;    resolved.next_action = "handoff_humano";  }}
>
>    ```
>    O Instagram não passa por esse bloco.
> 4. **Formatação por canal.** Crie `splitForChannel(text, channel)`: se `channel` for whatsapp, retorne `[safeText(text, 3500)]` (mensagem única); senão, use a lógica atual `splitForInstagram(text)`. Use isso no `buildStandardPayload`.
> 5. **Payload de saída.** `buildStandardPayload` deve receber `{ reply, resolved, links, requestId, customer, handoff, handoffReason }` e incluir os campos novos, mantendo TODOS os atuais: 
>    - `channel: customer.channel`
>    - `handoff: Boolean(handoff)`
>    - `handoff_reason: handoffReason || ""`
>    - `reply_part_1/2/3` e `messages` gerados por `splitForChannel` (no WhatsApp, só `reply_part_1` preenchido).
> 6. **Passe o canal pra IA.** Em `callOpenAI`, repasse `channel` e chame `buildSystemPrompt({ eventType, channel: customer.channel })`. Inclua `canal: customer.channel` e `proxima_acao: resolved.next_action` no JSON do usuário (o `next_action` já é enviado — garanta que reflita `"handoff_humano"` quando houver handoff).
> 7. **Guardrails.** Mantenha `containsInventedPrice`, `containsUnapprovedUrl`, `containsRemovedInfo` iguais, aplicados aos dois canais.
> 8. **GET health.** Atualize `version` para `"2.1.0"` e adicione `channels: ["instagram","whatsapp"]` na resposta do GET.
> 9. **Erro fatal (catch).** No payload de erro, adicione `channel: customer?.channel || "instagram"` e `handoff: false` (mantendo o resto).
>
> ### C) `data/knowledge.json`
>
> Não precisa mudar nada de conteúdo. Se quiser, adicione em `respostas_base` uma chave `handoff_humano` com um texto neutro de apoio (ex.: "Vou chamar alguém da equipe pra continuar seu atendimento por aqui."). É opcional — a IA já cobre isso pelo prompt.
>
> ### D) Testes
>
> Atualize `audit-test.mjs` (ou crie `whatsapp-tests.mjs`) cobrindo:
>
> - `channel:"whatsapp"` + "quero reservar mesa pra 8 sábado" → `handoff===true`, `next_action==="handoff_humano"`.
> - `channel:"whatsapp"` + "tive um problema com meu pedido" → `handoff===true`, `handoff_reason==="reclamacao"`.
> - `channel:"whatsapp"` + "me manda o cardápio" → `handoff===false`, resposta com link do cardápio (o bot resolve sozinho).
> - `channel:"whatsapp"` + `atendimento_humano:true` → `reply===""`, `next_action==="silencio_humano"`, `messages` vazio.
> - `channel:"whatsapp"` → `reply_part_2===""` (mensagem única, não quebra).
> - **Regressão Instagram:** um caso com `channel:"instagram"` deve continuar idêntico ao 2.0.2 (mesmo `next_action`, quebra em partes quando longo).
>
> Rode `npm run check` e me mostre a saída. Suba a versão pra 2.1.0 no GET e no `MANIFEST_SHA256.txt`.

---

## 3. O que o bot resolve sozinho x o que passa pro humano (WhatsApp)

| Situação Bot resolve sozinho Passa pro humano (handoff)     |                          |                    |
| ----------------------------------------------------------- | ------------------------ | ------------------ |
| Saudação / "oi, tem alguém?"                                | ✅ recepção calorosa      | —                  |
| Pedir o cardápio                                            | ✅ manda o link           | —                  |
| Horário / localização / formas de pagamento                 | ✅ responde               | —                  |
| Delivery (iFood / 99Food / retirada)                        | ✅ manda os links         | —                  |
| Preço de item **cadastrado** (ex.: bisteca R$ 19,90)        | ✅ responde               | —                  |
| Preço/item **não validado** na base                         | —                        | ✅ chama a equipe   |
| Reserva / aniversário / grupo / evento                      | —                        | ✅ chama a equipe   |
| Fechar pedido / orçamento / encomenda / negociar / desconto | —                        | ✅ chama a equipe   |
| Reclamação / problema / cancelamento / estorno              | —                        | ✅ chama a equipe   |
| "Quero falar com atendente/pessoa"                          | —                        | ✅ chama a equipe   |
| Vaga de emprego                                             | ✅ manda o WhatsApp do RH | — (canal separado) |

---

## 4. Contrato de saída (campos novos)

Além de tudo que já existe hoje (`reply`, `intent`, `topic`, `last_topic`, `needs_human`, `lead_temperature`, `missing_fields`, `next_action`, `cardapio_link`, `whatsapp_link`, `reply_part_1..3`, `messages`), o WhatsApp passa a devolver:

- `channel` — "whatsapp" ou "instagram"
- `handoff` — `true` quando é pra passar pro humano
- `handoff_reason` — motivo (reserva, negociacao, reclamacao, humano, confirmar\_com\_equipe...)
- `next_action` pode ser `"handoff_humano"` (passar pra equipe) ou `"silencio_humano"` (humano já está atendendo)

---

## 5. Como montar o fluxo no ManyChat (WhatsApp) — sem mexer no Instagram

Crie automações **novas e separadas** no canal WhatsApp (não reaproveite as do Instagram):

**Fluxo "WhatsApp - Recepção" (Resposta Padrão do WhatsApp):**

1. **Gatilho:** usuário envia mensagem no WhatsApp → configurar como **"toda vez"** (igual fizemos no Instagram, pra não travar a continuidade).
2. **Ação — Solicitação externa (External Request):** `POST` para `https://sdr-boteco.vercel.app/api/manychat` 
   - Header: `x-webhook-secret` = seu segredo (você cola, como sempre).
   - Body (JSON) incluindo: `subscriber_id`, `first_name`, `username` (ou telefone), `message`, `last_intent`, `last_topic`, `last_bot_reply`, **`channel: "whatsapp"`**, e o campo **`atendimento_humano`** (o campo de usuário que marca quando a equipe assumiu).
   - Mapeie a resposta: `ai_reply` ← `reply`, `ai_intent` ← `intent`, `ai_topic` ← `topic`/`last_topic`, `ai_needs_human` ← `needs_human`, `ai_handoff` ← `handoff`, `ai_next_action` ← `next_action`.
3. **Ação — Definir campo:** `ai_last_bot_reply = {{ai_reply}}` (memória de contexto, igual ao Instagram).
4. **Condição — humano assumiu?** Se `ai_next_action` = `silencio_humano` → **não envia nada** (encerra o fluxo). Isso é a trava de segurança extra além do body já mandar `atendimento_humano`.
5. **Condição — handoff?** Se `ai_handoff` = `true` (ou `ai_needs_human` = `true`): 
   - **Enviar Mensagem:** `{{ai_reply}}` (o próprio bot já avisa que vai chamar a equipe).
   - **Definir campo:** `atendimento_humano = true` (a partir daqui o bot fica quieto nas próximas mensagens).
   - **Notificar a equipe:** ação de notificação do ManyChat (e-mail/telefone/Live Chat) OU atribuir a conversa a um atendente ("Atribuir conversa").
   - Opcional: adicionar uma **tag** tipo `lead_handoff` pra você filtrar na caixa de entrada.
6. **Senão (bot resolve):** **Enviar Mensagem** `{{ai_reply}}` e segue a conversa normal.

**Voltar pro bot depois:** quando o atendimento humano terminar, zere o campo `atendimento_humano` (manualmente, ou com um fluxo/keyword tipo "voltar pro bot", ou por inatividade). Enquanto estiver `true`, o bot não responde naquela conversa.

**Importante:** por serem automações separadas com `channel=whatsapp`, elas **não cruzam** com as 4 do Instagram. Mesma base, mesmo endpoint, comportamentos independentes.

---

## 6. Checklist rápido de validação (depois do deploy)

- `GET https://sdr-boteco.vercel.app/api/manychat` → `version: "2.1.0"`, `channels: ["instagram","whatsapp"]`.
- Instagram continua respondendo igual (teste 1 DM de cardápio).
- WhatsApp: "me manda o cardápio" → bot resolve sozinho, sem handoff.
- WhatsApp: "quero reservar mesa pra 8" → bot avisa que vai chamar a equipe + marca handoff.
- WhatsApp: com `atendimento_humano=true` → bot fica quieto.

> Obs.: mantive fora deste documento o valor do `WEBHOOK_SECRET`. Ele continua sendo você que cola no header, tanto no fluxo do Instagram quanto no do WhatsApp (é o mesmo segredo, o mesmo endpoint).