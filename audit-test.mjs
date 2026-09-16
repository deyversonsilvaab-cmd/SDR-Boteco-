import handler from "./api/manychat.js";

function makeReq(message, extraBody = {}) {
  return {
    method: "POST",
    headers: {},
    query: {},
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
  { message: "Oi. Quero saber sobre a Tábua Mista.", intent: "item_cardapio", must: ["R$ 104,90", "linguiça toscana", "150g de frango"] },
  { message: "O que acompanha o prato?", extra: { last_topic: "alacarte_tabua_mista" }, intent: "item_cardapio", must: ["2 gomos", "contrafilé", "R$ 104,90"] },
  { message: "Olá tem alguém?", intent: "saudacao", must: ["Mariana"] },
  { message: "Queria o cardápio", intent: "cardapio", must: ["utm_id=97757_v0_s00_e0_tv0", "retirada", "entrega"] },
  { message: "Burgers", intent: "categoria_cardapio", must: ["Burguer Salada", "R$ 29,90", "R$ 33,90", "R$ 39,90"] },
  { message: "Vcs tem picanha?", intent: "opcoes_cardapio", must: ["Picanha - Executivo", "R$ 62,90", "Tiras de Picanha", "R$ 53,40"] },
  { message: "qual o valor do kibe", intent: "item_cardapio", must: ["Você quis dizer Quibe Frito?", "R$ 40,90", "12 unidades"] },
  { message: "quanto custa a bruxeta", intent: "item_cardapio", must: ["Você quis dizer Brusqueta?", "R$ 31,90"] },
  { message: "Foundie", intent: "outro", forbidden: ["R$ 99,90"] },
  { message: "Consegue me doar robux?", intent: "fora_contexto", must: ["Robux", "brincadeira"], forbidden: ["saipos.com", "wa.me", "Faça o seu pedido"] },
  { message: "Olá boa noite, queria fazer um pedido", intent: "pedido", must: ["utm_id=97757_v0_s00_e0_tv0", "retirada", "entrega"] },
  { message: "tem delivery?", intent: "delivery", must: ["iFood", "99Food", "utm_id=97757_v0_s00_e0_tv0"] },
  { message: "qual o valor da bisteca?", intent: "outro", forbidden: ["R$ 19,90"] },
  { message: "qual valor do Burger Bacon?", intent: "item_cardapio", must: ["R$ 33,90", "hambúrguer 160g"] },
  { message: "heineken zero valor", intent: "item_cardapio", must: ["R$ 18,60"] },
  { message: "aceita vale alimentação?", intent: "pagamento", must: ["Não aceitamos vale alimentação"] },
  { message: "quero reservar para 6 pessoas amanhã", intent: "reserva", must: ["nome", "dia/data", "horário", "quantas pessoas", "confirmação"] },
  { message: `tem ${["open", "chopp"].join(" ")}?`, intent: "item_inativo" },
  { message: "vaga de garçom", intent: "vaga", must: ["RH do restaurante", "wa.me/5517996022567", "análise do seu perfil", "oportunidade compatível"] },
  { message: "qual valor do lanche", intent: "categoria_cardapio", must: ["Burguer Sr. Boteco", "R$ 29,90", "R$ 33,90", "R$ 39,90"] },
  { message: "qual valor do suco", intent: "categoria_cardapio", must: ["Suco de Laranja", "R$ 11,30", "Suco de Morango", "R$ 24,90"] },
  { message: "qual valor da batata frita", intent: "opcoes_cardapio", must: ["R$ 13,90", "R$ 43,90", "R$ 91,90"] }
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
