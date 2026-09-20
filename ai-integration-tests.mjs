process.env.OPENAI_API_KEY = "test-key";
delete process.env.OPENAI_MODEL;
delete process.env.OPENAI_FALLBACK_MODEL;

const { default: handler } = await import("./api/manychat.js");

function assert(condition, message) {
  if (!condition) throw new Error(message || "assertion failed");
}

function makeRes() {
  return {
    statusCode: null,
    payload: null,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return payload; },
    end() {}
  };
}

async function ask(message) {
  const res = makeRes();
  await handler({
    method: "POST",
    headers: {},
    query: {},
    body: {
      message,
      first_name: "Teste",
      subscriber_id: "ai-test",
      channel: "instagram",
      event_type: "direct"
    }
  }, res);
  return res.payload;
}

let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS | ${name}`);
  } catch (error) {
    failed++;
    console.error(`FAIL | ${name} | ${error.message}`);
  }
}

const originalFetch = globalThis.fetch;

await test("health informa Responses API, v2.9.4 e modelo Luna por padrão", async () => {
  const res = makeRes();
  await handler({ method: "GET", headers: {}, query: {} }, res);
  assert(res.payload?.version === "2.9.4", JSON.stringify(res.payload));
  assert(res.payload?.model === "gpt-5.6-luna", JSON.stringify(res.payload));
  assert(res.payload?.fallback_model === "gpt-4o", JSON.stringify(res.payload));
  assert(res.payload?.openai_api === "responses", JSON.stringify(res.payload));
  assert(res.payload?.openai_configured === true, JSON.stringify(res.payload));
});

await test("humanização usa /v1/responses com gpt-5.6-luna e reasoning none", async () => {
  let calledUrl = "";
  let calledBody = null;
  globalThis.fetch = async (url, options = {}) => {
    calledUrl = String(url);
    calledBody = JSON.parse(String(options.body || "{}"));
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          output: [
            {
              type: "message",
              content: [
                { type: "output_text", text: '{"reply":"Que bom te ver por aqui. Como posso ajudar?"}' }
              ]
            }
          ]
        };
      },
      async text() { return ""; }
    };
  };

  const p = await ask("Oi");
  assert(calledUrl === "https://api.openai.com/v1/responses", calledUrl);
  assert(calledBody?.model === "gpt-5.6-luna", JSON.stringify(calledBody));
  assert(calledBody?.reasoning?.effort === "none", JSON.stringify(calledBody));
  assert(calledBody?.store === false, JSON.stringify(calledBody));
  assert(typeof calledBody?.instructions === "string" && calledBody.instructions.includes("Sr. Boteco Limeira"), "instructions ausentes");
  assert(String(calledBody?.input || "").includes("fatos_para_esta_resposta"), "input não contém fatos autorizados");
  assert(String(p?.reply || "").includes("Que bom te ver por aqui"), p?.reply);
});

await test("modelo fallback é usado quando o primário não está disponível", async () => {
  process.env.OPENAI_MODEL = "modelo-primario-indisponivel";
  process.env.OPENAI_FALLBACK_MODEL = "gpt-4o";
  const models = [];
  globalThis.fetch = async (_url, options = {}) => {
    const body = JSON.parse(String(options.body || "{}"));
    models.push(body.model);
    if (models.length === 1) {
      return {
        ok: false,
        status: 404,
        async text() { return "model not found"; },
        async json() { return {}; }
      };
    }
    return {
      ok: true,
      status: 200,
      async json() {
        return { output_text: '{"reply":"Oi! Como posso te ajudar hoje?"}' };
      },
      async text() { return ""; }
    };
  };

  const p = await ask("Olá");
  assert(models.length === 2, JSON.stringify(models));
  assert(models[0] === "modelo-primario-indisponivel", JSON.stringify(models));
  assert(models[1] === "gpt-4o", JSON.stringify(models));
  assert(String(p?.reply || "").includes("Como posso te ajudar"), p?.reply);
});

await test("falha da OpenAI mantém resposta determinística segura", async () => {
  process.env.OPENAI_MODEL = "gpt-5.6-luna";
  process.env.OPENAI_FALLBACK_MODEL = "gpt-4o";
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    async text() { return "erro controlado"; },
    async json() { return {}; }
  });

  const p = await ask("Oi");
  assert(p?.intent === "saudacao", p?.intent);
  assert(String(p?.reply || "").length > 0, "fallback vazio");
  assert(!String(p?.reply || "").includes("OpenAI"), p?.reply);
});

globalThis.fetch = originalFetch;
delete process.env.OPENAI_API_KEY;
delete process.env.OPENAI_MODEL;
delete process.env.OPENAI_FALLBACK_MODEL;

if (failed) {
  console.error(`\n${failed} teste(s) de integração OpenAI falharam.`);
  process.exit(1);
}
console.log("\nIA integrada v2.9.4: todos os testes passaram.");
