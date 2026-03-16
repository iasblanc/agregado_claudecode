-- =====================================================
-- MIGRAÇÃO v2: Novos campos em vagas + contratos_motorista
--              + status pausada + tabela equipe_transportadora
-- Execute no Supabase SQL Editor do seu projeto
-- Todos os comandos usam IF NOT EXISTS (seguro re-rodar)
-- =====================================================

-- ── Novos campos na tabela vagas ─────────────────────
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS uf_origem TEXT;
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS uf_destino TEXT;
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS equip_obs TEXT;
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS tipo_carga TEXT;
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS vagas_abertas INTEGER DEFAULT 1;
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS inicio_previsto TEXT;
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS ano_maximo_veiculo INTEGER;
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS adiantamento INTEGER;
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS jornada TEXT;
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS criterios_hab TEXT[];
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS criterios_doc TEXT[];
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS criterios_op TEXT[];
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS requisitos_adicionais TEXT[];
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS beneficios TEXT[];
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS valor_km NUMERIC;

-- frequencia_tipo: adicionar com constraint atualizada
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS frequencia_tipo TEXT;
ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS vagas_frequencia_tipo_check;
ALTER TABLE public.vagas ADD CONSTRAINT vagas_frequencia_tipo_check
  CHECK (frequencia_tipo IN ('diaria','2x_semana','3x_semana','semanal','quinzenal','sob_demanda'));

-- Remover colunas antigas se existirem (versões anteriores)
ALTER TABLE public.vagas DROP COLUMN IF EXISTS sentido;
ALTER TABLE public.vagas DROP COLUMN IF EXISTS dias_semana;

-- ── Status "pausada" para vagas ───────────────────────────────────────────────
-- Atualiza a constraint de status para incluir 'pausada'
ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS vagas_status_check;
ALTER TABLE public.vagas ADD CONSTRAINT vagas_status_check
  CHECK (status IN ('ativa','pausada','encerrada','preenchida'));

-- ── Tabela equipe_transportadora ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.equipe_transportadora (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transportadora_id UUID REFERENCES public.transportadoras(id) ON DELETE CASCADE,
  email            TEXT NOT NULL,
  nome             TEXT,
  role             TEXT CHECK (role IN ('administrador','operador','visualizador')) DEFAULT 'operador',
  status           TEXT CHECK (status IN ('ativo','pendente','inativo')) DEFAULT 'pendente',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (transportadora_id, email)
);

ALTER TABLE public.equipe_transportadora ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipe_transportadora_own" ON public.equipe_transportadora;
CREATE POLICY "equipe_transportadora_own" ON public.equipe_transportadora FOR ALL
  USING (auth.uid() = transportadora_id);

-- ── Atualizar constraint de status das candidaturas ──
ALTER TABLE public.candidaturas DROP CONSTRAINT IF EXISTS candidaturas_status_check;
ALTER TABLE public.candidaturas ADD CONSTRAINT candidaturas_status_check
  CHECK (status IN ('pendente','visualizado','em_negociacao','em_formalizacao','aceito','contratado','recusado'));

-- ── Nova tabela: contratos_motorista ─────────────────
CREATE TABLE IF NOT EXISTS public.contratos_motorista (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  transportadora_id UUID REFERENCES public.transportadoras(id) ON DELETE CASCADE,
  agregado_id UUID REFERENCES public.agregados(id) ON DELETE CASCADE,
  vaga_id UUID REFERENCES public.vagas(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'encerrado')),
  data_inicio DATE,
  data_fim_prevista DATE,
  observacoes TEXT,
  mensagens JSONB DEFAULT '[]',
  timeline JSONB DEFAULT '[]',
  ocorrencias JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contratos_motorista ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para contratos_motorista
DROP POLICY IF EXISTS "contratos_motorista_transportadora" ON public.contratos_motorista;
CREATE POLICY "contratos_motorista_transportadora" ON public.contratos_motorista FOR ALL
  USING (auth.uid() = transportadora_id);

DROP POLICY IF EXISTS "contratos_motorista_agregado" ON public.contratos_motorista;
CREATE POLICY "contratos_motorista_agregado" ON public.contratos_motorista FOR SELECT
  USING (auth.uid() = agregado_id);
