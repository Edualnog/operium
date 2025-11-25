# Configuração do Supabase Storage para Fotos de Colaboradores

## 📋 Passo a Passo

### 1. Criar o Bucket

1. Acesse o **Supabase Dashboard**
2. Vá em **Storage** (menu lateral)
3. Clique em **"New bucket"**
4. Configure:
   - **Name**: `colaboradores-fotos`
   - **Public bucket**: ✅ **Marcar como público** (para permitir acesso às fotos)
   - **File size limit**: 5 MB (ou o valor desejado)
   - **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp`

### 2. Configurar Políticas RLS (Row Level Security)

1. No bucket `colaboradores-fotos`, vá em **Policies**
2. Clique em **"New Policy"**
3. Crie duas políticas:

#### Política 1: Permitir Upload (INSERT)
- **Policy name**: `Users can upload their own photos`
- **Allowed operation**: `INSERT`
- **Policy definition**:
```sql
(user_id() = (storage.foldername(name))[1]::uuid)
```

#### Política 2: Permitir Leitura (SELECT)
- **Policy name**: `Public read access`
- **Allowed operation**: `SELECT`
- **Policy definition**:
```sql
true
```

#### Política 3: Permitir Atualização (UPDATE)
- **Policy name**: `Users can update their own photos`
- **Allowed operation**: `UPDATE`
- **Policy definition**:
```sql
(user_id() = (storage.foldername(name))[1]::uuid)
```

#### Política 4: Permitir Exclusão (DELETE)
- **Policy name**: `Users can delete their own photos`
- **Allowed operation**: `DELETE`
- **Policy definition**:
```sql
(user_id() = (storage.foldername(name))[1]::uuid)
```

### 3. Estrutura de Pastas

As fotos serão armazenadas na seguinte estrutura:
```
colaboradores-fotos/
  └── {user_id}/
      └── {colaborador_id}_{timestamp}.{ext}
```

### 4. Configurar CORS (IMPORTANTE para deploy)

O erro "Failed to fetch" geralmente é causado por CORS não configurado. Para resolver:

1. Acesse o **Supabase Dashboard**
2. Vá em **Settings** (ícone de engrenagem)
3. Clique em **API**
4. Role até a seção **"Additional Settings"**
5. Em **"Allowed CORS origins"**, adicione:
   - Para desenvolvimento local: `http://localhost:3000`
   - Para produção: o domínio da sua aplicação (ex: `https://seu-projeto.vercel.app`)
   - Você pode adicionar múltiplos domínios, um por linha
6. Clique em **Save**

**⚠️ IMPORTANTE**: Sem configurar CORS, o upload falhará com erro "Failed to fetch" em produção!

### 5. Executar Migration SQL

Após criar o bucket, execute a migration SQL para configurar as políticas RLS:

1. No Supabase Dashboard, vá em **SQL Editor**
2. Abra o arquivo `supabase/migrations/009_create_storage_bucket.sql`
3. Copie e cole o conteúdo no editor
4. Clique em **Run**

Isso criará automaticamente todas as políticas RLS necessárias.

### 6. Verificação

Após configurar, teste fazendo upload de uma foto no cadastro de colaborador. Se houver erro, verifique:

- ✅ Bucket está público?
- ✅ Políticas RLS estão configuradas? (execute a migration SQL)
- ✅ CORS está configurado? (Settings > API > Allowed CORS origins)
- ✅ Tamanho do arquivo está dentro do limite?
- ✅ Tipo de arquivo é uma imagem?
- ✅ Variáveis de ambiente estão configuradas? (`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## 🔒 Segurança

- As fotos são organizadas por `user_id` para garantir isolamento multi-tenant
- Apenas o dono pode fazer upload/update/delete
- Leitura é pública (necessário para exibir as fotos)

## 🔧 Solução de Problemas

### Erro: "Failed to fetch"

**Causa mais comum**: CORS não configurado

**Solução**:
1. Acesse Supabase Dashboard > Settings > API
2. Em "Allowed CORS origins", adicione seu domínio
3. Para local: `http://localhost:3000`
4. Para produção: `https://seu-dominio.com`
5. Salve e tente novamente

### Erro: "Bucket not found"

**Solução**:
1. Verifique se o bucket `colaboradores-fotos` foi criado
2. Verifique se o nome está exatamente correto (case-sensitive)
3. O bucket deve estar marcado como **público**

### Erro: "Permission denied" ou "Row-level security policy"

**Solução**:
1. Execute a migration SQL: `supabase/migrations/009_create_storage_bucket.sql`
2. Verifique se as políticas RLS foram criadas corretamente
3. Verifique se você está autenticado (faça login novamente)

### Erro: "File size limit exceeded"

**Solução**:
1. Reduza o tamanho da imagem (máximo 5MB)
2. Ou aumente o limite no bucket (Supabase Dashboard > Storage > Bucket Settings)

### Erro: "Invalid MIME type"

**Solução**:
1. Use apenas imagens: JPG, PNG, GIF ou WebP
2. Verifique se o tipo está permitido nas configurações do bucket

## 📝 Nota

Se preferir manter o bucket privado, você precisará gerar URLs assinadas para cada foto. Nesse caso, será necessário ajustar o componente `PhotoUpload.tsx` para usar `getSignedUrl` ao invés de `getPublicUrl`.

