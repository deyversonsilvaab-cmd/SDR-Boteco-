import { readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { buildSystemPrompt } from "../lib/persona.js";

const DEFAULT_WHATSAPP_LINK = "https://wa.me/5519997858351";
const DEFAULT_MENU_LINK = "https://botequimpatiolimeira.saipos.com/home";
const DEFAULT_IFOOD_LINK = "https://www.ifood.com.br/delivery/limeira-sp/sr-boteco-shopping-patio-limeita-centro/c318d733-afe4-4098-80af-296be4eb0c72";
const DEFAULT_99FOOD_LINK = "https://99app.com/99food/food/";
const DEFAULT_FALLBACK = `Quero te passar a informação certa. Confira o cardápio em ${DEFAULT_MENU_LINK} ou fale com a equipe no WhatsApp: ${DEFAULT_WHATSAPP_LINK}`;
const INSTAGRAM_MAX_MESSAGE_LENGTH = 900;
const INSTAGRAM_MAX_MESSAGE_PARTS = 3;
const OPENAI_TIMEOUT_MS = 12000;

function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-webhook-secret");
  res.setHeader("Cache-Control", "no-store");
}

function send(res, statusCode, payload) {
  setJsonHeaders(res);
  return res.status(statusCode).json(payload);
}

function safeText(value, max = 1800) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, max);
}

function normalizeText(value) {
  return safeText(value, 5000)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(normalizeText(term)));
}

function getHeader(req, name) {
  const value = req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value || "";
}

function isAuthorized(req) {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) return true;
  const direct = getHeader(req, "x-webhook-secret");
  const auth = getHeader(req, "authorization");
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  return direct === expected || bearer === expected;
}

function extractMessage(body) {
  return safeText(
    body?.message ||
      body?.text ||
      body?.input ||
      body?.query ||
      body?.question ||
      body?.user_message ||
      body?.last_input_text ||
      body?.last_text_input ||
      body?.last_text ||
      body?.comment ||
      body?.comment_text ||
      body?.caption ||
      body?.story_text ||
      body?.trigger_text ||
      body?.event_text ||
      body?.custom_fields?.message ||
      body?.custom_fields?.text ||
      body?.custom_fields?.input ||
      body?.custom_fields?.last_input_text ||
      body?.custom_fields?.last_text_input ||
      body?.custom_fields?.last_text ||
      body?.custom_fields?.comment_text ||
      body?.custom_fields?.story_text ||
      ""
  );
}

function bodyContains(body, terms) {
  let raw = "";
  try {
    raw = JSON.stringify(body || {}).slice(0, 16000);
  } catch {
    raw = "";
  }
  return includesAny(normalizeText(raw), terms);
}

function inferMessageFromEvent(body) {
  const eventText = safeText(
    body?.event_type ||
      body?.event ||
      body?.trigger ||
      body?.source ||
      body?.flow_trigger ||
      body?.custom_fields?.event_type ||
      body?.custom_fields?.event ||
      body?.custom_fields?.trigger ||
      ""
  );

  if (
    includesAny(eventText, ["marcacao story", "story mention", "mentioned in story", "mencionou", "marcou no story"]) ||
    bodyContains(body, ["story mention", "mencionou voce no proprio story", "marcou no story"])
  ) {
    return "mencionou você no próprio story";
  }

  if (includesAny(eventText, ["comment", "comentario"]) || bodyContains(body, ["instagram comment", "comentario no post"])) {
    return safeText(body?.comment_text || body?.comment || body?.custom_fields?.comment_text || "comentário no post");
  }

  return "";
}

function extractCustomer(body) {
  const rawFirstName = safeText(body?.first_name || body?.name || body?.profile?.first_name || "", 80);
  const firstName = rawFirstName.replace(/[{}\[\]<>$]/g, "").trim().slice(0, 50);
  return {
    id: safeText(body?.subscriber_id || body?.id || body?.contact_id || "", 120),
    first_name: firstName,
    username: safeText(body?.username || body?.ig_username || body?.profile?.username || "", 100),
    channel: safeText(body?.channel || "instagram", 30).toLowerCase() || "instagram"
  };
}

function isWhatsapp(customer) {
  const channel = safeText(customer?.channel || "", 30).toLowerCase();
  return channel.includes("whatsapp") || channel === "wa";
}

function humanIsHandling(body) {
  const v = body?.atendimento_humano ?? body?.bot_pausado ?? body?.custom_fields?.atendimento_humano ?? body?.custom_fields?.bot_pausado;
  return v === true || String(v ?? "").toLowerCase() === "true";
}

