# AGENTS.md — Rotas de API Serverless (`src/app/api/`)

Endpoints HTTP executados como Serverless Functions no Next.js 16 (App Router).

## Categorias de Endpoints

| Domínio | Caminho | Descrição |
|---|---|---|
| **Webhooks** | `webhooks/whatsapp/`, `webhooks/grupozap/`, `webhooks/billing/` | Ingestão assíncrona de eventos externos. Resposta HTTP 200 rápida + background job via `waitUntil`. |
| **Auth** | `auth/login/`, `auth/logout/`, `auth/me/`, `auth/register/` | Emissão, validação e revogação de tokens JWT em cookies seguros. |
| **Negócio / CRUD** | `leads/`, `imoveis/`, `corretores/`, `eventos/`, `contratos/` | Operações de CRM e gestão imobiliária via Repositórios. |
| **Cron Jobs** | `cron/daily-briefing/`, `cron/reminders/`, `cron/process-queue/` | Rotinas agendadas (Vercel Cron) autenticadas via Bearer Token. |
| **Master / Superadmin** | `master/stats/`, `master/planos/`, `master/imobiliarias/` | Endpoints exclusivos para a role `master` da plataforma. |
| **Público** | `public/imoveis/`, `public/lead/`, `calendar/[id]/` | Endpoints sem autenticação para formulários externos e feed iCalendar (.ics). |

## Regras de Implementação
1. **Validação**: Use schemas do `zod` para validar o body de requests mutantes (POST/PUT/PATCH).
2. **Autorização**: Obtenha o `imobiliaria_id` a partir do token de sessão (`verifyAuth`) para garantir isolamento multi-tenant.
3. **Respostas Padronizadas**: Retorne sempre `NextResponse.json({ data, error })` com códigos HTTP apropriados.
4. **Timeouts**: Para webhooks com processamento de IA/áudio, utilize `@vercel/functions` `waitUntil()` para não bloquear o gateway emissor.
