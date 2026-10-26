// humano-tests.mjs — v2.12.0
// Cobre o modo humano (opt-in): tom, contexto, travas de fatos, validador, orçamento de tempo e retrocompatibilidade.
process.env.OPENAI_API_KEY = "";
delete process.env.HUMAN_TONE;
delete process.env.AI_BUDGET_MS;

const { default: handler } = await import("./api/manychat.js");
const H = await import("./lib/humano.js");
const { buildSystemPrompt } = await import("./lib/persona.js");

function assert(condition, message) { if (!condition) throw new Error(message); }
function makeRes() {
  return {
    statusCode: null, payload: null,
    setHeader() {}, status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return payload; }, end() {}
  };
}
async function ask(body = {}, method = "POST") {
  const res = makeRes();
  await handler({ method, headers: {}, query: {}, body: { first_name: "Teste", subscriber_id: "humano-test", channel: "instagram", ...body } }, res);
  return res.payload;
}
const humano = (body = {}) => ask({ modo_humano: true, ...body });

let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`PASS | ${name}`); }
  catch (error) { failed++; console.error(`FAIL | ${name} | ${error.message}`); }
}

// ---------- módulo lib/humano.js ----------

await test("isHumanMode: corpo liga, corpo desliga explicitamente e ambiente liga", () => {
  assert(H.isHumanMode({ modo_humano: true }, {}) === true, "true");
  assert(H.isHumanMode({ modo_humano: "true" }, {}) === true, "'true'");
  assert(H.isHumanMode({ custom_fields: { modo_humano: "sim" } }, {}) === true, "custom_fields");
  assert(H.isHumanMode({}, {}) === false, "ausente = desligado");
  assert(H.isHumanMode({}, { HUMAN_TONE: "on" }) === true, "ambiente on");
  assert(H.isHumanMode({ modo_humano: false }, { HUMAN_TONE: "on" }) === false, "corpo false vence ambiente");
  assert(H.isHumanMode({ modo_humano: "{{modo_humano}}" }, {}) === false, "placeholder literal não liga");
});

await test("saudacaoHorario usa o fuso de São Paulo", () => {
  const at = (iso) => H.saudacaoHorario(new Date(iso));
  assert(at("2026-10-26T07:59:00Z") === "boa noite", "04h59 SP");
  assert(at("2026-10-26T08:00:00Z") === "bom dia", "05h00 SP");
  assert(at("2026-10-26T14:59:00Z") === "bom dia", "11h59 SP");
  assert(at("2026-10-26T15:00:00Z") === "boa tarde", "12h00 SP");
  assert(at("2026-10-26T20:59:00Z") === "boa tarde", "17h59 SP");
  assert(at("2026-10-26T21:00:00Z") === "boa noite", "18h00 SP");
  assert(at("2026-10-27T02:00:00Z") === "boa noite", "23h SP");
});

await test("saudacaoDoCliente devolve o cumprimento que o cliente usou", () => {
  assert(H.saudacaoDoCliente("Boa noite, tudo bem?") === "boa noite", "noite");
  assert(H.saudacaoDoCliente("BOM DIA") === "bom dia", "dia");
  assert(H.saudacaoDoCliente("oi") === "", "oi");
});

await test("isRetornante: menos de 24 h, vazio, inválido e data futura", () => {
  const now = new Date("2026-10-26T15:00:00Z");
  assert(H.isRetornante("2026-10-26T14:00:00Z", now) === true, "1 h");
  assert(H.isRetornante("2026-10-25T14:00:00Z", now) === false, "25 h");
  assert(H.isRetornante("", now) === false, "vazio");
  assert(H.isRetornante(undefined, now) === false, "ausente");
  assert(H.isRetornante("não é data", now) === false, "inválido");
  assert(H.isRetornante("2026-10-27T15:00:00Z", now) === false, "futuro");
});

await test("tomCliente classifica irritado, formal, curto e informal", () => {
  assert(H.tomCliente("vcs são robô? que saco") === "irritado", "saco");
  assert(H.tomCliente("QUE ABSURDO ISSO") === "irritado", "caixa alta");
  assert(H.tomCliente("Boa noite, gostaria de saber o valor do executivo") === "formal", "formal");
  assert(H.tomCliente("valor?") === "curto", "curto");
  assert(H.tomCliente("") === "curto", "vazio");
  assert(H.tomCliente("vcs tem chopp gelado hoje lá") === "informal", "informal");
});

