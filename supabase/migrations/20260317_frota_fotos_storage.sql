-- Fase 4b: Storage bucket para fotos de frota
-- Cria o bucket e as políticas RLS necessárias para upload de fotos

-- 1. Criar bucket público para fotos de frota
INSERT INTO storage.buckets (id, name, public)
VALUES ('frota-fotos', 'frota-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Política: apenas o próprio agregado pode fazer upload na sua pasta
CREATE POLICY "agregado upload fotos frota"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'frota-fotos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Política: fotos são públicas para leitura
CREATE POLICY "fotos frota publicas"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'frota-fotos');

-- 4. Política: o próprio agregado pode substituir/atualizar suas fotos
CREATE POLICY "agregado update fotos frota"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'frota-fotos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Política: o próprio agregado pode deletar suas fotos
CREATE POLICY "agregado delete fotos frota"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'frota-fotos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
