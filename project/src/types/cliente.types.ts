export type { ClienteDetalhes } from '../lib/queries/cliente'
export type { ClienteInadimplente, TituloAbertoInadimplente } from '../lib/queries/inadimplentes'
export type { TituloAbertoDetalhes, TitulosClienteResumo } from '../lib/queries/titulos'

export interface PedidoAgrupado {
  data_criacao: string;
  codigo_cliente: number;
  fantasia: string;
  valor_total: number;
}
