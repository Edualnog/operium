-- Atualizar função handle_new_user para incluir trial_start_date automaticamente
-- Isso garante que novos usuários tenham o trial iniciado desde a criação do perfil

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, trial_start_date)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NOW() -- Iniciar trial automaticamente na criação do perfil
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS 'Cria perfil automaticamente para novos usuários e inicia o período de trial de 7 dias';

