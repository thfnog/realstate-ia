import React from 'react';
import type { LeadComCorretor, StatusLead, Corretor } from '@/lib/database.types';
import { getOrigemLabel } from '@/lib/countryConfig';
import { statusConfig } from './KanbanBoard'; // Reuse from KanbanBoard

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isRecent(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 30 * 60 * 1000; // 30 minutes
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

function getWhatsAppLink(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

interface TableViewProps {
  filteredLeads: LeadComCorretor[];
  corretores: Corretor[];
  deleteLead: (id: string, nome: string) => void;
  openAgendaModal: (lead: LeadComCorretor) => void;
  updateStatus: (id: string, status: StatusLead) => void;
  updateCorretor: (id: string, corretorId: string) => void;
  resendBriefing: (lead: LeadComCorretor) => void;
  resending: string | null;
}

export function TableView({
  filteredLeads,
  corretores,
  deleteLead,
  openAgendaModal,
  updateStatus,
  updateCorretor,
  resendBriefing,
  resending
}: TableViewProps) {
  return (
    <div className="bg-white rounded-[2rem] border border-border-light overflow-hidden shadow-sm flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light bg-surface-alt/50">
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Origem</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">WhatsApp</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Perfil</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Corretor</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Data/Hora</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Status</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => {
              const status = statusConfig[lead.status] || statusConfig.novo;
              const recent = isRecent(lead.criado_em);
              return (
                <tr 
                  key={lead.id} 
                  onClick={() => openAgendaModal(lead)}
                  className="border-b border-border-light last:border-0 hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  {/* Nome + recent indicator */}
                  <td className="px-4 py-3 font-medium text-text-primary">
                    <div className="flex items-center gap-2">
                      {recent && (
                        <span className="relative flex h-2.5 w-2.5 shrink-0" title="Lead recente (< 30 min)">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                      )}
                      <span className="truncate max-w-[150px]">{lead.nome}</span>
                    </div>
                  </td>

                  {/* Origem */}
                  <td className="px-4 py-3">
                    {(() => {
                        const info = getOrigemLabel(lead.origem || 'desconhecido');
                        return (
                          <div className="flex flex-col">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${info.color} bg-opacity-30 border-0`}>
                              {info.icon} {info.label}
                            </span>
                            {lead.portal_origem && (
                              <span className="text-[10px] text-text-muted mt-0.5 max-w-[100px] truncate" title={lead.portal_origem}>
                                via {lead.portal_origem}
                              </span>
                            )}
                          </div>
                        );
                    })()}
                  </td>

                  {/* WhatsApp (clickable) */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={getWhatsAppLink(lead.telefone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.266-1.232l-.29-.174-3.176.944.944-3.176-.174-.29A8 8 0 1112 20z" />
                      </svg>
                      {lead.telefone}
                    </a>
                  </td>

                  {/* Perfil */}
                  <td className="px-4 py-3 text-text-muted max-w-[200px]">
                    {lead.imoveis && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/5 text-primary text-[9px] font-black uppercase mb-1 border border-primary/10">
                        🏠 {lead.imoveis.referencia}
                      </span>
                    )}
                    <span className="truncate block font-bold text-text-primary text-[11px]">{getProfileSummary(lead)}</span>
                    {lead.descricao_interesse && (
                      <span className="text-[10px] italic text-text-muted/70 truncate block" title={lead.descricao_interesse}>
                        &ldquo;{lead.descricao_interesse.slice(0, 50)}...&rdquo;
                      </span>
                    )}
                  </td>

                  {/* Corretor */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={lead.corretor_id || ''}
                      onChange={(e) => updateCorretor(lead.id, e.target.value)}
                      className={`text-xs px-2.5 py-1.5 rounded-full border font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer max-w-[130px] truncate ${
                        !lead.corretor_id 
                          ? 'bg-red-50 border-red-200 text-red-600' 
                          : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      }`}
                    >
                      <option value="" disabled className="text-red-500">
                        ⚠️ Selecionar Corretor
                      </option>
                      {corretores.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.whatsapp_status === 'close' ? '⚠️ ' : ''}{c.nome}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Data/hora */}
                  <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                    {formatDate(lead.criado_em)}
                  </td>

                  {/* Status dropdown (inline save) */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value as StatusLead)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer ${status.bg} ${status.color}`}
                    >
                      <option value="novo">Novo</option>
                      <option value="em_atendimento">Em atendimento</option>
                      <option value="visita_agendada">Visita agendada</option>
                      <option value="negociacao">Negociação</option>
                      <option value="contrato">Em contrato</option>
                      <option value="fechado">Fechado</option>
                      <option value="sem_interesse">Sem interesse</option>
                      <option value="descartado">Descartado</option>
                    </select>
                  </td>

                  {/* Actions */}
                  <td className="px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openAgendaModal(lead)}
                        title="Agenda / Detalhes"
                        className="p-1.5 rounded-lg text-text-muted hover:text-indigo-600 hover:bg-indigo-50 transition-all font-medium flex items-center gap-1.5 text-xs border border-transparent hover:border-indigo-100"
                      >
                        📅 <span className="hidden xl:inline">Processo</span>
                      </button>
                      
                      <button
                        onClick={() => resendBriefing(lead)}
                        disabled={resending === lead.id || !lead.corretor_id}
                        title={!lead.corretor_id ? "⚠️ Atribua um corretor primeiro" : "Reenviar briefing"}
                        className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary-subtle transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-text-muted cursor-pointer disabled:cursor-not-allowed"
                      >
                        {resending === lead.id ? (
                          <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin block" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                      </button>

                       <button
                        onClick={() => updateStatus(lead.id, 'descartado' as StatusLead)}
                        title="Descartar Lead"
                        className="p-1.5 rounded-lg text-text-muted hover:text-slate-600 hover:bg-slate-100 transition-all"
                      >
                        🔇
                      </button>

                       <button
                         onClick={async (e) => { 
                           e.stopPropagation(); 
                           if (confirm('Marcar como "Não é Lead"? Isso ajudará a IA a aprender e o lead será removido.')) {
                             try {
                               const res = await fetch(`/api/leads/${lead.id}/feedback`, { method: 'POST' });
                               if (res.ok) window.location.reload();
                             } catch (err) {
                               console.error('Erro ao enviar feedback:', err);
                             }
                           }
                         }}
                         title="Não é Lead (IA Feedback)"
                         className="p-1.5 rounded-lg text-text-muted hover:text-orange-600 hover:bg-orange-50 transition-all"
                       >
                         🚫
                       </button>

                       <button
                         onClick={() => deleteLead(lead.id, lead.nome)}
                         title="Excluir Permanentemente"
                         className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-all"
                       >
                         🗑️
                       </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
