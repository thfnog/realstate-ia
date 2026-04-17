# Fluxo de Automação de Leads — ImobIA (Brasil 🇧🇷)

Este documento descreve o funcionamento do motor de automação para o mercado brasileiro, desde a captura no portal até o briefing no WhatsApp do corretor.

## 1. Captura (Ingestão Automática)
A porta de entrada principal no Brasil é o **Canal Pro (Grupo OLX)**.
- **Canal**: Webhook HTTP POST.
- **Portais**: VivaReal, ZAP Imóveis e OLX.
- **Funcionamento**: Assim que um lead preenche um formulário nestes portais, o Canal Pro envia um JSON para o nosso endpoint:
  `POST /api/ingest/grupozap?imob_id=SEU_ID`

## 2. Processamento e Inteligência (Lead Engine)
O motor regionalizado do ImobIA assume o controle em 4 etapas:

1.  **Identificação**: O sistema deteta que a agência é **BR** e aplica as regras de moeda (R$) e terminologia (Quartos, Vagas).
2.  **Atribuição (Roleta)**: O lead é entregue ao corretor que está "De Plantão" na Escala do dia. Se não houver escala, usa-se o sistema de Fila (Round-robin).
3.  **Qualificação**: O motor analisa a mensagem original do lead para identificar o perfil de interesse e a finalidade (Venda ou Aluguer).
4.  **Recomendação**: O sistema faz um "match" instantâneo com os imóveis da agência, selecionando os 3 mais compatíveis por Bairro e Orçamento.

## 3. Entrega (Briefing para o Corretor)
O corretor não precisa de abrir o computador. Ele recebe um **Briefing Inteligente** via WhatsApp:

- **Dados do Lead**: Nome, Telefone (com botão de clique para ligar) e Origem (ex: VivaReal).
- **Contexto**: Resumo da mensagem do cliente.
- **Sugestão de Atendimento**: O sistema sugere imóveis específicos do portfólio para o corretor já iniciar o atendimento com opções na mão.

---

## FAQ: O WhatsApp é Automático?

### Receção (Ingestão)
*   **Atualmente**: Não é 100% automático para *receber* a primeira mensagem do cliente via WhatsApp direto (devido às restrições da Meta API). Os leads entram automaticamente via **Portais (Zap/Viva/Site)**.
*   **Próximo Passo**: Podemos integrar webhooks do **Z-API** ou **Evolution API** para que, se um cliente escrever para o WhatsApp da agência, ele também entre no fluxo automático.

### Envio (Briefing)
*   **Sim**: O envio do briefing para o broker é a parte final do fluxo automático da engine. Assim que o lead cai no Webhook, o broker recebe a notificação em segundos.

---
> [!TIP]
> Para garantir que o fluxo BR funcione, certifique-se de que o **GRUPOZAP_WEBHOOK_SECRET** está configurado no seu ficheiro `.env` para proteção dos dados.