await test("buildResumo: extrai pessoas, dia e hora, mantém o que já existia e respeita 300 caracteres", () => {
  const r1 = H.buildResumo("", { intent: "reserva", topic: "reserva", message: "queria reservar pra 4 pessoas sábado às 19h" });
  assert(/pessoas=4/.test(r1) && /dia=sabado/.test(r1) && /hora=19h/.test(r1) && /ult=reserva/.test(r1), r1);
  const r2 = H.buildResumo(r1, { intent: "horario", topic: "horario", message: "qual horário vocês abrem" });
  assert(/pessoas=4/.test(r2) && /dia=sabado/.test(r2) && /ult=horario/.test(r2), r2);
  const lixo = H.buildResumo("ult=" + "x".repeat(500) + "; pessoas=2", { intent: "a", topic: "b", message: "" });
  assert(lixo.length <= 300, String(lixo.length));
  assert(!/[<>{}]/.test(r1), "sem caracteres perigosos");
});

await test("validateHumanReply rejeita frase de central, emoji demais, linhas demais, nome repetido e mesma abertura", () => {
  const ok = (r, o = {}) => H.validateHumanReply(r, { channel: "instagram", firstName: "Ana", lastBotReply: "", ...o });
  assert(ok("Tem sim! Chopp a partir de R$ 9,90.").ok, "resposta boa");
  assert(ok("Olá! Seja bem-vindo ao Sr. Boteco!").reasons.includes("frase_bloqueada"), "bem-vindo");
  assert(ok("Fico à disposição para o que precisar.").reasons.includes("frase_bloqueada"), "disposição");
  assert(ok("Claro! Posso ajudar.").reasons.includes("frase_bloqueada"), "claro!");
  assert(ok("Bora 😄🍺").reasons.includes("emoji_demais"), "2 emojis");
  assert(ok("a\nb\nc\nd\ne").reasons.includes("linhas_demais"), "5 linhas");
  assert(ok("• a\n• b\n• c\n• d\n• e\n• f").ok, "lista de itens não é cortada");
  assert(ok("Ana, oi Ana, tudo bem?").reasons.includes("nome_repetido"), "nome 2x");
  assert(ok("Tem sim, olha só.", { lastBotReply: "Tem chopp gelado." }).reasons.includes("mesma_abertura"), "mesma abertura");
  assert(ok("Opa, tem sim.", { lastBotReply: "Tem chopp gelado." }).ok, "abertura diferente");
});

await test("preservesFacts: números e URLs precisam ser idênticos", () => {
  assert(H.preservesFacts("Das 11h às 22h. R$ 9,90", "Todo dia, das 11h às 22h. R$ 9,90"), "igual");
  assert(!H.preservesFacts("R$ 9,90", "R$ 9,00"), "preço mudou");
  assert(!H.preservesFacts("Das 11h às 22h", "Das 11h às 23h"), "hora mudou");
  assert(!H.preservesFacts("veja https://a.com", "veja https://b.com"), "url mudou");
});

await test("pickVariant não abre igual à última resposta e é determinístico", () => {
  const pool = ["Opa, pode falar.", "Oi de novo! Me diz aí.", "Fala, o que você precisa?"];
  assert(H.pickVariant(pool, "x") === H.pickVariant(pool, "x"), "determinístico");
  for (let i = 0; i < 30; i++) {
    const v = H.pickVariant(pool, `seed-${i}`, "Opa, tudo certo?");
    assert(!/^Opa/.test(v), `repetiu abertura: ${v}`);
  }
});

