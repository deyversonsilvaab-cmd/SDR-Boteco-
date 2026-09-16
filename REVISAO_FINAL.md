# Revisão final de produção — SDR Boteco v2.3.0

## Status

Versão 2.3.0 preparada a partir da v2.2.1, adicionando a promoção oficial de chopp sem alterar o catálogo, a persona, os canais, handoff, comentários, RH ou segurança do webhook.

## Promoção oficial

- Todos os dias: chopp a partir de **R$ 9,90**.
- Sábado e domingo, das **16h às 20h**: caneca de **340 ml** de **Chopp Ashby e/ou Chopp Brahma** por **R$ 3,99**.
- Aviso obrigatório: **consultar disponibilidade no local**.
- Não há cálculo de dia/hora atual; o bot apenas informa a janela cadastrada.

## Compatibilidade

- Catálogo preservado: **122 itens / 15 categorias**.
- `lib/persona.js` permanece sem alterações em relação à v2.2.1.
- Instagram e WhatsApp continuam no mesmo endpoint.
- Dynamic Block v2, handoff, silêncio humano, vagas/RH e comentários permanecem ativos.
- `WEBHOOK_SECRET` continua obrigatório em produção.

## Testes

`npm run check` executa:

- auditoria geral;
- cardápio e aproximação;
- WhatsApp/handoff/segurança;
- comentários do Instagram;
- promoção de chopp.

A suíte da promoção cobre Chopp Brahma, Chopp Ashby, `chopp`, `chope`, `promoção`, `happy hour`, erros de digitação e bloqueio de dia/horário inventado pela IA.

## Health esperado

```json
{
  "ok": true,
  "service": "sdr-boteco",
  "version": "2.3.0",
  "channels": ["instagram", "whatsapp"]
}
```

## Validação

```bash
npm run check
```
