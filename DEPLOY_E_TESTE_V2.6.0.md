# Deploy e teste — SDR Sr. Boteco v2.6.0

1. Publicar o conteúdo do pacote no mesmo projeto Vercel.
2. Confirmar `GET /api/manychat` com `version: "2.6.0"`.
3. Testar no Instagram:
   - `qual a promoção de lanche?` → terça, a partir das 16h, paga 1 e leva 2 do mesmo burger + opções/preços.
   - `tem promoção de terça?` → mesma promoção de burger.
   - `tem promoção?` → continua na promoção de chopp.
   - `tem fondue doce?` → não informar preço/disponibilidade; tratar como opção fora da base ativa.
4. Confirmar que os CTAs contextuais e a remoção de links do texto continuam funcionando conforme v2.4/v2.5.
