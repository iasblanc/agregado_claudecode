'use client'
import { useState, FormEvent, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Input, Select, Textarea } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { formatCurrency, FREQ_MULT } from '@/lib/types'
import {
  ArrowLeft, MapPin, Truck, Package, DollarSign, Clock, FileText,
  AlertCircle, TrendingUp, CheckCircle2, ChevronDown
} from 'lucide-react'

// ── UF list ─────────────────────────────────────────────────────────────────
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
  'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

// ── Vehicle types with groups (fiel ao HTML) ─────────────────────────────────
const VTYPE_GROUPS = [
  { value: 'Automóvel',   group: 'leve',   emoji: '🚗' },
  { value: 'Van',         group: 'leve',   emoji: '🚐' },
  { value: '3/4',         group: 'medio',  emoji: '🚚' },
  { value: 'Toco',        group: 'medio',  emoji: '🚛' },
  { value: 'Truck',       group: 'medio',  emoji: '🚛' },
  { value: 'Cavalo 4x2',  group: 'cavalo', emoji: '🚛', axle: '2 eixos' },
  { value: 'Cavalo 6x2',  group: 'cavalo', emoji: '🚛', axle: '3 eixos' },
  { value: 'Cavalo 6x4',  group: 'cavalo', emoji: '🚛', axle: '3 eixos tração' },
]

// ── Implementos por grupo (fiel ao HTML) ─────────────────────────────────────
const IMPLEMENTOS: Record<string, { icon: string; name: string; dim: string; empresa?: boolean }[]> = {
  medio: [
    { icon: '🏢', name: 'Implemento da empresa', dim: 'fornecido pela transportadora', empresa: true },
    { icon: '📦', name: 'Baú seco', dim: 'Carga seca / geral' },
    { icon: '❄️', name: 'Frigorífico / Baú refrigerado', dim: 'Temperatura controlada' },
    { icon: '🛢', name: 'Tanque', dim: 'Líquidos / granéis líquidos' },
    { icon: '🪝', name: 'Guincho / plataforma reboque', dim: 'Veículos e cargas especiais' },
    { icon: '🪟', name: 'Sider', dim: 'Cortina lateral / fácil acesso' },
    { icon: '🏗', name: 'Basculante / Caçamba', dim: 'Areia, pedra, terra, entulho' },
    { icon: '📫', name: 'Furgão fechado', dim: 'Cargas fracionadas' },
    { icon: '🚛', name: 'Grade baixa / Plataforma', dim: 'Equipamentos e maquinários' },
    { icon: '🧱', name: 'Cegonhete', dim: 'Veículos leves (1–2 carros)' },
    { icon: '🌾', name: 'Graneleiro pequeno', dim: 'Grãos a granel' },
    { icon: '⚗️', name: 'Isotérmico', dim: 'Carga sensível à temperatura' },
  ],
  cavalo: [
    { icon: '🏢', name: 'Implemento da empresa', dim: 'fornecido pela transportadora', empresa: true },
    { icon: '📦', name: 'Carga Seca 12 mts', dim: 'Semirreboque baú padrão' },
    { icon: '📦', name: 'Carga Seca 15 mts', dim: 'Semirreboque baú longo' },
    { icon: '🔩', name: 'Prancha 12 mts', dim: 'Carga pesada / maquinário' },
    { icon: '🔩', name: 'Prancha 15 mts', dim: 'Equipamentos extensos' },
    { icon: '🔩', name: 'Prancha 17 mts', dim: 'Carga indivisível' },
    { icon: '🔩', name: 'Prancha 19 mts', dim: 'Carga especial longa' },
    { icon: '🚛', name: 'Bi-trem 24 mts', dim: 'Dois semirreboques acoplados' },
    { icon: '🚛', name: 'Rodotrem 27 mts', dim: 'Três eixos / carga máxima' },
    { icon: '🚗', name: 'Automotiva 23 mts', dim: 'Transporte de veículos' },
    { icon: '🚗', name: 'Cegonha 23 mts', dim: 'Cegonha dupla / múltiplos veículos' },
    { icon: '🌾', name: 'Graneleiro 12 mts', dim: 'Grãos — semirreboque padrão' },
    { icon: '🌾', name: 'Graneleiro 15 mts', dim: 'Grãos — semirreboque longo' },
    { icon: '❄️', name: 'Frigorífico / Baú refrigerado', dim: 'Temperatura controlada' },
    { icon: '🛢', name: 'Tanque rodoviário', dim: 'Líquidos e combustíveis' },
    { icon: '📦', name: 'Porta-container 20"', dim: 'Container ISO 20 pés' },
    { icon: '📦', name: 'Porta-container 40"', dim: 'Container ISO 40 pés' },
    { icon: '🏗', name: 'Plataforma aberta', dim: 'Cargas volumosas / peças' },
    { icon: '⚠️', name: 'Reboque especial (AET)', dim: 'Carga indivisível / escolta' },
  ],
}

