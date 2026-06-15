import OpenAI from "openai";
import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_FALLBACK = "Vou confirmar com a equipe para não te passar nenhuma informação errada e já te retorno 😊";
const MAX_MESSAGE_CHARS = 900;

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
  return value.trim().slice(0, MAX_MESSAGE_CHARS);
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function includesAny(text, terms) {
  const t = normalize(text);
  return (terms || []).some((term) => t.includes(normalize(term)));
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
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

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
    username: safeText(body?.username || body?.ig_username || body?.profile?.username || "")
  };
}

async function loadKnowledge() {
  const filePath = path.join(process.cwd(), "data", "knowledge.json");
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function findProduct(knowledge, name) {
  return (knowledge.produtos_precos || []).find((p) => normalize(p.nome) === normalize(name));
}

function getWhatsApp(knowledge) {
  return knowledge.empresa?.telefone_whatsapp || "(19) 99785-8351";
}

function getIfoodLink(knowledge) {
  return knowledge.links?.ifood || "https://www.ifood.com.br/delivery/limeira-sp/sr-boteco-shopping-patio-limeita-centro/c318d733-afe4-4098-80af-296be4eb0c72";
}

function deterministicReply(message, knowledge) {
  const msg = normalize(message);
  const horarios = knowledge.horarios || {};
  const whatsapp = getWhatsApp(knowledge);
  const endereco = knowledge.empresa?.endereco || "Pátio Limeira Shopping";
  const ifoodLink = getIfoodLink(knowledge);

  // DELIVERY / IFOOD — resposta fixa para pedidos de entrega.
  if (includesAny(msg, ["entrega", "delivery", "ifood", "i food", "pedido", "pedir", "pedidos", "entregam", "faz entrega", "fazem entrega", "tem entrega"])) {
    return {
      reply:
        `Sim 😊\n\n` +
        `Fazemos entregas através do iFood.\n\n` +
        `📲 Faça seu pedido pelo link:\n${ifoodLink}\n\n` +
        `Caso prefira, também pode conferir nosso cardápio completo pelo aplicativo do iFood.`,
      intent: "ifood",
      needs_human: false,
      lead_temperature: "quente",
      missing_fields: []
    };
  }

  // VAGAS / CURRÍCULO — resposta fixa para pessoas procurando emprego.
  if (includesAny(msg, ["vaga", "vagas", "emprego", "trabalho", "curriculo", "currículo", "contratacao", "contratação", "contratando", "processo seletivo", "trabalhar", "vim pela vaga", "vaga de emprego", "vaga de trabalho"])) {
    return {
      reply:
        `Olá 😊\n\n` +
        `Obrigado pelo seu interesse em trabalhar conosco.\n\n` +
        `Você pode enviar seu currículo diretamente para nosso WhatsApp:\n\n` +
        `📲 ${whatsapp}\n\n` +
        `Nossa equipe irá analisar seu perfil e entrará em contato caso exista uma oportunidade compatível.`,
      intent: "humano",
      needs_human: true,
      lead_temperature: "morno",
      missing_fields: []
    };
  }

  const fondueTrigger = includesAny(msg, ["fondue", "fundi", "fundue", "fondi", "dia dos namorados", "noite de fondue", "namorados", "valores fondue", "valor fondue", "preco fondue", "preço fondue"]);
  if (fondueTrigger) {
    const salgado = findProduct(knowledge, "Fondue Salgado");
    const doce = findProduct(knowledge, "Fondue Doce");
    if (salgado && doce) {
      return {
        reply:
          `Que bom receber seu contato e seu interesse na nossa experiência especial de Fondue no Sr. Boteco. ❤️\n\n` +
          `Preparamos duas opções para compartilhar:\n\n` +
          `🧀 Fondue Salgado – ${salgado.valor}\n` +
          `Acompanha: torradas, iscas de frango empanado, contrafilé, calabresa e batata frita.\n\n` +
          `🍫 Fondue Doce – ${doce.valor}\n` +
          `Acompanha: morango, uva, banana, brownie e marshmallow.\n\n` +
          `🕓 Oferta válida das 16h às 21h.\n` +
          `📍 Estamos no ${endereco}.\n\n` +
          `Para reserva, me envie nome, telefone, quantidade de pessoas, data e horário desejado. Também temos o WhatsApp ${whatsapp} como opção para contato e confirmação. 😊`,
        intent: "evento",
        needs_human: false,
        lead_temperature: "quente",
        missing_fields: ["nome", "telefone", "quantidade_pessoas", "data", "horario"]
      };
    }
  }

  if (includesAny(msg, ["open", "chopp", "chop", "chopp a vontade", "chopp à vontade"])) {
    const item = findProduct(knowledge, "Open Chopp");
    if (item) {
      return {
        reply: `Temos Open Chopp das 16h às 21h. 🍻\n\nDe domingo a quinta: R$ 29,90\nSexta e sábado: R$ 49,90\n\nFuncionamos todos os dias das 11h às 22h no ${endereco}.`,
        intent: "preco",
        needs_human: false,
        lead_temperature: "morno",
        missing_fields: []
      };
    }
  }

  if (includesAny(msg, ["rodizio", "rodízio", "rodizio de boteco", "rodizio de porcao", "rodizio de porções"])) {
    const item = findProduct(knowledge, "Rodízio de Boteco");
    if (item) {
      return {
        reply: `Temos Rodízio de Boteco das 16h às 21h. 😋\n\nInclui: isca de frango, calabresa acebolada, batata frita, mandioca frita e frango à passarinho.\n\nDe domingo a quinta: R$ 49,90\nSexta e sábado: R$ 59,90`,
        intent: "preco",
        needs_human: false,
        lead_temperature: "morno",
        missing_fields: []
      };
    }
  }

  if (includesAny(msg, ["almoco", "almoço", "executivo", "prato executivo", "pratos executivos", "pf", "prato feito"])) {
    return {
      reply: `Temos oferta de almoço exclusiva para dias de semana. 🍽️\n\nVálida de segunda a sexta, das 11h às 15h.\nSão opções de pratos executivos do cardápio, a partir de R$ 30,90.\n\nFuncionamos todos os dias das 11h às 22h no ${endereco}.`,
      intent: "cardapio",
      needs_human: false,
      lead_temperature: "morno",
      missing_fields: []
    };
  }

  if (includesAny(msg, ["horario", "horário", "funciona", "aberto", "abre", "fecha", "que horas"])) {
    return {
      reply: `${horarios.funcionamento || "Funcionamos todos os dias das 11h às 22h."}\n\nAs ofertas são válidas das 16h às 21h.\nA oferta de almoço é exclusiva de segunda a sexta, das 11h às 15h.`,
      intent: "horario",
      needs_human: false,
      lead_temperature: "frio",
      missing_fields: []
    };
  }

  if (includesAny(msg, ["onde", "endereco", "endereço", "local", "shopping", "fica", "localizacao", "localização"])) {
    return {
      reply: `Estamos no ${endereco}. 📍\n\nFuncionamos todos os dias das 11h às 22h.`,
      intent: "localizacao",
      needs_human: false,
      lead_temperature: "frio",
      missing_fields: []
    };
  }

  if (includesAny(msg, ["reserv", "mesa", "quero ir", "garantir", "marcar", "agendar"])) {
    return {
      reply: `Perfeito! 😊\n\nPara verificar a disponibilidade da reserva, me envie:\n\n👤 Nome completo\n📱 Telefone\n👥 Quantidade de pessoas\n📅 Data desejada\n🕒 Horário desejado\n\nTambém temos o WhatsApp ${whatsapp} como opção para contato e confirmação.`,
      intent: "reserva",
      needs_human: false,
      lead_temperature: "quente",
      missing_fields: ["nome", "telefone", "quantidade_pessoas", "data", "horario"]
    };
  }

  if (includesAny(msg, ["ok", "sim", "quero", "pode", "isso", "manda", "me passa", "quantas pessoas", "serve quantas", "casal", "grupo", "valores", "valor", "preco", "preço"])) {
    return {
      reply: `Perfeito 😊\n\nVocê quer saber sobre qual opção? Temos Fondue, Open Chopp, Rodízio de Boteco, almoço executivo, cardápio ou reserva.`,
      intent: "outro",
      needs_human: false,
      lead_temperature: "morno",
      missing_fields: []
    };
  }

  return null;
}

function buildSystemPrompt(knowledge) {
  return `
Você é atendente oficial do ${knowledge.empresa?.nome || process.env.BUSINESS_NAME || "Sr. Boteco Limeira"} no Instagram.

OBJETIVO
Responder clientes de forma humana, curta, simpática e comercial, ajudando com dúvidas, preços, cardápio, reservas, horários, localização, iFood, delivery, vagas de emprego, eventos e ofertas.

REGRAS ABSOLUTAS
1. Nunca invente preço, produto, promoção, horário, data, evento ou disponibilidade.
2. Use somente dados da BASE_DE_CONHECIMENTO.
3. Se encontrar informação na base, responda com a informação encontrada. Não use fallback se existir dado relacionado.
4. Use fallback somente quando não houver nenhuma informação relacionada ao restaurante, cardápio, oferta, reserva, localização, horário, iFood, vaga de emprego ou atendimento.
5. Nunca confirme reserva automaticamente. Colete nome, telefone, quantidade de pessoas, data e horário.
6. Toda nova mensagem pode ser continuação da conversa. Se faltar contexto, responda o que for possível e faça uma pergunta objetiva para avançar.
7. Entenda aproximações e erros: fundi, fundue, fondi = fondue; rodizio = rodízio; almoco = almoço; entrega = iFood/delivery; vaga/trabalho/currículo = envio de currículo.
8. Responda em português do Brasil.
9. Não mencione OpenAI, API, sistema, prompt, JSON, Vercel, ManyChat ou automação.
10. Não use markdown complexo.

HORÁRIOS IMPORTANTES
- Funcionamento do restaurante: todos os dias das 11h às 22h.
- Ofertas gerais: das 16h às 21h.
- Oferta de almoço: segunda a sexta, das 11h às 15h, exclusiva para almoço.

FORMATO OBRIGATÓRIO DE SAÍDA
Responda somente JSON válido, sem texto antes ou depois:
{
  "reply": "mensagem final para o cliente",
  "intent": "preco|reserva|cardapio|horario|localizacao|ifood|evento|humano|outro",
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
    return {
      reply: safeText(text) || fallback,
      intent: "outro",
      needs_human: true,
      lead_temperature: "morno",
      missing_fields: []
    };
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

    if (req.method !== "POST") {
      return send(res, 405, { ok: false, error: "Método não permitido. Use POST." });
    }

    if (!isAuthorized(req)) {
      return send(res, 401, { ok: false, error: "Não autorizado. Verifique WEBHOOK_SECRET." });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return send(res, 500, { ok: false, error: "OPENAI_API_KEY não configurada na Vercel." });
    }

    const body = req.body || {};
    const customerMessage = extractMessage(body);
    const customer = extractCustomer(body);

    if (!customerMessage) {
      return send(res, 400, { ok: false, error: "Mensagem vazia. Envie no campo message ou text." });
    }

    const knowledge = await loadKnowledge();
    const fallback = knowledge.resposta_fallback || DEFAULT_FALLBACK;

    const direct = deterministicReply(customerMessage, knowledge);
    if (direct) {
      return send(res, 200, {
        ok: true,
        reply: direct.reply,
        intent: direct.intent,
        needs_human: direct.needs_human,
        lead_temperature: direct.lead_temperature,
        missing_fields: direct.missing_fields,
        messages: [{ type: "text", text: direct.reply }]
      });
    }

    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: buildSystemPrompt(knowledge) },
        { role: "user", content: JSON.stringify({ cliente: customer, mensagem: customerMessage }) }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5
    });

    const result = parseJsonModelOutput(response.choices?.[0]?.message?.content, fallback);

    return send(res, 200, {
      ok: true,
      reply: result.reply,
      intent: result.intent,
      needs_human: result.needs_human,
      lead_temperature: result.lead_temperature,
      missing_fields: result.missing_fields,
      messages: [{ type: "text", text: result.reply }]
    });
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
