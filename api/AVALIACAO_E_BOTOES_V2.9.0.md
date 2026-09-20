# SDR Sr. Boteco — v2.9.0 — Avaliação + botões sem links aparentes

## Principais correções

- Nota 5 recebe resposta específica e CTA `Avaliar no Google`.
- Nota 4 recebe agradecimento e convite opcional para explicar o que faltou para virar 5.
- Nota 3 pede sugestão de melhoria.
- Notas 1–2 recebem resposta de acolhimento e pedido de feedback.
- Notas 1–4 mantêm `avaliacao_feedback_pendente=true` até a próxima mensagem de feedback.
- Instagram esconde URLs de Cardápio, Pedido direto, iFood, 99Food, WhatsApp, RH, Maps e Google Review no texto.
- Delivery pode retornar três CTAs simultâneos: Pedido direto, iFood e 99Food.
- Payload expõe `cta_1_*`, `cta_2_*`, `cta_3_*` para facilitar o mapeamento no ManyChat.
- `Fit` e `Fitness` isolados abrem diretamente a categoria Cardápio Fitness.

## Link da avaliação Google

A base oficial desta versão usa o link direto de avaliação criado a partir do Place ID do Sr Boteco - Pátio Limeira Shopping:
`https://search.google.com/local/writereview?placeid=ChIJRVEHZGqByJQRVUe6ZO8Yqz8`

No Instagram esse link não deve aparecer no texto; deve ficar apenas no botão `Avaliar no Google`.

## Observação estrutural

O webhook é stateless. Para uma resposta isolada como `5` ser tratada como nota, o ManyChat deve enviar `avaliacao_pendente=true` ou contexto explícito de avaliação. O prompt `PROMPT_EXECUCAO_MANYCHAT_COMPLETO_V2.9.0.md` contém o procedimento completo.
