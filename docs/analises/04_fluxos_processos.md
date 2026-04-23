# 04 — Análise de Fluxos e Processos de Negócio

## Objetivo do MVP
> Automatizar o dia-a-dia do corretor de imóveis: receber leads, qualificá-los com IA, notificar via WhatsApp, e manter um CRM simplificado.

---

## Fluxos Principais

### Fluxo 1: Lead via Formulário
```
Visitante → Formulário Público → POST /api/leads
  ├── Deduplicação por telefone ✅ (recente)
  ├── processLead()
  │   ├── Assign Corretor (escala/fallback)
  │   ├── Recommend Imóveis (scoring)
  │   ├── Briefing WA para corretor (se !solo)
  │   └── Auto-reply WA para lead (5s delay)
  └── Lead aparece no Funil "NOVO"
```

**Status**: ✅ Funcional  
**Gaps**:
- O formulário **não exibe mensagem de sucesso clara** informando que o lead receberá contato.
- Não há confirmação visual na tela após submit (apenas `isSuccess` toggling).
- O `delay de 5s` é ok, mas se o Vercel Function timeout, a mensagem nunca é enviada.

### Fluxo 2: Lead via WhatsApp (Bot)
```
Cliente manda mensagem WA → Evolution Webhook → POST /api/webhooks/whatsapp
  ├── Verificar se lead já existe (follow-up vs. novo)
  │   ├── Lead Existe → Bloco follow-up
  │   │   ├── Nome pendente? → Extrair nome com IA → atualizar DB
  │   │   ├── Agendamento? → aiScheduler sugere horários
  │   │   └── Outro → AI responde na conversa
  │   └── Lead Novo →
  │       ├── Deduplicação por telefone ✅
  │       ├── aiExtractor (triagem: lead real ou ruído?)
  │       ├── processLead()
  │       └── Lead no Funil
  └── Response JSON
```

**Status**: ✅ Funcional (mais robusto dos 4 fluxos)  
**Gaps**:
- **Sem limite de interações do bot** — se o cliente continuar mandando mensagens, o bot pode responder infinitamente (custo de IA).
- **Sem handoff explícito** — a transição bot → corretor humano não é clara. O corretor precisa manualmente "assumir" o lead.
- **Log de conversa** não é persistido — as mensagens do bot e do cliente não ficam salvas em um histórico consultável.

### Fluxo 3: Lead via Portal (ZAP/OLX/VivaReal)
```
Lead clica "Tenho interesse" no Portal
  → Grupo OLX envia webhook → POST /api/ingest/grupozap?imob_id=XXX
  ├── Deduplicação ✅
  ├── processLead()
  └── Lead no Funil
```

**Status**: 🟡 Implementado mas não testado em produção (sem Canal Pro configurado)  
**Gaps**:
- **Webhook secret** é verificado mas pode estar ausente (`GRUPOZAP_WEBHOOK_SECRET`).
- Sem teste real com payload do Canal Pro.

### Fluxo 4: Lead via E-mail (eGO/Portugal)
```
Cron ou manual → POST /api/ingest/email?imob_id=XXX
  ├── Parse de e-mail → extrai lead
  ├── Deduplicação ✅
  ├── processLead()
  └── Lead no Funil
```

**Status**: 🟡 Parser implementado, IMAP não conectado  
**Gaps**:
- **IMAP não funcional** — leitura real de e-mail não está rodando.
- Sem cron configurado para execução periódica.

---

## Fluxo do CRM (Esteira de Vendas)

```
NOVO → EM_ATENDIMENTO → VISITA_AGENDADA → NEGOCIAÇÃO → CONTRATO → FECHADO
  ↘ SEM_INTERESSE
  ↘ DESCARTADO
```

**Status**: ✅ Funcional  
**Gaps**:
- **Transição de status é 100% manual** — o corretor precisa arrastar/clicar para mover o lead.
- **Não há automação de status** — ex: criar evento de visita poderia mover automaticamente para `visita_agendada` (parcialmente implementado no webhook).
- **Sem SLA/alertas** — se um lead está em "NOVO" por 24h sem atendimento, ninguém é alertado.
- **Sem métricas** — taxa de conversão, tempo médio por etapa, ranking de corretores.

---

## Fluxo de Agendamento (Agenda)

```
Admin abre modal do Lead → Cria evento → Evento salvo em DB
  ├── Notificação WA para o lead (opcional, via instância padrão/corretor)
  └── Evento aparece na timeline do lead e na agenda
```

**Status**: ✅ Funcional  
**Gaps**:
- **Sem lembrete/reminder** — não há notificação automática antes da visita (ex: "Olá, lembrete da visita amanhã às 15h").
- **Sem sync com Google Calendar** — o corretor precisaria olhar a agenda no painel E no Google Calendar separadamente.
- **Sem confirmação do lead** — o lead não pode confirmar/cancelar via WA.
- **Evento sem vínculo com imóvel** — não registra qual imóvel será visitado.

---

## Fluxo de Imóveis

```
Admin cadastra imóvel → Upload de fotos (Supabase Storage) → Imóvel listado
  ├── Reverse Matching: busca leads compatíveis → notifica corretor
  └── Vitrine pública: /imoveis/[id]
```

**Status**: ✅ Funcional  
**Gaps**:
- **Reverse Matching** usa comparação exata de bairro ao invés de parcial (diferente do forward matching que já foi corrigido).
- **Sem integração com portais** — imóveis são cadastrados manualmente, sem importação em massa.
- **Fotos sem otimização** — sem compressão/resize automático antes do upload.
- **Sem link direto no briefing** — o briefing WA poderia incluir link para a vitrine do imóvel.

---

## Processos Ausentes (Gaps de Negócio)

| # | Processo | Importância | Complexidade |
|---|----------|-------------|-------------|
| P1 | **Dashboard de métricas** (conversão, tempo, volume) | 🔴 Alta | Média |
| P2 | **Histórico de conversas WA** persistido no lead | 🔴 Alta | Média |
| P3 | **Lembretes automáticos** (visita, follow-up) | 🟡 Alta | Baixa |
| P4 | **Relatórios exportáveis** (PDF/Excel) | 🟡 Média | Baixa |
| P5 | **Notificação multi-canal** (email + WA) | 🟡 Média | Baixa |
| P6 | **Onboarding automatizado** (wizard para novo tenant) | 🟡 Média | Média |
| P7 | **Integração CanalPro real** (webhook + certificado) | 🟡 Média | Média |
| P8 | **Formulário embed** (iframe/widget para sites externos) | 🟢 Baixa | Baixa |
| P9 | **Importação em massa** de imóveis (CSV/Excel) | 🟢 Baixa | Média |
| P10 | **App mobile** (PWA ou React Native) | 🟢 Baixa | Alta |
