// v2.9.10 — Marmita / retirada no balcão.
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
const hasAllCtas = (r) => ["pedido", "ifood"].every((t) => (r.ctas || []).some((c) => c.type === t)) && !(r.ctas || []).some((c) => c.type === "99food") && !/99\s?food/i.test(r.reply);

for (const phrase of ["Bommmm diaaaa🙏Vocês fazem marmitas?", "vcs tem marmitex?", "fazem quentinha?", "tem marmita hoje?", "vcs vendem pra viagem?"]) {
  const r = await call(phrase);
  check(`marmita: "${phrase}"`, r.intent === "marmita" && /Fazemos sim/.test(r.reply) && /balc[aã]o/.test(r.reply) && hasAllCtas(r) && !/https?:\/\//.test(r.reply), r);
}
let r = await call("posso pegar no balcão?");
check("retirada no balcão", r.intent === "retirada_balcao" && /Pode sim/.test(r.reply) && hasAllCtas(r), r);

r = await call("vocês fazem marmitas?", { channel: "whatsapp" });
check("WhatsApp: marmita responde sem link e sem botão automático", r.intent === "marmita" && /Fazemos sim/.test(r.reply) && !/https?:\/\//i.test(r.reply) && r.cta_count === 0 && !r.handoff, r);

r = await call("quero uma marmita para retirar no balcão", { channel: "whatsapp" });
check("WhatsApp: retirada explícita recebe somente botão de pedido para retirada", r.intent === "marmita" && r.cta_count === 1 && r.cta_1_type === "pedido_retirada" && !/https?:\/\//i.test(r.reply), r);

r = await call("Bommmm diaaaa");
check("Bommmm diaaaa é saudação", r.intent === "saudacao", r);

r = await call("tem no 99food?");
check("99Food ainda não está no ar", r.intent === "food99_indisponivel" && /Ainda não estamos no 99Food/.test(r.reply) && !(r.ctas || []).some((c) => c.type === "99food"), r);

if (failed) { console.log(`${failed} teste(s) falharam`); process.exit(1); }
console.log("Todos os testes de marmita passaram");
