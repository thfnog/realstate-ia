# 08 — Roadmap Consolidado e Priorização

## Visão do Produto
> **ImobIA**: SaaS de automação imobiliária que transforma leads em vendas via IA e WhatsApp.
> O corretor foca em vender — o resto é automático.

---

## Classificação por Impacto × Esforço

### 🔴 P0 — Fazer Antes do Primeiro Cliente

| # | Item | Esforço | Doc Ref |
|---|------|--------|---------|
| 1 | **Hashing de senha** (bcrypt) | 2h | 02_seguranca S1 |
| 2 | **Middleware de autenticação** (proteger /admin, /api) | 3h | 02_seguranca S3 |
| 3 | **Remover JWT fallback secret** | 15min | 02_seguranca S2 |
| 4 | **vercel.json** com maxDuration de 60s em endpoints críticos | 30min | 03_integracoes G14 |
| 5 | **Constraint UNIQUE** (imobiliaria_id, telefone) no banco | 30min | 01_arquitetura G2 |
| 6 | **Limpar schema.sql obsoleto** e atualizar .env.example | 30min | 07_qualidade D2/D3 |
| 7 | **Worker de mensagens_pendentes** (Vercel Cron - 1/min) | 2h | 03_integracoes G11 |
| 8 | **Health check Evolution API** (Vercel Cron - 5/min) | 2h | 03_integracoes G10 |

### 🟡 P1 — Sprint 1 (Qualidade de Vida)

| # | Item | Esforço | Doc Ref |
|---|------|--------|---------|
| 9 | **Paginação** no GET de leads | 3h | 05_performance #4 |
| 10 | **Componentizar** leads page (988 → 5 componentes) | 4h | 05_performance #3 |
| 11 | **Toast notifications** (feedback visual em ações) | 2h | 06_telas U4 |
| 12 | **Skeleton loading** em listas | 2h | 06_telas U14 |
| 13 | **Empty states** com CTAs | 1h | 06_telas U4 |
| 14 | **Lembretes automáticos** de visita (via Cron + WA) | 4h | 04_fluxos #Agenda |
| 15 | **Histórico de conversas WA** persistido no lead | 4h | 04_fluxos P2 |

### 🟢 P2 — Sprint 2 (Features de Valor)

| # | Item | Esforço | Doc Ref |
|---|------|--------|---------|
| 16 | **Dashboard com gráficos** (conversão, volume temporal) | 6h | 06_telas U6 |
| 17 | **Drag & drop** no Kanban | 4h | 06_telas U11 |
| 18 | **Busca global** (Command Palette ⌘K) | 4h | 06_telas U5 |
| 19 | **Testes unitários** nos módulos do engine | 4h | 07_qualidade |
| 20 | **Rate limiting** em endpoints públicos | 3h | 02_seguranca S5 |
| 21 | **RLS policies reais** no Supabase | 4h | 02_seguranca S10 |
| 22 | **Zod validation** nos payloads de POST | 3h | 02_seguranca S8 |
| 23 | **Reverse matching** com bairro fuzzy (alinhar com forward) | 1h | 04_fluxos |

### 🔵 P3 — Backlog (Escalabilidade)

| # | Item | Esforço | Doc Ref |
|---|------|--------|---------|
| 24 | **Repository pattern** (eliminar mock bifurcation) | 8h | 07_qualidade C1 |
| 25 | **Remover dependência Twilio** do package.json | 15min | 07_qualidade D5 |
| 26 | **Google Calendar sync** | 8h | 04_fluxos |
| 27 | **Integração real CanalPro** | 8h | 04_fluxos P7 |
| 28 | **Import em massa** de imóveis (CSV/Excel) | 6h | 04_fluxos P9 |
| 29 | **Testes E2E** (Playwright) | 8h | 07_qualidade |
| 30 | **Structured logging** (JSON + context) | 4h | 07_qualidade C4 |

---

## Custo Total Estimado (Infra Mensal)

### Cenário Atual (1 corretor)
| Serviço | Custo |
|---------|-------|
| Vercel Pro | $20 |
| Supabase Free | $0 |
| Groq Free | $0 |
| Lightsail | $10 |
| **Total** | **$30/mês** |

### Cenário Multi-tenant (10 imobiliárias)
| Serviço | Custo |
|---------|-------|
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| Groq Free (ou Gemini) | $0-10 |
| Lightsail (1 por tenant) | $100 |
| **Total** | **~$155/mês** |

### Otimizações Possíveis
- **Lightsail → Share por região**: Uma instância Evolution com múltiplas instâncias WA internamente (-70%)
- **Supabase Pro com pooler**: Melhor para múltiplos tenants simultâneos
- **Groq → Gemini Flash**: Se Groq apertar rate limit, Gemini Flash 2.0 é free e mais rápido

---

## Métricas de Sucesso do MVP

| Métrica | Meta | Como Medir |
|---------|------|------------|
| Lead → Contato < 5min | 90% | Timestamp do lead vs. timestamp do auto-reply |
| Taxa de resposta do bot | > 95% | Leads com auto-reply enviado vs. total |
| Uptime da Evolution API | > 99% | Health check + logs |
| Tempo de processamento | < 10s | Logs do processLead |
| Leads duplicados | 0% | Query de contagem duplicados |
| Conversão (lead → visita) | Baseline TBD | Dashboard (a implementar) |

---

## Resumo Executivo

O **ImobIA** está em um estado sólido de MVP. A automação core (Lead → IA → WhatsApp → Corretor) funciona. Os principais riscos para produção real são:

1. **Segurança básica** (senhas, auth middleware) — resolver em <1 dia
2. **Resiliência do WhatsApp** (health check + fila) — resolver em <1 dia
3. **UX polish** (toasts, skeletons, empty states) — resolver em 1 sprint

O custo de infra ($30/mês) é excelente para um MVP e escalável até ~10 tenants sem mudanças arquiteturais significativas.
