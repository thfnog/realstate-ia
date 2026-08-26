'use client';

import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  IoSend, IoLogoWhatsapp, IoSparkles, IoFlashOutline, 
  IoHardwareChipOutline, IoTimeOutline, IoCheckmarkDone,
  IoPersonCircleOutline, IoRefreshOutline, IoKeyOutline,
  IoShieldCheckmarkOutline, IoCalculatorOutline, IoHomeOutline,
  IoMicOutline
} from 'react-icons/io5';

interface ChatMessage {
  id: string;
  sender: 'client' | 'bot';
  text: string;
  timestamp: string;
  tools?: string[];
  jitEntities?: string[];
  latencyMs?: number;
  cards?: any[];
  isVoice?: boolean;
}

const PRESET_PERSONAS = [
  {
    id: 'fernanda',
    nome: 'Fernanda Lima',
    telefone: '11999887766',
    finalidade: 'comprar',
    tipo_interesse: 'apartamento',
    orcamento: 800000,
    bairro: 'Pinheiros',
    avatar: '👩',
    desc: 'Compradora buscando 2 quartos em Pinheiros até R$ 800k'
  },
  {
    id: 'lucas',
    nome: 'Lucas Mendes',
    telefone: '11988776655',
    finalidade: 'aluguel',
    tipo_interesse: 'apartamento',
    orcamento: 4500,
    bairro: 'Moema',
    avatar: '👨',
    desc: 'Locatário com 2 pets buscando locação com caução/seguro fiança'
  },
  {
    id: 'marcelo',
    nome: 'Marcelo (Corretor Parceiro)',
    telefone: '11977665544',
    finalidade: 'parceria',
    tipo_interesse: 'parceria',
    orcamento: 0,
    bairro: 'Jardins',
    avatar: '🤝',
    desc: 'Corretor com CRECI propondo parceria 50/50'
  }
];

const SUGGESTED_PROMPTS = [
  { label: '🔍 Buscar opções', text: 'Olá! Estou procurando um apartamento de 2 quartos em Pinheiros até 800 mil. O que tem disponível?' },
  { label: '🐶 Pet & Condomínio', text: 'Gostei do AP102. Esse condomínio aceita cachorro? E qual o valor do condomínio?' },
  { label: '💰 Financiamento', text: 'Quanto eu precisaria de entrada para comprar o AP102 de 750 mil e qual a parcela em 30 anos?' },
  { label: '📋 Garantias Locação', text: 'Como funciona para alugar? Vocês aceitam caução de 3 meses ou seguro fiança?' },
  { label: '📅 Agendar Visita', text: 'Perfeito, quero visitar o AP102 nesta sexta-feira às 15h. Podemos confirmar?' },
  { label: '⚠️ Visita Noturna (HITL)', text: 'Eu só tenho disponibilidade para visitar o AP102 no próximo domingo às 20h. É possível?' },
  { label: '🤝 Proposta Parceria', text: 'Olá, sou o corretor Marcelo da Imob Prime, CRECI 123456. Tenho um cliente pro AP102, vamos fazer 50/50?' }
];

