# Revisão final de produção — SDR Boteco v2.0.0

Data: 15/09/2026

## Resultado

Projeto revisado para uso como webhook de atendimento do Instagram via ManyChat + Vercel.

### Validações concluídas

- `api/manychat.js`: sintaxe Node.js válida.
- `data/knowledge.json`: JSON válido.
- 18 cenários críticos automatizados: **18/18 aprovados**.
- 1 teste adicional de integração do Dynamic Block v2: **aprovado**.
- Dynamic Block v2: retorno validado com `version=v2`, canal `instagram`, mensagem, botão e ações de custom fields.
- Personalização por primeiro nome validada nos testes.
- Fallback interno validado por inspeção e estrutura do handler.
- Base e documentação verificadas para eliminar conteúdo comercial descontinuado solicitado na revisão.
- Valor conflitante da cerveja sem álcool foi tratado de forma conservadora: o webhook não informa preço e encaminha para confirmação, evitando escolher arbitrariamente entre duas informações diferentes existentes no material antigo.

## Casos de aceite cobertos

1. Tábua Mista sem dados comerciais validados.
2. Continuação: `O que acompanha o prato?` mantendo o contexto anterior.
3. `Olá tem alguém?`.
4. Pedido de cardápio.
5. Categoria `Burgers`.
6. Pergunta sobre picanha.
7. Erro de digitação em item conhecido.
8. Solicitação de opção comercial não ativa.
9. Cliente querendo fazer pedido.
10. Delivery.
11. Preço de item cadastrado.
12. Item conhecido sem preço validado.
13. Valores de chopp individual cadastrado.
14. Item com conflito histórico de preço.
15. Vale alimentação.
16. Reserva.
17. Consulta sobre condição comercial não ativa.
18. Vaga de emprego.

## Política de cardápio

O arquivo original não continha uma cópia integral e atual do cardápio online com **descrição + preço + quantidade de pessoas** para todos os produtos. Alguns nomes citados nas conversas, por exemplo, não possuíam esses três dados validados no material fornecido.

Para não fabricar informação, a versão 2 segue esta regra:

- se o item está na base com dados validados, responde com os dados existentes;
- se o preço ou quantidade de pessoas não estiver validado, informa isso e oferece confirmação humana;
- se o item não estiver catalogado, envia imediatamente o cardápio online + WhatsApp;
- em todos esses casos a conversa recebe resposta e o assunto é salvo em `topic` para manter a continuidade.

A estrutura do `catalogo` já está pronta para receber o restante do cardápio quando houver uma exportação oficial com os dados completos. Não é necessário alterar a lógica do webhook para acrescentar novos itens.

## Conversão para pedido

As rotas comerciais utilizam:

- cardápio/pedido direto para retirada ou entrega;
- iFood;
- 99Food;
- WhatsApp para confirmação humana quando faltar informação validada.

## Arquivos mais importantes

- `api/manychat.js` — lógica principal.
- `data/knowledge.json` — única fonte de fatos comerciais do bot.
- `MANYCHAT_COORDENADAS.md` — configuração operacional no ManyChat.
- `PROMPT_CONFIGURACAO_ADICIONAL.md` — prompt pronto para executar a configuração que não pode ser feita pelo GitHub/Vercel.
- `audit-test.mjs` — testes de regressão.

## Comando obrigatório antes de cada deploy futuro

```bash
npm run check
```

Somente publicar se todos os testes terminarem sem falhas.
