# Atualizações aplicadas — Sr. Boteco

## Campanhas e respostas

1. **Fondue**
   - Removida relação com Dia dos Namorados.
   - Mantidos os valores:
     - Fondue Salgado: R$ 99,90
     - Fondue Doce: R$ 89,90
   - Horário mantido: 16h às 21h.

2. **Marcação em story/foto**
   - Incluída resposta humana de agradecimento:

```txt
Aaa que demais ver sua marcação 😍

Obrigado por compartilhar esse momento com a gente.

Ficamos felizes demais de fazer parte do seu passeio.

Volta mais vezes, viu? 🍻
```

3. **Open Chopp**
   - Separado de rodízio, jogo, futebol e transmissão.
   - Valores liberados:
     - Domingo a quinta: R$ 29,90
     - Sexta e sábado: R$ 49,90
   - Horário: 16h às 21h.

4. **Almoço**
   - Atualizada resposta para ficar mais humana e orgânica.
   - Pratos executivos a partir de R$ 19,90.
   - Horário: segunda a sexta, das 11h às 15h.

5. **Preços do cardápio**
   - Mantida regra para consultar valores pelo WhatsApp.
   - Link usado: https://wa.me/5519997858351

## Correções técnicas

- Removida classificação errada de `free` como vaga.
- Removida classificação errada de `serviço` como vaga.
- `guaraná normal` não cai mais em bebida proteica.
- Adicionada possibilidade de usar `last_intent` para responder “valor” dentro do contexto de Open Chopp.
- Adicionados scripts no `package.json`:
  - `npm run dev`
  - `npm run test:local`
  - `npm run audit`


6. **Bebidas sem álcool / Zero álcool**
   - Adicionada resposta específica para perguntas sobre chopp zero.
   - Regra: o Sr. Boteco não possui chopp zero.
   - Alternativa informada: Heineken Zero long neck.
   - Valores de bebidas continuam sendo confirmados pelo WhatsApp: https://wa.me/5519997858351

7. **Campanha de tráfego pago — Open Chopp + jogo/desafio**
   - Incluídas respostas prontas para possíveis perguntas do anúncio:
     - Valor do Open Chopp;
     - Open Chopp hoje;
     - Localização;
     - Reserva e mesa para hoje;
     - Desafio do placar e regras de participação;
     - Combo frango a passarinho + calabresa;
     - Público família, criança, casal, amigos e aniversário;
     - Horários, pagamento, taxa e regra individual do Open;
     - Opção sem álcool com Heineken Zero long neck;
     - Almoço e Open no almoço;
     - Grupos, turma e happy hour de empresa;
     - Respostas curtas para comentários, como “Partiu”, “Valor?”, “Que horas?” e palpites de placar.
   - Criado bloco `respostas_anuncio_open_chopp` no `knowledge.json` com 38 respostas mapeadas.
   - Atualizado `manychat.js` para reconhecer perguntas do anúncio antes das respostas genéricas.
   - Observação: para comentários muito curtos como “Valor?” dentro do anúncio, é recomendado o ManyChat enviar `last_intent=open_chopp` ou `last_topic=anuncio_open_chopp` no External Request.
