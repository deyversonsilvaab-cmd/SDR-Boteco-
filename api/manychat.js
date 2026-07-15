import OpenAI from "openai";
import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_FALLBACK = "Vou confirmar com a equipe para não te passar nenhuma informação errada e já te retorno 😊";
const DEFAULT_WHATSAPP_LINK = "https://wa.me/5519997858351";
const INSTAGRAM_MAX_MESSAGE_LENGTH = 900;
const INSTAGRAM_MAX_MESSAGE_PARTS = 3;

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
          raw = JSON.stringify(body || {}).slice(0, 12000);
    } catch {
          raw = "";
    }
    const text = normalizeText(raw);
    return includesAny(text, terms);
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

  if (includesAny(eventText, ["marcacao_story", "story_mention", "story mention", "mentioned in story", "mencionou", "marcou no story"]) ||
          bodyContains(body, ["marcacao_story", "story_mention", "story mention", "mentioned in story", "mencionou voce no proprio story", "mencionou você no próprio story", "marcou no story"])) {
        return "mencionou você no próprio story";
  }

  if (includesAny(eventText, ["comment", "comentario", "comentário"]) || bodyContains(body, ["instagram_comment", "comentario no post", "comentário no post"])) {
        return safeText(body?.comment_text || body?.comment || body?.custom_fields?.comment_text || body?.custom_fields?.comment || "comentário no post");
  }

  return "";
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

function mentionsFondue(text) {
    return includesAny(text, [
          "fondue",
          "fundi",
          "fundue",
          "fondi",
          "fondue salgado",
          "fondue doce",
          "noite de fondue"
        ]);
}

