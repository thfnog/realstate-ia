# Walkthrough: Estabilização Multi-Tenant e Repository Pattern

Este documento resume o estado atual do projeto após a conclusão das fases de estabilização de dados e isolamento de clientes (Fase 1 e 2). Ele serve como guia de contexto para futuras sessões de desenvolvimento.

## 🏆 Resumo das Entregas

### 1. Arquitetura: Repository Pattern (Fase 2)
Migramos a lógica de banco de dados para o padrão de **Repositórios**, isolando a complexidade do Supabase e permitindo alternar entre o modo Mock e Real de forma transparente.
- **`src/lib/repositories/`**: Contém as interfaces e implementações (`SupabaseLeadRepository`, `SupabaseImovelRepository`, etc).
- **Injeção de Dependência**: As rotas de API não fazem mais chamadas diretas ao `supabaseAdmin`. Elas usam o `getLeadRepository(client)` da `factory.ts`.

### 2. Segurança: Isolamento de Dados (Multi-Tenant)
Implementamos **Row Level Security (RLS)** em todas as tabelas críticas para garantir que uma imobiliária nunca veja os dados de outra.
- **Custom JWT Claim**: O token de autenticação agora contém o campo `app_role` (para evitar conflito com o campo reservado `role` do Postgres).
- **Políticas de RLS**: Tabelas como `leads`, `imoveis`, `corretores` e `eventos` agora filtram automaticamente pelo `imobiliaria_id` extraído do JWT via `auth.jwt()`.

### 3. Correções Críticas de Produção
- **Persistência de Dados**: Corrigidos erros silenciosos no cadastro de corretores e imóveis causados por divergência entre o código e o esquema do banco de dados (colunas faltantes).
- **Auto-Reply (Vercel Background)**: Implementado o uso de `waitUntil` nas rotas de API para garantir que mensagens automáticas de WhatsApp (que possuem delay de 20s) não sejam interrompidas pelo encerramento da função serverless.
- **Frontend Sync**: Corrigida a listagem de imóveis que aparecia vazia devido ao novo formato de resposta paginada do repositório.

## 🛠️ Configuração de Ambiente (Envs)

Para o sistema funcionar em produção (Vercel), as seguintes variáveis devem estar configuradas:

| Variável | Valor Recomendado | Finalidade |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_MOCK_MODE` | `false` | Ativa o banco de dados real (Supabase) |
| `SUPABASE_URL` | *(URL do seu projeto)* | Conexão com o banco real |
| `SUPABASE_SERVICE_KEY` | *(Service Role Key)* | Acesso administrativo para o motor de IA |
| `SUPABASE_JWT_SECRET` | *(JWT Secret)* | Necessário para assinar os tokens compatíveis com RLS |
| `WHATSAPP_DEFAULT_INSTANCE` | *(Nome da instância)* | Instância "mãe" da agência para auto-respostas |

### 4. CRM & Agenda (Fase 3) - CONCLUÍDO ✅
Implementamos as funcionalidades de negócio para otimizar o fluxo operacional da imobiliária:
- **WebCal Sync (Calendário Externo)**: Rota `/api/calendar/[id]` para sincronização com Google/Outlook.
- **Dashboards Gerenciais**: Nova visão de performance e conversão via `/api/stats`.
- **CRM Avançado**: Status "Descartado" e botões de ação rápida no Kanban/Tabela.
- **Webhooks (ZAP/VivaReal)**: Integração via Canal Pro para recebimento automático de leads.
- **UX Single Broker**: Otimização da agenda para imobiliárias de um único consultor.

## 🛠️ Deploy & Produção

- **Código**: Submetido para a branch `master` (Vercel deploy em andamento).
- **Build**: Validado localmente com sucesso.
- **Ambiente**: O `MOCK_MODE` está desativado no Vercel; o sistema utiliza Supabase com RLS.

> [!IMPORTANT]
> **Ação Requerida**: É necessário rodar o script de migração no Supabase SQL Editor:
> ```sql
> ALTER TYPE status_lead ADD VALUE 'descartado';
> ```
> O script também está disponível em `supabase/migrations/20260424191000_add_descartado_to_lead_status.sql`.

## 🚀 Próximos Passos (Fase 4: Escala & IA Avançada)

O projeto está pronto para automações mais complexas:
1. **Match Inteligente**: Melhorar o algoritmo de recomendação de imóveis com base no perfil do lead.
2. **Escala Automática**: Lógica para sugerir o corretor do dia com base na carga de trabalho e performance.
3. **Multi-Idioma**: Finalizar as traduções e formatos para o mercado de Portugal (Moeda/Terminologia).

---
*Atualizado em: 2026-04-24*
