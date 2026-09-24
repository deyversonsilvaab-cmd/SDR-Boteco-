# v2.9.9 — Estacionamento do Pátio Limeira Shopping

Tabela oficial enviada pelo Michel (24/09/2026), cadastrada em `data/knowledge.json` → `estacionamento`.

- Carros: até 2h R$ 12,00 | hora adicional R$ 4,00 | pernoite R$ 60,00
- Motos: até 2h R$ 10,00 | hora adicional R$ 4,00 | pernoite R$ 60,00
- Perda do ticket: R$ 40,00
- Funcionamento: seg a sex 5h às 0h; sáb 10h às 0h; dom e feriados 11h30 às 0h
- Aviso: as tarifas podem sofrer alterações sem notificação prévia.

## Comportamento
- "tem estacionamento?", "estacionamento é pago?", "onde deixo o carro", "tem onde estacionar?", "quanto é o estacionamento?" → endereço + tabela completa + botão **Como chegar**.
- Follow-up com contexto (`last_topic = estacionamento`): "e pra moto?", "quanto custa?" continuam no estacionamento.
- Resposta determinística (a IA não reescreve valores). Não passa mais para a equipe.
- Para atualizar valores no futuro, altere só `knowledge.json` → `estacionamento`.
