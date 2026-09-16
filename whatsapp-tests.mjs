import handler, { splitForChannel } from "./api/manychat.js";

delete process.env.OPENAI_API_KEY;

function makeReq(message, extraBody = {}, method = "POST") {
  return {
    method,
    headers: {},
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

async function call(message, extraBody = {}) {
  const req = makeReq(message, extraBody);
  const res = makeRes();
  await handler(req, res);
  return { status: res.statusCode, payload: res.payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

await test("GET health v2.1.0 + canais", async () => {
  const req = makeReq("", {}, "GET");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 200, `status=${res.statusCode}`);
  assert(res.payload?.version === "2.1.0", `version=${res.payload?.version}`);
  assert(JSON.stringify(res.payload?.channels) === JSON.stringify(["instagram", "whatsapp"]), `channels=${JSON.stringify(res.payload?.channels)}`);
});

await test("WhatsApp reserva gera handoff", async () => {
  const { status, payload } = await call("quero reservar mesa pra 8 sábado", { channel: "whatsapp" });
  assert(status === 200, `status=${status}`);
  assert(payload?.channel === "whatsapp", `channel=${payload?.channel}`);
  assert(payload?.handoff === true, `handoff=${payload?.handoff}`);
  assert(payload?.handoff_reason === "reserva", `handoff_reason=${payload?.handoff_reason}`);
  assert(payload?.next_action === "handoff_humano", `next_action=${payload?.next_action}`);
  assert(payload?.needs_human === true, `needs_human=${payload?.needs_human}`);
  assert(String(payload?.reply || "").toLowerCase().includes("equipe"), "reply não avisa handoff para equipe");
});

await test("WhatsApp reclamação gera handoff_reclamacao", async () => {
  const { payload } = await call("tive um problema com meu pedido", { channel: "whatsapp" });
  assert(payload?.handoff === true, `handoff=${payload?.handoff}`);
  assert(payload?.handoff_reason === "reclamacao", `handoff_reason=${payload?.handoff_reason}`);
  assert(payload?.next_action === "handoff_humano", `next_action=${payload?.next_action}`);
});

await test("WhatsApp cardápio resolve sem handoff", async () => {
  const { payload } = await call("me manda o cardápio", { channel: "whatsapp" });
  assert(payload?.handoff === false, `handoff=${payload?.handoff}`);
  assert(payload?.next_action === "abrir_cardapio", `next_action=${payload?.next_action}`);
  assert(String(payload?.reply || "").includes("https://botequimpatiolimeira.saipos.com/home"), "link do cardápio ausente");
  assert(payload?.reply_part_2 === "", "WhatsApp não deveria preencher reply_part_2");
  assert(Array.isArray(payload?.messages) && payload.messages.length === 1, `messages=${payload?.messages?.length}`);
});

await test("WhatsApp humano ativo fica em silêncio", async () => {
  const { payload } = await call("ainda preciso de ajuda", { channel: "whatsapp", atendimento_humano: true });
  assert(payload?.reply === "", `reply=${JSON.stringify(payload?.reply)}`);
  assert(payload?.next_action === "silencio_humano", `next_action=${payload?.next_action}`);
  assert(payload?.handoff === true, `handoff=${payload?.handoff}`);
  assert(Array.isArray(payload?.messages) && payload.messages.length === 0, `messages=${payload?.messages?.length}`);
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

await test("Regressão Instagram mantém comportamento 2.0.2", async () => {
  const { payload } = await call("Queria o cardápio", { channel: "instagram" });
  assert(payload?.channel === "instagram", `channel=${payload?.channel}`);
  assert(payload?.intent === "cardapio", `intent=${payload?.intent}`);
  assert(payload?.next_action === "abrir_cardapio", `next_action=${payload?.next_action}`);
  assert(payload?.handoff === false, `handoff=${payload?.handoff}`);
  assert(String(payload?.reply || "").includes("saipos.com"), "cardápio ausente");
});

if (failed) {
  console.error(`\n${failed} teste(s) de WhatsApp/regressão falharam.`);
  process.exit(1);
}

console.log("\nTodos os testes de WhatsApp e regressão passaram.");
