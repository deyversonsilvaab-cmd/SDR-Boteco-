# SDR Sr. Boteco — v2.3.1 — Item não localizado

## Objetivo

Melhorar a resposta quando o cliente pergunta o valor de um item que não existe ou não foi localizado no catálogo oficial.

Exemplo: `qual o valor da bisteca?`

Em vez de responder com fallback genérico ou mandar para atendimento humano, o webhook agora lista as 15 categorias efetivamente presentes no catálogo e inclui o link oficial do cardápio.

## Implementação

- Adicionada `formatCategoriasResumo(knowledge, links, opener)`.
- Novo intent determinístico: `cardapio_categorias`.
- Perguntas de preço sem item localizado passam a listar categorias.
- `needs_human:false` para esse caso.
- No WhatsApp, o caso não aciona handoff.
- Itens reais continuam passando pela busca exata/aproximada antes dessa regra.

## Exemplo esperado

`qual o valor da bisteca?`

Resposta:

- informa que o item não foi localizado pelo nome;
- lista Aperitivos, Tira Gosto, Porções, Pratos Kids, Burguer Sr. Boteco, Sobremesas, À la carte, Adicionais, Executivos, Chopps, Cervejas, Caipirinhas, Doses, Sucos e Bebidas sem álcool;
- pede categoria ou nome do item;
- inclui o cardápio completo;
- não informa preço antigo da bisteca;
- não força WhatsApp/handoff.

## Testes

Foram adicionados testes para:

- `qual o valor da bisteca?` -> `intent=cardapio_categorias`;
- presença das 15 categorias;
- link oficial do cardápio;
- ausência do WhatsApp na resposta;
- WhatsApp sem handoff;
- regressão de itens reais, promoções, comentários e demais fluxos.
