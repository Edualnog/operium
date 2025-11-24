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

### 4. Verificação

Após configurar, teste fazendo upload de uma foto no cadastro de colaborador. Se houver erro, verifique:

- ✅ Bucket está público?
- ✅ Políticas RLS estão configuradas?
- ✅ Tamanho do arquivo está dentro do limite?
- ✅ Tipo de arquivo é uma imagem?

## 🔒 Segurança

- As fotos são organizadas por `user_id` para garantir isolamento multi-tenant
- Apenas o dono pode fazer upload/update/delete
- Leitura é pública (necessário para exibir as fotos)

## 📝 Nota

Se preferir manter o bucket privado, você precisará gerar URLs assinadas para cada foto. Nesse caso, será necessário ajustar o componente `PhotoUpload.tsx` para usar `getSignedUrl` ao invés de `getPublicUrl`.

