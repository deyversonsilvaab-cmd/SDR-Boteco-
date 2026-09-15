import handler from "./api/manychat.js";

function makeReq(message, extraBody = {}) {
  return {
    method: "POST",
    headers: {},
    body: {
      message,
      first_name: "Mariana",
      subscriber_id: "teste-1",
      ...extraBody
    }
  };
}

function makeRes() {
  return {
    statusCode: null,
    headers: {},
    payload: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(payload) { this.payload = payload; return payload; },
    end() { return null; }
  };
}

async function call(message, extraBody = {}) {
  const req = makeReq(message, extraBody);
  const res = makeRes();
  await handler(req, res);
  return { status: res.statusCode, payload: res.payload };
}

const cases = [
  { message: "Oi. Quero saber sobre a Tábua Mista.", intent: "item_nao_encontrado", must: ["cardápio", "WhatsApp"] },
  { message: "O que acompanha o prato?", extra: { last_topic: "item:tabua_mista" }, intent: "item_nao_encontrado", must: ["não tenho", "cardápio"] },
  { message: "Olá tem alguém?", intent: "saudacao", must: ["Mariana"] },
  { message: "Queria o cardápio", intent: "cardapio", must: ["saipos.com", "retirada", "entrega"] },
  { message: "Burgers", intent: "item_nao_encontrado", must: ["cardápio"] },
  { message: "Vcs tem picanha?", intent: "item_nao_encontrado", must: ["cardápio", "WhatsApp"] },
  { message: "Foundie", intent: "item_cardapio", must: ["R$ 99,90", "2 pessoas", "contrafilé"] },
  { message: ["fondue", "doce"].join(" "), intent: "item_inativo" },
  { message: "Consegue me doar robux?", intent: "fora_contexto", must: ["Robux", "brincadeira"], forbidden: ["saipos.com", "wa.me", "Faça o seu pedido"] },
  { message: "Olá boa noite, queria fazer um pedido", intent: "pedido", must: ["saipos.com", "retirada", "entrega"] },
  { message: "tem delivery?", intent: "delivery", must: ["iFood", "99Food", "saipos.com"] },
  { message: "qual o valor da bisteca?", intent: "item_cardapio", must: ["R$ 19,90"] },
  { message: "quanto custa o Frango Power?", intent: "item_cardapio", must: ["não tenho o valor", "WhatsApp"] },
  { message: "qual valor do chopp Brahma?", intent: "item_cardapio", must: ["R$ 13,90", "R$ 51,90"] },
  { message: "heineken zero valor", intent: "item_cardapio", must: ["não tenho o valor", "WhatsApp"] },
  { message: "aceita vale alimentação?", intent: "pagamento", must: ["Não aceitamos vale alimentação"] },
  { message: "quero reservar para 6 pessoas amanhã", intent: "reserva", must: ["nome", "dia/data", "horário", "quantas pessoas", "confirmação"] },
  { message: `tem ${["open", "chopp"].join(" ")}?`, intent: "item_inativo" },
  { message: "vaga de garçom", intent: "vaga", must: ["RH do restaurante", "wa.me/5517996022567", "análise do seu perfil", "oportunidade compatível"] }
];

let failed = 0;
for (const test of cases) {
  const { status, payload } = await call(test.message, test.extra || {});
  const reply = String(payload?.reply || "");
  const errors = [];
  if (status !== 200) errors.push(`status=${status}`);
  if (payload?.intent !== test.intent) errors.push(`intent=${payload?.intent}`);
  for (const term of test.must || []) {
    if (!reply.toLowerCase().includes(term.toLowerCase())) errors.push(`missing:${term}`);
  }
  for (const term of test.forbidden || []) {
    if (reply.toLowerCase().includes(term.toLowerCase())) errors.push(`forbidden:${term}`);
  }
  if (!reply.includes("Mariana")) errors.push("nome_nao_usado");
  if (!reply.trim()) errors.push("reply_vazio");
  if (errors.length) failed++;
  console.log(`${errors.length ? "FAIL" : "PASS"} | ${test.message} | ${payload?.intent} | ${errors.join(", ")}`);
  if (errors.length) console.log(reply, "\n");
}

if (failed) {
  console.error(`\n${failed} teste(s) falharam.`);
  process.exit(1);
}
console.log(`\nTodos os ${cases.length} testes passaram.`);

// Validação adicional do formato Dynamic Block v2 do ManyChat.
{
  const { status, payload } = await call("Queria o cardápio", { response_mode: "dynamic_block" });
  const errors = [];
  if (status !== 200) errors.push(`status=${status}`);
  if (payload?.version !== "v2") errors.push(`version=${payload?.version}`);
  if (payload?.content?.type !== "instagram") errors.push(`type=${payload?.content?.type}`);
  if (!Array.isArray(payload?.content?.messages) || !payload.content.messages.length) errors.push("messages_vazio");
  if (!String(payload?.content?.messages?.[0]?.text || "").includes("Mariana")) errors.push("nome_nao_usado");
  if (!Array.isArray(payload?.content?.actions) || payload.content.actions.length !== 5) errors.push("actions_incorretas");
  if (errors.length) {
    console.error(`FAIL | dynamic_block | ${errors.join(", ")}`);
    process.exit(1);
  }
  console.log("PASS | dynamic_block v2 | instagram | 5 actions");
}

// Validação específica da rota de vagas no Dynamic Block v2.
{
  const { status, payload } = await call("quero mandar currículo", { response_mode: "dynamic_block" });
  const errors = [];
  if (status !== 200) errors.push(`status=${status}`);
  const buttons = payload?.content?.messages?.flatMap((m) => Array.isArray(m?.buttons) ? m.buttons : []) || [];
  if (!buttons.some((b) => b?.url === "https://wa.me/5517996022567" && b?.caption === "Enviar currículo")) errors.push("botao_rh_incorreto");
  if (buttons.some((b) => b?.url === "https://wa.me/5519997858351")) errors.push("botao_whatsapp_geral_na_vaga");
  if (errors.length) {
    console.error(`FAIL | dynamic vaga | ${errors.join(", ")}`);
    process.exit(1);
  }
  console.log("PASS | dynamic vaga | botão direcionado ao RH");
}
