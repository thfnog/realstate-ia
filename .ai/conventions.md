# Convenções e Diretrizes de Engenharia (ImobIA)

Regras mandatórias para desenvolvimento e modificação de código por Agentes de IA.

---

## 1. Padrão de Repositório (Data Access)
- Nunca faça queries diretas com `supabase` espalhadas em UI ou serviços de domínio quando houver repositório correspondente.
- Toda entidade deve ter:
  1. Interface em `src/lib/repositories/types.ts`
  2. Implementação Supabase (`Supabase*Repository.ts`)
  3. Implementação Mock (`Mock*Repository.ts`)
  4. Método de fábrica em `src/lib/repositories/factory.ts`

---

## 2. Rotas de API (`src/app/api/`)
- **Autenticação**: Rotas protegidas devem verificar o token JWT via `verifyAuth(request)` ou `verifyMaster(request)`.
- **Isolamento de Tenant**: Sempre valide e filtre pelo `imobiliaria_id` extraído do payload autenticado.
- **Webhooks**: Responda status `200 OK` imediatamente e processe pipelines demorados em background usando `waitUntil` do `@vercel/functions`.
- **Tratamento de Erros**: Sempre encapsule blocos em `try/catch` e retorne `{ error: string }` com status HTTP adequado.

---

## 3. Módulos de IA (`src/lib/engine/`)
- **Chamadas de LLM**: NUNCA chame a OpenAI ou Groq diretamente via SDK proprietário. Use sempre `callAIWithFallback()` de `@/lib/engine/aiUtils`.
- **Parsing de JSON**: Sempre utilize `parseSafeJSON()` para tratar respostas de IA que possam vir envolvidas em markdown fences (\`\`\`json).
- **Consumo de Tokens**: Passe `imobiliaria_id` e `feature` nas opções de `callAIWithFallback` para registrar telemetria em `ai_usage_logs`.
- **Anti-Loop**: Em motores conversacionais, sempre mantenha limites rígidos (`MAX_TURNS`, cooldowns e controle de estado).

---

## 4. UI e Componentes (`src/components/` & `src/app/`)
- **Estilização**: Tailwind CSS v4. Priorize legibilidade, contraste e microinterações responsivas.
- **Gatekeeping de Planos**: Use o componente `PlanGuard` para proteger funcionalidades restritas a planos superiores (ex: módulo financeiro, contratos).
- **Regionalização**: Use `useMemo` ou funções de `countryConfig.ts` para renderizar termos e máscaras monetárias/documentais de acordo com a imobiliária configurada.

---

## 5. Nomenclatura e Organização
- **Arquivos de Componentes**: `PascalCase.tsx`
- **Utilitários e Serviços**: `camelCase.ts`
- **Rotas Next.js**: pastas em `kebab-case` com `route.ts` ou `page.tsx`
- **Import Alias**: Use sempre `@/...` referenciando a pasta `src/`.
