-- =====================================================
-- FIX: Colunas ausentes no schema cache do Supabase
-- Execute este script no SQL Editor do Supabase Dashboard
-- =====================================================
-- Erro corrigido:
--   "Could not find the 'cnh_categoria' column of 'motoristas' in the schema cache"
--   "Could not find the 'renavam' column of 'veiculos' in the schema cache"
--
-- Causa: migrations da fase 3 e fase 4 não foram aplicadas ao banco.
-- Solução: rodar os ALTER TABLE abaixo no SQL Editor do Supabase.
-- =====================================================

-- Fase 3: perfil e documentos de frota (20260316_fase3_perfil_frota.sql)
ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS crlv_venc DATE,
  ADD COLUMN IF NOT EXISTS seguro_venc DATE,
  ADD COLUMN IF NOT EXISTS modelo TEXT;

ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS crlv_venc DATE,
  ADD COLUMN IF NOT EXISTS capacidade NUMERIC,
  ADD COLUMN IF NOT EXISTS tara NUMERIC;

CREATE INDEX IF NOT EXISTS veiculos_crlv_venc_idx ON public.veiculos(crlv_venc);
CREATE INDEX IF NOT EXISTS veiculos_seguro_venc_idx ON public.veiculos(seguro_venc);

-- Fase 4: fotos e campos enriquecidos de frota (20260317_frota_fotos_campos.sql)
ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

ALTER TABLE public.motoristas
  ADD COLUMN IF NOT EXISTS cnh_categoria TEXT,
  ADD COLUMN IF NOT EXISTS cnh_venc DATE,
  ADD COLUMN IF NOT EXISTS telefone TEXT;

ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS cor TEXT,
  ADD COLUMN IF NOT EXISTS renavam TEXT;

CREATE INDEX IF NOT EXISTS motoristas_cnh_venc_idx ON public.motoristas(cnh_venc);
CREATE INDEX IF NOT EXISTS equipamentos_crlv_venc_idx ON public.equipamentos(crlv_venc);

-- =====================================================
-- Storage bucket para fotos de frota
-- Execute manualmente no Dashboard > Storage se ainda não existir:
-- =====================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('frota-fotos', 'frota-fotos', true)
-- ON CONFLICT DO NOTHING;
--
-- CREATE POLICY "agregado upload fotos frota"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'frota-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);
--
-- CREATE POLICY "fotos frota publicas"
--   ON storage.objects FOR SELECT TO public
--   USING (bucket_id = 'frota-fotos');
-- =====================================================
