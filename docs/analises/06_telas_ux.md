# 06 — Análise de Telas e UX

## Inventário de Telas

### Telas Públicas

| # | Rota | Propósito | Status |
|---|------|-----------|--------|
| 1 | `/` | Landing page | ✅ Funcional, design moderno |
| 2 | `/login` | Login do painel | ✅ Funcional |
| 3 | `/registro` | Registro de nova imobiliária | ✅ Funcional |
| 4 | `/formulario?imob_id=X` | Formulário de captação público | ✅ Funcional, multi-step |
| 5 | `/imoveis?imob_id=X` | Vitrine pública de imóveis | ✅ Funcional, com busca |
| 6 | `/imoveis/[id]` | Detalhe público do imóvel | ✅ Funcional, com fotos |

### Telas Admin

| # | Rota | Propósito | Linhas | Status |
|---|------|-----------|--------|--------|
| 7 | `/admin` | Dashboard | 375 | ✅ KPIs básicos |
| 8 | `/admin/leads` | Esteira de vendas (Kanban) | **988** | ✅ Funcional mas mega-componente |
| 9 | `/admin/imoveis` | CRUD de imóveis | ~600 | ✅ Funcional, com upload de fotos |
| 10 | `/admin/corretores` | Gestão de corretores | ~400 | ✅ Funcional, com integração WA |
| 11 | `/admin/agenda` | Escala + agenda de eventos | ~500 | ✅ Funcional |
| 12 | `/admin/carteira` | Carteira de clientes | ~300 | ✅ Funcional |
| 13 | `/admin/config` | Configurações | **488** | ✅ Funcional |

---

## Gaps de UX

### 🔴 Críticos

| # | Gap | Impacto | Tela |
|---|-----|---------|------|
| U1 | **Sem loading states nos cards do Kanban** | Confuso ao arrastar leads entre colunas | leads |
| U2 | **Modal do lead é muito denso** | Informações, timeline, matching, ações — tudo em um popup | leads |
| U3 | **Feedback de formulário fraco** | Após submit, a transição é abrupta — sem animação de sucesso | formulario |
| U4 | **Sem empty states bonitos** | Telas sem dados mostram "Nenhum lead" em texto simples | todos |

### 🟡 Importantes

| # | Gap | Impacto | Tela |
|---|-----|---------|------|
| U5 | **Sem busca global** | Corretor precisa navegar por telas para achar lead/imóvel | admin layout |
| U6 | **Dashboard sem gráficos** | Apenas KPIs numéricos, sem visualização temporal | dashboard |
| U7 | **Sem notificação in-app** | Novos leads não geram alerta no painel — só via WA | admin |
| U8 | **Formulário multi-step sem persistência** | Se recarregar, perde dados preenchidos | formulario |
| U9 | **Sem dark mode toggle** | O painel é dark, o form é light — sem opção de troca | geral |
| U10 | **Vitrine sem filtro por preço** | Slider de preço seria natural para busca de imóveis | imoveis |

### 🟢 Nice-to-have

| # | Gap | Tela |
|---|-----|------|
| U11 | **Drag & drop no Kanban** (arrastar cards entre colunas) | leads |
| U12 | **Gallery carousel** para fotos do imóvel (swipe) | imoveis/[id] |
| U13 | **Avatar/iniciais do corretor** nos cards | leads, corretores |
| U14 | **Skeleton loading** nos componentes | todos |
| U15 | **Breadcrumbs** na navegação | admin |

---

## Responsividade

| Tela | Desktop | Tablet | Mobile |
|------|---------|--------|--------|
| Dashboard | ✅ | ✅ | ✅ |
| Leads (Kanban) | ✅ | 🟡 (scroll horizontal) | 🟡 (vertical, funcional) |
| Imóveis | ✅ | ✅ | ✅ |
| Formulário | ✅ | ✅ | ✅ |
| Config | ✅ | ✅ | 🟡 (seções longas) |

**Nota**: O sidebar mobile (drawer) está ✅ bem implementado com slide animation.

---

## Acessibilidade

| Critério | Status | Notas |
|----------|--------|-------|
| Contraste de cores | 🟡 | Texto muted pode ter contraste insuficiente |
| Labels em inputs | ✅ | Labels conectados via `htmlFor` |
| Keyboard navigation | 🟡 | Modals não trapping focus |
| Screen reader | ❌ | Sem `aria-*` labels em componentes interativos |
| Focus visible | 🟡 | ring-2 em inputs, falta em botões custom |

---

## Recomendações UX Prioritárias

### MVP Polish (antes de clientes)
1. **Skeleton loading** em todas as listas (já que Tailwind tem utilitário `animate-pulse`)
2. **Empty states** com ícone + CTA ("Cadastre seu primeiro imóvel →")
3. **Success animation** no formulário (checkmark animado)
4. **Toast notifications** para feedback de ações (salvar, enviar, deletar)

### Pós-MVP
5. **Drag & drop** no Kanban com `@dnd-kit/core` (lightweight)
6. **Busca global** no header com Command Palette (⌘K)
7. **Notificação in-app** (badge com contagem de novos leads)
8. **Componentizar leads page** (988 → 200 linhas no componente principal)
