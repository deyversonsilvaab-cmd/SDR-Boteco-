# SDR Sr. Boteco — v2.8.0 — Avaliação 1–5 + Cardápio Fitness

## Diagnóstico da avaliação

O print enviado em 17/09/2026 mostra que a mensagem `5`, enviada logo após a pergunta "De 1 a 5, que nota você dá pra gente?", caiu no Default Reply normal e foi interpretada como conversa de cardápio.

A causa é estrutural: o webhook é stateless. Se o ManyChat envia a pergunta de avaliação sem marcar que a próxima resposta pertence à pesquisa, um `5` isolado não pode ser tratado como nota com segurança — poderia ser quantidade, número de pessoas, etc.

### Correção implementada no webhook

O webhook agora reconhece avaliação quando pelo menos um destes sinais existe:

- `avaliacao_pendente=true` no body/custom field;
- `event_type="avaliacao"`;
- `last_intent="avaliacao_solicitar_nota"`;
- `last_bot_reply` contém claramente a pergunta de nota de 1 a 5.

Também aceita a palavra `Avaliação` para iniciar a pesquisa manualmente.

Campos novos na resposta JSON:

- `avaliacao_pendente`
- `avaliacao_salva`
- `avaliacao_nota`
- `avaliacao_feedback_pendente`
- `avaliacao_feedback`

Notas 1–3 convidam a pessoa a deixar um comentário curto. Notas 4–5 recebem agradecimento sem CTA comercial. Uma nota isolada fora de contexto NÃO é sequestrada como avaliação.

> Persistência: o webhook não possui banco de dados. A nota e o feedback devem ser salvos em Custom Fields do ManyChat. O arquivo `PROMPT_EXECUCAO_MANYCHAT_COMPLETO_V2.8.0.md` descreve a configuração.

## Cardápio Fitness

Fonte: arte `Cardápio Fitness` enviada em 17/09/2026.

Foram adicionados 10 itens na nova categoria **Cardápio Fitness**:

1. Frango Fitness com Cabotiá — R$ 19,90
   - 150g de filé de frango grelhado, 120g de purê de abóbora cabotiá, seleta de legumes e salada.
2. Frango Fit com Ovo — R$ 22,90
   - 150g de filé de frango grelhado, arroz branco, salada e 1 ovo.
3. Bowl Fitness de Frango — R$ 24,90
   - Frango em tiras, arroz, seleta de legumes, alface, tomate, cenoura, cebola roxa e molho leve.
4. Tilápia com Legumes - Fitness — R$ 32,90
   - 150g de tilápia grelhada, seleta de legumes, alface, tomate e cenoura.
5. Tilápia com Arroz e Salada - Fitness — R$ 34,90
   - 150g de tilápia grelhada, arroz branco, salada fresca e legumes.
6. Tilápia Low Carb — R$ 34,90
   - 150g de tilápia grelhada, seleta de legumes, salada e ovo. Sem arroz e sem fritura.
7. Contra Filé Fitness — R$ 34,90
   - 150g de contra filé grelhado, arroz branco, seleta de legumes e salada.
8. Omelete Fitness — R$ 22,90
   - Omelete com frango desfiado, tomate, cebola roxa e queijo, acompanhado de salada.
9. Salada Fitness com Frango — R$ 24,90
   - Alface, tomate, cenoura, cebola roxa, ovo cozido e frango grelhado em tiras.
10. Salada Fitness com Tilápia — R$ 32,90
    - Alface, tomate, cenoura, cebola roxa e tilápia grelhada em tiras.

Nenhum horário específico foi informado na arte do Fitness. Por segurança, o bot não inventa dias/horários para essa categoria.

## Busca e categorias

- `fitness`, `fit`, `cardápio fitness`, `menu fitness`, `low carb`, `salada fitness` e variações reconhecem a categoria.
- `cardápio fitness` vence o `cardápio` genérico e lista diretamente os 10 itens.
- Catálogo total: **141 itens em 17 categorias**.

## Testes adicionados

- `fitness-tests.mjs`: integridade dos 10 itens, categoria, valores, composições e ausência de horário inventado.
- `evaluation-tests.mjs`: início da avaliação, notas 1–5, nota inválida, feedback, WhatsApp e proteção para números fora de contexto.
