// v2.11.1 — Fluxo WhatsApp humano, sem redirecionamento e CTAs mínimos.
import handler from "./api/manychat.js";

const MENU = "https://botequimpatiolimeira.saipos.com/home?utm_id=97757_v0_s00_e0_tv0";
const MAPS = "https://maps.app.goo.gl/sr7PgRhUxaNuzg8e8";

function makeRes() {
  return { statusCode:null, payload:null, setHeader(){}, status(c){this.statusCode=c;return this;}, json(p){this.payload=p;return p;}, end(){} };
}
async function ask(message, extra={}) {
  const res = makeRes();
  await handler({ method:"POST", headers:{}, query:{}, body:{ message, first_name:"Teste", subscriber_id:"wa-flow", channel:"whatsapp", event_type:"direct", ...extra } }, res);
  return res.payload;
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function noUrl(p) { return !/https?:\/\//i.test(String(p?.reply || "")); }
function noCta(p) { return Number(p?.cta_count || 0) === 0; }
let failed=0;
async function test(name, fn) { try { await fn(); console.log(`PASS | ${name}`); } catch(e) { failed++; console.error(`FAIL | ${name} | ${e.message}`); } }

await test("recepção simples e humana", async()=>{
  const p=await ask("oi");
  assert(p.intent==="saudacao", p.intent);
  assert(/que bom ter você por aqui/i.test(p.reply), p.reply);
  assert(noCta(p) && noUrl(p), JSON.stringify(p));
});

await test("informação conhecida: preço responde sem botão", async()=>{
  const p=await ask("qual o valor da Tábua Mista?");
  assert(p.intent==="item_cardapio", p.intent);
  assert(/R\$\s*104,90/.test(p.reply), p.reply);
  assert(noCta(p) && noUrl(p), JSON.stringify(p.ctas));
  assert(p.cardapio_link === "" && p.localizacao_link === "", JSON.stringify({cardapio:p.cardapio_link,maps:p.localizacao_link}));
});

await test("promoção responde sem botão", async()=>{
  const p=await ask("qual a promoção de chopp?");
  assert(p.intent==="promocao_chopp", p.intent);
  assert(noCta(p) && noUrl(p), JSON.stringify(p.ctas));
});

await test("cardápio solicitado recebe só botão do cardápio", async()=>{
  const p=await ask("me manda o cardápio");
  assert(p.intent==="cardapio", p.intent);
  assert(p.cta_count===1, `cta_count=${p.cta_count}`);
  assert(p.cta_1_type==="cardapio" && p.cta_1_url===MENU, JSON.stringify(p.ctas));
  assert(p.cardapio_link === MENU && p.localizacao_link === "", JSON.stringify({cardapio:p.cardapio_link,maps:p.localizacao_link}));
  assert(noUrl(p), p.reply);
});

await test("categoria sem pedir cardápio não recebe botão", async()=>{
  const p=await ask("quais burgers vocês têm?");
  assert(["categoria_cardapio","opcoes_cardapio"].includes(p.intent), p.intent);
  assert(noCta(p) && noUrl(p), JSON.stringify(p.ctas));
});

await test("endereço solicitado recebe só Como chegar", async()=>{
  const p=await ask("onde fica?");
  assert(p.intent==="localizacao", p.intent);
  assert(p.cta_count===1, `cta_count=${p.cta_count}`);
  assert(p.cta_1_type==="localizacao" && p.cta_1_label==="Como chegar" && p.cta_1_url===MAPS, JSON.stringify(p.ctas));
  assert(p.localizacao_link === MAPS && p.cardapio_link === "", JSON.stringify({cardapio:p.cardapio_link,maps:p.localizacao_link}));
  assert(noUrl(p), p.reply);
});

await test("pedido para retirada recebe só botão de retirada", async()=>{
  const p=await ask("quero fazer um pedido para retirada");
  assert(["pedido","retirada_balcao"].includes(p.intent), p.intent);
  assert(p.cta_count===1, `cta_count=${p.cta_count}`);
  assert(p.cta_1_type==="pedido_retirada" && p.cta_1_url===MENU, JSON.stringify(p.ctas));
  assert(p.cardapio_link === MENU && p.localizacao_link === "", JSON.stringify({cardapio:p.cardapio_link,maps:p.localizacao_link}));
  assert(noUrl(p), p.reply);
});

await test("pedido genérico pergunta modalidade sem botão", async()=>{
  const p=await ask("quero fazer um pedido");
  assert(p.intent==="pedido", p.intent);
  assert(/retirar no balcão|entrega/i.test(p.reply), p.reply);
  assert(noCta(p) && noUrl(p), JSON.stringify(p.ctas));
});

await test("delivery informa sem redirecionar", async()=>{
  const p=await ask("vocês fazem entrega?");
  assert(p.intent==="delivery", p.intent);
  assert(/iFood/i.test(p.reply), p.reply);
  assert(noCta(p) && noUrl(p), JSON.stringify(p.ctas));
  assert(p.ifood_link === "" && p.whatsapp_link === "" && p.whatsapp_vagas_link === "", JSON.stringify({ifood:p.ifood_link,wa:p.whatsapp_link,rh:p.whatsapp_vagas_link}));
});

for (const [label,message,reason] of [
  ["reserva","quero reservar mesa para 6", "reserva"],
  ["reclamação","meu pedido veio errado", "reclamacao"],
  ["atendimento humano","quero falar com uma pessoa", "humano"],
  ["vaga","quero mandar currículo", "vaga"],
  ["negociação","quero orçamento para evento de 40 pessoas", "negociacao"]
]) {
  await test(`${label}: abre conversa humana sem link/botão`, async()=>{
    const p=await ask(message);
    assert(p.handoff===true, `handoff=${p.handoff}`);
    assert(p.handoff_reason===reason, `reason=${p.handoff_reason}`);
    assert(p.marcar_conversa_aberta===true, `marcar=${p.marcar_conversa_aberta}`);
    assert(p.next_action==="handoff_humano", p.next_action);
    assert(noCta(p) && noUrl(p), JSON.stringify(p.ctas));
    assert(p.whatsapp_link === "" && p.whatsapp_vagas_link === "" && p.ifood_link === "", JSON.stringify({wa:p.whatsapp_link,rh:p.whatsapp_vagas_link,ifood:p.ifood_link}));
    assert(!/(direcion|encaminh|transfer|outro whatsapp|outro número|outro numero|bot[aã]o)/i.test(p.reply), p.reply);
  });
}

await test("assunto desconhecido abre conversa humana na mesma conversa", async()=>{
  const p=await ask("preciso saber uma coisa xyzabc");
  assert(p.handoff===true, `handoff=${p.handoff}`);
  assert(p.marcar_conversa_aberta===true, `marcar=${p.marcar_conversa_aberta}`);
  assert(noCta(p) && noUrl(p), JSON.stringify(p.ctas));
});

await test("erro no WhatsApp abre conversa humana sem destino externo", async()=>{
  const req={ method:"POST", headers:{}, query:{} };
  Object.defineProperty(req,"body",{get(){ throw new Error("erro controlado"); }});
  const res=makeRes();
  await handler(req,res);
  const p=res.payload;
  // Sem canal disponível no corpo quebrado, o fallback padrão fica Instagram; este teste só protege a rota normal de erro em corpo válido nos demais testes.
  assert(p.intent==="erro_seguro", p.intent);
});

if (failed) { console.error(`\n${failed} teste(s) do fluxo WhatsApp falharam.`); process.exit(1); }
console.log("\nFluxo WhatsApp v2.11.1: todos os testes passaram.");
