// v2.10.0 — visita confirmada, happy hour, próximo passo após preço e opt-in WhatsApp.
import handler from "./api/manychat.js";
let failed = 0;
async function call(message, extra = {}) {
  const req = { method: "POST", headers: {}, query: {}, body: { first_name: "Maria", message, channel: "instagram", event_type: "direct", ...extra } };
  let out; const res = { status() { return this; }, setHeader() {}, json(o) { out = o; return this; }, send(o) { out = o; return this; }, end() { return this; } };
  await handler(req, res); return out;
}
function check(name, cond, out) {
  if (cond) console.log(`PASS | ${name}`);
  else { failed++; console.log(`FAIL | ${name}\n  -> ${JSON.stringify({ intent: out?.intent, ctas: out?.ctas, reply: out?.reply })}`); }
}
const has = (r, t) => (r.ctas || []).some((c) => c.type === t);
for (const p of ["Longo vou fazer uma visita saberear essa delícia", "vou passar ai sabado", "sábado tô aí com a galera", "amanhã vou conhecer"]) {
  const r = await call(p);
  check(`visita: "${p}"`, r.intent === "visita_confirmada" && has(r, "localizacao") && has(r, "whatsapp_optin") && !/https?:\/\//.test(r.reply), r);
}
let r = await call("vou passar aí, tem estacionamento?");
check("pergunta com 'vou passar' não vira visita", r.intent !== "visita_confirmada", r);
r = await call("Parou o happy ?");
check("happy sozinho = promo chopp", r.intent === "promocao_chopp" && has(r, "reserva") && has(r, "whatsapp_optin"), r);
r = await call("Oi. Quero saber sobre a Tábua Mista.");
check("item: preço + Reservar mesa", r.intent === "item_cardapio" && has(r, "reserva") && /Reservar mesa/.test(r.reply) && r.ctas.length <= 3, r);
r = await call("Boa tarde passe endereço");
check("endereço + opt-in", r.intent === "localizacao" && has(r, "whatsapp_optin"), r);
r = await call("Oi. Quero saber sobre a Tábua Mista.", { channel: "whatsapp" });
check("WhatsApp: sem convite de botão", !/Reservar mesa/.test(r.reply), r);
if (failed) { console.log(`${failed} teste(s) falharam`); process.exit(1); }
console.log("Todos os testes de funil v2.10.0 passaram");
