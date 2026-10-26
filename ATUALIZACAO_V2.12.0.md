# v2.12.0 — Modo humano (opt-in) e orçamento de tempo da IA

## O que mudou
1. **Modo humano.** Ligado por contato com `"modo_humano": true` no corpo do POST (ou para todos com `HUMAN_TONE=on`). `modo_humano: false` desliga mesmo com `HUMAN_TONE=on`. Sem nenhum dos dois, o comportamento é o da v2.11.2 (283 testes antigos seguem passando).
2. **Nome só na saudação.** No modo humano o prefixo "Nome," deixa de ser colocado na frente de toda resposta do Instagram (`ensurePersonalized`). O nome aparece na saudação ("Boa noite, Lucas!") e nunca para quem voltou há menos de 24 h.
3. **Respostas fixas reescritas na forma, não nos fatos** (`humanizeFixedReply`, só quando a IA não respondeu; no WhatsApp apenas as respostas de informação: promoções, endereço, horário, despedida e item do cardápio): saudação, promoção de chopp, promoção de burger, localização, horário, despedida, story mention, item do cardápio ("Burguer Bacon sai por R$ 33,90."), mensagem sem texto e "outro". Trava `preservesFacts`: números e URLs do texto original precisam sair idênticos, senão o texto original é mantido.
4. **Contexto novo** (`lib/humano.js`): `saudacao_horario` (fuso America/Sao_Paulo; espelha o "boa noite" do cliente se ele cumprimentou), `retornante` (última interação há menos de 24 h), `tom_cliente` (irritado, formal, curto, informal) e `ai_resumo` (até 300 caracteres, montado por regra, sem IA e sem dado pessoal: intenção, tópico, nº de pessoas, dia e hora citados).
5. **Persona em camada.** `buildSystemPrompt({ humano: true })` antepõe a camada humana (tom, exemplos, frases proibidas) ao prompt da v2.11.2 e troca só a regra do nome. As regras de fatos, segurança, canal e evento ficam intactas. Os exemplos de tom são **rascunho para aprovação** (constante `EXEMPLOS_TOM` em `lib/persona.js`).
6. **Validador de tom** para resposta de IA no modo humano: descarta frase de central de atendimento, mais de 1 emoji, mais de 4 linhas (exceto listas), nome repetido e mesma abertura da última resposta. Descartada = vale o texto determinístico. Motivo vai para o log (`HUMANO_RESPOSTA_REJEITADA`), sem o texto do cliente.
7. **Orçamento total de tempo da IA** (vale com ou sem modo humano): `AI_BUDGET_MS`, padrão 6500 ms, soma de todas as tentativas. Antes, modelo principal e reserva podiam somar 20 s, acima do limite do External Request do ManyChat. Para voltar ao comportamento antigo: `AI_BUDGET_MS=20000`.
8. **WhatsApp sem texto** (áudio, figurinha, imagem), só no modo humano: resposta vazia, `handoff=true`, `next_action=handoff_humano`, sem botão. A conversa fica aberta para você, conforme a regra de recepção.

## Campos novos na resposta (só no modo humano)
`modo_humano`, `saudacao_horario`, `retornante`, `tom_cliente`, `ai_ultima_interacao` (ISO), `ai_resumo`.

## Campos novos na requisição (opcionais)
`modo_humano`, `ai_resumo`, `ai_ultima_interacao`.

## Não incluído (decisões pendentes)
- Detecção de mensagem repetida e junção de mensagens seguidas: precisa de armazenamento.
- Dois balões no WhatsApp: a v2.11.2 define uma mensagem só.
- Frase "sou atendimento virtual" para quem pergunta se é robô: o texto de `humano_frustracao` não foi alterado.
- `channel` ausente continua caindo em Instagram (mudar quebraria fluxos que não enviam o campo).
- WhatsApp: recepção, handoff, reclamação, reserva e estacionamento não foram reescritos (as suas regras de recepção continuam valendo). No modo humano o WhatsApp também deixa de mostrar o rótulo solto "Cardápio completo/pedido" que sobrava depois de tirar o link.

## Testes
`npm run test:humano` (34 testes) e `npm run check` (suíte completa). Testado só com IA simulada: não foi testado com a chave real da OpenAI nem com o ManyChat real.
