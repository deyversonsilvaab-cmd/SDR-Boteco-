# Deploy e teste — SDR Sr. Boteco v2.5.0

## Deploy

Esta versão não exige novos campos no ManyChat além dos CTAs contextuais já definidos na v2.4.0. Publique o projeto na Vercel e confirme:

```json
{"version":"2.5.0","channels":["instagram","whatsapp"]}
```

## Testes ao vivo recomendados

1. `Tem bisteca?`
   - deve responder Bisteca, R$ 19,90, composição e `segunda a sexta-feira, das 11h às 15h`;
   - Instagram DM não deve exibir URL do cardápio no meio do texto;
   - CTA esperado: Cardápio.
2. `Quais são os pratos do dia?`
   - deve listar os 9 Pratos do Dia e valores;
   - deve informar a janela 11h–15h e o adicional opcional de bebida +R$ 5,00.
3. `Qual o valor do filé de frango grelhado?`
   - deve mostrar Prato do Dia R$ 22,90 e Executivo R$ 30,90.
4. `Qual o valor do filé de frango grelhado no almoço?`
   - deve responder R$ 22,90 e horário 11h–15h.
5. `Qual o valor do filé de frango grelhado executivo?`
   - deve responder R$ 30,90.
6. `Qual valor do quibe?`
   - deve continuar retornando Quibe Frito R$ 40,90.
7. `Promoção`
   - deve continuar retornando a promoção de chopp cadastrada.

## Observação ManyChat

Se ainda aparecerem dois botões fixos (`Cardápio` + `Falar no WhatsApp`) em toda resposta, isso não vem da v2.5.0: o fluxo do ManyChat ainda está usando o bloco fixo. A lógica de CTA contextual permanece a mesma da v2.4.0.
