-- =====================================================
-- SEED: Dados de demonstração — Agregado.Pro
-- Execute APÓS a migration (supabase-migration-vagas-v2.sql)
--
-- COMO USAR:
-- 1. Abra o Supabase SQL Editor
-- 2. Substitua ':TRANS_ID' pelo UUID do usuário transportadora
--    (encontre em Authentication > Users no Supabase Dashboard)
-- 3. Execute o script
-- =====================================================

-- Substitua pelo UUID real do usuário transportadora
\set TRANS_ID 'SEU-UUID-DE-TRANSPORTADORA-AQUI'

-- ── Perfil da transportadora ─────────────────────────────────────────────────
INSERT INTO public.transportadoras (id, razao_social, cnpj)
VALUES (:'TRANS_ID', 'Transportes Rápido Sul Ltda', '12.345.678/0001-99')
ON CONFLICT (id) DO UPDATE SET razao_social = EXCLUDED.razao_social, cnpj = EXCLUDED.cnpj;

-- ── Vagas de exemplo ─────────────────────────────────────────────────────────

-- Vaga 1: Cavalo São Paulo → Curitiba (Ativa)
INSERT INTO public.vagas (
  id, transportadora_id, titulo,
  rota_origem, uf_origem, rota_destino, uf_destino,
  km_estimado, frequencia_tipo, tipo_veiculo, tipo_equipamento,
  tipo_carga, vagas_abertas, inicio_previsto, ano_maximo_veiculo,
  valor_km, valor_contrato, forma_pagamento, adiantamento, periodo_meses, jornada,
  criterios_hab, criterios_doc, criterios_op, beneficios,
  descricao, status
) VALUES (
  gen_random_uuid(), :'TRANS_ID', 'São Paulo → Curitiba | Cavalo 6x2',
  'São Paulo', 'SP', 'Curitiba', 'PR',
  408, 'diaria', 'Cavalo 6x2', 'Carga Seca 12 mts',
  'Carga Seca', 2, 'Imediato', 2018,
  7.50, 61200, 'Semanal', 30, 12, 'Segunda a Sábado',
  ARRAY['cnh_e'], ARRAY['rntrc','tac'], ARRAY['rastreador','exp_min'],
  ARRAY['Adiantamento','Pedágio pago','Seguro de carga','Retorno garantido'],
  'Operação consolidada de carga seca São Paulo-Curitiba. Frota de 12 veículos, média de 20 viagens/mês. Pátio próprio em Guarulhos com apoio logístico. Exigimos experiência mínima de 2 anos na rota.',
  'ativa'
);

-- Vaga 2: Toco Campinas → Rio de Janeiro (Ativa, frigorífico)
INSERT INTO public.vagas (
  id, transportadora_id, titulo,
  rota_origem, uf_origem, rota_destino, uf_destino,
  km_estimado, frequencia_tipo, tipo_veiculo, tipo_equipamento,
  tipo_carga, vagas_abertas, inicio_previsto, ano_maximo_veiculo,
  valor_km, valor_contrato, forma_pagamento, adiantamento, periodo_meses, jornada,
  criterios_hab, criterios_doc, criterios_op, beneficios,
  descricao, status
) VALUES (
  gen_random_uuid(), :'TRANS_ID', 'Campinas → Rio de Janeiro | Toco Frigorífico',
  'Campinas', 'SP', 'Rio de Janeiro', 'RJ',
  520, '3x_semana', 'Toco', 'Frigorífico / Baú refrigerado',
  'Frigorífico', 1, 'Em 7 dias', 2015,
  9.20, 57408, 'Quinzenal', 40, 6, 'Terça, Quinta e Sábado',
  ARRAY['cnh_e'], ARRAY['rntrc','tac','laudo'], ARRAY['exp_min','pernoite'],
  ARRAY['Diesel incluso','Adiantamento','Seguro de carga','Ajuda de custo em rota'],
  'Rota de distribuição de alimentos resfriados Campinas-Rio. Equipamento de monitoramento de temperatura fornecido pela empresa. Motorista deve ter experiência com carga frigorífica e disponibilidade para pernoite.',
  'ativa'
);

-- Vaga 3: Cavalo 6x4 Curitiba → Porto Alegre (Pausada)
INSERT INTO public.vagas (
  id, transportadora_id, titulo,
  rota_origem, uf_origem, rota_destino, uf_destino,
  km_estimado, frequencia_tipo, tipo_veiculo, tipo_equipamento,
  tipo_carga, vagas_abertas, inicio_previsto, ano_maximo_veiculo,
  valor_km, valor_contrato, forma_pagamento, adiantamento, periodo_meses, jornada,
  criterios_hab, criterios_doc, criterios_op, beneficios,
  descricao, status
) VALUES (
  gen_random_uuid(), :'TRANS_ID', 'Curitiba → Porto Alegre | Cavalo Graneleiro',
  'Curitiba', 'PR', 'Porto Alegre', 'RS',
  700, 'semanal', 'Cavalo 6x4', 'Graneleiro 15 mts',
  'Granel', 3, 'Em 30 dias', 2020,
  8.80, 24640, 'Semanal', 30, 12, 'Segunda a Sexta',
  ARRAY['cnh_e'], ARRAY['rntrc','tac'], ARRAY['rastreador'],
  ARRAY['Adiantamento','Retorno garantido','Bônus assiduidade'],
  'Operação de granéis (soja e milho) safra 2025/26. Vagas para a frente de trabalho Sul. Equipamento de empresa disponível para agregados sem carreta própria.',
  'pausada'
);

-- Vaga 4: Truck SP → BH (Encerrada)
INSERT INTO public.vagas (
  id, transportadora_id, titulo,
  rota_origem, uf_origem, rota_destino, uf_destino,
  km_estimado, frequencia_tipo, tipo_veiculo, tipo_equipamento,
  tipo_carga, vagas_abertas, inicio_previsto, ano_maximo_veiculo,
  valor_km, valor_contrato, forma_pagamento, adiantamento,
  criterios_hab, criterios_doc, beneficios,
  descricao, status
) VALUES (
  gen_random_uuid(), :'TRANS_ID', 'São Paulo → Belo Horizonte | Truck Baú',
  'São Paulo', 'SP', 'Belo Horizonte', 'MG',
  586, '2x_semana', 'Truck', 'Baú seco',
  'Eletrônicos / Alto Valor', 1, 'Imediato', 2016,
  10.50, 98208, 'Semanal', 35,
  ARRAY['cnh_e'], ARRAY['rntrc','tac','rcfdc'],
  ARRAY['Adiantamento','Seguro de carga','Rastreamento','Pedágio pago'],
  'Distribuição de eletrônicos — alto valor agregado. Rastreamento obrigatório e seguro RCFDC exigido. Vaga preenchida em jan/2026.',
  'encerrada'
);

-- ── Membros de equipe de exemplo ─────────────────────────────────────────────
INSERT INTO public.equipe_transportadora (transportadora_id, email, nome, role, status)
VALUES
  (:'TRANS_ID', 'operacional@transportesrapido.com.br', 'Carlos Mendes',  'operador',     'ativo'),
  (:'TRANS_ID', 'gerente@transportesrapido.com.br',     'Ana Lima',        'administrador','ativo'),
  (:'TRANS_ID', 'estagiario@transportesrapido.com.br',  'Pedro Alves',     'visualizador', 'pendente')
ON CONFLICT DO NOTHING;

-- =====================================================
-- Fim do seed. Verifique no Supabase Table Editor:
--   public.vagas            → 4 vagas criadas
--   public.equipe_transportadora → 3 membros
-- =====================================================
