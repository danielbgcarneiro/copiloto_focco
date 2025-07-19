import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, User, LogOut, Phone, MessageCircle, Mic } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserData } from '../../contexts/VendedorDataContext'
import { supabase } from '../../lib/supabase' // MUDANÇA 1: Adicionar import
import { getHistoricoVisitas } from '../../lib/queries/clientes'

// Funções de formatação
const formatarMoeda = (valor: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor || 0);
};

const formatarPercentual = (valor: number) => {
  return `${Math.round(valor || 0)}%`;
};

const formatarTelefone = (telefone: string) => {
  if (!telefone) return '';
  const limpo = telefone.replace(/\D/g, '');
  if (limpo.length === 11) {
    return `(${limpo.slice(0,2)}) ${limpo.slice(2,7)}-${limpo.slice(7)}`;
  }
  return telefone;
};

// Função para processar métricas por categoria
function processarMetricasCategoria(cliente: any) {
  if (!cliente) {
    return {
      categorias: [],
      totais: { ob: 0, pw: 0 }
    };
  }

  // Organizar dados por categoria
  const categorias = [
    {
      nome: 'RX Feminino',
      ob: cliente.rx_fem_ob || 0,
      pw: cliente.rx_fem_pw || 0
    },
    {
      nome: 'RX Masculino', 
      ob: cliente.rx_mas_ob || 0,
      pw: cliente.rx_mas_pw || 0
    },
    {
      nome: 'SOL Feminino',
      ob: cliente.sol_fem_ob || 0,
      pw: cliente.sol_fem_pw || 0
    },
    {
      nome: 'SOL Masculino',
      ob: cliente.sol_mas_ob || 0,
      pw: cliente.sol_mas_pw || 0
    }
  ];

  // Calcular totais
  const totais = {
    ob: (cliente.rx_fem_ob || 0) + (cliente.rx_mas_ob || 0) + (cliente.sol_fem_ob || 0) + (cliente.sol_mas_ob || 0),
    pw: (cliente.rx_fem_pw || 0) + (cliente.rx_mas_pw || 0) + (cliente.sol_fem_pw || 0) + (cliente.sol_mas_pw || 0)
  };

  return {
    categorias,
    totais
  };
}

