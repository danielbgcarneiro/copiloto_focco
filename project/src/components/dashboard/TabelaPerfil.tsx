import React, { useState, useMemo } from 'react'
import { TabelaPerfil as TabelaPerfilType } from '../../lib/queries/dashboard'
import { formatarMoeda } from '../../lib/queries/dashboard'

interface TabelaPerfilProps {
  dados: TabelaPerfilType;
  filtroCidade: string;
}

const corPerfil = {
  ouro: { bg: 'bg-yellow-50', border: 'border-yellow-300', header: 'bg-yellow-600', title: 'text-yellow-700' },
  prata: { bg: 'bg-gray-50', border: 'border-gray-300', header: 'bg-gray-600', title: 'text-gray-700' },
  bronze: { bg: 'bg-orange-50', border: 'border-orange-300', header: 'bg-orange-600', title: 'text-orange-700' }
}

type SortKey = keyof TabelaPerfilType['clientes'][0];

export const TabelaPerfil: React.FC<TabelaPerfilProps> = ({ dados, filtroCidade }) => {
  const cores = corPerfil[dados.perfil]
  const nomeCapitalizado = dados.perfil.charAt(0).toUpperCase() + dados.perfil.slice(1)

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'percentual', direction: 'descending' });

  const filteredClientes = useMemo(() => {
    if (!filtroCidade) {
      return dados.clientes;
    }
    return dados.clientes.filter(cliente =>
      cliente.cidade_uf.toLowerCase().includes(filtroCidade.toLowerCase())
    );
  }, [dados.clientes, filtroCidade]);

  const sortedClientes = useMemo(() => {
    let sortableItems = [...filteredClientes];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredClientes, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  return (
    <div className={`border-2 rounded-lg overflow-hidden ${cores.border}`}>
      {/* Header da tabela com contadores */}
      <div className={`${cores.header} text-white p-1 sm:p-2`}>
        <div className="flex items-center justify-between mb-1">
          <h3 className={`text-sm sm:text-base font-bold ${cores.title.replace('text-', '')}`} style={{ color: 'white' }}>
            💎 {nomeCapitalizado}
          </h3>
        </div>
      </div>

      {/* Tabela de clientes */}
      <div className={`${cores.bg}`}>
        {dados.clientes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Nenhum cliente neste perfil</p>
          </div>
        ) : (
          <div className="overflow-y-auto overflow-x-auto max-h-[20rem]">
            <table className="w-full min-w-max">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b-2 border-gray-300">
                  <th className="px-2 py-0.5 text-left font-normal"></th>
                  <th className="px-2 py-0.5 text-left font-normal">
                    <p className="text-[0.65rem] sm:text-xs font-bold">{sortedClientes.length} clientes</p>
                  </th>
                  <th className="px-2 py-0.5 text-left font-normal"></th>
                  <th className="px-2 py-0.5 text-right font-normal">
                    <p className="text-[0.65rem] sm:text-xs font-bold">TT {formatarMoeda(dados.somaObjetivo)}</p>
                  </th>
                  <th className="px-2 py-0.5 text-right font-normal">
                    <p className="text-[0.65rem] sm:text-xs font-bold">VD {formatarMoeda(dados.somaVendas)}</p>
                  </th>
                  <th className="px-2 py-0.5 text-right font-normal">
                    <p className="text-[0.65rem] sm:text-xs font-bold">{dados.percentualGeral.toFixed(1)}%</p>
                  </th>
                </tr>
                <tr className={`border-b-2 ${cores.border}`}>
                  <th className="px-2 py-1 text-left text-xs sm:text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => requestSort('codigo_cliente')}>
                    Código{getSortIndicator('codigo_cliente')}
                  </th>
                  <th className="px-2 py-1 text-left text-xs sm:text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => requestSort('nome_fantasia')}>
                    Fantasia{getSortIndicator('nome_fantasia')}
                  </th>
                  <th className="px-2 py-1 text-left text-xs sm:text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => requestSort('cidade_uf')}>
                    Cidade/UF{getSortIndicator('cidade_uf')}
                  </th>
                  <th className="px-2 py-1 text-right text-xs sm:text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => requestSort('objetivo')}>
                    Obj{getSortIndicator('objetivo')}
                  </th>
                  <th className="px-2 py-1 text-right text-xs sm:text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => requestSort('vendas')}>
                    VD{getSortIndicator('vendas')}
                  </th>
                  <th className="px-2 py-1 text-right text-xs sm:text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => requestSort('percentual')}>
                    %{getSortIndicator('percentual')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedClientes.map((cliente, index) => (
                  <tr
                    key={cliente.codigo_cliente}
                    className={`border-b ${index % 2 === 0 ? 'bg-white' : cores.bg} hover:bg-opacity-75 transition-colors`}
                  >
                    <td className="px-2 py-1 text-left text-xs sm:text-sm text-gray-900 font-mono">{cliente.codigo_cliente}</td>
                    <td className="px-2 py-1 text-left text-xs sm:text-sm text-gray-900 max-w-40 truncate whitespace-nowrap overflow-hidden">
                      {cliente.nome_fantasia}
                    </td>
                    <td className="px-2 py-1 text-left text-xs sm:text-sm text-gray-600 max-w-32 truncate whitespace-nowrap overflow-hidden">
                      {cliente.cidade_uf}
                    </td>
                    <td className="px-2 py-1 text-right text-xs sm:text-sm text-gray-900">{formatarMoeda(cliente.objetivo)}</td>
                    <td className="px-2 py-1 text-right text-xs sm:text-sm text-gray-900">{formatarMoeda(cliente.vendas)}</td>
                    <td className="px-2 py-1 text-right text-xs sm:text-sm font-semibold text-gray-900">
                      {cliente.percentual.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default TabelaPerfil
