// lib/humano.js — v2.12.0
// Camada de tom humano. Funções puras, sem dependências e sem acesso a rede.
//
// Princípios:
// 1. Nunca cria fato comercial. Só varia a forma de dizer o que já está em data/knowledge.json.
// 2. Toda variação passa por uma trava: números e URLs do texto original precisam sobreviver iguais.
// 3. O modo é opt-in: o ManyChat envia modo_humano=true (ou HUMAN_TONE=on na Vercel).
//    Sem isso, o comportamento anterior (v2.11.2) fica intacto.

const TZ = "America/Sao_Paulo";

const TRUTHY = ["true", "1", "yes", "sim", "on"];
const FALSY = ["false", "0", "no", "nao", "não", "off"];

export function isHumanMode(body = {}, env = process.env) {
  const raw = body?.modo_humano ?? body?.custom_fields?.modo_humano;
  const v = String(raw ?? "").trim().toLowerCase();
  if (raw === true || TRUTHY.includes(v)) return true;
  if (raw === false || FALSY.includes(v)) return false; // desligar explicitamente vence o ambiente
  return TRUTHY.includes(String(env?.HUMAN_TONE ?? "").trim().toLowerCase());
}

export function normalizeForMatch(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** "bom dia" | "boa tarde" | "boa noite" no fuso de Limeira. */
export function saudacaoHorario(now = new Date()) {
  let hour = 12;
  try {
    const parts = new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).formatToParts(now);
    hour = Number(parts.find((p) => p.type === "hour")?.value);
  } catch {
    hour = new Date(now.getTime() - 3 * 3600 * 1000).getUTCHours();
  }
  if (!Number.isFinite(hour)) return "boa noite";
  if (hour >= 5 && hour < 12) return "bom dia";
  if (hour >= 12 && hour < 18) return "boa tarde";
  return "boa noite";
}

/** Se o cliente já cumprimentou com bom dia/boa tarde/boa noite, o bot devolve o mesmo (evita "Bom dia" para quem disse "boa noite"). */
export function saudacaoDoCliente(message) {
  const t = normalizeForMatch(message);
  if (/\bbom dia\b/.test(t)) return "bom dia";
  if (/\bboa tarde\b/.test(t)) return "boa tarde";
  if (/\bboa noite\b/.test(t)) return "boa noite";
  return "";
}

/** true quando a última interação do cliente foi há menos de `hours` horas. Ausente ou inválido = cliente novo. */
export function isRetornante(isoDate, now = new Date(), hours = 24) {
  const raw = String(isoDate ?? "").trim();
  if (!raw) return false;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return false;
  const diff = now.getTime() - t;
  if (diff < -5 * 60 * 1000) return false; // data no futuro: dado ruim, trata como novo
  return diff < hours * 3600 * 1000;
}

const IRRITADO = /(que saco|saco cheio|absurdo|pessim|horrivel|vergonha|palhacada|ridicul|ja falei|ja disse|nao (entendeu|entende|le)|odeio|inferno|lixo|demora demais|ninguem (responde|atende))/;
const FORMAL = /(gostaria|poderia|por gentileza|por favor|prezad|senhor|senhora|\bdesejo\b)/;

/** "irritado" | "formal" | "curto" | "informal". Heurística simples e explicável, sem IA. */
export function tomCliente(message) {
  const raw = String(message || "").trim();
  if (!raw) return "curto";
  const t = normalizeForMatch(raw);
  const letters = raw.replace(/[^A-Za-zÀ-ÿ]/g, "");
  const upperRatio = letters.length >= 10 ? letters.replace(/[^A-ZÀ-Ý]/g, "").length / letters.length : 0;
  if (IRRITADO.test(t) || /!{3,}/.test(raw) || upperRatio > 0.7) return "irritado";
  if (FORMAL.test(t) && raw.length > 25) return "formal";
  if (t.split(" ").filter(Boolean).length <= 3) return "curto";
  return "informal";
}

const DIAS = /(segunda|terca|quarta|quinta|sexta|sabado|domingo|hoje|amanha)/;

/**
 * Resumo curto da conversa (até 300 caracteres), montado por regra, sem IA e sem dado pessoal.
 * Formato: "ult=promocao_chopp; topico=item:burguer_bacon; pessoas=4; dia=sabado; hora=19h".
 */
