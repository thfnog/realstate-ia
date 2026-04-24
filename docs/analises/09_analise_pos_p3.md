# 09 — Análise Pós-P3 e Visão de Futuro (Escalabilidade)

Com a conclusão da **Sprint P3**, o ImobIA atinge um estágio de maturidade muito superior ao MVP inicial. As funcionalidades de core business (matching, notificações, kanban) estão sólidas.

No entanto, para garantir que o sistema escale com segurança para dezenas ou centenas de imobiliárias (Multi-tenancy) sem quebrar, uma nova rodada de análise estrutural revela pontos críticos que precisam ser endereçados na próxima etapa.

---

## 1. O que foi consolidado (Avanços P0-P3)

A revisão do roadmap anterior mostra que os principais "gargalos de vida útil" do MVP foram resolvidos:

*   **Segurança Básica:** Rate Limiting em rotas públicas, validação de payload com Zod e Hashing de senhas (Bcrypt) estão operacionais.
*   **Inteligência e UX:** Motor de matching refinado (com scoring de 0-100% e filtro estrito de finalidade), painéis de diagnóstico (WhatsApp e Slack) e preferências granulares para o corretor.
*   **Estabilidade:** Uso de Cron Jobs da Vercel para Health Checks e lembretes, mitigando o problema do WhatsApp Web "dormir". Frontend componentizado com Drag & Drop e Command Palette.

---

## 2. Pontos Restantes de Evolução (Riscos e Débito Técnico)

### A. Arquitetura de Dados (A Bifurcação do Mock)
*   **Sintoma:** Os controladores da API ainda fazem verificações explícitas `if (mock.isMockMode())` para decidir de onde buscar os dados.
*   **Risco:** O código das regras de negócio (controllers) está misturado com a lógica de acesso a dados. Isso torna o sistema frágil a mudanças, difícil de testar de forma isolada e poluído.
*   **Evolução (Prioridade Alta):** Implementar o **Repository Pattern**. A API deve conversar apenas com interfaces (ex: `ILeadRepository`). A injeção de dependência define se em tempo de execução o app usa a classe `SupabaseLeadRepository` ou `MockLeadRepository`.

### B. Segurança Avançada e RLS (Row Level Security)
*   **Sintoma:** As queries reais para o banco de dados estão utilizando `supabaseAdmin` (chave de Service Role). O isolamento de dados entre diferentes imobiliárias (Multi-tenant) é feito *no código* (via função `applyRoleFilter`).
*   **Risco (Crítico):** Se um desenvolvedor esquecer de aplicar o filtro em um endpoint novo, dados de uma imobiliária vazarão para outra. A Service Key ignora qualquer regra do banco de dados.
*   **Evolução (Prioridade Máxima):** 
    1.  Ativar e configurar políticas **RLS no Supabase** vinculadas ao `imobiliaria_id` do JWT do usuário logado.
    2.  Remover o `supabaseAdmin` das operações normais de CRUD, limitando-o apenas a webhooks públicos que não possuem JWT de usuário.
    3.  Implementar o **Next.js Edge Middleware** (`src/middleware.ts`) para validar o JWT de forma global antes de qualquer requisição atingir as rotas `/api/admin` ou as páginas de interface, removendo a verificação manual repetitiva.

### C. Resiliência de Webhooks (Ingestão Assíncrona)
*   **Sintoma:** Quando o Grupo ZAP (Canal Pro) ou o eGO enviam um Webhook com o Lead, o sistema processa a inteligência (Matching, transcrição de áudio, regras) de forma *síncrona* dentro da requisição.
*   **Risco:** Se a IA (Groq/OpenAI) demorar ou o banco de dados engasgar, o Webhook excede o tempo de resposta (Timeout). Portais imobiliários costumam bloquear ou desativar integrações que falham consistentemente.
*   **Evolução (Prioridade Média):** Adicionar um sistema de Filas (Message Queue). O endpoint do webhook apenas salva o payload no banco/fila e retorna `200 OK` instantaneamente. Um worker em background processa a inteligência e o envio de mensagens.

### D. Qualidade e Testes Contínuos (CI/CD)
*   **Sintoma:** O erro recente no deploy (onde o tipo `LeadSource` e os defaults do `MockDb` quebraram o TypeScript) mostrou que falhas podem chegar à etapa de build. Não há testes automatizados validando o funcionamento.
*   **Evolução (Prioridade Média):** Implementar testes unitários (Jest/Vitest) para o cérebro da aplicação: o `Lead Engine` (regras de matching, atribuição). Adicionar integração contínua (GitHub Actions) para barrar PRs que não compilem.

---

## 3. Roadmap Sugerido: Sprint P4 (Fundação Multi-Tenant)

Se a missão agora for preparar o sistema para **onboarding real de clientes** em escala, a próxima sprint deve focar 100% na fundação técnica:

1.  **Segurança Global:** Criar o `middleware.ts` e implementar RLS no Supabase.
2.  **Limpeza de Código:** Aplicar o Repository Pattern nas rotas mais críticas (`leads` e `imoveis`).
3.  **Filas de Ingestão:** Desacoplar a resposta do Webhook do processamento pesado.
4.  **Testes Críticos:** Blindar a lógica de cálculo de *Match Score* com testes unitários.

> [!WARNING]
> Sem o RLS (Row Level Security) e o Repository Pattern, escalar para múltiplos clientes aumenta significativamente o risco de vazamento de dados corporativos e bugs sistêmicos.
