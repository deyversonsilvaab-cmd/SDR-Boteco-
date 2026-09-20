# Revisão final de produção — SDR Boteco v2.9.2

- Catálogo preservado: 141 itens / 17 categorias.
- Fitness, Pratos do Dia, Bisteca, promoções, comentários, WhatsApp/handoff e guardrails preservados.
- Avaliação 1–5 preservada; nota 5 continua gerando CTA Avaliar no Google.
- URLs de ação permanecem fora do texto das DMs do Instagram e dentro dos botões contextuais.
- Fallbacks Instagram `outro`, `sem_mensagem` e `erro_seguro` permanecem limpos.
- IA integrada atualizada para OpenAI Responses API.
- Modelo padrão `gpt-5.6-luna`; fallback `gpt-4o`; ambos configuráveis por Environment Variables.
- Falha da OpenAI não derruba o bot: a resposta determinística continua sendo usada.
- `Olá` é tratado como saudação antes da busca fuzzy de cardápio.
- `.vercelignore` permanece na raiz para impedir duplicatas antigas dentro de `/api` de virarem Functions no Vercel Hobby.
- Executar `npm run check` antes do deploy e confirmar GET `version: 2.9.2`, `openai_api: responses` e o modelo esperado.
- Suíte consolidada final: 156 verificações PASS / 0 FAIL.
