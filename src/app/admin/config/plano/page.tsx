'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { IoCheckmarkCircle, IoDiamondOutline, IoRocketOutline, IoBriefcaseOutline, IoInformationCircleOutline, IoCardOutline, IoReceiptOutline, IoPeopleCircleOutline, IoWarningOutline } from 'react-icons/io5';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { toast } from 'sonner';

interface Plano {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  preco_mensal: number;
  modulos: string[];
  limite_usuarios: number;
}

interface BillingInfo {
  imobiliaria?: {
    cartao_final: string;
    cartao_bandeira: string;
    nome: string;
  } | null;
  assinatura: {
    id: string;
    plano_id: string;
    status: string;
    periodo_fim: string;
  } | null;
  faturas: any[];
  userCount: number;
}

export default function AgencyPlansPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  const fetchBilling = async () => {
    try {
      const [resPlanos, resBilling] = await Promise.all([
        fetch('/api/master/planos'),
        fetch('/api/admin/billing')
      ]);
      const dataPlanos = await resPlanos.json();
      const dataBilling = await resBilling.json();
      
      if (Array.isArray(dataPlanos)) setPlanos(dataPlanos);
      setBilling(dataBilling);
    } catch (err) {
      toast.error('Erro ao carregar informações de cobrança');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const handleUpdateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const mockCard = { cartao_final: '4482', cartao_bandeira: 'Visa' };
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_card', ...mockCard })
      });
      if (res.ok) {
        toast.success('Cartão atualizado com sucesso!');
        setShowCardModal(false);
        fetchBilling();
      }
    } catch {
      toast.error('Erro ao atualizar cartão');
    }
  };

  const handleChangePlan = async (plano: Plano) => {
    if (billing?.assinatura?.plano_id === plano.id) return;
    
    if (!confirm(`Deseja alterar seu plano para ${plano.nome}? A cobrança será ajustada no próximo ciclo.`)) return;

    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_plan', plano_id: plano.id })
      });
      if (res.ok) {
        toast.success(`Plano alterado para ${plano.nome}! Atualizando permissões...`);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch {
      toast.error('Erro ao alterar plano');
    }
  };

  const getIcon = (slug: string) => {
    if (slug.includes('enterprise')) return <IoDiamondOutline size={32} />;
    if (slug.includes('profissional')) return <IoRocketOutline size={32} />;
    if (slug.includes('essencial')) return <IoBriefcaseOutline size={32} />;
    return <IoInformationCircleOutline size={32} />;
  };

  return (
    <div className="animate-fade-in space-y-16 pb-20 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-12">
        <div className="space-y-4">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Assinatura & Plano</h1>
          <p className="text-slate-500 font-medium text-lg max-w-xl">
            Gerencie seu plano, controle o limite de usuários e acompanhe suas faturas em um só lugar.
          </p>
        </div>
        
        {billing && (
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center gap-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${billing.userCount >= (planos.find(p => p.id === billing.assinatura?.plano_id)?.limite_usuarios || 0) ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
              <IoPeopleCircleOutline size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Uso de Usuários</p>
              <div className="flex items-end gap-1.5">
                <span className="text-2xl font-black text-slate-900 leading-none">{billing.userCount}</span>
                <span className="text-sm font-bold text-slate-400 leading-none">/ {planos.find(p => p.id === billing.assinatura?.plano_id)?.limite_usuarios || 0} slots</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <LoadingSkeleton className="h-[500px] rounded-[3rem]" />
          <LoadingSkeleton className="h-[500px] rounded-[3rem]" />
          <LoadingSkeleton className="h-[500px] rounded-[3rem]" />
        </div>
      ) : (
        <div className="space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {planos.map((plano) => {
              const isCurrent = billing?.assinatura?.plano_id === plano.id;
              const isEnterprise = plano.slug.includes('enterprise');

              return (
                <div 
                  key={plano.id}
                  className={`relative flex flex-col p-10 rounded-[3rem] border transition-all duration-500 hover:scale-[1.02] ${
                    isCurrent 
                      ? 'bg-white border-primary shadow-2xl shadow-primary/20 ring-4 ring-primary/5' 
                      : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl'
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1.5 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                      Plano Atual
                    </div>
                  )}

                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-8 ${isCurrent ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-50 text-slate-400'}`}>
                    {getIcon(plano.slug)}
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">{plano.nome}</h3>
                  <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed h-12 overflow-hidden">{plano.descricao}</p>

                  <div className="mb-10">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-slate-900 tracking-tighter">R$ {plano.preco_mensal.toLocaleString('pt-BR')}</span>
                      <span className="text-slate-400 font-bold text-sm tracking-widest uppercase">/mês</span>
                    </div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-2">
                      Até {plano.limite_usuarios} usuários inclusos
                    </p>
                  </div>

                  <div className="flex-1 space-y-4 mb-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">O que está incluído:</p>
                    {plano.modulos.map((m) => (
                      <div key={m} className="flex items-center gap-3">
                        <IoCheckmarkCircle className="text-emerald-500 shrink-0" size={18} />
                        <span className="text-sm font-bold text-slate-700 capitalize">Módulo {m}</span>
                      </div>
                    ))}
                  </div>

                  <button 
                    disabled={isCurrent}
                    onClick={() => handleChangePlan(plano)}
                    className={`w-full py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                      isCurrent 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : (billing?.userCount || 0) > plano.limite_usuarios
                          ? 'bg-rose-50 text-rose-300 border border-rose-100 cursor-not-allowed'
                          : isEnterprise 
                            ? 'bg-slate-900 text-white hover:bg-primary shadow-xl shadow-slate-900/10' 
                            : 'bg-primary text-white hover:bg-slate-900 shadow-xl shadow-primary/20'
                    }`}
                  >
                    {isCurrent 
                      ? 'Utilizando este Plano' 
                      : (billing?.userCount || 0) > plano.limite_usuarios
                        ? 'Limite de Usuários Excedido'
                        : 'Alterar para este Plano'
                    }
                  </button>
                  
                  {(billing?.userCount || 0) > plano.limite_usuarios && !isCurrent && (
                    <p className="text-[10px] text-rose-500 font-bold text-center mt-4">
                      Você possui {billing?.userCount} usuários ativos. Este plano permite apenas {plano.limite_usuarios}.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Payment Method */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <IoCardOutline size={24} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Forma de Pagamento</h3>
                </div>
                <button 
                  onClick={() => setShowCardModal(true)}
                  className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                >
                  {billing?.imobiliaria?.cartao_final ? 'Trocar Cartão' : 'Adicionar Cartão'}
                </button>
              </div>

              {billing?.imobiliaria?.cartao_final ? (
                <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex items-center justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-150" />
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Cartão Cadastrado</p>
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-mono tracking-[0.3em]">•••• •••• ••••</span>
                      <span className="text-xl font-black">{billing.imobiliaria.cartao_final}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 mt-4 uppercase tracking-widest">{billing.imobiliaria.cartao_bandeira}</p>
                  </div>
                  <IoDiamondOutline className="text-white/10 absolute bottom-6 right-8" size={48} />
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-100 p-12 rounded-[2rem] text-center">
                  <p className="text-slate-400 font-bold text-sm mb-4">Nenhum cartão de crédito cadastrado.</p>
                  <button 
                    onClick={() => setShowCardModal(true)}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    Vincular Agora
                  </button>
                </div>
              )}
            </div>

            {/* Billing History */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <IoReceiptOutline size={24} />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Histórico de Cobrança</h3>
              </div>

              <div className="flex-1 space-y-4">
                {billing?.faturas && billing.faturas.length > 0 ? (
                  billing.faturas.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.status === 'pago' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                          {f.status === 'pago' ? '✓' : '!'}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">Mensalidade {new Date(f.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(f.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">R$ {parseFloat(f.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${f.status === 'pago' ? 'text-emerald-500' : 'text-amber-500'}`}>{f.status}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-3 py-10">
                    <IoInformationCircleOutline size={32} className="opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">Nenhuma fatura encontrada</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 animate-scale-in">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-6">Adicionar Cartão</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">Insira os dados do seu cartão para habilitar a renovação automática do plano.</p>
            
            <form onSubmit={handleUpdateCard} className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                  <IoCardOutline className="text-slate-400" size={24} />
                  <input className="bg-transparent border-none outline-none font-mono text-lg w-full" placeholder="4482 •••• •••• ••••" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input className="p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none text-sm font-bold" placeholder="MM/AA" />
                  <input className="p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none text-sm font-bold" placeholder="CVC" />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCardModal(false)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-slate-200">Vincular Cartão</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100 flex items-start gap-6">
        <IoWarningOutline className="text-indigo-600 shrink-0" size={28} />
        <div>
          <p className="text-indigo-900 font-black text-sm uppercase tracking-widest mb-2">Segurança dos Dados</p>
          <p className="text-indigo-700/70 text-sm font-medium leading-relaxed">
            Não armazenamos os dados completos do seu cartão em nossos servidores. Todas as transações são processadas com criptografia de ponta a ponta seguindo o padrão PCI-DSS.
          </p>
        </div>
      </div>

      <div className="bg-amber-50 p-8 rounded-[2rem] border border-amber-100 flex items-start gap-6">
        <IoWarningOutline className="text-amber-600 shrink-0" size={28} />
        <div>
          <p className="text-amber-900 font-black text-sm uppercase tracking-widest mb-2">Regras de Downgrade</p>
          <p className="text-amber-700/70 text-sm font-medium leading-relaxed">
            Para mudar para um plano inferior, certifique-se de que a sua imobiliária possui um número de usuários ativos igual ou menor ao limite permitido pelo novo plano. Se necessário, inative usuários na tela de <Link href="/admin/usuarios" className="underline font-bold hover:text-amber-900">Gestão de Usuários</Link> antes de solicitar a troca.
          </p>
        </div>
      </div>
    </div>
  );
}
