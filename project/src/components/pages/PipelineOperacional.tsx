/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { GitBranch, Clock, CheckCircle, XCircle, Package, AlertTriangle, Users, X, ChevronUp, ChevronDown, ChevronRight, ChevronsUpDown, ChevronDown as ChevDown } from 'lucide-react';

interface PipelineRow {
  id: number;
  pedido_interno: number;
  num_pedido_externo: string | null;
  tipo_pedido_label: string;
  cod_vendedor: number | null;
  apelido_vendedor: string | null;
  cod_cliente: number | null;
  nome_fantasia: string | null;
  valor_pedido: number;
  data_emissao_pedido: string | null;
  data_separacao: string | null;
  data_nf: string | null;
  num_nf: string | null;
  etapa_atual: string;
  gap_entrada_separacao_h: number | null;
  gap_separacao_faturamento_h: number | null;
  gap_total_h: number | null;
  sla_status: string;
}

type SortField = 'data_emissao_pedido' | 'gap' | null;
type SortDir = 'asc' | 'desc';

const TIPO_OPTIONS = ['Venda', 'Bonificação', 'Assistência', 'Remessa'];

const SLA_OPTIONS = ['OK', 'ATENCAO', 'ATRASADO', 'CONCLUIDO', 'CANCELADO'];

