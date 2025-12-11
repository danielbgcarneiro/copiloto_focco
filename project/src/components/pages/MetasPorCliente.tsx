import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Search } from 'lucide-react';
import { getTabelasPerfilParaGestao, TabelaPerfil, ClientePerfil } from '../../lib/queries/dashboard';
import { getAllVendedores, VendedorProfile } from '../../lib/queries/vendedores';

const formatarMoedaSemDecimais = (valor: number) => {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const TabelaClientesPerfil: React.FC<{
  perfilData: TabelaPerfil;
  filtroCidade: string;
  filtroVendedorId: number | '';
  corBorda: string;
  corFundo: string;
  corTexto: string;
  corIcone: string;
}> = ({ perfilData, filtroCidade, filtroVendedorId, corBorda, corFundo, corTexto, corIcone }) => {
  const [sortConfig, setSortConfig] = useState<{ key: keyof ClientePerfil; direction: 'ascending' | 'descending' } | null>({ key: 'percentual', direction: 'descending' });

  const clientesFiltrados = useMemo(() => {
    if (!perfilData || !perfilData.clientes || perfilData.clientes.length === 0) return [];
    
    let filtered = perfilData.clientes;

    if (filtroVendedorId !== '') {
      filtered = filtered.filter(cliente => cliente.cod_vendedor === filtroVendedorId);
    }

    if (filtroCidade) {
      filtered = filtered.filter(cliente =>
        cliente.cidade_uf.toLowerCase().includes(filtroCidade.toLowerCase())
      );
    }
    return filtered;
  }, [perfilData, filtroCidade, filtroVendedorId]);

  const sortedClientes = useMemo(() => {
    let sortableItems = [...clientesFiltrados];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key]! < b[sortConfig.key]!) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key]! > b[sortConfig.key]!) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [clientesFiltrados, sortConfig]);

  const requestSort = (key: keyof ClientePerfil) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name: keyof ClientePerfil) => {
    if (!sortConfig || sortConfig.key !== name) {
      return null;
    }
    if (sortConfig.direction === 'ascending') {
      return ' ▲';
    }
    return ' ▼';
  };

  const totaisFiltrados = useMemo(() => {
    if (!clientesFiltrados) return { somaObjetivo: 0, somaVendas: 0, percentualGeral: 0 };

    const somaObjetivo = clientesFiltrados.reduce((acc, c) => acc + c.objetivo, 0);
    const somaVendas = clientesFiltrados.reduce((acc, c) => acc + c.vendas, 0);
    const percentualGeral = somaObjetivo > 0 ? (somaVendas / somaObjetivo) * 100 : 0;

    return {
      somaObjetivo,
      somaVendas,
      percentualGeral: Math.round(percentualGeral * 100) / 100,
    };
  }, [clientesFiltrados]);

  if (!perfilData) return null;

  return (
    <div className={`border-2 rounded-lg overflow-hidden ${corBorda}`}>
      <div className={`${corFundo} text-white p-1 sm:p-2`}>
        <div className="flex items-center justify-between mb-1">
          <h3 className={`text-sm sm:text-base font-bold ${corTexto}`} style={{ color: 'white' }}>
            💎 {perfilData.perfil.charAt(0).toUpperCase() + perfilData.perfil.slice(1)}
          </h3>
        </div>
      </div>
      <div className={`bg-${corIcone}-50`}>
        <div className="overflow-y-auto overflow-x-auto max-h-[20rem]">
          <table className="w-full min-w-max">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b-2 border-gray-300">
                <th className="px-2 py-0.5 text-left font-normal"></th>
                <th className="px-2 py-0.5 text-left font-normal">
                  <p className="text-[0.65rem] sm:text-xs font-bold">{clientesFiltrados.length} clientes</p>
                </th>
                <th className="px-2 py-0.5 text-left font-normal"></th>
                <th className="px-2 py-0.5 text-right font-normal">
                  <p className="text-[0.65rem] sm:text-xs font-bold">TT {formatarMoedaSemDecimais(totaisFiltrados.somaObjetivo)}</p>
                </th>
                <th className="px-2 py-0.5 text-right font-normal">
                  <p className="text-[0.65rem] sm:text-xs font-bold">VD {formatarMoedaSemDecimais(totaisFiltrados.somaVendas)}</p>
                </th>
                <th className="px-2 py-0.5 text-right font-normal">
                  <p className="text-[0.65rem] sm:text-xs font-bold">{totaisFiltrados.percentualGeral.toFixed(1)}%</p>
                </th>
              </tr>
              <tr className={`border-b-2 ${corBorda}`}>
                <th className="px-2 py-1 text-left text-xs sm:text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => requestSort('codigo_cliente')}>Código{getSortIcon('codigo_cliente')}</th>
                <th className="px-2 py-1 text-left text-xs sm:text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => requestSort('nome_fantasia')}>Fantasia{getSortIcon('nome_fantasia')}</th>
                <th className="px-2 py-1 text-left text-xs sm:text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => requestSort('apelido_vendedor')}>Vendedor{getSortIcon('apelido_vendedor')}</th>
                <th className="px-2 py-1 text-left text-xs sm:text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => requestSort('cidade_uf')}>Cidade/UF{getSortIcon('cidade_uf')}</th>
                <th className="px-2 py-1 text-right text-xs sm:text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => requestSort('objetivo')}>Obj{getSortIcon('objetivo')}</th>
                <th className="px-2 py-1 text-right text-xs sm:text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => requestSort('vendas')}>VD{getSortIcon('vendas')}</th>
                <th className="px-2 py-1 text-right text-xs sm:text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => requestSort('percentual')}>%{getSortIcon('percentual')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedClientes.map((cliente, index) => (
                <tr key={cliente.codigo_cliente} className={`border-b ${index % 2 === 0 ? 'bg-white' : `bg-${corIcone}-50`} hover:bg-opacity-75 transition-colors`}>
                  <td className="px-2 py-1 text-left text-xs sm:text-sm text-gray-900 font-mono">{cliente.codigo_cliente}</td>
                  <td className="px-2 py-1 text-left text-xs sm:text-sm text-gray-900 max-w-40 truncate whitespace-nowrap overflow-hidden">{cliente.nome_fantasia}</td>
                  <td className="px-2 py-1 text-left text-xs sm:text-sm text-gray-600 max-w-32 truncate whitespace-nowrap overflow-hidden">{cliente.apelido_vendedor}</td>
                  <td className="px-2 py-1 text-left text-xs sm:text-sm text-gray-600 max-w-32 truncate whitespace-nowrap overflow-hidden">{cliente.cidade_uf}</td>
                  <td className="px-2 py-1 text-right text-xs sm:text-sm text-gray-900">{formatarMoedaSemDecimais(cliente.objetivo)}</td>
                  <td className="px-2 py-1 text-right text-xs sm:text-sm text-gray-900">{formatarMoedaSemDecimais(cliente.vendas)}</td>
                  <td className="px-2 py-1 text-right text-xs sm:text-sm font-semibold text-gray-900">{cliente.percentual.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


const MetasPorCliente: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tabelasPerfil, setTabelasPerfil] = useState<TabelaPerfil[]>([]);
  const [filtroCidade, setFiltroCidade] = useState('');
  const [filtroVendedorId, setFiltroVendedorId] = useState<number | ''>(''); // Changed type
  const [allVendedores, setAllVendedores] = useState<VendedorProfile[]>([]);

  const fetchTabelasPerfilData = async () => {
    setLoading(true);
    try {
      const allTabelas = await getTabelasPerfilParaGestao();
      setTabelasPerfil(allTabelas);
    } catch (error) {
      console.error('Erro ao buscar tabelas de perfil para gestão:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllVendedores = async () => {
    try {
      const vendedores = await getAllVendedores();
      setAllVendedores(vendedores || []);
    } catch (error) {
      console.error('Erro ao buscar todos os vendedores:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.cargo !== 'diretor') {
      navigate('/dashboard');
      return;
    }
    fetchTabelasPerfilData();
    fetchAllVendedores();
  }, [user, navigate]);

  const perfilOuro = tabelasPerfil.find(p => p.perfil === 'ouro');
  const perfilPrata = tabelasPerfil.find(p => p.perfil === 'prata');
  const perfilBronze = tabelasPerfil.find(p => p.perfil === 'bronze');

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full sm:max-w-7xl sm:mx-auto px-2 sm:px-6 lg:px-8 py-4 lg:py-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Visão Geral de Metas por Cliente</h2>
        
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mt-6 sm:mt-8">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* Vendedor Filter */}
                <div className="relative">
                    <select
                        value={filtroVendedorId}
                        onChange={(e) => {
                            const selectedId = e.target.value;
                            const numericId = selectedId === '' ? '' : Number(selectedId); // Convert to number, keep '' for 'Todos'
                            setFiltroVendedorId(numericId);
                        }}
                        className="w-full pl-3 pr-10 py-2 border rounded-lg text-sm shadow-sm appearance-none"
                    >
                        <option value="">Todos os Vendedores</option>
                        {allVendedores.map(vendedor => (
                            <option key={vendedor.cod_vendedor ?? ""} value={vendedor.cod_vendedor ?? ""}>
                                {vendedor.apelido || vendedor.nome_completo}
                            </option>
                        ))}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                {/* Cidade Filter */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Filtrar por Cidade/UF..."
                        value={filtroCidade}
                        onChange={(e) => setFiltroCidade(e.target.value)}
                        className="w-full pl-10 pr-4 py-1 border rounded-lg text-sm shadow-sm"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
            </div>
        </div>

        <div className="space-y-6 mt-12">
            <div className="grid grid-cols-1 gap-6">
                {perfilOuro && <TabelaClientesPerfil perfilData={perfilOuro} filtroCidade={filtroCidade} filtroVendedorId={filtroVendedorId} corBorda="border-yellow-300" corFundo="bg-yellow-600" corTexto="text-yellow-700" corIcone="yellow" />}
                {perfilPrata && <TabelaClientesPerfil perfilData={perfilPrata} filtroCidade={filtroCidade} filtroVendedorId={filtroVendedorId} corBorda="border-gray-300" corFundo="bg-gray-600" corTexto="text-gray-700" corIcone="gray" />}
                {perfilBronze && <TabelaClientesPerfil perfilData={perfilBronze} filtroCidade={filtroCidade} filtroVendedorId={filtroVendedorId} corBorda="border-orange-300" corFundo="bg-orange-600" corTexto="text-orange-700" corIcone="orange" />}
            </div>
        </div>
      </main>
    </div>
  );
};

export default MetasPorCliente;
