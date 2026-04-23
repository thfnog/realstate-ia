# 07 — Análise de Qualidade de Código

## Métricas Gerais

| Métrica | Valor | Avaliação |
|---------|-------|-----------|
| Total de arquivos `.ts/.tsx` | ~50 | ✅ Gerenciável |
| Maior arquivo | `admin/leads/page.tsx` (988 linhas) | 🔴 Muito grande |
| Dependências produção | 13 | ✅ Lean |
| Dependências dev | 7 | ✅ |
| Testes automatizados | **0** | 🔴 Zero |
| Linting | ESLint configurado | ✅ |
| TypeScript strict | Sim | ✅ |

## Padrões Observados

### ✅ Bons Padrões
- **Tipagem forte** com TypeScript — types centralizados em `database.types.ts`
- **Separação de concerns** no engine — cada step é um módulo independente
- **Lazy loading** de modulos pesados (Supabase, processLead) via `await import()`
- **Country config** centralizado — PT/BR isolados em um único arquivo
- **Error handling** consistente nos API routes (try/catch + JSON response)

### 🔴 Anti-Padrões

| # | Anti-padrão | Ocorrências | Impacto |
|---|------------|-------------|---------|
| C1 | **Mock mode bifurcation** — `if(mock.isMockMode())` disperso por todo o código | ~50+ | Dificulta manutenção, duplica lógica |
| C2 | **God component** — `leads/page.tsx` com 988 linhas fazendo tudo | 1 (mas crítico) | Impossível testar, refatorar ou reusar |
| C3 | **Any types** — `(imob: any)`, `(corretor as any)` | ~30+ | Perde benefícios do TypeScript |
| C4 | **Console.log como observabilidade** | Todo o engine | Sem structured logging, sem telemetria |
| C5 | **Secrets inline** — `'fallback-dev-secret'` no código | 1 | Risco de segurança |
| C6 | **Sem testes** | Global | Qualquer mudança pode quebrar sem aviso |

### 🟡 Dívida Técnica

| # | Item | Descrição |
|---|------|-----------|
| D1 | `mockDb.ts` tem **25KB** (660+ linhas) | Banco em memória com dados de teste misturados com lógica |
| D2 | `.env.example` desatualizado | Não lista EVOLUTION_URL, GROQ_API_KEY, etc. |
| D3 | `schema.sql` vs `migrations/` | Dois schemas conflitantes — o schema.sql está obsoleto |
| D4 | Arquivos soltos na raiz | `future_architecture_events.md`, `implementation_plan_v2.md` — artefatos antigos |
| D5 | Dependência `twilio` (~3MB) | Não utilizado, apenas herança do MVP original |

---

## Cobertura de Testes

```
Testes unitários:    0 ❌
Testes integração:   0 ❌  
Testes E2E:          0 ❌
Testes manuais:      Informal (via browser + curl)
```

### Recomendações de Testes (ROI-first)

**Fase 1: Testes Críticos (4h)**
- `aiExtractor.ts` → testar que classifica corretamente (lead vs. ruído)
- `recommendImoveis.ts` → testar scoring com dados mock
- `assignCorretor.ts` → testar escala e fallback
- Deduplicação no POST de leads → testar que não cria duplicados

**Fase 2: API tests (4h)**  
- Login/auth flow
- CRUD de leads (create, update status, delete)
- Webhook payload handling

**Fase 3: E2E (8h)**
- Formulário → lead criado → aparece no funil
- Login → dashboard → navegar seções

**Framework sugerido**: Vitest (unit) + Playwright (E2E) — ambos nativamente suportados por Next.js 16.

---

## Recomendações de Código

### Imediato
1. **Limpar arquivos órfãos** da raiz (`future_architecture_events.md`, `implementation_plan_*`)
2. **Atualizar `.env.example`** com todas as env vars reais
3. **Remover `twilio`** do `package.json`
4. **Deletar `supabase/schema.sql`** — mantém só migrations

### Curto Prazo
5. **Extrair componentes** de `leads/page.tsx`
6. **Repository pattern** para eliminar bifurcação mock/prod
7. **Structured logging** (pelo menos `JSON.stringify({ level, msg, context })`)

### Médio Prazo
8. **Testes unitários** nos módulos do engine
9. **Zod schemas** para validação de payloads
10. **Eliminar `any`** types — typed Supabase queries
