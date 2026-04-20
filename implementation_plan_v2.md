# Plano de Implementação: Gestão de Leads, Escala e Responsividade Mobile

Este plano detalha as alterações necessárias para melhorar o fluxo operacional de leads, corrigir a escala de corretores unitários e tornar o sistema 100% responsivo para uso em dispositivos móveis.

## 1. Gestão de Leads: Excluir e Desqualificar
### Objetivo: Permitir que leads ruins ou falsos sejam removidos ou descartados do funil.

#### [MODIFY] [database.types.ts](file:///c:/Users/Thiago%20Nogueira/workspace/realstate-ia/src/lib/database.types.ts)
- Adicionar `'descartado'` ao tipo `StatusLead`.

#### [MODIFY] [route.ts](file:///c:/Users/Thiago%20Nogueira/workspace/realstate-ia/src/app/api/leads/[id]/route.ts)
- Implementar o método `DELETE` para remoção física do lead do banco de dados (Supabase/Mock).

#### [MODIFY] [page.tsx](file:///c:/Users/Thiago%20Nogueira/workspace/realstate-ia/src/app/admin/leads/page.tsx)
- Adicionar botão de "Lixeira" na visão de Tabela e no Card do Kanban.
- Adicionar o status "Descartado" no dropdown de status.
- UI: Leads descartados não devem aparecer no funil ativo por padrão.

## 2. Agenda & Escala: Otimização para Corretor Único
### Objetivo: Facilitar o "pintar" da escala quando só existe um corretor na imobiliária.

#### [MODIFY] [page.tsx](file:///c:/Users/Thiago%20Nogueira/workspace/realstate-ia/src/app/admin/agenda/page.tsx)
- No `useEffect` de carregamento, se `corretores.length === 1`, selecionar automaticamente esse corretor no estado `selectedCorretorId`.
- Melhorar o feedback visual do "Modo Escala" para indicar que basta clicar nos dias.

## 3. Responsividade Mobile (UI/UX)
### Objetivo: Garantir que o corretor possa usar o sistema na rua via celular.

#### [MODIFY] [layout.tsx](file:///c:/Users/Thiago%20Nogueira/workspace/realstate-ia/src/app/admin/layout.tsx)
- Substituir a Sidebar fixa por um componente responsivo.
- Adicionar Header mobile com botão Hamburger.
- Usar Drawer/Overlay para o menu lateral em telas pequenas.

#### [MODIFY] Páginas Administrativas (Dashboard, Leads, Agenda)
- Ajustar `grid-cols` para `grid-cols-1` em mobile.
- Garantir `overflow-x-auto` em todas as tabelas e no Kanban.
- Reduzir paddings em telas pequenas.

---

## Verificação
- **Manualmente**: Abrir o devtools do navegador, ativar modo mobile (iPhone/Pixel) e verificar se o menu funciona e o layout não quebra.
- **Leads**: Criar um lead de teste e deletá-lo.
- **Escala**: Verificar se o corretor único já vem pré-selecionado ao ligar o "Modo Escala".

> [!IMPORTANT]
> A alteração no layout é a mais crítica, pois afeta todas as telas. Vou priorizar manter a identidade visual premium (cores e sombras) que já temos.
