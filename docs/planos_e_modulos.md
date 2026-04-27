# Documentação de Planos, Módulos e Telas

Esta documentação detalha a arquitetura SaaS do ImobIA, descrevendo como os planos limitam o acesso aos módulos e quais telas compõem cada parte do sistema.

## 1. Estrutura de Planos

O sistema utiliza um modelo de assinatura baseado em módulos. Cada plano libera um conjunto específico de funcionalidades.

| Plano | Slug | Módulos Inclusos | Público-Alvo |
| :--- | :--- | :--- | :--- |
| **Essencial** | `essencial` | Dashboard, CRM, Sistema | Corretores autônomos e pequenas equipes. |
| **Profissional** | `profissional` | Dashboard, CRM, Inventário, Operação, Sistema | Imobiliárias focadas em vendas e crescimento. |
| **Enterprise** | `enterprise` | Todos os módulos (inclui Locação) | Imobiliárias de ciclo completo (Venda + Locação + Financeiro). |

---

## 2. Detalhamento dos Módulos e Telas

### A. Módulo: DASHBOARD (Base)
*Sempre habilitado em todos os planos.*
- **Início (`/admin`)**: Visão geral com métricas de leads, conversão e atalhos rápidos. Exibe banners informativos (ex: Mock Mode) e status de conexão.

### B. Módulo: CRM (`crm`)
*Focado na captura e conversão de leads.*
- **Leads (`/admin/leads`)**: Funil de vendas, listagem de contatos, histórico de mensagens WhatsApp e status de atendimento.
- **Fila de Ingestão (`/admin/webhook-logs`)**: (Apenas Admin) Monitoramento técnico de leads chegando via portais (ZAP, VivaReal, eGO).

### C. Módulo: INVENTÁRIO (`inventario`)
*Gestão do catálogo de imóveis.*
- **Imóveis (`/admin/imoveis`)**: Cadastro completo de propriedades, upload de fotos, geolocalização e integração de preços (BRL/EUR).

### D. Módulo: LOCAÇÃO (`locacao`)
*O módulo mais avançado, exclusivo para o plano Enterprise.*
- **Propostas (`/admin/alugueis/propostas`)**: Gestão de propostas de aluguel, análise de crédito serasa/renda e anexos de documentos.
- **Contratos (`/admin/contratos`)**: Gestão de contratos ativos, datas de reajuste, taxas de administração e garantias (caução, fiador, etc).
- **Financeiro (`/admin/financeiro/mensal`)**: Hub financeiro recorrente. Controle de recebimentos de inquilinos e repasses a proprietários.

### E. Módulo: OPERAÇÃO (`operacao`)
*Gestão da equipe e rotinas.*
- **Corretores (`/admin/corretores`)**: Cadastro de equipe e status de conexão WhatsApp individual.
- **Agenda & Escala (`/admin/agenda`)**: Calendário de escalas para atendimento automático de novos leads.
- **Carteira (`/admin/carteira`)**: Gestão de leads e imóveis específicos por corretor.

### F. Módulo: SISTEMA (`sistema`)
*Configurações estruturais.*
- **Usuários (`/admin/usuarios`)**: Controle de acesso (Admin vs Corretor).
- **Meu Perfil (`/admin/perfil`)**: Dados pessoais e troca de senha.
- **Configurações (`/admin/config`)**: Configuração de país (BR/PT), tempos de auto-reply e chaves de API.

---

## 3. Painel Master (Administração Global)

Acessível apenas para usuários com a role `master`. Permite gerir a plataforma como um todo.

- **Painel Global (`/admin/master`)**: Métricas de MRR (Receita Mensal), taxa de conversão global da plataforma e crescimento de contas.
- **Imobiliárias (`/admin/master/imobiliarias`)**: Listagem de todos os tenants, status de assinatura e upgrade manual de planos.
- **Planos & Módulos (`/admin/master/planos`)**: Configuração do que cada plano oferece e seus respectivos preços.
- **Receita Global (`/admin/master/financeiro`)**: Fluxo de caixa de faturas pagas pelas imobiliárias.
- **Status do Sistema (`/admin/master/status`)**: Monitoramento em tempo real da saúde das APIs (Vercel, Supabase, Evolution API, OpenAI).

---

## 4. Lógica de Ativação Técnica

O sistema verifica os módulos ativos através do endpoint `/api/imobiliaria`. 
- Se houver uma entrada na tabela `assinaturas` com `status = 'ativo'`, os módulos são carregados do campo `planos.modulos`.
- Caso contrário, o sistema utiliza um fallback baseado na coluna legada `imobiliarias.plano`.
- Se nenhum dado for encontrado, o sistema habilita apenas o conjunto básico: `['dashboard', 'crm', 'sistema']`.
