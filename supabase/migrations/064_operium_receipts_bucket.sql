-- Migration: Storage bucket policies for expense receipts
-- IMPORTANTE: O bucket deve ser criado manualmente no Supabase Dashboard antes de executar esta migration

-- INSTRUÇÕES PARA CRIAR O BUCKET (FAÇA ISSO PRIMEIRO):
-- 1. Acesse o Supabase Dashboard → Storage
-- 2. Clique em "New bucket"
-- 3. Configure:
--    - Name: operium-receipts
--    - Public bucket: ✅ Marcar como público
--    - File size limit: 5242880 (5 MB)
--    - Allowed MIME types: image/jpeg, image/png, image/webp
-- 4. Clique em "Create bucket"

-- Após criar o bucket, execute esta migration para configurar as políticas RLS:

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Public read access for operium-receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to operium-receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files in operium-receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files in operium-receipts" ON storage.objects;

-- Política 1: Permitir leitura pública (SELECT) - necessário para exibir as fotos
CREATE POLICY "Public read access for operium-receipts"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'operium-receipts');

-- Política 2: Permitir upload para usuários autenticados (INSERT)
-- Os arquivos devem estar em uma pasta com o nome do org_id
CREATE POLICY "Authenticated users can upload to operium-receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'operium-receipts');

-- Política 3: Permitir atualização (UPDATE)
CREATE POLICY "Users can update their own files in operium-receipts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'operium-receipts')
WITH CHECK (bucket_id = 'operium-receipts');

-- Política 4: Permitir exclusão (DELETE)
CREATE POLICY "Users can delete their own files in operium-receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'operium-receipts');
