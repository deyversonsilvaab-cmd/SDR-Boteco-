# Prompt de configuração adicional — ManyChat

Use este prompt com um agente que tenha acesso operacional ao seu ManyChat. Ele cobre as configurações que o código do GitHub/Vercel não consegue aplicar sozinho dentro da conta.

```text
Atue como especialista sênior em ManyChat para Instagram, automação conversacional, atendimento e vendas para restaurante.

OBJETIVO
Configurar a conta ManyChat do Sr. Boteco Limeira para que toda mensagem relevante do Instagram tenha uma resposta humana, personalizada e segura através do webhook já publicado no Vercel. Não altere preços, produtos, horários ou condições comerciais dentro do ManyChat: a fonte oficial é o webhook/base no GitHub.

PRINCÍPIOS INEGOCIÁVEIS
1. Nenhum cliente deve ficar sem resposta por falta de palavra-chave.
2. Enviar o primeiro nome real do contato ao webhook sempre que disponível.
3. Não criar preço, descrição, porção, promoção ou disponibilidade dentro do ManyChat.
4. Manter contexto: salvar intent/topic retornados e reenviar na mensagem seguinte.
5. Se o servidor/rede falhar, usar fallback com cardápio/pedido + WhatsApp.
6. Evitar automações concorrentes respondendo à mesma mensagem.
7. Não usar placeholders visíveis para o cliente.
8. Não confirmar reserva automaticamente; coletar dados e encaminhar para confirmação da equipe.
9. Toda rota de cardápio ou pedido deve facilitar a conversão pelo link de pedido.
10. O tom deve ser de venda consultiva e atendimento humano, sem frases robóticas ou excesso de emoji.

DADOS FIXOS PARA FALLBACK
Cardápio/pedido: https://botequimpatiolimeira.saipos.com/home?utm_id=97757_v0_s00_e0_tv0
WhatsApp: https://wa.me/5519997858351

a) CRIAR CAMPOS PERSONALIZADOS
- ai_reply (texto)
- ai_reply_part_1 (texto)
- ai_reply_part_2 (texto)
- ai_reply_part_3 (texto)
- ai_intent (texto)
- ai_topic (texto)
- ai_lead_temperature (texto)
- ai_next_action (texto)
- ai_needs_human (booleano ou texto compatível)
- ai_last_bot_reply (texto)

b) CONFIGURAR DEFAULT REPLY DO INSTAGRAM
Configurar uma automação ampla para mensagens diretas não capturadas por fluxos mais específicos.
Fluxo:
Default Reply -> External Request POST -> mapear JSON -> enviar resposta -> atualizar contexto.
Configure o gatilho para que mensagens genéricas também entrem, inclusive saudações, erros de digitação, nomes de categorias e perguntas abertas.

c) EXTERNAL REQUEST
URL: usar o endpoint /api/manychat do domínio Vercel já publicado.
Método: POST
Headers:
Content-Type: application/json
x-webhook-secret: usar o mesmo WEBHOOK_SECRET configurado no Vercel.

Body: selecione pela interface do ManyChat as variáveis reais do contato, equivalentes a:
subscriber_id = ID do contato
first_name = primeiro nome
username = username do Instagram
message = última mensagem de texto recebida
last_intent = ai_intent
last_topic = ai_topic
last_bot_reply = ai_last_bot_reply
channel = instagram

Não digite placeholders como texto literal. Insira as variáveis pelo seletor do ManyChat.

d) RESPONSE MAPPING
$.reply -> ai_reply
$.reply_part_1 -> ai_reply_part_1
$.reply_part_2 -> ai_reply_part_2
$.reply_part_3 -> ai_reply_part_3
$.intent -> ai_intent
$.topic -> ai_topic
$.lead_temperature -> ai_lead_temperature
$.next_action -> ai_next_action
$.needs_human -> ai_needs_human

Depois, salvar ai_reply em ai_last_bot_reply se isso não sobrescrever prematuramente a mensagem do cliente.

e) BLOCO DE RESPOSTA
Enviar ai_reply_part_1 sempre que preenchido.
Enviar ai_reply_part_2 apenas quando não vazio.
Enviar ai_reply_part_3 apenas quando não vazio.
Nunca enviar caixa/mensagem vazia.

f) FALLBACK DO EXTERNAL REQUEST
Se o request falhar, enviar exatamente uma resposta curta e útil com:
- aviso de que queremos passar a informação correta;
- https://botequimpatiolimeira.saipos.com/home?utm_id=97757_v0_s00_e0_tv0
- https://wa.me/5519997858351
Não terminar o fluxo silenciosamente.

g) STORY REPLY
Criar/ajustar o gatilho de resposta ou reação ao Story para enviar o conteúdo ao mesmo webhook, incluindo first_name, username, message, last_intent, last_topic, event_type=story_reply e channel=instagram.

h) STORY MENTION
Criar/ajustar o gatilho de menção em Story para usar o mesmo webhook. Enviar first_name, username, event_type=story_mention e channel=instagram. Se houver texto real disponível, enviar também em message.

i) COMENTÁRIOS DE POSTS/REELS
Criar/ajustar o gatilho de comentários para enviar comment_text, first_name, username, last_intent e last_topic ao webhook. Quando apropriado, usar uma resposta pública curta e levar a conversa para o Direct, onde o atendimento completo será feito.

j) TESTE DE ACEITE
Antes de publicar para todos, testar uma conta real de Instagram com estas mensagens:
- Oi, quero saber sobre a Tábua Mista
- O que acompanha o prato?
- Olá tem alguém?
- Queria o cardápio
- Burgers
- Vocês têm picanha?
- Foundie
- Olá boa noite, queria fazer um pedido
- Qual o valor da bisteca?
- Vocês entregam?
- Aceita vale alimentação?
- Quero reservar uma mesa

Para cada teste, registrar:
1. payload enviado;
2. status HTTP;
3. JSON devolvido;
4. mensagem exibida ao usuário;
5. ai_intent salvo;
6. ai_topic salvo;
7. se o primeiro nome foi usado;
8. se houve informação não validada.

CONDIÇÃO DE APROVAÇÃO
Somente considerar a configuração concluída quando todos os testes receberem resposta, não houver duplicidade de mensagens, nenhum dado comercial for inventado, contexto funcionar nas mensagens seguintes e o fallback funcionar ao simular falha do request.

Não altere o webhook, os preços ou a base comercial durante essa configuração sem uma evidência objetiva de erro. Se alguma opção da interface do ManyChat tiver nome diferente por atualização da plataforma, use o equivalente funcional e documente exatamente o que foi configurado.
```
