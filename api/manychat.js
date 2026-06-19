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

function buildDirectReply(message, knowledge) {
  const text = normalizeText(message);
  const respostas = knowledge.respostas_rapidas || {};

  if (includesAny(text, ["cardapio", "menu", "opcoes", "comidas", "pratos", "tem o que", "o que tem", "cardapio completo"])) {
    return { reply: respostas.cardapio || DEFAULT_FALLBACK, intent: "cardapio", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["onde fica", "aonde fica", "endereco", "localizacao", "qual endereco", "local", "shopping", "patio limeira"])) {
    return { reply: respostas.localizacao || DEFAULT_FALLBACK, intent: "localizacao", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["almoco", "prato do dia", "pratos do dia", "executivo", "executivos", "pf", "refeicao", "comida", "almoco hoje"])) {
    return { reply: respostas.almoco || DEFAULT_FALLBACK, intent: "almoco", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["entrega", "delivery", "ifood", "i food", "pedido", "pedir", "entregam", "faz entrega"])) {
    return { reply: respostas.delivery || DEFAULT_FALLBACK, intent: "ifood", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["vaga", "vagas", "emprego", "trabalho", "trabalhar", "curriculo", "currículo", "contratacao", "contratação", "contratando", "processo seletivo", "vaga de emprego", "vaga de trabalho", "free lance", "freelance", "free", "garcom", "garçom", "garconete", "garçonete", "cumim", "cumin", "cozinha", "atendente", "servico", "serviço"])) {
    return { reply: respostas.vaga || DEFAULT_FALLBACK, intent: "vaga", needs_human: false, lead_temperature: "morno", missing_fields: [] };
  }

  if (includesAny(text, ["fondue", "fundi", "fundue", "fondi", "dia dos namorados", "namorados", "noite de fondue"])) {
    return { reply: respostas.fondue || DEFAULT_FALLBACK, intent: "evento", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["guarana proteico", "guarana", "pure up", "pureup", "bebida proteica", "refri proteico", "refrigerante proteico", "proteico bebida"])) {
    return { reply: respostas.guarana_proteico || respostas.proteicos || DEFAULT_FALLBACK, intent: "proteico", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["proteico", "proteica", "fitness", "fit", "saudavel", "saudável", "low carb", "frango power", "executivo proteico", "tilapia premium", "tilápia premium", "low carb supreme", "salada proteica", "tilapia fresh", "tilápia fresh", "prato saudavel", "prato saudável", "pratos proteicos", "cardapio fitness", "cardápio fitness"])) {
    return { reply: respostas.proteicos || DEFAULT_FALLBACK, intent: "proteico", needs_human: false, lead_temperature: "quente", missing_fields: [] };
  }

  if (includesAny(text, ["horario", "funcionamento", "abre", "aberto", "fecha", "que horas"])) {
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
3. Se o cliente pedir cardápio, responda com categorias sem preços e direcione para o WhatsApp.
4. Se o cliente pedir almoço/prato do dia, informe a campanha de almoço com pratos e preços.
5. Se perguntar sobre pratos saudáveis/proteicos, liste as opções sem informar preço.
6. Se perguntar preço dos novos pratos proteicos ou da bebida Pure Up, não invente valores; informe que os valores serão confirmados pela equipe.
7. Se perguntar localização/endereço, informe Pátio Limeira Shopping.
8. Se perguntar sobre vaga, emprego, currículo, freelance, garçom, garçonete, cumim, cozinha, atendente ou trabalho, direcione para a gerente pelo WhatsApp (17) 99103-4703 e informe o link https://wa.me/5517991034703.
6. Nunca confirme reserva sozinho. Colete nome, telefone, quantidade de pessoas, data e horário.
7. Não mencione OpenAI, API, sistema, prompt, JSON, ManyChat ou automação.
8. Responda somente JSON válido.

FORMATO:
{
  "reply": "mensagem final para o cliente",
  "intent": "preco|reserva|cardapio|horario|localizacao|ifood|evento|vaga|almoco|proteico|humano|outro",
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

    if (!customerMessage) return send(res, 400, { ok: false, error: "Mensagem vazia. Envie no campo message ou text." });

    const knowledge = await loadKnowledge();
    const fallback = knowledge.resposta_fallback || DEFAULT_FALLBACK;

    const direct = buildDirectReply(customerMessage, knowledge);
    if (direct) {
      return send(res, 200, { ok: true, ...direct, messages: [{ type: "text", text: direct.reply }] });
    }

    if (!process.env.OPENAI_API_KEY) return send(res, 500, { ok: false, error: "OPENAI_API_KEY não configurada na Vercel." });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: buildSystemPrompt(knowledge) },
        { role: "user", content: JSON.stringify({ cliente: customer, mensagem: customerMessage }) }
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
