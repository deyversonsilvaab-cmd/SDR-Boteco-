import { readFile } from "node:fs/promises";
import handler from "./api/manychat.js";

const knowledge = JSON.parse(await readFile(new URL("./data/knowledge.json", import.meta.url), "utf8"));
const CAT = "Cardápio Fitness";

function assert(condition, message) { if (!condition) throw new Error(message); }
function makeRes(){ return {statusCode:null,payload:null,setHeader(){},status(c){this.statusCode=c;return this;},json(p){this.payload=p;return p;},end(){}}; }
async function ask(message, extra={}) { const res=makeRes(); await handler({method:"POST",headers:{},query:{},body:{message,first_name:"Teste",subscriber_id:"fitness-test",channel:"instagram",...extra}},res); return res.payload; }
let failed=0;
async function test(name,fn){ try{await fn();console.log(`PASS | ${name}`);}catch(e){failed++;console.error(`FAIL | ${name} | ${e.message}`);} }

await test("Cardápio Fitness possui 10 itens oficiais", async()=>{
  const items=knowledge.catalogo.filter(i=>i.categoria===CAT);
  assert(items.length===10, `fitness=${items.length}`);
  assert(knowledge.catalogo.length===141, `catalogo=${knowledge.catalogo.length}`);
  assert(knowledge.categorias_cardapio.length===17, `categorias=${knowledge.categorias_cardapio.length}`);
});

await test("Categoria fitness lista as 10 opções e preços", async()=>{
  const p=await ask("quero ver o cardápio fitness");
  assert(p.intent==="categoria_cardapio", p.intent);
  for(const value of [
    "Frango Fitness com Cabotiá — R$ 19,90",
    "Frango Fit com Ovo — R$ 22,90",
    "Bowl Fitness de Frango — R$ 24,90",
    "Tilápia Low Carb — R$ 34,90",
    "Omelete Fitness — R$ 22,90",
    "Salada Fitness com Tilápia — R$ 32,90"
  ]) assert(p.reply.includes(value), `${value} ausente em: ${p.reply}`);
});

await test("Mensagem curta Fit abre diretamente o Cardápio Fitness", async()=>{
  const p=await ask("Fit");
  assert(p.intent==="categoria_cardapio", p.intent);
  assert(p.reply.includes("Frango Fitness com Cabotiá"), p.reply);
  assert(p.reply.includes("Salada Fitness com Tilápia"), p.reply);
  assert(p.cta_type==="cardapio", p.cta_type);
});

await test("Frango Fitness com Cabotiá responde composição e preço", async()=>{
  const p=await ask("qual o valor do frango fitness com cabotia?");
  assert(p.intent==="item_cardapio", p.intent);
  assert(p.reply.includes("R$ 19,90"), p.reply);
  assert(p.reply.includes("150g de filé de frango grelhado"), p.reply);
  assert(p.reply.includes("purê de abóbora cabotiá"), p.reply);
});

await test("Tilápia Low Carb responde sem inventar horário", async()=>{
  const p=await ask("tem tilapia low carb?");
  assert(p.intent==="item_cardapio", p.intent);
  assert(p.reply.includes("R$ 34,90"), p.reply);
  assert(p.reply.includes("Sem arroz e sem fritura"), p.reply);
  assert(!/11h|15h|segunda|sexta/i.test(p.reply), `horário indevido: ${p.reply}`);
});

await test("Saladas fitness são itens consultáveis individualmente", async()=>{
  const frango=await ask("quanto custa a salada fitness com frango?");
  assert(frango.reply.includes("R$ 24,90"), frango.reply);
  const tilapia=await ask("quanto custa a salada fitness com tilapia?");
  assert(tilapia.reply.includes("R$ 32,90"), tilapia.reply);
});

await test("Todos os 10 itens fitness retornam o próprio preço", async()=>{
  const items=knowledge.catalogo.filter(i=>i.categoria===CAT);
  for(const item of items){
    const p=await ask(`qual o valor de ${item.nome}?`);
    assert(p.intent!=="cardapio_categorias", `${item.id} não foi encontrado: ${p.reply}`);
    assert(String(p.reply).includes(item.valor), `${item.id} não trouxe ${item.valor}: ${p.reply}`);
  }
});

if(failed){ console.error(`\n${failed} teste(s) Fitness falharam.`); process.exit(1); }
console.log("\nCardápio Fitness: todos os testes passaram.");
