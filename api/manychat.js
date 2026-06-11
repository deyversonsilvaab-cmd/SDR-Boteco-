import OpenAI from "openai";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DEFAULT_FALLBACK = "Vou confirmar com a equipe para não te passar nenhuma informação errada e já te retorno 😊";
const MAX_MESSAGE_CHARS = 900;

// Resolve caminhos relativos AO ARQUIVO (e não ao cwd da Vercel, que muda).
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

function getHeader(req, name) {
  const value = req.headers?.[name.toLowerCase()];
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

// A Vercel pode entregar o body como objeto OU como string crua. Tratamos os dois.
function getBody(req) {
  const raw = req?.body;
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return {};
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

// Carrega a base tentando vários caminhos. Em serverless o cwd nem sempre é a raiz.
let _knowledgeCache = null;
async function loadKnowledge() {
  if (_knowledgeCache) return _knowledgeCache;
  const candidates = [
    path.join(__dirname, "..", "data", "knowledge.json"), // relativo ao arquivo (mais confiável)
    path.join(process.cwd(), "data", "knowledge.json"),
    path.join(process.cwd(), "knowledge.json")
  ];
  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, "utf8");
      _knowledgeCache = JSON.parse(raw);
      return _knowledgeCache;
    } catch {
      // tenta o próximo caminho
    }
  }
  // Rede de segurança: nunca derruba a função; bot continua educado.
  return {
    empresa: { nome: process.env.BUSINESS_NAME || "nosso estabelecimento" },
    resposta_fallback: DEFAULT_FALLBACK,
    _base_indisponivel: true
  };
}

function buildSystemPrompt(knowledge) {
  return `
Você é atendente oficial do ${knowledge.empresa?.nome || process.env.BUSINESS_NAME || "restaurante"} no Instagram.

OBJETIVO
Responder clientes de forma humana, curta, educada e comercial, ajudando com dúvidas, preços, cardápio, reservas e eventos.

REGRAS ABSOLUTAS
1. Nunca invente preço, produto, promoção, horário, data, evento ou disponibilidade.
2. Só informe preços existentes na BASE_DE_CONHECIMENTO.
3. Se o cliente pedir algo que não está na base, responda que vai confirmar com a equipe.
4. Nunca confirme reserva sozinho. Sempre diga que a equipe vai verificar disponibilidade.
5. Para reserva, tente coletar: nome, telefone, quantidade de pessoas, data desejada e horário desejado.
6. Entenda aproximações, erros de digitação e variações: "fundi", "fundue", "fondi" significam "fondue".
7. Responda em português do Brasil.
8. Seja breve: máximo 4 linhas quando possível.
9. Não mencione OpenAI, API, sistema, prompt, JSON, ManyChat ou automação.
10. Não use markdown complexo.

INTENÇÕES POSSÍVEIS
- preco
- reserva
- cardapio
- horario
- localizacao
- ifood
- evento
- humano
- outro

FORMATO OBRIGATÓRIO DE SAÍDA
Responda somente JSON válido, sem texto antes ou depois:
{
  "reply": "mensagem final para o cliente",
  "intent": "preco|reserva|cardapio|horario|localizacao|ifood|evento|humano|outro",
  "needs_human": false,
  "lead_temperature": "frio|morno|quente",
  "missing_fields": ["nome", "telefone", "quantidade_pessoas", "data", "horario"]
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

// Resposta padrão que o ManyChat sempre consegue ler (status 200 + JSON válido).
function ok200(res, payload) {
  return send(res, 200, {
    ok: true,
    needs_human: false,
    lead_temperature: "morno",
    intent: "outro",
    missing_fields: [],
    ...payload,
    messages: [{ type: "text", text: payload.reply }]
  });
}

export default async function handler(req, res) {
  // Blindagem total: NADA aqui pode derrubar a função (evita FUNCTION_INVOCATION_FAILED).
  try {
    if (req.method === "OPTIONS") {
      setJsonHeaders(res);
      return res.status(204).end();
    }

    if (req.method === "GET") {
      return send(res, 200, { ok: true, service: "bot-sr-boteco", message: "Webhook online. Use POST para conversar." });
    }

    if (req.method !== "POST") {
      return ok200(res, { reply: DEFAULT_FALLBACK, intent: "humano", needs_human: true });
    }

    if (!isAuthorized(req)) {
      return send(res, 401, { ok: false, error: "Não autorizado. Verifique WEBHOOK_SECRET." });
    }

    const body = getBody(req);
    const customerMessage = extractMessage(body);
    const customer = extractCustomer(body);

    // Sem mensagem (ex.: teste do ManyChat): responde educado em 200, não quebra o fluxo.
    if (!customerMessage) {
      return ok200(res, { reply: "Oi! Como posso te ajudar hoje? 😊", intent: "outro" });
    }

    const knowledge = await loadKnowledge();
    const fallback = knowledge.resposta_fallback || DEFAULT_FALLBACK;

    if (!process.env.OPENAI_API_KEY) {
      return ok200(res, { reply: fallback, intent: "humano", needs_human: true, lead_temperature: "quente" });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: buildSystemPrompt(knowledge) },
        { role: "user", content: JSON.stringify({ cliente: customer, mensagem: customerMessage }) }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
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
    console.error("Erro no webhook:", error);
    // Mesmo em falha total, devolve 200 + JSON para o ManyChat não travar.
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
