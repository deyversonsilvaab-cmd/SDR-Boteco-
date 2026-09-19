import handler from "./api/manychat.js";

const MENU = "https://botequimpatiolimeira.saipos.com/home?utm_id=97757_v0_s00_e0_tv0";
const WA = "https://wa.me/5519997858351";
const RH = "https://wa.me/5517996022567";
const MAPS = "https://maps.app.goo.gl/sr7PgRhUxaNuzg8e8";
const IFOOD = "https://www.ifood.com.br/delivery/limeira-sp/sr-boteco-shopping-patio-limeita-centro/c318d733-afe4-4098-80af-296be4eb0c72";
const FOOD99 = "https://99app.com/99food/food/";

function makeRes() {
  return { statusCode:null, payload:null, setHeader(){}, status(c){this.statusCode=c;return this;}, json(p){this.payload=p;return p;}, end(){} };
}
async function ask(message, extra = {}) {
  const res = makeRes();
  await handler({ method:"POST", headers:{}, query:{}, body:{ message, first_name:"Teste", subscriber_id:"cta-test", channel:"instagram", ...extra } }, res);
  return res.payload;
}
function assert(condition, message) { if (!condition) throw new Error(message); }
let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`PASS | ${name}`); }
  catch (e) { failed++; console.error(`FAIL | ${name} | ${e.message}`); }
}

await test("cardápio usa CTA Cardápio e remove URL do texto", async () => {
  const p = await ask("Oi quero o cardápio");
  assert(p.intent === "cardapio", p.intent);
  assert(p.cta_type === "cardapio", p.cta_type);
  assert(p.cta_label === "Cardápio", p.cta_label);
  assert(p.cta_url === MENU, p.cta_url);
  assert(!String(p.reply).includes(MENU), p.reply);
  assert(!String(p.reply).includes(WA), p.reply);
});

await test("pedido usa CTA Fazer pedido", async () => {
  const p = await ask("Quero pedir");
  assert(p.intent === "pedido", p.intent);
  assert(p.cta_type === "pedido", p.cta_type);
  assert(p.cta_label === "Fazer pedido", p.cta_label);
  assert(p.cta_url === MENU, p.cta_url);
  assert(!String(p.reply).includes(MENU), p.reply);
});

await test("item/categoria usa CTA Cardápio sem URL no texto", async () => {
  const p = await ask("Lanche ?");
  assert(p.intent === "categoria_cardapio", p.intent);
  assert(p.cta_type === "cardapio", p.cta_type);
  assert(p.cta_url === MENU, p.cta_url);
  assert(String(p.reply).includes("Burguer Salada"), p.reply);
  assert(!String(p.reply).includes(MENU), p.reply);
});

await test("item inexistente lista categorias e usa CTA Cardápio", async () => {
  const p = await ask("qual o valor da pizza?");
  assert(p.intent === "cardapio_categorias", p.intent);
  assert(p.cta_type === "cardapio", p.cta_type);
  assert(String(p.reply).includes("• Aperitivos"), p.reply);
  assert(!String(p.reply).includes(MENU), p.reply);
});

await test("localização usa novo Google Maps e não exibe URL no texto", async () => {
  const p = await ask("Endereço");
  assert(p.intent === "localizacao", p.intent);
  assert(p.cta_type === "localizacao", p.cta_type);
  assert(p.cta_label === "Como chegar", p.cta_label);
  assert(p.cta_url === MAPS, p.cta_url);
  assert(p.localizacao_link === MAPS, p.localizacao_link);
  assert(String(p.reply).includes("Pátio Limeira Shopping"), p.reply);
  assert(!String(p.reply).includes(MAPS), p.reply);
  assert(!String(p.reply).includes(WA), p.reply);
});

await test("promoção de chopp usa CTA Como chegar", async () => {
  const p = await ask("Promoção de chopp");
  assert(p.intent === "promocao_chopp", p.intent);
  assert(p.cta_type === "localizacao", p.cta_type);
  assert(p.cta_label === "Como chegar", p.cta_label);
  assert(p.cta_url === MAPS, p.cta_url);
  assert(String(p.reply).includes("R$ 3,99"), p.reply);
  assert(!String(p.reply).includes(MAPS), p.reply);
});

await test("promoção genérica reúne ofertas e não força um CTA único", async () => {
  const p = await ask("Quais promoções tem?");
  assert(p.intent === "promocoes_ativas", p.intent);
  assert(p.cta_count === 0, JSON.stringify(p.ctas));
  assert(String(p.reply).includes("Burger em Dobro"), p.reply);
  assert(String(p.reply).includes("Promoção de Chopp"), p.reply);
});

