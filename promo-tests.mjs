import assert from "node:assert/strict";
import handler from "./api/manychat.js";
import { readFile } from "node:fs/promises";

process.env.NODE_ENV = "test";
delete process.env.VERCEL_ENV;
delete process.env.OPENAI_API_KEY;
delete process.env.WEBHOOK_SECRET;
const ORIGINAL_FETCH = global.fetch;

function makeReq(body = {}, method = "POST") {
  return { method, body, headers: {}, query: {} };
}

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
    end() { return this; }
  };
}

async function ask(message, channel = "instagram", extra = {}) {
  const req = makeReq({
    subscriber_id: "promo-test",
    first_name: "",
    username: "promo_test",
    message,
    channel,
    event_type: "direct",
    ...extra
  });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  return res.payload;
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    throw err;
  }
}

const requiredPromoParts = [
  "R$ 9,90", "R$ 3,99", "sábado", "domingo", "16h", "20h", "340 ml", "consultar disponibilidade no local"
];

function assertPromo(payload) {
  assert.equal(payload.intent, "promocao_chopp", JSON.stringify(payload));
  const low = String(payload.reply || "").toLowerCase();
  for (const part of requiredPromoParts) {
    assert(low.includes(part.toLowerCase()), `faltou ${part}: ${payload.reply}`);
  }
  assert(low.includes("ashby"), payload.reply);
  assert(low.includes("brahma"), payload.reply);
  assert(!low.includes("ativa agora"), payload.reply);
  assert(!low.includes("disponível agora"), payload.reply);
  assert(!low.includes("disponivel agora"), payload.reply);
}

await test("tem chopp retorna promoção oficial", async () => assertPromo(await ask("tem chopp?")));
await test("preço do chopp retorna promoção oficial", async () => assertPromo(await ask("qual o valor do chopp?")));
await test("promoção genérica retorna promoção de chopp", async () => assertPromo(await ask("tem promoção?")));
await test("happy hour retorna promoção de chopp", async () => assertPromo(await ask("happy hour?")));
await test("chopp Brahma retorna promoção, não item inexistente", async () => {
  const p = await ask("chopp brahma");
  assertPromo(p);
  assert.notEqual(p.intent, "item_nao_encontrado");
});
await test("chopp Ashby funciona no WhatsApp sem handoff", async () => {
  const p = await ask("chopp ashby", "whatsapp");
  assertPromo(p);
  assert.equal(p.handoff, false);
  assert.equal(p.next_action, "responder");
});
await test("erros simples de grafia também encontram a promoção", async () => {
  assertPromo(await ask("tem choop?"));
  assertPromo(await ask("chopinho braama"));
});
await test("burger em dobro continua tendo prioridade própria", async () => {
  const p = await ask("hamburguer em dobro");
  assert.equal(p.intent, "promocao_burger", JSON.stringify(p));
  assert(p.reply.toLowerCase().includes("terça"), p.reply);
  assert(!p.reply.includes("R$ 3,99"), p.reply);
});
await test("catálogo permanece com 122 itens e 15 categorias", async () => {
  const k = JSON.parse(await readFile(new URL("./data/knowledge.json", import.meta.url), "utf8"));
  assert.equal(k.catalogo.length, 122);
  assert.equal(k.categorias_cardapio.length, 15);
  assert.equal(k.campanhas_ativas.promocao_chopp.preco_promocional, "R$ 3,99");
  assert.equal(k.campanhas_ativas.promocao_chopp.preco_base_diario, "a partir de R$ 9,90");
  assert.equal(k.campanhas_ativas.promocao_chopp.horario_promocional, "das 16h às 20h");
});
await test("guardrail da promoção rejeita dia/horário inventado pela IA", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = async () => ({
    ok: true,
    async json() {
      return { choices: [{ message: { content: JSON.stringify({ reply: "Tem chopp a R$ 3,99 na sexta às 14h e também aos fins de semana." }) } }] };
    }
  });
  try {
    const p = await ask("qual a promoção de chopp?");
    assertPromo(p);
    const low = p.reply.toLowerCase();
    assert(!low.includes("sexta"), p.reply);
    assert(!low.includes("14h"), p.reply);
  } finally {
    delete process.env.OPENAI_API_KEY;
    global.fetch = ORIGINAL_FETCH;
  }
});
await test("GET health retorna 2.3.0 e os dois canais", async () => {
  const req = makeReq({}, "GET");
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.version, "2.3.0");
  assert.deepEqual(res.payload.channels, ["instagram", "whatsapp"]);
});

console.log("\nPromoção de chopp: todos os testes passaram.");
