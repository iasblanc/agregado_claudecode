-- =====================================================
-- Agregado.Pro — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('agregado', 'transportadora')),
  nome TEXT,
  telefone TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transportadoras
CREATE TABLE IF NOT EXISTS public.transportadoras (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  razao_social TEXT,
  cnpj TEXT,
  logo_url TEXT
);

-- Agregados
CREATE TABLE IF NOT EXISTS public.agregados (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  cpf TEXT,
  cnh TEXT,
  foto_url TEXT
);

-- Veículos
CREATE TABLE IF NOT EXISTS public.veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agregado_id UUID REFERENCES public.agregados(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  placa TEXT NOT NULL,
  ano INTEGER,
  valor_veiculo NUMERIC,
  fotos TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipamentos
CREATE TABLE IF NOT EXISTS public.equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agregado_id UUID REFERENCES public.agregados(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  placa TEXT,
  ano INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Motoristas
CREATE TABLE IF NOT EXISTS public.motoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agregado_id UUID REFERENCES public.agregados(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnh TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custo KM Config
CREATE TABLE IF NOT EXISTS public.custo_km_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agregado_id UUID REFERENCES public.agregados(id) ON DELETE CASCADE,
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
  preco_diesel NUMERIC,
  consumo_km_litro NUMERIC,
  km_mes NUMERIC,
  parcela_caminhao NUMERIC,
  seguro NUMERIC,
  licenciamento NUMERIC,
  rastreador NUMERIC,
  outros_fixos NUMERIC,
  salario_motorista NUMERIC,
  manutencao_mensal NUMERIC,
  pneus_mensal NUMERIC,
  pedagio_mensal NUMERIC,
  -- Campos do novo calculador de custo/km (calculadora-custo-km-tac)
  custo_km_calculado NUMERIC,          -- custo/km preciso do último cálculo
  distancia_media NUMERIC,             -- distância média usada no ADM/lucro
  plano TEXT DEFAULT 'f',              -- plano ativo: 'f' | 'p' | 'fu'
  params JSONB DEFAULT '{}',           -- inputs brutos do plano (para reload)
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agregado_id, veiculo_id)
);

-- Migration: se tabela já existe, adicione as novas colunas:
-- ALTER TABLE public.custo_km_config ADD COLUMN IF NOT EXISTS custo_km_calculado NUMERIC;
-- ALTER TABLE public.custo_km_config ADD COLUMN IF NOT EXISTS distancia_media NUMERIC;
-- ALTER TABLE public.custo_km_config ADD COLUMN IF NOT EXISTS plano TEXT DEFAULT 'f';
-- ALTER TABLE public.custo_km_config ADD COLUMN IF NOT EXISTS params JSONB DEFAULT '{}';

-- Transações
CREATE TABLE IF NOT EXISTS public.transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agregado_id UUID REFERENCES public.agregados(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo TEXT CHECK (tipo IN ('entrada', 'saida')),
  categoria TEXT,
  descricao TEXT,
  valor NUMERIC NOT NULL,
  placa TEXT,
  contrato_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contratos do Agregado
CREATE TABLE IF NOT EXISTS public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agregado_id UUID REFERENCES public.agregados(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vagas (Marketplace)
CREATE TABLE IF NOT EXISTS public.vagas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transportadora_id UUID REFERENCES public.transportadoras(id) ON DELETE CASCADE,
  titulo TEXT,
  rota_origem TEXT,
  rota_destino TEXT,
  km_estimado NUMERIC,
  tipo_veiculo TEXT,
  tipo_equipamento TEXT,
  valor_contrato NUMERIC,
  periodo_meses INTEGER,
  descricao TEXT,
  contrata_equipamento BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'encerrada', 'preenchida')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidaturas
CREATE TABLE IF NOT EXISTS public.candidaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id UUID REFERENCES public.vagas(id) ON DELETE CASCADE,
  agregado_id UUID REFERENCES public.agregados(id) ON DELETE CASCADE,
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
  equipamento_id UUID REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  motorista_id UUID REFERENCES public.motoristas(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'recusado')),
  mensagem TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vaga_id, agregado_id)
);

-- Avaliações
CREATE TABLE IF NOT EXISTS public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  avaliador_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  avaliado_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  nota INTEGER CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidaturas: pipeline e contrato status
ALTER TABLE public.candidaturas
  ADD COLUMN IF NOT EXISTS pipeline_status TEXT DEFAULT 'novo'
    CHECK (pipeline_status IN ('novo','visualizado','em negociação',
      'interesse enviado','aprovado','em formalização','contratado','recusado')),
  ADD COLUMN IF NOT EXISTS contrato_status TEXT DEFAULT 'ativo'
    CHECK (contrato_status IN ('ativo','suspenso','encerrado'));

-- Mensagens de contrato (chat entre transportadora e motorista)
CREATE TABLE IF NOT EXISTS public.contrato_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  de TEXT NOT NULL CHECK (de IN ('transportadora','motorista')),
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ocorrências de contrato
CREATE TABLE IF NOT EXISTS public.contrato_ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transportadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agregados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custo_km_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrato_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrato_ocorrencias ENABLE ROW LEVEL SECURITY;

