import handler from "./api/manychat.js";

const MENU = "https://botequimpatiolimeira.saipos.com/home?utm_id=97757_v0_s00_e0_tv0";
const WA = "https://wa.me/5519997858351";
const IFOOD = "https://www.ifood.com.br/delivery/limeira-sp/sr-boteco-shopping-patio-limeita-centro/c318d733-afe4-4098-80af-296be4eb0c72";
const FOOD99 = "https://oia.99app.com/dlp9/bSSJXQ?area=BR";

function makeRes() {
  return { statusCode:null, payload:null, setHeader(){}, status(c){this.statusCode=c;return this;}, json(p){this.payload=p;return p;}, end(){} };
}
async function ask(message, extra = {}) {
  const res = makeRes();
  await handler({ method:"POST", headers:{}, query:{}, body:{ message, first_name:"Teste", subscriber_id:"button-links-test", channel:"instagram", ...extra } }, res);
  return res.payload;
}
function assert(condition, message) { if (!condition) throw new Error(message); }
let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`PASS | ${name}`); }
  catch (e) { failed++; console.error(`FAIL | ${name} | ${e.message}`); }
}

await test("DM Instagram remove cardápio e WhatsApp do texto, mas preserva campos", async () => {
  const p = await ask("Queria o cardápio");
  assert(!String(p.reply).includes(MENU), p.reply);
  assert(!String(p.reply).includes(WA), p.reply);
  assert(p.cardapio_link === MENU, `cardapio_link=${p.cardapio_link}`);
  assert(p.whatsapp_link === WA, `whatsapp_link=${p.whatsapp_link}`);
});

await test("Delivery no Instagram esconde todos os links de ação no texto", async () => {
  const p = await ask("vocês fazem entrega?");
  const reply = String(p.reply || "");
  for (const url of [MENU, WA, IFOOD, FOOD99]) assert(!reply.includes(url), reply);
  assert(p.cta_count===3, JSON.stringify(p.ctas));
  assert(p.cta_1_url===MENU, p.cta_1_url);
  assert(p.cta_2_url===IFOOD, p.cta_2_url);
  assert(p.cta_3_url===FOOD99, p.cta_3_url);
});

await test("Item não encontrado no Instagram não exibe link do cardápio no texto", async () => {
  const p = await ask("qual o valor da pizza?");
  const reply = String(p.reply || "");
  assert(p.intent === "cardapio_categorias", p.intent);
  assert(reply.includes("• Aperitivos") && reply.includes("• Bebidas sem álcool"), reply);
  assert(!reply.includes(MENU), reply);
  assert(!reply.includes(WA), reply);
});

await test("Pedido de atendente no Instagram remove URL do WhatsApp do texto", async () => {
  const p = await ask("quero falar com atendente");
  const reply = String(p.reply || "");
  assert(p.intent === "humano", p.intent);
  assert(!reply.includes(WA), reply);
  assert(p.whatsapp_link === WA, p.whatsapp_link);
});

await test("Canal WhatsApp não é afetado e mantém link de cardápio no texto", async () => {
  const p = await ask("Queria o cardápio", { channel:"whatsapp" });
  assert(String(p.reply).includes(MENU), p.reply);
  assert(p.channel === "whatsapp", p.channel);
});

await test("Instagram comment não é afetado pela limpeza de links", async () => {
  const p = await ask("Quero fazer um pedido", { event_type:"instagram_comment", comment_text:"Quero fazer um pedido" });
  assert(String(p.reply).includes(MENU), p.reply);
  assert(p.intent === "pedido", p.intent);
});

await test("Dynamic Block recebe texto limpo e botão de cardápio continua disponível", async () => {
  const p = await ask("Queria o cardápio", { response_mode:"dynamic_block" });
  const texts = (p?.content?.messages || []).map((m) => String(m?.text || "")).join("\n");
  const buttons = (p?.content?.messages || []).flatMap((m) => Array.isArray(m?.buttons) ? m.buttons : []);
  assert(!texts.includes(MENU), texts);
  assert(!texts.includes(WA), texts);
  assert(buttons.some((b) => b?.url === MENU), JSON.stringify(buttons));
});

if (failed) {
  console.error(`\n${failed} teste(s) de links/botões falharam.`);
  process.exit(1);
}
console.log("\nTodos os testes de links/botões passaram.");
