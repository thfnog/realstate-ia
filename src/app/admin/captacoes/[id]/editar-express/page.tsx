'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  IoArrowBack,
  IoSaveOutline,
  IoRocketOutline,
  IoSparkles,
  IoLogoWhatsapp,
  IoDocumentTextOutline,
  IoAnalyticsOutline,
  IoHomeOutline,
  IoLocationOutline,
  IoCashOutline,
  IoPersonOutline,
  IoCallOutline,
  IoBedOutline,
  IoCarOutline,
  IoResizeOutline,
  IoCheckmarkCircle,
  IoRefreshOutline,
  IoImagesOutline,
} from 'react-icons/io5';
import type { CaptacaoComDetalhes, TipoImovel } from '@/lib/database.types';

const TIPOS_IMOVEL: { label: string; value: TipoImovel; icon: string }[] = [
  { label: 'Apartamento', value: 'apartamento', icon: '🏢' },
  { label: 'Casa', value: 'casa', icon: '🏡' },
  { label: 'Casa Cond.', value: 'casa_condominio', icon: '🏘️' },
  { label: 'Cobertura', value: 'cobertura', icon: '🏙️' },
  { label: 'Terreno/Lote', value: 'terreno', icon: '📐' },
  { label: 'Sala Comercial', value: 'sala_comercial', icon: '💼' },
  { label: 'Galpão', value: 'galpao', icon: '🏭' },
  { label: 'Chácara/Sítio', value: 'chacara', icon: '🌳' },
];

