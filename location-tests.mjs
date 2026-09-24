// v2.9.9 — Formatos de pergunta de endereço vistos nas DMs + saudações com letras repetidas.
import handler from "./api/manychat.js";

let failed = 0;
async function call(message, extra = {}) {
  const req = { method: "POST", headers: {}, query: {}, body: { first_name: "Ana", message, channel: "instagram", event_type: "direct", ...extra } };
  let out;
  const res = { status() { return this; }, setHeader() {}, json(o) { out = o; return this; }, send(o) { out = o; return this; }, end() { return this; } };
  await handler(req, res);
  return out;
}
function check(name, cond, out) {
  if (cond) console.log(`PASS | ${name}`);
  else { failed++; console.log(`FAIL | ${name}\n  -> ${JSON.stringify({ intent: out?.intent, reply: out?.reply })}`); }
}

const locationPhrases = [
  "Queria saber Ond vcs estão localizados", "Aonde é", "Aonde estão localizados", "onde vcs ficam", "onde fica",
  "fica onde?", "onde é o boteco", "onde vcs estao", "vcs ficam perto de onde", "como faço pra chegar ai",
  "manda o maps", "manda a localização", "qual bairro", "qual a rua", "qual o endereco de vcs", "é dentro do shopping?",
  "vcs são de limeira?", "Oi, boa tarde! onde vcs ficam?", "onde?", "endereço por favor"
];
for (const phrase of locationPhrases) {
  const r = await call(phrase);
  check(`localização: "${phrase}"`, r.intent === "localizacao" && r.reply.includes("Carlos Gomes, 1321") && r.cta_type === "localizacao" && !/https?:\/\//.test(r.reply), r);
}

let r = await call("onde fica e que horas abre");
check("localização + horário na mesma mensagem", r.intent === "localizacao" && r.reply.includes("Carlos Gomes") && r.reply.includes("11h"), r);

// v2.9.9 — Estacionamento com a tabela oficial do shopping.
for (const phrase of ["tem estacionamento?", "estacionamento é pago?", "onde deixo o carro", "tem onde estacionar?", "quanto é o estacionamento?"]) {
  r = await call(phrase);
  check(`estacionamento: "${phrase}"`, r.intent === "localizacao_estacionamento" && r.reply.includes("R$ 12,00") && r.reply.includes("R$ 10,00") && r.reply.includes("R$ 40,00") && r.reply.includes("11h30") && /altera[cç][oõ]es/.test(r.reply) && r.cta_type === "localizacao", r);
}
r = await call("e pra moto?", { last_topic: "estacionamento", last_intent: "localizacao_estacionamento" });
check("estacionamento: follow-up de moto usa contexto", r.intent === "localizacao_estacionamento" && r.reply.includes("Motos"), r);
r = await call("quanto custa?", { last_topic: "estacionamento", last_intent: "localizacao_estacionamento" });
check("estacionamento: follow-up de preço usa contexto", r.intent === "localizacao_estacionamento", r);

for (const [phrase, intent] of [["onde posso fazer pedido", "pedido"], ["onde mando curriculo", "vaga"], ["onde vejo o cardapio", "cardapio"]]) {
  r = await call(phrase);
  check(`"${phrase}" continua ${intent}`, r.intent === intent, r);
}

for (const g of ["Oii", "Oiii", "Olaaa", "Boa tarde", "boa tardee", "oi boa noite", "opa"]) {
  r = await call(g);
  check(`saudação: "${g}"`, r.intent === "saudacao", r);
}

if (failed) { console.log(`${failed} teste(s) falharam`); process.exit(1); }
console.log("Todos os testes de localização passaram");