export function buildResumo(prev, { intent = "", topic = "", message = "" } = {}) {
  const state = {};
  for (const pair of String(prev || "").split(";")) {
    const [k, ...rest] = pair.split("=");
    const key = String(k || "").trim();
    const value = rest.join("=").trim();
    if (key && value && /^[a-z_]{2,12}$/.test(key)) state[key] = value.slice(0, 40);
  }
  const t = normalizeForMatch(message);
  const pessoas = t.match(/\b(?:somos|para|pra|mesa (?:de|pra|para)|reserva (?:de|pra|para))\s*(\d{1,3})\b/) || t.match(/\b(\d{1,3})\s*(?:pessoas|pessoa|pax|lugares)\b/);
  if (pessoas) state.pessoas = pessoas[1];
  const dia = t.match(DIAS);
  if (dia) state.dia = dia[1];
  const hora = t.match(/\b(?:as|por volta das?)\s*(\d{1,2})(?:[:h]\s*(\d{2}))?\s*(?:h|horas)?\b/);
  if (hora && Number(hora[1]) <= 24) state.hora = `${hora[1]}h${hora[2] || ""}`;
  if (intent && !["saudacao", "despedida", "sem_mensagem"].includes(intent)) state.ult = String(intent).slice(0, 40);
  if (topic && /^[a-z0-9_:.\-]{2,40}$/i.test(topic) && !["inicio", "fallback"].includes(topic)) state.topico = topic;

  const order = ["ult", "topico", "pessoas", "dia", "hora"];
  let out = order.filter((k) => state[k]).map((k) => `${k}=${state[k]}`).join("; ");
  while (out.length > 300 && out.includes(";")) out = out.slice(0, out.lastIndexOf(";"));
  return out.slice(0, 300);
}

export const FRASES_BLOQUEADAS = [
  /seja bem[- ]?vind/i,
  /agradecemos (o seu|pelo seu|a sua) contato/i,
  /como posso (te )?ajudar hoje/i,
  /em que posso ser [uú]til/i,
  /fico (a|à) (sua )?disposi/i,
  /estou (a|à) (sua )?disposi/i,
  /conforme solicitado/i,
  /prezad[oa]/i,
  /sua mensagem [ée] muito importante/i,
  /^\s*(com certeza|claro)[!,.]/i
];

const EMOJI = /\p{Extended_Pictographic}/gu;

function firstWord(text) {
  const t = normalizeForMatch(String(text || "").replace(/^[^\p{L}\p{N}]+/u, ""));
  return t.split(/[\s,.!?:;]+/)[0] || "";
}

/** Valida uma resposta gerada por IA contra as regras de tom. Não valida fatos (isso é das travas existentes). */
export function validateHumanReply(reply, { channel = "instagram", firstName = "", lastBotReply = "" } = {}) {
  const text = String(reply || "").trim();
  const reasons = [];
  if (!text) return { ok: false, reasons: ["vazia"] };
  if (FRASES_BLOQUEADAS.some((re) => re.test(text))) reasons.push("frase_bloqueada");
  if ((text.match(EMOJI) || []).length > 1) reasons.push("emoji_demais");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const hasList = lines.some((l) => /^([•\-–—*]|\d+[.)])\s/.test(l));
  if (channel !== "whatsapp" && !hasList && lines.length > 4) reasons.push("linhas_demais");
  const name = normalizeForMatch(firstName);
  if (name.length > 1) {
    const count = normalizeForMatch(text).split(/[^a-z0-9]+/).filter((w) => w === name).length;
    if (count > 1) reasons.push("nome_repetido");
  }
  const w = firstWord(text);
  if (w.length > 2 && w === firstWord(lastBotReply)) reasons.push("mesma_abertura");
  return { ok: reasons.length === 0, reasons };
}

const NUM_RE = /\d+(?:[.,:]\d+)*/g;
const URL_RE = /https?:\/\/[^\s)]+/g;

function sortedTokens(text, re) {
  return (String(text || "").match(re) || []).sort().join("|");
}

