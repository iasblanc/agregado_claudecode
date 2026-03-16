-- Fase 3: Profile richness + fleet document tracking

-- 1. Agregado profile extensions
ALTER TABLE agregados
  ADD COLUMN IF NOT EXISTS rotas_atuacao TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS disponivel BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS anos_experiencia INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contratos_realizados INTEGER DEFAULT 0;

-- 2. Vehicle document validity tracking
ALTER TABLE veiculos
  ADD COLUMN IF NOT EXISTS crlv_venc DATE,
  ADD COLUMN IF NOT EXISTS seguro_venc DATE,
  ADD COLUMN IF NOT EXISTS modelo TEXT;

-- 3. Equipment document validity
ALTER TABLE equipamentos
  ADD COLUMN IF NOT EXISTS crlv_venc DATE,
  ADD COLUMN IF NOT EXISTS capacidade TEXT,
  ADD COLUMN IF NOT EXISTS tara NUMERIC;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS veiculos_crlv_venc_idx ON veiculos(crlv_venc);
CREATE INDEX IF NOT EXISTS veiculos_seguro_venc_idx ON veiculos(seguro_venc);
