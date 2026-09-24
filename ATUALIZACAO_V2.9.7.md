# v2.9.7 — Endereço em qualquer formato de DM + saudações "Oii"

Caso real: "Oii" / "Boa tarde" / "Queria saber Ond vcs estão localizados" / "Aonde é" / "Aonde estão localizados" caíam no fallback.

## O que mudou
- Nova detecção de localização (`isLocationQuestion`): aceita abreviações e erros comuns (ond, aond, aonde, vc/vcs), frases curtas com "onde" ("onde?", "fica onde?", "aonde é"), e termos como localizado(s), rua, bairro, cidade, shopping, maps, waze, rota, "como chego/chegar aí", "perto de onde", "vcs são de Limeira?".
- Resposta sempre com endereço completo (R. Carlos Gomes, 1321 - Centro, Limeira - SP) + botão **Como chegar**.
- Saudação junto com a pergunta ("Oi, boa tarde! onde vcs ficam?") já responde o endereço.
- "Onde fica e que horas abre" → endereço + horário na mesma resposta.
- **Estacionamento** (`localizacao_estacionamento`): endereço + a equipe confirma (não há informação validada de estacionamento na base). Botões **Como chegar** + **Falar no WhatsApp**.
- "Onde peço / onde mando currículo / onde vejo o cardápio / onde reservo" continuam nas intenções certas.
- Saudações com letras repetidas ("Oii", "Oiii", "Olaaa", "boa tardee") e "opa", "e aí", "oi boa noite" viram saudação (antes "Oii" caía no fallback).

## ManyChat
Nada novo. Se quiser, cadastre no fluxo o botão para o CTA `localizacao_estacionamento` (2 botões: `ctas[0]` e `ctas[1]`); se o fluxo usa só `cta_url`, aparece o **Como chegar**.

## Testes
`location-tests.mjs` (33 casos) incluído em `npm run check`.