function extractConversationContext(body) {
  return {
    last_intent: safeText(
      body?.last_intent || body?.intent || body?.ai_intent || body?.custom_fields?.last_intent || body?.custom_fields?.ai_intent || "",
      80
    ),
    last_topic: safeText(
      body?.last_topic || body?.topic || body?.ai_topic || body?.custom_fields?.last_topic || body?.custom_fields?.ai_topic || "",
      120
    ),
    last_bot_reply: safeText(body?.last_bot_reply || body?.custom_fields?.last_bot_reply || "", 1000)
  };
}

async function loadKnowledge() {
  const filePath = path.join(process.cwd(), "data", "knowledge.json");
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    console.error("KNOWLEDGE_LOAD_ERROR", error?.message || error);
    return {
      empresa: { nome: process.env.BUSINESS_NAME || "Sr. Boteco Limeira", whatsapp_link: DEFAULT_WHATSAPP_LINK, endereco: "Pátio Limeira Shopping" },
      links: { cardapio_pedido: DEFAULT_MENU_LINK, whatsapp: DEFAULT_WHATSAPP_LINK, ifood: DEFAULT_IFOOD_LINK, food99: DEFAULT_99FOOD_LINK },
      respostas_base: { fallback: DEFAULT_FALLBACK },
      catalogo: []
    };
  }
}

function getLinks(knowledge) {
  return {
    menu: knowledge?.links?.cardapio_pedido || DEFAULT_MENU_LINK,
    whatsapp: knowledge?.links?.whatsapp || knowledge?.empresa?.whatsapp_link || DEFAULT_WHATSAPP_LINK,
    ifood: knowledge?.links?.ifood || DEFAULT_IFOOD_LINK,
    food99: knowledge?.links?.food99 || DEFAULT_99FOOD_LINK,
    jobs: knowledge?.links?.whatsapp_vagas || "https://wa.me/5517996022567"
  };
}

function isPriceQuestion(text) {
  return includesAny(text, ["valor", "preco", "quanto custa", "quanto ta", "quanto esta", "qual valor", "tem valor"]);
}

function isServingQuestion(text) {
  return includesAny(text, ["serve quant", "para quantas pessoas", "quantas pessoas", "serve 2", "serve duas", "individual", "por pessoa", "casal"]);
}

function isGreetingOnly(text) {
  return includesAny(text, ["oi", "ola", "bom dia", "boa tarde", "boa noite", "tem alguem", "alguem ai", "oi tem alguem"]) && text.split(" ").length <= 7;
}

function isPlayfulOffTopic(text) {
  return includesAny(text, ["robux", "v bucks", "vbucks", "free fire diamante", "diamante free fire", "skin de jogo", "moeda de jogo"]);
}

function isRemovedTopic(text) {
  const removedCampaign = text.includes("open") && includesAny(text, ["chopp", "chope"]);
  const removedSweetFondue = includesAny(text, ["fondue", "fundi", "fundue", "fondi"]) && text.includes("doce");
  return removedCampaign || removedSweetFondue;
}

function findCatalogItemById(id, knowledge) {
  const target = safeText(id, 120);
  if (!target) return null;
  return (Array.isArray(knowledge?.catalogo) ? knowledge.catalogo : []).find((item) => item?.id === target) || null;
}

function findCatalogItem(message, knowledge) {
  const text = normalizeText(message);
  const items = Array.isArray(knowledge?.catalogo) ? knowledge.catalogo : [];
  let best = null;

  for (const item of items) {
    const candidates = [item?.nome, ...(Array.isArray(item?.aliases) ? item.aliases : [])].filter(Boolean);
    for (const candidate of candidates) {
      const normalized = normalizeText(candidate);
      if (!normalized || !text.includes(normalized)) continue;
      const score = normalized.length + (text === normalized ? 200 : 0);
      if (!best || score > best.score) best = { item, score, matched: normalized };
    }
  }
  return best?.item || null;
}

function selectVariations(item, message) {
  const vars = Array.isArray(item?.variacoes) ? item.variacoes : [];
  if (!vars.length) return [];
  const text = normalizeText(message);
  const exactSizeMatches = vars.filter((v) => {
    const n = normalizeText(v?.nome || "");
    const numbers = n.match(/\b\d+(?:\s\d+)?\b/g) || [];
    return numbers.some((num) => text.includes(num));
  });
  return exactSizeMatches.length ? exactSizeMatches : vars;
}

