import { supabase } from '../supabase';

export interface CidadeCompleta {
  cidade: string;
  rota: string;
  total_oticas: number;
  // Campos antigos (manter por compatibilidade)
  oticas_ativas: number;
  oticas_pendentes: number;
  oticas_inadimplentes: number;
  // Novos campos exclusivos
  status_ativo: number;
  status_pendente: number;
  status_inativo: number;
  status_inadimplente: number;
  // Financeiros
  soma_oportunidades: number;
  vendido_2025: number;
  saldo_metas: number;
}

export interface CidadeMapeada {
  nome: string;
  rota: string;
  clientes: {
    AT: number;
    PEN: number;
    INA: number;
  };
  somaOportunidades: number;
  saldoMetas: number;
  clientesSemVenda90d: number;
  totalClientes: number;
}

export async function getCidadesCompleto(rota?: string | null): Promise<CidadeMapeada[]> {
  try {
    console.log('🏙️ Buscando cidades via vw_cidades_completo...', { rota });
    
    // Verificar sessão antes de fazer consulta
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Erro ao obter sessão:', sessionError)
      throw new Error('Erro de autenticação: ' + sessionError.message)
    }
    
    if (!session) {
      console.error('❌ Usuário não autenticado')
      throw new Error('Usuário não autenticado')
    }
    
    console.log('🔐 Sessão ativa:', {
      userId: session.user.id,
      email: session.user.email
    });
    
    // Construir query com filtro POR VENDEDOR (padrão das outras queries)
    let query = supabase
      .from('vw_cidades_completo')
      .select('*')
      .eq('vendedor_uuid', session.user.id); // ✅ FILTRO AUSENTE ADICIONADO!
    
    // Aplicar filtro por rota se especificado
    if (rota === null) {
      // Filtrar cidades sem rota mas com clientes
      query = query.is('rota', null).gt('total_oticas', 0);
    } else if (rota) {
      query = query.eq('rota', rota);
    }
    
    const { data, error } = await query.order('cidade', { ascending: true });
    
    console.log('🏙️ Resposta da view vw_cidades_completo:', { 
      dadosCount: data?.length || 0, 
      primeirosDados: data?.slice(0, 3),
      error 
    });
    
    if (error) {
      console.error('❌ Erro ao buscar cidades:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ View vw_cidades_completo retornou dados vazios - possível problema de RLS');
      return [];
    }
    
    // Validação de integridade dos dados
    data.forEach(cidade => {
      const somaStatus = (cidade.status_ativo || 0) + (cidade.status_pendente || 0) + 
                         (cidade.status_inativo || 0) + (cidade.status_inadimplente || 0);
      
      if (somaStatus !== (cidade.total_oticas || 0)) {
        console.warn(`🔍 Inconsistência em ${cidade.cidade}: Total=${cidade.total_oticas}, Soma=${somaStatus}`);
      }
    });

    // Mapear dados da view para formato esperado pelo componente
    const cidadesMapeadas: CidadeMapeada[] = data.map((cidade: CidadeCompleta) => ({
      nome: cidade.cidade,
      rota: cidade.rota || 'SEM ROTA',
      clientes: {
        AT: cidade.status_ativo || 0,
        PEN: cidade.status_pendente || 0,
        INA: (cidade.status_inativo || 0) + (cidade.status_inadimplente || 0) // Agrupa inativos e inadimplentes
      },
      somaOportunidades: cidade.soma_oportunidades || 0,
      saldoMetas: cidade.saldo_metas || 0,
      // Para manter compatibilidade, usar campos antigos para cálculo
      clientesSemVenda90d: (cidade.total_oticas || 0) - (cidade.oticas_ativas || 0),
      totalClientes: cidade.total_oticas || 0
    }));
    
    return cidadesMapeadas;
  } catch (error) {
    console.error('Erro ao buscar cidades completo:', error);
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