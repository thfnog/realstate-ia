'use client';

import { useEffect, useState } from 'react';
import { PreferencesCard } from '@/components/config/PreferencesCard';
import { 
  IoBusinessOutline, 
  IoChatbubbleEllipsesOutline, 
  IoLayersOutline, 
  IoLinkOutline, 
  IoShieldOutline, 
  IoChevronForwardOutline,
  IoMailOutline,
  IoGlobeOutline,
  IoTimeOutline,
  IoCalendarOutline,
  IoFlaskOutline
} from 'react-icons/io5';

interface ChannelConfig {
  form: boolean;
  email: boolean;
  webhook: boolean;
  whatsapp: boolean;
}

type TabType = 'agencia' | 'atendimento' | 'canais' | 'integracoes' | 'avancado';

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState<TabType>('agencia');
  const [user, setUser] = useState<{ app_role: string; corretor_id: string | null } | null>(null);
  const [countryMode, setCountryMode] = useState<'PT' | 'BR'>('PT');
  const [imobId, setImobId] = useState<string>('');
  const [nome, setNome] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const [emailTestResult, setEmailTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  
  const [horarioInicio, setHorarioInicio] = useState('09:00');
  const [horarioFim, setHorarioFim] = useState('18:00');
  
  const [briefingAtivo, setBriefingAtivo] = useState(false);
  const [briefingHora, setBriefingHora] = useState('08:00');

  const [saving, setSaving] = useState(false);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  
  const [widesysUrl, setWidesysUrl] = useState('');
  const [widesysUser, setWidesysUser] = useState('');
  const [widesysPass, setWidesysPass] = useState('');
  const [widesysActive, setWidesysActive] = useState(false);
  const [widesysLastSync, setWidesysLastSync] = useState('');
  const [savingWidesys, setSavingWidesys] = useState(false);
  const [syncingWidesys, setSyncingWidesys] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data));

    fetch('/api/imobiliaria')
      .then(res => res.json())
      .then(data => {
        if (data.id) {
          setCountryMode(data.config_pais);
          setImobId(data.id);
          setNome(data.nome_fantasia);
          setActiveModules(data.active_modules || []);
          setFiscalId(data.identificador_fiscal || '-');
          setRegId(data.numero_registro || '-');
          
          if (data.horario_inicio) setHorarioInicio(data.horario_inicio);
          if (data.horario_fim) setHorarioFim(data.horario_fim);
          
          setBriefingAtivo(data.briefing_diario_ativo || false);
          if (data.briefing_diario_hora) setBriefingHora(data.briefing_diario_hora.slice(0, 5));
          
          fetch(`/api/admin/integrations?imobiliaria_id=${data.id}`)
            .then(res => res.json())
            .then(intData => {
              if (intData && intData.config) {
                setWidesysUrl(intData.config.url || '');
                setWidesysUser(intData.config.username || '');
                setWidesysPass(intData.config.password || '');
                setWidesysActive(intData.active || false);
                if (intData.last_sync) setWidesysLastSync(new Date(intData.last_sync).toLocaleString('pt-BR'));
              }
            });
        }
        setLoading(false);
      });
  }, []);
  
  const [fiscalId, setFiscalId] = useState('');
  const [regId, setRegId] = useState('');

  const isPT = countryMode === 'PT';

  const channels: ChannelConfig = isPT
    ? { form: true, email: true, webhook: false, whatsapp: false }
    : { form: true, email: false, webhook: true, whatsapp: true };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/ingest/grupozap?imob_id=${imobId}`
    : `/api/ingest/grupozap?imob_id=${imobId}`;

  async function testEmailConnection() {
    setTesting(true);
    setEmailTestResult(null);
    try {
      const res = await fetch('/api/ingest/email?test=true', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setEmailTestResult(`✅ Sucesso! ${data.processed} lead(s) encontrado(s) no teste.`);
      } else {
        setEmailTestResult(`❌ Erro: ${data.error || 'Falha na conexão'}`);
      }
    } catch {
      setEmailTestResult('❌ Erro de conexão com o servidor');
    } finally {
      setTesting(false);
    }
  }

  const menuItems = [
    { id: 'agencia', label: 'Agência', icon: IoBusinessOutline, desc: 'Identidade e perfil' },
    { id: 'atendimento', label: 'Atendimento', icon: IoTimeOutline, desc: 'Horários e Automação' },
    { id: 'canais', label: 'Canais', icon: IoLayersOutline, desc: 'Entrada de leads' },
    { id: 'integracoes', label: 'Integrações', icon: IoLinkOutline, desc: 'Widesys e Diagnóstico' },
    { id: 'avancado', label: 'Avançado', icon: IoShieldOutline, desc: 'Sistema e Segurança' },
  ];

  if (loading) return <div className="p-12 text-center text-slate-500 font-bold animate-pulse">A carregar configurações...</div>;

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-20">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configurações</h1>
        <p className="text-slate-500 font-medium mt-1">Gerencie o comportamento global da sua imobiliária</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* SIDEBAR NAVIGATION */}
        <div className="lg:col-span-3 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`w-full flex items-center gap-4 p-5 rounded-[2rem] transition-all text-left group ${
                activeTab === item.id 
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' 
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-transparent hover:border-slate-100'
              }`}
            >
              <div className={`p-3 rounded-2xl transition-all ${
                activeTab === item.id ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-400 group-hover:text-slate-900'
              }`}>
                <item.icon size={20} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-widest">{item.label}</p>
                <p className={`text-[10px] font-medium transition-all ${
                  activeTab === item.id ? 'text-white/60' : 'text-slate-400'
                }`}>{item.desc}</p>
              </div>
              <IoChevronForwardOutline size={14} className={`transition-all ${
                activeTab === item.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
              }`} />
            </button>
          ))}
        </div>

        {/* CONTENT AREA */}
        <div className="lg:col-span-9 space-y-8 animate-fade-in-up">
          
          {/* 🏢 AGENCIA TAB */}
          {activeTab === 'agencia' && (
            <div className="space-y-8">
               {user?.corretor_id && <PreferencesCard />}

               <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/40">
                  <div className="bg-slate-50 border-b border-slate-100 px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-3xl shadow-sm">🏢</div>
                      <div>
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Perfil da Agência</h2>
                        <p className="text-xs text-slate-400 font-bold">{nome} • ID: {imobId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-100 shadow-sm">
                       <span className="text-xl">{isPT ? '🇵🇹' : '🇧🇷'}</span>
                       <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{isPT ? 'PORTUGAL' : 'BRASIL'}</span>
                    </div>
                  </div>
                  
                  <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{isPT ? 'NIF / NIPC' : 'CNPJ'}</span>
                      <div className="text-sm font-mono font-bold text-slate-700 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100">{fiscalId}</div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{isPT ? 'Licença AMI' : 'CRECI PJ'}</span>
                      <div className="text-sm font-bold text-slate-700 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100">{regId}</div>
                    </div>
                    <div className="md:col-span-2 p-6 rounded-3xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-4">
                       <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">ℹ️</div>
                       <p className="text-xs text-indigo-700 font-bold leading-relaxed">
                         As configurações regionais (Moeda e Terminologia) são fixadas no registro da agência e não podem ser alteradas para garantir a integridade dos históricos de leads e vendas.
                       </p>
                    </div>
                  </div>
               </div>

               <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-xl shadow-slate-200/40">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6">Dicionário Ativo Global</h2>
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-center text-4xl shadow-inner">
                      {isPT ? '🇵🇹' : '🇧🇷'}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">{isPT ? 'Portugal' : 'Brasil'}</h3>
                      <div className="flex items-center gap-4 mt-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <span className="bg-slate-50 px-3 py-1 rounded-lg">Moeda: <strong className="text-slate-900">{isPT ? 'EUR (€)' : 'BRL (R$)'}</strong></span>
                        <span className="bg-slate-50 px-3 py-1 rounded-lg">{isPT ? 'Tipologia: T0–T5+' : 'Quartos: 1–4+'}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold italic mt-3">
                        Reflete de forma dinâmica no Motor em todo o Hub.
                      </p>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {/* 🤖 ATENDIMENTO TAB */}
          {activeTab === 'atendimento' && (
            <div className="space-y-8">
               {activeModules.includes('bot') && (
                 <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-xl shadow-slate-200/40">
                   <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
                          <IoChatbubbleEllipsesOutline size={28} />
                        </div>
                        <div>
                           <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Inteligência de Agendamento</h2>
                           <p className="text-sm text-slate-500 font-medium">Horários que o bot pode sugerir aos clientes</p>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          setSaving(true);
                          try {
                            const res = await fetch('/api/imobiliaria', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ horario_inicio: horarioInicio, horario_fim: horarioFim })
                            });
                            if (res.ok) alert('✅ Horários salvos com sucesso!');
                            else alert('❌ Falha ao salvar horários');
                          } catch {
                            alert('❌ Erro de conexão');
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving}
                        className="px-8 py-4 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                      >
                        {saving ? 'Salvando...' : 'Salvar Preferências'}
                      </button>
                   </div>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="space-y-3">
                         <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            <IoTimeOutline size={14} className="text-indigo-500" /> Início Expediente
                         </label>
                         <input 
                           type="time" 
                           value={horarioInicio}
                           onChange={(e) => setHorarioInicio(e.target.value)}
                           className="w-full px-8 py-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-slate-700 transition-all"
                         />
                      </div>
                      <div className="space-y-3">
                         <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            <IoTimeOutline size={14} className="text-indigo-500" /> Fim Expediente
                         </label>
                         <input 
                           type="time" 
                           value={horarioFim}
                           onChange={(e) => setHorarioFim(e.target.value)}
                           className="w-full px-8 py-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-slate-700 transition-all"
                         />
                      </div>
                   </div>
                   
                   <div className="mt-10 p-6 rounded-[2rem] bg-amber-50 border border-amber-100">
                      <p className="text-xs text-amber-800 font-medium leading-relaxed">
                         <strong>Nota:</strong> O bot usará estas janelas para procurar espaços vazios na agenda dos corretores e sugerir opções aos leads. Fora deste horário, o bot informará que o atendimento humano retornará no próximo período.
                      </p>
                   </div>
                 </div>
               )}

               <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-xl shadow-slate-200/40">
                  <div className="flex items-center justify-between mb-10">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-100">
                          <IoCalendarOutline size={28} />
                        </div>
                        <div>
                           <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Briefing Diário (WhatsApp)</h2>
                           <p className="text-sm text-slate-500 font-medium">Resumo matinal para cada corretor</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-6">
                       <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativar</span>
                          <button 
                            onClick={() => setBriefingAtivo(!briefingAtivo)}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${briefingAtivo ? 'bg-emerald-500 shadow-lg shadow-emerald-100' : 'bg-slate-200'}`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${briefingAtivo ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                       </div>
                       <button 
                         onClick={async () => {
                           setSaving(true);
                           try {
                             const res = await fetch('/api/imobiliaria', {
                               method: 'PATCH',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ 
                                 briefing_diario_ativo: briefingAtivo, 
                                 briefing_diario_hora: briefingHora 
                               })
                             });
                             if (res.ok) alert('✅ Briefing salvo!');
                             else alert('❌ Falha ao salvar');
                           } catch {
                             alert('❌ Erro de conexão');
                           } finally {
                             setSaving(false);
                           }
                         }}
                         disabled={saving}
                         className="px-8 py-4 rounded-2xl bg-slate-900 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                       >
                         {saving ? '...' : 'Salvar'}
                       </button>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horário de Envio</label>
                        <input 
                          type="time" 
                          value={briefingHora}
                          onChange={(e) => setBriefingHora(e.target.value)}
                          className="w-full px-8 py-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 focus:ring-4 focus:ring-emerald-50 outline-none font-bold text-slate-700"
                        />
                     </div>
                     <div className="p-8 rounded-[2.5rem] bg-indigo-50/50 border border-indigo-100 flex flex-col justify-center">
                        <ul className="text-xs text-indigo-700 font-bold space-y-2">
                          <li className="flex items-center gap-2">🚀 Novos Leads Pendentes</li>
                          <li className="flex items-center gap-2">📅 Visitas & Reuniões Hoje</li>
                          <li className="flex items-center gap-2">📈 Status da Carteira</li>
                        </ul>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* 📬 CANAIS TAB */}
          {activeTab === 'canais' && (
            <div className="space-y-8">
               <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-xl shadow-slate-200/40">
                 <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-10">Canais de Entrada Ativos</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className={`rounded-[2.5rem] border-2 p-8 transition-all ${channels.form ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-100 bg-slate-50/50 opacity-50'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-50 flex items-center justify-center text-2xl shadow-sm">📝</div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${channels.form ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>Ativo</span>
                      </div>
                      <h3 className="font-black text-slate-900 uppercase tracking-tight mb-1">Formulário Site</h3>
                      <p className="text-xs text-slate-500 font-medium">Leads vindos do seu portal público</p>
                    </div>

                    {isPT && (
                      <div className={`rounded-[2.5rem] border-2 p-8 transition-all ${channels.email ? 'border-purple-100 bg-purple-50/20' : 'border-slate-100 bg-slate-50/50 opacity-50'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-purple-50 flex items-center justify-center text-2xl shadow-sm">📧</div>
                          <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-purple-100 text-purple-700">Ativo</span>
                        </div>
                        <h3 className="font-black text-slate-900 uppercase tracking-tight mb-1">E-mail eGO</h3>
                        <p className="text-xs text-slate-500 font-medium">Portais via IMAP (Idealista, etc.)</p>
                      </div>
                    )}

                    {!isPT && (
                      <div className={`rounded-[2.5rem] border-2 p-8 transition-all ${channels.webhook ? 'border-orange-100 bg-orange-50/20' : 'border-slate-100 bg-slate-50/50 opacity-50'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-orange-50 flex items-center justify-center text-2xl shadow-sm">🌐</div>
                          <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-orange-100 text-orange-700">Ativo</span>
                        </div>
                        <h3 className="font-black text-slate-900 uppercase tracking-tight mb-1">Webhook OLX</h3>
                        <p className="text-xs text-slate-500 font-medium">ZAP, OLX e VivaReal via Canal Pro</p>
                      </div>
                    )}

                    {!isPT && activeModules.includes('bot') && (
                      <div className={`rounded-[2.5rem] border-2 p-8 transition-all ${channels.whatsapp ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-100 bg-slate-50/50 opacity-50'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-50 flex items-center justify-center text-2xl shadow-sm">💬</div>
                          <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">Ativo</span>
                        </div>
                        <h3 className="font-black text-slate-900 uppercase tracking-tight mb-1">WhatsApp Biz</h3>
                        <p className="text-xs text-slate-500 font-medium">Recepção direta via API Evolution</p>
                      </div>
                    )}
                 </div>
               </div>

               {!isPT && (
                 <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl shadow-slate-300">
                    <div className="flex items-center gap-4 mb-8">
                       <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl">🌐</div>
                       <div>
                          <h2 className="text-lg font-black uppercase tracking-tight">Webhook URL</h2>
                          <p className="text-xs text-white/50 font-medium">Cole este endereço no painel do Canal Pro</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                       <code className="flex-1 text-emerald-400 font-mono text-xs overflow-x-auto">POST {webhookUrl}</code>
                       <button 
                         onClick={() => { navigator.clipboard.writeText(webhookUrl); alert('Copiado!'); }}
                         className="p-3 bg-white text-slate-900 rounded-xl hover:bg-emerald-400 transition-all font-black text-xs"
                       >📋 COPIAR</button>
                    </div>
                    <div className="mt-8 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[10px] font-medium leading-relaxed italic">
                       Header obrigatório: <span className="bg-white/10 px-1 rounded text-white">x-webhook-secret</span> configurado nas variáveis de ambiente do sistema.
                    </div>
                 </div>
               )}
            </div>
          )}

          {/* 🔄 INTEGRAÇÕES TAB */}
          {activeTab === 'integracoes' && (
            <div className="space-y-8">
               <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-xl shadow-slate-200/40">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Sincronização Imóveis (Widesys)</h2>
                      <p className="text-sm text-slate-500 font-medium">Importação automática do seu site Joomla/Widesys</p>
                    </div>
                    <button 
                      onClick={() => setWidesysActive(!widesysActive)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${widesysActive ? 'bg-emerald-500 shadow-lg shadow-emerald-100' : 'bg-slate-200'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${widesysActive ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="md:col-span-2 space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">API Endpoint URL</label>
                       <input type="text" value={widesysUrl} onChange={e => setWidesysUrl(e.target.value)} className="w-full px-8 py-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-slate-700" placeholder="https://..." />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário</label>
                       <input type="text" value={widesysUser} onChange={e => setWidesysUser(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-700" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha API</label>
                       <input type="password" value={widesysPass} onChange={e => setWidesysPass(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-700" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-8 border-t border-slate-50">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {widesysLastSync ? `Última Sync: ${widesysLastSync}` : 'Sem histórico'}
                     </span>
                     <div className="flex gap-4">
                        <button 
                          onClick={async () => {
                            setSavingWidesys(true);
                            try {
                              const res = await fetch('/api/admin/integrations', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  imobiliaria_id: imobId,
                                  active: widesysActive,
                                  config: { url: widesysUrl, username: widesysUser, password: widesysPass }
                                })
                              });
                              if (res.ok) alert('✅ Salvo!');
                            } catch { alert('❌ Erro'); } finally { setSavingWidesys(false); }
                          }}
                          disabled={savingWidesys}
                          className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >Salvar</button>
                        <button 
                          onClick={async () => {
                            setSyncingWidesys(true);
                            try {
                               const res = await fetch('/api/master/integrations/sync', {
                                 method: 'POST',
                                 headers: { 'Content-Type': 'application/json' },
                                 body: JSON.stringify({ imobiliaria_id: imobId, provider: 'widesys' })
                               });
                               const data = await res.json();
                               if (res.ok) {
                                  alert('✅ Sincronizado!');
                                  setWidesysLastSync(new Date().toLocaleString('pt-BR'));
                               }
                            } catch { alert('❌ Falha'); } finally { setSyncingWidesys(false); }
                          }}
                          disabled={syncingWidesys || !widesysActive}
                          className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                        >Sincronizar Agora</button>
                     </div>
                  </div>
               </div>

               <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-xl shadow-slate-200/40">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-8">Diagnóstico de Conectividade</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100 space-y-6">
                        <div className="flex items-center gap-3">
                           <span className="text-2xl">💬</span>
                           <p className="text-xs font-black text-indigo-900 uppercase tracking-widest">WhatsApp Engine</p>
                        </div>
                        <input type="text" placeholder="Número 55..." id="waTest" className="w-full px-6 py-4 rounded-2xl bg-white border border-indigo-100 outline-none text-sm font-bold" />
                        <button 
                          onClick={async () => {
                            const phone = (document.getElementById('waTest') as HTMLInputElement).value;
                            if (!phone) return alert('Número?');
                            const res = await fetch('/api/leads/debug-wa', { method: 'POST', body: JSON.stringify({ phone }), headers: {'Content-Type': 'application/json'}});
                            const data = await res.json();
                            alert(JSON.stringify(data, null, 2));
                          }}
                          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
                        >Testar Envio</button>
                     </div>

                     <div className="bg-purple-50/50 p-8 rounded-[2.5rem] border border-purple-100 space-y-6">
                        <div className="flex items-center gap-3">
                           <span className="text-2xl">📧</span>
                           <p className="text-xs font-black text-purple-900 uppercase tracking-widest">IMAP eGO (E-mail)</p>
                        </div>
                        <div className="text-[10px] text-purple-700/60 font-bold leading-relaxed">
                           Verifica a conexão com o servidor de e-mail e processa pendentes.
                        </div>
                        <button 
                          onClick={testEmailConnection}
                          disabled={testing}
                          className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg disabled:opacity-50"
                        >{testing ? 'Testando...' : 'Testar IMAP'}</button>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* 🛡️ AVANÇADO TAB */}
          {activeTab === 'avancado' && (
            <div className="space-y-8">
               <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-xl shadow-slate-200/40">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-8">📡 Endpoints de Integração</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                       <thead>
                          <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                             <th className="pb-4">Método</th>
                             <th className="pb-4">Endpoint</th>
                             <th className="pb-4">Função</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          <tr>
                             <td className="py-4"><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-black">POST</span></td>
                             <td className="py-4 font-mono font-bold text-slate-600">/api/leads?imob_id={imobId}</td>
                             <td className="py-4 text-slate-500 font-bold">Criação manual/externa de leads</td>
                          </tr>
                          <tr>
                             <td className="py-4"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-black">GET</span></td>
                             <td className="py-4 font-mono font-bold text-slate-600">/api/stats</td>
                             <td className="py-4 text-slate-500 font-bold">Relatórios e Métricas</td>
                          </tr>
                       </tbody>
                    </table>
                  </div>
               </div>

               <div className="bg-rose-50 rounded-[3rem] border border-rose-100 p-10 shadow-xl shadow-rose-200/20">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-3xl">⚠️</div>
                     <div>
                        <h2 className="text-lg font-black text-rose-900 uppercase tracking-tight">Zona de Perigo</h2>
                        <p className="text-sm text-rose-700 font-medium italic">Estas ações são permanentes e irreversíveis.</p>
                     </div>
                  </div>
                  <div className="p-8 rounded-[2.5rem] bg-white border border-rose-100 flex flex-col md:flex-row items-center justify-between gap-8">
                     <div className="flex-1">
                        <h3 className="font-black text-rose-900 uppercase tracking-tight mb-2">Limpar Todos os Leads</h3>
                        <p className="text-xs text-slate-500 font-medium">Exclui todos os leads, eventos e históricos desta agência.</p>
                     </div>
                     <button 
                        onClick={async () => {
                           if (window.confirm("VOCÊ TEM CERTEZA?")) {
                              const code = window.prompt("Digite EXCLUIR:");
                              if (code === 'EXCLUIR') {
                                 await fetch('/api/admin/purge', { method: 'POST' });
                                 window.location.reload();
                              }
                           }
                        }}
                        className="px-10 py-5 rounded-[1.5rem] bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-rose-200 active:scale-95"
                     >Excluir Tudo</button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
