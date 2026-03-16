-- Fase 2: Documents & Compliance

-- 1. Documents table
CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agregado_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('cnh', 'rntrc', 'crlv', 'seguro', 'contrato_social', 'outros')),
  nome_arquivo TEXT,
  url TEXT,                          -- Supabase Storage public URL
  storage_path TEXT,                 -- internal storage path for deletion
  data_validade DATE,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'verificado', 'rejeitado', 'vencido')),
  observacao TEXT,                   -- transportadora feedback on rejection
  verificado_por UUID REFERENCES auth.users(id),
  verificado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documentos_agregado_id_idx ON documentos(agregado_id);
CREATE INDEX IF NOT EXISTS documentos_tipo_idx ON documentos(tipo);
CREATE INDEX IF NOT EXISTS documentos_status_idx ON documentos(status);

-- 2. RLS for documentos
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- Agregado manages their own documents
CREATE POLICY "agregado_manage_documentos" ON documentos
  FOR ALL USING (auth.uid() = agregado_id);

-- Transportadora can read documents of their candidates/contracted agregados
CREATE POLICY "transportadora_read_documentos" ON documentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM candidaturas c
      WHERE c.agregado_id = documentos.agregado_id
        AND c.transportadora_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM contratos_motorista cm
      WHERE cm.agregado_id = documentos.agregado_id
        AND cm.transportadora_id = auth.uid()
    )
  );

-- Transportadora can update status/observacao of documents they can read
CREATE POLICY "transportadora_verify_documentos" ON documentos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM candidaturas c
      WHERE c.agregado_id = documentos.agregado_id
        AND c.transportadora_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM contratos_motorista cm
      WHERE cm.agregado_id = documentos.agregado_id
        AND cm.transportadora_id = auth.uid()
    )
  );

-- 3. Auto update updated_at
DROP TRIGGER IF EXISTS documentos_updated_at ON documentos;
CREATE TRIGGER documentos_updated_at
  BEFORE UPDATE ON documentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Mark expired documents automatically (view helper)
-- Documents are considered 'vencido' when data_validade < CURRENT_DATE
-- Application layer should also filter by this condition

-- 5. Storage bucket policy note (apply in Supabase dashboard):
-- Bucket: 'documentos'
-- Public: false
-- RLS: authenticated users can upload to their own folder (agregado_id/)
-- File size limit: 10MB
-- Allowed MIME types: image/jpeg, image/png, application/pdf
