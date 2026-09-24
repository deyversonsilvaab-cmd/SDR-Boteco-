// v2.9.9 — Endereço faltando no anúncio, frustração com robô, crítica e anti-repetição.
import handler from "./api/manychat.js";

let failed = 0;
async function call(message, extra = {}) {
  const req = { method: "POST", headers: {}, query: {}, body: { first_name: "Silvio", message, channel: "instagram", event_type: "direct", ...extra } };
  let out;
  const res = { status() { return this; }, setHeader() {}, json(o) { out = o; return this; }, send(o) { out = o; return this; }, end() { return this; } };
  await handler(req, res);
  return out;
}
function check(name, cond, out) {
  if (cond) console.log(`PASS | ${name}`);
  else { failed++; console.log(`FAIL | ${name}\n  -> ${JSON.stringify({ intent: out?.intent, cta: out?.cta_type, reply: out?.reply })}`); }
}

const FALLBACK = "Quero te passar a informação certa";

let r = await call("Faltou o endereço né véio...");
check("faltou o endereço -> localizacao com endereço completo", r.intent === "localizacao" && r.reply.includes("Carlos Gomes, 1321") && r.cta_type === "localizacao", r);
check("faltou o endereço não vira reclamação", !/sinto muito/i.test(r.reply), r);
check("endereço sem URL no texto do Instagram", !/https?:\/\//.test(r.reply), r);

r = await call("O dever é da administração", { last_intent: "localizacao", last_topic: "localizacao" });
check("crítica após endereço -> reconhece e repete endereço", r.intent === "feedback_critica_local" && r.reply.includes("Carlos Gomes") && !r.reply.includes(FALLBACK), r);

r = await call("O dever é da administração");
check("crítica sem contexto -> reconhece sem fallback", r.intent === "feedback_critica" && !r.reply.includes(FALLBACK) && r.cta_type === "whatsapp", r);

r = await call("Não sou robô pra trocar msg com robô", { last_intent: "outro", last_topic: "fallback" });
check("não sou robô -> atendimento humano, sem fallback", r.intent === "humano_frustracao" && !r.reply.includes(FALLBACK) && r.cta_type === "whatsapp", r);

r = await call("vcs são robô?");
check("pergunta se é robô -> resposta transparente", r.intent === "humano_frustracao" && /autom[aá]tico/i.test(r.reply), r);

r = await call("qual o endereço?");
check("endereço direto -> rua completa", r.intent === "localizacao" && r.reply.includes("Carlos Gomes"), r);

r = await call("meu pedido veio faltando molho");
check("faltou item no pedido continua reclamação", r.intent === "reclamacao", r);

r = await call("robux de graça");
check("robux continua fora_contexto", r.intent === "fora_contexto", r);

r = await call("xpto qwerty");
check("primeiro fallback normal", r.intent === "outro", r);
r = await call("zzz abc", { last_intent: "outro", last_topic: "fallback", last_bot_reply: r.reply });
check("fallback nunca repete: segundo vira outro_repetido", r.intent === "outro_repetido" && !r.reply.includes(FALLBACK), r);

r = await call("Faltou o endereço né véio...", { channel: "whatsapp" });
check("WhatsApp: faltou endereço responde endereço, sem handoff de reclamação", r.handoff_reason !== "reclamacao" && r.reply.includes("Carlos Gomes"), r);

if (failed) { console.log(`${failed} teste(s) falharam`); process.exit(1); }
console.log("Todos os testes de endereço/robô passaram");