// ── Critérios (fiel ao HTML) ─────────────────────────────────────────────────
const CRITERIOS_HAB = [
  { key: 'cnh_e',        label: 'CNH Categoria E', desc: 'Habilitação para conduzir veículos de combinação com mais de 6.000 kg', obrigatorio: true },
  { key: 'mopp',         label: 'MOPP — Movimentação e Operação de Produtos Perigosos', desc: 'Obrigatório para transporte de produtos classificados como perigosos pela ANTT' },
  { key: 'aet',          label: 'Carga Indivisível — Autorização Especial de Trânsito (AET)', desc: 'Experiência em transporte de cargas que excedem dimensões máximas regulamentares, com escolta obrigatória' },
  { key: 'coletivo',     label: 'Transporte Coletivo de Passageiros', desc: 'Curso adicional obrigatório para condutores de veículos de passageiros (quando aplicável)' },
  { key: 'guindaste',    label: 'Operação de Guindaste / Equipamento Especial', desc: 'Habilitação e experiência comprovada na operação de equipamentos de içamento' },
  { key: 'nr11',         label: 'NR-11 — Movimentação de Cargas', desc: 'Norma regulamentadora para operações de transporte, movimentação, armazenagem e manuseio de materiais' },
]

const CRITERIOS_DOC = [
  { key: 'rntrc',        label: 'RNTRC / ANTT válido', desc: 'Registro Nacional de Transportadores Rodoviários de Cargas em situação regular', obrigatorio: true },
  { key: 'tac',          label: 'TAC — Transportador Autônomo de Cargas', desc: 'Pessoa física com CPF registrado na ANTT como transportador autônomo', obrigatorio: true },
  { key: 'etc',          label: 'ETC — Empresa de Transporte de Cargas', desc: 'CNPJ ativo com registro como empresa transportadora na ANTT' },
  { key: 'laudo',        label: 'Laudo de vistoria veicular atualizado', desc: 'Inspeção técnica do veículo realizada por entidade credenciada nos últimos 12 meses' },
  { key: 'rcfdc',        label: 'Seguro RCFDC — Responsabilidade Civil Facultativa Danos a Cargas', desc: 'Apólice de seguro cobrindo danos e extravios de mercadorias durante o transporte' },
  { key: 'tacografo',    label: 'Tacógrafo calibrado e aprovado', desc: 'Equipamento de controle de jornada calibrado conforme exigência do DENATRAN' },
]

const CRITERIOS_OP = [
  { key: 'def_defensiva', label: 'Curso de direção defensiva atualizado', desc: 'Treinamento obrigatório ou preferencial para adesão ao contrato' },
  { key: 'exp_min',       label: 'Experiência mínima comprovada', desc: 'Exigir tempo mínimo de atuação como motorista de carga' },
  { key: 'rastreador',    label: 'Sistema de rastreamento próprio (ativo)', desc: 'Veículo deve possuir rastreador instalado e ativo com acesso remoto' },
  { key: 'noturno',       label: 'Disponibilidade para viagens noturnas', desc: 'Parte ou totalidade das rotas opera em período noturno' },
  { key: 'pernoite',      label: 'Disponibilidade para pernoite em rota', desc: 'Viagens com tempo superior a uma jornada, requerendo pernoite fora da base' },
  { key: 'conta_pj',      label: 'Conta bancária PJ / MEI para recebimento', desc: 'Pagamentos realizados exclusivamente via transferência para CNPJ' },
]

const BENEFICIOS_LIST = [
  'Adiantamento', 'Diesel incluso', 'Seguro de carga', 'Rastreamento',
  'Pedágio pago', 'Retorno garantido', 'Bônus assiduidade', 'Ajuda de custo em rota',
]

