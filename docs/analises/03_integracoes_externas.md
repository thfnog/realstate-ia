# 03 — Análise de Integrações Externas

## Mapa de Integrações

```
┌─────────────────────────────────────────────────────┐
│                    ImobIA (Vercel)                    │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Supabase │  │ Groq AI  │  │ Evolution API     │  │
│  │ (DB+Auth)│  │ (LLM)    │  │ (WhatsApp)        │  │
│  └────┬─────┘  └────┬─────┘  └────┬──────────────┘  │
│       │              │              │                  │
│       │ Service Key  │ API Key     │ API Key          │
│       │ (full acc.)  │ (Bearer)    │ (header: apikey) │
└───────┼──────────────┼──────────────┼─────────────────┘
        │              │              │
    PostgreSQL      Groq Cloud    AWS Lightsail
    (Supabase)      (Free Tier)   ($10/mês)
```

---

## 1. Supabase (Banco de Dados)

| Aspecto | Estado |
|---------|--------|
| Plano   | Free Tier |
| Região  | Não especificada (default: US) |
| Acesso  | Service Key (bypass RLS) |
| Migrations | 3 arquivos SQL manuais |
| Backup  | Automático (Supabase gerencia) |

### Gaps
- **G1**: Usando apenas `service_key` — bypass total de RLS. Não há separação de acesso (admin vs público).
- **G2**: Sem connection pooling explícito (Supabase client gerencia internamente).
- **G3**: Free tier tem limite de **500MB de storage** e **2GB de DB** — suficiente pro MVP mas não escala.
- **G4**: Sem typegen automático — tipos definidos manualmente em `database.types.ts` (risco de drift).

### Recomendação
- Gerar tipos automaticamente: `npx supabase gen types typescript --project-id XXX > src/lib/database.types.ts`
- Migrar para Supabase Pro ($25/mês) antes do primeiro cliente pagante — mais storage, backups diários, logs.

---

## 2. Groq AI (Extração Inteligente)

| Aspecto | Estado |
|---------|--------|
| Modelos | `llama-3.1-8b-instant` (triagem) + `llama-3.1-70b-versatile` (agendamento) |
| Custo   | **Free Tier** — rate limit generoso (~30 req/min) |
| Latência | ~200-500ms por chamada |
| Fallback | Se GROQ_API_KEY faltar, retorna `{ is_lead: true }` sem extração |

### Uso Atual
1. **`aiExtractor.ts`** — Classifica mensagens WA (lead real vs. ruído) e extrai dados
2. **`aiScheduler.ts`** — Detecta intenção de agendamento e sugere horários

### Gaps
- **G5**: **Sem cache de resultados** — a mesma mensagem processada 2x faz 2 chamadas à API.
- **G6**: **Sem retry com backoff** — se o Groq estiver lento, falha silenciosamente.
- **G7**: **Prompt injection** — o texto do lead é injetado diretamente no prompt sem sanitização. Um lead malicioso poderia alterar o comportamento do classificador.
- **G8**: **Modelo fixo no código** — deveria ser configurável via env var para facilitar testes.

### Recomendação
- Adicionar sanitização de input antes de injetar no prompt (remover markdown, escapar aspas)
- Implementar cache simples (hash do texto → resultado) para evitar chamadas repetidas
- Considerar Gemini Flash 2.0 como alternativa — Free Tier robusto e boa qualidade

---

## 3. Evolution API (WhatsApp)

| Aspecto | Estado |
|---------|--------|
| Versão  | v2 (self-hosted) |
| Infra   | AWS Lightsail $10/mês (Docker + Nginx + SSL) |
| Gerência | Terraform (IaC no repo `infra/`) |
| Instâncias | 1 instância ativa (`realstate-iabroker-*`) |
| Backup WA | Não configurado |

### Fluxo de Mensagens
```
Evolution API ←→ WhatsApp Web (sessão)
     ↓ webhook
Next.js API (Vercel)
     ↓
processLead / aiExtractor
     ↓
Supabase (insert/update lead)
     ↓
sendWhatsAppMessage → Evolution API → WhatsApp Web → Lead
```

### Gaps
- **G9**: **Sessão WA frágil** — se o Lightsail reiniciar, a sessão WA pode cair e precisa re-escanear QR code manualmente.
- **G10**: **Sem monitoramento de health** — se a Evolution API cair, nenhum alerta é disparado. Leads ficam sem resposta.
- **G11**: **Fila de contingência (`mensagens_pendentes`) existe mas nunca é processada** — não há cron job ou worker para reenviar.
- **G12**: **Payload dual (v1+v2)** — `whatsapp.ts` envia `text` E `textMessage.text` em todo request, aumentando payload desnecessariamente.
- **G13**: **Scheduler (EventBridge) gerencia start/stop da instância** mas não verifica se a sessão WA está ativa após start.

### Custo Mensal Atual
| Componente | Custo |
|-----------|-------|
| Lightsail | $10 |
| Domínio SSL | $0 (Let's Encrypt) |
| **Total WA** | **~$10/mês** |

### Recomendação
- Implementar health check cron (Vercel Cron ou GitHub Actions) que verifica `/instance/connectionState` a cada 5min
- Criar worker para processar `mensagens_pendentes` (Vercel Cron a cada 1min)
- Alertar via e-mail ou Telegram se instância cair (pós-start do Lightsail)
- Considerar [Baileys](https://github.com/WhiskeySockets/Baileys) como alternativa mais leve se Evolution se tornar complexa demais

---

## 4. Twilio (Legado/Fallback)

| Aspecto | Estado |
|---------|--------|
| Status  | **Configurado mas NÃO utilizado** |
| Custo   | ~$0.005/msg se fosse usado |
| Dependência | `twilio` no `package.json` (~3MB) |

### Recomendação
- **Remover dependência `twilio`** do `package.json` — reduz bundle e tempo de install.
- Manter apenas `whatsapp.ts` com provider `evolution` e `mock`.

---

## 5. Vercel (Hosting)

| Aspecto | Estado |
|---------|--------|
| Plano   | Pro (~$20/mês) |
| Region  | iad1 (Virginia) |
| Functions | Serverless (10s timeout padrão, 60s com Pro) |
| Cron    | Não utilizado — potencial para health checks |

### Gaps
- **G14**: **Timeout de 10s pode ser insuficiente** para processLead (5 steps + delay + AI call). O delay de 20s (configurable) **ultrapassa** o timeout padrão.
- **G15**: Sem `vercel.json` configurando `maxDuration` para routes críticas.
- **G16**: Sem CDN/Image Optimization configurado — fotos de imóveis são servidas raw do Supabase Storage.

### Recomendação
- Adicionar `vercel.json` com `maxDuration: 60` para `/api/leads`, `/api/webhooks/*`, `/api/ingest/*`
- Utilizar Vercel Cron para health check do WhatsApp e processamento de fila
- Configurar next/image para otimizar fotos de imóveis

---

## Resumo de Custos Mensais

| Serviço | Custo | Notas |
|---------|-------|-------|
| Vercel Pro | $20 | Obrigatório pelo timeout e Functions |
| Supabase Free | $0 | Limite de 500MB storage |
| Groq AI Free | $0 | ~30 req/min, suficiente pro MVP |
| AWS Lightsail | $10 | Evolution API (Docker) |
| Domínio | $0-15 | Dependendo do registrar |
| **TOTAL** | **~$30-45/mês** | Extremamente eficiente ✅ |
