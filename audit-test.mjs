import handler from './api/manychat.js';

async function call(message, extraBody = {}) {
  const req = {
    method: 'POST',
    headers: {},
    body: { message, first_name: 'Teste', subscriber_id: '1', ...extraBody }
  };
  const res = {
    statusCode: null,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(payload) { this.payload = payload; return payload; }
  };
  await handler(req, res);
  return {
    message,
    status: res.statusCode,
    intent: res.payload?.intent,
    needs_human: res.payload?.needs_human,
    reply: res.payload?.reply?.slice(0, 180).replace(/\n/g, ' | '),
    ok: res.payload?.ok,
    error: res.payload?.error
  };
}

const tests = [
  ['qual o cardapio?'],
  ['onde fica?'],
  ['tem almoço hoje?'],
  ['qual valor do almoço?'],
  ['tem delivery?'],
  ['tem vaga de garçom?'],
  ['tem open chopp?'],
  ['qual valor do open chopp?'],
  ['Valor', { last_intent: 'open_chopp' }],
  ['happy hour'],
  ['hamburguer em dobro terça'],
  ['double burger'],
  ['feijoada hoje'],
  ['Oi. Gostaria de saber mais sobre o Fondue.'],
  ['mencionou você no próprio story'],
  ['quero reservar mesa para 4 pessoas amanhã 20h'],
  ['tem guarana normal?'],
  ['tem heineken zero?'],
  ['tem bebida sem álcool?'],
  ['tem chopp zero?'],
  ['tem guarana proteico?'],
  ['estacionamento free?'],
  ['serviço para empresa'],
  ['qual o horário?']
];

for (const [message, extraBody] of tests) {
  console.log(JSON.stringify(await call(message, extraBody || {}), null, 2));
}
