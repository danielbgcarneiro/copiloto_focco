import { supabase } from '../supabase';

export interface CidadeMapeada {
  nome: string;
  rota: string;
  somaOportunidades: number;
  clientesSemVenda90d: number;
  totalClientes: number;
  somaMetas: number;
  vendido2025: number;
  saldoMetas: number;
  atingimento: number;
}

export async function getCidadesCompleto(rota?: string | null): Promise<CidadeMapeada[]> {
  try {
    console.log('🏙️ Buscando cidades (construindo a partir de tabelas base)...', { rota });

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

    // 2. Buscar perfil do vendedor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('cod_vendedor')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ Erro ao buscar perfil:', profileError);
      return [];
    }

    // 3. Buscar rotas do vendedor (se não filtrou por rota específica)
    let rotasFiltro: string[] = [];
    if (rota) {
      rotasFiltro = [rota];
    } else {
      const { data: rotasVendedor } = await supabase
        .from('vendedor_rotas')
        .select('rota')
        .eq('vendedor_id', session.user.id)
        .eq('ativo', true);

      rotasFiltro = rotasVendedor?.map(r => r.rota) || [];
    }

    if (rotasFiltro.length === 0) {
      console.log('⚠️ Nenhuma rota encontrada');
      return [];
    }

    // 4. Buscar mapeamento de rotas_estado
    const { data: rotasEstado } = await supabase
      .from('rotas_estado')
      .select('codigo_ibge_cidade, cidade, rota')
      .in('rota', rotasFiltro);

    // Criar mapeamento codigo_ibge_cidade -> rota
    const cidadeRotaMap = new Map<string, string>();
    rotasEstado?.forEach(re => {
      if (re.codigo_ibge_cidade) {
        cidadeRotaMap.set(re.codigo_ibge_cidade, re.rota);
      }
    });

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
      .eq('cod_vendedor', profile.cod_vendedor);

    if (clientesError) {
      console.error('❌ Erro ao buscar clientes:', clientesError);
      return [];
    }

    console.log('👥 Clientes encontrados:', clientes?.length || 0);

    // 6. Agrupar por cidade
    interface CidadeStats {
      nome: string;
      rota: string;
      totalClientes: number;
      somaOportunidades: number;
      somaMetas: number;
      vendido2025: number;
      clientesSemVenda90d: number;
    }

    const cidadesMap = new Map<string, CidadeStats>();

    clientes?.forEach((cliente: any) => {
      const rotaCliente = cidadeRotaMap.get(cliente.codigo_ibge_cidade);

      // Filtrar pela rota se especificado
      if (rota && rotaCliente !== rota) return;
      if (!rotaCliente && rota !== null) return;

      const nomeCidade = cliente.cidade || 'Sem Cidade';
      const key = `${nomeCidade}|${rotaCliente || 'SEM ROTA'}`;

      if (!cidadesMap.has(key)) {
        cidadesMap.set(key, {
          nome: nomeCidade,
          rota: rotaCliente || 'SEM ROTA',
          totalClientes: 0,
          somaOportunidades: 0,
          somaMetas: 0,
          vendido2025: 0,
          clientesSemVenda90d: 0
        });
      }

      const stats = cidadesMap.get(key)!;
      stats.totalClientes += 1;

      // Contabilizar métricas RFM
      if (cliente.analise_rfm) {
        stats.vendido2025 += cliente.analise_rfm.valor_ano_atual || 0;
        stats.somaMetas += cliente.analise_rfm.meta_ano_atual || 0;
        stats.somaOportunidades += cliente.analise_rfm.previsao_pedido || 0;

        // Clientes sem venda há +90 dias
        if ((cliente.analise_rfm.dias_sem_comprar || 0) >= 90) {
          stats.clientesSemVenda90d += 1;
        }
      }
    });

    // 7. Converter para array e calcular métricas finais
    const cidadesMapeadas: CidadeMapeada[] = Array.from(cidadesMap.values())
      .map(stats => ({
        nome: stats.nome,
        rota: stats.rota,
        somaOportunidades: stats.somaOportunidades,
        clientesSemVenda90d: stats.clientesSemVenda90d,
        totalClientes: stats.totalClientes,
        somaMetas: stats.somaMetas,
        vendido2025: stats.vendido2025,
        saldoMetas: stats.somaMetas - stats.vendido2025,
        atingimento: stats.somaMetas > 0 ? (stats.vendido2025 / stats.somaMetas) * 100 : 0
      }))
      .filter(cidade => cidade.totalClientes > 0)
      .sort((a, b) => a.nome.localeCompare(b.nome));

    console.log(`✅ ${cidadesMapeadas.length} cidades processadas`);
    return cidadesMapeadas;
  } catch (error) {
    console.error('💥 Erro ao buscar cidades completo:', error);
    throw error;
  }
}

// Função auxiliar para formatação de moeda
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(valor);
}

// Função auxiliar para normalizar texto (remoção de acentos)
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/gi, '') // Remove caracteres especiais exceto espaços
    .toLowerCase()
    .trim();
}