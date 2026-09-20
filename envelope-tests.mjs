// Testes do envelope "Full Contact Data" do ManyChat (v2.9.4)
import handler from "./api/manychat.js";

let failures = 0;
const run = async (body, query = {}) => {
  const out = {};
  const res = { status(c) { out.status = c; return this; }, setHeader() {}, json(p) { out.payload = p; return this; }, end() {} };
  await handler({ method: "POST", headers: {}, body, query }, res);
  return out.payload;
};
const check = (label, ok) => { console.log(`${ok ? "PASS" : "FAIL"} | ${label}`); if (!ok) failures++; };

const contact = (last_input_text, custom_fields = {}) => ({
  channel: "instagram", event_type: "direct",
  contact: { key: "user:1", id: "1", first_name: "Teste", ig_username: "teste", last_input_text, custom_fields }
});

let p = await run(contact("Boa tarde", { ai_last_bot_reply: "Eng, Tábua Mista\n\n2 gomos \"de\" linguiça", ai_last_intent: "item_cardapio" }));
check("envelope: 'Boa tarde' com memória multilinha vira saudacao", p.intent === "saudacao");
check("envelope: nome do contato usado", p.reply.startsWith("Teste"));
check("envelope: app_version 2.9.4", p.app_version === "2.9.4");

p = await run(contact("Qurero saber sobre quibe"));
check("envelope: quibe vira item_cardapio", p.intent === "item_cardapio" && /quibe/i.test(p.reply));
check("envelope: sem URL no texto do Instagram", !/https?:\/\//.test(p.reply));

p = await run(contact("5", { avaliacao_pendente: true, ai_last_bot_reply: "De 1 a 5, que nota você dá?" }));
check("envelope: nota 5 com avaliacao_pendente=true (booleano)", p.intent === "avaliacao_nota" && String(p.avaliacao_nota) === "5" && p.cta_1_label === "Avaliar no Google");

p = await run(contact("quanto?", { ai_last_topic: "alacarte_tabua_mista" }));
check("envelope: follow-up curto usa ai_last_topic", p.intent === "item_cardapio" && /T[áa]bua Mista/i.test(p.reply));

p = await run({ channel: "whatsapp", contact: { id: "2", first_name: "Ana", last_input_text: "oi", custom_fields: { atendimento_humano: true } } });
check("envelope WhatsApp: atendimento_humano=true silencia o bot", p.intent === "humano_ativo" && p.reply === "");

p = await run({ contact: { id: "3", first_name: "Bia", last_input_text: "", custom_fields: {} } }, { event_type: "story_mention", channel: "instagram" });
check("envelope: event_type via query string (story_mention)", p.intent === "story_mention");

p = await run(contact("https://manybot-files.s3.eu-central-1.amazonaws.com/x/wa/2026/09/19/original_abc.jpeg"));
check("envelope: mídia (URL pura) vira sem_mensagem, não tenta interpretar", p.intent === "sem_mensagem");

p = await run({ subscriber_id: "4", first_name: "Caio", message: "cardápio", channel: "instagram" });
check("corpo antigo continua funcionando", p.intent === "cardapio");

console.log(failures ? `${failures} falha(s) no envelope` : "Todos os testes do envelope passaram");
process.exit(failures ? 1 : 0);
