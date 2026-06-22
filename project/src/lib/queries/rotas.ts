/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */


import { supabase } from '../supabase';

export interface RotaMapeada {
  nome: string;
  /**
   * Grão da rota: 'bairro' = macrorregião (vive dentro de uma única cidade) |
   * 'cidade' = rota de cidade/interior. Resolvido via vw_cliente_rota.
   * Usado para decidir o drill-down: macrorregião pula a página /cidades.
   * Invariante validada no banco: nenhuma rota mistura grãos.
   */
  grao: 'bairro' | 'cidade';
  totalCidades: number;
  totalOticas: number;
  somaOportunidades: number;
  semVendas120d: number;
  status: 'Ativo' | 'Inativo';
  metaAnoAtual: number;
  saldoMeta: number;
  percentualMeta: number;
}

export async function getRotasCompleto(): Promise<RotaMapeada[]> {
  try {
    console.log('🛣️ Buscando rotas (construindo a partir de tabelas base)...');

    // 1. Verificar sessão
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('❌ Erro ao obter sessão:', sessionError)
      throw new Error('Erro de autenticação: ' + sessionError.message)
    }

    if (!session) {
      console.error('❌ Usuário não autenticado')
      throw new Error('Usuário não autenticado')
    }

    console.log('🔐 Sessão ativa:', { userId: session.user.id });

    // 2. Buscar rotas do vendedor
    const { data: rotasVendedor, error: rotasError } = await supabase
      .from('vendedor_rotas')
      .select('rota')
      .eq('vendedor_id', session.user.id)
      .eq('ativo', true);

    if (rotasError) {
      console.error('❌ Erro ao buscar rotas do vendedor:', rotasError);
      return [];
    }

    if (!rotasVendedor || rotasVendedor.length === 0) {
      console.log('⚠️ Nenhuma rota encontrada para o vendedor');
      return [];
    }

    const rotas = rotasVendedor.map(r => r.rota);
    console.log('📍 Rotas do vendedor:', rotas);

    // 3. Buscar perfil do vendedor para pegar cod_vendedor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('cod_vendedor')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ Erro ao buscar perfil do vendedor:', profileError);
      return [];
    }

    // 4. Resolver a rota de cada cliente via vw_cliente_rota (bairro tem precedência sobre cidade)
    const { data: clienteRotas, error: clienteRotasError } = await supabase
      .from('vw_cliente_rota')
      .select('codigo_cliente, rota_resolvida, cidade, grao')
      .eq('cod_vendedor', profile.cod_vendedor)
      .not('rota_resolvida', 'is', null);

    if (clienteRotasError) {
      console.error('❌ Erro ao resolver rotas dos clientes:', clienteRotasError);
      return [];
    }

    // Mapeamento codigo_cliente -> { rota, cidade, grao } (grão misto: bairro ou cidade)
    const clienteRotaMap = new Map<number, { rota: string; cidade: string; grao: 'bairro' | 'cidade' }>();
    // Grão por rota: macrorregião = 'bairro'. Invariante validada (nenhuma rota mistura
    // grãos), então a primeira ocorrência basta — usamos 'bairro' como precedência defensiva.
    const rotaGraoMap = new Map<string, 'bairro' | 'cidade'>();
    clienteRotas?.forEach(cr => {
      if (cr.rota_resolvida) {
        const grao: 'bairro' | 'cidade' = cr.grao === 'bairro' ? 'bairro' : 'cidade';
        clienteRotaMap.set(cr.codigo_cliente, { rota: cr.rota_resolvida, cidade: cr.cidade ?? '', grao });
        if (grao === 'bairro' || !rotaGraoMap.has(cr.rota_resolvida)) {
          rotaGraoMap.set(cr.rota_resolvida, grao);
        }
      }
    });

    console.log('🗺️ Rota resolvida por cliente:', clienteRotaMap.size, 'clientes');

    // 5. Buscar clientes do vendedor com dados RFM
    const { data: clientes, error: clientesError } = await supabase
      .from('tabela_clientes')
      .select(`
        codigo_cliente,
        codigo_ibge_cidade,
        cidade,
        analise_rfm (
          valor_ano_atual,
          meta_ano_atual,
          previsao_pedido,
          dias_sem_comprar
        )
      `)
      .eq('cod_vendedor', profile.cod_vendedor)
      .not('situacao', 'in', '("I","B")');

    if (clientesError) {
      console.error('❌ Erro ao buscar clientes:', clientesError);
      return [];
    }

    console.log('👥 Clientes encontrados:', clientes?.length || 0);

    // 6. Agrupar dados por rota
    interface RotaStats {
      nome: string;
      totalCidades: Set<string>;
      totalOticas: number;
      somaOportunidades: number;
      semVendas120d: number;
      metaAnoAtual: number;
      valorAnoAtual: number;
    }

    const rotasMap = new Map<string, RotaStats>();

    // Inicializar todas as rotas com valores zero
    rotas.forEach(rota => {
      rotasMap.set(rota, {
        nome: rota,
        totalCidades: new Set<string>(),
        totalOticas: 0,
        somaOportunidades: 0,
        semVendas120d: 0,
        metaAnoAtual: 0,
        valorAnoAtual: 0
      });
    });

    // Agregar dados dos clientes por rota
    clientes?.forEach((cliente: any) => {
      const rota = clienteRotaMap.get(cliente.codigo_cliente)?.rota;

      if (rota && rotasMap.has(rota)) {
        const stats = rotasMap.get(rota)!;

        // Adicionar cidade ao Set (automaticamente evita duplicatas)
        if (cliente.cidade) {
          stats.totalCidades.add(cliente.cidade);
        }

        stats.totalOticas += 1;

        if (cliente.analise_rfm) {
          stats.valorAnoAtual += cliente.analise_rfm.valor_ano_atual || 0;
          stats.metaAnoAtual += cliente.analise_rfm.meta_ano_atual || 0;
          stats.somaOportunidades += cliente.analise_rfm.previsao_pedido || 0;

          // Considerar sem vendas se dias_sem_comprar >= 120
          if ((cliente.analise_rfm.dias_sem_comprar || 0) >= 120) {
            stats.semVendas120d += 1;
          }
        }
      }
    });

    // 7. Converter para array e calcular métricas finais
    const rotasMapeadas: RotaMapeada[] = Array.from(rotasMap.values())
      .map(stats => ({
        nome: stats.nome,
        grao: rotaGraoMap.get(stats.nome) ?? 'cidade',
        totalCidades: stats.totalCidades.size,
        totalOticas: stats.totalOticas,
        somaOportunidades: stats.somaOportunidades,
        semVendas120d: stats.semVendas120d,
        status: 'Ativo' as 'Ativo' | 'Inativo',
        metaAnoAtual: stats.metaAnoAtual,
        saldoMeta: stats.metaAnoAtual > 0 ? stats.metaAnoAtual - stats.valorAnoAtual : 0,
        percentualMeta: stats.metaAnoAtual > 0 ? (stats.valorAnoAtual / stats.metaAnoAtual) * 100 : 0
      }))
      // Ordenar por percentual de meta (maior primeiro)
      .sort((a, b) => b.percentualMeta - a.percentualMeta)
      // Filtrar rotas sem clientes
      .filter(rota => rota.totalOticas > 0);

    console.log(`✅ ${rotasMapeadas.length} rotas processadas`);
    return rotasMapeadas;
  } catch (error) {
    console.error('💥 Erro ao buscar rotas completo:', error);
    throw error;
  }
}

