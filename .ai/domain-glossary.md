# Glossário de Domínio & Entidades (ImobIA)

Mapeamento entre **Termos de Negócio**, **Tipos no Código TypeScript** e **Tabelas do Supabase**.

## Matriz de Entidades Principais

| Termo de Negócio | Interface / Tipo TS | Tabela Supabase | Repositório | Descrição |
|---|---|---|---|---|
| **Lead / Cliente** | `Lead`, `LeadComCorretor` | `leads` | `ILeadRepository` | Cliente potencial capturado via formulário, WhatsApp ou portais. |
| **Imóvel / Propriedade** | `Imovel` | `imoveis` | `IImovelRepository` | Catálogo de imóveis cadastrados para venda ou locação. |
| **Corretor / Agente** | `Corretor` | `corretores` | `ICorretorRepository` | Profissional de vendas com instância WhatsApp, meta e escala. |
| **Evento / Visita** | `Evento`, `EventoComDetalhes` | `eventos` | `IEventoRepository` | Agendamento de visita, reunião ou compromisso sincronizável via WebCal. |
| **Venda / Fechamento** | `Venda` | `vendas` | `IVendaRepository` | Registro de negócio concretizado e cálculo de comissões. |
| **Contrato de Locação** | `Contrato`, `ContratoComDetalhes` | `contratos` | `IContratoRepository` | Contrato ativo de aluguel/arrendamento, garantias e repasses. |
| **Pagamento de Aluguel** | `PagamentoContrato` | `pagamentos_contratos` | `IContratoRepository` | Fluxo financeiro mensal de recebimentos e repasses. |
| **Corretor Parceiro** | `Parceiro` | `parceiros` | `IParceiroRepository` | Corretor externo/parceiro para co-corretagem e parcerias. |
| **Oportunidade Comercial** | `Oportunidade`, `OportunidadeComDetalhes` | `oportunidades` | `IOportunidadeRepository` | Deal/negociação em andamento com parceiros ou proprietários. |
| **Escala de Plantão** | `Escala` | `escala` | `/api/escala/` | Definição de dias e turnos de plantão dos corretores da agência. |
| **Estado de Conversa** | `ConvStateRecord`, `ConversationState` | `conversation_state` | `conversationEngine.ts` | Máquina de estados da IA para diálogo contínuo no WhatsApp. |
| **Feedback de IA** | `AIFeedback` | `ai_feedback` | `aiExtractor.ts` | Amostras corrigidas por humanos para calibração contínua da IA. |
| **Telemetria de IA** | `AIUsageLog` | `ai_usage_logs` | `aiUtils.ts` | Registro de tokens consumidos, custos, latência e provedor usado. |
| **Configuração de Briefing** | `DailyBriefingConfig` | `daily_briefing_config` | `dailyBriefing.ts` | Horário e ativação do resumo matinal enviado aos corretores. |
| **Configurações do Sistema** | `SystemConfig` | `system_config` | `/api/master/system-config` | Chaves de integração globais e flags de feature. |

---

## Regionalização e Terminologia Localizada (`countryConfig.ts`)

| Conceito | 🇧🇷 Brasil (`BR`) | 🇵🇹 Portugal (`PT`) | Função / Chave |
|---|---|---|---|
| **Divisão de Bairro** | Bairro | Freguesia | `config.terms.bairro` |
| **Cidade / Município** | Cidade | Concelho | `config.terms.cidade` |
| **Estado / Região** | Estado (UF) | Distrito | `config.terms.estado` |
| **Registro Profissional** | CRECI | Licença AMI | `config.terms.documentoCorretor` |
| **Documento Fiscal Empresa** | CNPJ | NIPC / NIF | `config.terms.documentoEmpresa` |
| **Documento Fiscal Pessoa** | CPF | NIF | `config.terms.documentoPessoa` |
| **Locação de Imóvel** | Aluguel | Arrendamento | `config.terms.aluguel` |
| **Moeda** | Real (`R$`) | Euro (`€`) | `config.currencySymbol` |
| **Fuso Horário Padrão** | `America/Sao_Paulo` | `Europe/Lisbon` | `config.timezone` |
