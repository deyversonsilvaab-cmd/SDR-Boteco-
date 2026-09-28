# Validação v2.11.2

A validação automatizada deve confirmar:
- versão 2.11.2 em webhook/package/knowledge;
- sintaxe de `api/manychat.js` e `lib/persona.js`;
- cardápio, Instagram, promoções, avaliação, IA e handoff sem regressão;
- WhatsApp com apenas três CTAs possíveis;
- retirada usando `Pedir para retirar` e label <= 20 caracteres;
- avaliação 5 no WhatsApp sem Google Review CTA;
- `ai_handoff` suficiente para abrir atendimento humano;
- URLs externas removidas do texto do WhatsApp.