export default function SimulatorPage() {
  const [selectedPersona, setSelectedPersona] = useState(PRESET_PERSONAS[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [brokerName, setBrokerName] = useState('Rodrigo Ramos');
  
  // Telemetry & Inspector state
  const [lastTools, setLastTools] = useState<string[]>([]);
  const [lastJit, setLastJit] = useState<string[]>([]);
  const [lastJitSnippet, setLastJitSnippet] = useState<string>('');
  const [lastLatency, setLastLatency] = useState<number>(0);
  const [lastTokens, setLastTokens] = useState<number>(0);
  const [memoryHook, setMemoryHook] = useState<string>('Nenhuma memória gerada ainda');
  const [hitlCommandInput, setHitlCommandInput] = useState('');
  const [hitlStatusLog, setHitlStatusLog] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string, isAudio = false) => {
    const query = textToSend || inputText;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'client',
      text: isAudio ? `🎤 [Áudio]: "${query}"` : query,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isVoice: isAudio
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setLoading(true);

    try {
      const historyForApi = newHistory.map(m => ({
        direction: m.sender === 'client' ? 'inbound' : 'outbound',
        message_text: m.text
      }));

      const res = await fetch('/api/admin/simulador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          leadData: {
            nome: selectedPersona.nome,
            telefone: selectedPersona.telefone,
            finalidade: selectedPersona.finalidade,
            tipo_interesse: selectedPersona.tipo_interesse,
            orcamento: selectedPersona.orcamento,
            bairros_interesse: [selectedPersona.bairro]
          },
          history: historyForApi,
          brokerName
        })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao processar');
      }

      // Extract cards if search_properties returned them
      let cardsFound: any[] = [];
      if (data.actions) {
        for (const act of data.actions) {
          if (act.type === 'send_property_cards' && act.data?.cards) {
            cardsFound = act.data.cards;
          }
        }
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: data.reply || 'Sem resposta gerada',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        tools: data.toolsExecuted,
        jitEntities: data.jitEntities,
        latencyMs: data.latencyMs,
        cards: cardsFound
      };

      setMessages(prev => [...prev, botMsg]);
      setLastTools(data.toolsExecuted || []);
      setLastJit(data.jitEntities || []);
      setLastJitSnippet(data.jitSnippet || '');
      setLastLatency(data.latencyMs || 0);
      setLastTokens(data.tokensEstimated || 0);
      if (data.memorySnapshot) setMemoryHook(data.memorySnapshot);

    } catch (err: any) {
      toast.error(err.message || 'Falha na comunicação');
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: `⚠️ Erro: ${err.message}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleHitlSubmit = async () => {
    if (!hitlCommandInput.trim()) return;
    try {
      const res = await fetch('/api/admin/simulador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hitl_command',
          hitlCommand: hitlCommandInput,
          brokerPhone: '11988887777'
        })
      });
      const data = await res.json();
      if (data.handled) {
        toast.success(`Comando HITL processado: ${data.actionTaken}`);
        setHitlStatusLog(`✅ Comando "${hitlCommandInput}" executado com sucesso: ${data.message || ''}`);
        setHitlCommandInput('');
      } else {
        toast.error('Comando não reconhecido (use ex: "Aprovar 1234")');
      }
    } catch (e: any) {
      toast.error('Erro ao enviar comando HITL');
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setLastTools([]);
    setLastJit([]);
    setLastJitSnippet('');
    setLastLatency(0);
    setLastTokens(0);
    setMemoryHook('Nenhuma memória gerada ainda');
    toast.info('Chat reiniciado.');
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-2xl shadow-md">
              <IoLogoWhatsapp />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                Simulador de Atendimento WhatsApp
                <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-300">
                  Gemini 2.5 Flash + ReAct
                </span>
              </h1>
              <p className="text-sm text-slate-500">
                Teste e valide em tempo real o raciocínio da IA, execução de ferramentas, Knowledge Graph JIT e debouncer.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetChat}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            <IoRefreshOutline className="text-lg" />
            Limpar Conversa
          </button>
        </div>
      </div>

      {/* Persona Selection Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PRESET_PERSONAS.map(p => (
          <button
            key={p.id}
            onClick={() => {
              setSelectedPersona(p);
              handleResetChat();
            }}
            className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
              selectedPersona.id === p.id 
                ? 'bg-emerald-50/50 border-emerald-400 shadow-sm ring-2 ring-emerald-400/20' 
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-3xl">{p.avatar}</span>
            <div>
              <p className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                {p.nome}
                {selectedPersona.id === p.id && (
                  <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded">ATIVO</span>
                )}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Main Grid: WhatsApp Phone + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* WhatsApp Mobile Frame (Cols: 7) */}
        <div className="lg:col-span-7 bg-[#EFEAE2] rounded-3xl shadow-xl border-4 border-slate-800 overflow-hidden flex flex-col h-[740px]">
          
          {/* WhatsApp Header */}
          <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold border border-emerald-400">
                {brokerName.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight flex items-center gap-1.5">
                  {brokerName}
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </p>
                <p className="text-xs text-emerald-100">online • Corretor IA ImobIA</p>
              </div>
            </div>
            <div className="text-xs bg-emerald-800/80 px-2.5 py-1 rounded-full text-emerald-200">
              WhatsApp Preview
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 && (
              <div className="text-center my-12 bg-white/80 backdrop-blur p-6 rounded-2xl max-w-sm mx-auto shadow-sm border border-slate-200/60">
                <span className="text-4xl">👋</span>
                <h3 className="font-bold text-slate-800 mt-2">Inicie o Atendimento</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Clique em um dos atalhos abaixo ou digite uma mensagem como cliente para testar a IA.
                </p>
              </div>
            )}

            {messages.map(m => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'client' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm relative ${
                    m.sender === 'client'
                      ? 'bg-[#DCF8C6] text-slate-900 rounded-tr-none'
                      : 'bg-white text-slate-900 rounded-tl-none border border-slate-100'
                  }`}
                >
                  {/* Message Text */}
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>

                  {/* Metadata Chips if Bot */}
                  {m.sender === 'bot' && m.tools && m.tools.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                      {m.tools.map((t, idx) => (
                        <span key={idx} className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                          <IoHardwareChipOutline /> {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="text-[10px] text-slate-400 text-right mt-1 flex items-center justify-end gap-1">
                    {m.timestamp}
                    {m.sender === 'client' && <IoCheckmarkDone className="text-blue-500 text-xs" />}
                  </div>
                </div>

                {/* Render Property Cards if any */}
                {m.cards && m.cards.length > 0 && (
                  <div className="mt-2 w-full max-w-[85%] space-y-2">
                    {m.cards.map((c: any, idx: number) => (
                      <div key={idx} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden text-xs">
                        <div className="p-3">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-slate-900">{c.titulo}</span>
                            <span className="font-bold text-emerald-700">R$ {c.valor?.toLocaleString('pt-BR')}</span>
                          </div>
                          <p className="text-slate-500 mt-0.5">Ref: {c.referencia} • {c.freguesia} • {c.quartos} qtos • {c.vagas_garagem} vagas</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl rounded-tl-none text-xs text-slate-500 w-fit shadow-sm border border-slate-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>{brokerName} está digitando...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel */}
          <div className="bg-slate-100/90 border-t border-slate-200 p-2 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
            {SUGGESTED_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p.text)}
                disabled={loading}
                className="whitespace-nowrap text-xs bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 font-medium px-3 py-1.5 rounded-full border border-slate-200 shadow-2xs transition-all shrink-0"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="bg-white p-3 border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Digite uma mensagem como cliente..."
              disabled={loading}
              className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || loading}
              className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md disabled:opacity-50 transition-all shrink-0"
            >
              <IoSend className="text-sm" />
            </button>
          </div>
        </div>

        {/* AI Inspector & Telemetry Panel (Cols: 5) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Card: Engine Status & Telemetry */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <IoFlashOutline className="text-amber-500 text-lg" />
              Telemetria da IA em Tempo Real
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <p className="text-xs text-slate-500">Modelo Ativo</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">Gemini 2.5 Flash</p>
                <span className="text-[10px] text-emerald-600 font-semibold">Flagship Multi-Modal</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <p className="text-xs text-slate-500">Latência do Turno</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{lastLatency ? `${lastLatency}ms` : '-'}</p>
                <span className="text-[10px] text-blue-600 font-semibold">TTFT Ultra-Rápido</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <p className="text-xs text-slate-500">Tokens Estimados</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{lastTokens ? `~${lastTokens}` : '-'}</p>
                <span className="text-[10px] text-emerald-600 font-semibold">Economia de 83% (JIT)</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <p className="text-xs text-slate-500">Debounce Window</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">3.5 segundos</p>
                <span className="text-[10px] text-purple-600 font-semibold">Anti-Atropelo</span>
              </div>
            </div>

            {/* Tools Executed */}
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <IoHardwareChipOutline className="text-indigo-500" />
                Ferramentas Acionadas (ReAct):
              </p>
              {lastTools.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nenhuma ferramenta acionada neste turno.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {lastTools.map((t, idx) => (
                    <span key={idx} className="text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-300 px-2.5 py-1 rounded-lg">
                      ⚡ {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* JIT Knowledge Graph Entities */}
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <IoKeyOutline className="text-amber-600" />
                Nós do Knowledge Graph Injetados (JIT):
              </p>
              {lastJit.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nenhum nó específico injetado.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {lastJit.map((j, idx) => (
                    <span key={idx} className="text-xs font-medium bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-md">
                      📌 {j}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card: Continuous Lead Memory */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <IoPersonCircleOutline className="text-blue-500 text-lg" />
              Memória Contínua da Jornada do Lead
            </h3>
            <div className="bg-blue-50/60 border border-blue-200 p-3 rounded-xl text-xs text-blue-900 leading-relaxed font-mono">
              {memoryHook}
            </div>
            <p className="text-[11px] text-slate-500">
              Sintetizado automaticamente via Llama 3.1 8B para reter preferências ditas no início da conversa.
            </p>
          </div>

          {/* Card: HITL Broker Command Tester */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <IoShieldCheckmarkOutline className="text-purple-500 text-lg" />
              Teste de Governança HITL (Corretor)
            </h3>
            <p className="text-xs text-slate-500">
              Simule a resposta do corretor para aprovar ou negar visitas fora de horário (ex: <code className="bg-slate-100 px-1 py-0.5 rounded">Aprovar 1234</code> ou <code className="bg-slate-100 px-1 py-0.5 rounded">Negar 1234</code>):
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={hitlCommandInput}
                onChange={e => setHitlCommandInput(e.target.value)}
                placeholder="Ex: Aprovar 3252"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button
                onClick={handleHitlSubmit}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Enviar Comando
              </button>
            </div>
            {hitlStatusLog && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl font-medium">
                {hitlStatusLog}
              </p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
