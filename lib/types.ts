export type UserTipo = 'agregado' | 'transportadora'

export interface Profile {
  id: string
  tipo: UserTipo
  nome: string | null
  telefone: string | null
  is_admin: boolean
  created_at: string
}

export interface Agregado {
  id: string
  cpf: string | null
  cnh: string | null
  foto_url: string | null
}

export interface Transportadora {
  id: string
  razao_social: string | null
  cnpj: string | null
  logo_url: string | null
}

export interface Veiculo {
  id: string
  agregado_id: string
  tipo: string
  placa: string
  ano: number | null
  valor_veiculo: number | null
  fotos: string[] | null
  created_at: string
}

export interface Contrato {
  id: string
  agregado_id: string
  nome: string
  created_at: string
}

export interface Equipamento {
  id: string
  agregado_id: string
  tipo: string
  placa: string | null
  ano: number | null
  created_at: string
}

export interface Motorista {
  id: string
  agregado_id: string
  nome: string
  cnh: string | null
  foto_url: string | null
  created_at: string
}

export interface CustoKmConfig {
  id: string
  agregado_id: string
  veiculo_id: string | null
  preco_diesel: number | null
  consumo_km_litro: number | null
  km_mes: number | null
  parcela_caminhao: number | null
  seguro: number | null
  licenciamento: number | null
  rastreador: number | null
  outros_fixos: number | null
  salario_motorista: number | null
  manutencao_mensal: number | null
  pneus_mensal: number | null
  pedagio_mensal: number | null
  // Campos do calculador de custo/km (calculadora-custo-km-tac)
  custo_km_calculado: number | null
  distancia_media: number | null
  plano: 'f' | 'p' | 'fu' | null
  params: Record<string, unknown> | null
  updated_at: string
}

export interface Transacao {
  id: string
  agregado_id: string
  data: string
  tipo: 'entrada' | 'saida'
  categoria: string
  descricao: string | null
  valor: number
  placa: string | null
  contrato_id: string | null
  created_at: string
}

export interface Vaga {
  id: string
  transportadora_id: string
  titulo: string | null
  rota_origem: string | null
  rota_destino: string | null
  km_estimado: number | null
  tipo_veiculo: string | null
  tipo_equipamento: string | null
  // Precificação por km (fórmula de estimativa mensal)
  valor_km: number | null       // R$/km pago pela transportadora
  frequencia_tipo: 'diaria' | '2x_semana' | '3x_semana' | 'semanal' | 'quinzenal' | 'sob_demanda' | null
  valor_contrato: number | null // estimativa mensal = valor_km × km_estimado × freq_mult
  periodo_meses: number | null
  descricao: string | null
  contrata_equipamento: boolean
  status: 'ativa' | 'encerrada' | 'preenchida'
  created_at: string
  // joined
  transportadora?: {
    razao_social: string | null
    logo_url: string | null
  }
}

// ── Helpers de cálculo da estimativa mensal ─────────────────────────────────
// Fiel às funções getFreqMult / openVagaDetail dos HTMLs de referência (Vercel)

/** Multiplicador mensal por tipo de frequência (viagens/mês). */
export const FREQ_MULT: Record<string, number> = {
  diaria:     20,  // 5 dias × 4 semanas
  '3x_semana': 12, // 3 × 4
  '2x_semana':  8, // 2 × 4
  semanal:      4, // 1 × 4
  quinzenal:    2,
}
// 'sob_demanda' → sem multiplicador fixo (estimativa indisponível)

/** Número de viagens/mês para esta vaga (null = indisponível). */
export function calcDiasMes(vaga: Pick<Vaga, 'frequencia_tipo'>): number | null {
  if (!vaga.frequencia_tipo) return null
  return FREQ_MULT[vaga.frequencia_tipo] ?? null
}

/** Km total estimado por mês nesta vaga. */
export function calcKmMensal(vaga: Pick<Vaga, 'km_estimado' | 'frequencia_tipo'>): number | null {
  const dias = calcDiasMes(vaga)
  if (!vaga.km_estimado || !dias) return null
  return vaga.km_estimado * dias
}

/**
 * Estimativa de faturamento mensal bruto.
 *   valor_km × km_estimado × freq_mult
 * Fallback para valor_contrato legado quando os novos campos não estão preenchidos.
 */
export function calcEstimativaMensal(vaga: Pick<Vaga, 'km_estimado' | 'frequencia_tipo' | 'valor_km' | 'valor_contrato'>): number | null {
  const dias = calcDiasMes(vaga)
  if (vaga.km_estimado && vaga.valor_km && dias) return vaga.km_estimado * vaga.valor_km * dias
  return vaga.valor_contrato ?? null
}

/** Rótulo amigável da frequência com multiplicador. */
export function labelFrequencia(vaga: Pick<Vaga, 'frequencia_tipo'>): string {
  switch (vaga.frequencia_tipo) {
    case 'diaria':     return 'Diária · 20 viagens/mês'
    case '3x_semana':  return '3× por semana · 12 viagens/mês'
    case '2x_semana':  return '2× por semana · 8 viagens/mês'
    case 'semanal':    return 'Semanal · 4 viagens/mês'
    case 'quinzenal':  return 'Quinzenal · 2 viagens/mês'
    case 'sob_demanda': return 'Sob demanda'
    default:           return '—'
  }
}

export interface Candidatura {
  id: string
  vaga_id: string
  agregado_id: string
  veiculo_id: string | null
  equipamento_id: string | null
  motorista_id: string | null
  status: 'pendente' | 'aceito' | 'recusado'
  mensagem: string | null
  created_at: string
}

export interface Avaliacao {
  id: string
  candidatura_id: string
  avaliador_id: string
  avaliado_id: string
  nota: number
  comentario: string | null
  created_at: string
}

// Constants
export const TIPOS_VEICULO = [
  'Automóvel',
  'Van',
  '3/4',
  'Toco',
  'Truck',
  'Cavalo 4x2',
  'Cavalo 6x2',
  'Cavalo 6x4',
] as const

export const TIPOS_EQUIPAMENTO = [
  'SEMI-REBOQUE 12 MTS',
  'SEMI-REBOQUE 15 MTS',
  'SEMI-REBOQUE FRIGORÍFICO',
  'PRANCHA 12 MTS',
  'PRANCHA 15 MTS',
  'PRANCHA 17 MTS',
  'PRANCHA 19 MTS',
  'BI-TREM 24 MTS',
  'RODOTREM 27 MTS',
  'AUTOMOTIVA 23 MTS',
  'CEGONHA 23 MTS',
] as const

export const CATEGORIAS_ENTRADA = [
  'Frete',
  'Adiantamento',
  'Bônus',
  'Outros',
] as const

export const CATEGORIAS_SAIDA = [
  'Diesel',
  'Manutenção',
  'Pedágio',
  'Pneu',
  'IPVA/Seguro',
  'Alimentação',
  'Parcela do Caminhão',
  'Salário Motorista',
  'Outros',
] as const

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export const formatNumber = (value: number, decimals = 2) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)