const DetalhesCliente: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { } = useUserData()
  const { id, rotaId, cidadeNome, clienteId } = useParams<{ 
    id?: string; 
    rotaId?: string; 
    cidadeNome?: string; 
    clienteId?: string; 
  }>()
  const [cliente, setCliente] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [historicoVisitas, setHistoricoVisitas] = useState<any[]>([])
  const [loadingVisitas, setLoadingVisitas] = useState(false)

  // Determinar qual ID usar (hierárquico ou direto)
  const codigoCliente = clienteId || id
  
  // Decodificar parâmetros da navegação hierárquica
  const rotaNome = rotaId ? decodeURIComponent(rotaId) : null
  const cidadeDecodificada = cidadeNome ? decodeURIComponent(cidadeNome) : null
  
  // Função para navegar de volta
  const voltarParaClientes = () => {
    if (rotaNome && cidadeDecodificada) {
      // Navegação hierárquica
      navigate(`/rotas/${encodeURIComponent(rotaNome)}/cidades/${encodeURIComponent(cidadeDecodificada)}/clientes`)
    } else {
      // Navegação direta (fallback)
      navigate('/clientes')
    }
  }

  // TESTE TEMPORÁRIO - REMOVIDO PARA EVITAR CONSULTAS DUPLICADAS
  // useEffect(() => {
  //   async function testSupabaseAccess() {
  //     console.log('🧪 INICIANDO TESTE DE ACESSO...');
  //     
  //     const { data: { user } } = await supabase.auth.getUser()
  //     console.log('🔐 Current user:', {
  //       id: user?.id,
  //       email: user?.email,
  //       isAuthenticated: !!user
  //     })
  //     
  //     if (!user) {
  //       console.log('❌ Usuário não autenticado - parando testes');
  //       return;
  //     }
      
  //     // Teste 1: Acesso direto à view (RLS-safe)
  //     console.log('🧪 Teste 1: vw_clientes_completo');
  //     try {
  //       const { data: t1, error: e1 } = await supabase
  //         .from('vw_clientes_completo')
  //         .select('codigo_cliente, nome_fantasia')
  //         .eq('codigo_cliente', 100273)
  //       
  //       console.log('Test 1 - tabela_clientes:', { data: t1, error: e1 })
  //     } catch (err) {
  //       console.log('Test 1 - Erro:', err);
  //     }
  //     
  //     // Teste 2: Acesso à view
  //     console.log('🧪 Teste 2: vw_clientes_completo');
  //     try {
  //       const { data: t2, error: e2 } = await supabase
  //         .from('vw_clientes_completo')
  //         .select('codigo_cliente, nome_fantasia')
  //         .eq('codigo_cliente', 100273)
  //       
  //       console.log('Test 2 - vw_clientes_completo:', { data: t2, error: e2 })
  //     } catch (err) {
  //       console.log('Test 2 - Erro:', err);
  //     }
  //     
  //     // Teste 3: RPC
  //     console.log('🧪 Teste 3: RPC get_cliente_detalhes');
  //     try {
  //       const rpcResult = await supabase.rpc('get_cliente_detalhes', { p_codigo_cliente: 100273 });
  //       console.log('Test 3 - RPC:', rpcResult);
  //     } catch (err) {
  //       console.log('Test 3 - Erro:', err);
  //     }
  //   }
  //   
  //   testSupabaseAccess()
  // }, [])

  async function carregarHistoricoVisitas(clienteIdNumerico: number) {
    try {
      setLoadingVisitas(true);
      const visitas = await getHistoricoVisitas(clienteIdNumerico);
      setHistoricoVisitas(visitas);
    } catch (error) {
      console.error('Erro ao carregar histórico de visitas:', error);
    } finally {
      setLoadingVisitas(false);
    }
  }

  useEffect(() => {
    async function carregarCliente() {
      if (!codigoCliente) {
        console.log('❌ ID não fornecido');
        return;
      }
      
      const clienteIdNumerico = parseInt(codigoCliente);
      if (isNaN(clienteIdNumerico)) {
        console.log('❌ ID inválido:', codigoCliente);
        setError('ID do cliente inválido');
        setLoading(false);
        return;
      }
      
      console.log('🔍 Carregando cliente com ID:', clienteIdNumerico);
      
      try {
        setLoading(true);
        console.log('📞 Buscando dados diretamente da view para ID:', clienteIdNumerico);
        
        // Buscar dados básicos da view
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('Usuário não autenticado');
        }

        const { data: dadosBasicos, error: errorBasicos } = await supabase
          .from('vw_clientes_completo')
          .select('*')
          .eq('codigo_cliente', clienteIdNumerico)
          .eq('vendedor_uuid', user.id)
          .single();
          
        if (errorBasicos) {
          throw errorBasicos;
        }
        
        console.log('✅ Dados básicos recebidos:', dadosBasicos);
        
        // Buscar dados de análise RFM com verificação de segurança
        // Como a tabela analise_rfm não tem vendedor_uuid, vamos garantir 
        // que só buscamos dados de clientes que o vendedor tem acesso
        const { data: dadosRFM, error: errorRFM } = await supabase
          .from('analise_rfm')
          .select(`
            qtd_compras_ano_anterior, 
            qtd_compras_ano_atual, 
            valor_ano_anterior, 
            valor_ano_atual, 
            meta_ano_atual, 
            percentual_atingimento, 
            estrelas, 
            acao_recomendada, 
            previsao_pedido, 
            dias_sem_comprar,
            codigo_cliente,
            data_analise
          `)
          .eq('codigo_cliente', clienteIdNumerico)
          .order('data_analise', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (errorRFM) {
          console.warn('⚠️ Erro ao buscar dados RFM:', errorRFM);
        }
        
        console.log('✅ Dados RFM recebidos:', dadosRFM);
        
        // Buscar métricas por categoria (Mix de Produtos)
        const { data: metricasCategoria, error: errorMetricas } = await supabase
          .from('vw_metricas_categoria_cliente')
          .select('*')
          .eq('codigo_cliente', clienteIdNumerico)
          .maybeSingle();
        
        if (errorMetricas) {
          console.warn('⚠️ Erro ao buscar métricas de categoria:', errorMetricas);
        }
        
        console.log('✅ Métricas categoria recebidas:', metricasCategoria);
        
        // AGREGAR dados básicos COM dados RFM E métricas
        const dadosCompletos = {
          ...dadosBasicos,
          ...(dadosRFM || {}),
          ...(metricasCategoria || {})
        };
        
        setCliente(dadosCompletos);
        
        // Carregar histórico de visitas
        await carregarHistoricoVisitas(clienteIdNumerico);
        
        console.log('🔍 DEBUG - Dados carregados:', {
          codigo_cliente: dadosCompletos.codigo_cliente,
          qtd_2024: dadosCompletos.qtd_compras_ano_anterior,
          qtd_2025: dadosCompletos.qtd_compras_ano_atual,
          tipo_qtd_2024: typeof dadosCompletos.qtd_compras_ano_anterior,
          tipo_qtd_2025: typeof dadosCompletos.qtd_compras_ano_atual,
          tem_qtd_2024: 'qtd_compras_ano_anterior' in dadosCompletos,
          tem_qtd_2025: 'qtd_compras_ano_atual' in dadosCompletos,
          valor_exato_2024: dadosCompletos.qtd_compras_ano_anterior,
          valor_exato_2025: dadosCompletos.qtd_compras_ano_atual,
          dados_completos: dadosCompletos
        });
      } catch (err) {
        console.error('❌ Erro ao carregar cliente:', err);
        let mensagemErro = `Erro ao carregar dados do cliente ID ${id}`;
        
        // Adicionar detalhes específicos do erro
        if (err instanceof Error) {
          mensagemErro += `\n\nDetalhes do erro: ${err.message}`;
        } else if (typeof err === 'object' && err !== null) {
          mensagemErro += `\n\nDetalhes: ${JSON.stringify(err, null, 2)}`;
        }
        
        setError(mensagemErro);
      } finally {
        setLoading(false);
        console.log('🏁 Loading finalizado');
      }
    }

    carregarCliente();
  }, [codigoCliente]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados do cliente...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <pre className="text-red-600 text-sm text-left whitespace-pre-wrap">{error}</pre>
          </div>
          <button 
            onClick={voltarParaClientes}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
          >
            Voltar para Clientes
          </button>
        </div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Cliente não encontrado</p>
          <button 
            onClick={voltarParaClientes}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
          >
            Voltar para Clientes
          </button>
        </div>
      </div>
    );
  }

  // Usar os dados reais do cliente
  const dadosCliente = {
    nome: cliente.nome_fantasia,
    status: cliente.status_financeiro,
    codigo: cliente.codigo_cliente,
    dsv: cliente.dias_sem_comprar,
    vendas2025: cliente.valor_ano_atual,
    vendas2024: cliente.valor_ano_anterior,
    oportunidade: cliente.previsao_pedido,
    meta: cliente.meta_ano_atual,
    qtdVendas2025: cliente.qtd_compras_ano_atual ?? 0,  // Com fallback
    qtdVendas2024: cliente.qtd_compras_ano_anterior ?? 0,  // Com fallback
    percentualMeta: cliente.percentual_atingimento,
    acaoRecomendada: cliente.acao_recomendada,
    celular: cliente.celular || '',  // Com fallback
    estrelas: cliente.estrelas || 0,
    statusErp: cliente.status_erp,
    statusErpDesc: cliente.status_erp_desc,
    statusComercial: cliente.status_comercial,
    statusDisplay: cliente.status_display,
    limiteCredito: cliente.valor_limite_credito,
    saldoUtilizado: cliente.saldo_utilizado,
    limiteDisponivel: cliente.limite_disponivel
  };

  // Processar Métricas por Categoria
  const metricasCategoria = processarMetricasCategoria(cliente);

  console.log('Cliente ID:', codigoCliente)
  console.log('Dados do cliente:', dadosCliente)
  console.log('🔍 DEBUG FINAL - Quantidades:', {
    qtdVendas2025_final: dadosCliente.qtdVendas2025,
    qtdVendas2024_final: dadosCliente.qtdVendas2024,
    tipo_qtd_2025: typeof dadosCliente.qtdVendas2025,
    tipo_qtd_2024: typeof dadosCliente.qtdVendas2024,
    origem_qtd_2025: cliente.qtd_compras_ano_atual,
    origem_qtd_2024: cliente.qtd_compras_ano_anterior
  })
  console.log('Métricas categoria:', metricasCategoria)


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 relative">
            <div className="flex items-center">
              <button 
                onClick={voltarParaClientes}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center absolute left-1/2 transform -translate-x-1/2">
              <h1 className="text-lg font-bold">Copiloto</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5">
                <User className="h-4 w-4" />
                <span className="text-sm">{user?.apelido || user?.nome || user?.email || 'Usuário'}</span>
              </div>
              <button 
                onClick={() => { logout(); navigate('/') }}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 lg:py-8">
        {/* Breadcrumb */}
        {(rotaNome || cidadeDecodificada) && (
          <div className="mb-4 px-2">
            <div className="flex items-center text-sm text-gray-600">
              {rotaNome && <span>Rota: <span className="font-semibold text-primary">{rotaNome}</span></span>}
              {rotaNome && cidadeDecodificada && <span className="mx-2">•</span>}
              {cidadeDecodificada && <span>Cidade: <span className="font-semibold text-primary">{cidadeDecodificada}</span></span>}
              {(rotaNome || cidadeDecodificada) && cliente && <span className="mx-2">•</span>}
              {cliente && <span>Cliente: <span className="font-semibold text-primary">{cliente.nome_fantasia}</span></span>}
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
          {/* Cliente Info */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-gray-900">{dadosCliente.nome}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  dadosCliente.status === 'ADIMPLENTE' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {dadosCliente.status}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-600">DSV:</span>
                <span className="text-xs font-semibold text-red-600">{dadosCliente.dsv}d</span>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 leading-tight">Cód: {dadosCliente.codigo}</p>
              {dadosCliente.estrelas > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-gray-900">{dadosCliente.estrelas}</span>
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                      <filter id="starShadow">
                        <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
                      </filter>
                    </defs>
                    <path
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                      fill="url(#starGradient)"
                      stroke="#d97706"
                      strokeWidth="1"
                      strokeLinejoin="round"
                      filter="url(#starShadow)"
                    />
                    <path
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                      fill="url(#starGradient)"
                      opacity="0.9"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Dados Financeiros */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-2 text-xs leading-tight">
              <div className="leading-tight">
                <span className="text-gray-600">2025: </span>
                <span className="font-semibold">{formatarMoeda(dadosCliente.vendas2025)}</span>
              </div>
              <div className="text-right leading-tight">
                <span className="text-gray-600">Qnt: {dadosCliente.qtdVendas2025}</span>
              </div>
              
              <div className="leading-tight">
                <span className="text-gray-600">2024: </span>
                <span className="font-semibold">{formatarMoeda(dadosCliente.vendas2024)}</span>
              </div>
              <div className="text-right leading-tight">
                <span className="text-gray-600">Qnt: {dadosCliente.qtdVendas2024}</span>
              </div>
              
              <div className="leading-tight">
                <span className="text-green-600">Oport: </span>
                <span className="font-semibold text-green-700">{formatarMoeda(dadosCliente.oportunidade)}</span>
              </div>
              <div></div>
              
              <div className="leading-tight">
                <span className="text-blue-600">Meta: </span>
                <span className="font-semibold text-blue-700">{formatarMoeda(dadosCliente.meta)}</span>
              </div>
              <div className="text-right leading-tight">
                <span className="text-gray-600">Ating: {formatarPercentual(dadosCliente.percentualMeta)}</span>
              </div>
            </div>
            
            {/* Indicador de Urgência - Meta em risco */}
            {dadosCliente.percentualMeta < 50 && (
              <div className="mt-3 flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-alert h-4 w-4 mt-0.5 flex-shrink-0 text-gray-600" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" x2="12" y1="8" y2="12"></line>
                  <line x1="12" x2="12.01" y1="16" y2="16"></line>
                </svg>
                <p className="text-xs font-medium text-gray-900 leading-tight">URGENTE - Meta em risco (&lt;50%)</p>
              </div>
            )}
          </div>

          {/* Mix de Produtos */}
          <div className="mb-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Mix últimos 12 meses</h3>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
              {metricasCategoria.categorias.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="text-left">
                      <th className="pb-2 text-xs font-medium text-gray-700"></th>
                      <th className="pb-2 text-right text-xs font-medium text-gray-700">OB</th>
                      <th className="pb-2 text-right text-xs font-medium text-gray-700">PW</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricasCategoria.categorias.map((categoria, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="py-2 text-xs font-medium text-gray-900">{categoria.nome}</td>
                        <td className="py-2 text-right text-xs font-semibold text-gray-900">{categoria.ob}</td>
                        <td className="py-2 text-right text-xs font-semibold text-gray-900">{categoria.pw}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-400 font-bold">
                      <td className="pt-2 text-xs font-bold text-gray-900">TOTAL</td>
                      <td className="pt-2 text-right text-xs font-bold text-gray-900">{metricasCategoria.totais.ob}</td>
                      <td className="pt-2 text-right text-xs font-bold text-gray-900">{metricasCategoria.totais.pw}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">Nenhum produto encontrado para este cliente</p>
              )}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="pt-4 border-t border-gray-200">
            <div className="space-y-2">
              {/* Botão Ligar */}
              <button
                onClick={() => {
                  if (dadosCliente.celular) {
                    window.location.href = `tel:${dadosCliente.celular}`;
                  } else {
                    alert('Cliente sem telefone cadastrado');
                  }
                }}
                className={`w-full py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  dadosCliente.celular 
                    ? 'bg-primary text-white hover:bg-primary/90' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!dadosCliente.celular}
              >
                <Phone className="h-4 w-4" />
                <span className="text-sm">
                  {dadosCliente.celular ? `Ligar (${formatarTelefone(dadosCliente.celular)})` : 'Sem telefone'}
                </span>
              </button>

              {/* Botão WhatsApp */}
              <button
                onClick={() => {
                  if (dadosCliente.celular) {
                    // Remover caracteres não numéricos e adicionar código do país se necessário
                    const numeroLimpo = dadosCliente.celular.replace(/\D/g, '');
                    const numeroWhatsApp = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;
                    window.open(`https://wa.me/${numeroWhatsApp}`, '_blank');
                  } else {
                    alert('Cliente sem WhatsApp cadastrado');
                  }
                }}
                className={`w-full py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  dadosCliente.celular 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!dadosCliente.celular}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">
                  {dadosCliente.celular ? 'WhatsApp' : 'Sem WhatsApp'}
                </span>
              </button>

              {/* Botão Gravar Áudio - Desabilitado */}
              <button
                disabled
                className="w-full bg-gray-400 text-white py-2.5 rounded-lg cursor-not-allowed flex items-center justify-center gap-2 opacity-50"
              >
                <Mic className="h-4 w-4" />
                <span className="text-sm">Gravar Áudio (Em breve)</span>
              </button>
            </div>
          </div>

          {/* Seção de Visitas Recentes */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Visitas Recentes</h3>
            
            {loadingVisitas ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-gray-600">Carregando visitas...</span>
              </div>
            ) : historicoVisitas.length > 0 ? (
              <div className="max-h-32 overflow-y-auto">
                <ul className="space-y-1">
                  {historicoVisitas.slice(0, 4).map((visita, index) => (
                    <li key={index} className="flex items-center justify-between py-1">
                      <span className={`text-xs ${visita.status === 'cancelado' ? 'line-through opacity-50' : ''}`}>
                        • {new Date(visita.data_visita).toLocaleDateString('pt-BR')} {new Date(visita.data_visita).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {visita.status === 'cancelado' && (
                        <span className="text-xs text-red-500">Cancelado</span>
                      )}
                    </li>
                  ))}
                  {historicoVisitas.length > 4 && (
                    <li className="text-xs text-gray-500 italic pt-1">
                      + {historicoVisitas.length - 4} visitas anteriores
                    </li>
                  )}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-gray-500 py-2">Nenhuma visita registrada</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default DetalhesCliente