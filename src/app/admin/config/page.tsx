'use client';

import { useEffect, useState } from 'react';
import { PreferencesCard } from '@/components/config/PreferencesCard';

interface ChannelConfig {
  form: boolean;
  email: boolean;
  webhook: boolean;
  whatsapp: boolean;
}

export default function ConfigPage() {
  const [user, setUser] = useState<{ role: string; corretor_id: string | null } | null>(null);
  const [countryMode, setCountryMode] = useState<'PT' | 'BR'>('PT');
  const [imobId, setImobId] = useState<string>('');
  const [nome, setNome] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // Restoring email variables that I accidentally removed
  const [emailTestResult, setEmailTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  
  const [horarioInicio, setHorarioInicio] = useState('09:00');
  const [horarioFim, setHorarioFim] = useState('18:00');
  const [saving, setSaving] = useState(false);

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
          // NEW READ ONLY FIELDS
          setFiscalId(data.identificador_fiscal || '-');
          setRegId(data.numero_registro || '-');
          
          // Set business hours from DB if exist
          if (data.horario_inicio) setHorarioInicio(data.horario_inicio);
          if (data.horario_fim) setHorarioFim(data.horario_fim);
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

  if (loading) return <div className="p-8 text-center text-slate-500">A carregar configurações...</div>;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Configurações</h1>
        <p className="text-text-secondary text-sm mt-1">Configuração do sistema e canais de entrada</p>
      </div>

      {user?.corretor_id && (
        <div className="mb-8">
           <PreferencesCard />
        </div>
      )}

      {/* Tenant Identity Panel */}
      <div className="bg-white rounded-xl border border-border-light overflow-hidden mb-6">
        <div className="bg-slate-50 border-b border-border-light px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏢</span>
            <div>
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Perfil da Agência</h2>
              <p className="text-xs text-text-secondary">{nome} • ID: {imobId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200">
             <span className="text-lg">{isPT ? '🇵🇹' : '🇧🇷'}</span>
             <span className="text-xs font-bold text-slate-700">{isPT ? 'PORTUGAL' : 'BRASIL'}</span>
          </div>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{isPT ? 'NIF / NIPC' : 'CNPJ'}</span>
            <span className="text-sm font-mono font-semibold text-text-primary bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">{fiscalId}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{isPT ? 'Licença AMI' : 'CRECI PJ'}</span>
            <span className="text-sm font-semibold text-text-primary bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">{regId}</span>
          </div>
          <div className="md:col-span-2 p-3 rounded-lg bg-indigo-50/50 border border-indigo-100">
             <p className="text-[11px] text-indigo-700 font-medium">
               ℹ️ As configurações regionais (Moeda e Terminologia) são fixadas no registro da agência e não podem ser alteradas para garantir a integridade dos históricos de leads e vendas.
             </p>
          </div>
        </div>
      </div>

      {/* Country Info View */}
      <div className="bg-white rounded-xl border border-border-light p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Dicionário Ativo Global</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-center text-3xl">
            {isPT ? '🇵🇹' : '🇧🇷'}
          </div>
          <div>
            <h3 className="text-xl font-bold text-text-primary">{isPT ? 'Portugal' : 'Brasil'}</h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
              <span>Moeda: <strong>{isPT ? 'EUR (€)' : 'BRL (R$)'}</strong></span>
              <span>•</span>
              <span>{isPT ? 'Tipologia: T0–T5+' : 'Quartos: 1–4+'}</span>
            </div>
            <p className="text-xs text-text-muted mt-1.5">
              Reflete de forma dinâmica no Motor em todo o Hub.
            </p>
          </div>
        </div>
      </div>

      {/* 🤖 AI & SERVICE HOURS CONFIG */}
      <div className="bg-white rounded-xl border border-border-light p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
           <div>
              <h2 className="text-lg font-semibold text-text-primary">🤖 Inteligência de Agendamento</h2>
              <p className="text-sm text-text-secondary mt-0.5">Defina os horários que o bot pode sugerir aos clientes</p>
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
             className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-50"
           >
             {saving ? 'Salvando...' : 'Salvar Preferências'}
           </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
           <div className="space-y-2">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest">Início do Expediente</label>
              <input 
                type="time" 
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-200 outline-none font-medium"
              />
           </div>
           <div className="space-y-2">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest">Fim do Expediente</label>
              <input 
                type="time" 
                value={horarioFim}
                onChange={(e) => setHorarioFim(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-200 outline-none font-medium"
              />
           </div>
        </div>
        
        <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-100">
           <p className="text-xs text-amber-800 leading-relaxed">
             <strong>Nota:</strong> O bot usará estas janelas para procurar espaços vazios na agenda dos corretores e sugerir opções aos leads. Fora deste horário, o bot informará que o atendimento humano retornará no próximo período.
           </p>
        </div>
      </div>

      {/* Channels */}
      <div className="bg-white rounded-xl border border-border-light p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Canais de entrada</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Form - Global */}
          <div className={`rounded-xl border-2 p-4 ${channels.form ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/50 opacity-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">📝</span>
                <h3 className="font-medium text-text-primary">Formulário</h3>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${channels.form ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                Ativo
              </span>
            </div>
            <p className="text-xs text-text-muted">Leads recebidos via formulário público do site</p>
          </div>

          {/* Email - PT Only */}
          {isPT && (
            <div className={`rounded-xl border-2 p-4 ${channels.email ? 'border-purple-200 bg-purple-50/50' : 'border-slate-200 bg-slate-50/50 opacity-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📧</span>
                  <h3 className="font-medium text-text-primary">E-mail eGO</h3>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${channels.email ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                  Ativo
                </span>
              </div>
              <p className="text-xs text-text-muted">Parser de notificações de portais via IMAP (Idealista, Imovirtual, etc.)</p>
            </div>
          )}

          {/* Webhook - BR Only */}
          {!isPT && (
            <div className={`rounded-xl border-2 p-4 ${channels.webhook ? 'border-orange-200 bg-orange-50/50' : 'border-slate-200 bg-slate-50/50 opacity-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌐</span>
                  <h3 className="font-medium text-text-primary">Webhook Grupo OLX</h3>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${channels.webhook ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                  Ativo
                </span>
              </div>
              <p className="text-xs text-text-muted">Recebe leads de ZAP Imóveis, OLX e VivaReal via Canal Pro</p>
            </div>
          )}

          {/* WhatsApp - BR Only (Currently) */}
          {!isPT && (
            <div className={`rounded-xl border-2 p-4 ${channels.whatsapp ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/50 opacity-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💬</span>
                  <h3 className="font-medium text-text-primary">WhatsApp</h3>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${channels.whatsapp ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  Ativo
                </span>
              </div>
              <p className="text-xs text-text-muted">Recepção de leads diretos pelo WhatsApp Business</p>
            </div>
          )}
        </div>
      </div>

      {/* Email Config (PT only) */}
      {isPT && (
        <div className="bg-white rounded-xl border border-border-light p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">📧 Configuração E-mail (IMAP)</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-muted">Host IMAP:</span>
                <span className="ml-2 text-text-primary font-medium">{process.env.EMAIL_IMAP_HOST || '(não configurado)'}</span>
              </div>
              <div>
                <span className="text-text-muted">Porta:</span>
                <span className="ml-2 text-text-primary font-medium">{process.env.EMAIL_IMAP_PORT || '993'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-text-muted">Utilizador:</span>
                <span className="ml-2 text-text-primary font-medium">{process.env.EMAIL_IMAP_USER || '(não configurado)'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border-light">
              <button
                onClick={testEmailConnection}
                disabled={testing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition-all disabled:opacity-50"
              >
                {testing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>📧 Testar conexão e-mail</>
                )}
              </button>

              {emailTestResult && (
                <p className={`mt-3 text-sm ${emailTestResult.startsWith('✅') ? 'text-emerald-600' : 'text-red-600'}`}>
                  {emailTestResult}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Diagnostic (Pragmatic Fix) */}
      {!isPT && (
         <div className="bg-indigo-50/50 rounded-xl border border-indigo-200 p-6 mb-6">
           <div className="flex items-center gap-3 mb-4">
             <span className="text-2xl text-indigo-600">🛠️</span>
             <div>
               <h2 className="text-lg font-bold text-indigo-900">Diagnóstico WhatsApp</h2>
               <p className="text-xs text-indigo-700">Teste o envio e veja a resposta bruta da API</p>
             </div>
           </div>

           <div className="flex flex-col sm:flex-row gap-4 mb-4">
             <input 
               type="text" 
               placeholder="Número (Ex: 55119...)"
               id="testPhone"
               className="flex-1 px-4 py-2 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-300 outline-none text-sm"
             />
             <button 
               onClick={async () => {
                 const phone = (document.getElementById('testPhone') as HTMLInputElement).value;
                 const logArea = document.getElementById('debugLog');
                 if (!phone) return alert('Digite um número');
                 if (logArea) logArea.innerText = '⏳ Enviando teste...';
                 
                 try {
                   const res = await fetch('/api/leads/debug-wa', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ phone })
                   });
                   const data = await res.json();
                   if (logArea) logArea.innerText = JSON.stringify(data, null, 2);
                 } catch (err: any) {
                   if (logArea) logArea.innerText = '❌ Erro na requisição: ' + err.message;
                 }
               }}
               className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all shadow-md active:scale-95"
             >
               🚀 Testar Agora
             </button>
           </div>

           <div className="bg-slate-900 rounded-lg p-4">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Log da Resposta:</span>
             <pre id="debugLog" className="text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap min-h-[40px]">
               Aguardando teste...
             </pre>
           </div>
         </div>
      )}

      {/* Slack Diagnostic */}
      {user?.app_role === 'admin' && (
         <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 mb-6">
           <div className="flex items-center gap-3 mb-4">
             <span className="text-2xl text-slate-600">💬</span>
             <div>
               <h2 className="text-lg font-bold text-slate-900">Teste de Alertas Slack</h2>
               <p className="text-xs text-slate-600">Envie um alerta de teste para o canal configurado via Webhook</p>
             </div>
           </div>

           <div className="flex flex-col sm:flex-row gap-4 mb-4">
             <input 
               type="text" 
               placeholder="Mensagem de teste..."
               id="slackMsg"
               className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-300 outline-none text-sm"
             />
             <button 
               onClick={async () => {
                 const message = (document.getElementById('slackMsg') as HTMLInputElement).value;
                 const logArea = document.getElementById('slackLog');
                 if (logArea) logArea.innerText = '⏳ Enviando para Slack...';
                 
                 try {
                   const res = await fetch('/api/admin/slack-test', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ message })
                   });
                   const data = await res.json();
                   if (logArea) logArea.innerText = JSON.stringify(data, null, 2);
                 } catch (err: any) {
                   if (logArea) logArea.innerText = '❌ Erro: ' + err.message;
                 }
               }}
               className="px-6 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold transition-all shadow-md active:scale-95 flex items-center gap-2"
             >
               <span>📤</span> Enviar Teste
             </button>
           </div>

           <div className="bg-slate-900 rounded-lg p-4">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Status do Envio:</span>
             <pre id="slackLog" className="text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap min-h-[40px]">
               Aguardando teste...
             </pre>
           </div>
         </div>
      )}

      {/* Webhook URL (BR only) */}
      {!isPT && (
        <div className="bg-white rounded-xl border border-border-light p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">🌐 Webhook Grupo OLX</h2>
          <p className="text-sm text-text-secondary mb-3">
            Configure esta URL no painel do Canal Pro para receber leads automaticamente:
          </p>

          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-900 text-emerald-400 px-4 py-3 rounded-lg text-sm font-mono">
              POST {webhookUrl}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(webhookUrl);
                alert('URL copiada!');
              }}
              className="px-3 py-3 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm transition-all"
              title="Copiar URL"
            >
              📋
            </button>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-700">
              <strong>Header de autenticação:</strong> Adicione o header <code className="bg-amber-100 px-1 rounded">x-webhook-secret</code> ou <code className="bg-amber-100 px-1 rounded">Authorization: Bearer {'<secret>'}</code> com o valor definido em <code className="bg-amber-100 px-1 rounded">GRUPOZAP_WEBHOOK_SECRET</code>.
            </p>
          </div>
        </div>
      )}

      {/* API Endpoints Reference */}
      <div className="bg-white rounded-xl border border-border-light p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">📡 Endpoints da API</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light">
                <th className="text-left py-2 px-3 text-text-muted font-medium">Método</th>
                <th className="text-left py-2 px-3 text-text-muted font-medium">Endpoint</th>
                <th className="text-left py-2 px-3 text-text-muted font-medium">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              <tr>
                <td className="py-2 px-3"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">POST</span></td>
                <td className="py-2 px-3 font-mono text-xs text-text-primary">/api/leads?imob_id={`\${id}`}</td>
                <td className="py-2 px-3 text-text-secondary">Criar lead (formulário)</td>
              </tr>
              {isPT && (
                <tr>
                  <td className="py-2 px-3"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">POST</span></td>
                  <td className="py-2 px-3 font-mono text-xs text-text-primary">/api/ingest/email</td>
                  <td className="py-2 px-3 text-text-secondary">Trigger parse e-mail (PT)</td>
                </tr>
              )}
              {!isPT && (
                <tr>
                  <td className="py-2 px-3"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">POST</span></td>
                  <td className="py-2 px-3 font-mono text-xs text-text-primary">/api/ingest/grupozap</td>
                  <td className="py-2 px-3 text-text-secondary">Webhook Grupo OLX (BR)</td>
                </tr>
              )}
              <tr>
                <td className="py-2 px-3"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">GET</span></td>
                <td className="py-2 px-3 font-mono text-xs text-text-primary">/api/leads</td>
                <td className="py-2 px-3 text-text-secondary">Listar leads</td>
              </tr>
              <tr>
                <td className="py-2 px-3"><span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-bold">PATCH</span></td>
                <td className="py-2 px-3 font-mono text-xs text-text-primary">/api/leads/[id]</td>
                <td className="py-2 px-3 text-text-secondary">Atualizar status lead</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* DANGER ZONE */}
      <div className="bg-rose-50 rounded-xl border border-rose-200 overflow-hidden mb-12">
        <div className="bg-rose-100/50 px-6 py-4 border-b border-rose-200">
           <h2 className="text-rose-800 font-bold flex items-center gap-2">
             <span className="text-xl">⚠️</span> ZONA DE PERIGO
           </h2>
        </div>
        <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex-1">
              <h3 className="text-lg font-bold text-rose-900 mb-1">Limpar Todos os Leads</h3>
              <p className="text-sm text-rose-700">
                Esta ação exclui permanentemente todos os leads e agendamentos/eventos de sua imobiliária. 
                Use com cautela para limpar dados de teste antes de uma demonstração real.
              </p>
           </div>
           
           <button 
             onClick={async () => {
               if (window.confirm("VOCÊ TEM CERTEZA? Esta ação não pode ser desfeita. Todos os leads e eventos serão excluídos.")) {
                   const code = window.prompt("Para confirmar, digite 'EXCLUIR' abaixo:");
                   if (code === 'EXCLUIR') {
                      try {
                        const res = await fetch('/api/admin/purge', { method: 'POST' });
                        if (res.ok) {
                           alert('✅ Sucesso! Os leads e eventos foram removidos.');
                           window.location.reload();
                        } else {
                           alert('❌ Falha ao limpar banco.');
                        }
                      } catch {
                        alert('❌ Erro na comunicação com o servidor.');
                      }
                   }
               }
             }}
             className="whitespace-nowrap px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-200 transition-all hover:scale-105 active:scale-95"
           >
             🗑️ Limpar Todos os Leads
           </button>
        </div>
      </div>
    </div>
  );
}
