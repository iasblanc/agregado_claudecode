-- =====================================================
-- FIX: Adiciona colunas ausentes no schema cache do Supabase
-- Execute este script no SQL Editor do Supabase
-- para bancos que já existem mas não rodaram as migrations
-- =====================================================

-- Veículos: colunas adicionadas nas migrations fase3 e fase4
ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS modelo TEXT,
  ADD COLUMN IF NOT EXISTS cor TEXT,
  ADD COLUMN IF NOT EXISTS renavam TEXT,
  ADD COLUMN IF NOT EXISTS crlv_venc DATE,
  ADD COLUMN IF NOT EXISTS seguro_venc DATE;

-- Motoristas: colunas adicionadas na migration fase4
ALTER TABLE public.motoristas
  ADD COLUMN IF NOT EXISTS cnh_categoria TEXT,
  ADD COLUMN IF NOT EXISTS cnh_venc DATE,
  ADD COLUMN IF NOT EXISTS telefone TEXT;

-- Equipamentos: colunas adicionadas nas migrations fase3 e fase4
ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS crlv_venc DATE,
  ADD COLUMN IF NOT EXISTS capacidade TEXT,
  ADD COLUMN IF NOT EXISTS tara NUMERIC;

-- Indexes
CREATE INDEX IF NOT EXISTS motoristas_cnh_venc_idx ON public.motoristas(cnh_venc);
CREATE INDEX IF NOT EXISTS veiculos_crlv_venc_idx ON public.veiculos(crlv_venc);
CREATE INDEX IF NOT EXISTS veiculos_seguro_venc_idx ON public.veiculos(seguro_venc);
CREATE INDEX IF NOT EXISTS equipamentos_crlv_venc_idx ON public.equipamentos(crlv_venc);

-- Após executar, force o refresh do schema cache do PostgREST:
-- NOTIFY pgrst, 'reload schema';
