# 📊 Schema Correto do Supabase - Copiloto Focco Brasil

## 🔐 Tabela: `profiles`
```sql
create table public.profiles (
  id uuid not null,                              -- UUID do usuário (FK auth.users)
  cod_vendedor integer null,                     -- ✅ Código único do vendedor
  nome_completo text not null,                   -- Nome completo
  apelido text null,                             -- Apelido/nome de exibição
  cargo text null,                               -- 'vendedor', 'gestor', 'diretor'
  status text null default 'ativo'::text,        -- Status do perfil
  vendedor_responsavel text null,                -- Referência ao gerente
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_cod_vendedor_key unique (cod_vendedor),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id)
);
```

**Colunas Importantes:**
- `id` → UUID único (matches auth.users.id)
- `cod_vendedor` → Número inteiro que relaciona com `tabela_clientes.cod_vendedor`

---

## 👥 Tabela: `tabela_clientes`
```sql
create table public.tabela_clientes (
  id serial not null,                            -- ID sequencial
  codigo_cliente integer null,                   -- ✅ Código único do cliente
  razao_social text null,                        -- Nome jurídico
  nome_fantasia text null,                       -- Nome comercial
  cidade text null,                              -- Cidade
  estado text null,                              -- UF
  cep text null,                                 -- CEP
  codigo_ibge_cidade text null,                  -- Código IBGE
  nome_contato text null,                        -- Nome do contato
  vendedor_responsavel text null,                -- Nome do vendedor responsável
  situacao text null,                            -- Status do cliente
  valor_limite_credito numeric null,             -- Limite de crédito
  saldo_utilizado numeric null,                  -- Saldo utilizado
  limite_disponivel numeric null,                -- Limite disponível
  celular text null,                             -- Telefone celular
  bairro text null,                              -- Bairro
  cod_vendedor integer null,                     -- ✅ FK para profiles.cod_vendedor
  created_at timestamp with time zone null default timezone('utc'::text, now()),
  updated_at timestamp with time zone null default now(),
  constraint tabela_clientes_pkey primary key (id),
  constraint tabela_clientes_codigo_cliente_key unique (codigo_cliente)
);

create index idx_clientes_cod_vendedor on public.tabela_clientes using btree (cod_vendedor);
```

**Colunas Importantes:**
- `codigo_cliente` → ID único do cliente
- `cod_vendedor` → Referencia `profiles.cod_vendedor`

---

## 📈 Tabela: `analise_rfm` (esperada)
```sql
-- Estrutura esperada baseada no código
create table public.analise_rfm (
  id serial not null,
  codigo_cliente integer not null,               -- FK tabela_clientes.codigo_cliente
  perfil text not null,                          -- '30' (ouro), '10' (prata), '5' (bronze)
  meta_ano_atual numeric null,                   -- Meta do ano
  valor_ano_atual numeric null,                  -- Valor vendido no ano
  percentual_atingimento numeric null,           -- % de atingimento
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint analise_rfm_pkey primary key (id)
);

create index idx_rfm_codigo_cliente on public.analise_rfm using btree (codigo_cliente);
create index idx_rfm_perfil on public.analise_rfm using btree (perfil);
```

**Colunas Importantes:**
- `codigo_cliente` → FK para `tabela_clientes.codigo_cliente`
- `perfil` → '30' (ouro), '10' (prata), '5' (bronze)

---

## 🔄 Fluxo de Relacionamento

```
┌─────────────────────────────────────────────────────────────┐
│ Autenticação (auth.users)                                   │
│ - id: UUID (ex: 09f316d7-eeac-4828-85a0-ad1b891f8460)      │
└──────────────────────┬──────────────────────────────────────┘
                       │ FK
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ profiles                                                     │
│ - id: UUID (matches auth.users.id)                          │
│ - cod_vendedor: INTEGER (ex: 16)   ← KEY!                  │
│ - apelido: TEXT (ex: "Misterclaudio")                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ cod_vendedor
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ tabela_clientes                                              │
│ - codigo_cliente: INTEGER (ex: 100476)                      │
│ - nome_fantasia: TEXT (ex: "Ótica Aracati")                 │
│ - cod_vendedor: INTEGER (ex: 16)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ codigo_cliente
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ analise_rfm                                                  │
│ - codigo_cliente: INTEGER (ex: 100476)                      │
│ - perfil: TEXT ('30', '10', '5')                            │
│ - meta_ano_atual: NUMERIC                                   │
│ - valor_ano_atual: NUMERIC                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Fluxo de Query Corrigido

### 1️⃣ Obter user.id
```typescript
const { data: { user } } = await supabase.auth.getUser();
// user.id = "09f316d7-eeac-4828-85a0-ad1b891f8460"
```

### 2️⃣ Buscar cod_vendedor em profiles
```typescript
const { data: profileData } = await supabase
  .from('profiles')
  .select('cod_vendedor')  // ✅ Nome correto
  .eq('id', user.id);
// profileData.cod_vendedor = 16
```

### 3️⃣ Buscar clientes em tabela_clientes
```typescript
const { data: clientesInfo } = await supabase
  .from('tabela_clientes')
  .select('codigo_cliente, nome_fantasia, cidade')
  .eq('cod_vendedor', codigoVendedor);  // codigoVendedor = 16
// Retorna lista de clientes do vendedor 16
```

### 4️⃣ Buscar dados RFM em analise_rfm
```typescript
const { data: rfmData } = await supabase
  .from('analise_rfm')
  .select('codigo_cliente, meta_ano_atual, valor_ano_atual, perfil')
  .in('codigo_cliente', codigosClientes)  // [100476, 100477, ...]
  .eq('perfil', '30');  // Perfil Ouro
// Retorna dados RFM dos clientes do vendedor com perfil Ouro
```

---

## 🚀 Status da Correção

- ✅ `profiles.cod_vendedor` (não `codigo_vendedor`)
- ✅ `tabela_clientes.cod_vendedor` (FK para profiles)
- ✅ `analise_rfm.codigo_cliente` (FK para tabela_clientes)
- ✅ Fluxo de relacionamento completo
- ✅ Índices para performance

---

## 📝 Notas Importantes

1. **Coluna em profiles:** `cod_vendedor` (não `codigo_vendedor`)
2. **Valores em analise_rfm.perfil:** '30', '10', '5' (strings)
3. **RLS:** Certifique-se de que RLS está configurado corretamente para filtrar dados
4. **Índices:** Há índices em `tabela_clientes.cod_vendedor` para performance

---

**Próximo passo:** Agora o código deve carregar corretamente! Recarregue a página e verifique o console para os logs de sucesso. 🎉
