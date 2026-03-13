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
  // Campos de precificação por km (fórmula de estimativa mensal)
  valor_km: number | null            // R$/km pago pela transportadora
  frequencia_tipo: 'diaria' | 'semanal' | 'quinzenal' | 'mensal' | null
  dias_semana: number | null         // dias úteis/semana (para frequência diária)
  sentido: 'ida' | 'ida_volta' | null // se o km_estimado é somente ida ou ida+volta
  valor_contrato: number | null      // estimativa mensal calculada (valor_km × km_viagem × dias_mes)
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

/** Km percorridos por viagem considerando o sentido (ida ou ida+volta). */
export function calcKmViagem(vaga: Pick<Vaga, 'km_estimado' | 'sentido'>): number | null {
  if (!vaga.km_estimado) return null
  return vaga.sentido === 'ida_volta' ? vaga.km_estimado * 2 : vaga.km_estimado
}

/** Número de viagens/dias produtivos por mês. */
export function calcDiasMes(vaga: Pick<Vaga, 'frequencia_tipo' | 'dias_semana'>): number | null {
  switch (vaga.frequencia_tipo) {
    case 'diaria':    return (vaga.dias_semana ?? 5) * 4
    case 'semanal':   return 4
    case 'quinzenal': return 2
    case 'mensal':    return 1
    default:          return null
  }
}

/** Km total rodado por mês nesta vaga. */
export function calcKmMensal(vaga: Pick<Vaga, 'km_estimado' | 'sentido' | 'frequencia_tipo' | 'dias_semana'>): number | null {
  const kmV = calcKmViagem(vaga)
  const dias = calcDiasMes(vaga)
  if (!kmV || !dias) return null
  return kmV * dias
}

/**
 * Estimativa de faturamento mensal bruto.
 * Se os novos campos estiverem preenchidos usa a fórmula:
 *   valor_km × km_viagem × dias_mes
 * Caso contrário cai no valor_contrato legado (compatibilidade retroativa).
 */
export function calcEstimativaMensal(vaga: Pick<Vaga, 'km_estimado' | 'sentido' | 'frequencia_tipo' | 'dias_semana' | 'valor_km' | 'valor_contrato'>): number | null {
  const kmV  = calcKmViagem(vaga)
  const dias = calcDiasMes(vaga)
  if (kmV && vaga.valor_km && dias) return kmV * vaga.valor_km * dias
  return vaga.valor_contrato ?? null
}

/** Rótulo amigável da frequência. */
export function labelFrequencia(vaga: Pick<Vaga, 'frequencia_tipo' | 'dias_semana'>): string {
  const dias = calcDiasMes(vaga)
  switch (vaga.frequencia_tipo) {
    case 'diaria':    return `${vaga.dias_semana ?? 5}×/sem · ${dias} dias/mês`
    case 'semanal':   return '1×/sem · 4 viagens/mês'
    case 'quinzenal': return '2 viagens/mês'
    case 'mensal':    return '1 viagem/mês'
    default:          return '—'
  }
}

/** Rótulo amigável do sentido da viagem. */
export function labelSentido(vaga: Pick<Vaga, 'sentido' | 'km_estimado'>): string {
  if (vaga.sentido === 'ida_volta') return `Ida e volta (${(vaga.km_estimado ?? 0) * 2} km/viagem)`
  return `Somente ida (${vaga.km_estimado ?? 0} km/viagem)`
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
