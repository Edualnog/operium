-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela: profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: colaboradores
CREATE TABLE colaboradores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: ferramentas
CREATE TABLE ferramentas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria TEXT,
  quantidade_total INTEGER NOT NULL DEFAULT 0,
  quantidade_disponivel INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'ok' CHECK (estado IN ('ok', 'danificada', 'em_conserto')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: movimentacoes
CREATE TABLE movimentacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ferramenta_id UUID NOT NULL REFERENCES ferramentas(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'retirada', 'devolucao', 'ajuste', 'conserto')),
  quantidade INTEGER NOT NULL,
  observacoes TEXT,
  data TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: consertos
CREATE TABLE consertos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ferramenta_id UUID NOT NULL REFERENCES ferramentas(id) ON DELETE CASCADE,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'em_andamento', 'concluido')),
  custo NUMERIC(10, 2),
  data_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_retorno TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ferramentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE consertos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Políticas RLS para colaboradores
CREATE POLICY "Users can view own colaboradores"
  ON colaboradores FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own colaboradores"
  ON colaboradores FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own colaboradores"
  ON colaboradores FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Users can delete own colaboradores"
  ON colaboradores FOR DELETE
  USING (profile_id = auth.uid());

-- Políticas RLS para ferramentas
CREATE POLICY "Users can view own ferramentas"
  ON ferramentas FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own ferramentas"
  ON ferramentas FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own ferramentas"
  ON ferramentas FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Users can delete own ferramentas"
  ON ferramentas FOR DELETE
  USING (profile_id = auth.uid());

-- Políticas RLS para movimentacoes
CREATE POLICY "Users can view own movimentacoes"
  ON movimentacoes FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own movimentacoes"
  ON movimentacoes FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own movimentacoes"
  ON movimentacoes FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Users can delete own movimentacoes"
  ON movimentacoes FOR DELETE
  USING (profile_id = auth.uid());

-- Políticas RLS para consertos
CREATE POLICY "Users can view own consertos"
  ON consertos FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own consertos"
  ON consertos FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own consertos"
  ON consertos FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Users can delete own consertos"
  ON consertos FOR DELETE
  USING (profile_id = auth.uid());

-- Índices para performance
CREATE INDEX idx_colaboradores_profile_id ON colaboradores(profile_id);
CREATE INDEX idx_ferramentas_profile_id ON ferramentas(profile_id);
CREATE INDEX idx_ferramentas_estado ON ferramentas(estado);
CREATE INDEX idx_movimentacoes_profile_id ON movimentacoes(profile_id);
CREATE INDEX idx_movimentacoes_ferramenta_id ON movimentacoes(ferramenta_id);
CREATE INDEX idx_movimentacoes_data ON movimentacoes(data);
CREATE INDEX idx_consertos_profile_id ON consertos(profile_id);
CREATE INDEX idx_consertos_ferramenta_id ON consertos(ferramenta_id);
CREATE INDEX idx_consertos_status ON consertos(status);

-- Função para criar profile automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar profile automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

