# AGENTS.md — Camada de Infraestrutura e Utilitários (`src/lib/`)

Contém serviços transversais, clientes de banco e serviços externos, autenticação e regras de regionalização.

## Arquivos e Responsabilidades

| Arquivo / Pasta | Finalidade |
|---|---|
| `auth.ts` | Criação, assinatura e verificação de JWT usando `jose`. Hash de senhas com `bcryptjs`. |
| `supabase.ts` | Inicialização dos clientes Supabase: `supabase` (anônimo) e `supabaseAdmin` (service role). |
| `whatsapp.ts` | Cliente para disparo de mensagens e mídia via Evolution API / Z-API e Twilio. |
| `billing.ts` | Definição de limites de planos SaaS, contagem de tenants e checagem de módulos. |
| `countryConfig.ts` | Central de regionalização de termos, moedas, fusos e documentos (BR vs PT). |
| `database.types.ts` | Definições de tipos TypeScript sincronizadas com o schema do PostgreSQL. |
| `mockDb.ts` | Banco de dados simulado in-memory para desenvolvimento sem conexão ativa ao Supabase. |
| `messageFilter.ts` | Regex e heurísticas para filtrar mensagens irrelevantes ou ruído de grupos de WhatsApp. |
| `rateLimit.ts` | Utilitário de limitação de requisições por IP / token. |
| `slack.ts` | Disparo de alertas operacionais para canais do Slack. |
| `engine/` | Sub-módulo: Motor Central de IA e Processamento. |
| `repositories/` | Sub-módulo: Camada de abstração de dados (Repository Pattern). |
| `imoveis/` | Utilitários de métricas de mercado imobiliário e geradores de referências. |
| `ingest/` | Parsers de e-mail e raspadores de portais externos (ZAP, VivaReal, eGO). |
| `utils/` | Geradores de documentos (PDF/HTML) e formatadores de texto/moeda. |
| `whatsapp/` | Builders de mensagens interativas estruturadas para WhatsApp (cards, horários). |
