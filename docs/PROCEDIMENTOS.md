# Procedimentos Internos de Desenvolvimento (Memória)

Este documento estabelece as regras obrigatórias para qualquer alteração no código deste repositório, garantindo estabilidade e continuidade.

## 1. Ciclo de Vida da Alteração
Antes de considerar uma tarefa concluída e realizar o push, o agente DEVE:

1.  **Validar Build Local:** Executar `npm run build` e garantir que o resultado seja `Exit code: 0`.
2.  **Corrigir Tipagem:** Se o build falhar devido ao TypeScript, as interfaces devem ser atualizadas imediatamente antes de tentar um novo push.
3.  **Push e Deploy:** Somente após o build local passar, realizar o `git push`.
4.  **Acompanhamento:** Monitorar se o deploy na Vercel (ou ambiente de produção) concluiu com sucesso.

## 2. Consistência de Permissões
*   Usuários com cargo `master` devem ter as mesmas permissões administrativas que `admin` em todos os endpoints de gestão (corretores, usuários, imobiliárias).
*   Sempre revisar o `getAuthFromCookies()` nos endpoints de API ao adicionar novas funcionalidades.

## 3. Experiência do Usuário (UX)
*   Nunca realizar ações silenciosas. Sempre utilizar `toast` (Sonner) para informar sucesso ou erro ao usuário.
*   Em fluxos combinados (ex: criar usuário que também é corretor), garantir que o sistema crie as entidades vinculadas automaticamente ou ofereça a opção no mesmo modal.

---
*Documento atualizado em: 2026-04-27*
