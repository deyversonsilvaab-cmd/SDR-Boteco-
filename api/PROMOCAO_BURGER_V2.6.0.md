# SDR Sr. Boteco — v2.6.0 — Burger em Dobro

## Regra oficial

- Todas as **terças-feiras**, **a partir das 16h**.
- **Paga 1 e leva 2 do mesmo burger**.
- Não há horário final informado nesta base; o bot não deve inventar encerramento.

## Burgers cadastrados

- Burguer Salada — R$ 29,90
- Burguer Bacon — R$ 33,90
- Burguer Duplo Bacon — R$ 39,90

## Reconhecimento

O intent `promocao_burger` reconhece termos como `burger em dobro`, `lanche em dobro`, `promoção de lanche`, `promoção de burger`, `promoção de terça` e `paga 1 leva 2`.

A promoção genérica sem contexto (`tem promoção?`) continua usando a promoção oficial de chopp, para não alterar o comportamento já validado.

## Fondue doce

`Fondue doce` não faz parte do catálogo ativo. O webhook mantém uma trava explícita para tratar esse termo como item/condição inativa e impedir que a IA invente preço ou disponibilidade.

## Testes

`promo-tests.mjs` valida a promoção de burger, ausência do antigo horário final de 21h, funcionamento no WhatsApp sem handoff e permanência do Fondue doce fora da base ativa.
