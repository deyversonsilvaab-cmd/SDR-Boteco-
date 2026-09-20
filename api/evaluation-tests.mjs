import handler from "./api/manychat.js";

const GOOGLE_REVIEW = "https://search.google.com/local/writereview?placeid=ChIJRVEHZGqByJQRVUe6ZO8Yqz8";

function assert(condition, message) { if (!condition) throw new Error(message); }
function makeRes(){ return {statusCode:null,payload:null,setHeader(){},status(c){this.statusCode=c;return this;},json(p){this.payload=p;return p;},end(){}}; }
async function ask(message, extra={}) { const res=makeRes(); await handler({method:"POST",headers:{},query:{},body:{message,first_name:"Deyverson",subscriber_id:"evaluation-test",channel:"instagram",...extra}},res); return res.payload; }
let failed=0;
async function test(name,fn){ try{await fn();console.log(`PASS | ${name}`);}catch(e){failed++;console.error(`FAIL | ${name} | ${e.message}`);} }

await test("Keyword Avaliação inicia coleta 1 a 5", async()=>{
  const p=await ask("Avaliação");
  assert(p.intent==="avaliacao_solicitar_nota", p.intent);
  assert(p.avaliacao_pendente===true, JSON.stringify(p));
  assert(p.reply.includes("1 a 5"), p.reply);
  assert(p.cta_count===0, `cta=${p.cta_type}`);
});

await test("Nota 5 com avaliacao_pendente é registrada e não vira cardápio", async()=>{
  const p=await ask("5", { avaliacao_pendente:true });
  assert(p.intent==="avaliacao_nota", p.intent);
  assert(p.avaliacao_nota===5, JSON.stringify(p));
  assert(p.avaliacao_salva===true, JSON.stringify(p));
  assert(p.avaliacao_pendente===false, JSON.stringify(p));
  assert(p.avaliacao_feedback_pendente===false, JSON.stringify(p));
  assert(!/cardápio|whatsapp|porç/i.test(p.reply), p.reply);
  assert(p.reply.includes("nota 5"), p.reply);
  assert(!p.reply.includes(GOOGLE_REVIEW), p.reply);
  assert(p.cta_count===1, JSON.stringify(p.ctas));
  assert(p.cta_type==="avaliacao_google", p.cta_type);
  assert(p.cta_label==="Avaliar no Google", p.cta_label);
  assert(p.cta_url===GOOGLE_REVIEW, p.cta_url);
  assert(p.google_avaliacao_link===GOOGLE_REVIEW, p.google_avaliacao_link);
});

await test("Dynamic Block da nota 5 mostra somente Avaliar no Google", async()=>{
  const p=await ask("5", { avaliacao_pendente:true, response_mode:"dynamic_block" });
  const buttons=(p?.content?.messages || []).flatMap((m)=>Array.isArray(m?.buttons)?m.buttons:[]);
  const texts=(p?.content?.messages || []).map((m)=>String(m?.text||"")).join("\n");
  assert(buttons.length===1, JSON.stringify(buttons));
  assert(buttons[0]?.caption==="Avaliar no Google", JSON.stringify(buttons));
  assert(buttons[0]?.url===GOOGLE_REVIEW, JSON.stringify(buttons));
  assert(!texts.includes(GOOGLE_REVIEW), texts);
});

await test("Nota 4 recebe resposta e abre coleta opcional de feedback", async()=>{
  const p=await ask("4", { event_type:"avaliacao" });
  assert(p.intent==="avaliacao_nota", p.intent);
  assert(p.avaliacao_nota===4, JSON.stringify(p));
  assert(p.avaliacao_feedback_pendente===true, JSON.stringify(p));
  assert(p.next_action==="avaliacao_coletar_feedback", p.next_action);
  assert(p.reply.includes("nota 4"), p.reply);
  assert(p.cta_count===0, JSON.stringify(p.ctas));
});

await test("Nota 3 recebe resposta e pede melhoria", async()=>{
  const p=await ask("3", { last_bot_reply:"Como foi seu pedido? De 1 a 5, que nota você dá pra gente?" });
  assert(p.intent==="avaliacao_nota", p.intent);
  assert(p.avaliacao_nota===3, JSON.stringify(p));
  assert(p.avaliacao_feedback_pendente===true, JSON.stringify(p));
  assert(p.next_action==="avaliacao_coletar_feedback", p.next_action);
});

await test("Nota baixa pede feedback e mensagem seguinte é salva como feedback", async()=>{
  const first=await ask("2", { avaliacao_pendente:true });
  assert(first.avaliacao_feedback_pendente===true, JSON.stringify(first));
  const second=await ask("Meu pedido demorou bastante.", { avaliacao_feedback_pendente:true, avaliacao_nota:2, last_intent:first.intent, last_bot_reply:first.reply });
  assert(second.intent==="avaliacao_feedback", second.intent);
  assert(second.avaliacao_feedback==="Meu pedido demorou bastante.", JSON.stringify(second));
  assert(String(second.avaliacao_nota)==="2", JSON.stringify(second));
  assert(second.avaliacao_feedback_pendente===false, JSON.stringify(second));
  assert(second.next_action==="avaliacao_salvar_feedback", second.next_action);
});


await test("Nota 1 recebe resposta humana e pede feedback", async()=>{
  const p=await ask("1", { avaliacao_pendente:true });
  assert(p.intent==="avaliacao_nota", p.intent);
  assert(p.avaliacao_nota===1, JSON.stringify(p));
  assert(p.avaliacao_feedback_pendente===true, JSON.stringify(p));
  assert(/entender|melhorar/i.test(p.reply), p.reply);
  assert(p.cta_count===0, JSON.stringify(p.ctas));
});

await test("Valor fora da escala mantém avaliação pendente", async()=>{
  const p=await ask("8", { avaliacao_pendente:true });
  assert(p.intent==="avaliacao_nota_invalida", p.intent);
  assert(p.avaliacao_pendente===true, JSON.stringify(p));
  assert(p.reply.includes("1 a 5"), p.reply);
});

await test("Número 5 fora de contexto não é sequestrado como avaliação", async()=>{
  const p=await ask("5");
  assert(!String(p.intent).startsWith("avaliacao_"), JSON.stringify(p));
});

await test("Avaliação no WhatsApp não aciona handoff", async()=>{
  const res=makeRes();
  await handler({method:"POST",headers:{},query:{},body:{message:"5",first_name:"Teste",subscriber_id:"evaluation-wa",channel:"whatsapp",avaliacao_pendente:true}},res);
  const p=res.payload;
  assert(p.intent==="avaliacao_nota", p.intent);
  assert(p.handoff===false, JSON.stringify(p));
  assert(p.avaliacao_nota===5, JSON.stringify(p));
});

if(failed){ console.error(`\n${failed} teste(s) de avaliação falharam.`); process.exit(1); }
console.log("\nAvaliação 1–5: todos os testes passaram.");
