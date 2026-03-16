-- =====================================================
-- MIGRAÇÃO v2.1: Avaliações com itens/quesitos
--                + motorista_id + tipo_avaliado
--                + fix contratos_motorista status inicial
-- Execute no Supabase SQL Editor
-- =====================================================

-- ── Novos campos na tabela avaliacoes ────────────────

-- Notas por quesito (JSONB: { pontualidade: 4, cuidado: 5, ... })
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS notas_quesitos JSONB DEFAULT '{}';

-- Tipo de avaliado: 'agregado' | 'motorista' | 'transportadora'
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS tipo_avaliado TEXT
  CHECK (tipo_avaliado IN ('agregado', 'motorista', 'transportadora'));

-- Motorista avaliado (quando tipo_avaliado = 'motorista')
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS motorista_id UUID
  REFERENCES public.motoristas(id) ON DELETE SET NULL;

-- Contrato de origem da avaliação (para vincular ao encerramento)
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS contrato_id UUID
  REFERENCES public.contratos_motorista(id) ON DELETE SET NULL;

-- ── Status pendente_assinatura para contratos_motorista ──

-- Adiciona status 'pendente_assinatura' (gerado na aprovação, antes da assinatura)
ALTER TABLE public.contratos_motorista DROP CONSTRAINT IF EXISTS contratos_motorista_status_check;
ALTER TABLE public.contratos_motorista ADD CONSTRAINT contratos_motorista_status_check
  CHECK (status IN ('pendente_assinatura', 'ativo', 'suspenso', 'encerrado'));

-- Permitir inserção pelo agregado (para atualizar após assinatura)
DROP POLICY IF EXISTS "contratos_motorista_agregado_update" ON public.contratos_motorista;
CREATE POLICY "contratos_motorista_agregado_update" ON public.contratos_motorista FOR UPDATE
  USING (auth.uid() = agregado_id);

-- ── Atualizar RLS de avaliações para incluir contratos encerrados ──

-- Agregado pode ver avaliações de seus contratos (onde é avaliado)
DROP POLICY IF EXISTS "avaliacoes_read" ON public.avaliacoes;
CREATE POLICY "avaliacoes_read" ON public.avaliacoes FOR SELECT
  USING (
    auth.uid() IN (avaliador_id, avaliado_id)
    OR EXISTS (
      SELECT 1 FROM public.contratos_motorista cm
      WHERE cm.id = avaliacoes.contrato_id
        AND cm.agregado_id = auth.uid()
    )
  );

-- Transportadora pode ver avaliações de seus contratos
DROP POLICY IF EXISTS "avaliacoes_transportadora_read" ON public.avaliacoes;
CREATE POLICY "avaliacoes_transportadora_read" ON public.avaliacoes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contratos_motorista cm
      WHERE cm.id = avaliacoes.contrato_id
        AND cm.transportadora_id = auth.uid()
    )
  );

-- ── Índices de performance ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_avaliacoes_contrato ON public.avaliacoes(contrato_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_avaliado ON public.avaliacoes(avaliado_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_motorista ON public.avaliacoes(motorista_id);
CREATE INDEX IF NOT EXISTS idx_contratos_motorista_agregado ON public.contratos_motorista(agregado_id);
CREATE INDEX IF NOT EXISTS idx_contratos_motorista_transportadora ON public.contratos_motorista(transportadora_id);
