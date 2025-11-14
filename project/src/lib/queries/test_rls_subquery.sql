SELECT 
  cod_vendedor::text 
FROM 
  public.profiles 
WHERE 
  id = auth.uid();
