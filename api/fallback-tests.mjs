process.env.OPENAI_API_KEY = "";
const { default: handler } = await import("./api/manychat.js");

const WA = "https://wa.me/5519997858351";
const MENU = "https://botequimpatiolimeira.saipos.com/home?utm_id=97757_v0_s00_e0_tv0";

function assert(condition, message) { if (!condition) throw new Error(message); }
function makeRes() {
  return {
    statusCode: null,
    payload: null,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return payload; },
    end() {}
  };
}
async function ask(body = {}) {
  const res = makeRes();
  await handler({ method: "POST", headers: {}, query: {}, body: { first_name: "Teste", subscriber_id: "fallback-test", channel: "instagram", ...body } }, res);
  return res.payload;
}
function cleanInstagramFallback(payload) {
  const reply = String(payload?.reply || "");
  assert(!reply.includes(MENU), reply);
  assert(!reply.includes(WA), reply);
  assert(!/https?:\/\//i.test(reply), reply);
  assert(!/\bem\s*[:：.,!?-]*\s*$/i.test(reply), reply);
  assert(!/[:：]\s*$/i.test(reply), reply);
  return reply;
}

let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`PASS | ${name}`); }
  catch (error) { failed++; console.error(`FAIL | ${name} | ${error.message}`); }
}

await test("fallback não entendido fica limpo e oferece WhatsApp por CTA", async () => {
  const p = await ask({ message: "preciso saber uma coisa xyzabc" });
  assert(p.intent === "outro", p.intent);
  const reply = cleanInstagramFallback(p);
  assert(/informação certa/i.test(reply), reply);
  assert(p.cta_type === "whatsapp", JSON.stringify(p.ctas));
  assert(p.cta_label === "Falar no WhatsApp", p.cta_label);
  assert(p.cta_url === WA, p.cta_url);
});

await test("mensagem vazia fica limpa e realmente possui botão WhatsApp", async () => {
  const p = await ask({ message: "" });
  assert(p.intent === "sem_mensagem", p.intent);
  const reply = cleanInstagramFallback(p);
  assert(/Quero te ajudar/i.test(reply), reply);
  assert(p.cta_type === "whatsapp", JSON.stringify(p.ctas));
  assert(p.cta_label === "Falar no WhatsApp", p.cta_label);
  assert(p.cta_url === WA, p.cta_url);
});

await test("erro fatal retorna texto limpo e CTA WhatsApp", async () => {
  const res = makeRes();
  const req = { method: "POST", headers: {}, query: {} };
  Object.defineProperty(req, "body", { get() { throw new Error("falha controlada de teste"); } });
  await handler(req, res);
  const p = res.payload;
  assert(p.intent === "erro_seguro", p.intent);
  const reply = cleanInstagramFallback(p);
  assert(/instabilidade rápida/i.test(reply), reply);
  assert(p.cta_type === "whatsapp", JSON.stringify(p.ctas));
  assert(p.cta_label === "Falar no WhatsApp", p.cta_label);
  assert(p.cta_url === WA, p.cta_url);
});

await test("WhatsApp não recebe a limpeza visual exclusiva do Instagram", async () => {
  const res = makeRes();
  await handler({ method: "POST", headers: {}, query: {}, body: { message: "", first_name: "Teste", subscriber_id: "fallback-wa", channel: "whatsapp" } }, res);
  const p = res.payload;
  assert(p.channel === "whatsapp", p.channel);
  assert(p.intent === "sem_mensagem", p.intent);
  assert(String(p.reply).includes(MENU) || String(p.reply).includes(WA), p.reply);
});

await test("health e payload reportam 2.9.1", async () => {
  const res = makeRes();
  await handler({ method: "GET", headers: {}, query: {} }, res);
  assert(res.payload?.version === "2.9.1", JSON.stringify(res.payload));
  const p = await ask({ message: "Oi" });
  assert(p.app_version === "2.9.1", p.app_version);
});

if (failed) {
  console.error(`\n${failed} teste(s) de fallback falharam.`);
  process.exit(1);
}
console.log("\nFallback Instagram v2.9.1: todos os testes passaram.");