const SLA_LABEL: Record<string, string> = {
  OK: 'No prazo',
  ATENCAO: 'Atenção',
  ATRASADO: 'Atrasado',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

const SLA_BADGE: Record<string, string> = {
  OK: 'bg-green-100 text-green-800',
  ATENCAO: 'bg-yellow-100 text-yellow-800',
  ATRASADO: 'bg-red-100 text-red-800',
  CONCLUIDO: 'bg-blue-100 text-blue-800',
  CANCELADO: 'bg-gray-100 text-gray-600',
};

// Ordem de severidade para ordenação SLA (menor = mais crítico)
const SLA_ORDER: Record<string, number> = {
  ATRASADO: 1,
  ATENCAO: 2,
  OK: 3,
  CONCLUIDO: 4,
  CANCELADO: 5,
};

// Metas de SLA por etapa do pipeline
const ETAPA_META = [
  {
    key: 'mediaGapSep' as const,
    label: 'Entrada → Separação',
    desc: 'Do pedido criado até início da separação',
    targetH: 12,
  },
  {
    key: 'mediaGapFatSep' as const,
    label: 'Separação → Faturamento',
    desc: 'Da separação completa até emissão da NF',
    targetH: 36,
  },
  {
    key: 'mediaGapTotal' as const,
    label: 'Total (Entrada → NF)',
    desc: 'Ciclo completo do pedido',
    targetH: 48,
  },
];

const ETAPA_LABEL: Record<string, string> = {
  ENTRADA: 'Entrada',
  LIBERADO: 'Liberado',
  SEPARADO_BLOQUEADO: 'Sep. Bloqueado',
  SEPARADO_PRONTO: 'Sep. Pronto',
  FATURADO: 'Faturado',
  CANCELADO: 'Cancelado',
};

const ETAPA_BADGE: Record<string, string> = {
  ENTRADA: 'bg-gray-100 text-gray-700',
  LIBERADO: 'bg-blue-100 text-blue-700',
  SEPARADO_BLOQUEADO: 'bg-orange-100 text-orange-700',
  SEPARADO_PRONTO: 'bg-emerald-100 text-emerald-700',
  FATURADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
};

type VendedorMap = Record<number, string>;

// ─── Funções utilitárias (puras, sem dependência de state) ───────────────────

const formatH = (h: number | null): string => {
  if (h === null) return '—';
  if (h < 1) return `${Math.round(h * 60)}min`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
};

const elapsedH = (dataEmissao: string | null): number | null => {
  if (!dataEmissao) return null;
  const diff = (Date.now() - new Date(dataEmissao).getTime()) / 3_600_000;
  return diff > 0 ? diff : null;
};

const formatData = (dt: string | null): string => {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const formatDataHora = (dt: string | null): string => {
  if (!dt) return '—';
  const d = new Date(dt);
  return (
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
    ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
};

const formatMoeda = (v: number): string =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─── Multi-select dropdown ────────────────────────────────────────────────────

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  labelMap?: Record<string, string>;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, selected, onChange, labelMap }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  };

  const displayLabel = selected.length === 0
    ? `Todos (${label})`
    : selected.length === options.length
    ? `Todos (${label})`
    : selected.map(s => labelMap?.[s] ?? s).join(', ');

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent max-w-[180px]"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevDown className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[160px] py-1">
          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-xs text-gray-500">
            <input
              type="checkbox"
              checked={selected.length === 0 || selected.length === options.length}
              onChange={() => onChange([])}
              className="accent-primary"
            />
            Todos
          </label>
          <div className="border-t border-gray-100 my-1" />
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-xs text-gray-700">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="accent-primary"
              />
              {labelMap?.[opt] ?? opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Ícone de ordenação ───────────────────────────────────────────────────────

const SortIcon: React.FC<{ field: SortField; active: SortField; dir: SortDir }> = ({ field, active, dir }) => {
  if (active !== field) return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400 inline ml-1" />;
  return dir === 'asc'
    ? <ChevronUp className="h-3.5 w-3.5 text-primary inline ml-1" />
    : <ChevronDown className="h-3.5 w-3.5 text-primary inline ml-1" />;
};

// ─── Gap segment — barra de tempo entre etapas ────────────────────────────────

const GapSegment: React.FC<{ label: string; h: number | null; targetH: number }> = ({ label, h, targetH }) => {
  if (h === null) return null;
  const ratio = h / targetH;
  const pct = Math.min(ratio * 100, 100);
  const over = ratio > 1;
  const warn = !over && ratio > 0.75;
  const barColor = over ? 'bg-red-500' : warn ? 'bg-yellow-400' : 'bg-green-500';
  const textColor = over ? 'text-red-600' : warn ? 'text-yellow-700' : 'text-green-700';
  return (
    <div className="pl-4 border-l-2 border-dashed border-gray-200 ml-1.5 py-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-500">{label}</span>
        <span className={`text-[10px] font-semibold tabular-nums ${textColor}`}>
          {formatH(h)}<span className="font-normal text-gray-400"> / {formatH(targetH)}</span>
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {over && (
        <p className={`text-[10px] mt-1 font-medium ${textColor}`}>+{formatH(h - targetH)} acima da meta</p>
      )}
    </div>
  );
};

// ─── Drawer de detalhe do pedido ─────────────────────────────────────────────

interface DrawerProps {
  row: PipelineRow;
  vendedor: string;
  slaEfetivo: string;
  onClose: () => void;
}

const DrawerDetalhePedido: React.FC<DrawerProps> = ({ row, vendedor, slaEfetivo, onClose }) => {
  const faturado = row.etapa_atual === 'FATURADO' || row.data_nf !== null;
  const separado = row.data_separacao !== null;
  const cancelado = row.etapa_atual === 'CANCELADO';
  const gapElapsed = !faturado && !cancelado ? elapsedH(row.data_emissao_pedido) : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Detalhe do Pedido</p>
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 text-lg leading-tight">#{row.pedido_interno}</p>
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded font-medium">{row.tipo_pedido_label}</span>
            </div>
            <p className="text-sm text-gray-600 mt-0.5">{row.nome_fantasia ?? '—'}</p>
          </div>
          <button onClick={onClose} className="mt-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chips de info */}
        <div className="px-5 py-3 flex flex-wrap gap-1.5 border-b border-gray-100 flex-shrink-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ETAPA_BADGE[row.etapa_atual] || 'bg-gray-100 text-gray-600'}`}>
            {ETAPA_LABEL[row.etapa_atual] || row.etapa_atual}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SLA_BADGE[slaEfetivo] || 'bg-gray-100 text-gray-600'}`}>
            {SLA_LABEL[slaEfetivo] || slaEfetivo}
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{row.tipo_pedido_label}</span>
          <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{formatMoeda(row.valor_pedido)}</span>
          {vendedor !== '—' && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{vendedor}</span>
          )}
          {row.num_pedido_externo && (
            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">ext: {row.num_pedido_externo}</span>
          )}
        </div>

        {/* Timeline — scrollável */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-4">Linha do Tempo</h4>

          {/* Entrada */}
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 rounded-full bg-blue-500 flex-shrink-0 mt-0.5" />
              {(separado || faturado || !cancelado) && <div className="w-0.5 bg-gray-200 flex-1 mt-1" />}
            </div>
            <div className="pb-0">
              <p className="text-xs font-semibold text-gray-800">Entrada</p>
              <p className="text-xs text-gray-500">{formatDataHora(row.data_emissao_pedido)}</p>
            </div>
          </div>

          {/* Gap entrada→separação + nó de Separação */}
          {separado ? (
            <>
              <GapSegment label="Entrada → Separação" h={row.gap_entrada_separacao_h} targetH={12} />
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 flex-shrink-0 mt-0.5" />
                  {(faturado || !cancelado) && <div className="w-0.5 bg-gray-200 flex-1 mt-1" />}
                </div>
                <div className="pb-0">
                  <p className="text-xs font-semibold text-gray-800">Separação</p>
                  <p className="text-xs text-gray-500">{formatDataHora(row.data_separacao)}</p>
                </div>
              </div>
            </>
          ) : !cancelado ? (
            <div className="pl-4 border-l-2 border-dashed border-gray-200 ml-1.5 py-2">
              <p className="text-[10px] text-amber-600 font-medium">Aguardando separação…</p>
            </div>
          ) : null}

          {/* Gap separação→faturamento + nó de Faturamento */}
          {faturado ? (
            <>
              <GapSegment label="Separação → Faturamento" h={row.gap_separacao_faturamento_h} targetH={36} />
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-green-600 flex-shrink-0 mt-0.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800">Faturado</p>
                  {row.num_nf
                    ? <p className="text-xs text-gray-500">NF {row.num_nf} · {formatDataHora(row.data_nf)}</p>
                    : <p className="text-xs text-gray-400">NF não capturada</p>
                  }
                </div>
              </div>
            </>
          ) : cancelado ? (
            <div className="pl-4 border-l-2 border-dashed border-gray-200 ml-1.5 py-2">
              <div className="flex gap-2 items-center">
                <div className="h-3 w-3 rounded-full bg-red-400 flex-shrink-0" />
                <p className="text-xs text-red-600 font-medium">Cancelado</p>
              </div>
            </div>
          ) : separado ? (
            <div className="pl-4 border-l-2 border-dashed border-gray-200 ml-1.5 py-2">
              <p className="text-[10px] text-amber-600 font-medium">Aguardando faturamento…</p>
            </div>
          ) : null}

          {/* Tempo total */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Tempo total</span>
              {row.gap_total_h !== null ? (
                <div className="text-right">
                  <span className={`text-sm font-bold tabular-nums ${row.gap_total_h > 48 ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatH(row.gap_total_h)}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">/ meta 48h</span>
                </div>
              ) : gapElapsed !== null ? (
                <div className="text-right">
                  <span className={`text-sm font-bold tabular-nums ${slaEfetivo === 'ATRASADO' ? 'text-red-600' : 'text-amber-600'}`}>
                    {formatH(gapElapsed)}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">em andamento</span>
                </div>
              ) : (
                <span className="text-sm text-gray-400">—</span>
              )}
            </div>
            {row.gap_total_h !== null && (
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${row.gap_total_h > 48 ? 'bg-red-500' : row.gap_total_h / 48 > 0.75 ? 'bg-yellow-400' : 'bg-green-500'}`}
                  style={{ width: `${Math.min((row.gap_total_h / 48) * 100, 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

const PipelineOperacional: React.FC = () => {
  const [dados, setDados] = useState<PipelineRow[]>([]);
  const [vendedorMap, setVendedorMap] = useState<VendedorMap>({});
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [tiposSelecionados, setTiposSelecionados] = useState<string[]>([]);
  const [slasSelecionados, setSlasSelecionados] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('gap');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PipelineRow | null>(null);

  const meses = Array.from({ length: 12 }, (_, i) => ({
    valor: i + 1,
    nome: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }),
  }));
  const anos = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  // Carrega mapa de vendedores uma única vez
  useEffect(() => {
    supabase
      .from('profiles')
      .select('cod_vendedor,apelido')
      .not('cod_vendedor', 'is', null)
      .then(({ data }) => {
        if (data) {
          const map: VendedorMap = {};
          data.forEach((p: any) => { if (p.cod_vendedor) map[p.cod_vendedor] = p.apelido; });
          setVendedorMap(map);
        }
      });
  }, []);

  useEffect(() => {
    fetchDados();
    setColapsados(new Set());
  }, [mes, ano]);

  const fetchDados = async () => {
    setLoading(true);
    const mesRef = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const { data, error } = await supabase
      .from('pipeline_operacional')
      .select(
        'id,pedido_interno,num_pedido_externo,tipo_pedido_label,' +
        'cod_vendedor,apelido_vendedor,cod_cliente,nome_fantasia,valor_pedido,' +
        'data_emissao_pedido,data_separacao,data_nf,num_nf,etapa_atual,' +
        'gap_entrada_separacao_h,gap_separacao_faturamento_h,gap_total_h,sla_status'
      )
      .eq('mes_referencia', mesRef);

    if (error) {
      console.error('Erro ao buscar pipeline_operacional:', error);
      setDados([]);
    } else {
      setDados((data as PipelineRow[]) || []);
    }
    setLoading(false);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleGrupo = (chave: string) => {
    setColapsados(prev => {
      const next = new Set(prev);
      if (next.has(chave)) next.delete(chave);
      else next.add(chave);
      return next;
    });
  };

  const toggleTodos = (grupos: { chave: string }[]) => {
    setColapsados(prev =>
      prev.size === grupos.length
        ? new Set()
        : new Set(grupos.map(g => g.chave))
    );
  };

  // SLA efetivo: pedido faturado pelo ERP (etapa FATURADO) = sempre CONCLUIDO
  const slaEfetivoDeRow = (row: PipelineRow) =>
    row.etapa_atual === 'FATURADO' ? 'CONCLUIDO' : row.sla_status;

  // Base para KPIs: apenas filtro de tipo (SLA não afeta os cards)
  const dadosPorTipo = useMemo(() => {
    if (tiposSelecionados.length === 0) return dados;
    return dados.filter(d => tiposSelecionados.includes(d.tipo_pedido_label));
  }, [dados, tiposSelecionados]);

  // Base para tabela: tipo + SLA
  const dadosFiltrados = useMemo(() => {
    let lista = dadosPorTipo;

    if (slasSelecionados.length > 0) {
      lista = lista.filter(d => slasSelecionados.includes(slaEfetivoDeRow(d)));
    }

    if (sortField === 'data_emissao_pedido') {
      lista = [...lista].sort((a, b) => {
        const va = a.data_emissao_pedido ?? '';
        const vb = b.data_emissao_pedido ?? '';
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    } else if (sortField === 'gap') {
      lista = [...lista].sort((a, b) => {
        // usa gap_total_h se disponível, senão tempo decorrido (pedidos em aberto)
        const gapOf = (r: PipelineRow) =>
          r.gap_total_h ?? elapsedH(r.data_emissao_pedido) ?? -1;
        const va = gapOf(a);
        const vb = gapOf(b);
        return sortDir === 'asc' ? va - vb : vb - va;
      });
    }

    return lista;
  }, [dados, tiposSelecionados, slasSelecionados, sortField, sortDir]);

  const kpis = useMemo(() => {
    const total = dadosFiltrados.length;
    const faturados = dadosFiltrados.filter(d => d.etapa_atual === 'FATURADO').length;
    const cancelados = dadosFiltrados.filter(d => d.etapa_atual === 'CANCELADO').length;
    const emAndamento = total - faturados - cancelados;
    const atrasados = dadosFiltrados.filter(d => slaEfetivoDeRow(d) === 'ATRASADO').length;

    const gapsFaturados = dadosFiltrados
      .filter(d => d.gap_total_h !== null && d.etapa_atual === 'FATURADO')
      .map(d => d.gap_total_h as number);
    const mediaGapTotal = gapsFaturados.length > 0
      ? gapsFaturados.reduce((a, b) => a + b, 0) / gapsFaturados.length
      : null;

    const gapsSep = dadosFiltrados
      .filter(d => d.gap_entrada_separacao_h !== null)
      .map(d => d.gap_entrada_separacao_h as number);
    const mediaGapSep = gapsSep.length > 0
      ? gapsSep.reduce((a, b) => a + b, 0) / gapsSep.length
      : null;

    const gapsFatSep = dadosFiltrados
      .filter(d => d.gap_separacao_faturamento_h !== null)
      .map(d => d.gap_separacao_faturamento_h as number);
    const mediaGapFatSep = gapsFatSep.length > 0
      ? gapsFatSep.reduce((a, b) => a + b, 0) / gapsFatSep.length
      : null;

    const clientesUnicos = new Set(dadosFiltrados.map(d => d.cod_cliente).filter(Boolean)).size;

    return { total, faturados, cancelados, emAndamento, atrasados, clientesUnicos, mediaGapTotal, mediaGapSep, mediaGapFatSep };
  }, [dadosFiltrados]);

  const dadosAgrupados = useMemo(() => {
    const map = new Map<string, {
      chave: string;
      nome: string;
      cod: number | null;
      pedidos: PipelineRow[];
    }>();
    dadosFiltrados.forEach(row => {
      const chave = String(row.cod_cliente ?? `s-${row.nome_fantasia ?? 'sem'}`);
      if (!map.has(chave)) {
        map.set(chave, {
          chave,
          nome: row.nome_fantasia ?? (row.cod_cliente ? `Cliente #${row.cod_cliente}` : 'Sem cliente'),
          cod: row.cod_cliente,
          pedidos: [],
        });
      }
      map.get(chave)!.pedidos.push(row);
    });
    // Grupos com pior SLA primeiro
    return Array.from(map.values()).sort((a, b) => {
      const worstOf = (pedidos: PipelineRow[]) =>
        Math.min(...pedidos.map(p => SLA_ORDER[slaEfetivoDeRow(p)] ?? 9));
      return worstOf(a.pedidos) - worstOf(b.pedidos);
    });
  }, [dadosFiltrados]);

  const thSort = (field: SortField, label: string) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-0.5 font-semibold text-gray-600 text-xs hover:text-gray-900"
    >
      {label}
      <SortIcon field={field} active={sortField} dir={sortDir} />
    </button>
  );

  return (
    <div>
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Pipeline Operacional</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Mês / Ano */}
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {meses.map(m => <option key={m.valor} value={m.valor}>{m.nome}</option>)}
            </select>
            <select
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {anos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            {/* Tipo de pedido — multi-select */}
            <MultiSelect
              label="Tipo"
              options={TIPO_OPTIONS}
              selected={tiposSelecionados}
              onChange={setTiposSelecionados}
            />

            {/* SLA — multi-select */}
            <MultiSelect
              label="SLA"
              options={SLA_OPTIONS}
              selected={slasSelecionados}
              onChange={setSlasSelecionados}
              labelMap={SLA_LABEL}
            />
          </div>
        </div>

        {/* Chips de filtros ativos */}
        {(tiposSelecionados.length > 0 || slasSelecionados.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Filtros ativos:</span>
            {tiposSelecionados.map(t => (
              <button
                key={t}
                onClick={() => setTiposSelecionados(prev => prev.filter(x => x !== t))}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[11px] rounded-full hover:bg-primary/20"
              >
                {t} <X className="h-3 w-3" />
              </button>
            ))}
            {slasSelecionados.map(s => (
              <button
                key={s}
                onClick={() => setSlasSelecionados(prev => prev.filter(x => x !== s))}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[11px] rounded-full hover:bg-primary/20"
              >
                {SLA_LABEL[s] ?? s} <X className="h-3 w-3" />
              </button>
            ))}
            <button
              onClick={() => { setTiposSelecionados([]); setSlasSelecionados([]); }}
              className="text-[10px] text-gray-400 hover:text-gray-700 ml-auto underline"
            >
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total</p>
                  <p className="text-xl font-bold text-gray-900">{kpis.total}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">pedidos no período</p>
                </div>
                <Package className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Clientes únicos</p>
                  <p className="text-xl font-bold text-gray-900">{kpis.clientesUnicos}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {kpis.clientesUnicos > 0 && kpis.total > 0
                      ? `~${(kpis.total / kpis.clientesUnicos).toFixed(1)} ped/cliente`
                      : '—'}
                  </p>
                </div>
                <Users className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Em Andamento</p>
                  <p className="text-xl font-bold text-blue-700">{kpis.emAndamento}</p>
                  <p className="text-[10px] text-blue-400 mt-0.5">
                    {kpis.total > 0 ? `${Math.round(kpis.emAndamento / kpis.total * 100)}% do total` : '—'}
                  </p>
                </div>
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Faturados</p>
                  <p className="text-xl font-bold text-green-700">{kpis.faturados}</p>
                  <p className="text-[10px] text-green-500 mt-0.5">
                    {kpis.total > 0 ? `${Math.round(kpis.faturados / kpis.total * 100)}% do total` : '—'}
                  </p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Cancelados</p>
                  <p className="text-xl font-bold text-red-700">{kpis.cancelados}</p>
                  <p className="text-[10px] text-red-400 mt-0.5">
                    {kpis.total > 0 ? `${Math.round(kpis.cancelados / kpis.total * 100)}% do total` : '—'}
                  </p>
                </div>
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Atrasados (SLA)</p>
                  <p className={`text-xl font-bold ${kpis.atrasados > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                    {kpis.atrasados}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${kpis.atrasados > 0 ? 'text-red-400' : 'text-gray-300'}`}>
                    {kpis.emAndamento > 0 ? `${Math.round(kpis.atrasados / kpis.emAndamento * 100)}% dos ativos` : '—'}
                  </p>
                </div>
                <AlertTriangle className={`h-5 w-5 ${kpis.atrasados > 0 ? 'text-red-400' : 'text-gray-300'}`} />
              </div>
            </div>
          </div>

          {/* Desempenho por Etapa */}
          {ETAPA_META.some(e => kpis[e.key] !== null) && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Desempenho por Etapa</h3>
                <span className="text-xs text-gray-400">SLA alvo: 48h total</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ETAPA_META.filter(e => kpis[e.key] !== null).map(({ key, label, desc, targetH }) => {
                  const value = kpis[key] as number;
                  const ratio = value / targetH;
                  const pct = Math.min(ratio * 100, 100);
                  const over = ratio > 1;
                  const warn = !over && ratio > 0.75;
                  const borderColor = over ? 'border-red-500' : warn ? 'border-yellow-400' : 'border-green-500';
                  const bgColor    = over ? 'bg-red-50'    : warn ? 'bg-yellow-50'    : 'bg-green-50';
                  const barColor   = over ? 'bg-red-500'   : warn ? 'bg-yellow-400'   : 'bg-green-500';
                  const valueColor = over ? 'text-red-600' : warn ? 'text-yellow-700' : 'text-green-700';
                  const badgeClass = over
                    ? 'bg-red-100 text-red-700'
                    : warn
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700';
                  const badgeLabel = over ? `+${formatH(value - targetH)} acima` : 'No prazo';
                  const pctUsado   = Math.round(ratio * 100);
                  return (
                    <div key={key} className={`border-l-4 ${borderColor} ${bgColor} rounded-r-lg p-4`}>
                      <p className="text-xs font-semibold text-gray-600 mb-0.5">{label}</p>
                      <p className="text-[10px] text-gray-400 mb-3 leading-tight">{desc}</p>
                      <div className="flex items-end justify-between mb-2">
                        <span className={`text-2xl font-bold tabular-nums leading-none ${valueColor}`}>
                          {formatH(value)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
                          {badgeLabel}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/80 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[10px] text-gray-400">{pctUsado}% da meta</span>
                        <span className="text-[10px] text-gray-400">meta: {formatH(targetH)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabela agrupada por cliente */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden mb-4">
            {/* Cabeçalho da tabela + controle expandir/colapsar */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-xs text-gray-500">
                {dadosAgrupados.length} {dadosAgrupados.length === 1 ? 'cliente' : 'clientes'} · {dadosFiltrados.length} pedidos
              </span>
              {dadosAgrupados.length > 0 && (
                <button
                  onClick={() => toggleTodos(dadosAgrupados)}
                  className="text-xs text-primary hover:underline"
                >
                  {colapsados.size === dadosAgrupados.length ? 'Expandir tudo' : 'Colapsar tudo'}
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs">Pedido</th>
                    <th className="text-left py-2 px-3 text-xs hidden md:table-cell">Vendedor</th>
                    <th className="text-left py-2 px-3 text-xs">Etapa</th>
                    <th className="py-2 px-3 text-xs hidden sm:table-cell">
                      {thSort('gap', 'Gap Total')}
                    </th>
                    <th className="text-left py-2 px-3 text-xs">SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosAgrupados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-gray-400">
                        Nenhum pedido encontrado para o período / filtros selecionados
                      </td>
                    </tr>
                  ) : (
                    dadosAgrupados.map(grupo => {
                      const collapsed = colapsados.has(grupo.chave);
                      const totalGrupo = grupo.pedidos.reduce((s, r) => s + r.valor_pedido, 0);
                      const piorSla = grupo.pedidos.reduce<string>((worst, r) => {
                        const s = slaEfetivoDeRow(r);
                        return (SLA_ORDER[s] ?? 9) < (SLA_ORDER[worst] ?? 9) ? s : worst;
                      }, 'CONCLUIDO');

                      return (
                        <React.Fragment key={grupo.chave}>
                          {/* Linha de cabeçalho do grupo */}
                          <tr
                            className="bg-gray-100 border-t border-gray-300 cursor-pointer hover:bg-gray-200 select-none"
                            onClick={() => toggleGrupo(grupo.chave)}
                          >
                            <td colSpan={5} className="py-2.5 px-3 border-l-4 border-gray-400">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  {collapsed
                                    ? <ChevronRight className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                                    : <ChevronDown className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                                  }
                                  <span className="text-xs font-semibold text-gray-900 truncate">{grupo.nome}</span>
                                  {grupo.cod && (
                                    <span className="text-[10px] text-gray-500 flex-shrink-0">#{grupo.cod}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <span className="text-[10px] text-gray-600 hidden sm:inline">
                                    {grupo.pedidos.length} {grupo.pedidos.length === 1 ? 'pedido' : 'pedidos'}
                                  </span>
                                  <span className="text-[10px] text-gray-600 hidden lg:inline font-medium">
                                    {formatMoeda(totalGrupo)}
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SLA_BADGE[piorSla] || 'bg-gray-100 text-gray-600'}`}>
                                    {SLA_LABEL[piorSla] || piorSla}
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* Linhas de pedidos do grupo */}
                          {!collapsed && grupo.pedidos.map(row => {
                            const nomeVendedor = vendedorMap[row.cod_vendedor ?? 0] ?? row.apelido_vendedor ?? '—';
                            const slaEfetivo = slaEfetivoDeRow(row);
                            return (
                              <tr
                                key={row.id}
                                className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer"
                                onClick={() => setPedidoSelecionado(row)}
                              >
                                <td className="py-2 px-3">
                                  <span className="font-medium text-gray-900">{row.pedido_interno}</span>
                                  <span className="block text-[10px] text-gray-400">{row.tipo_pedido_label}</span>
                                  {row.num_pedido_externo && (
                                    <span className="block text-[10px] text-gray-400">ext: {row.num_pedido_externo}</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 hidden md:table-cell">
                                  <span className="text-xs text-gray-600">{nomeVendedor}</span>
                                </td>
                                <td className="py-2 px-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ETAPA_BADGE[row.etapa_atual] || 'bg-gray-100 text-gray-600'}`}>
                                    {ETAPA_LABEL[row.etapa_atual] || row.etapa_atual}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-xs hidden sm:table-cell">
                                  {row.gap_total_h !== null ? (
                                    <span className="text-gray-700 font-medium tabular-nums">{formatH(row.gap_total_h)}</span>
                                  ) : row.etapa_atual !== 'CANCELADO' ? (
                                    <span className={`font-medium tabular-nums ${slaEfetivo === 'ATRASADO' ? 'text-red-600' : 'text-amber-600'}`}>
                                      {formatH(elapsedH(row.data_emissao_pedido))}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="py-2 px-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SLA_BADGE[slaEfetivo] || 'bg-gray-100 text-gray-600'}`}>
                                    {SLA_LABEL[slaEfetivo] || slaEfetivo}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Drawer de detalhe */}
      {pedidoSelecionado && (
        <DrawerDetalhePedido
          row={pedidoSelecionado}
          vendedor={vendedorMap[pedidoSelecionado.cod_vendedor ?? 0] ?? pedidoSelecionado.apelido_vendedor ?? '—'}
          slaEfetivo={slaEfetivoDeRow(pedidoSelecionado)}
          onClose={() => setPedidoSelecionado(null)}
        />
      )}
    </div>
  );
};

export default PipelineOperacional;
