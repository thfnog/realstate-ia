'use client';

import { getMedianoRegiao, calcularIndicador } from '@/lib/imoveis/mercado';
import { CountryConfig, formatCurrency } from '@/lib/countryConfig';

interface MercadoIndicadorProps {
  valor: number;
  areaUtil: number;
  concelho: string;
  freguesia?: string;
  pais: 'PT' | 'BR';
  tipo: string;
  config: CountryConfig;
}

export default function MercadoIndicador({ valor, areaUtil, concelho, freguesia, pais, tipo, config }: MercadoIndicadorProps) {
  if (!valor || !areaUtil || !concelho) return null;

  const mercado = getMedianoRegiao(pais, concelho, tipo, freguesia);
  const indicador = calcularIndicador(valor, areaUtil, mercado.mediano);
  const precoM2 = valor / areaUtil;

  const badgeColors = {
    verde: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amarelo: 'bg-amber-50 text-amber-700 border-amber-200',
    vermelho: 'bg-rose-50 text-rose-700 border-rose-200',
    azul: 'bg-sky-50 text-sky-700 border-sky-200',
  };

  return (
    <div className="bg-surface-alt/30 rounded-2xl border border-border-light p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <span>🧠</span> Inteligência de Mercado
        </h3>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${badgeColors[indicador.badge]}`}>
          {indicador.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider mb-1">Este Imóvel</p>
          <p className="text-lg font-bold text-text-primary">
            {formatCurrency(precoM2, config)}<span className="text-xs font-normal">/m²</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider mb-1">Média {freguesia || concelho}</p>
          <p className="text-lg font-bold text-text-primary">
            {formatCurrency(mercado.mediano, config)}<span className="text-xs font-normal">/m²</span>
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-border-light/50">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-text-secondary">Variação vs Mercado</span>
          <span className={`font-bold ${indicador.variacao > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {indicador.variacao > 0 ? '+' : ''}{indicador.variacao.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-border-light rounded-full overflow-hidden flex">
            {/* Visual indicator bar */}
            <div 
                className={`h-full transition-all duration-500 ${indicador.badge === 'azul' || indicador.badge === 'verde' ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                style={{ width: `${Math.min(Math.abs(indicador.variacao) * 2, 100)}%`, marginLeft: indicador.variacao > 0 ? '50%' : `${50 - Math.min(Math.abs(indicador.variacao) * 2, 50)}%` }}
            />
        </div>
      </div>

      <div className="bg-white/50 rounded-xl p-3 flex items-start gap-3">
         <span className="text-lg">📈</span>
         <div>
            <p className="text-[11px] font-bold text-text-primary mb-0.5">Tendência de Valorização</p>
            <p className="text-[10px] text-text-secondary leading-tight">
                A região de {freguesia || concelho} valorizou <strong>{mercado.valorizacao}%</strong> no último ano. Imóveis captados hoje têm alto potencial de apreciação.
            </p>
         </div>
      </div>

      <p className="text-[9px] text-text-tertiary italic text-center">
        Valores de referência Q3 2025. Para fins informativos.
      </p>
    </div>
  );
}
