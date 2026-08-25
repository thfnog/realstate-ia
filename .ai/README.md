# 🤖 ImobIA — Contexto para Agentes de IA

> Este diretório contém documentação estruturada para que agentes de IA (Copilot, Claude, Gemini, etc.)
> naveguem o projeto com eficiência máxima e mínimo consumo de tokens.

## Quando Ler o Quê

| Situação | Arquivo | Tempo de leitura |
|---|---|---|
| **Qualquer tarefa** | [`code-graph.json`](./code-graph.json) | ~5s (mapa estrutural) |
| **Entender a arquitetura** | [`architecture.md`](./architecture.md) | ~30s |
| **Criar ou modificar código** | [`conventions.md`](./conventions.md) | ~20s |
| **Entender termos de negócio** | [`domain-glossary.md`](./domain-glossary.md) | ~15s |
| **Análise profunda por área** | `docs/analises/01..09` | ~2min cada |

## Estratégia de Contexto (Harness Híbrido)

Este projeto usa uma estratégia híbrida de contexto para agentes de IA:

- **Eager Layer** → `code-graph.json` é um mapa estrutural gerado automaticamente via `ts-morph` + PageRank.
  Ele mapeia todos os arquivos, dependências, exports e hot paths. Leia-o **sempre** antes de qualquer tarefa.

- **JIT Layer** → Os demais arquivos `.md` neste diretório e os `AGENTS.md` em cada módulo
  fornecem contexto sob demanda. Leia **apenas** os relevantes para sua tarefa.

## AGENTS.md por Módulo

Cada módulo principal tem seu próprio `AGENTS.md` com regras e contexto local:

| Módulo | Path | Conteúdo |
|---|---|---|
| Engine (IA) | `src/lib/engine/AGENTS.md` | Pipeline AI, FSM, providers, fallbacks |
| Repositórios | `src/lib/repositories/AGENTS.md` | Padrão Mock+Supabase+Factory |
| API Routes | `src/app/api/AGENTS.md` | Convenções de rotas, auth, error handling |
| Components | `src/components/AGENTS.md` | Padrões React, imports, Tailwind |
| Infraestrutura | `src/lib/AGENTS.md` | Auth, WhatsApp, billing, utils |

## Regenerar o Code Graph

```bash
npm run graph
```

O graph é regenerado automaticamente em cada `git push` para `main`.