await test("humanizeFixedReply nunca altera número nem URL, em 60 sementes", () => {
  const casos = [
    ["promocao_chopp", "Nossa promoção de chopp funciona assim\n• Todos os dias: chopp a partir de R$ 9,90.\n• Sábado e domingo, das 16h às 20h: caneca de 340 ml por R$ 3,99.\nConsultar disponibilidade no local."],
    ["promocao_burger", "Toda terça-feira, a partir das 16h, tem Burger em Dobro: você paga 1 e leva 2 do mesmo burger.\nA oferta vale para os burgers cadastrados no cardápio."],
    ["localizacao", "Ficamos no Pátio Limeira Shopping: R. Carlos Gomes, 1321 - Centro, Limeira - SP."],
    ["horario", "Funcionamos todos os dias das 11h às 22h."],
    ["item_cardapio", "Burguer Bacon\n\nPão brioche, molho especial, hambúrguer 160g, queijo cheddar, bacon, alface e tomate.\n\nValor: R$ 33,90"],
    ["saudacao", "Que bom falar com você. Posso te ajudar com cardápio."],
    ["despedida", "Foi um prazer te atender."],
    ["sem_mensagem", "Quero te ajudar sem te passar nada errado."],
    ["outro", "Quero te passar a informação certa."]
  ];
  for (const [intent, reply] of casos) {
    for (let i = 0; i < 60; i++) {
      const out = H.humanizeFixedReply({ reply, intent, seed: `s${i}`, firstName: "Ana", saudacao: "boa noite" });
      assert(H.preservesFacts(reply, out), `${intent} alterou fatos: ${out}`);
      assert(out.trim().length > 0, `${intent} vazio`);
      assert(!/\{\{|undefined|null/.test(out), `${intent} placeholder: ${out}`);
    }
  }
});

await test("item com dois valores (tamanhos) não é reescrito", () => {
  const original = "Porção\n\nDescrição.\n\nValor: R$ 10,00\n\nValor: R$ 20,00";
  assert(H.humanizeFixedReply({ reply: original, intent: "item_cardapio", seed: "a" }) === original, "manteve o original");
});

await test("persona: camada humana só entra com humano=true e o prompt antigo fica idêntico", () => {
  const antigo = buildSystemPrompt({ channel: "instagram" });
  const novo = buildSystemPrompt({ channel: "instagram", humano: true });
  assert(!antigo.includes("CAMADA HUMANA"), "antigo sem camada");
  assert(novo.includes("CAMADA HUMANA") && novo.includes("EXEMPLOS DE TOM"), "novo com camada");
  assert(novo.includes("no máximo uma vez"), "regra de nome trocada");
  assert(novo.includes("fatos_para_esta_resposta"), "regras de fatos preservadas");
  assert(novo.includes('{"reply":"texto"}'), "contrato JSON preservado");
  const wa = buildSystemPrompt({ channel: "whatsapp", humano: true });
  assert(wa.includes("NUNCA diga que vai direcionar"), "regras de WhatsApp preservadas");
});

// ---------- webhook ----------

await test("retrocompatibilidade: sem modo_humano a resposta continua como na v2.11.2", async () => {
  const p = await ask({ message: "tem chopp em promoção?" });
  assert(/^Teste, Nossa promoção de chopp funciona assim/.test(p.reply), p.reply);
  assert(p.modo_humano === undefined && p.ai_resumo === undefined, "sem campos novos");
});

await test("humano: promoção de chopp mantém todos os fatos, sem nome na frente e sem URL", async () => {
  const p = await humano({ message: "tem chopp em promoção?" });
  const r = p.reply;
  for (const f of ["R$ 9,90", "R$ 3,99", "16h", "20h", "340 ml", "disponibilidade"]) assert(r.includes(f), `faltou ${f}: ${r}`);
  assert(!/Nossa promoção de chopp funciona assim/.test(r), r);
  assert(!/^Teste,/.test(r), r);
  assert(!/https?:\/\//.test(r), r);
  assert(p.intent === "promocao_chopp" && p.cta_type === "reserva", `${p.intent} ${p.cta_type}`);
});

await test("humano: nome do cliente não vira prefixo em horário, localização e burger", async () => {
  for (const message of ["qual horario", "onde fica vcs", "promoção de burger"]) {
    const p = await humano({ message });
    assert(!/^Teste,/.test(p.reply), `${message} => ${p.reply}`);
  }
});

await test("humano: horário e endereço seguem corretos", async () => {
  const h = await humano({ message: "qual horario" });
  assert(/11h/.test(h.reply) && /22h/.test(h.reply), h.reply);
  const l = await humano({ message: "onde fica vcs" });
  assert(/Carlos Gomes, 1321/.test(l.reply) && /Pátio Limeira Shopping/.test(l.reply), l.reply);
  assert(l.cta_type === "localizacao", l.cta_type);
});

await test("humano: preço de item continua o do catálogo e muda só a forma", async () => {
  const p = await humano({ message: "quanto é o burguer bacon" });
  assert(p.intent === "item_cardapio", p.intent);
  assert(p.reply.includes("R$ 33,90"), p.reply);
  assert(/sai por R\$ 33,90/.test(p.reply), p.reply);
});

await test("humano: saudação espelha o cumprimento do cliente e usa o nome uma vez", async () => {
  const p = await humano({ message: "Boa noite" });
  assert(/^Boa noite, Teste!/.test(p.reply), p.reply);
  assert((p.reply.match(/Teste/g) || []).length === 1, p.reply);
  assert(p.saudacao_horario === "boa noite", p.saudacao_horario);
});

await test("humano: cliente que voltou há menos de 24 h não é cumprimentado de novo", async () => {
  const umaHoraAtras = new Date(Date.now() - 3600 * 1000).toISOString();
  const p = await humano({ message: "oi", ai_ultima_interacao: umaHoraAtras });
  assert(p.retornante === true, String(p.retornante));
  assert(!/bom dia|boa tarde|boa noite/i.test(p.reply), p.reply);
  assert(!/Teste/.test(p.reply), p.reply);
});

await test("humano: não repete a abertura da última resposta do bot", async () => {
  for (let i = 0; i < 12; i++) {
    const p = await humano({ message: "tchau", subscriber_id: `u${i}`, last_bot_reply: "Foi um prazer, volte sempre." });
    assert(!/^Foi/.test(p.reply), p.reply);
  }
});

await test("humano: payload devolve estado novo (resumo, última interação, tom)", async () => {
  const p = await humano({ message: "queria reservar pra 4 pessoas sábado às 19h" });
  assert(p.modo_humano === true, "flag");
  assert(/pessoas=4/.test(p.ai_resumo) && /dia=sabado/.test(p.ai_resumo), p.ai_resumo);
  assert(p.ai_resumo.length <= 300, "limite do resumo");
  const t = Date.parse(p.ai_ultima_interacao);
  assert(Number.isFinite(t) && Math.abs(Date.now() - t) < 5000, p.ai_ultima_interacao);
  assert(["irritado", "formal", "curto", "informal"].includes(p.tom_cliente), p.tom_cliente);
  const seguinte = await humano({ message: "qual horário vocês abrem", ai_resumo: p.ai_resumo });
  assert(/pessoas=4/.test(seguinte.ai_resumo), seguinte.ai_resumo);
});

await test("humano: mensagem sem texto no Instagram não manda link nem o texto antigo", async () => {
  const p = await humano({ message: "" });
  assert(p.reply && !/https?:\/\//.test(p.reply), p.reply);
  assert(!/Quero te ajudar sem te passar nada errado/.test(p.reply), p.reply);
  assert(p.cta_type === "whatsapp", p.cta_type);
});

await test("humano: mensagem sem texto no WhatsApp não responde e deixa a conversa aberta", async () => {
  const p = await humano({ channel: "whatsapp", message: "", first_name: "{{first_name}}" });
  assert(p.reply === "" && Array.isArray(p.messages) && p.messages.length === 0, JSON.stringify(p.messages));
  assert(p.handoff === true && p.marcar_conversa_aberta === true && p.next_action === "handoff_humano", JSON.stringify({ h: p.handoff, n: p.next_action }));
  assert(p.cta_count === 0, "sem botão");
});

await test("humano: WhatsApp com texto segue sem URL no corpo", async () => {
  const p = await humano({ channel: "whatsapp", message: "oi" });
  assert(p.reply && !/https?:\/\//.test(p.reply), p.reply);
});

await test("HUMAN_TONE=on liga o modo e modo_humano=false desliga", async () => {
  process.env.HUMAN_TONE = "on";
  try {
    const ligado = await ask({ message: "qual horario" });
    assert(ligado.modo_humano === true, "ambiente liga");
    const desligado = await ask({ message: "qual horario", modo_humano: false });
    assert(desligado.modo_humano === undefined && /^Teste, /.test(desligado.reply), desligado.reply);
  } finally { delete process.env.HUMAN_TONE; }
});

await test("health informa o modo do ambiente e o orçamento da IA", async () => {
  const p = await ask({}, "GET");
  assert(p.version === "2.12.0" && p.modo_humano_ambiente === false && p.ai_budget_ms === 6500, JSON.stringify(p));
});

await test("humano WhatsApp: promoção de chopp com forma nova, mesmos fatos, sem URL e sem botão", async () => {
  const p = await humano({ channel: "whatsapp", message: "tem chopp em promoção?" });
  for (const f of ["R$ 9,90", "R$ 3,99", "16h", "20h", "340 ml", "disponibilidade"]) assert(p.reply.includes(f), `faltou ${f}: ${p.reply}`);
  assert(!/Nossa promoção de chopp funciona assim/.test(p.reply), p.reply);
  assert(!/https?:\/\//.test(p.reply) && p.cta_count === 0, p.reply);
});

await test("humano WhatsApp: promoção de burger não deixa o rótulo solto 'Cardápio completo/pedido'", async () => {
  const legado = await ask({ channel: "whatsapp", message: "promoção de burger" });
  assert(/Cardápio completo\/pedido/.test(legado.reply), "o legado tem o rótulo solto (referência)");
  const p = await humano({ channel: "whatsapp", message: "promoção de burger" });
  assert(!/Cardápio completo\/pedido/.test(p.reply), p.reply);
  assert(p.reply.includes("R$ 33,90") && p.reply.includes("16h"), p.reply);
});

await test("humano WhatsApp: horário, endereço e preço de item mantêm os fatos", async () => {
  const h = await humano({ channel: "whatsapp", message: "qual horario" });
  assert(/11h/.test(h.reply) && /22h/.test(h.reply), h.reply);
  const l = await humano({ channel: "whatsapp", message: "onde fica vcs" });
  assert(/Carlos Gomes, 1321/.test(l.reply) && l.cta_type === "localizacao", l.reply);
  const i = await humano({ channel: "whatsapp", message: "quanto é o burguer bacon" });
  assert(/sai por R\$ 33,90/.test(i.reply) && !/https?:\/\//.test(i.reply), i.reply);
});

await test("humano WhatsApp: recepção, reclamação e reserva ficam idênticas à v2.11.2", async () => {
  for (const message of ["oi", "quero fazer uma reclamação, o atendimento foi péssimo", "quero reservar uma mesa"]) {
    const a = await ask({ channel: "whatsapp", message });
    const b = await humano({ channel: "whatsapp", message });
    assert(a.reply === b.reply, `${message}\n legado: ${a.reply}\n humano: ${b.reply}`);
    assert(a.handoff === b.handoff && a.cta_count === b.cta_count, `${message} handoff/cta divergiram`);
  }
});

// ---------- IA simulada ----------

const realFetch = globalThis.fetch;
function mockAI(replyText) {
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ output_text: JSON.stringify({ reply: replyText }) }), text: async () => "" });
}
async function withAI(fn) {
  process.env.OPENAI_API_KEY = "teste";
  try { await fn(); } finally { globalThis.fetch = realFetch; process.env.OPENAI_API_KEY = ""; delete process.env.AI_BUDGET_MS; }
}

await test("humano: resposta da IA com frase de central é descartada e vale a versão determinística", () => withAI(async () => {
  mockAI("Olá! Seja bem-vindo ao Sr. Boteco! Como posso ajudar hoje?");
  const p = await humano({ message: "Boa noite" });
  assert(!/bem-vind|ajudar hoje/i.test(p.reply), p.reply);
  assert(/^Boa noite/.test(p.reply), p.reply);
}));

await test("humano: resposta boa da IA passa, sem nome na frente", () => withAI(async () => {
  mockAI("Boa noite! Me conta o que você procura.");
  const p = await humano({ message: "Boa noite" });
  assert(p.reply === "Boa noite! Me conta o que você procura.", p.reply);
}));

await test("orçamento de tempo: IA travada não segura a resposta nem dispara segunda tentativa", () => withAI(async () => {
  let chamadas = 0;
  globalThis.fetch = (url, opts) => new Promise((_, reject) => {
    chamadas++;
    opts.signal.addEventListener("abort", () => reject(new Error("abortado")));
  });
  process.env.AI_BUDGET_MS = "1500";
  const t0 = Date.now();
  const p = await humano({ message: "oi" });
  const ms = Date.now() - t0;
  assert(ms < 3000, `demorou ${ms} ms`);
  assert(chamadas === 1, `chamadas=${chamadas}`);
  assert(p.reply && p.reply.length > 5, "respondeu com texto determinístico");
}));

await test("orçamento de tempo também vale sem modo humano", () => withAI(async () => {
  let chamadas = 0;
  globalThis.fetch = (url, opts) => new Promise((_, reject) => {
    chamadas++;
    opts.signal.addEventListener("abort", () => reject(new Error("abortado")));
  });
  process.env.AI_BUDGET_MS = "1500";
  const t0 = Date.now();
  const p = await ask({ message: "oi" });
  assert(Date.now() - t0 < 3000 && chamadas === 1 && p.reply, `chamadas=${chamadas}`);
}));

if (failed) {
  console.error(`\nModo humano v2.12.0: ${failed} teste(s) falharam.`);
  process.exit(1);
}
console.log("\nModo humano v2.12.0: todos os testes passaram.");