export default function EditarExpressCaptacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const id = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [captacao, setCaptacao] = useState<CaptacaoComDetalhes | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'apartamento' as TipoImovel,
    finalidade: 'venda' as 'venda' | 'aluguel' | 'ambos',
    status: 'prospeccao',
    // Valores
    valor_estimado: '',
    valor_locacao_estimado: '',
    condominio_estimado: '',
    iptu_estimado: '',
    // Localização
    rua: '',
    numero: '',
    complemento: '',
    freguesia: '',
    concelho: '',
    distrito: '',
    codigo_postal: '',
    // Dimensões & Cômodos
    area_util: '',
    area_total: '',
    quartos: '',
    suites: '',
    banheiros: '',
    vagas: '',
    // Proprietário
    proprietario_nome: '',
    proprietario_telefone: '',
    proprietario_email: '',
    // Descrição e Notas
    descricao: '',
    observacoes: '',
  });

  async function loadCaptacao() {
    try {
      setLoading(true);
      const res = await fetch(`/api/captacoes/${id}`);
      if (!res.ok) {
        throw new Error('Falha ao carregar captação');
      }
      const data: CaptacaoComDetalhes = await res.json();
      setCaptacao(data);

      setFormData({
        titulo: data.titulo || '',
        tipo: data.tipo || 'apartamento',
        finalidade: data.finalidade || 'venda',
        status: data.status || 'prospeccao',
        valor_estimado: data.valor_estimado ? String(data.valor_estimado) : '',
        valor_locacao_estimado: data.valor_locacao_estimado ? String(data.valor_locacao_estimado) : '',
        condominio_estimado: data.condominio_estimado ? String(data.condominio_estimado) : '',
        iptu_estimado: data.iptu_estimado ? String(data.iptu_estimado) : '',
        rua: data.rua || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        freguesia: data.freguesia || '',
        concelho: data.concelho || '',
        distrito: data.distrito || '',
        codigo_postal: data.codigo_postal || '',
        area_util: data.area_util ? String(data.area_util) : '',
        area_total: data.area_total ? String(data.area_total) : '',
        quartos: data.quartos !== null && data.quartos !== undefined ? String(data.quartos) : '',
        suites: data.suites !== null && data.suites !== undefined ? String(data.suites) : '',
        banheiros: data.banheiros !== null && data.banheiros !== undefined ? String(data.banheiros) : '',
        vagas: data.vagas !== null && data.vagas !== undefined ? String(data.vagas) : '',
        proprietario_nome: data.proprietario_nome || '',
        proprietario_telefone: data.proprietario_telefone || '',
        proprietario_email: data.proprietario_email || '',
        descricao: data.descricao || '',
        observacoes: data.observacoes || '',
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao carregar captação');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      loadCaptacao();
    }
  }, [id]);

  // Salvar Rascunho
  async function handleSalvarRascunho() {
    try {
      setSaving(true);
      const payload = {
        titulo: formData.titulo,
        tipo: formData.tipo,
        finalidade: formData.finalidade,
        valor_estimado: formData.valor_estimado ? Number(formData.valor_estimado) : null,
        valor_locacao_estimado: formData.valor_locacao_estimado ? Number(formData.valor_locacao_estimado) : null,
        condominio_estimado: formData.condominio_estimado ? Number(formData.condominio_estimado) : null,
        iptu_estimado: formData.iptu_estimado ? Number(formData.iptu_estimado) : null,
        rua: formData.rua || null,
        numero: formData.numero || null,
        complemento: formData.complemento || null,
        freguesia: formData.freguesia || null,
        concelho: formData.concelho || null,
        distrito: formData.distrito || null,
        codigo_postal: formData.codigo_postal || null,
        area_util: formData.area_util ? Number(formData.area_util) : null,
        area_total: formData.area_total ? Number(formData.area_total) : null,
        quartos: formData.quartos !== '' ? Number(formData.quartos) : null,
        suites: formData.suites !== '' ? Number(formData.suites) : null,
        banheiros: formData.banheiros !== '' ? Number(formData.banheiros) : null,
        vagas: formData.vagas !== '' ? Number(formData.vagas) : 0,
        proprietario_nome: formData.proprietario_nome || null,
        proprietario_telefone: formData.proprietario_telefone || null,
        proprietario_email: formData.proprietario_email || null,
        descricao: formData.descricao || null,
        observacoes: formData.observacoes || null,
      };

      const res = await fetch(`/api/captacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar alterações');
      }

      toast.success('💾 Alterações salvas com sucesso!');
      loadCaptacao();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  // Aprovar e Publicar no Catálogo
  async function handleAprovarEPublicar() {
    if (!formData.titulo) {
      toast.warning('O título é obrigatório para publicar');
      return;
    }

    try {
      setPublishing(true);
      const payload = {
        action: 'publicar',
        status: 'publicado',
        titulo: formData.titulo,
        tipo: formData.tipo,
        finalidade: formData.finalidade,
        valor_estimado: formData.valor_estimado ? Number(formData.valor_estimado) : null,
        valor_locacao_estimado: formData.valor_locacao_estimado ? Number(formData.valor_locacao_estimado) : null,
        condominio_estimado: formData.condominio_estimado ? Number(formData.condominio_estimado) : null,
        iptu_estimado: formData.iptu_estimado ? Number(formData.iptu_estimado) : null,
        rua: formData.rua || null,
        numero: formData.numero || null,
        complemento: formData.complemento || null,
        freguesia: formData.freguesia || null,
        concelho: formData.concelho || null,
        distrito: formData.distrito || null,
        codigo_postal: formData.codigo_postal || null,
        area_util: formData.area_util ? Number(formData.area_util) : null,
        area_total: formData.area_total ? Number(formData.area_total) : null,
        quartos: formData.quartos !== '' ? Number(formData.quartos) : null,
        suites: formData.suites !== '' ? Number(formData.suites) : null,
        banheiros: formData.banheiros !== '' ? Number(formData.banheiros) : null,
        vagas: formData.vagas !== '' ? Number(formData.vagas) : 0,
        proprietario_nome: formData.proprietario_nome || null,
        proprietario_telefone: formData.proprietario_telefone || null,
        proprietario_email: formData.proprietario_email || null,
        descricao: formData.descricao || null,
        observacoes: formData.observacoes || null,
      };

      const res = await fetch(`/api/captacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao publicar captação');
      }

      const resData = await res.json();
      toast.success('🚀 Imóvel publicado com sucesso no catálogo!');

      if (resData.imovel?.id) {
        router.push(`/admin/imoveis/${resData.imovel.id}`);
      } else {
        router.push('/admin/captacoes');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao publicar');
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-xl w-1/3"></div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
          <div className="h-10 bg-slate-100 rounded-xl w-full"></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-slate-100 rounded-xl"></div>
            <div className="h-16 bg-slate-100 rounded-xl"></div>
          </div>
        </div>
        <div className="text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
          <IoSparkles className="animate-spin text-primary" /> Carregando captação expressa...
        </div>
      </div>
    );
  }

  if (!captacao) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl border border-slate-100 text-center space-y-4 shadow-xl">
        <h2 className="text-lg font-black text-slate-900">Captação não encontrada</h2>
        <p className="text-xs text-slate-500">O registro solicitado não existe ou foi removido.</p>
        <Link
          href="/admin/captacoes"
          className="inline-block px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs"
        >
          Voltar ao Funil
        </Link>
      </div>
    );
  }

  const phoneProp = formData.proprietario_telefone.replace(/\D/g, '');

  return (
    <div className="min-h-screen bg-slate-50/70 pb-36 text-slate-800">
      {/* Top Mobile Bar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 shadow-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <Link
            href="/admin/captacoes"
            className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs flex items-center gap-1 transition-all"
          >
            <IoArrowBack size={18} />
            <span className="hidden sm:inline">Voltar ao Funil</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <IoSparkles size={11} /> Edição Express
            </span>
            {captacao.origem === 'whatsapp' && (
              <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                <IoLogoWhatsapp size={12} /> Áudio / WhatsApp
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-5">
        {/* Banner de Destaque IA */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 rounded-3xl shadow-lg shadow-emerald-600/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200 flex items-center gap-1.5">
              🤖 Extração Inteligente Concluída
            </span>
            <h1 className="text-lg font-black leading-tight">Revisão Rápida da Captação</h1>
            <p className="text-xs text-emerald-100">
              Revise os dados detectados pela IA pelo celular e publique no catálogo com 1 toque.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <a
              href={`/api/captacoes/${captacao.id}/autorizacao`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-xl text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5 transition-all border border-white/20"
              title="Gerar Autorização de Captação CRECI"
            >
              <IoDocumentTextOutline size={14} /> Autorização
            </a>

            {captacao.imovel_id && (
              <a
                href={`/api/imoveis/${captacao.imovel_id}/laudo-avaliacao/pdf`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-white text-emerald-800 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-black/10 hover:bg-emerald-50"
              >
                <IoAnalyticsOutline size={14} /> Laudo CMA
              </a>
            )}
          </div>
        </div>

        {/* 1. TÍTULO E TIPO */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>🏠</span> Título Comercial & Tipologia
            </h2>
            <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ✨ Detectado por IA
            </span>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
              Título do Anúncio *
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ex: Apartamento de Luxo nos Jardins com 3 Suítes"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Seletor de Tipo de Imóvel */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
              Tipo de Imóvel
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIPOS_IMOVEL.map((t) => {
                const isSelected = formData.tipo === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: t.value })}
                    className={`p-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/30 scale-[1.02]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Finalidade */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
              Finalidade
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'venda', label: 'Venda 🏷️' },
                { id: 'aluguel', label: 'Aluguel 🔑' },
                { id: 'ambos', label: 'Ambos 🔄' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, finalidade: f.id as any })}
                  className={`py-2.5 rounded-2xl text-xs font-bold border transition-all text-center ${
                    formData.finalidade === f.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. VALORES E TAXAS */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>💰</span> Valores & Encargos Financeiros
            </h2>
            <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ✨ Detectado por IA
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Valor de Venda (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  value={formData.valor_estimado}
                  onChange={(e) => setFormData({ ...formData, valor_estimado: e.target.value })}
                  placeholder="850000"
                  className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Aluguel Estimado (R$/mês)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  value={formData.valor_locacao_estimado}
                  onChange={(e) => setFormData({ ...formData, valor_locacao_estimado: e.target.value })}
                  placeholder="3500"
                  className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Condomínio Mensal (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  value={formData.condominio_estimado}
                  onChange={(e) => setFormData({ ...formData, condominio_estimado: e.target.value })}
                  placeholder="800"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                IPTU Anual (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  value={formData.iptu_estimado}
                  onChange={(e) => setFormData({ ...formData, iptu_estimado: e.target.value })}
                  placeholder="1500"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. LOCALIZAÇÃO */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>📍</span> Localização do Imóvel
            </h2>
            <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ✨ Detectado por IA
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Bairro *
              </label>
              <input
                type="text"
                value={formData.freguesia}
                onChange={(e) => setFormData({ ...formData, freguesia: e.target.value })}
                placeholder="Jardins"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Cidade *
              </label>
              <input
                type="text"
                value={formData.concelho}
                onChange={(e) => setFormData({ ...formData, concelho: e.target.value })}
                placeholder="São Paulo"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Estado (UF)
              </label>
              <input
                type="text"
                value={formData.distrito}
                onChange={(e) => setFormData({ ...formData, distrito: e.target.value })}
                placeholder="SP"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Rua / Logradouro
              </label>
              <input
                type="text"
                value={formData.rua}
                onChange={(e) => setFormData({ ...formData, rua: e.target.value })}
                placeholder="Rua Oscar Freire"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Número
              </label>
              <input
                type="text"
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                placeholder="1200"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Complemento / Apto
              </label>
              <input
                type="text"
                value={formData.complemento}
                onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                placeholder="Apto 142 Bloco B"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                CEP / Código Postal
              </label>
              <input
                type="text"
                value={formData.codigo_postal}
                onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
                placeholder="01426-001"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* 4. DIMENSÕES & CÔMODOS */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>📐</span> Dimensões & Características
            </h2>
            <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ✨ Detectado por IA
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="col-span-1 sm:col-span-1">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1 truncate">
                Área Útil (m²)
              </label>
              <input
                type="number"
                value={formData.area_util}
                onChange={(e) => setFormData({ ...formData, area_util: e.target.value })}
                placeholder="120"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-900 text-center"
              />
            </div>

            <div className="col-span-1 sm:col-span-1">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1 truncate">
                Área Total (m²)
              </label>
              <input
                type="number"
                value={formData.area_total}
                onChange={(e) => setFormData({ ...formData, area_total: e.target.value })}
                placeholder="150"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-900 text-center"
              />
            </div>

            <div className="col-span-1 sm:col-span-1">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Quartos
              </label>
              <input
                type="number"
                value={formData.quartos}
                onChange={(e) => setFormData({ ...formData, quartos: e.target.value })}
                placeholder="3"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-900 text-center"
              />
            </div>

            <div className="col-span-1 sm:col-span-1">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Suítes
              </label>
              <input
                type="number"
                value={formData.suites}
                onChange={(e) => setFormData({ ...formData, suites: e.target.value })}
                placeholder="1"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-900 text-center"
              />
            </div>

            <div className="col-span-1 sm:col-span-1">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Banheiros
              </label>
              <input
                type="number"
                value={formData.banheiros}
                onChange={(e) => setFormData({ ...formData, banheiros: e.target.value })}
                placeholder="2"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-900 text-center"
              />
            </div>

            <div className="col-span-1 sm:col-span-1">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Vagas
              </label>
              <input
                type="number"
                value={formData.vagas}
                onChange={(e) => setFormData({ ...formData, vagas: e.target.value })}
                placeholder="2"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-900 text-center"
              />
            </div>
          </div>
        </div>

        {/* 5. DADOS DO PROPRIETÁRIO */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>👤</span> Dados de Contato do Proprietário
            </h2>
            <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ✨ Detectado por IA
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Nome do Proprietário
              </label>
              <input
                type="text"
                value={formData.proprietario_nome}
                onChange={(e) => setFormData({ ...formData, proprietario_nome: e.target.value })}
                placeholder="Carlos Alberto"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Telefone / WhatsApp
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={formData.proprietario_telefone}
                  onChange={(e) => setFormData({ ...formData, proprietario_telefone: e.target.value })}
                  placeholder="(11) 99888-7766"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900"
                />
                {phoneProp && (
                  <a
                    href={`https://wa.me/55${phoneProp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shrink-0 flex items-center justify-center shadow-sm shadow-emerald-600/20"
                    title="Conversar no WhatsApp"
                  >
                    <IoLogoWhatsapp size={16} />
                  </a>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={formData.proprietario_email}
                onChange={(e) => setFormData({ ...formData, proprietario_email: e.target.value })}
                placeholder="proprietario@email.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* 6. DESCRIÇÃO COMERCIAL GERADA */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>✍️</span> Descrição Comercial (Copywriting IA)
            </h2>
            <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ✨ Bullet Points Gerados
            </span>
          </div>

          <div>
            <textarea
              rows={6}
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Texto comercial completo com os diferenciais do imóvel..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
              Anotações Internas do Corretor / Negociação
            </label>
            <input
              type="text"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Ex: Proprietário aceita negociar 5% no pagamento à vista, chaves com a portaria."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700"
            />
          </div>
        </div>

        {/* Fotos Anexadas */}
        {captacao.fotos && captacao.fotos.length > 0 && (
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>📸</span> Fotos Recebidas via WhatsApp ({captacao.fotos.length})
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {captacao.fotos.map((url, idx) => (
                <div key={idx} className="aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 relative group">
                  <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute top-2 left-2 bg-black/70 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md">
                      Capa
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Actions Bar (Mobile-First) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSalvarRascunho}
            disabled={saving || publishing}
            className="flex-1 sm:flex-none px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
          >
            <IoSaveOutline size={16} />
            {saving ? 'Salvando...' : 'Salvar Rascunho'}
          </button>

          <button
            type="button"
            onClick={handleAprovarEPublicar}
            disabled={saving || publishing}
            className="flex-1 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-600/25 active:scale-95 disabled:opacity-50"
          >
            <IoRocketOutline size={16} />
            {publishing ? 'Publicando...' : 'Aprovar e Publicar no Catálogo'}
          </button>
        </div>
      </div>
    </div>
  );
}
