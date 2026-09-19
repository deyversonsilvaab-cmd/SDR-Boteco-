import { readFile } from "node:fs/promises";
import handler from "./api/manychat.js";

const knowledge = JSON.parse(await readFile(new URL("./data/knowledge.json", import.meta.url), "utf8"));
const MENU = knowledge.links.cardapio_pedido;
const CAT = "Pratos do Dia (Almoço)";

function assert(condition, message) { if (!condition) throw new Error(message); }
function makeRes(){ return {statusCode:null,payload:null,setHeader(){},status(c){this.statusCode=c;return this;},json(p){this.payload=p;return p;},end(){}}; }
async function ask(message, extra={}) { const res=makeRes(); await handler({method:"POST",headers:{},query:{},body:{message,first_name:"Teste",subscriber_id:"lunch-test",...extra}},res); return res.payload; }
let failed=0;
async function test(name,fn){ try{await fn();console.log(`PASS | ${name}`);}catch(e){failed++;console.error(`FAIL | ${name} | ${e.message}`);} }

await test("Pratos do Dia têm 9 itens oficiais e janela de almoço", async()=>{
  const items=knowledge.catalogo.filter(i=>i.categoria===CAT);
  assert(items.length===9, `itens almoço=${items.length}`);
  assert(knowledge.pratos_do_dia?.horario==="11h às 15h", knowledge.pratos_do_dia?.horario);
  for(const item of items){
    assert(item.valor, `sem valor: ${item.id}`);
    assert(String(item.disponibilidade).includes("segunda a sexta-feira"), `sem dias: ${item.id}`);
    assert(String(item.disponibilidade).includes("11h às 15h"), `sem horário: ${item.id}`);
  }
});

await test("Bisteca responde valor, composição e disponibilidade do almoço", async()=>{
  const p=await ask("Tem bisteca?");
  assert(p.intent==="item_cardapio", p.intent);
  assert(p.topic==="almoco_bisteca", p.topic);
  assert(p.reply.includes("R$ 19,90"), p.reply);
  assert(p.reply.includes("Bisteca suína"), p.reply);
  assert(p.reply.includes("segunda a sexta-feira"), p.reply);
  assert(p.reply.includes("11h às 15h"), p.reply);
  assert(!p.reply.includes(MENU), `URL vazou no Instagram: ${p.reply}`);
  assert(p.cta_type==="cardapio", p.cta_type);
});

await test("Pergunta por almoço lista todos os Pratos do Dia e adicional de bebida", async()=>{
  const p=await ask("quais são os pratos do dia no almoço?");
  assert(p.intent==="almoco", p.intent);
  for(const value of ["Bisteca — R$ 19,90","Bife Acebolado — R$ 27,90","Omelete de Calabresa — R$ 21,90","Prato Fitness Frango — R$ 19,90"]) assert(p.reply.includes(value), p.reply);
  assert(p.reply.includes("segunda a sexta-feira"), p.reply);
  assert(p.reply.includes("11h às 15h"), p.reply);
  assert(p.reply.includes("+R$ 5,00"), p.reply);
  assert(p.reply.includes("Coca-Cola KS"), p.reply);
  assert(!p.reply.includes(MENU), p.reply);
});

await test("Prato com preço diferente no almoço e Executivo mostra as duas opções", async()=>{
  const p=await ask("qual o valor do filé de frango grelhado?");
  assert(p.intent==="opcoes_cardapio", p.intent);
  assert(p.reply.includes("Prato do Dia (Almoço) — R$ 22,90"), p.reply);
  assert(p.reply.includes("Executivo — R$ 30,90"), p.reply);
});

await test("Contexto almoço escolhe preço de almoço e contexto executivo escolhe Executivo", async()=>{
  const lunch=await ask("qual o valor do filé de frango grelhado no almoço?");
  assert(lunch.intent==="item_cardapio", lunch.intent);
  assert(lunch.reply.includes("R$ 22,90"), lunch.reply);
  assert(lunch.reply.includes("11h às 15h"), lunch.reply);
  const exec=await ask("qual o valor do filé de frango grelhado executivo?");
  assert(exec.intent==="item_cardapio", exec.intent);
  assert(exec.reply.includes("R$ 30,90"), exec.reply);
  assert(!exec.reply.includes("R$ 22,90"), exec.reply);
});

await test("Strogonoff/estrogonofe diferencia almoço e Executivo sem escolher preço arbitrário", async()=>{
  const p=await ask("quanto custa o strogonoff de frango?");
  assert(p.intent==="opcoes_cardapio", p.intent);
  assert(p.reply.includes("R$ 21,90"), p.reply);
  assert(p.reply.includes("R$ 36,90"), p.reply);
});

await test("100% dos 141 itens respondem com o próprio valor quando perguntados pelo nome", async()=>{
  assert(knowledge.catalogo.length===141, `catálogo=${knowledge.catalogo.length}`);
  for(const item of knowledge.catalogo){
    const p=await ask(`qual o valor de ${item.nome}?`);
    assert(p.intent!=="cardapio_categorias", `${item.id} caiu em item não encontrado: ${p.reply}`);
    assert(String(p.reply).includes(item.valor), `${item.id} não trouxe ${item.valor}: ${p.reply}`);
  }
});

if(failed){ console.error(`\n${failed} teste(s) de almoço/cobertura falharam.`); process.exit(1); }
console.log("\nPratos do Dia e cobertura de 100% do catálogo: todos os testes passaram.");