function formatCatalogItem(item, message, links) {
  const lines = [item.nome];
  if (item.descricao) lines.push(item.descricao);

  if (item.valor) lines.push(`Valor: ${item.valor}`);

  const variations = selectVariations(item, message);
  if (variations.length) {
    lines.push(variations.map((v) => `${v.nome} — ${v.valor}`).join("\n"));
  }

  if (item.serve_texto) lines.push(item.serve_texto);
  if (item.disponibilidade) lines.push(item.disponibilidade);

  const missingServing = isServingQuestion(normalizeText(message)) && item.serve_pessoas == null && !item.serve_texto;
  const missingPrice = isPriceQuestion(normalizeText(message)) && !item.valor && !variations.length;

  if (missingPrice || missingServing) {
    const missing = [missingPrice ? "o valor" : "", missingServing ? "quantas pessoas serve" : ""].filter(Boolean).join(" e ");
    lines.push(`Não tenho ${missing} validado aqui e não vou arriscar. Para confirmar com a equipe no WhatsApp: ${links.whatsapp}`);
  }

  lines.push(`Cardápio/pedido para retirada ou entrega: ${links.menu}\nDelivery também pelo iFood: ${links.ifood}\n99Food: ${links.food99} — procure por Sr. Boteco Limeira no app.`);

  return {
    facts: lines.join("\n\n"),
    needs_human: missingPrice || missingServing,
    missing_fields: [missingPrice ? "preco_validado" : null, missingServing ? "serve_pessoas_validado" : null].filter(Boolean)
  };
}

function inferUnknownItemTopic(text) {
  if (includesAny(text, ["tabua mista", "tábua mista"])) return "item:tabua_mista";
  if (includesAny(text, ["picanha"])) return "item:picanha";
  if (includesAny(text, ["burger", "burgers", "hamburguer", "hambúrguer"])) return "item:burgers";
  if (includesAny(text, ["porcao", "porção"])) return "item:porcoes";
  return "cardapio";
}

function makeResolution({ facts, intent, topic = intent, needs_human = false, lead_temperature = "morno", missing_fields = [], next_action = "responder" }) {
  return { facts, intent, topic, needs_human, lead_temperature, missing_fields, next_action };
}

function whatsappHandoffReason(resolved, text) {
  if (resolved.intent === "vaga") return null;
  if (includesAny(text, ["reclamacao", "reclamar", "problema", "atraso", "errado", "cancelar", "estorno", "reembolso", "nota fiscal", "cobranca indevida"])) return "reclamacao";
  if (includesAny(text, ["orcamento", "encomenda", "fechar pedido", "negociar", "desconto", "atacado", "grande quantidade", "festa", "buffet", "evento corporativo", "fornecedor"])) return "negociacao";
  if (["reserva", "humano", "item_inativo", "item_nao_encontrado", "outro"].includes(resolved.intent)) return resolved.intent;
  if (resolved.needs_human) return "confirmar_com_equipe";
  return null;
}

