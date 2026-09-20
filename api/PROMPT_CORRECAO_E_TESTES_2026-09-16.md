# Prompt — Auditoria, correção e testes das atualizações de 16/09/2026

Use este prompt com Cursor / Claude Code / Codex ou outro assistente com o repositório aberto.

```text
Você é um engenheiro sênior responsável por auditar o webhook SDR Sr. Boteco Limeira após as atualizações de 16/09/2026.

VERSÃO ESPERADA
- 2.2.1
- Endpoint: POST /api/manychat
- Canais: instagram e whatsapp
- Base oficial: data/knowledge.json
- Cardápio atual: 122 itens / 15 categorias

OBJETIVO
Validar que TODAS as mudanças feitas hoje convivem sem regressão:
1) v2.1.1 — WhatsApp + handoff humano + guardrails;
2) v2.2.0 — cardápio completo + busca por aproximação;
3) v2.2.1 — correção de comentários do Instagram que abrem conversa no Direct.

NÃO QUEBRE
- x-webhook-secret / WEBHOOK_SECRET.
- contrato principal de entrada e saída do webhook.
- Instagram Direct, Story Reply, Story Mention.
- WhatsApp e silêncio com atendimento_humano.
- RH/vagas.
- Dynamic Block v2.
- cardápio, preços, aliases e busca aproximada.

A) COMENTÁRIOS DO INSTAGRAM
Trate event_type="instagram_comment" como MENSAGEM PRIVADA no Direct disparada depois de comentário em post/Reel.

Regras:
- Priorize o texto real vindo em comment_text/comment/custom_fields.comment_text.
- Nunca invente conteúdo quando o comentário não foi enviado.
- Nunca exponha first_name, {{first_name}}, comment_text, {{comment_text}} ou outro placeholder literal.
- Sem texto do comentário: responder apenas algo como “Opa! Vi seu comentário no nosso post. Como posso te ajudar por aqui?”, sem cardápio/WhatsApp.
- Elogio/reação: agradecer, sem CTA.
- Pergunta de item/preço: consultar a base e responder o valor/conteúdo; não empurrar checkout.
- Pedido/cardápio/delivery explícito: pode enviar o link oficial.
- Reclamação: não oferecer cardápio/iFood/99Food; pedir detalhes/encaminhar adequadamente.
- Não dizer “te mandei no Direct”, pois a mensagem já está no Direct.
- Remover do fluxo do ManyChat qualquer texto ou botão fixo “Faça o seu pedido!”. Enviar apenas ai_reply.

Testes obrigatórios:
1. event_type instagram_comment + first_name="first_name" + comment_text="comment_text" → sem placeholders, sem links, intent comentario_sem_texto.
2. first_name="{{first_name}}" + “Top demais 🔥” → agradecimento curto, zero CTA.
3. “Qual o valor do kibe?” → Quibe Frito, R$ 40,90, sem checkout automático.
4. “Qual o valor do lanche?” → 3 opções de Burguer, R$ 29,90 / 33,90 / 39,90, sem checkout automático.
5. “Meu pedido veio errado” → reclamação, sem cardápio/iFood/99Food.
6. “Quero fazer um pedido” → link de pedido permitido.
7. custom_fields.comment_text deve funcionar.
8. comment_text deve ter prioridade sobre message genérico.
9. Dynamic Block de elogio não pode criar botão de venda.

B) CARDÁPIO / APROXIMAÇÃO
Confirmar:
- 122 itens e 15 categorias.
- link oficial contém utm_id=97757_v0_s00_e0_tv0.
- kibe -> Quibe Frito R$ 40,90.
- bruxeta -> Brusqueta R$ 31,90.
- lanche -> categoria Burguer com três preços.
- picanha e batata frita mostram opções quando ambíguas.
- itens antigos (bisteca, fondue salgado, Chopp Brahma/Ashby, Frango Power) não podem receber preço inventado.
- nenhum preço pode ser criado por aproximação.

C) WHATSAPP / HANDOFF
Confirmar:
- reserva -> handoff_humano.
- reclamação com a palavra pedido não oferece checkout antes da equipe.
- oi quero estorno / quero cancelar / reembolso -> reclamação.
- sem problema, valeu -> NÃO gera falso handoff.
- falar com atendente -> handoff sem mandar link do próprio WhatsApp.
- negociação/grande quantidade -> handoff.
- cardápio normal -> bot resolve sem handoff.
- atendimento_humano=true ou "1" -> reply vazio / silencio_humano.
- vaga -> RH dedicado, sem handoff geral.
- WhatsApp usa uma mensagem; Instagram mantém split.

D) SEGURANÇA / IA
Confirmar:
- WEBHOOK_SECRET ausente em produção -> 401.
- IA não pode inventar preço, URL, horário, quantidade, dia, forma de pagamento ou disponibilidade.
- guardrails devem rejeitar horário inventado.
- em handoff, até URL comercial oficial inserida indevidamente pela IA deve ser rejeitada.
- sem OPENAI_API_KEY, o determinístico continua funcionando.

E) MANYCHAT — CHECAGEM MANUAL
Verificar o fluxo “Comentários”:
- usar variável real de primeiro nome, não texto literal first_name;
- usar variável real do texto do comentário em comment_text;
- event_type="instagram_comment";
- channel="instagram";
- mapear $.reply -> ai_reply;
- enviar somente {{ai_reply}};
- remover “Faça o seu pedido!” fixo e qualquer link anexado por fora do webhook.

F) EXECUÇÃO
1. Rode npm run check.
2. Todos os testes devem passar.
3. GET /api/manychat deve retornar version="2.2.1" e channels=["instagram","whatsapp"].
4. Não faça deploy se algum teste falhar.
5. Mostre um resumo dos resultados e qualquer divergência antes de alterar mais código.
```
