# SDR Sr. Boteco — v2.5.0 — Pratos do Dia / almoço

## Fonte

- Cardápio principal: PDF atual do Sr. Boteco (9 páginas).
- Complemento oficial: arte **Pratos do Dia** enviada em 17/09/2026.
- Janela de atendimento confirmada pelo responsável: **segunda a sexta-feira, das 11h às 15h**.

## Pratos do Dia cadastrados

| Prato | Valor |
| --- | ---: |
| Filé de Frango com Toscana | R$ 22,90 |
| Bisteca | R$ 19,90 |
| Bife Acebolado | R$ 27,90 |
| Strogonoff de Frango | R$ 21,90 |
| Filé de Frango Grelhado | R$ 22,90 |
| Filé de Frango à Parmegiana | R$ 26,90 |
| Linguiça Toscana | R$ 21,90 |
| Omelete de Calabresa | R$ 21,90 |
| Prato Fitness Frango | R$ 19,90 |

Todos carregam a regra: **exclusivo no almoço, segunda a sexta-feira, das 11h às 15h**.

A arte também informa adicional opcional de bebida por **+R$ 5,00**: 1 suco de limão ou laranja (300 ml) ou Coca-Cola KS (290 ml).

## Tratamento de pratos com mais de um preço

Alguns nomes também existem na categoria Executivos. A v2.5.0 não escolhe um valor aleatoriamente:

- `filé de frango grelhado` → mostra Prato do Dia R$ 22,90 e Executivo R$ 30,90;
- `strogonoff/estrogonofe de frango` → mostra Prato do Dia R$ 21,90 e Executivo R$ 36,90;
- `filé de frango à parmegiana` → mostra Prato do Dia R$ 26,90 e Executivo R$ 36,90;
- `linguiça toscana` → mostra Prato do Dia R$ 21,90 e Executivo R$ 30,90.

Se a mensagem trouxer `almoço`/`prato do dia`, usa a versão de almoço. Se trouxer `executivo`, usa a versão Executiva.

## Segurança e apresentação

- Os Pratos do Dia são determinísticos; a IA não altera preço ou horário.
- No Instagram DM, o link do cardápio continua fora do texto e disponível pelo CTA contextual.
- O WhatsApp mantém o comportamento já existente.
- Itens não cadastrados continuam listando categorias, mas **Bisteca não é mais tratada como item ausente**.
- A limpeza de links passou a reconhecer também links Markdown do tipo `[Cardápio](URL)`.

## Testes

`npm run check` inclui `lunch-tests.mjs`, que valida:

- 9 Pratos do Dia;
- horário de segunda a sexta, 11h–15h;
- Bisteca e sua composição;
- lista completa de almoço;
- valores diferentes entre almoço e Executivo;
- Strogonoff/Estrogonofe;
- consulta automática de **todos os 131 itens do catálogo**, exigindo que cada item retorne seu valor cadastrado.
