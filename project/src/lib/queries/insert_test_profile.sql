INSERT INTO public.profiles (id, cod_vendedor, nome_completo, apelido, cargo, status, vendedor_responsavel, vendedor)
VALUES (
  auth.uid(), 
  123, -- Substitua por um cod_vendedor de teste
  'Nome Completo do Vendedor', 
  'Apelido do Vendedor', 
  'vendedor', 
  'ativo', 
  'Responsável', 
  '123' -- Substitua pelo mesmo cod_vendedor de teste
);
