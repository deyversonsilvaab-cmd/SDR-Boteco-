import handler, { splitForChannel } from "./api/manychat.js";

const ORIGINAL_ENV = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  VERCEL_ENV: process.env.VERCEL_ENV,
  NODE_ENV: process.env.NODE_ENV
};
const ORIGINAL_FETCH = global.fetch;

delete process.env.OPENAI_API_KEY;
delete process.env.WEBHOOK_SECRET;
delete process.env.VERCEL_ENV;
if (process.env.NODE_ENV === "production") delete process.env.NODE_ENV;

function makeReq(message, extraBody = {}, method = "POST", headers = {}) {
  return {
    method,
    headers,
    body: method === "POST" ? {
      message,
      first_name: "Mariana",
      subscriber_id: "wa-teste-1",
      ...extraBody
    } : {},
    query: {}
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

async function call(message, extraBody = {}, headers = {}) {
  const req = makeReq(message, extraBody, "POST", headers);
  const res = makeRes();
  await handler(req, res);
  return { status: res.statusCode, payload: res.payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hasSalesLink(payload) {
  const reply = String(payload?.reply || "");
  return reply.includes("saipos.com") || reply.includes("ifood.com") || reply.includes("99app.com/99food");
}

let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS | ${name}`);
  } catch (error) {
    failed++;
    console.error(`FAIL | ${name} | ${error.message}`);
  }
}

await test("GET health v2.9.0 + canais", async () => {
  const req = makeReq("", {}, "GET");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 200, `status=${res.statusCode}`);
  assert(res.payload?.version === "2.9.0", `version=${res.payload?.version}`);
  assert(JSON.stringify(res.payload?.channels) === JSON.stringify(["instagram", "whatsapp"]), `channels=${JSON.stringify(res.payload?.channels)}`);
});

await test("WhatsApp reserva gera handoff sem CTA comercial", async () => {
  const { status, payload } = await call("quero reservar mesa pra 8 sábado", { channel: "whatsapp" });
  assert(status === 200, `status=${status}`);
  assert(payload?.channel === "whatsapp", `channel=${payload?.channel}`);
  assert(payload?.handoff === true, `handoff=${payload?.handoff}`);
  assert(payload?.handoff_reason === "reserva", `handoff_reason=${payload?.handoff_reason}`);
  assert(payload?.next_action === "handoff_humano", `next_action=${payload?.next_action}`);
  assert(payload?.needs_human === true, `needs_human=${payload?.needs_human}`);
  assert(String(payload?.reply || "").toLowerCase().includes("equipe"), "reply não avisa handoff para equipe");
  assert(!hasSalesLink(payload), "reserva em handoff não deve oferecer link comercial");
});

await test("WhatsApp reclamação com 'pedido' não herda cardápio/iFood", async () => {
  const { payload } = await call("tive um problema com meu pedido", { channel: "whatsapp" });
  assert(payload?.handoff === true, `handoff=${payload?.handoff}`);
  assert(payload?.handoff_reason === "reclamacao", `handoff_reason=${payload?.handoff_reason}`);
  assert(payload?.intent === "reclamacao", `intent=${payload?.intent}`);
  assert(payload?.topic === "reclamacao", `topic=${payload?.topic}`);
  assert(payload?.next_action === "handoff_humano", `next_action=${payload?.next_action}`);
  assert(!hasSalesLink(payload), `reclamação recebeu CTA comercial: ${payload?.reply}`);
});

const complaintEdges = [
  "oi, tive um problema",
  "oi, está tudo errado",
  "boa noite, preciso reclamar",
  "oi quero estorno",
  "boa noite quero cancelar",
  "obrigado quero reembolso",
  "valeu quero nota fiscal"
];
for (const message of complaintEdges) {
  await test(`Reclamação vence saudação/despedida: ${message}`, async () => {
    const { payload } = await call(message, { channel: "whatsapp" });
    assert(payload?.handoff === true, `handoff=${payload?.handoff}`);
    assert(payload?.handoff_reason === "reclamacao", `handoff_reason=${payload?.handoff_reason}`);
    assert(payload?.intent === "reclamacao", `intent=${payload?.intent}`);
    assert(payload?.next_action === "handoff_humano", `next_action=${payload?.next_action}`);
    assert(!hasSalesLink(payload), `CTA comercial indevido: ${payload?.reply}`);
  });
}

const benignEdges = [
  "sem problema, valeu",
  "problema resolvido, valeu",
  "não tive problema, obrigado",
  "deu tudo certo, valeu"
];
for (const message of benignEdges) {
  await test(`Expressão benigna não gera falso handoff: ${message}`, async () => {
    const { payload } = await call(message, { channel: "whatsapp" });
    assert(payload?.handoff === false, `handoff=${payload?.handoff}, reason=${payload?.handoff_reason}`);
  });
}

await test("Pedido para falar com atendente faz handoff sem mandar link do próprio WhatsApp", async () => {
  const { payload } = await call("quero falar com atendente", { channel: "whatsapp" });
  assert(payload?.handoff === true, `handoff=${payload?.handoff}`);
  assert(payload?.handoff_reason === "humano", `handoff_reason=${payload?.handoff_reason}`);
  assert(payload?.next_action === "handoff_humano", `next_action=${payload?.next_action}`);
  assert(!String(payload?.reply || "").includes("wa.me/"), `link redundante no handoff: ${payload?.reply}`);
});

await test("Negociação vence intenção de pedido e não envia checkout antes do humano", async () => {
  const { payload } = await call("quero fechar pedido em grande quantidade e negociar desconto", { channel: "whatsapp" });
  assert(payload?.handoff === true, `handoff=${payload?.handoff}`);
  assert(payload?.handoff_reason === "negociacao", `handoff_reason=${payload?.handoff_reason}`);
  assert(payload?.intent === "negociacao", `intent=${payload?.intent}`);
  assert(payload?.topic === "negociacao", `topic=${payload?.topic}`);
  assert(!hasSalesLink(payload), `negociação recebeu CTA comercial: ${payload?.reply}`);
});

await test("WhatsApp cardápio resolve sem handoff", async () => {
  const { payload } = await call("me manda o cardápio", { channel: "whatsapp" });
  assert(payload?.handoff === false, `handoff=${payload?.handoff}`);
  assert(payload?.next_action === "abrir_cardapio", `next_action=${payload?.next_action}`);
  assert(String(payload?.reply || "").includes("https://botequimpatiolimeira.saipos.com/home"), "link do cardápio ausente");
  assert(payload?.reply_part_2 === "", "WhatsApp não deveria preencher reply_part_2");
  assert(Array.isArray(payload?.messages) && payload.messages.length === 1, `messages=${payload?.messages?.length}`);
});

await test("WhatsApp humano ativo boolean fica em silêncio", async () => {
  const { payload } = await call("ainda preciso de ajuda", { channel: "whatsapp", atendimento_humano: true });
  assert(payload?.reply === "", `reply=${JSON.stringify(payload?.reply)}`);
  assert(payload?.next_action === "silencio_humano", `next_action=${payload?.next_action}`);
  assert(payload?.handoff === true, `handoff=${payload?.handoff}`);
  assert(Array.isArray(payload?.messages) && payload.messages.length === 0, `messages=${payload?.messages?.length}`);
});

await test("WhatsApp humano ativo também aceita custom field '1'", async () => {
  const { payload } = await call("teste", { channel: "wa", custom_fields: { atendimento_humano: "1" } });
  assert(payload?.channel === "whatsapp", `channel=${payload?.channel}`);
  assert(payload?.reply === "", `reply=${JSON.stringify(payload?.reply)}`);
  assert(payload?.next_action === "silencio_humano", `next_action=${payload?.next_action}`);
});

await test("Alias WhatsApp Business é normalizado para whatsapp", async () => {
  const { payload } = await call("me manda o cardápio", { channel: "WhatsApp Business" });
  assert(payload?.channel === "whatsapp", `channel=${payload?.channel}`);
  assert(payload?.handoff === false, `handoff=${payload?.handoff}`);
});

await test("WhatsApp vaga vai para RH sem handoff geral", async () => {
  const { payload } = await call("quero mandar currículo", { channel: "whatsapp" });
  assert(payload?.intent === "vaga", `intent=${payload?.intent}`);
  assert(payload?.handoff === false, `handoff=${payload?.handoff}`);
  assert(payload?.needs_human === false, `needs_human=${payload?.needs_human}`);
  assert(payload?.next_action === "whatsapp_vagas", `next_action=${payload?.next_action}`);
  assert(String(payload?.reply || "").includes("https://wa.me/5517996022567"), "link do RH ausente");
});

await test("Formatação por canal: WhatsApp uma parte, Instagram mantém split", async () => {
  const longText = `${"A".repeat(880)} ${"B".repeat(880)} ${"C".repeat(200)}`;
  const waParts = splitForChannel(longText, "whatsapp");
  const igParts = splitForChannel(longText, "instagram");
  assert(waParts.length === 1, `waParts=${waParts.length}`);
  assert(igParts.length >= 2 && igParts.length <= 3, `igParts=${igParts.length}`);
  assert(igParts.every((p) => p.length <= 900), `parte Instagram > 900`);
});

await test("Regressão estrutural do Instagram continua preservada", async () => {
  const { payload } = await call("Queria o cardápio", { channel: "instagram" });
  assert(payload?.channel === "instagram", `channel=${payload?.channel}`);
  assert(payload?.intent === "cardapio", `intent=${payload?.intent}`);
  assert(payload?.next_action === "abrir_cardapio", `next_action=${payload?.next_action}`);
  assert(payload?.handoff === false, `handoff=${payload?.handoff}`);
  assert(!String(payload?.reply || "").includes("saipos.com"), `link do cardápio deve ficar fora do texto: ${payload?.reply}`);
  assert(String(payload?.cardapio_link || "").includes("saipos.com"), `campo cardapio_link ausente: ${payload?.cardapio_link}`);
});

await test("Guardrail rejeita horário inventado pela IA", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  let sentBody = null;
  global.fetch = async (_url, options) => {
    sentBody = JSON.parse(options.body);
    return {
      ok: true,
      async json() {
        return { choices: [{ message: { content: JSON.stringify({ reply: "Hoje fechamos às 3h." }) } }] };
      }
    };
  };

  try {
    const { payload } = await call("que horas fecha?", { channel: "whatsapp" });
    const reply = String(payload?.reply || "");
    assert(!reply.includes("3h"), `horário inventado passou: ${reply}`);
    assert(reply.includes("11h") && reply.includes("22h"), `fallback factual não preservado: ${reply}`);
    assert(sentBody?.temperature === 0.2, `temperature=${sentBody?.temperature}`);
  } finally {
    delete process.env.OPENAI_API_KEY;
    global.fetch = ORIGINAL_FETCH;
  }
});

await test("Guardrail de handoff rejeita até link comercial oficial injetado pela IA", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = async () => ({
    ok: true,
    async json() {
      return { choices: [{ message: { content: JSON.stringify({ reply: "Entendi o problema. Enquanto isso, veja o cardápio: https://botequimpatiolimeira.saipos.com/home" }) } }] };
    }
  });

  try {
    const { payload } = await call("tive um problema com meu pedido", { channel: "whatsapp" });
    assert(payload?.handoff === true, `handoff=${payload?.handoff}`);
    assert(!hasSalesLink(payload), `link comercial passou no handoff: ${payload?.reply}`);
    assert(String(payload?.reply || "").toLowerCase().includes("equipe"), `fallback de handoff não aplicado: ${payload?.reply}`);
  } finally {
    delete process.env.OPENAI_API_KEY;
    global.fetch = ORIGINAL_FETCH;
  }
});

await test("Produção falha fechada quando WEBHOOK_SECRET não está configurado", async () => {
  const oldVercel = process.env.VERCEL_ENV;
  const oldSecret = process.env.WEBHOOK_SECRET;
  process.env.VERCEL_ENV = "production";
  delete process.env.WEBHOOK_SECRET;
  try {
    const { status, payload } = await call("oi", { channel: "whatsapp" });
    assert(status === 401, `status=${status}`);
    assert(payload?.ok === false, `payload=${JSON.stringify(payload)}`);
  } finally {
    if (oldVercel === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = oldVercel;
    if (oldSecret === undefined) delete process.env.WEBHOOK_SECRET; else process.env.WEBHOOK_SECRET = oldSecret;
  }
});

if (ORIGINAL_ENV.OPENAI_API_KEY === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = ORIGINAL_ENV.OPENAI_API_KEY;
if (ORIGINAL_ENV.WEBHOOK_SECRET === undefined) delete process.env.WEBHOOK_SECRET; else process.env.WEBHOOK_SECRET = ORIGINAL_ENV.WEBHOOK_SECRET;
if (ORIGINAL_ENV.VERCEL_ENV === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = ORIGINAL_ENV.VERCEL_ENV;
if (ORIGINAL_ENV.NODE_ENV === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = ORIGINAL_ENV.NODE_ENV;
global.fetch = ORIGINAL_FETCH;

if (failed) {
  console.error(`\n${failed} teste(s) de WhatsApp/regressão falharam.`);
  process.exit(1);
}

console.log("\nTodos os testes de WhatsApp, segurança e regressão passaram.");
