# SDR Sr. Boteco — v2.4.0 — CTAs contextuais e localização

Data: 17/09/2026

## Objetivo

Manter a linguagem e o conteúdo das respostas aprovadas, mas remover URLs de ação do corpo das DMs do Instagram e apresentar somente o botão relacionado ao assunto da conversa.

## Implementado

- Novo link oficial de rota no Google Maps: `https://maps.app.goo.gl/sr7PgRhUxaNuzg8e8`.
- DMs do Instagram removem do texto URLs de Cardápio, WhatsApp geral, WhatsApp do RH e Google Maps.
- iFood e 99Food continuam no texto em respostas de delivery.
- Novo seletor determinístico de CTA por intenção:
  - cardápio, item, categoria, almoço, item não localizado → `cardapio` / **Cardápio**;
  - pedido e delivery → `pedido` / **Fazer pedido**;
  - endereço/localização → `localizacao` / **Como chegar**;
  - promoção de chopp → `localizacao` / **Como chegar**;
  - atendimento humano/reserva → `whatsapp` / **Falar no WhatsApp**;
  - vagas → `rh` / **Enviar currículo**;
  - saudações, horário, pagamento e relacionamento → sem CTA forçado.
- Payload padrão ganhou: `app_version`, `cta_count`, `cta_type`, `cta_label`, `cta_url`, `ctas`, `localizacao_link` e `maps_link`.
- Dynamic Block v2 usa a mesma seleção contextual e exibe no máximo o CTA relacionado ao assunto.
- Comentários do Instagram não recebem essa limpeza/CTA contextual, preservando o fluxo separado.
- Canal WhatsApp não é afetado pela limpeza e continua recebendo links no texto quando necessário.

## O que foi preservado

- 122 itens e 15 categorias do cardápio.
- Busca aproximada e correção de grafia.
- Promoção oficial de chopp e seus guardrails.
- Comentários do Instagram.
- WhatsApp, handoff e silêncio humano.
- RH/vagas.
- Segurança `WEBHOOK_SECRET`.
- Persona e linguagem das respostas.
- iFood/99Food em delivery.

## Observação sobre o ManyChat

O webhook consegue decidir qual CTA deve aparecer, mas o fluxo padrão atual do ManyChat ainda possui um bloco fixo com **Cardápio + Falar no WhatsApp**. Esse bloco precisa ser substituído por condições baseadas em `cta_type`. O arquivo `PROMPT_EXECUCAO_MANYCHAT_V2.4.0.md` contém o procedimento.

## Continuidade analisada

O arquivo de continuidade anterior indicava a limpeza de links como pendente na v2.3.1. Essa etapa já estava incorporada na v2.3.2 usada como base desta versão. Tarefas de verificação empresarial Meta, remoção de usuário do Business Manager e reconcessão de Messenger não fazem parte do código do webhook e não foram executadas.
