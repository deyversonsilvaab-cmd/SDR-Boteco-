// v2.9.9 — Marmita / retirada no balcão.
import handler from "./api/manychat.js";

let failed = 0;
async function call(message, extra = {}) {
  const req = { method: "POST", headers: {}, query: {}, body: { first_name: "Re", message, channel: "instagram", event_type: "direct", ...extra } };
  let out;
  const res = { status() { return this; }, setHeader() {}, json(o) { out = o; return this; }, send(o) { out = o; return this; }, end() { return this; } };
  await handler(req, res);
  return out;
}
function check(name, cond, out) {
  if (cond) console.log(`PASS | ${name}`);
  else { failed++; console.log(`FAIL | ${name}\n  -> ${JSON.stringify({ intent: out?.intent, ctas: out?.ctas, reply: out?.reply })}`); }
}
const hasAllCtas = (r) => ["pedido", "ifood", "99food"].every((t) => (r.ctas || []).some((c) => c.type === t));

for (const phrase of ["Bommmm diaaaa🙏Vocês fazem marmitas?", "vcs tem marmitex?", "fazem quentinha?", "tem marmita hoje?", "vcs vendem pra viagem?"]) {
  const r = await call(phrase);
  check(`marmita: "${phrase}"`, r.intent === "marmita" && /Fazemos sim/.test(r.reply) && /balc[aã]o/.test(r.reply) && hasAllCtas(r) && !/https?:\/\//.test(r.reply), r);
}
let r = await call("posso pegar no balcão?");
check("retirada no balcão", r.intent === "retirada_balcao" && /Pode sim/.test(r.reply) && hasAllCtas(r), r);

r = await call("vocês fazem marmitas?", { channel: "whatsapp" });
check("WhatsApp: marmita com links no texto", r.intent === "marmita" && r.reply.includes("saipos.com") && r.reply.includes("ifood") && !r.handoff, r);

r = await call("Bommmm diaaaa");
check("Bommmm diaaaa é saudação", r.intent === "saudacao", r);

if (failed) { console.log(`${failed} teste(s) falharam`); process.exit(1); }
console.log("Todos os testes de marmita passaram");
