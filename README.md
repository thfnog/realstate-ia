# ImobIA — Automação Imobiliária Inteligente

MVP para automatizar o atendimento e triagem de leads de uma imobiliária. O sistema captura leads via formulário público, qualifica automaticamente, atribui corretores com base na escala de plantão e envia briefings completos via WhatsApp.

## 🚀 Funcionalidades

- **Formulário público** — Wizard de 3 etapas (mobile-first) para captura de leads
- **Painel administrativo** — Gestão de imóveis, corretores, escala e leads
- **Motor de processamento automático** — 4 etapas executadas automaticamente:
  1. Verificação de carteira (cliente existente?)
  2. Atribuição de corretor (escala ou fallback)
  3. Recomendação de imóveis (algoritmo de pontuação)
  4. Envio de briefing via WhatsApp
- **Fila de leads em tempo real** — Polling a cada 30 segundos

## 🛠️ Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 15 (App Router, TypeScript) |
| Estilo | Tailwind CSS v4 |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | JWT simples (jose) |
| WhatsApp | Twilio API |
| Deploy | Vercel + Supabase |

## 📋 Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- Conta no [Twilio](https://twilio.com) (opcional, para enviar WhatsApp)

## ⚙️ Setup

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd realstate-ia
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
cp .env.example .env.local
```

**Variáveis obrigatórias:**

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_URL` | URL do seu projeto Supabase |
| `SUPABASE_ANON_KEY` | Chave anônima (Settings > API) |
| `SUPABASE_SERVICE_KEY` | Chave de serviço (Settings > API) |
| `NEXTAUTH_SECRET` | Chave secreta para JWT (gere com `openssl rand -base64 32`) |
| `ADMIN_EMAIL` | E-mail do admin (default: admin@imobiliaria.com) |
| `ADMIN_PASSWORD` | Senha do admin |

**Variáveis opcionais (WhatsApp):**

| Variável | Descrição |
|----------|-----------|
| `TWILIO_ACCOUNT_SID` | Account SID do Twilio |
| `TWILIO_AUTH_TOKEN` | Auth Token do Twilio |
| `TWILIO_WHATSAPP_FROM` | Número de envio (default: whatsapp:+14155238886) |

> **Nota:** Sem as credenciais do Twilio, o briefing será exibido apenas no console do servidor.

### 3. Configurar banco de dados

No painel do Supabase, acesse **SQL Editor** e execute o conteúdo de:

```
supabase/schema.sql
```

Isso criará as tabelas: `corretores`, `imoveis`, `escala`, `leads`.

### 4. Rodar localmente

```bash
npm run dev
```

Acesse:
- **Formulário público:** http://localhost:3000/formulario
- **Painel admin:** http://localhost:3000/admin (requer login)

## 🏗️ Estrutura do Projeto

```
src/
├── app/
│   ├── api/              # API Routes
│   │   ├── auth/         # Login/Logout
│   │   ├── leads/        # CRUD leads
│   │   ├── imoveis/      # CRUD imóveis
│   │   ├── corretores/   # CRUD corretores
│   │   └── escala/       # Gestão de escala
│   ├── admin/            # Painel administrativo
│   │   ├── leads/        # Fila de leads
│   │   ├── imoveis/      # Gestão de imóveis
│   │   ├── corretores/   # Gestão de corretores
│   │   ├── escala/       # Escala de plantão
│   │   └── carteira/     # Carteira de clientes
│   ├── formulario/       # Formulário público
│   └── login/            # Página de login
├── lib/
│   ├── engine/           # Motor de processamento
│   │   ├── processLead.ts    # Orquestrador
│   │   ├── checkCarteira.ts  # Step 1: Verifica carteira
│   │   ├── assignCorretor.ts # Step 2: Atribui corretor
│   │   ├── recommendImoveis.ts # Step 3: Recomenda imóveis
│   │   └── sendBriefing.ts   # Step 4: Envia briefing
│   ├── supabase.ts       # Cliente Supabase
│   ├── auth.ts           # Autenticação JWT
│   ├── whatsapp.ts       # Cliente Twilio
│   └── database.types.ts # Tipos TypeScript
└── middleware.ts          # Proteção de rotas
```

## 🧮 Algoritmo de Recomendação

O motor de recomendação pontua os imóveis disponíveis com base no perfil do lead:

| Critério | Pontos |
|----------|--------|
| Tipo correspondente | +5 |
| Número de quartos igual | +4 |
| Valor dentro de ±15% do orçamento | +4 |
| Mesmo bairro | +3 |
| Área dentro de ±20% | +2 |
| Mesmo número de vagas | +1 |

**Mínimo:** 5 pontos para ser incluído. Retorna os **3 melhores** matches.

## 🚢 Deploy

### Vercel

1. Importe o repositório no [Vercel](https://vercel.com)
2. Configure as variáveis de ambiente no painel da Vercel
3. Deploy automático a cada push

### Supabase

O banco já está hospedado no Supabase. Apenas certifique-se de que as variáveis de ambiente apontam para o projeto correto.

## 📝 Licença

MIT
