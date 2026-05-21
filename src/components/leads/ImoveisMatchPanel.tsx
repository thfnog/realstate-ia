'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { IoLogoWhatsapp, IoFilterOutline, IoSaveOutline, IoCloseOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';
import type { LeadComCorretor, Imovel } from '@/lib/database.types';

interface ScoredImovel extends Imovel {
  match_percentage: number;
  match_reasons: string[];
}

interface ImoveisMatchPanelProps {
  lead: LeadComCorretor;
  matchingImoveis: ScoredImovel[];
  loading: boolean;
  onRefresh: () => void;
}

export function ImoveisMatchPanel({ lead, matchingImoveis, loading, onRefresh }: ImoveisMatchPanelProps) {
  const [isEditingFilters, setIsEditingFilters] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Filter form state
  const [orcamento, setOrcamento] = useState(lead.orcamento?.toString() || '');
  const [quartos, setQuartos] = useState(lead.quartos_interesse?.toString() || '');
  const [tipo, setTipo] = useState(lead.tipo_interesse || '');
  const [bairros, setBairros] = useState(lead.bairros_interesse?.join(', ') || '');

  async function handleSaveFilters(e: React.FormEvent) {
    e.preventDefault();
    try {
      const bairrosArray = bairros.split(',').map(b => b.trim()).filter(b => b.length > 0);
      const res = await fetch(`/api/clientes/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orcamento: orcamento ? parseFloat(orcamento) : null,
          quartos_interesse: quartos ? parseInt(quartos) : null,
          tipo_interesse: tipo || null,
          bairros_interesse: bairrosArray
        })
      });

      if (res.ok) {
        toast.success('Filtros e preferências salvos com sucesso!');
        setIsEditingFilters(false);
        onRefresh();
      } else {
        toast.error('Erro ao salvar preferências');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao salvar preferências');
    }
  }

  async function handleSendImovel(imovel: ScoredImovel) {
    if (sendingId) return;
    setSendingId(imovel.id);

    // Format listing message
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: imovel.moeda || 'BRL'
    }).format(imovel.valor);

    const message = `Olá, ${lead.nome}! Selecionei este imóvel que possui ${imovel.match_percentage}% de compatibilidade com o que você procura:\n\n🏠 *${imovel.titulo}*\n📍 Bairro: ${imovel.freguesia || 'Não informado'}\n💰 Valor: ${valorFormatado}\n🛏️ Quartos: ${imovel.quartos || 0} | 🚗 Vagas: ${imovel.vagas_garagem || 0}\n📐 Área: ${imovel.area_util || 0}m²\n\nMotivos de destaque:\n${imovel.match_reasons.map(r => `• ${r}`).join('\n')}\n\nGostaria de agendar uma visita?`;

    try {
      const res = await fetch(`/api/leads/${lead.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      if (res.ok) {
        toast.success('Imóvel enviado por WhatsApp com sucesso!');
      } else {
        toast.error('Erro ao enviar imóvel');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar mensagem pelo WhatsApp');
    } finally {
      setSendingId(null);
    }
  }

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-emerald-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getProgressBgColor = (percentage: number) => {
    if (percentage >= 80) return 'text-emerald-700 bg-emerald-50';
    if (percentage >= 50) return 'text-amber-700 bg-amber-50';
    return 'text-rose-700 bg-rose-50';
  };

  return (
    <div className="space-y-6">
      {/* Header and Toggle Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
          <span>🎯</span> Matches Encontrados ({matchingImoveis.length})
        </h3>
        <button
          onClick={() => setIsEditingFilters(!isEditingFilters)}
          className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            isEditingFilters 
              ? 'bg-slate-900 text-white border-slate-900' 
              : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50 shadow-sm'
          }`}
        >
          {isEditingFilters ? <IoCloseOutline size={14} /> : <IoFilterOutline size={14} />}
          {isEditingFilters ? 'Fechar Ajuste' : 'Ajustar Filtros'}
        </button>
      </div>

      {/* Adjust Filters Form */}
      {isEditingFilters && (
        <form onSubmit={handleSaveFilters} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-4 animate-slide-in-top">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Orçamento Máximo</label>
              <input 
                type="number" 
                value={orcamento}
                onChange={e => setOrcamento(e.target.value)}
                placeholder="Ex: 850000"
                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Quartos Mínimo</label>
              <input 
                type="number" 
                value={quartos}
                onChange={e => setQuartos(e.target.value)}
                placeholder="Ex: 3"
                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo de Imóvel</label>
              <select 
                value={tipo}
                onChange={e => setTipo(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-primary/30"
              >
                <option value="">Qualquer tipo</option>
                <option value="apartamento">Apartamento</option>
                <option value="casa">Casa</option>
                <option value="cobertura">Cobertura</option>
                <option value="terreno">Terreno</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bairros de Interesse (Separados por vírgula)</label>
            <input 
              type="text" 
              value={bairros}
              onChange={e => setBairros(e.target.value)}
              placeholder="Ex: Morumbi, Itaim Bibi, Pinheiros"
              className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-primary/30"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="submit"
              className="flex items-center gap-1.5 px-6 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md shadow-primary/10"
            >
              <IoSaveOutline size={14} />
              Recomendar Matches
            </button>
          </div>
        </form>
      )}

      {/* Property Recommendation List */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-28 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse" />
          <div className="h-28 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse" />
        </div>
      ) : matchingImoveis.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl p-8 border border-dashed border-slate-200 text-center">
          <p className="text-3xl mb-2 opacity-30">🏠</p>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
            Nenhum imóvel compatível encontrado no momento
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matchingImoveis.map((imovel) => (
            <div 
              key={imovel.id} 
              className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-5 items-start md:items-center"
            >
              {/* Photo placeholder or First Img */}
              <div className="w-full md:w-28 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-slate-400">
                {imovel.fotos && imovel.fotos.length > 0 ? (
                  <img 
                    src={imovel.fotos[0].url_media || imovel.fotos[0].url_thumb || imovel.fotos[0].url_original} 
                    alt={imovel.titulo} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>🏠</span>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="font-black text-slate-900 text-sm truncate max-w-[250px]">{imovel.titulo}</h4>
                  <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${getProgressBgColor(imovel.match_percentage)}`}>
                    {imovel.match_percentage}% Match
                  </span>
                </div>

                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  {imovel.freguesia || 'Sem bairro'} • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: imovel.moeda || 'BRL' }).format(imovel.valor)}
                </p>

                {/* Match reasons */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {imovel.match_reasons.slice(0, 3).map((reason, idx) => (
                    <span 
                      key={idx} 
                      className="bg-slate-50 border border-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1"
                    >
                      <IoCheckmarkCircleOutline className="text-emerald-500 shrink-0" size={10} />
                      {reason}
                    </span>
                  ))}
                  {imovel.match_reasons.length > 3 && (
                    <span className="text-[9px] text-slate-400 font-bold self-center">
                      +{imovel.match_reasons.length - 3} mais
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="w-full md:w-auto shrink-0 pt-2 md:pt-0">
                <button
                  onClick={() => handleSendImovel(imovel)}
                  disabled={sendingId === imovel.id}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-emerald-500/10 transition-all"
                >
                  <IoLogoWhatsapp size={14} />
                  {sendingId === imovel.id ? 'Enviando...' : 'Enviar no WhatsApp'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
