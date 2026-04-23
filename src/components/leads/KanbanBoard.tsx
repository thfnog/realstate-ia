import React from 'react';
import type { LeadComCorretor, StatusLead } from '@/lib/database.types';

export const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  novo: { label: 'Novo', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  em_atendimento: { label: 'Em atendimento', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  visita_agendada: { label: 'Visita agendada', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  negociacao: { label: 'Negociação', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  contrato: { label: 'Em Contrato', color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
  fechado: { label: 'Fechado 🎉', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  sem_interesse: { label: 'Sem interesse', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
  descartado: { label: 'Descartado 🗑️', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getProfileSummary(lead: LeadComCorretor): string {
  const parts: string[] = [];
  if (lead.finalidade) {
    const f: Record<string, string> = { comprar: 'Compra', alugar: 'Aluguel', investir: 'Investimento' };
    parts.push(f[lead.finalidade] || lead.finalidade);
  }
  if (lead.tipo_interesse) parts.push(lead.tipo_interesse);
  if (lead.quartos_interesse) parts.push(`${lead.quartos_interesse}q`);
  if (lead.orcamento) parts.push(`R$${(lead.orcamento / 1000).toFixed(0)}k`);
  if (lead.bairros_interesse?.length) parts.push(lead.bairros_interesse.slice(0, 2).join(', '));
  return parts.join(' • ') || 'Sem detalhes';
}

import { getOrigemLabel } from '@/lib/countryConfig';

interface KanbanBoardProps {
  filteredLeads: LeadComCorretor[];
  statusFilter: string;
  deleteLead: (id: string, nome: string) => void;
  openAgendaModal: (lead: LeadComCorretor) => void;
  updateStatus: (id: string, status: StatusLead) => void;
}

export function KanbanBoard({ 
  filteredLeads, 
  statusFilter, 
  deleteLead, 
  openAgendaModal, 
  updateStatus
}: KanbanBoardProps) {
  return (
    <div className="flex gap-4 min-h-[600px] overflow-x-auto pb-8 scrollbar-hide">
      {['novo', 'em_atendimento', 'visita_agendada', 'negociacao', 'contrato', 'fechado', ...(statusFilter === 'descartado' ? ['descartado'] : [])].map((status) => {
        const columnLeads = filteredLeads.filter(l => l.status === status);
        if (status !== 'descartado' && statusFilter === 'descartado') return null;
        
        const config = statusConfig[status] || statusConfig.novo;
        return (
          <div key={status} className="flex flex-col gap-4 min-w-[300px] max-w-[300px]">
             {/* Column Header */}
             <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${config.bg.replace('bg-', 'bg-')}`} />
                  <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">{config.label}</h3>
                </div>
                <span className="text-[10px] font-black text-text-muted bg-white border border-border-light px-2 py-0.5 rounded-full shadow-sm">
                  {columnLeads.length}
                </span>
             </div>

             {/* Cards Container */}
             <div className="flex-1 bg-surface-alt/50 rounded-[2rem] border border-border-light/50 p-3 space-y-3 min-h-[500px]">
                {columnLeads.map(lead => (
                  <div 
                    key={lead.id}
                    className="bg-white p-5 rounded-2xl border border-border-light shadow-sm hover:shadow-xl hover:border-primary/20 transition-all group cursor-pointer relative overflow-hidden"
                    onClick={() => openAgendaModal(lead)}
                  >
                     {/* Quick Action Delete */}
                     <button 
                       onClick={(e) => { e.stopPropagation(); deleteLead(lead.id, lead.nome); }}
                       className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all z-20"
                       title="Excluir Permanentemente"
                     >
                       🗑️
                     </button>

                     <div className={`absolute top-0 left-0 right-0 h-1 ${config.bg.split(' ')[0]}`} />

                     <div className="flex justify-between items-start mb-3">
                        <div>
                           <h4 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">{lead.nome}</h4>
                           <p className="text-[10px] text-text-muted mt-0.5">{lead.telefone}</p>
                        </div>
                        <div className="flex gap-1.5">
                           {lead.origem === 'whatsapp' && (
                              <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-xs animate-pulse" title="Vindo do WhatsApp Bot">
                                 🤖
                              </div>
                           )}
                           <div className="w-6 h-6 rounded-lg bg-surface-alt flex items-center justify-center text-[10px] grayscale group-hover:grayscale-0 transition-all border border-border-light shadow-sm">
                              {getOrigemLabel(lead.origem).icon}
                           </div>
                        </div>
                     </div>
                     
                     <div className="bg-surface-alt/50 p-3 rounded-xl border border-border-light/50 mb-4">
                        {lead.imoveis && (
                          <div className="flex items-center gap-1.5 mb-2 p-1.5 bg-primary/5 rounded-lg border border-primary/10">
                            <span className="text-[10px]">🏠</span>
                            <span className="text-[10px] font-black text-primary uppercase tracking-tighter">Interesse: {lead.imoveis.referencia}</span>
                          </div>
                        )}
                        <p className="text-[10px] font-bold text-text-primary leading-tight mb-1.5">
                           {getProfileSummary(lead)}
                        </p>
                        {lead.descricao_interesse && (
                          <p className="text-[10px] italic text-text-muted line-clamp-2 leading-snug">
                            "{lead.descricao_interesse}"
                          </p>
                        )}
                     </div>

                     {/* Quick Progress Buttons */}
                     <div className="flex gap-1 mb-4">
                        {['novo', 'em_atendimento', 'visita_agendada', 'negociacao', 'contrato'].indexOf(lead.status) < 4 && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              const stages: StatusLead[] = ['novo', 'em_atendimento', 'visita_agendada', 'negociacao', 'contrato', 'fechado'];
                              const next = stages[stages.indexOf(lead.status) + 1];
                              if (next) updateStatus(lead.id, next);
                            }}
                            className="flex-1 py-1 px-2 rounded-lg bg-slate-50 hover:bg-indigo-50 text-indigo-600 border border-border-light text-[9px] font-bold uppercase transition-all"
                          >
                            Avançar →
                          </button>
                        )}
                        <select 
                          value={lead.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateStatus(lead.id, e.target.value as StatusLead)}
                          className="w-8 h-6 rounded-lg bg-slate-50 border border-border-light text-[10px] focus:outline-none"
                        >
                          <option value="novo">🆕</option>
                          <option value="em_atendimento">💬</option>
                          <option value="visita_agendada">📅</option>
                          <option value="negociacao">🤝</option>
                          <option value="contrato">✍️</option>
                          <option value="fechado">🎉</option>
                          <option value="descartado">🗑️</option>
                        </select>
                     </div>

                     <div className="flex items-center justify-between pt-3 border-t border-border-light/50">
                        <div className="flex items-center gap-2">
                           {lead.corretores ? (
                              <div className="relative group/avatar">
                                <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${lead.corretores.whatsapp_status === 'open' ? 'from-emerald-400 to-emerald-600' : lead.corretores.whatsapp_status === 'close' ? 'from-rose-400 to-rose-600' : 'from-slate-400 to-slate-500'} flex items-center justify-center text-[10px] text-white font-black border-2 border-white shadow-sm`} title={lead.corretores.nome}>
                                   {lead.corretores.nome.charAt(0)}
                                </div>
                                {lead.corretores.whatsapp_status === 'close' && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center border border-rose-200">
                                    <span className="text-[8px] text-rose-500">⚠️</span>
                                  </div>
                                )}
                              </div>
                           ) : (
                              <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center text-[10px] text-rose-500 font-black border-2 border-white shadow-sm" title="Sem corretor">
                                 ?
                              </div>
                           )}
                           <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">{lead.corretores?.nome.split(' ')[0] || 'Ninguém'}</span>
                        </div>
                        <span className="text-[9px] font-black text-text-tertiary uppercase">{formatDate(lead.criado_em).split(',')[0]}</span>
                     </div>
                  </div>
                ))}
                
                {columnLeads.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border-light/30 rounded-2xl opacity-40">
                     <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Livre</span>
                  </div>
                )}
             </div>
          </div>
        );
      })}
    </div>
  );
}
