# 01 — Análise de Arquitetura Geral

## Stack Tecnológica

| Camada        | Tecnologia             | Versão   | Observação                                  |
|---------------|------------------------|----------|---------------------------------------------|
| Frontend      | Next.js (App Router)   | 16.2.3   | React 19, Server Components                 |
| Styling       | Tailwind CSS           | v4       | CSS moderno, design system via globals.css   |
| Backend       | Next.js API Routes     | 16.2.3   | Serverless (Vercel Functions)                |
| Banco         | PostgreSQL (Supabase)  | -        | Plano Free Tier                              |
| IA/LLM        | Groq (Llama 3.1)       | -        | 8b-instant p/ triagem, 70b p/ agendamento   |
| WhatsApp      | Evolution API          | v2       | Self-hosted em AWS Lightsail                 |
| Hosting       | Vercel                 | Pro      | Edge optimized, serverless                   |
| Infra WA      | AWS Lightsail          | $10/mês  | Docker + Nginx + SSL (Terraform managed)     |
| Auth          | JWT (jose)             | -        | Cookies HttpOnly, sem refresh token          |

## Estrutura do Projeto

```
src/
├── app/
│   ├── admin/            # Painel administrativo (6 páginas)
│   │   ├── leads/        # Esteira de vendas (funil + detalhes)
│   │   ├── imoveis/      # CRUD de imóveis
│   │   ├── corretores/   # Gestão de corretores
│   │   ├── agenda/       # Escala + calendario
│   │   ├── carteira/     # Carteira de clientes
│   │   └── config/       # Configurações da imobiliária
│   ├── api/              # 13 diretórios de endpoints
│   │   ├── auth/         # Login, Logout, Register
│   │   ├── leads/        # CRUD + debug-wa
│   │   ├── eventos/      # Agendamento
│   │   ├── ingest/       # Email, GrupoZap, WhatsApp
│   │   ├── webhooks/     # WhatsApp webhook
│   │   └── ...
│   ├── formulario/       # Formulário público de captação
│   ├── imoveis/          # Vitrine pública de imóveis
│   └── login/            # Autenticação
├── lib/
│   ├── engine/           # Motor de processamento (12 módulos)
│   ├── ingest/           # Parsers de email
│   ├── imoveis/          # Lógica de imóveis
│   ├── auth.ts           # JWT sign/verify
│   ├── whatsapp.ts       # Provider abstraction
│   ├── supabase.ts       # Client lazy-init
│   ├── countryConfig.ts  # PT vs BR
│   └── database.types.ts # Tipagem do schema
└── components/           # Componentes reutilizáveis
```

## Modelo de Dados (6+1 tabelas)

```
imobiliarias (Tenant)
  ├─ corretores (1:N)
  │   └─ usuarios (1:1)
  ├─ imoveis (1:N)
  ├─ leads (1:N)
  │   └─ eventos (1:N)
  ├─ escala (1:N)
  └─ mensagens_pendentes (1:N) — contingência WA
```

## Pipeline de Processamento (processLead)

```
Lead Entra (Form/WA/Portal/Email)
  │
  ├── Step 0: Detectar config do tenant (PT/BR)
  ├── Step 1: Check Carteira (cliente existente?)
  ├── Step 2: Assign Corretor (escala > fallback)
  ├── Step 3: Recommend Imóveis (scoring engine)
  ├── Step 4: Send Briefing (WA para corretor)
  └── Step 5: Auto-Reply (WA para lead, com delay e check)
      ├── SubFlow: Nome pendente → pergunta nome
      ├── SubFlow: Solo broker → msg pessoal
      └── SubFlow: Empresa → msg corporativa
```

---

## 🔴 Gaps Críticos

### G1. Schema SQL desatualizado
O `supabase/schema.sql` (79 linhas) está **totalmente desatualizado** em relação ao schema real do banco (`migrations/20260419195106_init.sql`). O schema.sql original não tem:
- Tabela `imobiliarias` (tenant)
- Tabela `usuarios`
- Tabela `eventos`
- ENUMs tipados
- Multi-tenancy (`imobiliaria_id`)

**Recomendação**: Deletar `schema.sql` e manter apenas as migrations como fonte de verdade.

### G2. Sem Constraint UNIQUE no telefone do lead
A deduplicação foi implementada no *código*, mas **não existe** constraint `UNIQUE(imobiliaria_id, telefone)` no banco. Condições de corrida (dois webhooks simultâneos) ainda podem criar duplicados.

**Recomendação**: Adicionar `CREATE UNIQUE INDEX idx_leads_phone_imob ON leads(imobiliaria_id, telefone) WHERE status NOT IN ('vendido','descartado');` (partial unique index).

### G3. Sem Middleware de autenticação
O admin layout é `'use client'`, sem proteção no server-side. Os endpoints GET/PATCH usam `getAuthFromCookies()` inconsistentemente — alguns endpoints públicos (POST de leads, webhooks) não validam. Endpoints como `GET /api/eventos` e `GET /api/imoveis` **não exigem autenticação**.

**Recomendação**: Criar `middleware.ts` na raiz do projeto para proteger `/admin/*` e `/api/*` (exceto rotas públicas explícitas).

### G4. Mock mode como feature flag frágil
`isMockMode()` verifica se `SUPABASE_URL` está vazio. Todo o código está bifurcado com `if(mock.isMockMode())`. Isso polui massivamente a base de código (~50 ocorrências).

**Recomendação**: Migrar para um Repository Pattern com interfaces, eliminando condicionais espalhados.

---

## 🟡 Melhorias Importantes

### M1. Senhas armazenadas em texto puro
`auth.ts` linha 56: `user.hash_senha !== password` — comparação direta de strings. Não há hashing (bcrypt/argon2).

### M2. Sem rate limiting nos endpoints públicos
`POST /api/leads`, `/api/auth/login`, webhooks — sem proteção contra abuso, brute-force ou bot spam.

### M3. Sem validação do tenant nos webhooks
Os webhooks de WhatsApp e portais tentam resolver `imobiliaria_id` mas sem validação forte. Uma request mal-formada poderia injetar leads em outro tenant.

### M4. Fallback secret em produção
`auth.ts` linha 9: `NEXTAUTH_SECRET || 'fallback-dev-secret-only-for-local-mock'` — se a variável não estiver configurada em produção, qualquer pessoa poderia forjar tokens JWT.
