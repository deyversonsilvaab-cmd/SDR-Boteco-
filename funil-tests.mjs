// v2.10.1 — funil, CTA contextual, happy hour e opt-in WhatsApp.
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
for (const p of ["Logo vou fazer uma visita saborear essa delícia", "vou passar ai sabado", "sábado tô aí com a galera", "amanhã vou conhecer"]) {
  const r = await call(p);
  check(`visita: "${p}"`, r.intent === "visita_confirmada" && has(r, "localizacao") && has(r, "whatsapp_optin") && !/https?:\/\//.test(r.reply) && /botões abaixo/i.test(r.reply), r);
}
let r = await call("vou passar aí, tem estacionamento?");
check("pergunta com 'vou passar' não vira visita", r.intent !== "visita_confirmada", r);
r = await call("Parou o happy ?");
check("parou o happy = promo chopp", r.intent === "promocao_chopp" && has(r, "reserva") && has(r, "whatsapp_optin"), r);
r = await call("happy birthday");
check("happy birthday não vira promoção de chopp", r.intent !== "promocao_chopp", r);
r = await call("Oi. Quero saber sobre a Tábua Mista.");
check("comida: preço + Reservar mesa sem promessa automática", r.intent === "item_cardapio" && has(r, "reserva") && /Reservar mesa/.test(r.reply) && /equipe confirma/i.test(r.reply) && !/te separo uma mesa/i.test(r.reply) && r.ctas.length <= 3, r);
r = await call("quanto custa água sem gás?");
check("bebida não empurra reserva de mesa", r.intent === "item_cardapio" && !has(r, "reserva") && has(r, "cardapio") && has(r, "localizacao") && !/Reservar mesa/i.test(r.reply), r);
r = await call("quanto custa molho de alho?");
check("adicional não empurra reserva de mesa", r.intent === "item_cardapio" && !has(r, "reserva") && !/Reservar mesa/i.test(r.reply), r);
r = await call("qual o horário?");
check("horário também dá próximo passo", r.intent === "horario" && has(r, "localizacao") && has(r, "whatsapp_optin"), r);
r = await call("Boa tarde passe endereço");
check("endereço + opt-in", r.intent === "localizacao" && has(r, "whatsapp_optin"), r);
r = await call("Oi. Quero saber sobre a Tábua Mista.", { channel: "whatsapp" });
check("WhatsApp: sem convite de botão embutido no texto", !/Reservar mesa/.test(r.reply), r);
if (failed) { console.log(`${failed} teste(s) falharam`); process.exit(1); }
console.log("Todos os testes de funil v2.10.1 passaram");
