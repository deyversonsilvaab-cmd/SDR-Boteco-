import OpenAI from "openai";
import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_FALLBACK = "Vou confirmar com a equipe para não te passar nenhuma informação errada e já te retorno 😊";

function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-webhook-secret");
}

function send(res, statusCode, payload) {
  setJsonHeaders(res);
  return res.status(statusCode).json(payload);
}

function safeText(value) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 1200);
}

function normalizeText(value) {
  return safeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(normalizeText(term)));
}

function getHeader(req, name) {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value || "";
}

function isAuthorized(req) {
  const expectedSecret = process.env.WEBHOOK_SECRET;
  if (!expectedSecret) return true;

  const headerSecret = getHeader(req, "x-webhook-secret");
  const authHeader = getHeader(req, "authorization");
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";

  return headerSecret === expectedSecret || bearer === expectedSecret;
}

function extractMessage(body) {
  return safeText(
    body?.message ||
      body?.text ||
      body?.last_input_text ||
      body?.last_text_input ||
      body?.custom_fields?.message ||
      body?.custom_fields?.last_input_text ||
      ""
  );
}

function extractCustomer(body) {
  return {
    id: safeText(String(body?.subscriber_id || body?.id || body?.contact_id || "")),
    first_name: safeText(body?.first_name || body?.name || body?.profile?.first_name || ""),
    username: safeText(body?.username || body?.ig_username || body?.profile?.username || ""),
    channel: safeText(body?.channel || "instagram")
  };
}

function extractConversationContext(body) {
  return {
    last_intent: safeText(
      body?.last_intent ||
        body?.intent ||
        body?.ai_intent ||
        body?.custom_fields?.last_intent ||
        body?.custom_fields?.ai_intent ||
        ""
    ),
    last_topic: safeText(
      body?.last_topic ||
        body?.topic ||
        body?.custom_fields?.last_topic ||
        body?.custom_fields?.ai_topic ||
        ""
    )
  };
}

async function loadKnowledge() {
  try {
    const filePath = path.join(process.cwd(), "data", "knowledge.json");
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {
      empresa: {
        nome: process.env.BUSINESS_NAME || "Sr. Boteco Limeira",
        whatsapp: "5519997858351",
        whatsapp_link: "https://wa.me/5519997858351",
        endereco: "Pátio Limeira Shopping"
      },
      resposta_fallback: DEFAULT_FALLBACK
    };
  }
}

function isPriceQuestion(text) {
  return includesAny(text, [
    "valor",
    "preco",
    "preço",
    "quanto custa",
    "quanto esta",
    "quanto está",
    "quanto ta",
    "quanto tá",
    "qual valor",
    "qual o valor",
    "tem valor"
  ]);
}

function isPriceOnlyQuestion(text) {
  return [
    "valor",
    "preco",
    "preço",
    "qual valor",
    "qual o valor",
    "quanto",
    "quanto custa"
  ].includes(text);
}

function mentionsOpenChopp(text) {
  return (
    includesAny(text, ["open chopp", "open chop", "open de chopp", "open do chopp", "chopp livre", "open bar de chopp", "open bar chopp"]) ||
    (text.includes("open") && text.includes("chopp"))
  );
}


function mentionsZeroAlcohol(text) {
  return includesAny(text, [
    "chopp zero",
    "chope zero",
    "open chopp zero",
    "open zero",
    "zero alcool",
    "zero álcool",
    "sem alcool",
    "sem álcool",
    "cerveja zero",
    "heineken zero",
    "bebida zero",
    "bebida sem alcool",
    "bebida sem álcool",
    "alcool free",
    "álcool free",
    "nao alcoolico",
    "não alcoólico",
    "sem teor alcoolico",
    "sem teor alcoólico"
  ]);
}

function looksLikeScoreGuess(text) {
  return /\b\d+\s*x\s*\d+\b/.test(text) || /\bbrasil\b.*\d+.*\d+/.test(text);
}

