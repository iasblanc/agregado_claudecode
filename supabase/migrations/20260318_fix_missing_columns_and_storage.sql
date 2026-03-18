-- =====================================================================
-- MIGRAÇÃO CORRETIVA — Execute no Supabase SQL Editor (Dashboard)
-- Consolida colunas ausentes das fases 3 e 4 + storage bucket
-- =====================================================================

-- 1. Veículos: campos adicionais
ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS modelo TEXT,
  ADD COLUMN IF NOT EXISTS cor TEXT,
  ADD COLUMN IF NOT EXISTS renavam TEXT,
  ADD COLUMN IF NOT EXISTS crlv_venc DATE,
  ADD COLUMN IF NOT EXISTS seguro_venc DATE;

-- 2. Equipamentos: campos adicionais
ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS capacidade TEXT,
  ADD COLUMN IF NOT EXISTS tara NUMERIC,
  ADD COLUMN IF NOT EXISTS crlv_venc DATE,
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 3. Motoristas: campos adicionais
ALTER TABLE public.motoristas
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS cnh_categoria TEXT,
  ADD COLUMN IF NOT EXISTS cnh_venc DATE,
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 4. Índices de vencimento
CREATE INDEX IF NOT EXISTS veiculos_crlv_venc_idx   ON public.veiculos(crlv_venc);
CREATE INDEX IF NOT EXISTS veiculos_seguro_venc_idx  ON public.veiculos(seguro_venc);
CREATE INDEX IF NOT EXISTS motoristas_cnh_venc_idx   ON public.motoristas(cnh_venc);
CREATE INDEX IF NOT EXISTS equipamentos_crlv_venc_idx ON public.equipamentos(crlv_venc);

-- 5. Storage bucket para fotos da frota
INSERT INTO storage.buckets (id, name, public)
  VALUES ('frota-fotos', 'frota-fotos', true)
  ON CONFLICT (id) DO NOTHING;

-- 6. Políticas de storage
--    (DROP IF EXISTS antes de CREATE para permitir re-execução)

DROP POLICY IF EXISTS "agregado upload fotos frota"  ON storage.objects;
DROP POLICY IF EXISTS "fotos frota publicas"          ON storage.objects;
DROP POLICY IF EXISTS "agregado update fotos frota"   ON storage.objects;
DROP POLICY IF EXISTS "agregado delete fotos frota"   ON storage.objects;

-- Leitura pública
CREATE POLICY "fotos frota publicas"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'frota-fotos');

-- Upload: somente o próprio agregado, dentro da sua pasta (uid/)
CREATE POLICY "agregado upload fotos frota"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'frota-fotos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update/upsert na mesma pasta
CREATE POLICY "agregado update fotos frota"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'frota-fotos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete: somente o próprio agregado
CREATE POLICY "agregado delete fotos frota"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'frota-fotos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
