import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, User, LogOut, Phone, MessageCircle, Mic } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserData } from '../../contexts/VendedorDataContext'
import { getClienteDetalhes } from '../../lib/queries/cliente'
import { supabase } from '../../lib/supabase' // MUDANÇA 1: Adicionar import

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
  const { id } = useParams()
  const [cliente, setCliente] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // TESTE TEMPORÁRIO - REMOVER APÓS DEBUG
  useEffect(() => {
    async function testSupabaseAccess() {
      console.log('🧪 INICIANDO TESTE DE ACESSO...');
      
      const { data: { user } } = await supabase.auth.getUser()
      console.log('🔐 Current user:', {
        id: user?.id,
        email: user?.email,
        isAuthenticated: !!user
      })
      
      if (!user) {
        console.log('❌ Usuário não autenticado - parando testes');
        return;
      }
      
      // Teste 1: Acesso direto à tabela
      console.log('🧪 Teste 1: tabela_clientes');
      try {
        const { data: t1, error: e1 } = await supabase
          .from('tabela_clientes')
          .select('codigo_cliente, nome_fantasia')
          .eq('codigo_cliente', 100273)
        
        console.log('Test 1 - tabela_clientes:', { data: t1, error: e1 })
      } catch (err) {
        console.log('Test 1 - Erro:', err);
      }
      
      // Teste 2: Acesso à view
      console.log('🧪 Teste 2: vw_clientes_completo');
      try {
        const { data: t2, error: e2 } = await supabase
          .from('vw_clientes_completo')
          .select('codigo_cliente, nome_fantasia')
          .eq('codigo_cliente', 100273)
        
        console.log('Test 2 - vw_clientes_completo:', { data: t2, error: e2 })
      } catch (err) {
        console.log('Test 2 - Erro:', err);
      }
      
      // Teste 3: RPC
      console.log('🧪 Teste 3: RPC get_cliente_detalhes');
      try {
        const rpcResult = await supabase.rpc('get_cliente_detalhes', { p_codigo_cliente: 100273 });
        console.log('Test 3 - RPC:', rpcResult);
      } catch (err) {
        console.log('Test 3 - Erro:', err);
      }
    }
    
    testSupabaseAccess()
  }, [])

  useEffect(() => {
    async function carregarCliente() {
      if (!id) {
        console.log('❌ ID não fornecido');
        return;
      }
      
      console.log('🔍 Carregando cliente com ID:', id);
      
      try {
        setLoading(true);
        console.log('📞 Chamando getClienteDetalhes com ID:', parseInt(id));
        const dados = await getClienteDetalhes(parseInt(id));
        console.log('✅ Dados recebidos:', dados);
        
        // MUDANÇA 2: Buscar métricas de categoria separadamente
        const { data: metricas, error: errorMetricas } = await supabase
          .from('vw_metricas_categoria_cliente')
          .select('*')
          .eq('codigo_cliente', parseInt(id))
          .single();
        
        if (errorMetricas) {
          console.warn('⚠️ Erro ao buscar métricas:', errorMetricas);
        }
        
        // MUDANÇA 3: Combinar dados com métricas
        const dadosCompletos = {
          ...dados,
          ...(metricas || {})
        };
        
        setCliente(dadosCompletos);
        
        console.log('🔍 DEBUG - Dados carregados:', {
          codigo_cliente: dadosCompletos.codigo_cliente,
          qtd_2024: dadosCompletos.qtd_compras_2024,
          qtd_2025: dadosCompletos.qtd_compras_2025,
          tipo_qtd_2024: typeof dadosCompletos.qtd_compras_2024,
          tipo_qtd_2025: typeof dadosCompletos.qtd_compras_2025,
          tem_qtd_2024: 'qtd_compras_2024' in dadosCompletos,
          tem_qtd_2025: 'qtd_compras_2025' in dadosCompletos,
          valor_exato_2024: dadosCompletos.qtd_compras_2024,
          valor_exato_2025: dadosCompletos.qtd_compras_2025,
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
  }, [id]);

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
            onClick={() => navigate('/clientes')}
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
            onClick={() => navigate('/clientes')}
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
    vendas2025: cliente.valor_vendas_2025,
    vendas2024: cliente.valor_vendas_2024,
    oportunidade: cliente.oportunidade,
    meta: cliente.meta_2025,
    qtdVendas2025: cliente.qtd_compras_2025 ?? 0,  // Com fallback
    qtdVendas2024: cliente.qtd_compras_2024 ?? 0,  // Com fallback
    percentualMeta: cliente.percentual_atingimento,
    acaoRecomendada: cliente.acao_recomendada,
    celular: cliente.celular || '',  // Com fallback
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

  console.log('Cliente ID:', id)
  console.log('Dados do cliente:', dadosCliente)
  console.log('🔍 DEBUG FINAL - Quantidades:', {
    qtdVendas2025_final: dadosCliente.qtdVendas2025,
    qtdVendas2024_final: dadosCliente.qtdVendas2024,
    tipo_qtd_2025: typeof dadosCliente.qtdVendas2025,
    tipo_qtd_2024: typeof dadosCliente.qtdVendas2024,
    origem_qtd_2025: cliente.qtd_compras_2025,
    origem_qtd_2024: cliente.qtd_compras_2024
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
                onClick={() => navigate('/clientes')}
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
            <p className="text-xs text-gray-600 mb-2 leading-tight">Cód: {dadosCliente.codigo}</p>
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
          </div>

          {/* Mix de Produtos */}
          <div className="mb-4 pb-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Mix de Produtos</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
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
        </div>
      </main>
    </div>
  )
}

export default DetalhesCliente