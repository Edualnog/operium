-- Migration para criar o bucket de fotos de colaboradores
-- Esta migration cria o bucket e configura as políticas RLS necessárias

-- Nota: A criação de buckets via SQL não é suportada diretamente pelo Supabase
-- Este arquivo serve como documentação. O bucket deve ser criado manualmente via Dashboard
-- ou usando a API do Supabase Management.

-- Para criar o bucket via SQL, você precisaria usar a extensão storage_admin
-- Mas isso requer permissões de superuser, então é melhor criar manualmente.

-- INSTRUÇÕES PARA CRIAR O BUCKET:
-- 1. Acesse o Supabase Dashboard
-- 2. Vá em Storage → New bucket
-- 3. Configure:
--    - Name: colaboradores-fotos
--    - Public bucket: ✅ Marcar como público
--    - File size limit: 5242880 (5 MB em bytes)
--    - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp

-- Após criar o bucket, execute as políticas RLS abaixo:

-- Política 1: Permitir leitura pública (SELECT)
CREATE POLICY IF NOT EXISTS "Public read access for colaboradores-fotos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'colaboradores-fotos');

-- Política 2: Permitir upload para usuários autenticados (INSERT)
CREATE POLICY IF NOT EXISTS "Authenticated users can upload to colaboradores-fotos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'colaboradores-fotos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política 3: Permitir atualização para o dono do arquivo (UPDATE)
CREATE POLICY IF NOT EXISTS "Users can update their own files in colaboradores-fotos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'colaboradores-fotos' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'colaboradores-fotos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política 4: Permitir exclusão para o dono do arquivo (DELETE)
CREATE POLICY IF NOT EXISTS "Users can delete their own files in colaboradores-fotos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'colaboradores-fotos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

