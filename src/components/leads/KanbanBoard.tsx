import React from 'react';
import type { LeadComCorretor, StatusLead } from '@/lib/database.types';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  novo: { label: 'Novo', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: '🆕' },
  em_atendimento: { label: 'Em atendimento', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: '💬' },
  visita_agendada: { label: 'Visita agendada', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: '📅' },
  negociacao: { label: 'Negociação', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: '🤝' },
  contrato: { label: 'Em Contrato', color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200', icon: '✍️' },
  fechado: { label: 'Fechado 🎉', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: '🎉' },
  sem_interesse: { label: 'Sem interesse', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: '👎' },
  descartado: { label: 'Descartado 🗑️', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: '🗑️' },
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

// Draggable Card Component
function SortableLeadCard({ 
  lead, 
  onClick, 
  onDelete, 
  onStatusChange,
  isOverlay = false 
}: { 
  lead: LeadComCorretor, 
  onClick: () => void, 
  onDelete: (id: string, nome: string) => void,
  onStatusChange: (id: string, status: StatusLead) => void,
  isOverlay?: boolean 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging && !isOverlay ? 0.4 : 1,
  };

  const config = statusConfig[lead.status] || statusConfig.novo;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white p-5 rounded-2xl border border-border-light shadow-sm hover:shadow-xl hover:border-primary/20 transition-all group cursor-grab active:cursor-grabbing relative overflow-hidden ${isOverlay ? 'shadow-2xl ring-2 ring-primary/20 scale-105' : ''}`}
      onClick={(e) => {
         // Only trigger click if not dragging
         if (!isDragging) onClick();
      }}
    >
       {/* Quick Actions */}
       <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-20">
         <button 
           onClick={(e) => { e.stopPropagation(); onStatusChange(lead.id, 'descartado'); }}
           className="p-1.5 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-200 transition-all"
           title="Descartar Lead (Ocultar do funil)"
         >
           🔇
         </button>
         <button 
           onClick={(e) => { e.stopPropagation(); onDelete(lead.id, lead.nome); }}
           className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
           title="Excluir Permanentemente"
         >
           🗑️
         </button>
       </div>

       <div className={`absolute top-0 left-0 right-0 h-1 ${config.bg.split(' ')[0]}`} />

       <div className="flex justify-between items-start mb-3">
           <div>
              <h4 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">{lead.nome}</h4>
              <p className="text-[10px] text-text-muted mt-0.5">{lead.telefone}</p>
              {lead.portal_origem && (
                <p className="text-[9px] text-text-tertiary font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                   <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                   {lead.portal_origem}
                </p>
              )}
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
       </div>

       <div className="flex items-center justify-between pt-3 border-t border-border-light/50">
          <div className="flex items-center gap-2">
             {lead.corretores ? (
                <div className="relative group/avatar">
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${lead.corretores.whatsapp_status === 'open' ? 'from-emerald-400 to-emerald-600' : lead.corretores.whatsapp_status === 'close' ? 'from-rose-400 to-rose-600' : 'from-slate-400 to-slate-500'} flex items-center justify-center text-[10px] text-white font-black border-2 border-white shadow-sm`} title={lead.corretores.nome}>
                     {lead.corretores.nome.charAt(0)}
                  </div>
                </div>
             ) : (
                <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center text-[10px] text-rose-500 font-black border-2 border-white shadow-sm">
                   ?
                </div>
             )}
             <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">{lead.corretores?.nome.split(' ')[0] || 'Ninguém'}</span>
          </div>
          <span className="text-[9px] font-black text-text-tertiary uppercase">{formatDate(lead.criado_em).split(',')[0]}</span>
       </div>
    </div>
  );
}

export function KanbanBoard({ 
  filteredLeads, 
  statusFilter, 
  deleteLead, 
  openAgendaModal, 
  updateStatus
}: KanbanBoardProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeLead = activeId ? filteredLeads.find(l => l.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    // If dropped over a column (id is status)
    if (Object.keys(statusConfig).includes(overId)) {
       updateStatus(leadId, overId as StatusLead);
       return;
    }

    // If dropped over another card
    const targetLead = filteredLeads.find(l => l.id === overId);
    if (targetLead && targetLead.status !== activeLead?.status) {
       updateStatus(leadId, targetLead.status as StatusLead);
    }
  }

  const columns: StatusLead[] = ['novo', 'em_atendimento', 'visita_agendada', 'negociacao', 'contrato', 'fechado'];
  if (statusFilter === 'descartado') columns.push('descartado');

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 min-h-[600px] overflow-x-auto pb-8 scrollbar-hide">
        {columns.map((status) => {
          const columnLeads = filteredLeads.filter(l => l.status === status);
          const config = statusConfig[status] || statusConfig.novo;
          
          return (
            <div key={status} className="flex flex-col gap-4 min-w-[300px] max-w-[300px]">
               {/* Column Header */}
               <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${config.bg.split(' ')[0]}`} />
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">{config.label}</h3>
                  </div>
                  <span className="text-[10px] font-black text-text-muted bg-white border border-border-light px-2 py-0.5 rounded-full shadow-sm">
                    {columnLeads.length}
                  </span>
               </div>

               {/* Droppable Column Area */}
               <SortableContext 
                  id={status}
                  items={columnLeads.map(l => l.id)}
                  strategy={verticalListSortingStrategy}
               >
                 <div 
                   className={`flex-1 bg-surface-alt/50 rounded-[2rem] border border-border-light/50 p-3 space-y-3 min-h-[500px] transition-colors ${activeId && 'hover:bg-primary/5 border-primary/20'}`}
                 >
                    {columnLeads.map(lead => (
                      <SortableLeadCard 
                        key={lead.id}
                        lead={lead}
                        onClick={() => openAgendaModal(lead)}
                        onDelete={deleteLead}
                        onStatusChange={updateStatus}
                      />
                    ))}
                    
                    {columnLeads.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border-light/30 rounded-2xl opacity-40">
                         <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Livre</span>
                      </div>
                    )}
                 </div>
               </SortableContext>
            </div>
          );
        })}
      </div>

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: '0.5',
            },
          },
        }),
      }}>
        {activeLead ? (
          <SortableLeadCard 
            lead={activeLead}
            onClick={() => {}}
            onDelete={() => {}}
            onStatusChange={() => {}}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