function resolveIntent(message, knowledge, context = {}) {
  const text = normalizeText(message);
  const links = getLinks(knowledge);
  const base = knowledge?.respostas_base || {};

  if (includesAny(text, ["mencionou voce no proprio story", "marcou no story"])) {
    return makeResolution({ facts: base.story_mention || "Obrigado pela marcação. Adoramos fazer parte desse momento.", intent: "story_mention", topic: "relacionamento", lead_temperature: "morno", next_action: "relacionar" });
  }

  if (isRemovedTopic(text)) {
    return makeResolution({
      facts: `Essa opção ou condição não está nas informações ativas que tenho aqui. Para conferir o que está disponível hoje, acesse o cardápio: ${links.menu}\n\nSe quiser confirmar direto com a equipe: ${links.whatsapp}`,
      intent: "item_inativo",
      topic: "cardapio",
      needs_human: true,
      lead_temperature: "morno",
      next_action: "cardapio_ou_whatsapp"
    });
  }

  if (includesAny(text, ["falar com atendente", "atendente humano", "falar com alguem", "falar com alguém", "humano", "pessoa da equipe", "chamar atendente"])) {
    return makeResolution({ facts: base.humano || `Claro. Fale direto com a equipe: ${links.whatsapp}`, intent: "humano", topic: "atendimento_humano", needs_human: true, lead_temperature: "quente", next_action: "whatsapp" });
  }

  if (includesAny(text, ["vaga", "emprego", "curriculo", "currículo", "freelance", "garcom", "garçom", "garconete", "garçonete", "cumim", "trabalhar com voces", "trabalhar com vocês"])) {
    return makeResolution({
      facts: base.vaga || `Para oportunidades de trabalho no Sr. Boteco, envie seu currículo diretamente para o RH do restaurante pelo WhatsApp:\n\n📲 ${links.jobs}\n\nEla fará a análise do seu perfil e entrará em contato caso surja uma oportunidade compatível com sua experiência.\n\nAgradecemos o seu interesse em fazer parte da equipe do Sr. Boteco!`,
      intent: "vaga",
      topic: "rh",
      needs_human: true,
      lead_temperature: "morno",
      next_action: "whatsapp_vagas"
    });
  }

  if (includesAny(text, ["cardapio", "menu", "opcoes", "opções", "o que tem", "comidas", "pratos", "ver cardapio", "ver o cardapio"])) {
    return makeResolution({ facts: base.cardapio || `Cardápio/pedido: ${links.menu}`, intent: "cardapio", topic: "cardapio", lead_temperature: "quente", next_action: "abrir_cardapio" });
  }

  if (includesAny(text, ["fazer pedido", "quero pedir", "queria fazer um pedido", "pedido", "pedir para retirar", "retirada", "retirar no local", "take away"])) {
    return makeResolution({ facts: base.pedido || `Faça seu pedido por aqui: ${links.menu}`, intent: "pedido", topic: "pedido", lead_temperature: "quente", next_action: "fazer_pedido" });
  }

  if (includesAny(text, ["delivery", "entrega", "ifood", "i food", "99food", "99 food", "entregam", "faz entrega", "pedir em casa"])) {
    return makeResolution({ facts: base.delivery || `Pedido direto: ${links.menu}\niFood: ${links.ifood}\n99Food: ${links.food99}`, intent: "delivery", topic: "pedido", lead_temperature: "quente", next_action: "delivery" });
  }

  if (includesAny(text, ["reservar", "reserva", "mesa", "aniversario", "aniversário", "grupo", "evento", "confraternizacao", "confraternização"])) {
    return makeResolution({
      facts: base.reserva || "Para adiantar sua reserva, me passe nome, dia/data, horário e quantas pessoas. A equipe faz a confirmação final.",
      intent: "reserva",
      topic: "reserva",
      needs_human: true,
      lead_temperature: "quente",
      missing_fields: ["nome", "data", "horario", "quantidade_pessoas"],
      next_action: "coletar_reserva"
    });
  }

  if (includesAny(text, ["pagamento", "aceita cartao", "cartao", "pix", "vale refeicao", "vale alimentação", "vale alimentacao", "alelo", "pluxee", "vr", "ticket"])) {
    const p = knowledge?.formas_pagamento;
    const facts = `Aceitamos dinheiro, cartão de crédito, cartão de débito e Pix. Também aceitamos vale refeição Alelo, Pluxee, VR e Ticket. Não aceitamos vale alimentação.`;
    return makeResolution({ facts: p?.regra ? facts : facts, intent: "pagamento", topic: "pagamento", lead_temperature: "morno", next_action: "responder" });
  }

  if (includesAny(text, ["onde fica", "localizacao", "localização", "endereco", "endereço", "shopping", "como chegar"])) {
    return makeResolution({ facts: `${base.localizacao || "Ficamos no Pátio Limeira Shopping."}\n\nSe quiser falar com a equipe: ${links.whatsapp}`, intent: "localizacao", topic: "localizacao", lead_temperature: "quente", next_action: "visita" });
  }

  if (includesAny(text, ["horario", "horário", "que horas abre", "que horas fecha", "funcionamento", "aberto hoje", "fecha que horas", "cozinha fecha"])) {
    return makeResolution({ facts: base.horario || knowledge?.horarios?.funcionamento || "Funcionamos todos os dias das 11h às 22h.", intent: "horario", topic: "horario", lead_temperature: "quente", next_action: "visita" });
  }

  const contextItem = findCatalogItemById(context?.last_topic, knowledge);
  const isShortFollowUp = isPriceQuestion(text) || isServingQuestion(text) || includesAny(text, ["o que acompanha", "acompanha o que", "o que vem", "vem o que", "qual tamanho", "e esse", "e essa", "quanto"]);
  if (contextItem && isShortFollowUp) {
    const itemFacts = formatCatalogItem(contextItem, message, links);
    return makeResolution({ facts: itemFacts.facts, intent: "item_cardapio", topic: contextItem.id || "item_cardapio", needs_human: itemFacts.needs_human, lead_temperature: "quente", missing_fields: itemFacts.missing_fields, next_action: itemFacts.needs_human ? "whatsapp" : "fazer_pedido" });
  }

  if (safeText(context?.last_topic).startsWith("item:") && isShortFollowUp) {
    const label = safeText(context.last_topic).replace(/^item:/, "").replace(/_/g, " ");
    return makeResolution({
      facts: `Sobre ${label}: não tenho preço, composição ou porção validados na base e não vou arriscar. Confira o cardápio atualizado em ${links.menu}. Para confirmar esse detalhe com a equipe no WhatsApp: ${links.whatsapp}`,
      intent: "item_nao_encontrado",
      topic: context.last_topic,
      needs_human: true,
      lead_temperature: "quente",
      missing_fields: ["item_validado"],
      next_action: "cardapio_ou_whatsapp"
    });
  }

  if (includesAny(text, ["hamburguer em dobro", "hambúrguer em dobro", "burger em dobro", "double burger", "compre 1 ganhe 1", "compra 1 ganha outro"])) {
    const c = knowledge?.campanhas_ativas?.hamburguer_em_dobro;
    return makeResolution({ facts: `${c?.descricao || "Toda terça-feira, compra 1 hambúrguer e ganha outro."}\n${c?.validade || "Terças-feiras, das 16h às 21h."}\n\nAs opções participantes devem ser conferidas no cardápio: ${links.menu}`, intent: "promocao_burger", topic: "burger", lead_temperature: "quente", next_action: "abrir_cardapio" });
  }

  if (includesAny(text, ["feijoada"])) {
    const c = knowledge?.campanhas_ativas?.feijoada;
    return makeResolution({ facts: `${c?.descricao || "Temos feijoada às quartas e sábados."}\n\nPara preço, composição ou disponibilidade do dia, confira o cardápio ${links.menu} ou fale com a equipe: ${links.whatsapp}`, intent: "feijoada", topic: "feijoada", needs_human: isPriceQuestion(text), lead_temperature: "quente", next_action: "abrir_cardapio" });
  }

  if (includesAny(text, ["happy hour"])) {
    const c = knowledge?.campanhas_ativas?.happy_hour;
    return makeResolution({ facts: `${c?.descricao || "Happy hour das 16h às 21h."}\n\nCardápio/pedido: ${links.menu}`, intent: "happy_hour", topic: "happy_hour", lead_temperature: "quente", next_action: "visita" });
  }

  const item = findCatalogItem(message, knowledge);
  if (item) {
    const itemFacts = formatCatalogItem(item, message, links);
    return makeResolution({ facts: itemFacts.facts, intent: "item_cardapio", topic: item.id || "item_cardapio", needs_human: itemFacts.needs_human, lead_temperature: "quente", missing_fields: itemFacts.missing_fields, next_action: itemFacts.needs_human ? "whatsapp" : "fazer_pedido" });
  }

  if (includesAny(text, ["almoco", "almoço", "executivo", "prato do dia"])) {
    return makeResolution({ facts: `${base.almoco || knowledge?.horarios?.almoco || "Almoço de segunda a sexta, das 11h às 15h."}\n\nCardápio/pedido: ${links.menu}`, intent: "almoco", topic: "almoco", lead_temperature: "quente", next_action: "abrir_cardapio" });
  }

  if (includesAny(text, ["burger", "burgers", "hamburguer", "hambúrguer", "porcao", "porção", "tabua", "tábua", "picanha", "carne", "frango", "kids", "sobremesa", "suco", "bebida", "cerveja", "chopp", "chope", "drinks", "drink"])) {
    return makeResolution({ facts: base.item_nao_encontrado || DEFAULT_FALLBACK, intent: "item_nao_encontrado", topic: inferUnknownItemTopic(text), needs_human: true, lead_temperature: "quente", missing_fields: ["item_validado"], next_action: "cardapio_ou_whatsapp" });
  }

  if (isPlayfulOffTopic(text)) {
    return makeResolution({
      facts: "Robux aqui não rola não 😄 Mas a brincadeira foi boa. Se quiser saber algo do Sr. Boteco, manda aí que eu te ajudo.",
      intent: "fora_contexto",
      topic: "relacionamento",
      needs_human: false,
      lead_temperature: "frio",
      next_action: "relacionar"
    });
  }

  if (includesAny(text, ["tchau", "obrigado", "obrigada", "valeu", "ate mais", "até mais"])) {
    return makeResolution({ facts: base.despedida || "Foi um prazer te atender. Quando quiser, é só chamar.", intent: "despedida", topic: "relacionamento", lead_temperature: "frio", next_action: "encerrar" });
  }

  if (isGreetingOnly(text)) {
    return makeResolution({ facts: base.saudacao || "Que bom falar com você. Como posso te ajudar hoje?", intent: "saudacao", topic: "inicio", lead_temperature: "morno", next_action: "descobrir_interesse" });
  }

  const contextHint = context?.last_topic || context?.last_intent;
  return makeResolution({
    facts: `${base.fallback || DEFAULT_FALLBACK}${contextHint ? `\n\nSe sua dúvida continua sobre ${safeText(contextHint, 60)}, me diga o item ou detalhe que você quer confirmar.` : ""}`,
    intent: "outro",
    topic: "fallback",
    needs_human: true,
    lead_temperature: "morno",
    missing_fields: ["informacao_validada"],
    next_action: "cardapio_ou_whatsapp"
  });
}

