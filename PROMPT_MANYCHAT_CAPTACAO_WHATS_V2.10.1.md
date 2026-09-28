# Prompt — ManyChat | Captação de WhatsApp v2.10.1

Você é especialista sênior em ManyChat + WhatsApp Business. Revise a conta do Sr. Boteco e implemente a captação de contatos que chegam pelo botão `Promoções no Whats`, sem alterar o webhook nem os CTAs dinâmicos já existentes.

## Pré-condição

O WhatsApp do Sr. Boteco precisa estar conectado e operacional no ManyChat. Se estiver desconectado ou com erro de permissão, não tente criar disparos antes de corrigir a conexão.

## Origem do opt-in

O webhook v2.10.1 abre o WhatsApp do restaurante com a mensagem pré-preenchida:

`Quero receber o cardápio e as promoções do Sr. Boteco no WhatsApp`

Quando essa mensagem (ou variação inequívoca) chegar pelo WhatsApp:

1. aplicar Tag: `OPTIN_PROMO_WHATSAPP`;
2. definir Custom Field `whatsapp_promocoes_optin = true`;
3. se houver campo de data disponível, salvar `whatsapp_promocoes_optin_em` com data/hora atual;
4. salvar origem `whatsapp_promocoes_origem = instagram_cta` quando identificável;
5. responder com confirmação curta, sem novo link comercial:
   `Fechado! Vou deixar seu contato marcado para receber cardápio e promoções do Sr. Boteco por aqui. Se quiser parar de receber, é só pedir.`

## Segmentação

Criar segmentos/listas com base na Tag/Campo, sem duplicar contatos:

- Base Promoções WhatsApp: `whatsapp_promocoes_optin = true`
- Início de Semana: opt-in verdadeiro + filtros comerciais definidos pela operação
- Fim de Semana: opt-in verdadeiro + filtros comerciais definidos pela operação

Não colocar pessoas na lista apenas porque clicaram no botão; registrar somente quando a mensagem chegar ou houver outro consentimento válido já registrado.

## Disparos

Para mensagens proativas fora da janela de atendimento do WhatsApp, usar modelo/template aprovado na categoria adequada. Não disparar marketing para contatos sem opt-in registrado.

## Opt-out

Criar tratamento para mensagens como:

- parar
- sair
- cancelar promoções
- não quero mais

Ao receber uma dessas intenções:

- remover Tag `OPTIN_PROMO_WHATSAPP`;
- definir `whatsapp_promocoes_optin = false`;
- confirmar o cancelamento em uma frase curta.

## Preservar

Não alterar:

- endpoint `/api/manychat`;
- `WEBHOOK_SECRET`;
- automações de Instagram já publicadas;
- CTAs dinâmicos `cta_1/2/3`;
- handoff humano;
- avaliação 1–5;
- cardápio/preços/promoções do webhook.

## Validação

Testar com contato interno:

1. clicar `Promoções no Whats` no Instagram;
2. enviar a mensagem pré-preenchida;
3. confirmar criação/atualização do contato no WhatsApp do ManyChat;
4. confirmar Tag e Custom Field;
5. confirmar que o contato aparece no segmento de promoções;
6. testar opt-out;
7. confirmar que não houve mensagem enviada a cliente real durante o teste.

Ao terminar, relatar exatamente quais automações, Tags, Custom Fields, segmentos e templates foram criados ou alterados.