// ── Frequências (fiel ao HTML) ────────────────────────────────────────────────
const FREQ_OPTIONS = [
  { value: 'diaria',      label: 'Diária',          mult: 20 },
  { value: '3x_semana',   label: '3x por semana',   mult: 12 },
  { value: '2x_semana',   label: '2x por semana',   mult: 8  },
  { value: 'semanal',     label: 'Semanal',          mult: 4  },
  { value: 'quinzenal',   label: 'Quinzenal',        mult: 2  },
  { value: 'sob_demanda', label: 'Sob demanda',      mult: 0  },
] as const

interface FormState {
  titulo: string
  rota_origem: string
  uf_origem: string
  rota_destino: string
  uf_destino: string
  km_estimado: string
  frequencia_tipo: string
  tipo_veiculo: string
  tipo_equipamento: string
  equip_obs: string
  vagas_abertas: string
  inicio_previsto: string
  tipo_carga: string
  ano_maximo_veiculo: number
  valor_km: string
  forma_pagamento: string
  adiantamento: string
  criterios_hab: string[]
  criterios_doc: string[]
  criterios_op: string[]
  requisitos_adicionais: string[]
  beneficios: string[]
  periodo_meses: string
  jornada: string
  descricao: string
}

export default function NovaVagaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [customReqs, setCustomReqs] = useState<string[]>([])

  const [form, setForm] = useState<FormState>({
    titulo: '', rota_origem: '', uf_origem: '', rota_destino: '', uf_destino: '',
    km_estimado: '', frequencia_tipo: '', tipo_veiculo: '', tipo_equipamento: '',
    equip_obs: '', vagas_abertas: '1', inicio_previsto: 'Imediato',
    tipo_carga: 'Carga Seca', ano_maximo_veiculo: 2020,
    valor_km: '', forma_pagamento: 'Semanal', adiantamento: '30',
    criterios_hab: ['cnh_e'], criterios_doc: ['rntrc', 'tac'],
    criterios_op: [], requisitos_adicionais: [],
    beneficios: ['Adiantamento', 'Seguro de carga', 'Rastreamento'],
    periodo_meses: '', jornada: '', descricao: '',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  // ── Estimativa (fiel ao HTML: calcRemunPreview usa ~8 viagens como fallback no form) ──
  const estimativa = useMemo(() => {
    const km  = Number(form.km_estimado)
    const vkm = Number(form.valor_km)
    if (!km || !vkm || !form.frequencia_tipo) return null
    const freqOpt = FREQ_OPTIONS.find(f => f.value === form.frequencia_tipo)
    if (!freqOpt || freqOpt.mult === 0) return null
    const valorViagem = km * vkm
    const diasMes = freqOpt.mult
    return { valorViagem, diasMes, total: valorViagem * diasMes, kmMes: km * diasMes }
  }, [form.km_estimado, form.valor_km, form.frequencia_tipo])

  // ── Vehicle type selection ────────────────────────────────────────────────
  const vtypeGroup = VTYPE_GROUPS.find(v => v.value === form.tipo_veiculo)?.group ?? ''
  const implementos = vtypeGroup && vtypeGroup !== 'leve' ? IMPLEMENTOS[vtypeGroup] ?? [] : []

  function selectVType(vtype: string) {
    setForm(prev => ({ ...prev, tipo_veiculo: vtype, tipo_equipamento: '' }))
    setErrors(prev => ({ ...prev, tipo_veiculo: undefined }))
  }

  function selectImpl(name: string) {
    setForm(prev => ({ ...prev, tipo_equipamento: name }))
  }

  // ── Criterios toggle ─────────────────────────────────────────────────────
  function toggleCriterio(arr: string[], key: string, field: keyof FormState) {
    setForm(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).includes(key)
        ? (prev[field] as string[]).filter(k => k !== key)
        : [...(prev[field] as string[]), key],
    }))
  }

  // ── Benefícios toggle ────────────────────────────────────────────────────
  function toggleBeneficio(b: string) {
    setForm(prev => ({
      ...prev,
      beneficios: prev.beneficios.includes(b)
        ? prev.beneficios.filter(x => x !== b)
        : [...prev.beneficios, b],
    }))
  }

  // ── Custom requirements ──────────────────────────────────────────────────
  function addCustomReq() {
    if (customReqs.length >= 6) return
    setCustomReqs(prev => [...prev, ''])
  }
  function updateCustomReq(i: number, val: string) {
    setCustomReqs(prev => prev.map((r, idx) => idx === i ? val : r))
  }
  function removeCustomReq(i: number) {
    setCustomReqs(prev => prev.filter((_, idx) => idx !== i))
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, string>> = {}
    if (!form.rota_origem.trim()) newErrors.rota_origem = 'Cidade de origem é obrigatória'
    if (!form.rota_destino.trim()) newErrors.rota_destino = 'Cidade de destino é obrigatória'
    if (!form.km_estimado || Number(form.km_estimado) <= 0) newErrors.km_estimado = 'Informe a distância estimada em km'
    if (!form.tipo_veiculo) newErrors.tipo_veiculo = 'Selecione o tipo de veículo'
    if (!form.valor_km || Number(form.valor_km) <= 0) newErrors.valor_km = 'Informe o valor pago por km (R$/km)'
    if (!form.frequencia_tipo) newErrors.frequencia_tipo = 'Selecione a frequência das viagens'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!validate()) return

    const freqOpt = FREQ_OPTIONS.find(f => f.value === form.frequencia_tipo)
    const valorContrato = freqOpt && freqOpt.mult > 0
      ? Number(form.km_estimado) * Number(form.valor_km) * freqOpt.mult
      : null

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const allReqs = customReqs.filter(r => r.trim())

      const { error } = await supabase.from('vagas').insert({
        transportadora_id: user.id,
        titulo: form.titulo.trim() || `${form.rota_origem} → ${form.rota_destino}`,
        rota_origem: form.rota_origem.trim(),
        uf_origem: form.uf_origem || null,
        rota_destino: form.rota_destino.trim(),
        uf_destino: form.uf_destino || null,
        km_estimado: Number(form.km_estimado),
        frequencia_tipo: form.frequencia_tipo,
        tipo_veiculo: form.tipo_veiculo,
        tipo_equipamento: form.tipo_equipamento || null,
        equip_obs: form.equip_obs.trim() || null,
        tipo_carga: form.tipo_carga || null,
        vagas_abertas: Number(form.vagas_abertas) || 1,
        inicio_previsto: form.inicio_previsto || null,
        ano_maximo_veiculo: form.ano_maximo_veiculo,
        valor_km: Number(form.valor_km),
        valor_contrato: valorContrato,
        forma_pagamento: form.forma_pagamento || null,
        adiantamento: form.adiantamento ? Number(form.adiantamento) : null,
        periodo_meses: form.periodo_meses ? Number(form.periodo_meses) : null,
        jornada: form.jornada.trim() || null,
        descricao: form.descricao.trim() || null,
        contrata_equipamento: false,
        criterios_hab: form.criterios_hab.length > 0 ? form.criterios_hab : null,
        criterios_doc: form.criterios_doc.length > 0 ? form.criterios_doc : null,
        criterios_op: form.criterios_op.length > 0 ? form.criterios_op : null,
        requisitos_adicionais: allReqs.length > 0 ? allReqs : null,
        beneficios: form.beneficios.length > 0 ? form.beneficios : null,
        status: 'ativa' as const,
      })

      if (error) throw error
      setSuccess(true)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message
      setSubmitError(msg ?? 'Erro ao publicar vaga. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 px-4">
        <div className="w-16 h-16 rounded-full bg-success-light border border-success/20 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={32} className="text-success" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-text-primary mb-2">Vaga publicada!</h1>
        <p className="text-text-secondary text-sm mb-8">Sua vaga já está visível no marketplace para os agregados.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/transportadora/vagas">
            <Button>Ver minhas vagas →</Button>
          </Link>
          <Button variant="secondary" onClick={() => setSuccess(false)}>Publicar outra</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/transportadora/vagas">
          <button className="p-2 rounded-md hover:bg-surface text-text-muted transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans">Nova publicação</p>
          <h1 className="font-serif text-2xl font-bold text-text-primary">Publicar vaga de agregamento</h1>
        </div>
      </div>

      {submitError && (
        <div className="bg-danger-light border border-danger/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-danger flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── ROTA ── */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={16} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Rota da operação</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Cidade de origem"
              placeholder="Ex: São Paulo"
              value={form.rota_origem}
              onChange={e => setForm(p => ({ ...p, rota_origem: e.target.value }))}
              error={errors.rota_origem}
            />
            <Select
              label="Estado de origem"
              value={form.uf_origem}
              onChange={e => setForm(p => ({ ...p, uf_origem: e.target.value }))}
            >
              <option value="">Selecione</option>
              {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </Select>
            <Input
              label="Cidade de destino"
              placeholder="Ex: Curitiba"
              value={form.rota_destino}
              onChange={e => setForm(p => ({ ...p, rota_destino: e.target.value }))}
              error={errors.rota_destino}
            />
            <Select
              label="Estado de destino"
              value={form.uf_destino}
              onChange={e => setForm(p => ({ ...p, uf_destino: e.target.value }))}
            >
              <option value="">Selecione</option>
              {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </Select>
            <Input
              label="Distância (km)"
              type="number"
              min="1"
              step="1"
              placeholder="408"
              value={form.km_estimado}
              onChange={e => setForm(p => ({ ...p, km_estimado: e.target.value }))}
              error={errors.km_estimado}
            />
            <Select
              label="Frequência da rota"
              value={form.frequencia_tipo}
              onChange={e => setForm(p => ({ ...p, frequencia_tipo: e.target.value }))}
              error={errors.frequencia_tipo}
            >
              <option value="">Selecione a frequência</option>
              {FREQ_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </Select>
          </div>
        </div>

        {/* ── TIPO DE VEÍCULO ── */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Truck size={16} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Tipo de veículo</h2>
          </div>
          <p className="text-xs text-text-secondary">Selecione o tipo de veículo exigido. O campo de implemento será atualizado automaticamente.</p>

          {/* Vehicle pill grid */}
          <div>
            <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">Tipo de veículo exigido</p>
            <div className="flex flex-wrap gap-2">
              {VTYPE_GROUPS.map(v => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => selectVType(v.value)}
                  className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all min-w-[72px] ${
                    form.tipo_veiculo === v.value
                      ? 'border-accent bg-accent text-bg'
                      : 'border-border bg-bg text-text-secondary hover:border-accent/50'
                  }`}
                >
                  <span className="text-xl">{v.emoji}</span>
                  <span>{v.value}</span>
                  {v.axle && <span className="text-[9px] opacity-70">{v.axle}</span>}
                </button>
              ))}
            </div>
            {errors.tipo_veiculo && <p className="text-xs text-danger mt-1">{errors.tipo_veiculo}</p>}
          </div>

          {/* Implemento grid — dinâmico por grupo */}
          {implementos.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">
                Implemento / carroceria
                <span className="ml-2 normal-case text-text-muted font-normal">
                  — para {vtypeGroup === 'cavalo' ? 'cavalos mecânicos' : 'veículos de médio porte'}
                </span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {implementos.map(im => (
                  <button
                    key={im.name}
                    type="button"
                    onClick={() => selectImpl(im.name)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                      form.tipo_equipamento === im.name
                        ? 'border-accent bg-accent/5'
                        : im.empresa
                        ? 'border-info/30 bg-info/5 hover:border-info/50'
                        : 'border-border bg-bg hover:border-accent/40'
                    }`}
                  >
                    <span className="text-lg flex-shrink-0">{im.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{im.name}</p>
                      <p className="text-[10px] text-text-muted">{im.dim}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Equip obs */}
          {form.tipo_equipamento && (
            <Input
              label="Observações sobre o equipamento fornecido (opcional)"
              placeholder="Ex: Carreta Randon SR graneleira ano 2023, manutenção por conta da empresa"
              value={form.equip_obs}
              onChange={e => setForm(p => ({ ...p, equip_obs: e.target.value }))}
            />
          )}

          {/* vagas abertas + início + carga + ano máximo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Vagas em aberto"
              type="number"
              min="1"
              value={form.vagas_abertas}
              onChange={e => setForm(p => ({ ...p, vagas_abertas: e.target.value }))}
            />
            <Select
              label="Início previsto"
              value={form.inicio_previsto}
              onChange={e => setForm(p => ({ ...p, inicio_previsto: e.target.value }))}
            >
              <option>Imediato</option>
              <option>Em 7 dias</option>
              <option>Em 15 dias</option>
              <option>Em 30 dias</option>
            </Select>
            <Select
              label="Tipo de carga transportada"
              value={form.tipo_carga}
              onChange={e => setForm(p => ({ ...p, tipo_carga: e.target.value }))}
            >
              <option>Carga Seca</option>
              <option>Frigorífico</option>
              <option>Granel</option>
              <option>Tanque</option>
              <option>Carga Viva</option>
              <option>Perigosos (MOPP)</option>
              <option>Carga Indivisível</option>
              <option>Carga Líquida</option>
              <option>Carga Refrigerada</option>
              <option>Eletrônicos / Alto Valor</option>
            </Select>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Ano máximo do veículo</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={2000}
                  max={2025}
                  value={form.ano_maximo_veiculo}
                  onChange={e => setForm(p => ({ ...p, ano_maximo_veiculo: Number(e.target.value) }))}
                  className="flex-1 accent-accent"
                />
                <span className="font-serif text-lg font-semibold text-text-primary min-w-[52px] text-right">
                  {form.ano_maximo_veiculo}
                </span>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">Veículos até o ano selecionado serão aceitos</p>
            </div>
          </div>
        </div>

        {/* ── REMUNERAÇÃO ── */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Remuneração</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Valor por km (R$/km)"
              type="number"
              min="0.01"
              step="0.10"
              placeholder="7.20"
              value={form.valor_km}
              onChange={e => setForm(p => ({ ...p, valor_km: e.target.value }))}
              error={errors.valor_km}
              hint="Remuneração bruta paga ao agregado por km rodado"
            />
            <Select
              label="Forma de pagamento"
              value={form.forma_pagamento}
              onChange={e => setForm(p => ({ ...p, forma_pagamento: e.target.value }))}
            >
              <option>Semanal</option>
              <option>Quinzenal</option>
              <option>Mensal</option>
              <option>Por viagem</option>
            </Select>
            <Input
              label="Adiantamento (%)"
              type="number"
              min="0"
              max="80"
              placeholder="30"
              value={form.adiantamento}
              onChange={e => setForm(p => ({ ...p, adiantamento: e.target.value }))}
            />
          </div>

          {/* Estimativa preview */}
          {form.frequencia_tipo === 'sob_demanda' ? (
            <div className="bg-bg border border-dashed border-border rounded-xl p-4 text-center text-sm text-text-muted">
              Estimativa mensal indisponível para rotas sob demanda
            </div>
          ) : estimativa ? (
            <div className="bg-success-light border border-success/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={15} className="text-success" />
                <p className="text-xs font-semibold text-success uppercase tracking-wide">Estimativa mensal</p>
              </div>
              <p className="font-bold text-success text-2xl mb-2">
                {formatCurrency(estimativa.total)}<span className="text-sm font-normal">/mês</span>
              </p>
              <div className="space-y-1 text-xs text-text-secondary">
                <div className="flex justify-between">
                  <span>Valor por viagem</span>
                  <span className="font-medium">{formatCurrency(estimativa.valorViagem)}</span>
                </div>
                <div className="flex justify-between">
                  <span>× viagens no mês</span>
                  <span className="font-medium">{estimativa.diasMes} viagens</span>
                </div>
                <div className="border-t border-success/20 pt-1 flex justify-between font-semibold text-success">
                  <span>Km total estimado/mês</span>
                  <span>{estimativa.kmMes.toLocaleString('pt-BR')} km</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-bg border border-dashed border-border rounded-xl p-4 text-center text-sm text-text-muted">
              Preencha o valor/km e a frequência para ver a estimativa mensal
            </div>
          )}
        </div>

        {/* ── HABILITAÇÕES E CERTIFICAÇÕES ── */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Habilitações e certificações exigidas</h2>
          </div>
          {CRITERIOS_HAB.map(c => (
            <CriterioItem
              key={c.key}
              label={c.label}
              desc={c.desc}
              obrigatorio={c.obrigatorio}
              checked={form.criterios_hab.includes(c.key)}
              onToggle={() => toggleCriterio(form.criterios_hab, c.key, 'criterios_hab')}
            />
          ))}
        </div>

        {/* ── DOCUMENTAÇÃO VEICULAR ── */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Package size={16} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Registro e documentação veicular</h2>
          </div>
          {CRITERIOS_DOC.map(c => (
            <CriterioItem
              key={c.key}
              label={c.label}
              desc={c.desc}
              obrigatorio={c.obrigatorio}
              checked={form.criterios_doc.includes(c.key)}
              onToggle={() => toggleCriterio(form.criterios_doc, c.key, 'criterios_doc')}
            />
          ))}
        </div>

        {/* ── EXIGÊNCIAS OPERACIONAIS ── */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Truck size={16} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Exigências operacionais</h2>
          </div>
          {CRITERIOS_OP.map(c => (
            <CriterioItem
              key={c.key}
              label={c.label}
              desc={c.desc}
              checked={form.criterios_op.includes(c.key)}
              onToggle={() => toggleCriterio(form.criterios_op, c.key, 'criterios_op')}
            />
          ))}
        </div>

        {/* ── REQUISITOS ADICIONAIS ── */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Requisitos adicionais (preenchimento livre)</h2>
          </div>
          <p className="text-xs text-text-secondary">Adicione qualquer exigência específica da sua operação não contemplada acima.</p>
          {customReqs.map((req, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={req}
                onChange={e => updateCustomReq(i, e.target.value)}
                placeholder="Ex: Experiência específica com granéis de soja"
                className="flex-1 bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
              <button
                type="button"
                onClick={() => removeCustomReq(i)}
                className="w-9 h-9 rounded-full bg-danger-light text-danger border-none flex items-center justify-center text-lg hover:opacity-80 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
          {customReqs.length < 6 && (
            <button
              type="button"
              onClick={addCustomReq}
              className="flex items-center gap-2 text-sm text-text-secondary border border-dashed border-border px-4 py-2.5 rounded-pill hover:border-accent hover:text-text-primary transition-colors"
            >
              + Adicionar requisito
            </button>
          )}
        </div>

        {/* ── BENEFÍCIOS ── */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide mb-3">Benefícios oferecidos</h2>
          <div className="flex flex-wrap gap-2">
            {BENEFICIOS_LIST.map(b => (
              <button
                key={b}
                type="button"
                onClick={() => toggleBeneficio(b)}
                className={`px-3 py-1.5 rounded-pill text-sm border transition-all ${
                  form.beneficios.includes(b)
                    ? 'bg-accent text-bg border-accent'
                    : 'bg-bg border-border text-text-secondary hover:border-accent/50'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* ── CONTRATO E JORNADA ── */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Contrato e jornada</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Duração mínima"
              value={form.periodo_meses}
              onChange={e => setForm(p => ({ ...p, periodo_meses: e.target.value }))}
            >
              <option value="3">3 meses</option>
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
              <option value="">Renovação mensal</option>
              <option value="">Safra</option>
            </Select>
            <Input
              label="Jornada / escala"
              placeholder="Ex: Segunda a Sábado"
              value={form.jornada}
              onChange={e => setForm(p => ({ ...p, jornada: e.target.value }))}
            />
          </div>
          <Textarea
            label="Descrição da operação"
            placeholder="Descreva a operação, histórico da empresa, diferenciais e qualquer informação relevante para o motorista..."
            rows={5}
            value={form.descricao}
            onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
          />
        </div>

        {/* ── SUBMIT ── */}
        <div className="flex gap-3 pb-4">
          <Link href="/transportadora/vagas" className="flex-1">
            <Button variant="ghost" fullWidth type="button">Cancelar</Button>
          </Link>
          <Button type="submit" loading={loading} fullWidth className="flex-1">
            {loading ? 'Publicando...' : 'Publicar vaga →'}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ── CriterioItem component ────────────────────────────────────────────────────
function CriterioItem({
  label, desc, checked, onToggle, obrigatorio,
}: {
  label: string
  desc: string
  checked: boolean
  onToggle: () => void
  obrigatorio?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-all ${
        checked ? 'border-accent/30 bg-accent/5' : 'border-border bg-bg hover:border-accent/20'
      }`}
    >
      <div className={`w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
        checked ? 'bg-accent border-accent' : 'border-border'
      }`}>
        {checked && <span className="text-bg text-xs font-bold">✓</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">
          {label}
          {obrigatorio && (
            <span className="ml-2 text-[9px] font-bold uppercase tracking-wider bg-accent text-bg px-1.5 py-0.5 rounded-sm">Obrigatório</span>
          )}
        </p>
        <p className="text-xs text-text-muted mt-0.5">{desc}</p>
      </div>
    </button>
  )
}
