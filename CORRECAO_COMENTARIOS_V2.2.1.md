# Correção de comentários — v2.2.1

## Problema observado

Uma automação de comentário estava abrindo o Direct com resposta semelhante a `first_name, oi! Não consegui ver o que você mandou...` e, na sequência, despejava cardápio + WhatsApp mesmo sem conhecer o conteúdo do comentário.

## Causas tratadas

1. `first_name` podia chegar como texto literal, não como variável resolvida.
2. O conteúdo real do comentário podia não ser enviado pelo ManyChat.
3. O código sintetizava `comentário no post`, que acabava entrando no fallback comercial.
4. A persona descrevia `instagram_comment` como resposta pública, embora o fluxo observado envie uma mensagem privada no Direct.
5. Perguntas simples de preço/item podiam receber CTA/link mesmo quando o cliente só queria informação.

## Comportamento v2.2.1

- `first_name`, `{{first_name}}`, `comment_text` e placeholders equivalentes são ignorados.
- O texto real do comentário é procurado primeiro em `comment_text`, `comment`, `instagram_comment`, `post_comment`, `trigger_text`, `event_text` e respectivos `custom_fields`.
- Sem texto real: `Opa! Vi seu comentário no nosso post. Como posso te ajudar por aqui?`
- Elogio/reação: agradecimento curto, sem link.
- Item/preço: resposta direta com a base do cardápio; sem checkout automático.
- Pedido/cardápio/delivery explícito: link continua permitido.
- Reclamação: pede detalhes, sem cardápio/iFood/99Food.
- Comentário não compreendido: abre conversa sem despejar links.

## ManyChat

O código não consegue reconstruir um comentário que o ManyChat não enviou. Para respostas contextuais, mapeie a variável real do comentário para `comment_text`. Se ela não existir no workspace, deixe vazio e use o fallback seguro.

Remova qualquer bloco/rodapé fixo `Faça o seu pedido!` no fluxo de comentários. O webhook deve decidir o CTA com base na intenção.
