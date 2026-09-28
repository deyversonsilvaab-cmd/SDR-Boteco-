// v2.11.0 — WhatsApp: recepção, conversa aberta para resposta humana, opt-in/opt-out.
// Regra do Michel: nunca dizer que vai direcionar/encaminhar; no máximo "vou buscar a informação".
delete process.env.OPENAI_API_KEY;
const { default: handler } = await import("./api/manychat.js");
let failed = 0;
const FORB = /(direcion|encaminh|transfer|repass|vou chamar|chamar (algu[eé]m|a equipe|o time)|atendente|pessoa da equipe|algu[eé]m (da equipe|do time)|bot[aã]o|wa\.me\/5519997858351|99\s?food)/i;
let aiText = null;
globalThis.fetch = async () => aiText === null
  ? ({ ok: false, status: 500, async text() { return "off"; }, async json() { return {}; } })
  : ({ ok: true, status: 200, async text() { return ""; }, async json() { return { output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ reply: aiText }) }] }] }; } });

async function wa(message, extra = {}) {
  let out; const res = { status() { return this; }, setHeader() {}, json(o) { out = o; return this; }, send(o) { out = o; return this; }, end() { return this; } };
  await handler({ method: "POST", headers: {}, query: {}, body: { first_name: "Ana", message, channel: "whatsapp", event_type: "direct", ...extra } }, res);
  return out;
}
function check(name, cond, out) {
  if (cond) console.log(`PASS | ${name}`);
  else { failed++; console.log(`FAIL | ${name}\n  -> ${JSON.stringify({ intent: out?.intent, handoff: out?.handoff, optin: out?.optin_promocoes, reply: out?.reply })}`); }
}

let r = await wa("Olá! Quero reservar uma mesa no Sr. Boteco");
check("reserva vinda do Instagram: recepção + conversa aberta", r.handoff && r.marcar_conversa_aberta && /nome|dia|hor[aá]rio|pessoas/i.test(r.reply) && /por aqui/.test(r.reply) && !FORB.test(r.reply), r);

r = await wa("Quero receber o cardápio e as promoções do Sr. Boteco no WhatsApp");
check("opt-in pelo link do Instagram", r.intent === "optin_promocoes" && r.optin_promocoes === "true" && r.optin_origem === "instagram_cta" && !r.handoff, r);

for (const m of ["parar", "Parar promoções", "sair", "não quero mais", "cancelar promoções"]) {
  r = await wa(m);
  check(`opt-out: "${m}"`, r.intent === "optout_promocoes" && r.optin_promocoes === "false" && !r.handoff, r);
}
r = await wa("vou sair do trabalho e passo aí");
check("frase com 'sair' no meio não é opt-out", r.intent !== "optout_promocoes", r);

r = await wa("vim do instagram");
check("recepção de quem veio do Instagram", r.intent === "recepcao_instagram" && !r.handoff, r);

r = await wa("quero falar com um atendente");
check("pedido de humano: acolhe sem dizer que direciona", r.handoff && !FORB.test(r.reply), r);

r = await wa("meu pedido veio errado");
check("reclamação: acolhe e pede detalhes", r.handoff && /aconteceu/.test(r.reply) && !FORB.test(r.reply), r);

r = await wa("quanto custa a tábua mista?");
check("informação conhecida é respondida (sem handoff)", !r.handoff && /R\$ 104,90/.test(r.reply), r);

process.env.OPENAI_API_KEY = "test-key";
aiText = "Claro, Ana! Vou te direcionar para a nossa equipe, que vai te atender pelo botão abaixo.";
r = await wa("quero falar com alguém");
check("IA desobediente é barrada (direcionar/equipe/botão)", !FORB.test(r.reply) && r.reply.length > 10, r);
aiText = null;
delete process.env.OPENAI_API_KEY;

const sweep = ["oi", "boa noite", "tem pizza?", "tem música ao vivo?", "quero fazer um orçamento pra 40 pessoas", "vocês entregam?", "qual o endereço?",
  "tem estacionamento?", "aceita vale refeição?", "horário de domingo?", "promoção de chopp", "tem feijoada?", "cardápio", "quero pedir", "cancelar meu pedido",
  "quero um estorno", "tem mesa pra hoje?", "aniversário de 15 pessoas sábado", "vocês fazem marmitas?", "tem almoço executivo?", "valeu", "5", "avaliar"];
let bad = [];
for (const m of sweep) { const x = await wa(m); if (FORB.test(x.reply) || !x.reply) bad.push(`${m} => ${x.reply}`); }
check(`varredura de ${sweep.length} mensagens sem frases proibidas`, bad.length === 0, { reply: bad.join(" || ") });

const old = new Date(Date.now() - 13 * 3600 * 1000).toISOString();
r = await wa("oi", { atendimento_humano: "true", atendimento_humano_em: old });
check("pausa humana expira após 12h", r.intent !== "humano_ativo", r);
r = await wa("oi", { atendimento_humano: "true", atendimento_humano_em: new Date().toISOString() });
check("pausa humana recente mantém o bot em silêncio", r.intent === "humano_ativo" && r.reply === "", r);
r = await wa("oi", { atendimento_humano: "true" });
check("pausa humana sem data continua valendo", r.intent === "humano_ativo", r);

if (failed) { console.log(`${failed} teste(s) de recepção WhatsApp falharam`); process.exit(1); }
console.log("Recepção WhatsApp v2.11.2: todos os testes passaram");
