# ⚠️ IMPORTANTE: Executar Migration para Dados da Empresa

## Problema

Se você está vendo o erro "Erro ao salvar dados da empresa", é porque as colunas da empresa ainda não foram criadas na tabela `profiles`.

## Solução: Executar a Migration

### Passo a Passo

1. **Acesse o Supabase Dashboard**
   - Vá para https://supabase.com/dashboard
   - Faça login na sua conta
   - Selecione seu projeto

2. **Abra o SQL Editor**
   - No menu lateral, clique em **SQL Editor**
   - Ou acesse diretamente: https://supabase.com/dashboard/project/[SEU_PROJECT_ID]/sql

3. **Execute a Migration**
   - Clique em **New Query** (Nova Query)
   - Cole o seguinte código SQL:

```sql
-- Adicionar campos de empresa na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS company_email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Comentários nas colunas
COMMENT ON COLUMN public.profiles.company_name IS 'Nome da empresa do usuário';
COMMENT ON COLUMN public.profiles.cnpj IS 'CNPJ da empresa';
COMMENT ON COLUMN public.profiles.company_email IS 'Email da empresa';
COMMENT ON COLUMN public.profiles.phone IS 'Telefone de contato';
```

4. **Execute a Query**
   - Clique no botão **Run** (ou pressione `Ctrl+Enter` / `Cmd+Enter`)
   - Aguarde a confirmação de sucesso

5. **Verifique se Funcionou**
   - Vá em **Table Editor** > **profiles**
   - Verifique se as novas colunas aparecem:
     - `company_name`
     - `cnpj`
     - `company_email`
     - `phone`

## Após Executar a Migration

1. **Recarregue a página** do dashboard (F5)
2. **Tente salvar os dados da empresa novamente**
3. O erro não deve mais aparecer

## Verificação Rápida

Para verificar se as colunas foram criadas, execute esta query no SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name IN ('company_name', 'cnpj', 'company_email', 'phone');
```

Se retornar 4 linhas, as colunas foram criadas com sucesso! ✅

## Arquivo da Migration

O arquivo completo está em: `supabase/migrations/012_add_company_fields_to_profiles.sql`

## Notas

- ⚠️ A migration é **idempotente** (pode ser executada múltiplas vezes sem problemas)
- ✅ Usa `IF NOT EXISTS`, então não causará erro se as colunas já existirem
- ✅ Não afeta dados existentes
- ✅ As colunas são opcionais (nullable), então não precisa preencher todos os campos

## Suporte

Se ainda tiver problemas após executar a migration:
1. Verifique os logs do Supabase em **Logs** > **Postgres Logs**
2. Verifique se as políticas RLS estão corretas (usuários podem atualizar seus próprios perfis)
3. Verifique se você está autenticado corretamente