function collectAllowedPrices(knowledge) {
  const raw = JSON.stringify(knowledge || {});
  const matches = raw.match(/R\$\s*\d{1,4}(?:\.\d{3})*,\d{2}/g) || [];
  return new Set(matches.map(canonicalizePrice));
}

function canonicalizePrice(value) {
  return String(value || "").toUpperCase().replace(/\s+/g, "").trim();
}

function containsInventedPrice(text, allowed) {
  const matches = String(text || "").match(/R\$\s*\d{1,4}(?:\.\d{3})*,\d{2}/gi) || [];
  return matches.some((m) => !allowed.has(canonicalizePrice(m)));
}

function containsUnapprovedUrl(text, allowedUrls) {
  const urls = String(text || "").match(/https:\/\/[^\s)\]}>]+/gi) || [];
  const allowed = new Set((allowedUrls || []).filter(Boolean).map((url) => String(url).replace(/[.,;!?]+$/, "")));
  return urls.some((url) => !allowed.has(url.replace(/[.,;!?]+$/, "")));
}

function containsRemovedInfo(text) {
  const normalized = normalizeText(text);
  const removedCampaign = normalized.includes("open") && includesAny(normalized, ["chopp", "chope"]);
  const removedSweetFondue = includesAny(normalized, ["fondue", "fundi", "fundue", "fondi"]) && normalized.includes("doce");
  return removedCampaign || removedSweetFondue;
}