/**
 * Retorna o grão de uma rota ('bairro' = macrorregião | 'cidade'), ou null se a
 * rota não resolve nenhum cliente para o vendedor logado. Usado pelo fallback de
 * navegação (entrada por URL direta em /cidades de uma macrorregião).
 */
export async function getGraoDaRota(rota: string): Promise<'bairro' | 'cidade' | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('cod_vendedor')
    .eq('id', session.user.id)
    .single();
  if (!profile) return null;

  const { data, error } = await supabase
    .from('vw_cliente_rota')
    .select('grao')
    .eq('cod_vendedor', profile.cod_vendedor)
    .eq('rota_resolvida', rota)
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return data[0].grao === 'bairro' ? 'bairro' : 'cidade';
}

// Função SEPARADA para buscar métricas detalhadas por cidade
export async function getMetricasDetalhadasPorRota(): Promise<RotaMapeada[]> {
  try {
    console.log('📊 Buscando métricas detalhadas via vw_metricas_por_cidade...');
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Usuário não autenticado');
    
    // 1. Buscar rotas do vendedor
    const { data: rotasVendedor } = await supabase
      .from('vendedor_rotas')
      .select('rota')
      .eq('vendedor_id', session.user.id)
      .eq('ativo', true);
    
    if (!rotasVendedor || rotasVendedor.length === 0) return [];
    
    // 2. Buscar métricas POR CIDADE
    const rotasNomes = rotasVendedor.map(r => r.rota);
    const { data: cidadesData, error } = await supabase
      .from('vw_metricas_por_cidade')
      .select('*')
      .in('rota', rotasNomes);
    
    if (error || !cidadesData) return [];
    
    // 3. AGREGAR por rota
    const rotasAgregadas = cidadesData.reduce((acc: Record<string, RotaMapeada>, cidade: any) => {
      const rotaName = cidade.rota;
      
      if (!acc[rotaName]) {
        acc[rotaName] = {
          nome: rotaName,
          grao: 'cidade',
          totalCidades: 0,
          totalOticas: 0,
          somaOportunidades: 0,
          semVendas120d: 0,
          status: 'Ativo' as 'Ativo' | 'Inativo',
          metaAnoAtual: 0,
          saldoMeta: 0,
          percentualMeta: 0
        };
      }
      
      acc[rotaName].totalCidades += 1;
      acc[rotaName].totalOticas += cidade.total_clientes || 0;
      acc[rotaName].somaOportunidades += cidade.soma_oportunidades || 0;
      acc[rotaName].semVendas120d += cidade.clientes_sem_venda_90d || 0;
      
      return acc;
    }, {});
    
    return Object.values(rotasAgregadas);
  } catch (error) {
    console.error('💥 Erro ao buscar métricas detalhadas:', error);
    return [];
  }
}

// Função auxiliar para formatação de moeda (reutilizada de cidades.ts)
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(valor);
}

// Função auxiliar para normalizar texto (reutilizada de cidades.ts)
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/gi, '') // Remove caracteres especiais exceto espaços
    .toLowerCase()
    .trim();
}