/** Trava: a variação precisa manter exatamente os mesmos números e URLs do original. */
export function preservesFacts(original, candidate) {
  return sortedTokens(original, NUM_RE) === sortedTokens(candidate, NUM_RE)
    && sortedTokens(original, URL_RE) === sortedTokens(candidate, URL_RE);
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Escolha determinística por semente, evitando abrir igual à última resposta do bot. */
export function pickVariant(pool, seed, lastBotReply = "") {
  const list = (pool || []).filter(Boolean);
  if (!list.length) return "";
  const start = hashString(String(seed)) % list.length;
  const lastWord = firstWord(lastBotReply);
  for (let i = 0; i < list.length; i++) {
    const candidate = list[(start + i) % list.length];
    if (!lastWord || firstWord(candidate) !== lastWord) return candidate;
  }
  return list[start];
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Reescreve respostas fixas do Instagram em forma mais natural, sem mexer nos fatos.
 * Devolve o texto original sempre que o padrão não bater ou a trava de fatos falhar.
 */
export function humanizeFixedReply({
  reply,
  intent,
  saudacao = "boa noite",
  retornante = false,
  tom = "informal",
  firstName = "",
  seed = "",
  lastBotReply = ""
}) {
  const original = String(reply || "");
  if (!original) return original;
  const pick = (pool) => pickVariant(pool, `${seed}|${intent}`, lastBotReply);
  const nome = firstName ? `, ${firstName}` : "";
  let out = original;

  switch (intent) {
    case "saudacao": {
      const S = cap(saudacao);
      if (retornante) {
        out = pick(["Opa, pode falar.", "Oi de novo! Me diz aí.", `Fala${nome}, o que você precisa?`]);
      } else if (tom === "formal") {
        out = pick([`${S}! Em que posso te ajudar?`, `${S}! Pode me dizer o que você procura?`]);
      } else {
        out = pick([
          `${S}${nome}! Me conta o que você tá procurando.`,
          `${S}${nome}! Em que eu te ajudo?`,
          `${S}${nome}! Quer ver o cardápio ou tem alguma dúvida?`
        ]);
      }
      break;
    }
    case "promocao_chopp": {
      const intro = pick(["Olha só como funciona:", "A promoção de chopp é assim:", "Chopp aqui tem preço bom, olha:"]);
      out = original.replace(/^Nossa promoção de chopp funciona assim:?\s*$/m, intro);
      break;
    }
    case "promocao_burger": {
      const v = pick([
        "Toda terça, a partir das 16h, tem Burger em Dobro: paga 1 e leva 2 do mesmo burger.",
        "Às terças, a partir das 16h, é Burger em Dobro: você paga 1 e leva 2 do mesmo burger.",
        "Terça-feira, a partir das 16h, o burger vem em dobro: paga 1 e leva 2 do mesmo."
      ]);
      out = original.replace(/Toda terça-feira, a partir das 16h, tem Burger em Dobro: (?:você )?paga 1 e leva 2 do mesmo burger\./, v);
      break;
    }
    case "localizacao": {
      const v = pick(["A gente fica no Pátio Limeira Shopping:", "Fica dentro do Pátio Limeira Shopping:", "Estamos no Pátio Limeira Shopping:"]);
      out = original.replace(/^Ficamos no Pátio Limeira Shopping:/, v);
      break;
    }
    case "horario": {
      const m = original.match(/^Funcionamos todos os dias das ([^.]+)\.$/);
      if (m) out = pick([`A gente abre todo dia, das ${m[1]}.`, `Todo dia, das ${m[1]}.`, `Funcionamos todos os dias, das ${m[1]}.`]);
      break;
    }
    case "despedida":
      out = pick(["Foi um prazer! Quando quiser voltar ou pedir, é só chamar.", "Valeu pelo papo! Quando quiser, é só chamar.", "Até mais! A gente tá por aqui quando precisar."]);
      break;
    case "story_mention":
      out = pick(["Adorei ver a marcação! Valeu por compartilhar esse momento com a gente.", "Que legal ver a marcação! Obrigado, volte sempre.", "Valeu pela marcação! Vai ser um prazer te receber de novo."]);
      break;
    case "sem_mensagem":
      out = pick([
        "Aqui eu só consigo ler texto. Me escreve rapidinho o que você precisa?",
        "Não consegui abrir essa mensagem por aqui. Pode me escrever o que você procura?",
        "Esse tipo de mensagem eu não consigo ver. Me conta por escrito o que você precisa?"
      ]);
      break;
    case "outro":
      out = pick(["Não achei isso por aqui. Me diz o nome do item ou a categoria que você procura?", "Ainda não entendi bem. Qual item ou categoria você procura?"]);
      break;
    case "item_cardapio": {
      // Só quando há exatamente um "Valor:" e o formato é o padrão: Nome / descrição / Valor.
      const m = original.match(/^([^\n]+)\n\n([^\n]+)\n\nValor: (R\$ ?[\d.,]+)(\n\n[\s\S]*)?$/);
      if (m && (original.match(/Valor:/g) || []).length === 1) {
        out = `${m[1]} sai por ${m[3]}.\n${m[2]}${m[4] || ""}`;
      }
      break;
    }
    default:
      break;
  }

  return out !== original && preservesFacts(original, out) ? out : original;
}
