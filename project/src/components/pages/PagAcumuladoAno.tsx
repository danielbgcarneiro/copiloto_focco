/**
 * Copiloto Focco Brasil
 * Desenvolvedor: Daniel Carneiro
 * Copyright © 2025 Daniel Carneiro. Todos os direitos reservados.
 */


import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Card, LoadingSpinner } from '../atoms'

interface DadosMensal {
  mes: string
  meta: number
  vendas: number
  atingimento: number
  vendedores: {
    nome: string
    meta: number
    vendas: number
    atingimento: number
  }[]
}

interface ClientesMensal {
  mes: string
  totalDoisAnosAntes: number
  totalAnoAnterior: number
  totalAnoAtual: number
  vendedores: {
    nome: string
    clientesDoisAnosAntes: number
    clientesAnoAnterior: number
    clientesAnoAtual: number
  }[]
}

interface CidadesERP {
  totalCidades: number
  comVendaAnoAnterior: number
  comVendaAnoAtual: number
}

interface VendaMesRaw {
  codigo_vendedor: number
  nome_vendedor: string
  mes_referencia: string
  total_vendas: number
  qtd_clientes_total: number
}

interface VendaMensal {
  ano: number
  mes: number
  cod_vendedor: number
  nome_vendedor: string
  total_vendas: number
  meta: number
  atingimento: number
}

interface ClienteUnico {
  ano: number
  mes: number
  cod_vendedor: number
  nome_vendedor: string
  qtd_clientes: number
}

interface CidadeVenda {
  ano: number
  cidades_com_venda: number
  total_cidades: number
}

interface CidadePositivadaPerfil {
  ano: number
  perfil: string
  total_cidades: number
  cidades_positivadas: number
}

// Nova interface para itens de metas_vendedores
interface MetaVendedor {
  cod_vendedor: number;
  ano: number;
  mes: number;
  meta_valor: number;
}

