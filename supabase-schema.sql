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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agregado_id, veiculo_id)
);

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
ALTER TABLE public.vagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

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

-- Admin: full access to everything
CREATE POLICY "admin_all_profiles" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
);

-- =====================================================
-- Auth trigger: auto-create agregado/transportadora row
-- (Optional convenience - profile is created by the app)
-- =====================================================
-- To make the first user an admin, run:
-- UPDATE public.profiles SET is_admin = TRUE WHERE id = 'YOUR_USER_ID';
