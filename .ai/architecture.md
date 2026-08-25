# Arquitetura do ImobIA

> Versão condensada para agentes de IA. Para detalhes aprofundados, consulte `docs/analises/01..09`.

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.3 |
| UI | React + Tailwind CSS | 19.2.4 / v4 |
| Banco de dados | Supabase (PostgreSQL + RLS) | v2.103 |
| Autenticação | JWT stateless via `jose` | v6 |
| IA / LLM | OpenRouter → Groq → OpenAI (fallback chain) | Llama 3.3 70B / GPT-4o-mini |
| Transcrição | Groq Whisper → OpenAI Whisper | whisper-large-v3 |
| WhatsApp | Evolution API / Z-API + Twilio (fallback) | — |
| E-mail | Resend | v6 |
| Deploy | Vercel (serverless) | — |
| Validação | Zod | v4 |

## Camadas da Aplicação

```
┌─────────────────────────────────────────────────────────┐
│  Pages & Layouts (src/app/)                             │
│  ├── Landing, Login, Registro, Formulário público       │
│  └── Admin (Dashboard, CRM, Leads, Imóveis, Agenda...) │
├─────────────────────────────────────────────────────────┤
│  API Routes (src/app/api/)  —  25 domínios              │
│  ├── Webhooks (WhatsApp, ZAP/VivaReal, Billing)         │
│  ├── CRUD (leads, imoveis, corretores, contratos...)    │
│  ├── Cron (daily-briefing, reminders, process-queue)    │
│  └── Master (stats, planos, imobiliárias)               │
├─────────────────────────────────────────────────────────┤
│  Engine (src/lib/engine/)  —  19 módulos de IA          │
│  ├── conversationEngine (FSM 7 estados)                 │
│  ├── processLead (pipeline orquestrador)                │
│  ├── aiExtractor, aiScheduler, leadClassifier           │
│  ├── recommendImoveis (scoring ponderado)               │
│  ├── audioTranscriber (Whisper)                         │
│  └── dailyBriefing, sendAutoReply, sendBriefing         │
├─────────────────────────────────────────────────────────┤
│  Repositories (src/lib/repositories/)                   │
│  ├── 8 interfaces (types.ts)                            │
│  ├── 8 MockRepositories + 8 SupabaseRepositories        │
│  └── factory.ts (switch por isMockMode())               │
├─────────────────────────────────────────────────────────┤
│  Infrastructure (src/lib/)                              │
│  ├── auth.ts (JWT + RBAC)                               │
│  ├── supabase.ts (anon + admin clients)                 │
│  ├── whatsapp.ts (Evolution API client)                 │
│  ├── billing.ts (planos e limites)                      │
│  ├── countryConfig.ts (regionalização BR/PT)            │
│  └── database.types.ts (schema TypeScript)              │
└─────────────────────────────────────────────────────────┘
```

## Fluxo Principal: Webhook WhatsApp → IA → Resposta

```
1. Evolution API/Z-API envia POST para /api/webhooks/whatsapp
2. Route responde 200 OK imediatamente
3. waitUntil() processa em background:
   a. webhookProcessor.ts identifica tipo de mensagem
   b. Se áudio → audioTranscriber.ts (Whisper)
   c. Se lead novo → processLead.ts:
      - checkCarteira() → verificação de cliente existente
      - assignCorretor() → escala de plantão ou fallback
      - aiExtractor.ts → extrai perfil com LLM
      - recommendImoveis.ts → scoring ponderado
      - sendBriefing() → WhatsApp para corretor
      - sendAutoReply() → WhatsApp para lead (com delay)
   d. Se conversa em andamento → conversationEngine.ts:
      - FSM: greeting → qualifying → recommending → 
             feedback → scheduling → visit_confirmed → human_handoff
      - Limites: MAX_TURNS=10, MAX_SCHEDULING_ATTEMPTS=3
```

## Multi-Tenancy

- Cada imobiliária é um tenant isolado por `imobiliaria_id`
- RLS no PostgreSQL garante isolamento em nível de banco
- JWT carrega `imobiliaria_id` + `role` (master|admin|corretor)
- `PlanGuard.tsx` bloqueia features no frontend por plano contratado

## Regionalização BR/PT

- `countryConfig.ts` abstrai termos: Bairro↔Freguesia, CRECI↔AMI, R$↔€
- Briefing e IA adaptam linguagem automaticamente pelo país configurado
- Fusos: `America/Sao_Paulo` (BR) e `Europe/Lisbon` (PT)

## Pipeline de IA Multi-Provider

```
OpenRouter (Llama 3.3 70B) ← Prioridade 1 (sem rate limit diário)
         ↓ falha?
Groq (Llama 3.3 70B) ← Prioridade 2 (ultra-rápido)
         ↓ falha?
Groq (Llama 3.1 8B) ← Fallback leve
         ↓ falha?
OpenAI (GPT-4o-mini) ← Contingência final
```

Todas as chamadas são logadas em `ai_usage_logs` (tokens, provider, status).
Feedback humano armazenado em `ai_feedback` para calibração.
