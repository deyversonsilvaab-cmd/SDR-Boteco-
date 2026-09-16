# Revisão final de produção — SDR Boteco v2.2.0

## Status

Projeto revisado para Instagram + WhatsApp no mesmo webhook, agora com o cardápio atual incorporado à base interna. A v2.2.0 preserva handoff, guardrails e segurança da v2.1.1 e amplia a resolução determinística de itens e preços.

## Cardápio

- Fonte principal: PDF `Cardápio Sr boteco atual` enviado em 16/09/2026.
- 122 itens catalogados em 15 categorias.
- Preços e descrições da base foram preenchidos a partir do material fornecido.
- Link digital oficial: `https://botequimpatiolimeira.saipos.com/home?utm_id=97757_v0_s00_e0_tv0`.
- Itens antigos não presentes no material atual foram retirados do catálogo ativo.

## Busca inteligente

- Correspondência por nome e aliases.
- Correções ortográficas conhecidas.
- Similaridade por tokens para erros não cadastrados.
- Categoria por aproximação sem selecionar item arbitrário.
- Termos ambíguos retornam múltiplas opções.

Exemplos validados:

- `kibe` → pergunta se o cliente quis dizer **Quibe Frito** e informa **R$ 40,90**.
- `lanche` → lista os 3 Burgers com seus valores.
- `bruxeta` → **Brusqueta, R$ 31,90**.
- `picanha` → lista as opções de picanha existentes em diferentes categorias.
- `batata frita` → lista meia, inteira e adicional de 260g.

## Resultado da auditoria

- Sintaxe Node/ESM válida.
- Base JSON válida, IDs únicos, preços formatados e categorias sem itens órfãos.
- 22/22 cenários gerais aprovados.
- Dynamic Block e rota de vagas/RH aprovados.
- Testes de integridade e aproximação do cardápio aprovados.
- Todos os testes de WhatsApp, handoff, segurança e guardrails aprovados.
- Produção sem `WEBHOOK_SECRET` continua retornando 401.

## Health esperado

```json
{
  "ok": true,
  "service": "sdr-boteco",
  "version": "2.2.0",
  "channels": ["instagram", "whatsapp"]
}
```

## Comando de validação

```bash
npm run check
```

Regenerar `MANIFEST_SHA256.txt` após qualquer alteração antes do empacotamento final.
