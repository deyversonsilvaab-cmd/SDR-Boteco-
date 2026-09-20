# SDR Sr. Boteco — v2.3.2 — Links de Cardápio/WhatsApp via botões

## Objetivo

Nas DMs do Instagram, remover as URLs do cardápio e do WhatsApp geral do texto da resposta porque esses destinos já estão publicados como botões nativos no ManyChat.

## Regras

- Instagram DM/Story: remove `links.menu` e `links.whatsapp` do texto final.
- Instagram comment: não aplica a limpeza.
- WhatsApp: não aplica a limpeza.
- iFood e 99Food continuam visíveis no texto quando presentes.
- Os campos `cardapio_link` e `whatsapp_link` continuam sendo retornados no JSON.
- Dynamic Block recebe texto limpo e mantém os botões correspondentes.

## Implementação

- `formatCategoriasResumo()` passou a colocar o link do cardápio em linha separada.
- Criada `stripButtonLinks(text, links)`.
- A limpeza é aplicada depois de `ensurePersonalized()` e antes da montagem do Dynamic Block/payload padrão, apenas quando `!isWhatsapp(customer) && !commentEvent`.

## Testes

A suíte `button-links-tests.mjs` valida:

1. DM do Instagram sem URLs de Cardápio/WhatsApp no texto.
2. Campos `cardapio_link` e `whatsapp_link` preservados.
3. iFood/99Food preservados em delivery.
4. Item não encontrado sem URL textual.
5. Pedido de atendente sem URL textual do WhatsApp.
6. Canal WhatsApp inalterado.
7. Comentários do Instagram inalterados.
8. Dynamic Block com texto limpo e botão funcional.
