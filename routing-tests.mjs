import handler from "./api/manychat.js";
function makeRes(){ return {statusCode:null,payload:null,setHeader(){},status(c){this.statusCode=c;return this;},json(p){this.payload=p;return p;},end(){}}; }
async function ask(message, extra={}){ const res=makeRes(); await handler({method:"POST",headers:{},query:{},body:{message,first_name:"Teste",subscriber_id:"routing-test",channel:"instagram",...extra}},res); return res.payload; }
function assert(c,m){ if(!c) throw new Error(m); }
let failed=0;
async function test(name,fn){ try{await fn();console.log(`PASS | ${name}`);}catch(e){failed++;console.error(`FAIL | ${name} | ${e.message}`);} }

await test("'valeu' é despedida, não item do cardápio", async()=>{ const p=await ask("valeu"); assert(p.intent==="despedida", p.intent); });
await test("'muito obrigado!' é despedida", async()=>{ const p=await ask("muito obrigado!"); assert(p.intent==="despedida", p.intent); });
await test("'sobremesa' não vira reserva (mesa dentro de sobremesa)", async()=>{ const p=await ask("sobremesa"); assert(p.intent!=="reserva", p.intent); });
await test("'quero reservar mesa pra 5 pessoas' continua reserva", async()=>{ const p=await ask("quero reservar mesa pra 5 pessoas"); assert(p.intent==="reserva", p.intent); });
await test("'abre domingo?' é horário", async()=>{ const p=await ask("abre domingo?"); assert(p.intent==="horario", p.intent); });
await test("'quero trabalhar aí' é vaga com botão Enviar currículo", async()=>{ const p=await ask("quero trabalhar aí"); assert(p.intent==="vaga", p.intent); assert(p.cta_1_label==="Enviar currículo", p.cta_1_label); });
await test("'meu pedido veio errado' é reclamação com WhatsApp, não novo pedido", async()=>{ const p=await ask("meu pedido veio errado"); assert(p.intent==="reclamacao", p.intent); assert(p.cta_1_label==="Falar no WhatsApp", p.cta_1_label); assert(!/bora fazer seu pedido/i.test(p.reply), p.reply); });
await test("'demorou demais' é reclamação", async()=>{ const p=await ask("demorou demais"); assert(p.intent==="reclamacao", p.intent); });
await test("'sem problema, obrigado' não é reclamação", async()=>{ const p=await ask("sem problema, obrigado"); assert(p.intent!=="reclamacao", p.intent); });
await test("'quero pedir' continua pedido", async()=>{ const p=await ask("quero pedir"); assert(p.intent==="pedido", p.intent); });
await test("reclamação no WhatsApp gera handoff", async()=>{ const p=await ask("meu pedido veio errado",{channel:"whatsapp"}); assert(p.handoff===true, JSON.stringify(p.handoff)); assert(p.handoff_reason==="reclamacao", p.handoff_reason); });
if (failed) { console.error(`${failed} teste(s) falharam`); process.exit(1); } else console.log("Todos os testes de roteamento passaram");