function isFonduePortionQuestion(text) {
    return includesAny(text, [
          "valor por pessoa ou casal",
          "valor por pessoa ou o casal",
          "preco por pessoa ou casal",
          "preco por pessoa ou o casal",
          "preço por pessoa ou casal",
          "preço por pessoa ou o casal",
          "esse valor e pro casal",
          "esse valor é pro casal",
          "valor e pro casal",
          "valor é pro casal",
          "valor pro casal",
          "valor para casal",
          "e para casal",
          "é para casal",
          "e pro casal",
          "é pro casal",
          "por pessoa ou casal",
          "e por pessoa",
          "é por pessoa",
          "serve 2 pessoas",
          "serve duas pessoas",
          "serve para 2 pessoas",
          "serve para duas pessoas",
          "2 pessoas e isso",
          "2 pessoas é isso",
          "duas pessoas e isso",
          "duas pessoas é isso",
          "para quantas pessoas",
          "quantas pessoas serve",
          "serve quantos",
          "serve quantas",
          "prato para 2",
          "prato para duas",
          "individual",
          "para os dois",
          "serve os dois",
          "serve para os dois"
        ]);
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

function mentionsPaymentOrVoucher(text) {
    const terms = [
        "aceita cartao",
        "aceita cartão",
        "passa cartao",
        "passa cartão",
        "credito",
        "crédito",
        "debito",
        "débito",
        "pix",
        "forma de pagamento",
        "formas de pagamento",
        "vale refeicao",
        "vale refeição",
        "vale alimentacao",
        "vale alimentação",
        "alelo",
        "pluxee",
        "sodexo",
        "ticket restaurante",
        "ticket alimentacao",
        "ticket"
    ];
    if (includesAny(text, terms)) return true;
    return /\bvr\b/.test(text);
}

function looksLikeScoreGuess(text) {
    return /\b\d+\s*x\s*\d+\b/.test(text) || /\bbrasil\b.*\d+.*\d+/.test(text);
}

function getAdReply(knowledge, key, fallback = DEFAULT_FALLBACK) {
    return knowledge?.respostas_anuncio_open_chopp?.[key] || knowledge?.respostas_rapidas?.[`anuncio_${key}`] || fallback;
}

function normalizePriceString(value) {
    return String(value || "").replace(/\s+/g, "").toUpperCase();
}

function collectAllowedPrices(knowledge) {
    const allowed = new Set();
    const walk = (node) => {
          if (typeof node === "string") {
                  const matches = node.match(/R\$\s?\d{1,3}(?:\.\d{3})*,\d{2}/g);
                  if (matches) matches.forEach((match) => allowed.add(normalizePriceString(match)));
          } else if (Array.isArray(node)) {
                  node.forEach(walk);
          } else if (node && typeof node === "object") {
                  Object.values(node).forEach(walk);
          }
    };
    walk(knowledge);
    return allowed;
}

function extractPricesFromText(text) {
    const matches = String(text || "").match(/R\$\s?\d{1,3}(?:\.\d{3})*,\d{2}/g);
    return matches ? matches.map(normalizePriceString) : [];
}

function containsInventedPrice(text, allowedPrices) {
    const pricesInText = extractPricesFromText(text);
    return pricesInText.some((price) => !allowedPrices.has(price));
}

function getWhatsappLink(knowledge) {
        return (
                    knowledge?.empresa?.whatsapp_link ||
                    knowledge?.links?.whatsapp ||
                    DEFAULT_WHATSAPP_LINK
                );
}

function hasWhatsappLink(text) {
        return /wa\.me\//i.test(String(text || ""));
}

function ensureWhatsappHandoff(text, knowledge) {
        const base = String(text || "").trim();
        if (hasWhatsappLink(base)) return base;
        const link = getWhatsappLink(knowledge);
        const linha = `Para um atendimento mais rápido, com mais atenção ou para confirmar disponibilidade, fala com a nossa equipe no WhatsApp: ${link}`;
        return base ? `${base}\n\n📲 ${linha}` : `📲 ${linha}`;
}

function splitForInstagram(text, maxLen = INSTAGRAM_MAX_MESSAGE_LENGTH, maxParts = INSTAGRAM_MAX_MESSAGE_PARTS) {
    const clean = String(text || "").trim();
    if (!clean) return [];

  const paragraphs = clean.split(/\n{2,}/);
    const parts = [];
    let current = "";

  const pushCurrent = () => {
        if (current) {
                parts.push(current.trim());
                current = "";
        }
  };

  for (const paragraph of paragraphs) {
        const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
        if (candidate.length <= maxLen) {
                current = candidate;
                continue;
        }

      pushCurrent();

      if (paragraph.length <= maxLen) {
              current = paragraph;
              continue;
      }

      let remaining = paragraph;
        while (remaining.length > maxLen) {
                let cut = remaining.lastIndexOf(" ", maxLen);
                if (cut <= 0) cut = maxLen;
                parts.push(remaining.slice(0, cut).trim());
                remaining = remaining.slice(cut).trim();
        }
        current = remaining;
  }

  pushCurrent();

  if (parts.length > maxParts) {
        const head = parts.slice(0, maxParts - 1);
        const tail = parts.slice(maxParts - 1).join("\n\n");
        head.push(tail.length <= maxLen ? tail : `${tail.slice(0, maxLen - 1).trim()}…`);
        return head;
  }

  return parts;
}

function resolveIntent(message, knowledge, context = {}) {
    const text = normalizeText(message);
    const lastIntent = normalizeText(context.last_intent || "");
    const lastTopic = normalizeText(context.last_topic || "");
    const respostas = knowledge.respostas_rapidas || {};
    const priceQuestion = isPriceQuestion(text);
    const priceOnlyQuestion = isPriceOnlyQuestion(text);
    const openContext = includesAny(lastIntent, ["open_chopp", "open chopp", "anuncio_open_chopp"]) || includesAny(lastTopic, ["open_chopp", "open chopp", "anuncio_open_chopp", "jogo", "placar"]);
    const fondueContext = mentionsFondue(text) || includesAny(lastIntent, ["fondue", "fondue_valor_porcoes"]) || includesAny(lastTopic, ["fondue", "fondue_valor_porcoes"]);

  const saudacaoInicial = [
        "oi", "ola", "olá", "oii", "oie", "opa", "eae", "e ai", "e aí",
        "bom dia", "boa tarde", "boa noite", "tudo bem", "tudo bom",
        "oi tudo bem", "ola tudo bem", "oi bom dia", "oi boa tarde", "oi boa noite"
      ];
    if (saudacaoInicial.includes(text)) {
          return { facts: respostas.saudacao_inicial || DEFAULT_FALLBACK, intent: "saudacao", needs_human: false, lead_temperature: "morno", missing_fields: [] };
    }

  const despedida = [
        "obrigado", "obrigada", "muito obrigado", "muito obrigada", "valeu",
        "falou", "tchau", "ate mais", "até mais", "ok obrigado", "ok obrigada",
        "blz", "beleza obrigado", "obrigado viu", "obrigada viu"
      ];
    if (despedida.includes(text)) {
          return { facts: respostas.despedida || DEFAULT_FALLBACK, intent: "despedida", needs_human: false, lead_temperature: "morno", missing_fields: [] };
    }

  // Respostas específicas da campanha de tráfego pago: Open Chopp + jogo/desafio.
  // Essas regras ficam antes das regras genéricas para evitar fatos fora do contexto.
  // IMPORTANTE: os textos abaixo NÃO são mais enviados diretamente ao cliente. Eles agora
  // servem como "facts" (fatos oficiais) que serão passados como contexto para a IA, que
  // escreve a resposta final de forma humana, natural e variada.
  if (looksLikeScoreGuess(text)) {
        return { facts: getAdReply(knowledge, "comentario_palpite"), intent: "palpite_placar", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["como funciona o desafio", "desafio do placar", "como funciona o placar", "como participa", "como participar", "palpite", "acertar o placar", "placar do jogo"])) {
        return { facts: getAdReply(knowledge, "desafio_placar"), intent: "desafio_placar", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["pode comentar mais de uma vez", "mais de uma vez", "quantos palpites", "1 palpite", "um palpite", "varios palpites", "vários palpites"])) {
        return { facts: getAdReply(knowledge, "um_palpite_por_perfil"), intent: "regra_desafio", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["duas pessoas acertarem", "duas pessoas acertar", "mais de uma pessoa acertar", "se empatar", "quem ganha se", "ordem dos comentarios", "ordem dos comentários"])) {
        return { facts: getAdReply(knowledge, "duas_pessoas_acertarem"), intent: "regra_desafio", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["ate que horas posso comentar", "até que horas posso comentar", "posso comentar ate", "posso comentar até", "comentarios ate", "comentários até", "palpite ate", "palpite até", "inicio do jogo", "início do jogo"])) {
        return { facts: getAdReply(knowledge, "ate_quando_comentar"), intent: "regra_desafio", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["premio", "prêmio", "ganhador", "ganha o que", "vale para quando", "open gratis", "open grátis", "open chopp gratis", "open chopp grátis"])) {
        return { facts: getAdReply(knowledge, "premio_quando"), intent: "regra_desafio", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  // Mantém o contexto do Fondue quando o cliente pergunta se o valor é por pessoa/casal
  // ou para quantas pessoas o prato serve. Essa regra evita puxar fatos de Open Chopp, jogo ou combo.
  if (isFonduePortionQuestion(text) && (fondueContext || (!openContext && !includesAny(text, ["open", "chopp", "combo", "frango", "calabresa", "jogo", "placar"])))) {
        return {
                facts: respostas.fondue_valor_porcoes || DEFAULT_FALLBACK,
                intent: "fondue_valor_porcoes",
                needs_human: false,
                lead_temperature: "quente",
                missing_fields: []
        };
  }

  if ((priceQuestion || includesAny(text, ["valor do fondue", "preco do fondue", "preço do fondue", "qual valor do fondue", "quanto custa o fondue"])) && fondueContext) {
        return {
                facts: respostas.fondue_valores || respostas.fondue_valor_porcoes || respostas.fondue || DEFAULT_FALLBACK,
                intent: "fondue_valor_porcoes",
                needs_human: false,
                lead_temperature: "quente",
                missing_fields: []
        };
  }

  if (includesAny(text, ["o que vem no combo", "combo", "frango a passarinho", "calabresa", "frango com calabresa"])) {
        return { facts: getAdReply(knowledge, "combo_itens"), intent: "combo_jogo", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["serve quantas pessoas", "serve quantos", "serve quantas", "da para quantas pessoas", "dá para quantas pessoas", "quantas pessoas serve"])) {
        return { facts: getAdReply(knowledge, "serve_quantas_pessoas"), intent: "combo_jogo", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["outras porcoes", "outras porções", "tem porcoes", "tem porções", "mais porcoes", "mais porções"])) {
        return { facts: getAdReply(knowledge, "outras_porcoes"), intent: "cardapio", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["crianca pode ir", "criança pode ir", "pode ir crianca", "pode ir criança", "leva crianca", "levar criança", "levar filho", "levar meu filho", "levar minha filha", "ir com filho", "ir com minha filha", "ir com criança", "ir com a criança", "familia com crianca", "família com criança"])) {
        return { facts: getAdReply(knowledge, "crianca"), intent: "familia", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["familia", "família", "levar familia", "levar família", "com familia", "com família"])) {
        return { facts: getAdReply(knowledge, "familia"), intent: "familia", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["casal ou turma", "casal", "turma", "amigos", "grupo de amigos"]) && !includesAny(text, ["empresa", "reserva", "mesa", "levar", "vou levar", "quero levar"])) {
        return { facts: getAdReply(knowledge, "casal_ou_turma"), intent: "perfil_publico", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["aniversario", "aniversário", "comemorar aniversario", "comemorar aniversário", "niver", "festa de aniversario", "festa de aniversário"])) {
        return { facts: getAdReply(knowledge, "aniversario"), intent: "aniversario", needs_human: true, lead_temperature: "quente", missing_fields: ["data", "quantidade_pessoas"] };
  }

  if (includesAny(text, ["precisa reservar", "tem que reservar", "preciso reservar", "reserva obrigatoria", "reserva obrigatória"])) {
        return { facts: getAdReply(knowledge, "precisa_reservar"), intent: "reserva", needs_human: true, lead_temperature: "quente", missing_fields: ["quantidade_pessoas"] };
  }

  if (includesAny(text, ["tem mesa para hoje", "mesa para hoje", "tem mesa hoje", "mesa hoje", "disponibilidade hoje", "lugar para hoje"])) {
        return { facts: getAdReply(knowledge, "mesa_hoje"), intent: "reserva", needs_human: true, lead_temperature: "quente", missing_fields: [] };
  }

      if (mentionsPaymentOrVoucher(text)) {
        return { facts: getAdReply(knowledge, "aceita_cartao"), intent: "pagamento", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["tem taxa", "taxa", "10%", "dez por cento", "taxa de servico", "taxa de serviço"])) {
        return { facts: getAdReply(knowledge, "tem_taxa"), intent: "taxa", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["open individual", "open chopp individual", "e individual", "é individual", "por pessoa"])) {
        return { facts: getAdReply(knowledge, "open_individual"), intent: "open_chopp", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["pode dividir o open", "dividir o open", "compartilhar open", "dividir open chopp", "pode compartilhar"])) {
        return { facts: getAdReply(knowledge, "pode_dividir_open"), intent: "open_chopp", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["so quero comer", "só quero comer", "posso so comer", "posso só comer", "ir so para comer", "ir só para comer", "nao vou beber", "não vou beber"])) {
        return { facts: getAdReply(knowledge, "so_comer"), intent: "cardapio", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["open vale no almoco", "open vale no almoço", "open no almoco", "open no almoço", "open chopp no almoco", "open chopp no almoço"])) {
        return { facts: getAdReply(knowledge, "open_no_almoco"), intent: "open_chopp", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["quero levar uma turma", "levar turma", "vou levar uma turma", "ir em grupo", "grupo grande", "mesa para grupo"])) {
        return { facts: getAdReply(knowledge, "levar_turma"), intent: "grupo", needs_human: true, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["happy hour da empresa", "happy hour de empresa", "happy hour para empresa", "equipe da empresa", "empresa no happy", "confraternizacao da empresa", "confraternização da empresa"])) {
        return { facts: getAdReply(knowledge, "happy_hour_empresa"), intent: "empresa_b2b", needs_human: true, lead_temperature: "quente", missing_fields: ["nome_empresa", "quantidade_pessoas"] };
  }

  if (includesAny(text, ["chegando mais tarde", "chegar mais tarde", "se chegar mais tarde", "ate as 21", "até as 21", "ate 21h", "até 21h"])) {
        return { facts: getAdReply(knowledge, "chegar_mais_tarde"), intent: "open_chopp", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["open comeca", "open começa", "que horas comeca o open", "que horas começa o open", "open começa que horas", "open chopp começa", "horario do open", "horário do open"]) || (includesAny(text, ["que horas", "horario", "horário"]) && openContext)) {
        return { facts: getAdReply(knowledge, "open_comeca"), intent: "open_chopp", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (["eu vou", "vou", "to indo", "tô indo", "estou indo"].includes(text)) {
        return { facts: getAdReply(knowledge, "comentario_eu_vou"), intent: "comentario_anuncio", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["partiu", "bora", "bora boteco", "partiu boteco"])) {
        return { facts: getAdReply(knowledge, "comentario_partiu"), intent: "comentario_anuncio", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["mencionou voce no proprio story", "mencionou você no próprio story", "mencionou no story", "marcou no story", "marcou voce", "marcou você", "marcacao", "marcação", "story", "stories", "repost", "foto marcada", "marcou a gente"])) {
        return { facts: respostas.marcacao_story || DEFAULT_FALLBACK, intent: "marcacao_story", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (mentionsZeroAlcohol(text)) {
        return { facts: respostas.bebida_sem_alcool || respostas.bebidas || DEFAULT_FALLBACK, intent: "bebida_sem_alcool", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (mentionsOpenChopp(text) && includesAny(text, ["marca", "qual cerveja", "que cerveja", "cerveja do open", "marca do chopp", "marca do open"])) {    return { facts: respostas.open_chopp_marca || DEFAULT_FALLBACK, intent: "open_chopp_marca", needs_human: true, lead_temperature: "quente", missing_fields: [] };  }  if (includesAny(text, ["heineken", "brahma", "ashby", "canecao", "canecão", "caneca", "chopp individual", "chopp avulso", "chopp unitario", "chopp unitário", "marcas de chopp", "qual chopp voces tem", "qual chopp vocês tem", "chopp voces tem", "chopp vocês tem", "tipos de chopp"]) && !mentionsOpenChopp(text)) {    const chopMarcaFacts = (priceQuestion || priceOnlyQuestion) ? (respostas.chopp_marcas_valor || DEFAULT_FALLBACK) : (respostas.chopp_marcas || DEFAULT_FALLBACK);    return { facts: chopMarcaFacts, intent: "chopp_marca", needs_human: false, lead_temperature: "quente", missing_fields: [] };  }  if (mentionsOpenChopp(text) || (priceOnlyQuestion && openContext)) {
        const asksToday = includesAny(text, ["hoje", "tem hoje", "open hoje"]);
        const facts = asksToday
          ? getAdReply(knowledge, "open_chopp_hoje")
                : (priceQuestion || priceOnlyQuestion ? getAdReply(knowledge, "valor_open_chopp") : getAdReply(knowledge, "primeiro_contato_manychat"));
        return {
                facts,
                intent: "open_chopp",
                needs_human: false,
                lead_temperature: "quente",
                missing_fields: []
        };
  }

  if (includesAny(text, ["happy hour", "happy", "after", "fim de tarde", "depois do trabalho", "equipe no happy", "porcao no happy", "porção no happy"])) {
        return { facts: respostas.happy_hour || DEFAULT_FALLBACK, intent: "happy_hour", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["hamburguer em dobro", "hambúrguer em dobro", "double burger", "burger em dobro", "lanche em dobro", "compre 1 ganhe 1", "compra 1 ganha outro", "terca burger", "terça burger"])) {
        return { facts: respostas.double_burger || DEFAULT_FALLBACK, intent: "double_burger", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (mentionsFondue(text) || includesAny(text, ["dia dos namorados", "namorados"])) {
        return { facts: respostas.fondue || DEFAULT_FALLBACK, intent: "fondue", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["feijoada", "feijuca", "feijao", "feijão"])) {
        return { facts: respostas.feijoada || DEFAULT_FALLBACK, intent: "feijoada", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["almoco", "almoço", "prato do dia", "pratos do dia", "executivo", "executivos", "pf", "refeicao", "refeição", "almoco hoje", "almoço hoje", "prato comercial"])) {
        return { facts: respostas.almoco || DEFAULT_FALLBACK, intent: "almoco", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (priceQuestion) {
        return { facts: respostas.preco_cardapio || DEFAULT_FALLBACK, intent: "preco", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["guarana proteico", "guaraná proteico", "pure up", "pureup", "bebida proteica", "refri proteico", "refrigerante proteico", "proteico bebida"])) {return { facts: respostas.guarana_proteico || respostas.proteicos || DEFAULT_FALLBACK, intent: "proteico", needs_human: false, lead_temperature: "quente", missing_fields: [] };}if (includesAny(text, ["proteico", "proteica", "fitness", "fit", "saudavel", "saudável", "low carb", "frango power", "executivo proteico", "tilapia premium", "tilápia premium", "low carb supreme", "salada proteica", "tilapia fresh", "tilápia fresh", "prato saudavel", "prato saudável", "pratos proteicos", "cardapio fitness", "cardápio fitness"])) {return { facts: respostas.proteicos || DEFAULT_FALLBACK, intent: "proteico", needs_human: false, lead_temperature: "quente", missing_fields: [] };}if (includesAny(text, ["cardapio", "cardápio", "menu", "opcoes", "opções", "comidas", "pratos", "tem o que", "o que tem", "cardapio completo", "cardápio completo"])) {
        return { facts: respostas.cardapio || DEFAULT_FALLBACK, intent: "cardapio", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["onde fica", "aonde fica", "endereco", "endereço", "localizacao", "localização", "qual endereco", "qual endereço", "local", "shopping", "patio limeira", "pátio limeira"])) {
        return { facts: respostas.localizacao || DEFAULT_FALLBACK, intent: "localizacao", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["empresa", "empresas", "equipe", "colaboradores", "funcionarios", "funcionários", "corporativo", "almoço para empresa", "almoco para empresa", "happy hour para empresa", "servico para empresa", "serviço para empresa", "confraternizacao", "confraternização"])) {
        return { facts: respostas.empresa_b2b || DEFAULT_FALLBACK, intent: "empresa_b2b", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["estacionamento", "parking", "free parking", "estacionamento free", "estacionamento gratis", "estacionamento grátis"])) {
        return { facts: respostas.estacionamento || DEFAULT_FALLBACK, intent: "estacionamento", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["guarana", "guaraná", "coca", "coca cola", "refrigerante", "suco", "bebida", "agua", "água"]) && !includesAny(text, ["proteico", "proteica", "pure up", "pureup"])) {
        return { facts: respostas.bebidas || respostas.preco_cardapio || DEFAULT_FALLBACK, intent: "bebidas", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["entrega", "delivery", "ifood", "i food", "pedido", "pedir", "entregam", "faz entrega"])) {
        return { facts: respostas.delivery || DEFAULT_FALLBACK, intent: "ifood", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["atendente", "humano", "falar com atendente", "quero um atendente", "atendimento humano", "falar com humano", "quero falar com humano", "falar com uma pessoa", "falar com alguem", "falar com alguém", "atendente humano", "quero atendente", "quero falar com uma pessoa"]) && !includesAny(text, ["vaga", "vagas", "emprego", "trabalho", "trabalhar", "curriculo", "currículo", "contratacao", "contratação", "contratando", "processo seletivo", "freelance", "garcom", "garçom", "garconete", "garçonete", "cumim", "cumin"])) { return { facts: respostas.humano || DEFAULT_FALLBACK, intent: "humano", needs_human: true, lead_temperature: "morno", missing_fields: [] }; } if (includesAny(text, ["vaga", "vagas", "emprego", "trabalho", "trabalhar", "curriculo", "currículo", "contratacao", "contratação", "contratando", "processo seletivo", "vaga de emprego", "vaga de trabalho", "free lance", "freelance", "garcom", "garçom", "garconete", "garçonete", "cumim", "cumin"])) {
        return { facts: respostas.vaga || DEFAULT_FALLBACK, intent: "vaga", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["guarana proteico", "guaraná proteico", "pure up", "pureup", "bebida proteica", "refri proteico", "refrigerante proteico", "proteico bebida"])) {
        return { facts: respostas.guarana_proteico || respostas.proteicos || DEFAULT_FALLBACK, intent: "proteico", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["proteico", "proteica", "fitness", "fit", "saudavel", "saudável", "low carb", "frango power", "executivo proteico", "tilapia premium", "tilápia premium", "low carb supreme", "salada proteica", "tilapia fresh", "tilápia fresh", "prato saudavel", "prato saudável", "pratos proteicos", "cardapio fitness", "cardápio fitness"])) {
        return { facts: respostas.proteicos || DEFAULT_FALLBACK, intent: "proteico", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["rodizio", "rodízio", "rodisio", "rodizio de boteco", "rodízio de boteco", "como é esse rodizio", "como e esse rodizio", "como funciona o rodizio", "como é esse rodízio", "como funciona o rodízio"])) {
        return { facts: respostas.rodizio || respostas.rodizio_open_em_campo || DEFAULT_FALLBACK, intent: "rodizio", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["reserva", "reservar", "mesa", "aniversario", "aniversário", "grupo", "pessoas", "guardar mesa"])) {
        const facts = respostas.reserva || "O cliente quer reservar. É necessário coletar nome, telefone, data, horário e quantidade de pessoas para a equipe confirmar a disponibilidade.";
        return { facts, intent: "reserva", needs_human: true, lead_temperature: "quente", missing_fields: ["nome", "telefone", "data", "horario", "quantidade_pessoas"] };
  }

  if (includesAny(text, ["horario", "horário", "funcionamento", "abre", "aberto", "fecha", "que horas", "cozinha"])) {
        return { facts: respostas.horario || DEFAULT_FALLBACK, intent: "horario", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  return null;
}

function buildSystemPrompt(knowledge) {
    return `
    Você é atendente oficial do ${knowledge.empresa?.nome || process.env.BUSINESS_NAME || "Sr. Boteco Limeira"} no Instagram/WhatsApp.

    REGRAS:
    1. Nunca invente preço, produto, item de cardápio, promoção, horário, data, evento ou disponibilidade que não esteja na BASE_DE_CONHECIMENTO.
    2. Só informe preços existentes na BASE_DE_CONHECIMENTO, exatamente como estão escritos ali. Nunca calcule, arredonde ou estime um valor novo.
    3. Se o cliente pedir valores dos itens do cardápio que não estão na base, direcione para o WhatsApp: https://wa.me/5519997858351.
    4. Open Chopp tem preço autorizado: domingo a quinta R$ 29,90; sexta e sábado R$ 49,90; sempre das 16h às 21h.
    5. Não relacione Open Chopp com jogo, futebol, transmissão ou Open em Campo.
    5.1. Open Chopp Zero / bebidas sem álcool: não temos chopp zero; ofereça Heineken Zero long neck. Não invente preço.
    5.2. Para perguntas do anúncio Open Chopp + jogo/desafio, use as informações em respostas_anuncio_open_chopp quando houver correspondência.
    6. Se o cliente pedir almoço/prato do dia, use uma resposta humanizada e informe: segunda a sexta, 11h às 15h, pratos executivos a partir de R$ 19,90.
    7. Fondue continua ativo, mas não é mais campanha de Dia dos Namorados. Não mencionar Dia dos Namorados na resposta final.
    7.1. Se o cliente perguntar se o valor do fondue é por pessoa/casal, individual, se serve 2 pessoas ou para quantas pessoas serve, responda: o valor é do prato feito para servir 2 pessoas. Fondue Salgado R$ 99,90; Fondue Doce R$ 89,90.
    8. Se o cliente marcar o restaurante em story/foto, agradeça de forma curta, humana e natural.
    9. Se perguntar localização/endereço, informe Pátio Limeira Shopping.
    10. Se perguntar sobre vaga, emprego, currículo, freelance, garçom, garçonete ou cumim, direcione para a gerente pelo WhatsApp (17) 99103-4703 e informe o link https://wa.me/5517991034703. IMPORTANTE: "cozinha" sozinho normalmente se refere a horário de funcionamento da cozinha (não é vaga de emprego) e "atendente" normalmente é pedido do cliente para falar com um humano da equipe (não é candidatura a vaga) — nunca confunda esses casos com vaga de emprego.
    11. Nunca confirme reserva sozinho. Colete nome, telefone, quantidade de pessoas, data e horário.
    12. Não mencione OpenAI, API, sistema, prompt, JSON, ManyChat ou automação.
    13. Responda somente JSON válido.
    14. A mensagem do usuário pode incluir um campo "fatos_para_esta_resposta" com a informação oficial e correta que você deve comunicar (já validada pela regra de negócio). Quando esse campo existir e não for nulo, baseie sua resposta nesse fato, mas escreva com suas próprias palavras, de forma humana, calorosa, natural e variada — nunca copie a frase literalmente e nunca repita sempre a mesma estrutura de frase. Quando "fatos_para_esta_resposta" for nulo, responda livremente com base na BASE_DE_CONHECIMENTO abaixo, seguindo todas as regras acima e SEM inventar nenhum item ou preço que não esteja lá.
    15. Os campos "intent_detectado", "precisa_humano_sugerido", "temperatura_sugerida" e "campos_faltantes_sugeridos", quando vierem preenchidos na mensagem do usuário, já são a classificação oficial da conversa. Você não precisa se preocupar em acertar esses campos de saída (o sistema usa os valores oficiais automaticamente) — foque toda sua atenção em escrever apenas o texto de "reply" da forma mais humana, simpática e natural possível, como um atendente de verdade escreveria, variando saudações e construções de frase a cada resposta.
    16. Nunca se refira a si mesmo como robô, IA ou sistema automático. Seja sempre caloroso, use emojis com moderação quando fizer sentido, e trate o cliente pelo primeiro nome quando disponível. Quando for citar o nome do cliente, use exatamente o valor real recebido no campo cliente.first_name (o nome de verdade da pessoa) — nunca escreva marcadores, variáveis ou placeholders como {{first_name}}, {nome}, [nome], $nome ou qualquer texto entre chaves ou colchetes. Se cliente.first_name estiver vazio ou ausente, não mencione nome nenhum, apenas cumprimente de forma genérica e calorosa.
    17. Você é um atendente completo do restaurante: pode acolher saudações iniciais, tirar dúvidas sobre cardápio, horário, reservas, Open Chopp, fondue, delivery, vagas e despedidas, sempre com tom acolhedor, mas sempre restrito aos fatos da BASE_DE_CONHECIMENTO.
    18. Se não tiver certeza sobre algo (preço, item, disponibilidade), nunca arrisque um palpite: direcione o cliente para o WhatsApp da equipe.
    19. Sempre que a resposta envolver reserva de mesa, aniversário, grupo grande, evento corporativo, ou qualquer assunto fora da BASE_DE_CONHECIMENTO, o sistema já anexa automaticamente o link do WhatsApp da equipe ao final da mensagem. Você não precisa inserir o link manualmente nesses casos, apenas escreva a resposta normalmente.
    20. Sobre formas de pagamento: aceitamos dinheiro, cartão de crédito, cartão de débito, Pix e vale refeição das bandeiras Alelo, Pluxee, VR e Ticket. NÃO aceitamos vale alimentação em nenhuma bandeira. Nunca diga que aceitamos vale alimentação e nunca cite outras bandeiras de vale além dessas quatro.
21. Nunca repita a mesma frase, saudação ou estrutura de resposta em mensagens seguidas da mesma conversa. Se o cliente perguntar algo parecido de novo ou a conversa ficar repetitiva, varie as palavras, mude o ângulo da resposta ou direcione a conversa para outro canal (ex.: WhatsApp da equipe) para dar continuidade humana ao atendimento.
22. Toda a conversa deve manter um espírito comercial estratégico, sem ser insistente ou chato: sempre que fizer sentido, retome a disponibilidade de mesa/reserva e convide o cliente para vir conhecer o Sr. Boteco pessoalmente, para não perder o interesse de quem veio do anúncio/tráfego pago. Conduza a conversa com leveza, aproximando o cliente de uma visita ou reserva, sem forçar ou repetir esse convite de forma cansativa.

    FORMATO:
    {
      "reply": "mensagem final para o cliente, escrita de forma humana e natural",
        "intent": "preco|reserva|cardapio|horario|localizacao|ifood|fondue|fondue_valor_porcoes|vaga|almoco|proteico|rodizio|open_chopp|happy_hour|double_burger|feijoada|marcacao_story|empresa_b2b|estacionamento|bebidas|bebida_sem_alcool|desafio_placar|regra_desafio|combo_jogo|familia|pagamento|grupo|comentario_anuncio|palpite_placar|saudacao|despedida|humano|outro",
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

function buildMessagesPayload(replyText) {
    const parts = splitForInstagram(replyText);
    const safeParts = parts.length ? parts : [replyText];
    return {
          parts: safeParts,
          messages: safeParts.map((part) => ({ type: "text", text: part }))
    };
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
          const customerMessage = extractMessage(body) || inferMessageFromEvent(body);
          const customer = extractCustomer(body);
          const conversationContext = extractConversationContext(body);

      if (!customerMessage) {
              const noMsgReply = ensureWhatsappHandoff(DEFAULT_FALLBACK, null);
          const fallbackPayload = buildMessagesPayload(noMsgReply);
              return send(res, 200, {
                        ok: true,
                        reply: noMsgReply,
                        intent: "humano",
                        needs_human: true,
                        lead_temperature: "morno",
                        missing_fields: [],
                        reply_part_1: fallbackPayload.parts[0] || "",
                        reply_part_2: fallbackPayload.parts[1] || "",
                        reply_part_3: fallbackPayload.parts[2] || "",
                        messages: fallbackPayload.messages
              });
      }

      const knowledge = await loadKnowledge();
          const fallback = knowledge.resposta_fallback || DEFAULT_FALLBACK;
          const allowedPrices = collectAllowedPrices(knowledge);

      // "resolved" contém a detecção determinística de intenção/fatos (regras de negócio),
      // mas o texto final (reply) enviado ao cliente é SEMPRE gerado pela IA a seguir,
      // usando "resolved.facts" apenas como contexto/grounding — nunca como resposta pronta.
      const resolved = resolveIntent(customerMessage, knowledge, conversationContext);

      if (!process.env.OPENAI_API_KEY) {
              if (resolved) {
                        let degradedReply = resolved.facts;
                                  if (resolved.needs_human) degradedReply = ensureWhatsappHandoff(degradedReply, knowledge);
                                  const safePayload = buildMessagesPayload(degradedReply);
                        return send(res, 200, {
                                    ok: true,
                                                        reply: degradedReply,
                                    intent: resolved.intent,
                                    needs_human: resolved.needs_human,
                                    lead_temperature: resolved.lead_temperature,
                                    missing_fields: resolved.missing_fields,
                                    reply_part_1: safePayload.parts[0] || "",
                                    reply_part_2: safePayload.parts[1] || "",
                                    reply_part_3: safePayload.parts[2] || "",
                                    messages: safePayload.messages
                        });
              }
              return send(res, 500, { ok: false, error: "OPENAI_API_KEY não configurada na Vercel." });
      }

      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const response = await client.chat.completions.create({
                  model: process.env.OPENAI_MODEL || "gpt-4o",
                  messages: [
                    { role: "system", content: buildSystemPrompt(knowledge) },
                    {
                                role: "user",
                                content: JSON.stringify({
                                              cliente: customer,
                                              contexto: conversationContext,
                                              mensagem: customerMessage,
                                              intent_detectado: resolved?.intent || null,
                                              fatos_para_esta_resposta: resolved?.facts || null,
                                              precisa_humano_sugerido: resolved ? resolved.needs_human : null,
                                              temperatura_sugerida: resolved?.lead_temperature || null,
                                              campos_faltantes_sugeridos: resolved?.missing_fields || []
                                })
                    }
                          ],
                  response_format: { type: "json_object" },
                  temperature: 0.75
          });

      const parsed = parseJsonModelOutput(response.choices?.[0]?.message?.content, resolved?.facts || fallback);

      // Trava de segurança: se a IA mencionar algum valor em R$ que não existe na base de
      // conhecimento, a resposta é descartada e substituída por um fato oficial (ou fallback
      // seguro), para nunca entregar um preço inventado ao cliente.
      let finalReplyText = parsed.reply;
          const invented = containsInventedPrice(finalReplyText, allowedPrices);
                    if (invented) {
                                        finalReplyText = (resolved && typeof resolved.facts === "string" && resolved.facts) || fallback;
                    }

                    const needsHumanFinal = resolved ? resolved.needs_human : true;
                    if (needsHumanFinal || invented) {
                                        finalReplyText = ensureWhatsappHandoff(finalReplyText, knowledge);
                    }

      const result = resolved
            ? {
                      reply: finalReplyText,
                      intent: resolved.intent,
                      needs_human: resolved.needs_human,
                      lead_temperature: resolved.lead_temperature,
                      missing_fields: resolved.missing_fields
            }
              : {
                        reply: finalReplyText,
                        intent: parsed.intent,
                                            needs_human: true,
                        lead_temperature: parsed.lead_temperature,
                        missing_fields: parsed.missing_fields
              };

      const finalPayload = buildMessagesPayload(result.reply);

      return send(res, 200, {
              ok: true,
              ...result,
              reply_part_1: finalPayload.parts[0] || "",
              reply_part_2: finalPayload.parts[1] || "",
              reply_part_3: finalPayload.parts[2] || "",
              messages: finalPayload.messages
      });
    } catch (error) {
          console.error("ERRO_GERAL:", error);
const errorReply = ensureWhatsappHandoff(DEFAULT_FALLBACK, null);
                const errorPayload = buildMessagesPayload(errorReply);
          return send(res, 200, {
                  ok: false,
                              reply: errorReply,
                  intent: "humano",
                  needs_human: true,
                  lead_temperature: "quente",
                  missing_fields: [],
                  error_public: "Falha temporária no atendimento automático.",
                  reply_part_1: errorPayload.parts[0] || "",
                  reply_part_2: errorPayload.parts[1] || "",
                  reply_part_3: errorPayload.parts[2] || "",
                  messages: errorPayload.messages
          });
    }
}
