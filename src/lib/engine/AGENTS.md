# AGENTS.md — Motor Central de IA (`src/lib/engine/`)

Este módulo é o coração da inteligência e automação da plataforma ImobIA.

## Visão Geral dos 19 Módulos

| Arquivo | Função Principal | Integrações / Dependências |
|---|---|---|
| `aiUtils.ts` | Gateway multi-provedor (OpenRouter ➔ Groq ➔ OpenAI) com telemetria | Supabase (`ai_usage_logs`) |
| `conversationEngine.ts` | FSM de 7 estados para chat contínuo no WhatsApp | `aiUtils`, `recommendImoveis`, `aiScheduler` |
| `processLead.ts` | Pipeline central de ingestão e orquestração de novo lead | `checkCarteira`, `assignCorretor`, `aiExtractor` |
| `aiExtractor.ts` | Extração de preferências imobiliárias de mensagens brutas | `ai_feedback` (feedback loop) |
| `aiScheduler.ts` | Detecção de intenção de visita e sugestão de horários | `eventos` (conflitos de agenda) |
| `audioTranscriber.ts` | Transcrição de áudio base64 para texto | Groq Whisper / OpenAI Whisper |
| `leadClassifier.ts` | Classificação do contato (comprador, parceiro, locatário, etc.) | `aiUtils` |
| `recommendImoveis.ts` | Algoritmo de scoring ponderado de imóveis | `imoveis`, `string-similarity` |
| `reverseMatching.ts` | Encontra leads compatíveis para um novo imóvel cadastrado | `leads` |
| `dailyBriefing.ts` | Cron de briefing matinal individualizado para corretores | `countryConfig`, WhatsApp |
| `webhookProcessor.ts` | Roteamento e desduplicação de eventos de webhook | `processLead`, `conversationEngine` |
| `assignCorretor.ts` | Atribuição de corretor via plantão ou round-robin | `escala`, `corretores` |
| `checkCarteira.ts` | Verificação de cliente recorrente por telefone | `leads` |
| `sendAutoReply.ts` | Envio de mensagem com simulação de delay humano | `whatsapp.ts` |
| `sendBriefing.ts` | Formatação e disparo de briefing para o corretor | `whatsapp.ts` |

## Regras para Alterações no Engine
1. **Sempre passe pelo `callAIWithFallback`**: Nunca importe SDKs externos de IA diretamente.
2. **Preserve a Máquina de Estados**: O `conversationEngine.ts` opera com estados finitos. Mudanças de transição devem respeitar os limites de turno (`MAX_TURNS`).
3. **Não bloqueie Webhooks**: Operações pesadas (áudio, LLM) devem ser desacopladas ou executadas assincronamente.
