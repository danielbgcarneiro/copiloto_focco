#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
introspect_db.py — Radiografia READ-ONLY do banco do ERP Ciclone (PostgreSQL).

Objetivo: gerar dois artefatos reutilizaveis para economizar tokens em consultas
futuras (o Cowork le o arquivo, nao o banco):
  - db_ciclone_schema.md   (resumo legivel por humano/Claude)
  - db_ciclone_schema.json (estruturado, pra reprocessar sem novas queries)

REGRAS:
  - READ-ONLY. A sessao e aberta com set_session(readonly=True). So SELECT/catalogo.
  - Sem credenciais no codigo. Conexao vem de .env (ERP_SERVER/ERP_DATABASE/
    ERP_USERNAME/ERP_PASSWORD/ERP_PORT). Nunca hardcode senha.

Uso:
  python3 introspect_db.py
  python3 introspect_db.py --schema public --schema outro --out-dir "/caminho"
  python3 introspect_db.py --env "/mnt/.../projetoV3/.env"

Atualizar a radiografia = rodar de novo (custo ~zero de tokens).
"""

import argparse
import datetime as dt
import json
import os
import sys

try:
    import psycopg2
except ImportError:
    sys.exit("psycopg2 nao encontrado. Instale 'python3-psycopg2' (apt) ou "
             "'psycopg2-binary' (pip) antes de rodar.")

DEFAULT_ENV = "/mnt/c/Users/Daniel/Desktop/COPILOTO/projetoV3/.env"
DEFAULT_OUT = ("/mnt/c/Users/Daniel/iCloudDrive/iCloud~md~obsidian/"
               "01 Projetos/Copiloto V4")

# Tabelas-chave por dominio (Tarefa 2). O script renderiza as que existirem.
DOMAIN_MAP = {
    "Produtos / grades / colecoes / marcas": [
        "eq_produtogenerico", "eq_produtoespecifico", "eq_produtoespecificoestoque",
        "eq_colecao", "eq_marca", "eq_grade", "eq_grupo", "eq_subgrupo",
        "eq_produtoespecificoreferencia",
    ],
    "Tabela de preco": [
        "eq_tabelapreco", "eq_tabelaprecoitem", "eq_tabelaprecoproduto",
        "vd_tabelapreco", "vd_condicaopagamento", "eq_listapreco",
    ],
    "Estoque / disponibilidade": [
        "eq_produtoespecificoestoque", "eq_estoque", "eq_estoquelocal",
        "eq_saldoestoque", "eq_movimentoestoque",
    ],
    "Clientes / cadastro": [
        "pg_cliente", "pg_pessoa", "pg_pessoafisica", "pg_pessoajuridica",
        "pg_clienteendereco", "pg_vendedor", "pg_representante",
    ],
    "Pedidos de venda (entrada via API)": [
        "ws_api_pedido", "ws_api_pedidoitem", "ws_api_cliente",
        "vd_pedido", "vd_pedidoproduto", "vd_pedidovenda",
    ],
    "Faturamento / NF": [
        "vd_notafiscalsaida", "vd_notafiscalsaidaproduto",
        "vd_notafiscalsaidaitem",
    ],
    "Titulos / financeiro": [
        "fn_crtitulo", "fn_cptitulo", "fn_titulo", "fn_crbaixa",
    ],
}

# Padroes de nome p/ varredura adicional de tabelas de dominio.
NAME_PATTERNS = {
    "preco": ["%preco%", "%tabelapreco%", "%listapreco%"],
    "estoque": ["%estoque%", "%saldo%"],
    "pedido": ["%pedido%"],
    "notafiscal": ["%notafiscal%", "%nfe%", "%nfs%"],
    "cliente": ["%cliente%"],
    "titulo": ["%titulo%", "%crtitulo%", "%cptitulo%"],
}


def load_env(path):
    """Parser minimo de .env (sem dependencia de python-dotenv)."""
    env = {}
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            env[key.strip()] = val.strip().strip('"').strip("'")
    return env


def connect(env):
    missing = [k for k in ("ERP_SERVER", "ERP_DATABASE", "ERP_USERNAME",
                           "ERP_PASSWORD") if not env.get(k)]
    if missing:
        sys.exit("Faltam variaveis no .env: " + ", ".join(missing))
    conn = psycopg2.connect(
        host=env["ERP_SERVER"],
        port=int(env.get("ERP_PORT", 5432)),
        dbname=env["ERP_DATABASE"],
        user=env["ERP_USERNAME"],
        password=env["ERP_PASSWORD"],
        connect_timeout=15,
        application_name="introspect_db.py (read-only)",
    )
    conn.set_session(readonly=True, autocommit=True)
    return conn


def q(cur, sql, params=None):
    cur.execute(sql, params or ())
    cols = [c.name for c in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def human_bytes(n):
    n = float(n or 0)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024 or unit == "TB":
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024


def collect(conn, schemas):
    cur = conn.cursor()
    data = {}

    data["server"] = q(cur, "select version() as version, current_user as usr, "
                             "current_database() as db")[0]

    data["schemas"] = q(cur, """
        select n.nspname as schema,
               count(*) filter (where c.relkind in ('r','p')) as tables,
               count(*) filter (where c.relkind = 'v')        as views,
               count(*) filter (where c.relkind = 'm')        as matviews
        from pg_namespace n
        left join pg_class c on c.relnamespace = n.oid
        where n.nspname not in ('pg_catalog','information_schema','pg_toast')
          and n.nspname not like 'pg_temp%%' and n.nspname not like 'pg_toast%%'
        group by n.nspname order by 2 desc nulls last, 1
    """)

    data["tables"] = q(cur, """
        select n.nspname as schema, c.relname as name, c.relkind as kind,
               c.reltuples::bigint as est_rows,
               pg_total_relation_size(c.oid) as total_bytes,
               pg_relation_size(c.oid) as table_bytes
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where c.relkind in ('r','p') and n.nspname = any(%s)
        order by 1, 2
    """, (schemas,))

    data["columns"] = q(cur, """
        select table_schema as schema, table_name as table, ordinal_position as pos,
               column_name as name, data_type as type, is_nullable as nullable,
               character_maximum_length as maxlen,
               numeric_precision as numprec, numeric_scale as numscale,
               column_default as default
        from information_schema.columns
        where table_schema = any(%s)
        order by table_schema, table_name, ordinal_position
    """, (schemas,))

    data["pks"] = q(cur, """
        select tc.table_schema as schema, tc.table_name as table,
               kcu.column_name as column, kcu.ordinal_position as pos,
               tc.constraint_name as name
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu
          on tc.constraint_name = kcu.constraint_name
         and tc.table_schema = kcu.table_schema
        where tc.constraint_type = 'PRIMARY KEY' and tc.table_schema = any(%s)
        order by 1, 2, 4
    """, (schemas,))

    data["fks"] = q(cur, """
        select con.conname as name,
               ns.nspname as schema, cl.relname as table,
               (select string_agg(att.attname, ',' order by u.ord)
                  from unnest(con.conkey) with ordinality u(attnum, ord)
                  join pg_attribute att
                    on att.attrelid = con.conrelid and att.attnum = u.attnum) as columns,
               fns.nspname as ref_schema, fcl.relname as ref_table,
               (select string_agg(att.attname, ',' order by u.ord)
                  from unnest(con.confkey) with ordinality u(attnum, ord)
                  join pg_attribute att
                    on att.attrelid = con.confrelid and att.attnum = u.attnum) as ref_columns
        from pg_constraint con
        join pg_class cl     on cl.oid = con.conrelid
        join pg_namespace ns on ns.oid = cl.relnamespace
        join pg_class fcl    on fcl.oid = con.confrelid
        join pg_namespace fns on fns.oid = fcl.relnamespace
        where con.contype = 'f' and ns.nspname = any(%s)
        order by 2, 3, 1
    """, (schemas,))

    data["indexes"] = q(cur, """
        select schemaname as schema, tablename as table,
               indexname as name, indexdef as def
        from pg_indexes where schemaname = any(%s)
        order by 1, 2, 3
    """, (schemas,))

    # Views via catalogo (pg_get_viewdef): information_schema.views omite a
    # definicao quando o usuario nao e dono/sem privilegio — o catalogo nao.
    data["views"] = q(cur, """
        select n.nspname as schema, c.relname as name,
               pg_get_viewdef(c.oid, true) as def,
               c.relkind = 'm' as is_matview
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where c.relkind in ('v','m') and n.nspname = any(%s)
        order by 1, 2
    """, (schemas,))

    data["functions"] = q(cur, """
        select n.nspname as schema, p.proname as name,
               pg_get_function_result(p.oid) as result,
               pg_get_function_arguments(p.oid) as args,
               l.lanname as language,
               case p.prokind when 'f' then 'function' when 'p' then 'procedure'
                    when 'a' then 'aggregate' when 'w' then 'window'
                    else p.prokind::text end as kind
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        left join pg_language l on l.oid = p.prolang
        where n.nspname = any(%s)
        order by 1, 2
    """, (schemas,))

    # --- Tarefa 3: Sovis x ERP (roles, grants, objetos com 'sovis' no nome) ---
    sovis = {}
    try:
        sovis["roles"] = q(cur, "select rolname, rolcanlogin, rolsuper, "
                                "rolcreatedb from pg_roles order by 1")
    except Exception as exc:  # pragma: no cover
        sovis["roles_error"] = str(exc)
    try:
        sovis["grants_like_sovis"] = q(cur, """
            select grantee, table_schema as schema, table_name as table,
                   privilege_type as priv
            from information_schema.role_table_grants
            where grantee ilike '%%sovis%%'
            order by 1, 2, 3
        """)
    except Exception as exc:  # pragma: no cover
        sovis["grants_error"] = str(exc)
    try:
        sovis["objects_like_sovis"] = q(cur, """
            select n.nspname as schema, c.relname as name, c.relkind as kind
            from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where (c.relname ilike '%%sovis%%' or n.nspname ilike '%%sovis%%')
              and c.relkind in ('r','p','v','m')
            order by 1, 2
        """)
    except Exception as exc:  # pragma: no cover
        sovis["objects_error"] = str(exc)
    data["sovis"] = sovis

    # --- varredura por padrao de nome (auxilia Tarefa 2) ---
    pattern_hits = {}
    for domain, pats in NAME_PATTERNS.items():
        rows = q(cur, """
            select n.nspname as schema, c.relname as name,
                   c.reltuples::bigint as est_rows
            from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where c.relkind in ('r','p') and n.nspname = any(%s)
              and (""" + " or ".join(["c.relname ilike %s"] * len(pats)) + """)
            order by 3 desc nulls last, 2
        """, [schemas] + pats)
        pattern_hits[domain] = rows
    data["pattern_hits"] = pattern_hits

    cur.close()
    return data


def index_by_table(rows):
    out = {}
    for r in rows:
        out.setdefault((r["schema"], r["table"]), []).append(r)
    return out


def render_md(data, schemas):
    cols_by = index_by_table(data["columns"])
    pks_by = index_by_table(data["pks"])
    fks_by = index_by_table(data["fks"])
    tbl_by = {(t["schema"], t["name"]): t for t in data["tables"]}
    existing = set(tbl_by.keys())

    L = []
    w = L.append
    srv = data["server"]
    now = dt.datetime.now().strftime("%Y-%m-%d %H:%M")
    w(f"# Radiografia do ERP Ciclone — `{srv['db']}`\n")
    w(f"> Gerado por `introspect_db.py` em {now} (read-only) · "
      f"usuario `{srv['usr']}` · {srv['version'].split(',')[0]}\n")
    w("> **Como atualizar:** rode `python3 introspect_db.py`. O Cowork le este "
      "arquivo, nao o banco.\n")

    # 1. Schemas
    w("\n## 1. Schemas\n")
    w("| Schema | Tabelas | Views | Mat.Views |")
    w("|---|--:|--:|--:|")
    for s in data["schemas"]:
        w(f"| `{s['schema']}` | {s['tables'] or 0} | {s['views'] or 0} | "
          f"{s['matviews'] or 0} |")
    w(f"\nSchemas radiografados neste arquivo: {', '.join('`'+s+'`' for s in schemas)}.\n")

    # 2. Top tabelas por linhas
    w("\n## 2. Maiores tabelas (top 30 por linhas estimadas)\n")
    w("> Linhas via `pg_class.reltuples` (estimativa barata; depende do ultimo ANALYZE).\n")
    top = sorted(data["tables"], key=lambda t: t["est_rows"] or 0, reverse=True)[:30]
    w("| # | Tabela | Linhas (est.) | Tamanho total |")
    w("|--:|---|--:|--:|")
    for i, t in enumerate(top, 1):
        w(f"| {i} | `{t['schema']}.{t['name']}` | {t['est_rows']:,} | "
          f"{human_bytes(t['total_bytes'])} |")

    # 3. Dominio (Tarefa 2)
    w("\n## 3. Dominio do negocio (foco Copiloto V4)\n")
    for domain, candidates in DOMAIN_MAP.items():
        present = [(s, c) for c in candidates for s in schemas if (s, c) in existing]
        w(f"\n### {domain}\n")
        if not present:
            w("_Nenhuma das tabelas candidatas encontrada nos schemas radiografados._\n")
        for s, name in present:
            t = tbl_by[(s, name)]
            w(f"\n**`{s}.{name}`** — ~{t['est_rows']:,} linhas · {human_bytes(t['total_bytes'])}\n")
            _render_table_detail(w, s, name, cols_by, pks_by, fks_by)

    # Varredura por padrao
    w("\n### Varredura por padrao de nome (candidatas adicionais)\n")
    for domain, rows in data["pattern_hits"].items():
        if not rows:
            continue
        shown = rows[:15]
        names = ", ".join(f"`{r['name']}` ({r['est_rows']:,})" for r in shown)
        extra = f" … +{len(rows)-15}" if len(rows) > 15 else ""
        w(f"- **{domain}**: {names}{extra}")

    # 4. Views
    w("\n## 4. Views\n")
    if not data["views"]:
        w("_Nenhuma view nos schemas radiografados._\n")
    else:
        w(f"Total: {len(data['views'])} views.\n")
        for v in data["views"]:
            w(f"\n<details><summary><code>{v['schema']}.{v['name']}</code></summary>\n")
            definition = (v["def"] or "").strip()
            w("\n```sql\n" + definition[:4000] +
              ("\n-- ...(truncado)" if len(definition) > 4000 else "") + "\n```\n")
            w("</details>")

    # 5. Funcoes
    w("\n## 5. Funcoes / procedures\n")
    if not data["functions"]:
        w("_Nenhuma funcao nos schemas radiografados._\n")
    else:
        w(f"Total: {len(data['functions'])}.\n")
        w("| Schema | Nome | Tipo | Retorno | Args | Lang |")
        w("|---|---|---|---|---|---|")
        for f in data["functions"][:200]:
            args = (f["args"] or "")[:60].replace("|", "\\|")
            ret = (f["result"] or "")[:40].replace("|", "\\|")
            w(f"| `{f['schema']}` | `{f['name']}` | {f['kind']} | {ret} | "
              f"{args} | {f['language']} |")
        if len(data["functions"]) > 200:
            w(f"\n_…+{len(data['functions'])-200} funcoes (ver JSON)._")

    # 6. Sovis x ERP
    w("\n## 6. Sovis x ERP\n")
    sv = data["sovis"]
    roles = sv.get("roles", [])
    if roles:
        sovis_roles = [r for r in roles if "sovis" in r["rolname"].lower()]
        w(f"\n**Roles no cluster:** {len(roles)} no total.")
        if sovis_roles:
            w("\nRoles relacionadas a Sovis:")
            for r in sovis_roles:
                w(f"- `{r['rolname']}` (login={r['rolcanlogin']}, super={r['rolsuper']})")
        else:
            w("\n_Nenhuma role com 'sovis' no nome._ Roles de login disponiveis:")
            for r in [x for x in roles if x["rolcanlogin"]][:30]:
                w(f"- `{r['rolname']}`")
    elif "roles_error" in sv:
        w(f"\n_Sem permissao para listar roles: {sv['roles_error']}_")

    grants = sv.get("grants_like_sovis", [])
    w("\n**Grants para grantee ilike '%sovis%':** "
      + (f"{len(grants)} encontrados." if grants else "nenhum (a role pode ler "
         "via PUBLIC/owner em vez de grant explicito por tabela)."))
    for g in grants[:50]:
        w(f"- `{g['grantee']}` → `{g['schema']}.{g['table']}` ({g['priv']})")

    objs = sv.get("objects_like_sovis", [])

    # Camada de LEITURA: views ciclone_view_sovis_* agrupadas por dominio.
    sovis_views = sorted(o["name"] for o in objs if o["kind"] in ("v", "m")
                         and o["name"].startswith("ciclone_view_sovis_"))
    sovis_tables = sorted(o["name"] for o in objs if o["kind"] in ("r", "p"))
    buckets = {
        "Cadastro de cliente": ["cliente", "contato", "endereco", "categoria",
                                "atividade", "cidade", "estado"],
        "Produto / grade / colecao": ["produto", "grade", "grupoproduto",
                                      "pacote", "lote", "media", "marca", "colecao"],
        "Tabela de preco": ["tabpreco", "preco", "formapagto", "prazopagto",
                            "formarecebimento", "moeda"],
        "Estoque / disponibilidade": ["estoque", "saldo", "mix"],
        "Pedido (retorno p/ ERP)": ["pedido", "itempedido"],
        "Faturamento / financeiro": ["fatura", "itemfatura"],
        "Empresa / usuario / vendedor": ["empresa", "usuario", "fornecedor",
                                         "objetivovenda", "motivonaovenda", "logstatus"],
    }
    w(f"\n### 6.1 Camada de LEITURA do Sovis — views `ciclone_view_sovis_*` "
      f"({len(sovis_views)} de {len([o for o in objs if o['kind'] in ('v','m')])} objetos-view)\n")
    w("O Sovis (CRM de forca de vendas) le o ERP por um **conjunto dedicado de "
      "views** com prefixo `ciclone_view_sovis_` (contrato estavel, versionado no "
      "topo de cada view via coluna `versao`). Agrupadas por dominio:\n")
    assigned = set()
    for label, kws in buckets.items():
        hits = [v for v in sovis_views
                if any(k in v.replace("ciclone_view_sovis_", "") for k in kws)]
        hits = [v for v in hits if v not in assigned]
        assigned.update(hits)
        if hits:
            short = ", ".join("`" + v.replace("ciclone_view_sovis_", "") + "`"
                              for v in hits)
            w(f"- **{label}**: {short}")
    rest = [v for v in sovis_views if v not in assigned]
    if rest:
        w("- **Outras**: " + ", ".join("`" + v.replace("ciclone_view_sovis_", "")
                                       + "`" for v in rest))

    # Camada de ESCRITA: tabelas ws_sovis_* (pedido vindo do Sovis p/ o ERP).
    w("\n### 6.2 Camada de ESCRITA — pedido do Sovis para o ERP\n")
    if sovis_tables:
        w("Tabelas de staging/integracao onde o pedido lancado no Sovis cai antes "
          "de virar pedido de venda do ERP:\n")
        for t in sovis_tables:
            row = next((x for x in data["tables"] if x["name"] == t), None)
            n = f" (~{row['est_rows']:,} linhas)" if row else ""
            w(f"- `public.{t}`{n}")
    w("\nE a camada de API generica de pedido do ERP (entrada programatica): "
      + ", ".join("`" + r["name"] + "`" for r in data["pattern_hits"].get("pedido", [])
                  if r["name"].startswith("ws_api"))
      + ".\n")

    w("\n### 6.3 Leitura / boas praticas\n")
    w("- **Contrato desacoplado por view**: o Sovis nunca le tabela-base direto; "
      "le `ciclone_view_sovis_*`. Isso isola o CRM de mudancas de schema do ERP — "
      "**padrao a copiar** no Copiloto V4 (consumir via view/contrato, nao tabela crua).\n"
      "- **Versionamento embutido**: cada view carrega uma coluna `versao` "
      "(ex.: `'2020.12.21|06h44|Thomazini'`) — facilita rastrear quebra de contrato.\n"
      "- **Escrita isolada via staging** (`ws_sovis_*` / `ws_api_*`): pedido externo "
      "nao escreve direto na tabela de venda; passa por fila/staging. Bom para idempotencia.\n"
      "- **A evitar**: logica de negocio dentro da view (ha subselects com "
      "`json_each_text` para resolver `valor2..N` da tabela de preco) — dificulta "
      "manutencao; no V4 prefira resolver isso na aplicacao/ETL.\n")
    w("\n> As definicoes completas de cada view estao na secao **4. Views** (e no "
      "JSON), incluindo o mapeamento exato view→tabelas-base do ERP.\n")

    return "\n".join(L) + "\n"


def _render_table_detail(w, schema, name, cols_by, pks_by, fks_by):
    cols = cols_by.get((schema, name), [])
    pk_cols = {r["column"] for r in pks_by.get((schema, name), [])}
    fks = fks_by.get((schema, name), [])
    fk_by_col = {}
    for fk in fks:
        for c in (fk["columns"] or "").split(","):
            fk_by_col[c] = f"{fk['ref_schema']}.{fk['ref_table']}({fk['ref_columns']})"
    w("\n| Coluna | Tipo | Null | Chave |")
    w("|---|---|:--:|---|")
    for c in cols:
        typ = c["type"]
        if c["maxlen"]:
            typ += f"({c['maxlen']})"
        flags = []
        if c["name"] in pk_cols:
            flags.append("PK")
        if c["name"] in fk_by_col:
            flags.append(f"FK→{fk_by_col[c['name']]}")
        nn = "" if c["nullable"] == "YES" else "NOT NULL"
        w(f"| `{c['name']}` | {typ} | {'' if c['nullable']=='YES' else 'N'} | "
          f"{' '.join(flags)} |".replace("NOT NULL", ""))


def build_json(data, schemas):
    cols_by = index_by_table(data["columns"])
    pks_by = index_by_table(data["pks"])
    fks_by = index_by_table(data["fks"])
    idx_by = index_by_table(data["indexes"])

    tables = []
    for t in data["tables"]:
        key = (t["schema"], t["name"])
        tables.append({
            "schema": t["schema"], "name": t["name"],
            "est_rows": t["est_rows"], "total_bytes": t["total_bytes"],
            "columns": [{
                "name": c["name"], "type": c["type"], "nullable": c["nullable"] == "YES",
                "maxlen": c["maxlen"], "default": c["default"],
            } for c in cols_by.get(key, [])],
            "pk": [r["column"] for r in pks_by.get(key, [])],
            "fks": [{
                "columns": (fk["columns"] or "").split(","),
                "ref": f"{fk['ref_schema']}.{fk['ref_table']}",
                "ref_columns": (fk["ref_columns"] or "").split(","),
            } for fk in fks_by.get(key, [])],
            "indexes": [{"name": i["name"], "def": i["def"]} for i in idx_by.get(key, [])],
        })

    return {
        "generated_at": dt.datetime.now().isoformat(timespec="seconds"),
        "server": data["server"],
        "schemas_introspected": schemas,
        "schema_summary": data["schemas"],
        "tables": tables,
        "views": data["views"],
        "functions": data["functions"],
        "sovis": data["sovis"],
        "pattern_hits": data["pattern_hits"],
    }


def main():
    ap = argparse.ArgumentParser(description="Introspeccao READ-ONLY do ERP Ciclone.")
    ap.add_argument("--schema", action="append", default=None,
                    help="Schema a radiografar (repetivel). Default: public.")
    ap.add_argument("--out-dir", default=DEFAULT_OUT, help="Diretorio de saida.")
    ap.add_argument("--env", default=DEFAULT_ENV, help="Caminho do .env com creds ERP_*.")
    args = ap.parse_args()

    schemas = args.schema or ["public"]
    env = load_env(args.env)

    print(f"[introspect] conectando em {env.get('ERP_DATABASE')}@{env.get('ERP_SERVER')} "
          f"como {env.get('ERP_USERNAME')} (READ-ONLY)…")
    conn = connect(env)
    try:
        data = collect(conn, schemas)
    finally:
        conn.close()

    os.makedirs(args.out_dir, exist_ok=True)
    md_path = os.path.join(args.out_dir, "db_ciclone_schema.md")
    json_path = os.path.join(args.out_dir, "db_ciclone_schema.json")

    with open(md_path, "w", encoding="utf-8") as fh:
        fh.write(render_md(data, schemas))
    with open(json_path, "w", encoding="utf-8") as fh:
        json.dump(build_json(data, schemas), fh, ensure_ascii=False,
                  indent=2, default=str)

    print(f"[introspect] OK — {len(data['tables'])} tabelas, "
          f"{len(data['views'])} views, {len(data['functions'])} funcoes.")
    print(f"[introspect] MD   -> {md_path}")
    print(f"[introspect] JSON -> {json_path}")


if __name__ == "__main__":
    main()
