/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */


import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { BarChart3, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PedidoAgrupado {
  data_criacao: string;
  codigo_cliente: number;
  fantasia: string;
  valor_total: number;
}


const PedidosVendedor: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<PedidoAgrupado[]>([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  useEffect(() => {
    if (user?.id) {
      fetchPedidos();
    }
  }, [user, mes, ano]);

  const fetchPedidos = async () => {
    setLoading(true);
    setPedidos([]);

    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Chama a função RPC 'get_pedidos_por_vendedor' no Supabase
    const { data, error } = await supabase.rpc('get_pedidos_por_vendedor', {
      mes_filtro: mes,
      ano_filtro: ano
    });

    if (error) {
      console.error('Erro ao buscar pedidos via RPC:', error);
      setPedidos([]);
    } else {
      // A RPC já retorna os dados filtrados, então podemos processá-los diretamente
      const pedidosAgrupados = (data || []).reduce((acc: PedidoAgrupado[], pedido: any) => {
        const clienteExistente = acc.find((p: PedidoAgrupado) => p.codigo_cliente === pedido.codigo_cliente);
        if (clienteExistente) {
          clienteExistente.valor_total += (pedido.valor_faturado || 0) + (pedido.valor_aberto || 0);
          if (new Date(pedido.data_criacao) > new Date(clienteExistente.data_criacao)) {
            clienteExistente.data_criacao = pedido.data_criacao;
          }
        } else {
          acc.push({
            data_criacao: pedido.data_criacao,
            codigo_cliente: pedido.codigo_cliente,
            fantasia: pedido.fantasia,
            valor_total: (pedido.valor_faturado || 0) + (pedido.valor_aberto || 0),
          });
        }
        return acc;
      }, [] as PedidoAgrupado[]);
      setPedidos(pedidosAgrupados.sort((a: PedidoAgrupado, b: PedidoAgrupado) => b.valor_total - a.valor_total));
    }
    setLoading(false);
  };

  const totalVendas = useMemo(() => {
    return pedidos.reduce((acc, pedido) => acc + pedido.valor_total, 0);
  }, [pedidos]);

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const meses = Array.from({ length: 12 }, (_, i) => ({ valor: i + 1, nome: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }) }));
  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white shadow-lg">
        <div className="w-full sm:max-w-7xl sm:mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-14">
            <h1 className="text-base sm:text-lg font-bold">Meus Pedidos</h1>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5"><User className="h-4 w-4" /><span className="text-xs sm:text-sm hidden sm:inline">{user?.apelido || 'Vendedor'}</span></div>
              <button onClick={() => navigate('/dashboard')} className="p-2 sm:p-1.5 hover:bg-white/10 rounded-full"><BarChart3 className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full sm:max-w-7xl sm:mx-auto px-2 sm:px-6 lg:px-8 py-4 lg:py-8">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Filtros</h3>
            <div className="flex items-center space-x-2 sm:space-x-4 mt-4 sm:mt-0">
              <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                {meses.map(m => <option key={m.valor} value={m.valor}>{m.nome}</option>)}
              </select>
              <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                {anos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Total Vendas</h3>
              <p className="text-2xl font-bold text-primary">{formatarMoeda(totalVendas)}</p>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <table className="w-full min-w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Data</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Cod Cliente</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Fantasia</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((pedido) => (
                    <tr key={pedido.codigo_cliente} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{new Date(pedido.data_criacao).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3 px-4">{pedido.codigo_cliente}</td>
                      <td className="py-3 px-4">{pedido.fantasia}</td>
                      <td className="py-3 px-4 text-right">{formatarMoeda(pedido.valor_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default PedidosVendedor;
