# Configuração do ManyChat — modo humano v2.12.0

Nada abaixo é obrigatório para o fluxo atual continuar funcionando. Faça no fluxo **novo** (cópia do atual), nunca no que está no ar.

## 1. Custom Fields (tipo Texto)
- `ai_resumo`
- `ai_ultima_interacao` (use Texto, não Data/Hora: o webhook envia data ISO, ex.: 2026-10-26T13:05:00.000Z)

## 2. External Request do fluxo novo (corpo JSON)
Acrescente aos campos que já existem:

```json
{
  "modo_humano": true,
  "ai_resumo": "<variável do campo ai_resumo>",
  "ai_ultima_interacao": "<variável do campo ai_ultima_interacao>"
}
```
Insira as variáveis pelo seletor do ManyChat (o nome exato muda por conta). Mantenha `channel`, `first_name`, `message`, `last_bot_reply` e o header `x-webhook-secret`.

## 3. Response Mapping (acrescentar)
- `$.ai_resumo` → `ai_resumo`
- `$.ai_ultima_interacao` → `ai_ultima_interacao`
Os mapeamentos de `reply`, `intent`, `topic`, `next_action`, `ai_handoff` etc. continuam como estão.

## 4. Condição antes de enviar a mensagem
Mensagem vazia dá erro no ManyChat. Antes do passo de envio, confira: `ai_reply` **não está vazio**. Se estiver vazio (ex.: WhatsApp com áudio, que volta com `reply` vazio e `ai_handoff=true`), pule o envio e siga só para o ramo de handoff que você já tem.

## 5. Ativação gradual
1. Duplique o fluxo atual e nomeie o antigo "v-atual, não editar".
2. Dia 0: o fluxo novo só para contatos com a tag `teste_ia`.
3. Depois: Randomizer 90% antigo / 10% novo. Só o ramo novo envia `"modo_humano": true`.
4. 50/50 e depois 100%, conforme o plano do documento.
5. Só ligue `HUMAN_TONE=on` na Vercel quando tudo estiver em 100% no fluxo novo.

## 6. Vercel (variáveis opcionais)
- `HUMAN_TONE`: vazio durante a ativação gradual; `on` liga para todos.
- `AI_BUDGET_MS`: padrão 6500.

## 7. Voltar atrás
- Randomizer em 0% no ramo novo (ou reativar o fluxo antigo). O webhook novo atende o fluxo antigo normalmente.
- Se precisar desfazer o código: Vercel, Deployments, promover o deploy anterior.
