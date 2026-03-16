-- Fase 1: New columns for agregados profile + interesses table

-- 1. New profile columns for agregados
ALTER TABLE agregados
  ADD COLUMN IF NOT EXISTS cnh_categoria TEXT,
  ADD COLUMN IF NOT EXISTS cnh_validade DATE,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS uf VARCHAR(2),
  ADD COLUMN IF NOT EXISTS rntrc VARCHAR(20),
  ADD COLUMN IF NOT EXISTS tipo_agregado TEXT CHECK (tipo_agregado IN ('autonomo', 'mei', 'empresa')),
  ADD COLUMN IF NOT EXISTS razao_social TEXT,
  ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT;

-- cnpj may already exist; add safely
ALTER TABLE agregados ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);

-- 2. Interesses table (transportadora proactively contacts an agregado)
CREATE TABLE IF NOT EXISTS interesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transportadora_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agregado_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vaga_id UUID REFERENCES vagas(id) ON DELETE SET NULL,
  mensagem TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'visualizado', 'aceito', 'recusado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS interesses_transportadora_id_idx ON interesses(transportadora_id);
CREATE INDEX IF NOT EXISTS interesses_agregado_id_idx ON interesses(agregado_id);

-- RLS for interesses
ALTER TABLE interesses ENABLE ROW LEVEL SECURITY;

-- Transportadora can insert and read their own sent interests
CREATE POLICY "transportadora_manage_interesses" ON interesses
  FOR ALL USING (auth.uid() = transportadora_id);

-- Agregado can read and update interests they received
CREATE POLICY "agregado_read_interesses" ON interesses
  FOR SELECT USING (auth.uid() = agregado_id);

CREATE POLICY "agregado_update_interesses" ON interesses
  FOR UPDATE USING (auth.uid() = agregado_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language plpgsql;

DROP TRIGGER IF EXISTS interesses_updated_at ON interesses;
CREATE TRIGGER interesses_updated_at
  BEFORE UPDATE ON interesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
