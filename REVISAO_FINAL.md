# Revisão final de produção — SDR Boteco v2.1.1

## Status

Projeto revisado para operar Instagram + WhatsApp no mesmo webhook. A v2.1.1 é uma versão corretiva da 2.1.0: mantém o comportamento determinístico do Instagram e endurece handoff, fatos autorizados e segurança no WhatsApp.

## Resultado da auditoria

- Sintaxe Node/ESM válida.
- `data/knowledge.json` válido e versão atualizada para 2.1.1.
- 19/19 cenários históricos do Instagram aprovados.
- Dynamic Block do Instagram e fluxo de vagas/RH aprovados.
- Casos de WhatsApp, handoff, silêncio humano e regressão aprovados.
- Reclamações com saudação/despedida aprovadas (`oi quero estorno`, `obrigado quero reembolso`, etc.).
- Expressões benignas não acionam handoff (`sem problema, valeu`, `problema resolvido`).
- Reclamação/negociação/humano não recebem CTA comercial antes da equipe.
- Teste simulado de IA inventando `3h` é rejeitado pelo guardrail e cai para os fatos autorizados.
- Em produção sem `WEBHOOK_SECRET`, POST retorna 401.

## Health esperado

```json
{
  "ok": true,
  "service": "sdr-boteco",
  "version": "2.1.1",
  "channels": ["instagram", "whatsapp"]
}
```

## Observação de segurança

`WEBHOOK_SECRET` é obrigatório na Vercel em produção. Sem a variável, o webhook recusa POSTs por segurança. O GET de health continua disponível.

## Comando de validação

```bash
npm run check
```

O arquivo `MANIFEST_SHA256.txt` deve ser regenerado depois de qualquer edição e antes do empacotamento final.
