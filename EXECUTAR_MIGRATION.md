# 🔧 Executar Migration - Campos Extras de Produtos

O erro "Could not find the 'codigo' column" indica que a migration que adiciona campos extras não foi executada.

## 📋 Passo a Passo

### 1. Acesse o Supabase Dashboard

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto "ERP - Amox Fácil"

### 2. Abra o SQL Editor

1. No menu lateral, clique em **SQL Editor** (ícone de código `</>`)
2. Clique em **"New Query"** ou **"New"**

### 3. Execute a Migration

1. Abra o arquivo `supabase/migrations/010_ferramentas_produto_extra.sql` no seu projeto
2. **Copie TODO o conteúdo** do arquivo
3. **Cole** no SQL Editor do Supabase
4. Clique em **"Run"** (ou pressione Ctrl+Enter / Cmd+Enter)

### 4. Verifique se Funcionou

1. Você deve ver uma mensagem de sucesso
2. Agora tente salvar um produto novamente

## 📝 Conteúdo da Migration

A migration adiciona os seguintes campos à tabela `ferramentas`:

- `codigo` - Código interno do produto
- `foto_url` - URL da foto do produto
- `tamanho` - Tamanho/medida do produto
- `cor` - Cor do produto
- `tipo_item` - Tipo: ferramenta, epi ou consumivel

## ⚠️ Importante

- A migration usa `IF NOT EXISTS`, então é seguro executar múltiplas vezes
- Não vai apagar dados existentes
- Apenas adiciona as colunas que faltam

## 🆘 Se Ainda Der Erro

Se mesmo após executar a migration o erro persistir:

1. Verifique se você está no projeto correto do Supabase
2. Verifique se a migration foi executada com sucesso
3. Tente recarregar a página da aplicação
4. Verifique os logs do Supabase em **Logs** > **Postgres Logs**

