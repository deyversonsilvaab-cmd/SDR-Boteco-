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
await test("promoção genérica reúne todas as ofertas ativas", async () => {
  const p = await ask("tem promoção?");
  assert.equal(p.intent, "promocoes_ativas", JSON.stringify(p));
  const low = String(p.reply || "").toLowerCase();
  for (const part of ["burger em dobro", "terça", "16h", "paga 1", "leva 2", "promoção de chopp", "r$ 9,90", "r$ 3,99", "sábado", "domingo", "20h"]) {
    assert(low.includes(part), `faltou ${part}: ${p.reply}`);
  }
  assert(low.includes("burger ou chopp"), p.reply);
});
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
function assertBurgerPromo(payload) {
  assert.equal(payload.intent, "promocao_burger", JSON.stringify(payload));
  const low = String(payload.reply || "").toLowerCase();
  assert(low.includes("terça"), payload.reply);
  assert(low.includes("a partir das 16h"), payload.reply);
  assert(low.includes("paga 1") || low.includes("pague 1"), payload.reply);
  assert(low.includes("leva 2") || low.includes("leve 2"), payload.reply);
  assert(low.includes("mesmo burger") || low.includes("mesmo lanche"), payload.reply);
  assert(low.includes("burguer salada"), payload.reply);
  assert(low.includes("r$ 29,90"), payload.reply);
  assert(low.includes("burguer bacon"), payload.reply);
  assert(low.includes("r$ 33,90"), payload.reply);
  assert(low.includes("burguer duplo bacon"), payload.reply);
  assert(low.includes("r$ 39,90"), payload.reply);
  assert(!low.includes("21h"), payload.reply);
  assert(!payload.reply.includes("R$ 3,99"), payload.reply);
}

await test("burger em dobro usa a regra oficial de terça a partir das 16h", async () => {
  assertBurgerPromo(await ask("hamburguer em dobro"));
});
await test("promoção de lanche reconhece a oferta de burger", async () => {
  assertBurgerPromo(await ask("qual a promoção de lanche?"));
});
await test("promoção de terça é individual e promoção genérica reúne todas", async () => {
  assertBurgerPromo(await ask("tem promoção de terça?"));
  const all = await ask("tem promoção?");
  assert.equal(all.intent, "promocoes_ativas", JSON.stringify(all));
  assert(all.reply.includes("Burger em Dobro"), all.reply);
  assert(all.reply.includes("Promoção de Chopp"), all.reply);
});
await test("paga 1 leva 2 reconhece burger em dobro", async () => {
  assertBurgerPromo(await ask("paga 1 leva 2 no burger?"));
});
await test("WhatsApp recebe promoção de burger sem handoff", async () => {
  const p = await ask("lanche em dobro", "whatsapp");
  assertBurgerPromo(p);
  assert.equal(p.handoff, false);
});
await test("burger normal mostra preço e apenas convida para conhecer a promoção", async () => {
  const p = await ask("qual o valor do burguer bacon?");
  assert.equal(p.intent, "item_cardapio", JSON.stringify(p));
  assert(p.reply.includes("R$ 33,90"), p.reply);
  const low = p.reply.toLowerCase();
  assert(low.includes("promoção de terça-feira") || low.includes("promocao de terca-feira"), p.reply);
  assert(low.includes("me responde") || low.includes("te explico"), p.reply);
  assert(!low.includes("paga 1"), p.reply);
  assert(!low.includes("leva 2"), p.reply);
});

await test("lanche lista preços normais e convida para a promoção sem explicar antes da resposta", async () => {
  const p = await ask("lanche?");
  assert.equal(p.intent, "categoria_cardapio", JSON.stringify(p));
  for (const value of ["R$ 29,90", "R$ 33,90", "R$ 39,90"]) assert(p.reply.includes(value), p.reply);
  const low = p.reply.toLowerCase();
  assert(low.includes("promoção de terça-feira") || low.includes("promocao de terca-feira"), p.reply);
  assert(!low.includes("paga 1"), p.reply);
  assert(!low.includes("leva 2"), p.reply);
});

await test("resposta sim após convite do burger recebe a explicação completa em nova mensagem", async () => {
  const first = await ask("qual o valor do burguer bacon?");
  const second = await ask("sim", "instagram", {
    last_intent: first.intent,
    last_topic: first.topic,
    last_bot_reply: first.reply
  });
  assertBurgerPromo(second);
});

await test("não após convite do burger encerra o assunto sem empurrar promoção", async () => {
  const first = await ask("qual o valor do burguer bacon?");
  const second = await ask("não", "instagram", {
    last_intent: first.intent,
    last_topic: first.topic,
    last_bot_reply: first.reply
  });
  assert.equal(second.intent, "promocao_burger_recusada", JSON.stringify(second));
  assert(!second.reply.toLowerCase().includes("paga 1"), second.reply);
});

await test("após lista unificada o cliente escolhe burger ou chopp em uma palavra", async () => {
  const first = await ask("quais promoções vocês têm?");
  assert.equal(first.intent, "promocoes_ativas", JSON.stringify(first));
  const burger = await ask("burger", "instagram", { last_intent: first.intent, last_topic: first.topic, last_bot_reply: first.reply });
  assertBurgerPromo(burger);
  const chopp = await ask("chopp", "instagram", { last_intent: first.intent, last_topic: first.topic, last_bot_reply: first.reply });
  assertPromo(chopp);
});

await test("ofertas genéricas também reúnem todas as promoções", async () => {
  const p = await ask("quais ofertas tem?");
  assert.equal(p.intent, "promocoes_ativas", JSON.stringify(p));
  assert(p.reply.includes("Burger em Dobro"), p.reply);
  assert(p.reply.includes("Promoção de Chopp"), p.reply);
});

await test("fondue doce continua removido da base ativa", async () => {
  const k = JSON.parse(await readFile(new URL("./data/knowledge.json", import.meta.url), "utf8"));
  assert.equal(k.catalogo.some((item) => String(item?.nome || "").toLowerCase().includes("fondue")), false);
  const p = await ask("tem fondue doce?");
  assert.equal(p.intent, "item_inativo", JSON.stringify(p));
  assert(!/R\$\s*\d/.test(String(p.reply || "")), p.reply);
});
await test("catálogo preserva promoção e agora contém 141 itens e 17 categorias", async () => {
  const k = JSON.parse(await readFile(new URL("./data/knowledge.json", import.meta.url), "utf8"));
  assert.equal(k.catalogo.length, 141);
  assert.equal(k.categorias_cardapio.length, 17);
  assert.equal(k.campanhas_ativas.promocao_chopp.preco_promocional, "R$ 3,99");
  assert.equal(k.campanhas_ativas.promocao_chopp.preco_base_diario, "a partir de R$ 9,90");
  assert.equal(k.campanhas_ativas.promocao_chopp.horario_promocional, "das 16h às 20h");
});
await test("guardrail da promoção rejeita dia/horário inventado pela IA", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return { output_text: JSON.stringify({ reply: "Tem chopp a R$ 3,99 na sexta às 14h e também aos fins de semana." }) };
    },
    async text() { return ""; }
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
await test("GET health retorna 2.9.10 e os dois canais", async () => {
  const req = makeReq({}, "GET");
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.version, "2.9.10");
  assert.deepEqual(res.payload.channels, ["instagram", "whatsapp"]);
});

console.log("\nPromoções unificadas + interação de burger: todos os testes passaram.");
