-- 20260427202000_create_notifications.sql
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imobiliaria_id UUID NOT NULL REFERENCES public.imobiliarias(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'sistema', -- 'sistema', 'lead', 'financeiro', 'agenda'
    link TEXT, -- opcional para redirecionamento
    lida BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Index para performance de busca por usuário (notificações não lidas)
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_lida ON public.notificacoes(usuario_id, lida);

-- RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias notificações"
ON public.notificacoes FOR SELECT
TO authenticated
USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));

CREATE POLICY "Usuários podem marcar suas notificações como lidas"
ON public.notificacoes FOR UPDATE
TO authenticated
USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()))
WITH CHECK (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));
