# Revisão final de produção — SDR Boteco v2.9.1

- Catálogo preservado: 141 itens / 17 categorias.
- Fitness preservado e `Fit` isolado validado.
- Promoções, almoço, comentários, WhatsApp/handoff e guardrails preservados.
- Nota 5 gera CTA Avaliar no Google.
- Notas 1–4 possuem respostas específicas; 1–4 podem coletar feedback.
- URLs de ação ficam fora do texto das DMs do Instagram.
- Delivery pode gerar 3 botões: Pedido direto, iFood e 99Food.
- ManyChat precisa persistir `avaliacao_pendente` para interpretar com segurança uma nota isolada.
- Executar `npm run check` antes do deploy e confirmar GET `version: 2.9.1`.
- Fallbacks Instagram `outro`, `sem_mensagem` e `erro_seguro` validados sem URLs aparentes nem texto residual.
- `sem_mensagem` agora recebe CTA WhatsApp coerente com o texto.
- Detector de saudação corrigido para não interpretar substrings como `coisa` como `oi`.
- Suíte consolidada: 151 testes PASS + checagem de sintaxe.

