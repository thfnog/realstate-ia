# 02 — Análise de Segurança

## Estado Atual: ⚠️ MVP — Várias Brechas Conhecidas

### 🔴 Crítico

| #  | Vulnerabilidade | Arquivo | Impacto | Correção |
|----|----------------|---------|---------|----------|
| S1 | **Senhas em texto puro** | `auth.ts:56` | Vazamento do DB expõe todas as senhas | Trocar para bcrypt. Custo: ~2h |
| S2 | **JWT secret hardcoded** | `auth.ts:9` | `'fallback-dev-secret-only-for-local-mock'` usado se env var faltar — qualquer um forja tokens | Crash se `NEXTAUTH_SECRET` não existir em prod |
| S3 | **Sem middleware de autenticação** | `src/middleware.ts` (inexistente) | Qualquer rota `/api/` pode ser acessada sem login | Criar middleware Next.js |
| S4 | **supabaseAdmin** exposto sem controle | `supabase.ts` | Service key usada em todas as API routes — acesso total ao DB sem RLS efetivo | Separar service key para apenas operações privilegiadas |
| S5 | **Sem rate-limiting** | Todos endpoints públicos | Brute-force login, spam de leads, bombing de webhooks | Implementar rate-limit (Vercel Edge Config ou upstash/ratelimit) |

### 🟡 Alto

| #  | Vulnerabilidade | Detalhes | Correção |
|----|----------------|----------|----------|
| S6 | **Webhooks sem assinatura HMAC** | WhatsApp webhook aceita qualquer POST | Validar `x-hub-signature-256` da Evolution |
| S7 | **CORS aberto** | Sem configuração de CORS — qualquer domínio pode chamar as APIs | Configurar `next.config.ts` com headers CORS restritos |
| S8 | **Sem validação de input** | Payloads de criação de leads e eventos não são validados (Zod/Yup) | Adicionar schema validation em todos os POSTs |
| S9 | **Dados sensíveis em logs** | `processLead.ts` loga nome parcial, mas `sendBriefing.ts` loga telefone completo | Aplicar masking consistente |
| S10 | **RLS policy `USING (true)`** | Todas as tabelas têm RLS habilitado mas políticas são `true` para todos | Criar policies reais baseadas em `imobiliaria_id` do JWT |

### 🟢 Baixo (Boas Práticas)

| # | Item | Status |
|---|------|--------|
| S11 | Cookie `httpOnly: true` | ✅ Implementado |
| S12 | Cookie `secure: true` em produção | ✅ Implementado |
| S13 | Cookie `sameSite: 'lax'` | ✅ Implementado |
| S14 | Sem exposição de stack trace | ✅ Try/catch com mensagens genéricas |
| S15 | `.env.local` no `.gitignore` | ✅ Não versionado |

---

## Recomendações Prioritárias

### Fase 1 (Imediato — antes de clientes reais)
1. **Hashing de senha (bcrypt)** — ~2h
2. **Remover fallback JWT secret** — crash explícito se não configurado
3. **Middleware de autenticação** — proteger `/admin/*` e `/api/*` (exceto whitelist)
4. **Validação de payloads** com Zod em POST/PATCH endpoints

### Fase 2 (Pré-launch)
5. **Rate limiting** com `@upstash/ratelimit` (Redis serverless) — 10 req/min em login, 50/min em leads
6. **HMAC no webhook WA** — validar assinatura da Evolution API
7. **Políticas RLS reais** no Supabase — isolar dados por `imobiliaria_id`

### Fase 3 (Escalabilidade)
8. **Separar supabase client vs admin** — usar anon key + RLS para queries normais
9. **Audit log** — registrar acessos e alterações críticas
10. **2FA para admin** — especialmente quando houver múltiplos usuários
