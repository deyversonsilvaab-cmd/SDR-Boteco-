# v2.10.1 — Revisão do funil v2.10.0

Data: 28/09/2026

A v2.10.0 acertou os principais vazamentos de conversa (visita, marmita, happy hour, frustração com robô e próximo passo após preço), mas a auditoria encontrou pontos que não deveriam ir para produção sem ajuste.

## Correções desta versão

1. **Reserva sem promessa automática**
   - Sai: `Te separo uma mesa`.
   - Entra: `Se quiser reservar uma mesa, toque em "Reservar mesa" e a equipe confirma com você.`
   - O webhook continua sem confirmar reserva sozinho.

2. **CTA de reserva apenas quando faz sentido**
   - Comidas elegíveis continuam com `Reservar mesa + Cardápio + Como chegar`.
   - Bebidas, cervejas, chopp individual, doses, sucos, caipirinhas, adicionais e sobremesas não recebem convite artificial de reserva; usam `Cardápio + Como chegar`.
   - Pratos do almoço continuam sem CTA de reserva.

3. **Happy hour sem falso positivo**
   - `Parou o happy?`, `happy hour`, `happy acabou?` continuam abrindo a promoção de chopp.
   - `happy birthday` não é mais interpretado como promoção.

4. **Horário com próximo passo**
   - Respostas de horário agora oferecem `Como chegar + Promoções no Whats`.

5. **Visita confirmada**
   - Mantém `Como chegar + Promoções no Whats`.
   - Texto corrigido para falar em `botões abaixo` quando há duas ações.

6. **Captação de WhatsApp**
   - Mantidos os links com mensagem pré-preenchida para reserva e interesse em promoções.
   - O webhook não considera o clique sozinho como inscrição em lista. O ManyChat deve registrar Tag/Campo quando a mensagem de interesse chegar pelo WhatsApp.

7. **Integridade do pacote**
   - `APP_VERSION`, `package.json` e `knowledge._meta.versao` alinhados em `2.10.1`.
   - Manifesto SHA-256 regenerado depois de todas as mudanças.
   - Testes de regressão ampliados.

## Resultado

`npm run check`: 250 PASS / 0 FAIL.
