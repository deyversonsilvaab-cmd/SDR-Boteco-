# Atualização de cardápio - v2.2.0

## Fonte

- Cardápio atual fornecido em PDF, 9 páginas.
- Cardápio digital oficial: `https://botequimpatiolimeira.saipos.com/home?utm_id=97757_v0_s00_e0_tv0`
- Data da revisão: 16/09/2026.

## O que foi incorporado

A base `data/knowledge.json` passou a conter 122 itens distribuídos em 15 categorias:

- 6 Aperitivos
- 6 Tira Gosto
- 23 Porções
- 2 Pratos Kids
- 3 Burgers Sr. Boteco
- 3 Sobremesas
- 12 À la carte
- 12 Adicionais
- 19 Executivos
- 5 Chopps
- 2 Cervejas
- 4 Caipirinhas
- 7 Doses
- 9 Sucos
- 9 Bebidas sem álcool

## Busca por aproximação

A busca não depende mais apenas de substring exata. Ela usa:

1. nome e aliases;
2. correções ortográficas conhecidas;
3. comparação aproximada de palavras;
4. pesquisa por categoria;
5. lista de opções quando o termo é ambíguo.

Exemplos:

- `kibe` -> pergunta `Você quis dizer Quibe Frito?` e informa `R$ 40,90`;
- `bruxeta` -> Brusqueta, `R$ 31,90`;
- `torremo` -> Torresmo, `R$ 38,40`;
- `lanche` / `burger` -> lista Burguer Salada, Burguer Bacon e Burguer Duplo Bacon com os três valores;
- `picanha` -> lista as opções de picanha encontradas em diferentes categorias;
- `batata frita` -> lista adicional 260g, porção meia e porção inteira.

## Segurança

- Itens de cardápio, categorias e listas são respondidos deterministicamente, sem a IA alterar nomes ou preços.
- A IA continua disponível para humanização das demais intenções.
- Item realmente ausente não recebe preço aproximado: o bot envia o cardápio oficial e, quando necessário, o WhatsApp da equipe.
- Itens antigos não presentes no PDF atual foram retirados do catálogo ativo. Entre eles: Fondue Salgado, Bisteca, Frango Power, Chopp Brahma e Chopp Ashby.

## Observação de normalização

No material visual, um dos burgers aparece impresso como `BURGUERS ALADA`. A base utiliza `Burguer Salada` como nome normalizado para atendimento e mantém `nome_no_cardapio: "BURGUERS ALADA"` para rastreabilidade da fonte.

## Testes

Execute:

```bash
npm run check
```

A suíte valida sintaxe, atendimento geral, Dynamic Block, integridade do catálogo, aproximação de escrita, WhatsApp, handoff e segurança.
