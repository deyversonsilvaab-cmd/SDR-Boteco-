# PROMPT DE EXECUÇÃO — VERCEL + GITHUB — SDR BOTECO v2.9.2

Copie e cole este prompt no Claude/Codex/agente que estiver operando o GitHub e a Vercel.

---

Você é o engenheiro responsável por publicar com segurança a versão **2.9.2** do webhook SDR Sr. Boteco Limeira.

## CONTEXTO

Repositório GitHub:
`deyversonsilvaab-cmd/SDR-Boteco-`

Branch de produção:
`main`

Endpoint de produção:
`https://sdr-boteco.vercel.app/api/manychat`

Pacote fonte que deve ser usado:
`SDR-Boteco-v2.9.2-IA-RESPONSES-VERCEL.zip`

Esta versão preserva todas as frentes existentes e atualiza a IA integrada do webhook:

- OpenAI Responses API (`POST /v1/responses`);
- modelo padrão `gpt-5.6-luna`;
- fallback `gpt-4o`;
- atendimento determinístico continua funcionando se a OpenAI falhar;
- avaliação 1–5, Google Review, Cardápio Fitness, Pratos do Dia, promoções, CTAs, Instagram, comentários, Stories, WhatsApp/handoff e RH permanecem ativos;
- correção adicional: `Olá` não pode ser confundido com `cola`/refrigerante na busca fuzzy.

NÃO reescrever o projeto do zero.
NÃO ativar AI Step/IA paga do ManyChat.
NÃO colocar secrets no GitHub.
NÃO alterar preços, cardápio, promoções, horários ou URLs oficiais.
NÃO trocar `WEBHOOK_SECRET` sem autorização.
NÃO excluir variáveis de produção existentes.

==================================================
1. VALIDAR O PACOTE ANTES DE PUBLICAR
==================================================

Extraia o ZIP e confirme que a RAIZ contém pelo menos:

`.env.example`
`.gitignore`
`.vercelignore`
`package.json`
`vercel.json`
`api/`
`data/`
`lib/`

Arquivos críticos:

`api/manychat.js`
`data/knowledge.json`
`lib/persona.js`
`ai-integration-tests.mjs`

A estrutura correta é:

/
├── .vercelignore
├── package.json
├── vercel.json
├── api/
│   └── manychat.js
├── data/
│   └── knowledge.json
├── lib/
│   └── persona.js
└── testes/documentação na raiz

NÃO criar uma pasta extra envolvendo o projeto.
NÃO subir o projeto inteiro para dentro de `/api`.

==================================================
2. PROTEÇÃO CONTRA O LIMITE DE FUNCTIONS DA VERCEL HOBBY
==================================================

Confirme que `.vercelignore` está NA RAIZ e contém exatamente:

