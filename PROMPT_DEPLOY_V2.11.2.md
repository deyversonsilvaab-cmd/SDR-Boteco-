# Prompt — Deploy SDR Boteco v2.11.2

Atualize o repositório `deyversonsilvaab-cmd/SDR-Boteco-`, branch `main`, usando o ZIP completo v2.11.2.

1. Preserve `.vercelignore` na raiz.
2. Confirme que `/api` contém apenas `manychat.js`.
3. Não altere `WEBHOOK_SECRET`, `OPENAI_API_KEY` ou demais secrets.
4. Execute `npm run check`. Não publique com testes falhando.
5. Confirme `APP_VERSION`, `package.json` e `knowledge._meta.versao` em `2.11.2`.
6. Faça commit na `main` e aguarde deploy automático da Vercel.
7. Após deploy, GET `/api/manychat` deve mostrar `version: "2.11.2"`.
8. Teste POST WhatsApp: `me manda o cardápio`, `onde fica?`, `quero fazer um pedido para retirada`, `quero reservar mesa`, avaliação 5 pendente.
9. Esperado: retirada com CTA `Pedir para retirar`; reserva com `handoff=true` sem CTA; nota 5 WhatsApp sem Google CTA.

Commit sugerido: `fix: v2.11.2 whatsapp cta curto e handoff simplificado`