function ensurePersonalized(reply, customer) {
  const name = safeText(customer?.first_name || "", 50);
  if (!name) return reply;
  const nReply = normalizeText(reply);
  const nName = normalizeText(name);
  if (nName && nReply.includes(nName)) return reply;
  return `${name}, ${reply.charAt(0).toLowerCase()}${reply.slice(1)}`;
}

async function callOpenAI({ knowledge, customer, context, message, resolved, eventType }) {
  if (!process.env.OPENAI_API_KEY) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const payload = {
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: buildSystemPrompt({ eventType, channel: customer.channel }) },
        {
          role: "user",
          content: JSON.stringify({
            cliente: customer,
            contexto: context,
            mensagem: message,
            event_type: eventType,
            canal: customer.channel,
            intent_detectado: resolved.intent,
            topico_detectado: resolved.topic,
            fatos_para_esta_resposta: resolved.facts,
            campos_pendentes: resolved.missing_fields,
            proxima_acao: resolved.next_action
          })
        }
      ],
      response_format: { type: "json_object" }
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`OpenAI HTTP ${response.status}: ${body.slice(0, 250)}`);
    }

    const data = await response.json();
    const content = safeText(data?.choices?.[0]?.message?.content || "", 2200);
    if (!content) return null;

    try {
      const parsed = JSON.parse(content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
      return safeText(parsed?.reply || "", 2200) || null;
    } catch {
      return null;
    }
  } catch (error) {
    console.error("OPENAI_REPLY_ERROR", error?.message || error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function splitForInstagram(text) {
  const raw = safeText(text, INSTAGRAM_MAX_MESSAGE_LENGTH * INSTAGRAM_MAX_MESSAGE_PARTS);
  if (!raw) return [];
  if (raw.length <= INSTAGRAM_MAX_MESSAGE_LENGTH) return [raw];

  const parts = [];
  let remaining = raw;
  while (remaining.length && parts.length < INSTAGRAM_MAX_MESSAGE_PARTS) {
    if (remaining.length <= INSTAGRAM_MAX_MESSAGE_LENGTH) {
      parts.push(remaining.trim());
      break;
    }

    const slice = remaining.slice(0, INSTAGRAM_MAX_MESSAGE_LENGTH + 1);
    const breakAt = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf("\n"), slice.lastIndexOf(". "), slice.lastIndexOf(" "));
    const cut = breakAt > 350 ? breakAt + (slice[breakAt] === "." ? 1 : 0) : INSTAGRAM_MAX_MESSAGE_LENGTH;
    parts.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  if (remaining && parts.length === INSTAGRAM_MAX_MESSAGE_PARTS) {
    const last = parts.length - 1;
    parts[last] = `${parts[last].slice(0, Math.max(0, INSTAGRAM_MAX_MESSAGE_LENGTH - 3)).trim()}...`;
  }

  return parts.filter(Boolean);
}

export function splitForChannel(text, channel) {
  const normalizedChannel = safeText(channel || "instagram", 30).toLowerCase();
  if (normalizedChannel.includes("whatsapp") || normalizedChannel === "wa") {
    const single = safeText(text, 3500);
    return single ? [single] : [];
  }
  return splitForInstagram(text);
}

function buildStandardPayload({ reply, resolved, links, requestId, customer, handoff = false, handoffReason = "" }) {
  const parts = splitForChannel(reply, customer?.channel);
  return {
    ok: true,
    request_id: requestId,
    channel: customer?.channel || "instagram",
    handoff: Boolean(handoff),
    handoff_reason: handoffReason || "",
    reply,
    intent: resolved.intent,
    topic: resolved.topic,
    last_topic: resolved.topic,
    needs_human: resolved.needs_human,
    lead_temperature: resolved.lead_temperature,
    missing_fields: resolved.missing_fields,
    next_action: resolved.next_action,
    cardapio_link: links.menu,
    whatsapp_link: links.whatsapp,
    whatsapp_vagas_link: links.jobs,
    ifood_link: links.ifood,
    food99_link: links.food99,
    reply_part_1: parts[0] || "",
    reply_part_2: parts[1] || "",
    reply_part_3: parts[2] || "",
    messages: parts.map((part) => ({ type: "text", text: part }))
  };
}

function dynamicButtons(resolved, links) {
  const buttons = [];
  const add = (caption, url) => {
    if (url && !buttons.some((b) => b.url === url) && buttons.length < 3) buttons.push({ type: "url", caption, url });
  };

  if (["abrir_cardapio", "fazer_pedido", "cardapio_ou_whatsapp", "delivery"].includes(resolved.next_action)) add("Cardápio / Pedir", links.menu);
  if (resolved.next_action === "delivery") {
    add("iFood", links.ifood);
    add("99Food", links.food99);
  }
  if (resolved.next_action === "whatsapp_vagas") {
    add("Enviar currículo", links.jobs);
  } else if (resolved.needs_human || ["whatsapp", "cardapio_ou_whatsapp", "coletar_reserva"].includes(resolved.next_action)) {
    add("Falar no WhatsApp", links.whatsapp);
  }
  return buttons;
}

function buildDynamicBlock({ reply, resolved, links }) {
  const parts = splitForInstagram(reply);
  const buttons = dynamicButtons(resolved, links);
  const messages = parts.map((text, index) => ({
    type: "text",
    text,
    ...(index === parts.length - 1 && buttons.length ? { buttons } : {})
  }));

  return {
    version: "v2",
    content: {
      type: "instagram",
      messages,
      actions: [
        { action: "set_field_value", field_name: "ai_intent", value: resolved.intent },
        { action: "set_field_value", field_name: "ai_topic", value: resolved.topic },
        { action: "set_field_value", field_name: "ai_lead_temperature", value: resolved.lead_temperature },
        { action: "set_field_value", field_name: "ai_next_action", value: resolved.next_action },
        { action: "set_field_value", field_name: "ai_needs_human", value: Boolean(resolved.needs_human) }
      ],
      quick_replies: []
    }
  };
}

function wantsDynamicMode(req, body) {
  const mode = safeText(body?.response_mode || body?.mode || req?.query?.mode || "", 30).toLowerCase();
  return ["dynamic", "dynamic_block", "manychat_dynamic"].includes(mode);
}

export default async function handler(req, res) {
  const requestId = crypto.randomUUID();
  let customer = null;
  try {
    if (req.method === "OPTIONS") {
      setJsonHeaders(res);
      return res.status(204).end();
    }

    if (req.method === "GET") {
      return send(res, 200, {
        ok: true,
        service: "sdr-boteco",
        version: "2.1.0",
        channels: ["instagram", "whatsapp"],
        message: "Webhook online. Use POST para conversar.",
        openai_configured: Boolean(process.env.OPENAI_API_KEY),
        model: process.env.OPENAI_MODEL || "gpt-4o"
      });
    }

    if (req.method !== "POST") return send(res, 405, { ok: false, error: "Método não permitido. Use POST." });
    if (!isAuthorized(req)) return send(res, 401, { ok: false, error: "Não autorizado. Verifique WEBHOOK_SECRET." });

    const body = req.body || {};
    customer = extractCustomer(body);

    if (isWhatsapp(customer) && humanIsHandling(body)) {
      return send(res, 200, {
        ok: true,
        request_id: requestId,
        channel: "whatsapp",
        reply: "",
        intent: "humano_ativo",
        topic: "atendimento_humano",
        last_topic: "atendimento_humano",
        handoff: true,
        handoff_reason: "humano_ativo",
        needs_human: true,
        lead_temperature: "quente",
        missing_fields: [],
        next_action: "silencio_humano",
        messages: [],
        reply_part_1: "",
        reply_part_2: "",
        reply_part_3: ""
      });
    }

    const knowledge = await loadKnowledge();
    const links = getLinks(knowledge);
    const context = extractConversationContext(body);
    const eventType = safeText(body?.event_type || body?.custom_fields?.event_type || "direct", 50).toLowerCase() || "direct";
    const message = extractMessage(body) || inferMessageFromEvent(body);

    const resolved = message
      ? resolveIntent(message, knowledge, context)
      : makeResolution({
          facts: `Quero te ajudar sem te passar nada errado. Você pode me dizer o que deseja saber? Se preferir, veja o cardápio em ${links.menu} ou fale com a equipe: ${links.whatsapp}`,
          intent: "sem_mensagem",
          topic: "fallback",
          needs_human: false,
          lead_temperature: "morno",
          next_action: "descobrir_interesse"
        });

    let handoff = false;
    let handoffReason = "";
    if (isWhatsapp(customer)) {
      if (resolved.intent === "vaga") {
        // No WhatsApp, vaga é resolvida pelo link dedicado do RH e não entra na fila do atendimento geral.
        resolved.needs_human = false;
      }

      const reason = whatsappHandoffReason(resolved, normalizeText(message));
      if (reason) {
        handoff = true;
        handoffReason = reason;
        resolved.needs_human = true;
        resolved.next_action = "handoff_humano";
        const handoffText = knowledge?.respostas_base?.handoff_humano || "Vou chamar alguém da equipe pra continuar seu atendimento por aqui.";
        if (!normalizeText(resolved.facts).includes(normalizeText(handoffText))) {
          resolved.facts = `${resolved.facts}\n\n${handoffText}`;
        }
      }
    }

    const allowedPrices = collectAllowedPrices(resolved.facts);
    const shouldHumanizeWithAI = message && resolved.intent !== "vaga";
    const aiReply = shouldHumanizeWithAI ? await callOpenAI({ knowledge, customer, context, message, resolved, eventType }) : null;

    let finalReply = aiReply || resolved.facts || knowledge?.respostas_base?.fallback || DEFAULT_FALLBACK;
    const allowedUrls = [links.menu, links.whatsapp, links.ifood, links.food99, links.jobs, knowledge?.links?.site_oficial].filter(Boolean);
    if (containsInventedPrice(finalReply, allowedPrices) || containsUnapprovedUrl(finalReply, allowedUrls) || containsRemovedInfo(finalReply)) {
      finalReply = resolved.facts || knowledge?.respostas_base?.fallback || DEFAULT_FALLBACK;
    }

    finalReply = ensurePersonalized(safeText(finalReply, 2600), customer);

    if (!isWhatsapp(customer) && wantsDynamicMode(req, body)) {
      return send(res, 200, buildDynamicBlock({ reply: finalReply, resolved, links }));
    }

    return send(res, 200, buildStandardPayload({ reply: finalReply, resolved, links, requestId, customer, handoff, handoffReason }));
  } catch (error) {
    console.error("BOT_FATAL_ERROR", requestId, error);
    const fallback = `Não quero te passar nenhuma informação errada. Confira o cardápio em ${DEFAULT_MENU_LINK} ou fale com a equipe: ${DEFAULT_WHATSAPP_LINK}`;
    const channel = customer?.channel || "instagram";
    const parts = splitForChannel(fallback, channel);
    return send(res, 200, {
      ok: false,
      request_id: requestId,
      channel,
      handoff: false,
      handoff_reason: "",
      reply: fallback,
      intent: "erro_seguro",
      topic: "fallback",
      last_topic: "fallback",
      needs_human: true,
      lead_temperature: "quente",
      missing_fields: ["erro_temporario"],
      next_action: "whatsapp",
      cardapio_link: DEFAULT_MENU_LINK,
      whatsapp_link: DEFAULT_WHATSAPP_LINK,
      reply_part_1: parts[0] || "",
      reply_part_2: parts[1] || "",
      reply_part_3: parts[2] || "",
      messages: parts.map((text) => ({ type: "text", text }))
    });
  }
}
