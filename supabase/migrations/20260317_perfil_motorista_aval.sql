-- =====================================================
-- MIGRAÇÃO v3: Extensões de perfil, frota e avaliações
-- Execute no Supabase SQL Editor do seu projeto
-- Todos os comandos usam IF NOT EXISTS (seguro re-rodar)
-- =====================================================

-- ── Extensões para perfil do agregado ──────────────────────────────────────
ALTER TABLE public.agregados ADD COLUMN IF NOT EXISTS cnh_numero TEXT;
ALTER TABLE public.agregados ADD COLUMN IF NOT EXISTS cnh_categoria TEXT;
ALTER TABLE public.agregados ADD COLUMN IF NOT EXISTS cnh_vencimento TEXT;
ALTER TABLE public.agregados ADD COLUMN IF NOT EXISTS rntrc TEXT;
ALTER TABLE public.agregados ADD COLUMN IF NOT EXISTS rotas TEXT[] DEFAULT '{}';
ALTER TABLE public.agregados ADD COLUMN IF NOT EXISTS disponivel BOOLEAN DEFAULT TRUE;
ALTER TABLE public.agregados ADD COLUMN IF NOT EXISTS anos_exp INTEGER;

-- ── Extensões para veículos (frota) ──────────────────────────────────────
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS crlv_venc TEXT;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS tara INTEGER;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS pbt INTEGER;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS modelo TEXT;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS cor TEXT;

-- ── Extensões para equipamentos ──────────────────────────────────────────
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS crlv_venc TEXT;
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS capacidade TEXT;
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS comprimento TEXT;
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS tara TEXT;

-- ── Tabela de avaliações de motoristas (específica de desempenho) ─────────
CREATE TABLE IF NOT EXISTS public.avaliacoes_motorista (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id UUID NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  avaliador_id UUID NOT NULL REFERENCES public.profiles(id),
  nota         NUMERIC(2,1) NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario   TEXT,
  periodo      TEXT,   -- ex: "Março 2026"
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.avaliacoes_motorista ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aval_motorista_own" ON public.avaliacoes_motorista;
CREATE POLICY "aval_motorista_own" ON public.avaliacoes_motorista FOR ALL
  USING (auth.uid() = avaliador_id);

-- ── Adicionar email à tabela profiles para o perfil ─────────────────────
-- (o email já existe no auth.users, mas convém expor no perfil)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- ── Atualizar constraint de status candidaturas (garantir todos os valores) ─
ALTER TABLE public.candidaturas DROP CONSTRAINT IF EXISTS candidaturas_status_check;
ALTER TABLE public.candidaturas ADD CONSTRAINT candidaturas_status_check
  CHECK (status IN ('pendente','visualizado','em_negociacao','em_formalizacao','aceito','contratado','recusado'));