const PagAcumuladoAno: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [selectedAno, setSelectedAno] = useState(new Date().getFullYear())
  const [anosDisponiveis, setAnosDisponiveis] = useState<number[]>([])
  const [todosVendedores, setTodosVendedores] = useState<string[]>([])
  const [filtroVendedor, setFiltroVendedor] = useState<string>('')

  // Estados para dados das views
  const [vendasMensais, setVendasMensais] = useState<VendaMensal[]>([])
  const [clientesUnicos, setClientesUnicos] = useState<ClienteUnico[]>([])
  const [cidadesVendas, setCidadesVendas] = useState<CidadeVenda[]>([])
  const [cidadesPositivadasPerfil, setCidadesPositivadasPerfil] = useState<CidadePositivadaPerfil[]>([])

  // Buscar dados das views
  useEffect(() => {
    const carregarDados = async () => {
      if (!user) return

      try {
        setLoading(true)

        // Buscar tabelas e views em paralelo
        const [
          { data: vendas, error: vendasError },
          { data: metas, error: metasError },
          { data: cidades, error: cidadesError }
        ] = await Promise.all([
          supabase.from('vendas_mes').select('codigo_vendedor, nome_vendedor, mes_referencia, total_vendas, qtd_clientes_total'),
          supabase.from('metas_vendedores').select('*'),
          supabase.from('vw_cidades_com_vendas').select('*')
        ])

        if (vendasError) console.error('Erro ao buscar vendas:', vendasError)
        if (metasError) console.error('Erro ao buscar metas:', metasError)
        if (cidadesError) console.error('Erro ao buscar cidades:', cidadesError)

        // Buscar cidades positivadas por perfil da VIEW
        const { data: cidadesPerfilData, error: cidadesPerfilError } = await supabase
          .from('vw_cidades_positivadas_perfil')
          .select('*')

        if (cidadesPerfilError) {
          console.error('❌ Erro ao buscar cidades por perfil:', cidadesPerfilError)
        }

        setCidadesPositivadasPerfil(cidadesPerfilData || [])

        // 1. Criar mapas para acesso rápido a metas e vendas
        const metasMap = new Map<string, MetaVendedor>(); // Key: 'cod_vendedor-ano-mes'
        (metas || []).forEach(m => {
            const key = `${m.cod_vendedor}-${m.ano}-${m.mes}`;
            metasMap.set(key, m as MetaVendedor);
        });

        const vendasMap = new Map<string, VendaMesRaw>(); // Key: 'cod_vendedor-ano-mes'
        const allVendedoresNamesMap = new Map<number, string>(); // Key: cod_vendedor, Value: nome_vendedor
        (vendas as VendaMesRaw[] || []).forEach(v => {
            const [anoStr, mesStr] = v.mes_referencia.split('-');
            const ano = parseInt(anoStr);
            const mes = parseInt(mesStr);
            const key = `${v.codigo_vendedor}-${ano}-${mes}`;
            vendasMap.set(key, v);
            allVendedoresNamesMap.set(v.codigo_vendedor, v.nome_vendedor); // Popula o mapa de nomes
        });

        // 2. Coletar todos os vendedores únicos do ano selecionado que têm metas ou vendas
        const uniqueVendedoresForSelectedYear = new Set<number>();
        (metas || []).filter(m => m.ano === selectedAno).forEach(m => uniqueVendedoresForSelectedYear.add(m.cod_vendedor));
        (vendas as VendaMesRaw[] || []).filter(v => parseInt(v.mes_referencia.split('-')[0]) === selectedAno)
                                        .forEach(v => uniqueVendedoresForSelectedYear.add(v.codigo_vendedor));


        const combinedVendasMensais: VendaMensal[] = [];

        // 3. Iterar por cada mês do ano e por cada vendedor único para construir a lista final
        for (let mes = 1; mes <= 12; mes++) {
            uniqueVendedoresForSelectedYear.forEach(cod_vendedor => {
                const currentKey = `${cod_vendedor}-${selectedAno}-${mes}`;

                const metaData = metasMap.get(currentKey);
                const vendaData = vendasMap.get(currentKey);

                const metaValor = metaData?.meta_valor || 0;
                const total_vendas = Number(vendaData?.total_vendas) || 0;
                const nome_vendedor = allVendedoresNamesMap.get(cod_vendedor) || `Vendedor ${cod_vendedor}`; // Fallback

                // Incluir no resultado se houver meta OU venda para este vendedor/mês
                if (metaValor > 0 || total_vendas > 0) {
                    const atingimento = metaValor > 0 ? (total_vendas / metaValor) * 100 : 0;
                    combinedVendasMensais.push({
                        ano: selectedAno,
                        mes: mes,
                        cod_vendedor: cod_vendedor,
                        nome_vendedor: nome_vendedor,
                        total_vendas: total_vendas,
                        meta: metaValor,
                        atingimento: Number(atingimento.toFixed(1))
                    });
                }
            });
        }

        setVendasMensais(combinedVendasMensais); // Atualiza o estado de vendasMensais

        // Extrair dados de clientes da mesma tabela vendas_mes
        const clientesExtraidos: ClienteUnico[] = (vendas as VendaMesRaw[] || []).map(venda => {
          const [aStr, mStr] = venda.mes_referencia.split('-')
          return {
            ano: parseInt(aStr),
            mes: parseInt(mStr),
            cod_vendedor: venda.codigo_vendedor,
            nome_vendedor: venda.nome_vendedor,
            qtd_clientes: Number(venda.qtd_clientes_total) || 0
          }
        })

        setClientesUnicos(clientesExtraidos)
        setCidadesVendas(cidades || [])

        // Extrair anos disponíveis (MODIFICAÇÃO AQUI)
        const allYearsFromMetas = (metas || []).map(m => m.ano);
        const allYearsFromVendas = (vendas as VendaMesRaw[] || []).map(v => parseInt(v.mes_referencia.split('-')[0]));
        const uniqueYears = [...new Set([...allYearsFromMetas, ...allYearsFromVendas])];
        const sortedUniqueYears = uniqueYears.sort((a, b) => b - a); // Ordenar do mais novo para o mais antigo
        setAnosDisponiveis(sortedUniqueYears);

        // Definir selectedAno para o ano mais recente se não estiver definido ou inválido
        if (!selectedAno || !sortedUniqueYears.includes(selectedAno)) {
            setSelectedAno(sortedUniqueYears[0] || new Date().getFullYear());
        }

        // Extrair vendedores únicos (do combinedVendasMensais para garantir que todos são incluídos)
        const vendedoresUnicos = [...new Set(combinedVendasMensais.map(v => v.nome_vendedor))];
        setTodosVendedores(vendedoresUnicos.sort());

      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }

    carregarDados()
  }, [user, selectedAno])

  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  // Processar dados de vendas para o formato da UI
  const dadosRealizados = useMemo<DadosMensal[]>(() => {
    const vendasDoAno = vendasMensais.filter(v => v.ano === selectedAno)

    return Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1
      const vendasDoMes = vendasDoAno.filter(v => v.mes === mes)

      const vendedores = vendasDoMes.map(v => ({
        nome: v.nome_vendedor,
        meta: v.meta,
        vendas: v.total_vendas,
        atingimento: v.atingimento
      }))

      const meta = vendedores.reduce((acc, v) => acc + v.meta, 0)
      const vendas = vendedores.reduce((acc, v) => acc + v.vendas, 0)
      const atingimento = meta > 0 ? (vendas / meta) * 100 : 0

      return {
        mes: nomesMeses[i],
        meta,
        vendas,
        atingimento,
        vendedores
      }
    })
  }, [vendasMensais, selectedAno])

  // Processar dados de clientes únicos
  const dadosClientesUnicos = useMemo<ClientesMensal[]>(() => {
    const doisAnosAntes = selectedAno - 2
    const anoAnterior = selectedAno - 1
    const clientesDoisAnosAntes = clientesUnicos.filter(c => c.ano === doisAnosAntes)
    const clientesAnoAnterior = clientesUnicos.filter(c => c.ano === anoAnterior)
    const clientesAnoAtual = clientesUnicos.filter(c => c.ano === selectedAno)

    return Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1
      const clientesMesDoisAnos = clientesDoisAnosAntes.filter(c => c.mes === mes)
      const clientesMesAnterior = clientesAnoAnterior.filter(c => c.mes === mes)
      const clientesMesAtual = clientesAnoAtual.filter(c => c.mes === mes)

      const vendedores = todosVendedores.map(nome => {
        const dadosDoisAnos = clientesMesDoisAnos.find(c => c.nome_vendedor === nome)
        const dadosAnterior = clientesMesAnterior.find(c => c.nome_vendedor === nome)
        const dadosAtual = clientesMesAtual.find(c => c.nome_vendedor === nome)

        return {
          nome,
          clientesDoisAnosAntes: dadosDoisAnos?.qtd_clientes || 0,
          clientesAnoAnterior: dadosAnterior?.qtd_clientes || 0,
          clientesAnoAtual: dadosAtual?.qtd_clientes || 0
        }
      })

      return {
        mes: nomesMeses[i],
        totalDoisAnosAntes: vendedores.reduce((acc, v) => acc + v.clientesDoisAnosAntes, 0),
        totalAnoAnterior: vendedores.reduce((acc, v) => acc + v.clientesAnoAnterior, 0),
        totalAnoAtual: vendedores.reduce((acc, v) => acc + v.clientesAnoAtual, 0),
        vendedores
      }
    })
  }, [clientesUnicos, selectedAno, todosVendedores])

  // Processar dados de cidades
  const cidadesERP = useMemo<CidadesERP>(() => {
    const anoAnterior = selectedAno - 1
    const dadosAnoAnterior = cidadesVendas.find(c => c.ano === anoAnterior)
    const dadosAnoAtual = cidadesVendas.find(c => c.ano === selectedAno)

    return {
      totalCidades: dadosAnoAtual?.total_cidades || dadosAnoAnterior?.total_cidades || 0,
      comVendaAnoAnterior: dadosAnoAnterior?.cidades_com_venda || 0,
      comVendaAnoAtual: dadosAnoAtual?.cidades_com_venda || 0
    }
  }, [cidadesVendas, selectedAno])

  // Processar dados de perfis da VIEW
  const dadosPerfis = useMemo(() => {
    // Filtrar dados da VIEW pelo ano selecionado
    const dadosDoAno = cidadesPositivadasPerfil.filter(d => d.ano === selectedAno)

    // A VIEW já retorna tudo calculado, só precisamos formatar
    const perfis = ['Ouro', 'Prata', 'Bronze', 'Sem Perfil']

    return perfis.map(perfil => {
      const dados = dadosDoAno.find(d => d.perfil === perfil)
      const cidadesTotal = dados?.total_cidades || 0
      const cidadesPos = dados?.cidades_positivadas || 0
      const taxa = cidadesTotal > 0 ? (cidadesPos / cidadesTotal) * 100 : 0

      return {
        perfil,
        cidadesTotal,
        cidadesPositivadas: cidadesPos,
        taxa
      }
    })
  }, [cidadesPositivadasPerfil, selectedAno])

  const calcularTotaisAno = () => {
    const totalMeta = filteredDadosRealizados.reduce((acc, mes) => acc + mes.meta, 0)
    const totalVendas = filteredDadosRealizados.reduce((acc, mes) => acc + mes.vendas, 0)
    const atingimentoGeral = (totalVendas / totalMeta) * 100

    return { totalMeta, totalVendas, atingimentoGeral }
  }

  const calcularTotaisClientesAno = () => {
    const totalDoisAnosAntes = filteredDadosClientesUnicos.reduce((acc, mes) => acc + mes.totalDoisAnosAntes, 0)
    const totalAnoAnterior = filteredDadosClientesUnicos.reduce((acc, mes) => acc + mes.totalAnoAnterior, 0)
    const totalAnoAtual = filteredDadosClientesUnicos.reduce((acc, mes) => acc + mes.totalAnoAtual, 0)

    return { totalDoisAnosAntes, totalAnoAnterior, totalAnoAtual }
  }

  const filteredDadosRealizados = useMemo(() => {
    return dadosRealizados.map((mes) => {
      const vendedoresFiltrados = filtroVendedor
        ? mes.vendedores.filter((v) => v.nome === filtroVendedor)
        : mes.vendedores

      const totalMeta = vendedoresFiltrados.reduce((acc, v) => acc + v.meta, 0)
      const totalVendas = vendedoresFiltrados.reduce((acc, v) => acc + v.vendas, 0)
      const atingimento = totalMeta > 0 ? (totalVendas / totalMeta) * 100 : 0

      return {
        ...mes,
        vendedores: vendedoresFiltrados,
        meta: totalMeta,
        vendas: totalVendas,
        atingimento
      }
    })
  }, [dadosRealizados, filtroVendedor])

  const filteredDadosClientesUnicos = useMemo(() => {
    return dadosClientesUnicos.map((mes) => {
      const vendedoresFiltrados = filtroVendedor
        ? mes.vendedores.filter((v) => v.nome === filtroVendedor)
        : mes.vendedores

      return {
        ...mes,
        vendedores: vendedoresFiltrados,
        totalDoisAnosAntes: vendedoresFiltrados.reduce((acc, v) => acc + v.clientesDoisAnosAntes, 0),
        totalAnoAnterior: vendedoresFiltrados.reduce((acc, v) => acc + v.clientesAnoAnterior, 0),
        totalAnoAtual: vendedoresFiltrados.reduce((acc, v) => acc + v.clientesAnoAtual, 0)
      }
    })
  }, [dadosClientesUnicos, filtroVendedor])

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    if (user.cargo !== 'diretor') {
      navigate('/dashboard')
      return
    }
  }, [user, navigate])

  if (loading) {
    return <LoadingSpinner size="md" fullPage />
  }

  const { totalMeta, totalVendas, atingimentoGeral } = calcularTotaisAno()
  const { totalDoisAnosAntes, totalAnoAnterior, totalAnoAtual } = calcularTotaisClientesAno()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="w-full sm:max-w-7xl sm:mx-auto px-2 sm:px-6 lg:px-8 py-4 lg:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
            Painel Acumulado
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Visão completa do desempenho anual por mês e análise de clientes únicos
          </p>
        </div>

        {/* Card de Filtros */}
        <Card variant="default" padding="none" className="p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ano Filter */}
            <div className="relative">
              <select
                value={selectedAno}
                onChange={(e) => setSelectedAno(parseInt(e.target.value))}
                className="w-full pl-3 pr-10 py-2 border rounded-lg text-sm shadow-sm appearance-none"
              >
                {anosDisponiveis.map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>

            {/* Vendedor Filter */}
            <div className="relative">
              <select
                value={filtroVendedor}
                onChange={(e) => setFiltroVendedor(e.target.value)}
                className="w-full pl-3 pr-10 py-2 border rounded-lg text-sm shadow-sm appearance-none"
              >
                <option value="">Todos os Vendedores</option>
                {todosVendedores.map(vendedor => (
                  <option key={vendedor} value={vendedor}>{vendedor}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </Card>

        {/* Realizado */}
        <Card variant="default" padding="none" className="p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Realizado</h3>

          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 px-4 font-semibold text-gray-700 text-sm">Mês</th>
                  <th className="text-right py-1.5 px-4 font-semibold text-gray-700 text-sm">Objetivo</th>
                  <th className="text-right py-1.5 px-4 font-semibold text-gray-700 text-sm">Vendas</th>
                  <th className="text-right py-1.5 px-4 font-semibold text-gray-700 text-sm">Atingimento</th>
                </tr>
              </thead>
              <tbody>
                {filteredDadosRealizados.map((mesData) => (
                  <React.Fragment key={mesData.mes}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-1.5 px-4 font-medium text-gray-900 text-sm">{mesData.mes}</td>
                      <td className="py-1.5 px-4 text-right text-gray-700 text-sm">R$ {mesData.meta.toLocaleString()}</td>
                      <td className="py-1.5 px-4 text-right font-semibold text-gray-900 text-sm">R$ {mesData.vendas.toLocaleString()}</td>
                      <td className="py-1.5 px-4 text-right">
                        <span className={`font-bold text-sm ${
                          mesData.atingimento >= 100 ? 'text-green-600' :
                          mesData.atingimento >= 80 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {mesData.atingimento.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
                <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                  <td className="py-1.5 px-4 text-gray-900 text-sm">Total Geral</td>
                  <td className="py-1.5 px-4 text-right text-gray-900 text-sm">R$ {totalMeta.toLocaleString()}</td>
                  <td className="py-1.5 px-4 text-right text-gray-900 text-sm">R$ {totalVendas.toLocaleString()}</td>
                  <td className="py-1.5 px-4 text-right">
                    <span className={`text-sm ${
                      atingimentoGeral >= 100 ? 'text-green-600' :
                      atingimentoGeral >= 80 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {atingimentoGeral.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Clientes únicos por mês */}
        <Card variant="default" padding="none" className="p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Clientes por mês</h3>

          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 px-4 font-semibold text-gray-700 text-sm">Mês</th>
                  <th className="text-right py-1.5 px-4 font-semibold text-gray-700 text-sm">{selectedAno - 2}</th>
                  <th className="text-right py-1.5 px-4 font-semibold text-gray-700 text-sm">{selectedAno - 1}</th>
                  <th className="text-right py-1.5 px-4 font-semibold text-gray-700 text-sm">{selectedAno}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDadosClientesUnicos.map((mesData) => (
                  <React.Fragment key={mesData.mes}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-1.5 px-4 font-medium text-gray-900 text-sm">{mesData.mes}</td>
                      <td className="py-1.5 px-4 text-right text-gray-700 text-sm">{mesData.totalDoisAnosAntes}</td>
                      <td className="py-1.5 px-4 text-right text-gray-700 text-sm">{mesData.totalAnoAnterior}</td>
                      <td className="py-1.5 px-4 text-right font-semibold text-gray-900 text-sm">{mesData.totalAnoAtual}</td>
                    </tr>
                  </React.Fragment>
                ))}
                <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                  <td className="py-1.5 px-4 text-gray-900 text-sm">Total Geral</td>
                  <td className="py-1.5 px-4 text-right text-gray-900 text-sm">{totalDoisAnosAntes}</td>
                  <td className="py-1.5 px-4 text-right text-gray-900 text-sm">{totalAnoAnterior}</td>
                  <td className="py-1.5 px-4 text-right text-gray-900 text-sm">{totalAnoAtual}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Análise de Cidades */}
        <Card variant="default" padding="none" className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Análise de Cidades</h3>

          {/* Cards compactos - Visão Geral */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-900">{cidadesERP.totalCidades}</div>
              <div className="text-xs text-blue-700 mt-1">Total</div>
            </div>

            <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-900">{cidadesERP.comVendaAnoAnterior}</div>
              <div className="text-xs text-orange-700 mt-1">{selectedAno - 1}</div>
            </div>

            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-900">{cidadesERP.comVendaAnoAtual}</div>
              <div className="text-xs text-green-700 mt-1">{selectedAno}</div>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">
                {cidadesERP.totalCidades > 0 ? ((cidadesERP.comVendaAnoAtual / cidadesERP.totalCidades) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-xs text-gray-700 mt-1">Cobertura</div>
            </div>
          </div>

          {/* Tabela de Perfis */}
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Por Perfil de Cliente</h4>
            <div className="overflow-x-auto">
              <table className="w-full min-w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700 text-sm">Perfil</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700 text-sm">Cidades</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700 text-sm">Positivadas</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700 text-sm">Taxa</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosPerfis.map((perfil, index) => (
                    <tr key={perfil.perfil} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="py-2 px-3 text-sm font-medium text-gray-900">
                        {perfil.perfil === 'Ouro' && '💎 Ouro'}
                        {perfil.perfil === 'Prata' && '🥈 Prata'}
                        {perfil.perfil === 'Bronze' && '🥉 Bronze'}
                        {perfil.perfil === 'Sem Perfil' && '🎯 Sem Perfil'}
                      </td>
                      <td className="py-2 px-3 text-center text-sm text-gray-700">{perfil.cidadesTotal}</td>
                      <td className="py-2 px-3 text-center text-sm text-gray-900 font-semibold">{perfil.cidadesPositivadas}</td>
                      <td className="py-2 px-3 text-center text-sm text-gray-700">{perfil.taxa.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}

export default PagAcumuladoAno