api/**
!api/manychat.js

Objetivo: impedir que duplicatas antigas dentro de `/api` sejam transformadas em Serverless Functions.

A Function real do projeto deve ser somente:

`api/manychat.js`

Se o GitHub ainda possuir cópias antigas como:

`api/api/`
`api/lib/`
`api/data/`
`api/*-tests.mjs`

NÃO copiar essas duplicatas para o novo pacote.
O `.vercelignore` deve continuar ativo como proteção imediata.
A limpeza definitiva das duplicatas pode ser feita separadamente, sem misturar com a atualização funcional.

==================================================
3. CONFERIR A VERSÃO E A IA NO CÓDIGO
==================================================

Em `api/manychat.js`, confirmar:

`APP_VERSION = "2.9.2"`

Confirmar também:

`DEFAULT_OPENAI_MODEL = "gpt-5.6-luna"`

`DEFAULT_OPENAI_FALLBACK_MODEL = "gpt-4o"`

Endpoint OpenAI:

`https://api.openai.com/v1/responses`

Não deve restar chamada ativa para:

`/v1/chat/completions`

A IA deve continuar sendo somente camada de humanização. Preço, produto, horário, promoção, link e disponibilidade permanecem determinados pelo webhook antes da chamada da IA.

==================================================
4. ENVIRONMENT VARIABLES DA VERCEL
==================================================

Abrir o projeto correto no Vercel:
`sdr-boteco`

Ir em:
Settings → Environment Variables

NÃO revelar os valores atuais de secrets na conversa.

Manter o valor REAL existente de:

`OPENAI_API_KEY`
`WEBHOOK_SECRET`

Atualizar/criar:

`OPENAI_MODEL = gpt-5.6-luna`

`OPENAI_FALLBACK_MODEL = gpt-4o`

Aplicar para **Production**.
Se o projeto também usa Preview para testes, aplicar também em Preview somente se isso já fizer parte do fluxo existente.

NÃO copiar a chave real para `.env.example`.
NÃO fazer commit de API key.
NÃO trocar `WEBHOOK_SECRET` se ele já estiver funcionando com o ManyChat.

O `.env.example` do repositório deve conter somente nomes e valores não secretos de exemplo:

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-luna
OPENAI_FALLBACK_MODEL=gpt-4o
WEBHOOK_SECRET=
BUSINESS_NAME=Sr. Boteco Limeira

==================================================
5. TESTES LOCAIS / REPOSITÓRIO
==================================================

Antes do commit/deploy execute na raiz:

`npm run check`

Também validar:

`node --check api/manychat.js`
`node --check lib/persona.js`

A suíte deve incluir:

`ai-integration-tests.mjs`

Essa suíte deve validar sem acessar a OpenAI real:

- versão 2.9.2;
- endpoint `/v1/responses`;
- modelo padrão `gpt-5.6-luna`;
- fallback `gpt-4o`;
- `reasoning.effort=none` para GPT-5.x;
- `store=false`;
- fallback determinístico quando a OpenAI falha.

Se algum teste falhar, NÃO apagar assertivas para deixar verde.
Corrigir a causa.

==================================================
6. PRESERVAR TODAS AS FRENTES DO BOT
==================================================

Antes de publicar, não permitir regressão em:

- 141 itens / 17 categorias;
- Cardápio Fitness;
- Pratos do Dia;
- Bisteca;
- preços cadastrados;
- Burger em Dobro;
- promoção de Chopp;
- promoções unificadas;
- avaliação 1–5;
- CTA Avaliar no Google para nota 5;
- feedback de notas inferiores;
- Cardápio / Fazer pedido / iFood / 99Food;
- Como chegar;
- Falar no WhatsApp;
- Enviar currículo;
- URLs escondidas nos botões do Instagram;
- Instagram Direct;
- Story Reply;
- Story Mention;
- comentários;
- WhatsApp;
- handoff humano;
- `atendimento_humano=true` mantendo o bot em silêncio;
- RH separado do handoff geral;
- busca aproximada;
- fallbacks limpos v2.9.1;
- guardrails de preço, URL, horário e fatos objetivos.

==================================================
7. CORREÇÃO DE SAUDAÇÃO
==================================================

Testar especificamente:

`Olá`

Resultado esperado:

intent = `saudacao`

NÃO pode retornar:

Refrigerante KS
Coca-Cola
item de cardápio

Também testar:

`Oi quero o cardápio`

Resultado esperado:

intent = `cardapio`

Ou seja: saudação pura é saudação; saudação + intenção continua indo para a intenção real.

==================================================
8. GITHUB
==================================================

Subir a versão 2.9.2 para a branch `main` somente depois dos testes.

Sugestão de commit:

`feat: v2.9.2 atualiza IA para Responses API e GPT-5.6 Luna`

Não fazer upload dentro de `/api` selecionando a pasta errada.
Os arquivos do ZIP devem entrar a partir da raiz do repositório.

Após o commit, registrar o SHA.

==================================================
9. DEPLOY VERCEL
==================================================

Preferir o deploy automático disparado pelo novo commit da branch `main`.

Não selecionar manualmente um commit antigo que já falhou.

Se disponível no ambiente, antes do deploy pode executar:

`vercel deploy --dry`

para conferir os arquivos incluídos/ignorados.

A implantação NÃO deve voltar a falhar com a mensagem de limite de 12 Functions.

Não fazer upgrade para plano Pro como forma de contornar estrutura errada.

==================================================
10. HEALTH CHECK APÓS DEPLOY
==================================================

Abrir:

`https://sdr-boteco.vercel.app/api/manychat`

Esperado:

- `ok: true`
- `version: "2.9.2"`
- `channels` contendo `instagram` e `whatsapp`
- `openai_configured: true` se a chave estiver configurada na Vercel
- `model: "gpt-5.6-luna"`
- `fallback_model: "gpt-4o"`
- `openai_api: "responses"`

Se `openai_configured` estiver false, verificar somente a configuração da Environment Variable. Não colocar a chave no código.

==================================================
11. TESTES FUNCIONAIS EM PRODUÇÃO
==================================================

Usar somente contato/ambiente de teste. Não disparar mensagens para clientes reais.

Testar:

1. `Olá`
   Esperado: saudação normal.

2. `qual o valor do quibe?`
   Esperado: preço oficial, sem invenção.

3. `bisteca`
   Esperado: opção correta do almoço/contexto.

4. `fit`
   Esperado: Cardápio Fitness.

5. `tem promoção?`
   Esperado: promoções oficiais.

6. `lanche`
   Esperado: burgers normais + continuidade da promoção conforme regra existente.

7. `onde fica?`
   Esperado: texto limpo + CTA de localização.

8. fluxo de avaliação com nota 5
   Esperado: agradecimento + CTA Avaliar no Google.

9. mensagem sem correspondência
   Esperado: fallback limpo, sem URL aparente no Direct.

==================================================
12. NÃO CONFUNDIR .ENV.EXAMPLE COM PRODUÇÃO
==================================================

O arquivo `.env.example` é DOCUMENTAÇÃO.
Editar esse arquivo no GitHub NÃO muda a variável usada em produção.

A produção deve ser atualizada em:

Vercel → Project → Settings → Environment Variables

Não informar que a IA foi atualizada até confirmar o health check após o deploy.

==================================================
13. ENTREGA FINAL
==================================================

Ao terminar, retornar um relatório objetivo com:

1. SHA do commit publicado;
2. resultado de `npm run check`;
3. PASS/FAIL dos testes;
4. confirmação de `.vercelignore` na raiz;
5. confirmação de apenas `api/manychat.js` como Function intencional;
6. resultado do deploy;
7. resultado do GET `/api/manychat`;
8. versão encontrada;
9. `openai_api` encontrada;
10. modelo principal encontrado;
11. fallback encontrado;
12. status de `openai_configured` sem revelar a chave;
13. resultado do teste `Olá`;
14. qualquer risco ou duplicação ainda existente.

Se algo divergir, pare antes de fazer alteração destrutiva e descreva exatamente o caminho e o risco.

OBJETIVO FINAL:

GitHub `main`
→ Vercel Production
→ 1 endpoint funcional `/api/manychat`
→ versão 2.9.2
→ OpenAI Responses API
→ `gpt-5.6-luna` principal
→ `gpt-4o` fallback
→ atendimento seguro mesmo se a OpenAI falhar
→ todas as frentes anteriores preservadas.
