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
  valor_contrato: number | null
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
