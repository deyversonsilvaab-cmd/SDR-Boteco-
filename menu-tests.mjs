import { readFile } from "node:fs/promises";
import handler from "./api/manychat.js";

const knowledge = JSON.parse(await readFile(new URL("./data/knowledge.json", import.meta.url), "utf8"));
const MENU = "https://botequimpatiolimeira.saipos.com/home?utm_id=97757_v0_s00_e0_tv0";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function makeRes() {
  return { statusCode: null, payload: null, setHeader(){}, status(c){this.statusCode=c;return this;}, json(p){this.payload=p;return p;}, end(){} };
}
async function ask(message, extra = {}) {
  const res = makeRes();
  await handler({ method: "POST", headers: {}, query: {}, body: { message, first_name: "Teste", subscriber_id: "menu-test", ...extra } }, res);
  return res.payload;
}

let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`PASS | ${name}`); }
  catch (e) { failed++; console.error(`FAIL | ${name} | ${e.message}`); }
}

await test("Base possui 122 itens do cardápio atual", async () => {
  assert(Array.isArray(knowledge.catalogo), "catalogo ausente");
  assert(knowledge.catalogo.length === 122, `itens=${knowledge.catalogo.length}`);
  assert(knowledge._meta?.itens_catalogados === 122, `meta=${knowledge._meta?.itens_catalogados}`);
});

await test("IDs únicos, categorias válidas e preços formatados", async () => {
  const ids = new Set();
  const categories = new Set(knowledge.categorias_cardapio || []);
  for (const item of knowledge.catalogo) {
    assert(item.id && !ids.has(item.id), `id duplicado/ausente: ${item.id}`);
    ids.add(item.id);
    assert(categories.has(item.categoria), `categoria órfã: ${item.categoria}`);
    assert(/^R\$ \d{1,3}(?:\.\d{3})*,\d{2}$/.test(item.valor || ""), `preço inválido ${item.id}: ${item.valor}`);
  }
});

await test("Categorias têm a contagem esperada", async () => {
  const expected = { "Aperitivos":6,"Tira Gosto":6,"Porções":23,"Pratos Kids":2,"Burguer Sr. Boteco":3,"Sobremesas":3,"À la carte":12,"Adicionais":12,"Executivos":19,"Chopps":5,"Cervejas":2,"Caipirinhas":4,"Doses":7,"Sucos":9,"Bebidas sem álcool":9 };
  for (const [cat, count] of Object.entries(expected)) {
    const got = knowledge.catalogo.filter((i) => i.categoria === cat).length;
    assert(got === count, `${cat}: ${got} != ${count}`);
  }
});

await test("Link oficial atualizado com UTM", async () => {
  assert(knowledge.links?.cardapio_pedido === MENU, knowledge.links?.cardapio_pedido);
});

await test("Itens antigos fora do cardápio não permanecem no catálogo", async () => {
  const raw = JSON.stringify(knowledge.catalogo).toLowerCase();
  for (const stale of ["fondue salgado", "bisteca", "frango power", "chopp brahma", "chopp ashby"]) {
    assert(!raw.includes(stale), `item antigo presente: ${stale}`);
  }
});

await test("kibe corrige para Quibe Frito e responde preço", async () => {
  const p = await ask("qual o valor do kibe");
  assert(p.intent === "item_cardapio", p.intent);
  assert(p.topic === "porcao_quibe_frito", p.topic);
  assert(p.reply.includes("Você quis dizer Quibe Frito?"), p.reply);
  assert(p.reply.includes("R$ 40,90"), p.reply);
});

await test("lanche retorna as 3 opções de Burguer", async () => {
  const p = await ask("qual o valor do lanche");
  assert(p.intent === "categoria_cardapio", p.intent);
  for (const value of ["R$ 29,90","R$ 33,90","R$ 39,90"]) assert(p.reply.includes(value), p.reply);
});

await test("erro bruxeta encontra Brusqueta", async () => {
  const p = await ask("quanto custa a bruxeta");
  assert(p.topic === "porcao_brusqueta", p.topic);
  assert(p.reply.includes("Brusqueta"), p.reply);
  assert(p.reply.includes("R$ 31,90"), p.reply);
});

await test("termo genérico picanha lista opções sem escolher uma arbitrariamente", async () => {
  const p = await ask("qual valor da picanha");
  assert(p.intent === "opcoes_cardapio", p.intent);
  assert(p.reply.includes("Picanha - Executivo — R$ 62,90"), p.reply);
  assert(p.reply.includes("Tiras de Picanha — R$ 53,40"), p.reply);
});

await test("batata frita lista meia, inteira e adicional", async () => {
  const p = await ask("qual valor da batata frita");
  assert(p.intent === "opcoes_cardapio", p.intent);
  for (const value of ["R$ 13,90","R$ 43,90","R$ 91,90"]) assert(p.reply.includes(value), p.reply);
});

await test("suco genérico lista categoria; suco de laranja dá preço específico", async () => {
  const group = await ask("quais opções de suco");
  assert(group.intent === "categoria_cardapio", group.intent);
  assert(group.reply.includes("Suco de Kiwi (500ml) — R$ 26,00"), group.reply);
  const item = await ask("qual o preço do suco de laranja");
  assert(item.intent === "item_cardapio", item.intent);
  assert(item.reply.includes("R$ 11,30"), item.reply);
});

await test("chopp genérico lista opções atuais; Brahma antigo não é inventado", async () => {
  const group = await ask("qual valor do chopp");
  assert(group.intent === "categoria_cardapio", group.intent);
  assert(group.reply.includes("Caneca Pequena (340ml) — R$ 13,90"), group.reply);
  assert(group.reply.includes("Canecão (1200ml) — R$ 39,90"), group.reply);
  const stale = await ask("qual valor do chopp Brahma");
  assert(stale.intent === "item_nao_encontrado", stale.intent);
  assert(!stale.reply.toLowerCase().includes("brahma —"), stale.reply);
});

await test("Executivos retornam lista completa e Instagram divide sem perder conteúdo", async () => {
  const p = await ask("quais os executivos");
  assert(p.intent === "categoria_cardapio", p.intent);
  assert(p.reply.includes("Contrafilé — R$ 43,90"), p.reply);
  assert(p.reply.includes("Picanha - Executivo — R$ 62,90"), p.reply);
  assert(Array.isArray(p.messages) && p.messages.length >= 1 && p.messages.length <= 3, `messages=${p.messages?.length}`);
});

if (failed) {
  console.error(`\n${failed} teste(s) de cardápio falharam.`);
  process.exit(1);
}
console.log("\nTodos os testes de cardápio e aproximação passaram.");
