#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ETL Otimizado - Vendas Semanais (Visão por Data do PEDIDO EXTERNO)

CORREÇÃO v3.0: Usa a data do PEDIDO EXTERNO (ws_pedidovenda.wspdv_datahoraregistro)
quando o pedido tem origem externa. Isso garante que a venda seja contabilizada
na semana em que o vendedor realmente fez o pedido no app, não na semana do faturamento.

Exemplo: Pedido feito dia 12/01 (2ª Sem) e faturado dia 15/01 (3ª Sem)
         → Conta na 2ª Semana ✓ (data do pedido externo)

Processa o MÊS ANTERIOR e o MÊS CORRENTE.
"""

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from datetime import date
import logging
from supabase import create_client, Client
from typing import Dict, List
from contextlib import contextmanager
from decimal import Decimal
import os
from dotenv import load_dotenv
from dateutil.relativedelta import relativedelta 

# Carregar variáveis de ambiente
load_dotenv()

# --- CONFIGURAÇÕES ---
SUPABASE_URL = os.getenv('SUPABASE_URL') or "https://krisjvemfpnkmduebqdr.supabase.co"
SUPABASE_KEY = os.getenv('SUPABASE_KEY') or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyaXNqdmVtZnBua21kdWVicWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4NTQ5MTMsImV4cCI6MjA2MzQzMDkxM30.jktcXSfSQfcfXUPTDuvu75GuUscMhpsYnvfI"

# Configurações do Banco de Dados do ERP (PostgreSQL)
ERP_CONFIG = {
    "host": os.getenv('ERP_HOST', "26.238.137.203"),
    "port": int(os.getenv('ERP_PORT', 5432)),
    "dbname": os.getenv('ERP_DATABASE', "ciclone"),
    "user": os.getenv('ERP_USER', "powerbi"),
    "password": os.getenv('ERP_PASSWORD', "[powerbi_0000_powerbi]"),
    "minconn": 1,
    "maxconn": 2
}
EMPRESA_CODIGO = [1, 2]  # Consolidar empresas 1 e 2

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# ================================================================================
# QUERY SQL CORRIGIDA - v3.0
# Prioriza data do pedido EXTERNO (ws_pedidovenda) quando existe
# ================================================================================

QUERY_VENDAS_SEMANAIS = """
        WITH
        vendas_faturadas AS (
            -- NFs FATURADAS: Usa a data do PEDIDO EXTERNO quando existe (wspdv_datahoraregistro)
            -- Caso contrário, usa a data de emissão do pedido interno (vdpdv_datahoraemissao)
            -- Filtra apenas pedidos Tipo 1 e 2 para alinhamento com ETL 07
            SELECT 
                COALESCE(
                    ws.wspdv_datahoraregistro::date,  -- Prioridade 1: Data do pedido externo (app)
                    pv.vdpdv_datahoraemissao::date    -- Prioridade 2: Data do pedido interno
                ) AS data_referencia,
                nf.pgven_codigo AS codigo_vendedor,
                -- Usa VDNFS_VALORTOTALLIQUIDONOTA do cabeçalho
                SUM(CASE 
                    WHEN nf.vdnfs_funcaooperacao IN ('V', 'O') 
                     AND nf.pgopr_codigo IN (51021, 51022, 51024, 61021, 61022, 61024) 
                    THEN nf.vdnfs_valortotalliquidonota 
                    ELSE 0 
                END) AS total_faturado_bruto,
                SUM(CASE 
                    WHEN nf.pgopr_codigo = 62021 
                    THEN nf.vdnfs_valortotalliquidonota 
                    ELSE 0 
                END) AS total_devolvido,
                COUNT(DISTINCT nf.pgcln_codigo) AS qtd_clientes_faturados
            FROM vd_notafiscalsaida nf
            INNER JOIN vd_pedidovenda pv 
                ON nf.vdpdv_codigo = pv.vdpdv_codigo 
               AND nf.pgemp_codigo = pv.pgemp_codigo
            -- JOIN com pedido externo (pode não existir para pedidos manuais)
            LEFT JOIN ws_pedidovenda ws
                ON pv.wspdv_id = ws.wspdv_id
               AND pv.pgemp_codigo = ws.pgemp_codigo
            WHERE nf.pgemp_codigo IN %(empresa)s 
              AND nf.vdnfs_dataemissao::date >= %(data_inicio)s 
              AND nf.vdnfs_situacao = 'A' 
              AND nf.pgven_codigo IS NOT NULL
              AND pv.vdtpo_codigo IN (1, 2) -- Alinhamento com ETL 07
            GROUP BY 
                COALESCE(ws.wspdv_datahoraregistro::date, pv.vdpdv_datahoraemissao::date),
                nf.pgven_codigo
        ),
        pedidos_aberto AS (
            -- PEDIDOS em ABERTO: Usa a data do PEDIDO EXTERNO quando existe
            -- Caso contrário, usa a data de emissão do pedido interno
            SELECT 
                COALESCE(
                    ws.wspdv_datahoraregistro::date,  -- Prioridade 1: Data do pedido externo (app)
                    pv.vdpdv_datahoraemissao::date    -- Prioridade 2: Data do pedido interno
                ) AS data_referencia,
                pv.pgven_codigo AS codigo_vendedor,
                SUM(pvi.vdpvp_quantidade * pvi.vdpvp_valorunitario) AS total_em_aberto,
                COUNT(DISTINCT pv.pgcln_codigo) AS qtd_clientes_aberto
            FROM vd_pedidovenda pv
            INNER JOIN vd_pedidovendaproduto pvi 
                ON pv.vdpdv_codigo = pvi.vdpdv_codigo 
               AND pvi.pgemp_codigo = pv.pgemp_codigo
            -- JOIN com pedido externo (pode não existir para pedidos manuais)
            LEFT JOIN ws_pedidovenda ws
                ON pv.wspdv_id = ws.wspdv_id
               AND pv.pgemp_codigo = ws.pgemp_codigo
            WHERE pv.pgemp_codigo IN %(empresa)s 
              AND pv.vdpdv_datahoraemissao::date >= %(data_inicio)s 
              AND pv.vdpdv_situacao IN ('N', 'A', 'R', 'E') 
              AND pv.pgven_codigo IS NOT NULL 
              AND pv.vdtpo_codigo IN (1, 2)
              AND pv.pgopr_codigo IN (51021, 51022, 51024, 61021, 61022, 61024)
              -- Exclui pedidos já faturados
              AND NOT EXISTS (
                  SELECT 1 FROM vd_notafiscalsaida nf 
                  WHERE nf.vdpdv_codigo = pv.vdpdv_codigo 
                    AND nf.pgemp_codigo = pv.pgemp_codigo 
                    AND nf.vdnfs_situacao = 'A'
              )
            GROUP BY 
                COALESCE(ws.wspdv_datahoraregistro::date, pv.vdpdv_datahoraemissao::date),
                pv.pgven_codigo
        ),
        todas_datas AS (
            -- Combina todas as datas de transação (NF + Pedido)
            SELECT data_referencia, codigo_vendedor FROM vendas_faturadas
            UNION
            SELECT data_referencia, codigo_vendedor FROM pedidos_aberto
        ),
        clientes_por_data AS (
            -- Conta clientes DISTINTOS por data/vendedor
            -- Usa a mesma lógica de data: prioriza pedido externo
            SELECT 
                COALESCE(
                    ws.wspdv_datahoraregistro::date,
                    pv.vdpdv_datahoraemissao::date
                ) AS data_referencia,
                pv.pgven_codigo AS codigo_vendedor,
                COUNT(DISTINCT pv.pgcln_codigo) AS qtd_clientes_total
            FROM vd_pedidovenda pv
            LEFT JOIN ws_pedidovenda ws
                ON pv.wspdv_id = ws.wspdv_id
               AND pv.pgemp_codigo = ws.pgemp_codigo
            WHERE pv.pgemp_codigo IN %(empresa)s
              AND pv.vdpdv_datahoraemissao::date >= %(data_inicio)s
              AND pv.pgven_codigo IS NOT NULL
              AND pv.vdtpo_codigo IN (1, 2)
              AND (
                  -- Pedidos em aberto
                  pv.vdpdv_situacao IN ('N', 'A', 'R', 'E')
                  -- OU pedidos faturados (para contar o cliente)
                  OR EXISTS (
                      SELECT 1 FROM vd_notafiscalsaida nf
                      WHERE nf.vdpdv_codigo = pv.vdpdv_codigo
                        AND nf.pgemp_codigo = pv.pgemp_codigo
                        AND nf.vdnfs_situacao = 'A'
                  )
              )
            GROUP BY 
                COALESCE(ws.wspdv_datahoraregistro::date, pv.vdpdv_datahoraemissao::date),
                pv.pgven_codigo
        )
        SELECT
            td.data_referencia,
            EXTRACT(YEAR FROM td.data_referencia)::integer AS ano,
            EXTRACT(MONTH FROM td.data_referencia)::integer AS mes,
            -- Cálculo Semanal baseado em faixas de dias do mês
            CASE
                WHEN EXTRACT(DAY FROM td.data_referencia) BETWEEN 1 AND 7 THEN '1ª Semana'
                WHEN EXTRACT(DAY FROM td.data_referencia) BETWEEN 8 AND 14 THEN '2ª Semana'
                WHEN EXTRACT(DAY FROM td.data_referencia) BETWEEN 15 AND 21 THEN '3ª Semana'
                ELSE '4ª Semana'
            END AS semana,
            td.codigo_vendedor,
            COALESCE(func.pgfun_nomefantasia, func.pgfun_nome, 'VENDEDOR ' || td.codigo_vendedor) AS nome_vendedor,
            COALESCE(vf.total_faturado_bruto - vf.total_devolvido, 0) AS valor_faturado,
            COALESCE(pa.total_em_aberto, 0) AS valor_em_aberto,
            COALESCE(vf.total_faturado_bruto - vf.total_devolvido, 0) + COALESCE(pa.total_em_aberto, 0) AS valor_total,
            COALESCE(vf.qtd_clientes_faturados, 0) AS qtd_clientes_faturados,
            COALESCE(pa.qtd_clientes_aberto, 0) AS qtd_clientes_aberto,
            COALESCE(cpd.qtd_clientes_total, 0) AS qtd_clientes_total
        FROM todas_datas td
        LEFT JOIN vendas_faturadas vf 
            ON td.data_referencia = vf.data_referencia 
           AND td.codigo_vendedor = vf.codigo_vendedor
        LEFT JOIN pedidos_aberto pa 
            ON td.data_referencia = pa.data_referencia 
           AND td.codigo_vendedor = pa.codigo_vendedor
        LEFT JOIN clientes_por_data cpd
            ON td.data_referencia = cpd.data_referencia
           AND td.codigo_vendedor = cpd.codigo_vendedor
        LEFT JOIN pg_funcionario func 
            ON td.codigo_vendedor = func.pgfun_codigo 
           AND func.pgemp_codigo IN %(empresa)s
        WHERE COALESCE(vf.total_faturado_bruto - vf.total_devolvido, 0) 
            + COALESCE(pa.total_em_aberto, 0) > 0
        ORDER BY td.data_referencia, td.codigo_vendedor;
        """


class VendasSemanaisETL:
    """Classe para orquestrar o processo de ETL."""

    def __init__(self):
        if not all([SUPABASE_URL, SUPABASE_KEY, ERP_CONFIG["host"]]):
            raise ValueError("Credenciais do Supabase ou ERP não foram preenchidas corretamente no script!")
        
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.connection_pool = psycopg2.pool.SimpleConnectionPool(**ERP_CONFIG)

    def __del__(self):
        if hasattr(self, 'connection_pool') and self.connection_pool:
            self.connection_pool.closeall()
    
    @contextmanager
    def get_erp_connection(self):
        conn = None
        try:
            conn = self.connection_pool.getconn()
            yield conn
        finally:
            if conn:
                self.connection_pool.putconn(conn)

    def deletar_dados_supabase(self, data_inicio: str) -> bool:
        """Deleta dados no Supabase a partir da data de início para garantir idempotência."""
        logger.info(f"PASSO 1/3: Deletando dados de 'vendas_semanais' a partir de {data_inicio} (Mês Anterior e Atual)...")
        try:
            response_tuple = self.supabase.table('vendas_semanais').delete().gte('data_referencia', data_inicio).execute()
            
            deleted_count = 0
            if isinstance(response_tuple, tuple) and len(response_tuple) > 0 and response_tuple[0] is not None:
                deleted_count = len(response_tuple[0])
            
            logger.info(f"✓ Sucesso! {deleted_count} registros antigos foram deletados.")
            return True
        except Exception as e:
            logger.error(f"✗ Falha ao deletar dados no Supabase: {e}")
            return False

    def extrair_dados_do_erp(self, data_inicio: str) -> List[Dict]:
        """Extrai dados do ERP para o período definido."""
        logger.info(f"PASSO 2/3: Extraindo todos os dados do ERP a partir de {data_inicio}...")
        
        try:
            with self.get_erp_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(QUERY_VENDAS_SEMANAIS, {'data_inicio': data_inicio, 'empresa': tuple(EMPRESA_CODIGO)})
                    resultados = cur.fetchall()
            
            dados_processados = []
            for linha in resultados:
                linha_dict = dict(linha)
                for key, value in linha_dict.items():
                    if isinstance(value, Decimal):
                        linha_dict[key] = float(value)
                    elif hasattr(value, 'isoformat'):
                        linha_dict[key] = value.isoformat()
                dados_processados.append(linha_dict)
            
            logger.info(f"✓ Extração concluída. {len(dados_processados)} registros encontrados.")
            return dados_processados
        except Exception as e:
            logger.error(f"✗ Falha ao extrair dados do ERP: {e}")
            return []

    def carregar_dados_no_supabase(self, dados: List[Dict]):
        """Carrega os dados extraídos no Supabase."""
        if not dados:
            logger.info("PASSO 3/3: Nenhum dado para carregar.")
            return True
        logger.info(f"PASSO 3/3: Carregando {len(dados)} registros na tabela 'vendas_semanais'...")
        try:
            response = self.supabase.table('vendas_semanais').insert(dados).execute()
            
            inserted_count = 0
            if isinstance(response, tuple) and len(response) > 0 and response[0] is not None:
                 inserted_count = len(response[0])
            elif hasattr(response, 'data') and response.data:
                 inserted_count = len(response.data)

            logger.info(f"✓ Sucesso! {inserted_count} registros foram inseridos.")
            return True
        except Exception as e:
            logger.error(f"✗ Falha ao carregar dados no Supabase: {e}")
            return False

    def executar(self):
        """Orquestra a execução da atualização do MÊS ANTERIOR e MÊS CORRENTE."""
        hoje = date.today()
        primeiro_dia_mes_atual = hoje.replace(day=1)
        data_inicio = (primeiro_dia_mes_atual - relativedelta(months=1)).replace(day=1).isoformat()
        
        logger.info("🚀 --- INICIANDO ATUALIZAÇÃO VENDAS SEMANAIS (Mês Anterior e Atual) --- 🚀")
        logger.info(f"    Usando DATA DO PEDIDO EXTERNO quando existe (ws_pedidovenda)")
        
        if self.deletar_dados_supabase(data_inicio):
            dados_para_inserir = self.extrair_dados_do_erp(data_inicio)
            self.carregar_dados_no_supabase(dados_para_inserir)
            
        logger.info("🏁 --- ATUALIZAÇÃO VENDAS SEMANAIS FINALIZADA --- 🏁")

if __name__ == "__main__":
    try:
        try:
            from dateutil.relativedelta import relativedelta
        except ImportError:
            logger.critical("🆘 ERRO: A biblioteca 'python-dateutil' não está instalada. Execute: pip install python-dateutil")
            exit(1)
            
        etl = VendasSemanaisETL()
        etl.executar()
    except Exception as e:
        logger.critical(f"🆘 Ocorreu um erro fatal no processo de ETL: {e}", exc_info=True)
