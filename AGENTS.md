<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🤖 ImobIA — Guia de Arquitetura & Contexto para Agentes de IA

Este projeto adota uma arquitetura de contexto **Híbrida (Eager + Just-in-Time)** para máxima eficiência e precisão na geração de código:

## 1. Fluxo de Leitura Recomendado (Economia de Tokens)
1. **Sempre comece consultando o Code Graph**: Leia `.ai/code-graph.json` para inspecionar dependências, ranking de importância (PageRank), nós afetados e hot paths.
2. **Consulte as Diretrizes Gerais**:
   - Para regras arquiteturais e boas práticas: `.ai/architecture.md` e `.ai/conventions.md`
   - Para mapeamento de entidades e regionalização BR/PT: `.ai/domain-glossary.md`
3. **Consulte o Contexto Local do Módulo**:
   - `src/lib/engine/AGENTS.md` (Motores de IA, FSM, transcrição de áudio e agendamento)
   - `src/lib/repositories/AGENTS.md` (Padrão de repositórios Mock vs Supabase + Factory)
   - `src/app/api/AGENTS.md` (Rotas de API, webhooks e cron jobs)
   - `src/components/AGENTS.md` (Componentes React 19, PlanGuard e Tailwind v4)
   - `src/lib/AGENTS.md` (Infraestrutura, Auth, WhatsApp, Billing e utilitários)

---

## 2. Regras Fundamentais do Projeto
- **Chamadas de IA**: SEMPRE use `callAIWithFallback` de `@/lib/engine/aiUtils` (OpenRouter ➔ Groq ➔ OpenAI).
- **Acesso a Dados**: Utilize sempre as fábricas de repositório (`get*Repository(supabase)`).
- **Webhooks**: Responda status `200 OK` imediatamente e processe pipelines pesados via `waitUntil` da `@vercel/functions`.
- **Terminologia & Localização**: Use `countryConfig.ts` para renderizar termos de acordo com o país configurado (Brasil vs Portugal).

---

# Deployment Rules
Sempre que concluir uma alteração, você DEVE:
1. Fazer o commit e push para o repositório (ex: `git push origin master`). O Vercel será acionado automaticamente pelo GitHub.
2. Acompanhar o progresso do deploy automático usando `npx vercel ls` até que o status seja 'Ready'. Não use `npx vercel --prod` a menos que o deploy automático falhe ou não exista integração.
3. Informar o usuário quando o deploy estiver concluído.
