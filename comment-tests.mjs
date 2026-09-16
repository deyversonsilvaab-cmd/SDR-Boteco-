import handler from "./api/manychat.js";

const ORIGINAL = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  VERCEL_ENV: process.env.VERCEL_ENV,
  NODE_ENV: process.env.NODE_ENV
};
delete process.env.OPENAI_API_KEY;
delete process.env.WEBHOOK_SECRET;
delete process.env.VERCEL_ENV;
if (process.env.NODE_ENV === "production") delete process.env.NODE_ENV;

function makeRes() {
  return {
    statusCode: null,
    payload: null,
    headers: {},
    setHeader(k,v){ this.headers[k]=v; },
    status(c){ this.statusCode=c; return this; },
    json(p){ this.payload=p; return p; },
    end(){}
  };
}

async function call(body = {}, query = {}) {
  const res = makeRes();
  await handler({ method:"POST", headers:{}, query, body:{ subscriber_id:"comment-test", channel:"instagram", event_type:"instagram_comment", ...body } }, res);
  return { status: res.statusCode, payload: res.payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function noSalesLinks(payload) {
  const reply = String(payload?.reply || "");
  return !reply.includes("saipos.com") && !reply.includes("wa.me/") && !reply.includes("ifood.com") && !reply.includes("99app.com");
}

let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`PASS | ${name}`); }
  catch (e) { failed++; console.error(`FAIL | ${name} | ${e.message}`); }
}

await test("Comentário sem texto: fallback humano, sem links e sem placeholder", async () => {
  const { status, payload } = await call({ first_name:"first_name", comment_text:"comment_text" });
  assert(status === 200, `status=${status}`);
  assert(payload?.intent === "comentario_sem_texto", `intent=${payload?.intent}`);
  assert(noSalesLinks(payload), `links indevidos: ${payload?.reply}`);
  assert(!String(payload?.reply).toLowerCase().includes("first_name"), payload?.reply);
  assert(!String(payload?.reply).toLowerCase().includes("não consegui ver"), payload?.reply);
  assert(String(payload?.reply).includes("comentário"), payload?.reply);
  assert(payload?.next_action === "aguardar_mensagem", payload?.next_action);
});

await test("Placeholder {{first_name}} nunca aparece para o cliente", async () => {
  const { payload } = await call({ first_name:"{{first_name}}", comment_text:"Top demais" });
  assert(payload?.intent === "comentario_social", payload?.intent);
  assert(!String(payload?.reply).includes("first_name"), payload?.reply);
  assert(noSalesLinks(payload), payload?.reply);
});

await test("Elogio/reação não força cardápio ou WhatsApp", async () => {
  const { payload } = await call({ first_name:"Bruno", comment_text:"Top demais 🔥" });
  assert(payload?.intent === "comentario_social", payload?.intent);
  assert(String(payload?.reply).includes("Bruno"), payload?.reply);
  assert(noSalesLinks(payload), payload?.reply);
  assert(!String(payload?.reply).includes("Faça o seu pedido"), payload?.reply);
});

await test("Comentário kibe usa aproximação e responde preço sem CTA forçado", async () => {
  const { payload } = await call({ first_name:"Bruno", comment_text:"Qual o valor do kibe?" });
  const reply = String(payload?.reply || "");
  assert(payload?.intent === "item_cardapio", payload?.intent);
  assert(reply.includes("Quibe Frito"), reply);
  assert(reply.includes("R$ 40,90"), reply);
  assert(noSalesLinks(payload), reply);
  assert(payload?.next_action === "responder", payload?.next_action);
});

await test("Comentário lanche lista Burgers e valores sem checkout automático", async () => {
  const { payload } = await call({ first_name:"Bruno", comment_text:"Qual o valor do lanche?" });
  const reply = String(payload?.reply || "");
  assert(payload?.intent === "categoria_cardapio", payload?.intent);
  for (const value of ["R$ 29,90", "R$ 33,90", "R$ 39,90"]) assert(reply.includes(value), reply);
  assert(reply.includes("Burguer"), reply);
  assert(noSalesLinks(payload), reply);
  assert(payload?.next_action === "responder", payload?.next_action);
});

await test("Reclamação em comentário não vira oferta de pedido", async () => {
  const { payload } = await call({ first_name:"Bruno", comment_text:"Meu pedido veio errado" });
  const reply = String(payload?.reply || "");
  assert(payload?.intent === "comentario_reclamacao", payload?.intent);
  assert(payload?.topic === "reclamacao", payload?.topic);
  assert(noSalesLinks(payload), reply);
  assert(!reply.toLowerCase().includes("faça seu pedido"), reply);
  assert(payload?.next_action === "coletar_detalhes", payload?.next_action);
});

await test("Pedido explícito no comentário continua podendo mandar cardápio", async () => {
  const { payload } = await call({ first_name:"Bruno", comment_text:"Quero fazer um pedido" });
  const reply = String(payload?.reply || "");
  assert(payload?.intent === "pedido", payload?.intent);
  assert(reply.includes("saipos.com"), reply);
  assert(payload?.next_action === "fazer_pedido", payload?.next_action);
});

await test("Texto em custom_fields.comment_text é reconhecido", async () => {
  const { payload } = await call({ first_name:"Bruno", custom_fields:{ comment_text:"Quanto custa a bruxeta?" } });
  const reply = String(payload?.reply || "");
  assert(payload?.intent === "item_cardapio", payload?.intent);
  assert(reply.includes("Brusqueta"), reply);
  assert(reply.includes("R$ 31,90"), reply);
  assert(noSalesLinks(payload), reply);
});

await test("Campo comment_text tem prioridade sobre message genérico", async () => {
  const { payload } = await call({ first_name:"Bruno", message:"mensagem", comment_text:"Qual o valor do quibe?" });
  assert(payload?.intent === "item_cardapio", payload?.intent);
  assert(String(payload?.reply).includes("R$ 40,90"), payload?.reply);
});

await test("Comentário desconhecido abre conversa sem despejar links", async () => {
  const { payload } = await call({ first_name:"Bruno", comment_text:"E esse negócio aí?" });
  assert(payload?.intent === "comentario_generico", payload?.intent);
  assert(noSalesLinks(payload), payload?.reply);
  assert(payload?.next_action === "aguardar_mensagem", payload?.next_action);
});

await test("Dynamic Block de elogio não cria botão de venda", async () => {
  const { payload } = await call({ first_name:"Bruno", comment_text:"Amei 😍", response_mode:"dynamic_block" });
  assert(payload?.version === "v2", `version=${payload?.version}`);
  const buttons = payload?.content?.messages?.flatMap((m) => Array.isArray(m?.buttons) ? m.buttons : []) || [];
  assert(buttons.length === 0, `buttons=${JSON.stringify(buttons)}`);
  assert(!String(payload?.content?.messages?.[0]?.text || "").includes("saipos.com"), JSON.stringify(payload));
});

if (failed) {
  console.error(`\n${failed} teste(s) de comentários falharam.`);
  process.exit(1);
}
console.log("\nTodos os testes de comentários passaram.");

if (ORIGINAL.OPENAI_API_KEY === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = ORIGINAL.OPENAI_API_KEY;
if (ORIGINAL.WEBHOOK_SECRET === undefined) delete process.env.WEBHOOK_SECRET; else process.env.WEBHOOK_SECRET = ORIGINAL.WEBHOOK_SECRET;
if (ORIGINAL.VERCEL_ENV === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = ORIGINAL.VERCEL_ENV;
if (ORIGINAL.NODE_ENV === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = ORIGINAL.NODE_ENV;
