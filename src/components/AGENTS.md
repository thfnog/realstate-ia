# AGENTS.md — Componentes de Interface (`src/components/`)

Componentes React 19 construídos com Tailwind CSS v4 para o dashboard administrativo e páginas públicas.

## Organização de Pastas

```
src/components/
├── CommandPalette.tsx         # Spotlight global (Cmd+K / Ctrl+K) para navegação rápida
├── PlanGuard.tsx              # Gatekeeper que esconde/bloqueia recursos por plano contratado
├── LoadingSkeleton.tsx        # Estados de carregamento e skeletons animados
├── admin/alugueis/            # Modais de aprovação de crédito e análise de propostas
├── config/                    # Componentes de configuração de canais e preferências
├── corretores/                # Onboarding de corretores e pareamento de WhatsApp (QR Code)
├── crm/                       # Gavetas e timelines de atendimento ao cliente
├── imoveis/                   # Formulários de imóveis, galerias de fotos, mapas e cálculo de mercado
├── layout/                    # Barra superior, sino de notificações e gaveta de navegação
└── leads/                     # Kanban drag-and-drop (@dnd-kit), tabela e modais de agenda
```

## Regras de Estilização e UX
1. **Design Responsivo**: Todas as telas devem funcionar perfeitamente em mobile (gaveta retrátil, tabelas com scroll horizontal suave ou cards alternativos).
2. **Feature Gating**: Envolva componentes de recursos avançados com `<PlanGuard module="nome_do_modulo">` para respeitar o plano da imobiliária.
3. **Feedback Visual**: Use `sonner` para disparar toasts modernos de sucesso ou erro nas ações do usuário.
4. **Imports**: Utilize alias `@/components/...` e `@/lib/...`.
