# Como criar a tabela de Termos de Responsabilidade

Para que a funcionalidade de visualização de assinaturas funcione corretamente, você precisa criar a tabela `termos_responsabilidade` no Supabase.

## Passos:

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral
4. Cole e execute o seguinte SQL:

```sql
-- Criar tabela termos_responsabilidade
CREATE TABLE IF NOT EXISTS termos_responsabilidade (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  movimentacao_id UUID REFERENCES movimentacoes(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('retirada', 'devolucao')),
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  assinatura_url TEXT,
  assinatura_base64 TEXT,
  pdf_url TEXT,
  data_assinatura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_termos_profile_id ON termos_responsabilidade(profile_id);
CREATE INDEX IF NOT EXISTS idx_termos_colaborador_id ON termos_responsabilidade(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_termos_movimentacao_id ON termos_responsabilidade(movimentacao_id);
CREATE INDEX IF NOT EXISTS idx_termos_data_assinatura ON termos_responsabilidade(data_assinatura DESC);

-- Habilitar RLS
ALTER TABLE termos_responsabilidade ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios termos
CREATE POLICY "Users can view own termos" ON termos_responsabilidade
  FOR SELECT USING (auth.uid() = profile_id);

-- Política para usuários criarem seus próprios termos
CREATE POLICY "Users can create own termos" ON termos_responsabilidade
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Política para usuários atualizarem seus próprios termos
CREATE POLICY "Users can update own termos" ON termos_responsabilidade
  FOR UPDATE USING (auth.uid() = profile_id);

-- Política para usuários excluírem seus próprios termos
CREATE POLICY "Users can delete own termos" ON termos_responsabilidade
  FOR DELETE USING (auth.uid() = profile_id);
```

5. Clique em **Run** para executar

## Verificação

Após executar, você pode verificar se a tabela foi criada corretamente com:

```sql
SELECT * FROM termos_responsabilidade LIMIT 1;
```

Se retornar sem erro (mesmo que vazio), a tabela foi criada com sucesso!

## Funcionalidade

Com a tabela criada, o sistema irá:
- Salvar automaticamente os termos de responsabilidade com assinatura digital
- Permitir visualizar a assinatura do colaborador ao clicar em uma movimentação
- Possibilitar reimprimir o termo a qualquer momento