-- Profiles: users see/edit their own
CREATE POLICY "profiles_own" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "profiles_admin" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Transportadoras
CREATE POLICY "transportadoras_own" ON public.transportadoras FOR ALL USING (auth.uid() = id);
CREATE POLICY "transportadoras_public_read" ON public.transportadoras FOR SELECT USING (TRUE);

-- Agregados
CREATE POLICY "agregados_own" ON public.agregados FOR ALL USING (auth.uid() = id);

-- Veículos
CREATE POLICY "veiculos_own" ON public.veiculos FOR ALL USING (auth.uid() = agregado_id);

-- Equipamentos
CREATE POLICY "equipamentos_own" ON public.equipamentos FOR ALL USING (auth.uid() = agregado_id);

-- Motoristas
CREATE POLICY "motoristas_own" ON public.motoristas FOR ALL USING (auth.uid() = agregado_id);

-- Custo KM Config
CREATE POLICY "custo_km_own" ON public.custo_km_config FOR ALL USING (auth.uid() = agregado_id);

-- Transações
CREATE POLICY "transacoes_own" ON public.transacoes FOR ALL USING (auth.uid() = agregado_id);

-- Contratos
CREATE POLICY "contratos_own" ON public.contratos FOR ALL USING (auth.uid() = agregado_id);

-- Vagas: public read (basic fields), full access for owner transportadora
CREATE POLICY "vagas_public_read" ON public.vagas FOR SELECT USING (status = 'ativa');
CREATE POLICY "vagas_transportadora_own" ON public.vagas FOR ALL USING (auth.uid() = transportadora_id);

-- Candidaturas: visible to agregado (own) and transportadora (vaga owner)
CREATE POLICY "candidaturas_agregado" ON public.candidaturas FOR ALL
  USING (auth.uid() = agregado_id);
CREATE POLICY "candidaturas_transportadora" ON public.candidaturas FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.vagas WHERE id = candidaturas.vaga_id AND transportadora_id = auth.uid()
  ));
CREATE POLICY "candidaturas_transportadora_update" ON public.candidaturas FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.vagas WHERE id = candidaturas.vaga_id AND transportadora_id = auth.uid()
  ));

-- Avaliações
CREATE POLICY "avaliacoes_read" ON public.avaliacoes FOR SELECT USING (auth.uid() IN (avaliador_id, avaliado_id));
CREATE POLICY "avaliacoes_insert" ON public.avaliacoes FOR INSERT WITH CHECK (auth.uid() = avaliador_id);

-- Contrato mensagens (transportadora que é dona da vaga)
CREATE POLICY "msg_transp" ON public.contrato_mensagens FOR ALL USING (
  EXISTS (SELECT 1 FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
    WHERE c.id = candidatura_id AND auth.uid() = v.transportadora_id)
);

-- Contrato ocorrências
CREATE POLICY "oc_transp" ON public.contrato_ocorrencias FOR ALL USING (
  EXISTS (SELECT 1 FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
    WHERE c.id = candidatura_id AND auth.uid() = v.transportadora_id)
);

-- Admin: full access to everything
CREATE POLICY "admin_all_profiles" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
);

-- =====================================================
-- Auth trigger: auto-create profile on user signup
-- Runs with SECURITY DEFINER (superuser privileges), bypassing RLS
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, tipo, nome, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'tipo', 'agregado'),
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;

  IF (NEW.raw_user_meta_data->>'tipo' = 'transportadora') THEN
    INSERT INTO public.transportadoras (id) VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO public.agregados (id) VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- To make the first user an admin, run:
-- UPDATE public.profiles SET is_admin = TRUE WHERE id = 'YOUR_USER_ID';

-- ── Calculadora: Benchmarks de Veículos ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calc_veiculos (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('simples', 'cavalo', 'implemento')),
  cavalo_id TEXT,
  lbl TEXT NOT NULL,
  ico TEXT,
  dim TEXT,
  km_l NUMERIC,
  km INTEGER,
  vc NUMERIC,
  vr NUMERIC,
  sal NUMERIC,
  pc INTEGER,
  pr INTEGER,
  aet NUMERIC,
  vidc INTEGER,
  rpc NUMERIC,
  vidr INTEGER,
  rpr NUMERIC,
  manut NUMERIC,
  sort_order INTEGER DEFAULT 0
);

-- ── Calculadora: Constantes do Sistema ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calc_constantes (
  id INTEGER PRIMARY KEY DEFAULT 1,
  k JSONB NOT NULL DEFAULT '{}',
  adm_tbl JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.calc_veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calc_constantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calc_veiculos_read" ON public.calc_veiculos FOR SELECT USING (true);
CREATE POLICY "calc_veiculos_admin_write" ON public.calc_veiculos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "calc_constantes_read" ON public.calc_constantes FOR SELECT USING (true);
CREATE POLICY "calc_constantes_admin_write" ON public.calc_constantes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Migration for existing databases:
-- CREATE TABLE IF NOT EXISTS public.calc_veiculos (...);
-- CREATE TABLE IF NOT EXISTS public.calc_constantes (...);