function getAdReply(knowledge, key, fallback = DEFAULT_FALLBACK) {
  return knowledge?.respostas_anuncio_open_chopp?.[key] || knowledge?.respostas_rapidas?.[`anuncio_${key}`] || fallback;
}

function buildDirectReply(message, knowledge, context = {}) {
  const text = normalizeText(message);
  const lastIntent = normalizeText(context.last_intent || "");
  const lastTopic = normalizeText(context.last_topic || "");
  const respostas = knowledge.respostas_rapidas || {};
  const priceQuestion = isPriceQuestion(text);
  const priceOnlyQuestion = isPriceOnlyQuestion(text);
  const openContext = includesAny(lastIntent, ["open_chopp", "open chopp", "anuncio_open_chopp"]) || includesAny(lastTopic, ["open_chopp", "open chopp", "anuncio_open_chopp", "jogo", "placar"]);

  // Respostas específicas da campanha de tráfego pago: Open Chopp + jogo/desafio.
  // Essas regras ficam antes das respostas genéricas para evitar repetição ou respostas fora do contexto.
  if (looksLikeScoreGuess(text)) {
    return { reply: getAdReply(knowledge, "comentario_palpite"), intent: "palpite_placar", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["como funciona o desafio", "desafio do placar", "como funciona o placar", "como participa", "como participar", "palpite", "acertar o placar", "placar do jogo"])) {
    return { reply: getAdReply(knowledge, "desafio_placar"), intent: "desafio_placar", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["pode comentar mais de uma vez", "mais de uma vez", "quantos palpites", "1 palpite", "um palpite", "varios palpites", "vários palpites"])) {
    return { reply: getAdReply(knowledge, "um_palpite_por_perfil"), intent: "regra_desafio", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["duas pessoas acertarem", "duas pessoas acertar", "mais de uma pessoa acertar", "se empatar", "quem ganha se", "ordem dos comentarios", "ordem dos comentários"])) {
    return { reply: getAdReply(knowledge, "duas_pessoas_acertarem"), intent: "regra_desafio", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["ate que horas posso comentar", "até que horas posso comentar", "posso comentar ate", "posso comentar até", "comentarios ate", "comentários até", "palpite ate", "palpite até", "inicio do jogo", "início do jogo"])) {
    return { reply: getAdReply(knowledge, "ate_quando_comentar"), intent: "regra_desafio", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["premio", "prêmio", "ganhador", "ganha o que", "vale para quando", "open gratis", "open grátis", "open chopp gratis", "open chopp grátis"])) {
    return { reply: getAdReply(knowledge, "premio_quando"), intent: "regra_desafio", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["o que vem no combo", "combo", "frango a passarinho", "calabresa", "frango com calabresa"])) {
    return { reply: getAdReply(knowledge, "combo_itens"), intent: "combo_jogo", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["serve quantas pessoas", "serve quantos", "serve quantas", "da para quantas pessoas", "dá para quantas pessoas", "quantas pessoas serve"])) {
    return { reply: getAdReply(knowledge, "serve_quantas_pessoas"), intent: "combo_jogo", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["outras porcoes", "outras porções", "tem porcoes", "tem porções", "mais porcoes", "mais porções"])) {
    return { reply: getAdReply(knowledge, "outras_porcoes"), intent: "cardapio", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["crianca pode ir", "criança pode ir", "pode ir crianca", "pode ir criança", "leva crianca", "levar criança", "levar filho", "familia com crianca", "família com criança"])) {
    return { reply: getAdReply(knowledge, "crianca"), intent: "familia", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["familia", "família", "levar familia", "levar família", "com familia", "com família"])) {
    return { reply: getAdReply(knowledge, "familia"), intent: "familia", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["casal ou turma", "casal", "turma", "amigos", "grupo de amigos"]) && !includesAny(text, ["empresa", "reserva", "mesa", "levar", "vou levar", "quero levar"])) {
    return { reply: getAdReply(knowledge, "casal_ou_turma"), intent: "perfil_publico", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["aniversario", "aniversário", "comemorar aniversario", "comemorar aniversário", "niver", "festa de aniversario", "festa de aniversário"])) {
    return { reply: getAdReply(knowledge, "aniversario"), intent: "aniversario", needs_human: true, lead_temperature: "quente", missing_fields: ["data", "quantidade_pessoas"] };
  }

  if (includesAny(text, ["precisa reservar", "tem que reservar", "preciso reservar", "reserva obrigatoria", "reserva obrigatória"])) {
    return { reply: getAdReply(knowledge, "precisa_reservar"), intent: "reserva", needs_human: true, lead_temperature: "quente", missing_fields: ["quantidade_pessoas"] };
  }

  if (includesAny(text, ["tem mesa para hoje", "mesa para hoje", "tem mesa hoje", "mesa hoje", "disponibilidade hoje", "lugar para hoje"])) {
    return { reply: getAdReply(knowledge, "mesa_hoje"), intent: "reserva", needs_human: true, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["aceita cartao", "aceita cartão", "passa cartao", "passa cartão", "credito", "crédito", "debito", "débito", "pix"])) {
    return { reply: getAdReply(knowledge, "aceita_cartao"), intent: "pagamento", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["tem taxa", "taxa", "10%", "dez por cento", "taxa de servico", "taxa de serviço"])) {
    return { reply: getAdReply(knowledge, "tem_taxa"), intent: "taxa", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["open individual", "open chopp individual", "e individual", "é individual", "por pessoa"])) {
    return { reply: getAdReply(knowledge, "open_individual"), intent: "open_chopp", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["pode dividir o open", "dividir o open", "compartilhar open", "dividir open chopp", "pode compartilhar"])) {
    return { reply: getAdReply(knowledge, "pode_dividir_open"), intent: "open_chopp", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["so quero comer", "só quero comer", "posso so comer", "posso só comer", "ir so para comer", "ir só para comer", "nao vou beber", "não vou beber"])) {
    return { reply: getAdReply(knowledge, "so_comer"), intent: "cardapio", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["open vale no almoco", "open vale no almoço", "open no almoco", "open no almoço", "open chopp no almoco", "open chopp no almoço"])) {
    return { reply: getAdReply(knowledge, "open_no_almoco"), intent: "open_chopp", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["quero levar uma turma", "levar turma", "vou levar uma turma", "ir em grupo", "grupo grande", "mesa para grupo"])) {
    return { reply: getAdReply(knowledge, "levar_turma"), intent: "grupo", needs_human: true, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["happy hour da empresa", "happy hour de empresa", "happy hour para empresa", "equipe da empresa", "empresa no happy", "confraternizacao da empresa", "confraternização da empresa"])) {
    return { reply: getAdReply(knowledge, "happy_hour_empresa"), intent: "empresa_b2b", needs_human: true, lead_temperature: "quente", missing_fields: ["nome_empresa", "quantidade_pessoas"] };
  }

  if (includesAny(text, ["chegando mais tarde", "chegar mais tarde", "se chegar mais tarde", "ate as 21", "até as 21", "ate 21h", "até 21h"])) {
    return { reply: getAdReply(knowledge, "chegar_mais_tarde"), intent: "open_chopp", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["open comeca", "open começa", "que horas comeca o open", "que horas começa o open", "open começa que horas", "open chopp começa", "horario do open", "horário do open"]) || (includesAny(text, ["que horas", "horario", "horário"]) && openContext)) {
    return { reply: getAdReply(knowledge, "open_comeca"), intent: "open_chopp", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (["eu vou", "vou", "to indo", "tô indo", "estou indo"].includes(text)) {
    return { reply: getAdReply(knowledge, "comentario_eu_vou"), intent: "comentario_anuncio", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["partiu", "bora", "bora boteco", "partiu boteco"])) {
    return { reply: getAdReply(knowledge, "comentario_partiu"), intent: "comentario_anuncio", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["mencionou voce no proprio story", "mencionou você no próprio story", "mencionou no story", "marcou no story", "marcou voce", "marcou você", "marcacao", "marcação", "story", "stories", "repost", "foto marcada", "marcou a gente"])) {
    return { reply: respostas.marcacao_story || DEFAULT_FALLBACK, intent: "marcacao_story", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }


  if (mentionsZeroAlcohol(text)) {
    return { reply: respostas.bebida_sem_alcool || respostas.bebidas || DEFAULT_FALLBACK, intent: "bebida_sem_alcool", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (mentionsOpenChopp(text) || (priceOnlyQuestion && openContext)) {
    const asksToday = includesAny(text, ["hoje", "tem hoje", "open hoje"]);
    const reply = asksToday
      ? getAdReply(knowledge, "open_chopp_hoje")
      : (priceQuestion || priceOnlyQuestion ? getAdReply(knowledge, "valor_open_chopp") : getAdReply(knowledge, "primeiro_contato_manychat"));
    return {
      reply,
      intent: "open_chopp",
      needs_human: false,
      lead_temperature: "quente",
      missing_fields: []
    };
  }

  if (includesAny(text, ["happy hour", "happy", "after", "fim de tarde", "depois do trabalho", "equipe no happy", "porcao no happy", "porção no happy"])) {
    return { reply: respostas.happy_hour || DEFAULT_FALLBACK, intent: "happy_hour", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["hamburguer em dobro", "hambúrguer em dobro", "double burger", "burger em dobro", "lanche em dobro", "compre 1 ganhe 1", "compra 1 ganha outro", "terca burger", "terça burger"])) {
    return { reply: respostas.double_burger || DEFAULT_FALLBACK, intent: "double_burger", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["fondue", "fundi", "fundue", "fondi", "dia dos namorados", "namorados", "noite de fondue"])) {
    return { reply: respostas.fondue || DEFAULT_FALLBACK, intent: "fondue", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["feijoada", "feijuca", "feijao", "feijão"])) {
    return { reply: respostas.feijoada || DEFAULT_FALLBACK, intent: "feijoada", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["almoco", "almoço", "prato do dia", "pratos do dia", "executivo", "executivos", "pf", "refeicao", "refeição", "almoco hoje", "almoço hoje", "prato comercial"])) {
    return { reply: respostas.almoco || DEFAULT_FALLBACK, intent: "almoco", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (priceQuestion) {
    return { reply: respostas.preco_cardapio || DEFAULT_FALLBACK, intent: "preco", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["cardapio", "cardápio", "menu", "opcoes", "opções", "comidas", "pratos", "tem o que", "o que tem", "cardapio completo", "cardápio completo"])) {
    return { reply: respostas.cardapio || DEFAULT_FALLBACK, intent: "cardapio", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["onde fica", "aonde fica", "endereco", "endereço", "localizacao", "localização", "qual endereco", "qual endereço", "local", "shopping", "patio limeira", "pátio limeira"])) {
    return { reply: respostas.localizacao || DEFAULT_FALLBACK, intent: "localizacao", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["empresa", "empresas", "equipe", "colaboradores", "funcionarios", "funcionários", "corporativo", "almoço para empresa", "almoco para empresa", "happy hour para empresa", "servico para empresa", "serviço para empresa", "confraternizacao", "confraternização"])) {
    return { reply: respostas.empresa_b2b || DEFAULT_FALLBACK, intent: "empresa_b2b", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["estacionamento", "parking", "free parking", "estacionamento free", "estacionamento gratis", "estacionamento grátis"])) {
    return { reply: respostas.estacionamento || DEFAULT_FALLBACK, intent: "estacionamento", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["guarana", "guaraná", "coca", "coca cola", "refrigerante", "suco", "bebida", "agua", "água"]) && !includesAny(text, ["proteico", "proteica", "pure up", "pureup"])) {
    return { reply: respostas.bebidas || respostas.preco_cardapio || DEFAULT_FALLBACK, intent: "bebidas", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["entrega", "delivery", "ifood", "i food", "pedido", "pedir", "entregam", "faz entrega"])) {
    return { reply: respostas.delivery || DEFAULT_FALLBACK, intent: "ifood", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["vaga", "vagas", "emprego", "trabalho", "trabalhar", "curriculo", "currículo", "contratacao", "contratação", "contratando", "processo seletivo", "vaga de emprego", "vaga de trabalho", "free lance", "freelance", "garcom", "garçom", "garconete", "garçonete", "cumim", "cumin", "cozinha", "atendente"])) {
    return { reply: respostas.vaga || DEFAULT_FALLBACK, intent: "vaga", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["guarana proteico", "guaraná proteico", "pure up", "pureup", "bebida proteica", "refri proteico", "refrigerante proteico", "proteico bebida"])) {
    return { reply: respostas.guarana_proteico || respostas.proteicos || DEFAULT_FALLBACK, intent: "proteico", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["proteico", "proteica", "fitness", "fit", "saudavel", "saudável", "low carb", "frango power", "executivo proteico", "tilapia premium", "tilápia premium", "low carb supreme", "salada proteica", "tilapia fresh", "tilápia fresh", "prato saudavel", "prato saudável", "pratos proteicos", "cardapio fitness", "cardápio fitness"])) {
    return { reply: respostas.proteicos || DEFAULT_FALLBACK, intent: "proteico", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["rodizio", "rodízio", "rodisio", "rodizio de boteco", "rodízio de boteco", "como é esse rodizio", "como e esse rodizio", "como funciona o rodizio", "como é esse rodízio", "como funciona o rodízio"])) {
    return { reply: respostas.rodizio || respostas.rodizio_open_em_campo || DEFAULT_FALLBACK, intent: "rodizio", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["reserva", "reservar", "mesa", "aniversario", "aniversário", "grupo", "pessoas", "guardar mesa"])) {
    const reply = respostas.reserva || "Claro 😊 Para reserva, me passa por favor: nome, telefone, data, horário e quantidade de pessoas. A equipe confirma a disponibilidade certinho para você.";
    return { reply, intent: "reserva", needs_human: true, lead_temperature: "quente", missing_fields: ["nome", "telefone", "data", "horario", "quantidade_pessoas"] };
  }

  if (includesAny(text, ["horario", "horário", "funcionamento", "abre", "aberto", "fecha", "que horas"])) {
    return { reply: respostas.horario || DEFAULT_FALLBACK, intent: "horario", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  return null;
}

function buildSystemPrompt(knowledge) {
  return `
Você é atendente oficial do ${knowledge.empresa?.nome || process.env.BUSINESS_NAME || "Sr. Boteco Limeira"} no Instagram/WhatsApp.

REGRAS:
1. Nunca invente preço, produto, promoção, horário, data, evento ou disponibilidade.
2. Só informe preços existentes na BASE_DE_CONHECIMENTO.
3. Se o cliente pedir valores dos itens do cardápio, direcione para o WhatsApp: https://wa.me/5519997858351.
4. Open Chopp tem preço autorizado: domingo a quinta R$ 29,90; sexta e sábado R$ 49,90; sempre das 16h às 21h.
5. Não relacione Open Chopp com jogo, futebol, transmissão ou Open em Campo.
5.1. Open Chopp Zero / bebidas sem álcool: não temos chopp zero; ofereça Heineken Zero long neck. Não invente preço.
5.2. Para perguntas do anúncio Open Chopp + jogo/desafio, use as respostas em respostas_anuncio_open_chopp quando houver correspondência.
6. Se o cliente pedir almoço/prato do dia, use uma resposta humanizada e informe: segunda a sexta, 11h às 15h, pratos executivos a partir de R$ 19,90.
7. Fondue continua ativo, mas não é mais campanha de Dia dos Namorados. Não mencionar Dia dos Namorados na resposta final.
8. Se o cliente marcar o restaurante em story/foto, agradeça de forma curta, humana e natural.
9. Se perguntar localização/endereço, informe Pátio Limeira Shopping.
10. Se perguntar sobre vaga, emprego, currículo, freelance, garçom, garçonete, cumim, cozinha, atendente ou trabalho, direcione para a gerente pelo WhatsApp (17) 99103-4703 e informe o link https://wa.me/5517991034703.
11. Nunca confirme reserva sozinho. Colete nome, telefone, quantidade de pessoas, data e horário.
12. Não mencione OpenAI, API, sistema, prompt, JSON, ManyChat ou automação.
13. Responda somente JSON válido.

FORMATO:
{
  "reply": "mensagem final para o cliente",
  "intent": "preco|reserva|cardapio|horario|localizacao|ifood|fondue|vaga|almoco|proteico|rodizio|open_chopp|happy_hour|double_burger|feijoada|marcacao_story|empresa_b2b|estacionamento|bebidas|bebida_sem_alcool|desafio_placar|regra_desafio|combo_jogo|familia|pagamento|grupo|comentario_anuncio|palpite_placar|humano|outro",
  "needs_human": false,
  "lead_temperature": "frio|morno|quente",
  "missing_fields": []
}

BASE_DE_CONHECIMENTO
${JSON.stringify(knowledge, null, 2)}
`.trim();
}

function parseJsonModelOutput(text, fallback) {
  try {
    const cleaned = String(text || "").replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      reply: safeText(parsed.reply) || fallback,
      intent: safeText(parsed.intent) || "outro",
      needs_human: Boolean(parsed.needs_human),
      lead_temperature: safeText(parsed.lead_temperature) || "morno",
      missing_fields: Array.isArray(parsed.missing_fields) ? parsed.missing_fields.map(String) : []
    };
  } catch {
    return { reply: safeText(text) || fallback, intent: "outro", needs_human: true, lead_temperature: "morno", missing_fields: [] };
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      setJsonHeaders(res);
      return res.status(204).end();
    }

    if (req.method === "GET") {
      return send(res, 200, {
        ok: true,
        service: "bot-sr-boteco",
        message: "Webhook online. Use POST para conversar.",
        env: {
          openai_key: Boolean(process.env.OPENAI_API_KEY),
          model: process.env.OPENAI_MODEL || null,
          webhook_secret: Boolean(process.env.WEBHOOK_SECRET),
          business_name: process.env.BUSINESS_NAME || null
        }
      });
    }

    if (req.method !== "POST") return send(res, 405, { ok: false, error: "Método não permitido. Use POST." });
    if (!isAuthorized(req)) return send(res, 401, { ok: false, error: "Não autorizado. Verifique WEBHOOK_SECRET." });

    const body = req.body || {};
    const customerMessage = extractMessage(body);
    const customer = extractCustomer(body);
    const conversationContext = extractConversationContext(body);

    if (!customerMessage) return send(res, 400, { ok: false, error: "Mensagem vazia. Envie no campo message ou text." });

    const knowledge = await loadKnowledge();
    const fallback = knowledge.resposta_fallback || DEFAULT_FALLBACK;

    const direct = buildDirectReply(customerMessage, knowledge, conversationContext);
    if (direct) {
      return send(res, 200, { ok: true, ...direct, messages: [{ type: "text", text: direct.reply }] });
    }

    if (!process.env.OPENAI_API_KEY) return send(res, 500, { ok: false, error: "OPENAI_API_KEY não configurada na Vercel." });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: buildSystemPrompt(knowledge) },
        { role: "user", content: JSON.stringify({ cliente: customer, contexto: conversationContext, mensagem: customerMessage }) }
      ],
      response_format: { type: "json_object" },
      temperature: 0.6
    });

    const result = parseJsonModelOutput(response.choices?.[0]?.message?.content, fallback);
    return send(res, 200, { ok: true, ...result, messages: [{ type: "text", text: result.reply }] });
  } catch (error) {
    console.error("ERRO_GERAL:", error);
    return send(res, 200, {
      ok: false,
      reply: DEFAULT_FALLBACK,
      intent: "humano",
      needs_human: true,
      lead_temperature: "quente",
      missing_fields: [],
      error_public: "Falha temporária no atendimento automático.",
      messages: [{ type: "text", text: DEFAULT_FALLBACK }]
    });
  }
}
