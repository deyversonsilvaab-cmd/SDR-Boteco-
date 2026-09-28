# v2.11.2 — WhatsApp: CTA compatível e handoff simplificado

## Decisões
1. O botão de retirada passa a ser **Pedir para retirar** (18 caracteres).
2. `ai_marcar_aberta` deixa de ser requisito do ManyChat. O webhook mantém `marcar_conversa_aberta` no JSON por compatibilidade, mas a automação deve usar apenas `ai_handoff=true` para pausar o bot e deixar a conversa para atendimento humano.
3. O fluxo de feedback do pedido no WhatsApp não deve usar botão **Avaliar no Google**. A política do canal continua: botão somente para **Ver cardápio**, **Como chegar** e **Pedir para retirar**.
4. A tradução automática do Chrome deve ser desativada durante configuração/auditoria do ManyChat para evitar nomes de campos visualmente alterados.

## Testes adicionados
- CTA de retirada com label exato `Pedir para retirar`;
- todos os CTAs permitidos no WhatsApp com até 20 caracteres;
- nota 5 no WhatsApp sem CTA/link do Google.