await test("delivery usa três CTAs e não expõe URLs no texto", async () => {
  const p = await ask("Entrega ?");
  const reply = String(p.reply || "");
  assert(p.intent === "delivery", p.intent);
  assert(p.cta_count === 3, JSON.stringify(p.ctas));
  assert(p.cta_1_label === "Pedido direto" && p.cta_1_url === MENU, JSON.stringify(p.ctas));
  assert(p.cta_2_label === "iFood" && p.cta_2_url === IFOOD, JSON.stringify(p.ctas));
  assert(p.cta_3_label === "99Food" && p.cta_3_url === FOOD99, JSON.stringify(p.ctas));
  for (const url of [MENU, IFOOD, FOOD99, WA]) assert(!reply.includes(url), reply);
});

await test("atendente usa CTA WhatsApp e remove URL do texto", async () => {
  const p = await ask("quero falar com atendente");
  assert(p.intent === "humano", p.intent);
  assert(p.cta_type === "whatsapp", p.cta_type);
  assert(p.cta_label === "Falar no WhatsApp", p.cta_label);
  assert(p.cta_url === WA, p.cta_url);
  assert(!String(p.reply).includes(WA), p.reply);
});

await test("vaga usa CTA RH e remove link do currículo do texto", async () => {
  const p = await ask("vaga de garçom");
  assert(p.intent === "vaga", p.intent);
  assert(p.cta_type === "rh", p.cta_type);
  assert(p.cta_label === "Enviar currículo", p.cta_label);
  assert(p.cta_url === RH, p.cta_url);
  assert(!String(p.reply).includes(RH), p.reply);
});

await test("horário não força CTA", async () => {
  const p = await ask("que horas abre?");
  assert(p.intent === "horario", p.intent);
  assert(p.cta_count === 0, `cta_count=${p.cta_count}`);
  assert(p.cta_type === "", p.cta_type);
});

await test("WhatsApp continua com link de rota no texto e sem CTA Instagram", async () => {
  const p = await ask("Endereço", { channel:"whatsapp" });
  assert(p.channel === "whatsapp", p.channel);
  assert(String(p.reply).includes(MAPS), p.reply);
  assert(p.cta_count === 0, `cta_count=${p.cta_count}`);
});

await test("comentário do Instagram preserva lógica sem CTA contextual", async () => {
  const p = await ask("Quero fazer um pedido", { event_type:"instagram_comment", comment_text:"Quero fazer um pedido" });
  assert(p.intent === "pedido", p.intent);
  assert(p.cta_count === 0, `cta_count=${p.cta_count}`);
  assert(String(p.reply).includes(MENU), p.reply);
});

await test("Dynamic Block usa somente botão contextual de localização", async () => {
  const p = await ask("Endereço", { response_mode:"dynamic_block" });
  const buttons = (p?.content?.messages || []).flatMap((m) => Array.isArray(m?.buttons) ? m.buttons : []);
  assert(buttons.length === 1, JSON.stringify(buttons));
  assert(buttons[0]?.caption === "Como chegar", JSON.stringify(buttons));
  assert(buttons[0]?.url === MAPS, JSON.stringify(buttons));
});

await test("Dynamic Block de pedido usa somente Fazer pedido", async () => {
  const p = await ask("Quero pedir", { response_mode:"dynamic_block" });
  const buttons = (p?.content?.messages || []).flatMap((m) => Array.isArray(m?.buttons) ? m.buttons : []);
  assert(buttons.length === 1, JSON.stringify(buttons));
  assert(buttons[0]?.caption === "Fazer pedido", JSON.stringify(buttons));
  assert(buttons[0]?.url === MENU, JSON.stringify(buttons));
});

await test("Dynamic Block de delivery usa Pedido direto, iFood e 99Food", async () => {
  const p = await ask("Entrega", { response_mode:"dynamic_block" });
  const buttons = (p?.content?.messages || []).flatMap((m) => Array.isArray(m?.buttons) ? m.buttons : []);
  assert(buttons.length === 3, JSON.stringify(buttons));
  assert(buttons[0]?.url === MENU, JSON.stringify(buttons));
  assert(buttons[1]?.url === IFOOD, JSON.stringify(buttons));
  assert(buttons[2]?.url === FOOD99, JSON.stringify(buttons));
});

await test("payload informa versão 2.9.0 para diagnóstico", async () => {
  const p = await ask("Oi");
  assert(p.app_version === "2.9.0", p.app_version);
});

if (failed) {
  console.error(`\n${failed} teste(s) de CTA contextual falharam.`);
  process.exit(1);
}
console.log("\nTodos os testes de CTA contextual passaram.");
