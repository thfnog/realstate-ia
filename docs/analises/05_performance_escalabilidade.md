# 05 — Análise de Performance e Escalabilidade

## Gargalos Identificados

### 1. processLead — Timeout Risk 🔴

O pipeline completo executa **sequencialmente** em uma única Vercel Function:

```
Step 0: Fetch config        ~50ms
Step 1: Check carteira      ~100ms
Step 2: Assign corretor     ~100ms
Step 3: Recommend imóveis   ~200ms (query + scoring de N imóveis)
Step 4: Send briefing       ~500ms (fetch Evolution API)
Step 5: Delay               5-20s  ← BLOQUEANTE
Step 5b: Check status       ~100ms
Step 5c: Send auto-reply    ~500ms
                            --------
TOTAL:                      6-22 SEGUNDOS
```

O **delay configurable (5-20s)** usa `await setTimeout()` que **bloqueia a function**. Com Vercel Pro (timeout 60s), funciona, mas:
- Consome servidor-minutos desnecessariamente
- Se múltiplos leads entrarem simultaneamente, cada um segura uma function
- No free tier (10s timeout), **quebraria**

**Recomendação**: Separar o delay em uma segunda function invocada via Vercel Cron ou `/api/delayed-reply`.

### 2. Query de Imóveis — Full Table Scan 🟡

`recommendImoveis` faz `SELECT *` em **todos** os imóveis disponíveis e scora em memória:

```typescript
const { data: imoveis } = await supabaseAdmin
  .from('imoveis')
  .select('*')
  .eq('status', 'disponivel');
```

Com 50 imóveis: ~200ms → OK.  
Com 5.000 imóveis: ~5s + memória → **Problema**.

**Recomendação**: Pré-filtrar no SQL quando possível (tipo, faixa de valor, bairro fuzzy), scorar apenas o subset.

### 3. Frontend — Monolithic Pages 🟡

A página `admin/leads/page.tsx` tem **988 linhas** e **55KB**. Carrega:
- Listagem completa de leads
- Modal de detalhes
- Formulário de eventos
- Matching de imóveis
- Envio de WhatsApp manual
- Filtros e busca

Tudo em um único componente `'use client'`.

**Impacto**: 
- Hydration lenta (~1-2s em mobile)
- Re-render desnecessário a cada state change
- Bundle grande para carregamento inicial

**Recomendação**: Extrair em componentes:
- `LeadsList` (listagem com filtros)
- `LeadDetailModal` (modal de detalhes)
- `EventForm` (criação de eventos)
- `PropertyMatcher` (sugestões)

### 4. Sem Paginação 🟡

`GET /api/leads` retorna **todos** os leads da imobiliária sem paginação:

```typescript
const { data } = await supabaseAdmin
  .from('leads')
  .select('*, corretores(*)')
  .eq('imobiliaria_id', session.imobiliaria_id)
  .order('criado_em', { ascending: false });
```

Com 100 leads: OK.  
Com 10.000 leads: **Inviável** (memória, latência, renderização).

**Recomendação**: Implementar cursor-based pagination com infinite scroll.

### 5. Sem Cache 🟡

Nenhuma API usa caching:
- Lista de corretores (raramente muda): poderia ser cached 1min
- Lista de imóveis: cached 30s
- Config da imobiliária: cached 5min

**Recomendação**: Usar `Cache-Control` headers ou SWR no frontend (já disponível com React 19).

---

## Métricas de Bundle

| Métrica | Valor Estimado | Aceitável? |
|---------|---------------|------------|
| First Load JS | ~150-200KB | 🟡 OK, mas melhorável |
| Hydration Time | ~1s (desktop) / ~2s (mobile) | 🟡 |
| API p95 (leads GET) | ~300ms (50 leads) | ✅ |
| API p95 (processLead) | ~6-22s | 🔴 (delay incluso) |
| Build Time | ~45-60s | ✅ |

---

## Recomendações de Performance

### Quick Wins (1-2h cada)
1. **Cache headers** em `/api/imoveis`, `/api/corretores`, `/api/imobiliaria`
2. **Paginação** no GET de leads (limit 50, cursor)
3. **Lazy loading** do modal de detalhes (code splitting)
4. **next/image** para fotos de imóveis (resize automático)

### Investimento Médio (4-8h cada)
5. **Separar delay do processLead** em microserviço/cron
6. **Pré-filtrar imóveis** no SQL antes do scoring
7. **Componentizar** a página de leads (988 linhas → 5 componentes)

### Longo Prazo
8. **Edge Functions** para rotas read-heavy (leads list, imoveis list)
9. **Database views** para queries complexas (leads + corretor + eventos)
10. **Webhooks async** com filas (SQS ou Vercel Queue) para processamento pesado

---

## Limites de Escalabilidade por Tier

| Cenário | Leads/mês | Imóveis | Funciona no MVP? |
|---------|----------|---------|-----------------|
| Corretor solo | 50 | 20 | ✅ Sem problemas |
| Pequena imobiliária (5 corretores) | 200 | 100 | ✅ Funcional |
| Média imobiliária (15 corretores) | 1.000 | 500 | 🟡 Precisa paginação |
| Grande (50+ corretores) | 5.000+ | 2.000+ | 🔴 Requer refatoração |
