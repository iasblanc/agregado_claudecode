-- Fase 4: Fotos e dados enriquecidos de frota

-- 1. Foto do equipamento (coluna única, assim como motorista)
ALTER TABLE equipamentos
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 2. Motorista: categoria CNH, vencimento e telefone
ALTER TABLE motoristas
  ADD COLUMN IF NOT EXISTS cnh_categoria TEXT,
  ADD COLUMN IF NOT EXISTS cnh_venc DATE,
  ADD COLUMN IF NOT EXISTS telefone TEXT;

-- 3. Veículo: campos adicionais ainda não migrados
ALTER TABLE veiculos
  ADD COLUMN IF NOT EXISTS cor TEXT,
  ADD COLUMN IF NOT EXISTS renavam TEXT;

-- 4. Índice de vencimento CNH
CREATE INDEX IF NOT EXISTS motoristas_cnh_venc_idx ON motoristas(cnh_venc);
CREATE INDEX IF NOT EXISTS equipamentos_crlv_venc_idx ON equipamentos(crlv_venc);

-- 5. Storage bucket (execute manualmente no dashboard Supabase se não existir):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('frota-fotos', 'frota-fotos', true)
-- ON CONFLICT DO NOTHING;

-- Policy para permitir que o próprio agregado faça upload:
-- CREATE POLICY "agregado upload fotos frota"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'frota-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);
-- CREATE POLICY "fotos frota publicas"
--   ON storage.objects FOR SELECT TO public
--   USING (bucket_id = 'frota-fotos');
