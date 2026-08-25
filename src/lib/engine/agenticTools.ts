/**
 * Real Estate Agentic Tools Catalog
 * Inspired by Enterprise Assistant Tool Schema & Execution Engine
 * 
 * Provides executable tools for the AI agent with JSON schemas and native handlers.
 */

import { supabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mockDb';
import type { Lead, Imovel } from '@/lib/database.types';
import { recommendImoveis } from './recommendImoveis';
import { buildPropertyMessage, buildTimeSlotsMessage, PropertyCard, TimeSlot } from '@/lib/whatsapp/interactiveMessages';
import { RealEstateGraph } from '@/lib/knowledge/realEstateGraph';

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface ToolExecutionContext {
  lead: Lead;
  imobiliariaId: string;
  brokerId?: string;
  brokerName?: string;
}

export class AgenticTools {
  /**
   * Returns the schema definitions for all real estate tools
   */
  static getToolDefinitions(): ToolDefinition[] {
    return [
      {
        type: 'function',
        function: {
          name: 'search_properties',
          description: 'Busca imóveis no catálogo disponíveis para recomendação baseado no perfil do cliente (tipo, bairros, finalidade e orçamento).',
          parameters: {
            type: 'object',
            properties: {
              tipo: { type: 'string', description: 'Tipo do imóvel (ex: apartamento, casa, cobertura, terreno)' },
              finalidade: { type: 'string', enum: ['venda', 'aluguel', 'arrendamento'], description: 'Finalidade do negócio' },
              bairros: { type: 'array', items: { type: 'string' }, description: 'Bairros ou freguesias de interesse' },
              orcamento_max: { type: 'number', description: 'Valor máximo do orçamento em número (ex: 500000 ou 2500)' },
              quartos_min: { type: 'number', description: 'Quantidade mínima de quartos' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_property_details',
          description: 'Obtém detalhes completos de um imóvel específico pela sua referência (ex: REF-102, AP04) como condomínio, comodidades, vagas, regras de pets e endereço.',
          parameters: {
            type: 'object',
            properties: {
              referencia: { type: 'string', description: 'Código de referência do imóvel (ex: AP101, REF-200)' },
              imovel_id: { type: 'string', description: 'ID do imóvel se disponível' }
            },
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'check_available_slots',
          description: 'Consulta os horários livres na agenda do corretor para visita nos próximos dias.',
          parameters: {
            type: 'object',
            properties: {
              preferencia_periodo: { type: 'string', enum: ['manha', 'tarde', 'qualquer'], description: 'Preferência de turno' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'book_visit',
          description: 'Agenda e confirma uma visita ao imóvel em uma data e horário escolhidos pelo cliente.',
          parameters: {
            type: 'object',
            properties: {
              referencia_imovel: { type: 'string', description: 'Referência do imóvel a ser visitado' },
              data_hora_iso: { type: 'string', description: 'Data e hora no formato ISO (ex: 2026-08-28T15:00:00-03:00)' },
              observacoes: { type: 'string', description: 'Observações adicionais para a visita' }
            },
            required: ['data_hora_iso']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_lead_profile',
          description: 'Atualiza o perfil e critérios de busca do lead quando ele informa novos dados de interesse (tipo, orçamento, quartos, etc).',
          parameters: {
            type: 'object',
            properties: {
              tipo_interesse: { type: 'string', description: 'Tipo do imóvel' },
              orcamento: { type: 'number', description: 'Valor do orçamento' },
              quartos_interesse: { type: 'number', description: 'Número de quartos' },
              finalidade: { type: 'string', enum: ['comprar', 'alugar', 'investir'], description: 'Finalidade de interesse' },
              bairros_interesse: { type: 'array', items: { type: 'string' }, description: 'Lista de bairros' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'query_imobiliaria_policies',
          description: 'Consulta as regras e políticas operacionais da imobiliária (ex: garantias de locação aceitas como seguro fiança e caução, documentos exigidos, horários de visitas e regras gerais).',
          parameters: {
            type: 'object',
            properties: {
              topico: { type: 'string', description: 'Assunto da dúvida (ex: garantias, documentos, visitas, pets, fiador)' }
            },
            required: ['topico']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'request_human_handoff',
          description: 'Transfere o atendimento para o corretor humano quando solicitado pelo cliente ou para negociações especiais.',
          parameters: {
            type: 'object',
            properties: {
              motivo: { type: 'string', description: 'Motivo da transferência' }
            },
            required: ['motivo']
          }
        }
      }
    ];
  }

  /**
   * Executes a tool by name with arguments
   */
  static async executeTool(
    name: string,
    args: Record<string, any>,
    ctx: ToolExecutionContext
  ): Promise<{ success: boolean; result: any; extraMessage?: string }> {
    console.log(`🛠️ [AgenticTools] Executando tool '${name}' com args:`, JSON.stringify(args));

    try {
      switch (name) {
        case 'search_properties': {
          const tempLead: Lead = {
            ...ctx.lead,
            tipo_interesse: args.tipo || ctx.lead.tipo_interesse,
            finalidade: args.finalidade || ctx.lead.finalidade,
            orcamento: args.orcamento_max || ctx.lead.orcamento,
            quartos_interesse: args.quartos_min ?? ctx.lead.quartos_interesse,
            bairros_interesse: args.bairros || ctx.lead.bairros_interesse
          };

          const imoveis = await recommendImoveis(tempLead);
          if (imoveis.length === 0) {
            return {
              success: true,
              result: { count: 0, message: 'Nenhum imóvel disponível exatamente com esse perfil no momento.' }
            };
          }

          const cards: PropertyCard[] = imoveis.slice(0, 3).map(im => ({
            titulo: im.titulo,
            tipo: im.tipo,
            freguesia: im.freguesia,
            quartos: im.quartos,
            vagas_garagem: im.vagas_garagem,
            valor: im.valor,
            referencia: im.referencia,
            id: im.id,
            area_util: im.area_util
          }));

          const cardsFormatted = buildPropertyMessage(cards);

          return {
            success: true,
            result: {
              count: imoveis.length,
              imoveis: imoveis.slice(0, 3).map(im => ({
                referencia: im.referencia,
                titulo: im.titulo,
                tipo: im.tipo,
                bairro: im.freguesia,
                valor: im.valor,
                quartos: im.quartos,
                vagas: im.vagas_garagem,
                comodidades: im.comodidades
              }))
            },
            extraMessage: cardsFormatted
          };
        }

        case 'get_property_details': {
          const ref = args.referencia || args.imovel_id;
          if (!ref) {
            return { success: false, result: { error: 'Informe a referência ou id do imóvel.' } };
          }

          let imovel: any = null;
          if (mock.isMockMode()) {
            imovel = mock.getImovelByReferencia(ref) || mock.getImovelById(ref);
          } else {
            const { data } = await supabaseAdmin
              .from('imoveis')
              .select('*')
              .or(`referencia.ilike.${ref},id.eq.${ref}`)
              .eq('imobiliaria_id', ctx.imobiliariaId)
              .maybeSingle();
            imovel = data;
          }

          if (!imovel) {
            return { success: false, result: { error: `Imóvel com referência '${ref}' não encontrado.` } };
          }

          const endereco = [imovel.rua, imovel.numero, imovel.freguesia, imovel.concelho].filter(Boolean).join(', ');

          return {
            success: true,
            result: {
              referencia: imovel.referencia,
              titulo: imovel.titulo,
              tipo: imovel.tipo,
              finalidade: imovel.finalidade,
              valor: imovel.valor,
              valor_locacao: imovel.valor_locacao,
              condominio: imovel.condominio_mensal,
              iptu: imovel.imi_iptu_anual,
              endereco_completo: endereco,
              quartos: imovel.quartos,
              suites: imovel.suites,
              vagas: imovel.vagas_garagem,
              area_util: imovel.area_util,
              comodidades: imovel.comodidades || [],
              descricao: imovel.descricao
            }
          };
        }

        case 'check_available_slots': {
          const corretorId = ctx.brokerId || ctx.lead.corretor_id;
          if (!corretorId) {
            return { success: true, result: { message: 'Corretor não atribuído. Horários flexíveis disponíveis de segunda a sábado em horário comercial.' } };
          }

          const now = new Date();
          const nextWeek = new Date();
          nextWeek.setDate(now.getDate() + 7);

          let busyTimes = new Set<string>();
          if (!mock.isMockMode()) {
            const { data: eventos } = await supabaseAdmin
              .from('eventos')
              .select('data_hora')
              .eq('corretor_id', corretorId)
              .gte('data_hora', now.toISOString())
              .lte('data_hora', nextWeek.toISOString())
              .in('status', ['agendado']);

            busyTimes = new Set((eventos || []).map(e => {
              const d = new Date(e.data_hora);
              return `${d.toISOString().split('T')[0]}_${d.getHours()}`;
            }));
          }

          const slots: TimeSlot[] = [];
          const weekdays = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

          for (let dayOffset = 1; dayOffset <= 7 && slots.length < 3; dayOffset++) {
            const day = new Date();
            day.setDate(day.getDate() + dayOffset);
            const dayOfWeek = day.getDay();
            if (dayOfWeek === 0) continue; // Skip Sunday

            const dateStr = day.toISOString().split('T')[0];
            const dayLabel = weekdays[dayOfWeek];
            const dayNum = day.getDate().toString().padStart(2, '0');
            const monthNum = (day.getMonth() + 1).toString().padStart(2, '0');

            for (let hour = 10; hour < 17 && slots.length < 3; hour += 3) {
              const key = `${dateStr}_${hour}`;
              if (busyTimes.has(key)) continue;

              slots.push({
                label: `${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)} (${dayNum}/${monthNum}) às ${hour.toString().padStart(2, '0')}:00`,
                isoDateTime: `${dateStr}T${hour.toString().padStart(2, '0')}:00:00-03:00`,
                slotId: `slot_${slots.length + 1}`
              });
            }
          }

          const slotsFormatted = buildTimeSlotsMessage(slots);

          return {
            success: true,
            result: { slots },
            extraMessage: slotsFormatted
          };
        }

        case 'book_visit': {
          const isoDate = args.data_hora_iso;
          const ref = args.referencia_imovel;

          let targetImovel: any = null;
          if (ref) {
            if (mock.isMockMode()) {
              targetImovel = mock.getImovelByReferencia(ref);
            } else {
              const { data } = await supabaseAdmin
                .from('imoveis')
                .select('*')
                .eq('referencia', ref)
                .eq('imobiliaria_id', ctx.imobiliariaId)
                .maybeSingle();
              targetImovel = data;
            }
          }

          const endereco = targetImovel
            ? [targetImovel.rua, targetImovel.numero, targetImovel.freguesia, targetImovel.concelho].filter(Boolean).join(', ')
            : 'Endereço a confirmar';

          if (!mock.isMockMode()) {
            await supabaseAdmin.from('eventos').insert([{
              imobiliaria_id: ctx.imobiliariaId,
              lead_id: ctx.lead.id,
              corretor_id: ctx.brokerId || ctx.lead.corretor_id,
              tipo: 'visita',
              titulo: `Visita Imóvel ${ref ? `Ref: ${ref}` : ''} com ${ctx.lead.nome}`,
              descricao: `Agendado via IA WhatsApp. ${args.observacoes || ''}`,
              data_hora: isoDate,
              local: endereco,
              status: 'agendado'
            }]);

            await supabaseAdmin.from('leads').update({ status: 'visita_agendada' }).eq('id', ctx.lead.id);
          } else {
            mock.createEvento({
              imobiliaria_id: ctx.imobiliariaId,
              lead_id: ctx.lead.id,
              corretor_id: ctx.brokerId || ctx.lead.corretor_id || '',
              tipo: 'visita',
              titulo: `Visita ${ref || ''} com ${ctx.lead.nome}`,
              descricao: 'Agendado via IA WhatsApp',
              data_hora: isoDate,
              local: endereco,
              status: 'agendado'
            });
          }

          return {
            success: true,
            result: {
              status: 'confirmed',
              data_hora: isoDate,
              endereco_completo: endereco,
              referencia: ref
            }
          };
        }

        case 'update_lead_profile': {
          const updates: Record<string, any> = {};
          if (args.tipo_interesse) updates.tipo_interesse = args.tipo_interesse;
          if (args.orcamento) updates.orcamento = args.orcamento;
          if (args.quartos_interesse) updates.quartos_interesse = args.quartos_interesse;
          if (args.finalidade) updates.finalidade = args.finalidade;
          if (args.bairros_interesse && Array.isArray(args.bairros_interesse)) updates.bairros_interesse = args.bairros_interesse;

          if (Object.keys(updates).length > 0) {
            if (!mock.isMockMode()) {
              await supabaseAdmin.from('leads').update(updates).eq('id', ctx.lead.id);
            } else {
              mock.updateLead(ctx.lead.id, updates);
            }
            Object.assign(ctx.lead, updates);
          }

          return { success: true, result: { updated: updates } };
        }

        case 'query_imobiliaria_policies': {
          const topico = (args.topico || '').toLowerCase();
          const policies = RealEstateGraph.getPolicies();
          const matched = policies.filter(p => p.palavras_chave.some(k => topico.includes(k)) || p.titulo.toLowerCase().includes(topico));
          
          return {
            success: true,
            result: {
              policies: (matched.length > 0 ? matched : policies.slice(0, 2)).map(m => ({
                titulo: m.titulo,
                informacao: m.conteudo
              }))
            }
          };
        }

        case 'request_human_handoff': {
          if (!mock.isMockMode()) {
            await supabaseAdmin.from('leads').update({ status: 'em_atendimento' }).eq('id', ctx.lead.id);
          }
          return { success: true, result: { handoff: true, motivo: args.motivo } };
        }

        default:
          return { success: false, result: { error: `Ferramenta desconhecida: ${name}` } };
      }
    } catch (err: any) {
      console.error(`❌ [AgenticTools] Erro ao executar tool ${name}:`, err);
      return { success: false, result: { error: err.message } };
    }
  }
}
