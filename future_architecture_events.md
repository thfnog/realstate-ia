# Plano de Arquitetura Futura: Distribuição de Leads por Eventos

Este documento descreve como evoluir a plataforma para um modelo **Event-Driven**, permitindo que múltiplos tenants ou instâncias processem leads de forma assíncrona e escalável.

## Visão Geral: Lead Exchange

Atualmente, o fluxo é linear (Síncrono). No futuro, usaremos o padrão **Pub/Sub (Publish/Subscribe)**.

## Proposta Técnica

### 1. Ingestão Desacoplada (Ingestion Layer)
- O formulário envia o lead para uma **Edge Function** ou rota simplificada.
- Essa função apenas valida o JSON e publica uma mensagem em um **Message Broker** (Redis, RabbitMQ ou Supabase Realtime).
- **Vantagem**: A submissão do formulário leva milissegundos e nunca falha por erros no processamento posterior.

### 2. Barramento de Eventos (Event Bus)
- Criar um evento `lead.created`.
- O payload contém todos os dados capturados e os metadados contextuais (ID da agência, país, etc).

### 3. Consumidores Especializados (Subscribers)
- **Engine de Atribuição**: Escuta `lead.created`, roda a lógica de escala e atribui um corretor.
- **Engine de Automação**: Escuta o resultado da atribuição e dispara mensagens via WhatsApp.
- **Engine de CRM**: Grava os dados finais no banco de dados.

## Escalabilidade Horizontal

> [!TIP]
> Com este modelo, podemos ter **N instâncias** da engine de processamento rodando. Se uma falhar, a mensagem volta para a fila e outra instância processa, garantindo que nenhum lead seja perdido.

## Roteamento Multi-Tenant Dinâmico
- O barramento pode usar "Routing Keys". Ex: `leads.br.agencia_x` ou `leads.pt.agencia_y`.
- Cada imobiliária poderia, teoricamente, ter seus próprios webhooks e consumidores plugados nesse barramento.
