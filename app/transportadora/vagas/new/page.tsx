'use client'
import { useState, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, AlertCircle, CheckCircle2, Info } from 'lucide-react'

// Vehicle groups
const VEICULOS = [
  { id: 'Automóvel', icon: '🚗', label: 'Automóvel', group: 'leve' },
  { id: 'Van', icon: '🚐', label: 'Van', group: 'leve' },
  { id: '3/4', icon: '🚚', label: '3/4', group: 'medio' },
  { id: 'Toco', icon: '🚛', label: 'Toco', group: 'medio' },
  { id: 'Truck', icon: '🚛', label: 'Truck', group: 'medio' },
  { id: 'Cavalo 4x2', icon: '🔵', label: 'Cavalo 4x2', sub: '2 eixos', group: 'cavalo' },
  { id: 'Cavalo 6x2', icon: '🟡', label: 'Cavalo 6x2', sub: '3 eixos', group: 'cavalo' },
  { id: 'Cavalo 6x4', icon: '🔴', label: 'Cavalo 6x4', sub: '3 eixos tração', group: 'cavalo' },
]

const IMPLEMENTOS: Record<string, Array<{ icon: string; name: string; dim: string }>> = {
  medio: [
    { icon: '📦', name: 'Carga Seca', dim: '6–9m · até 15t' },
    { icon: '🧊', name: 'Frigorífico', dim: '8m · até 12t' },
    { icon: '📫', name: 'Baú', dim: '6–8m · até 14t' },
    { icon: '🌾', name: 'Graneleiro', dim: '8m · até 15t' },
    { icon: '⚗️', name: 'Tanque / Isotérmico', dim: '8m · 10.000L' },
    { icon: '🏢', name: 'Implemento da empresa', dim: 'fornecido' },
  ],
  cavalo: [
    { icon: '📦', name: 'Carga Seca 12 mts', dim: '12m · 27t' },
    { icon: '📦', name: 'Carga Seca 15 mts', dim: '15m · 33t' },
    { icon: '🧊', name: 'Frigorífico 12 mts', dim: '12m · 18t' },
    { icon: '🧊', name: 'Frigorífico 15 mts', dim: '15m · 22t' },
    { icon: '🌾', name: 'Graneleiro 12 mts', dim: '12m · 28t' },
    { icon: '🌾', name: 'Graneleiro 15 mts', dim: '15m · 34t' },
    { icon: '🔧', name: 'Prancha 12 mts', dim: '12m · 30t' },
    { icon: '🔧', name: 'Prancha 15–19 mts', dim: '15m · 40t' },
    { icon: '⛽', name: 'Tanque 30.000L', dim: '30.000L' },
    { icon: '🚗', name: 'Cegonha 23 mts', dim: '23m · 10 veículos' },
    { icon: '🔗', name: 'Bitrem Graneleiro', dim: '25m · 45t' },
    { icon: '🔗', name: 'Rodotrem 27 mts', dim: '27m · 57t' },
    { icon: '🏢', name: 'Implemento da empresa', dim: 'fornecido' },
  ],
}

const TIPOS_CARGA = [
  'Carga Geral', 'Frigorificada', 'Granel Sólido', 'Granel Líquido',
  'Perigosa/MOPP', 'Carga Viva', 'Veículos', 'Indivisível/AET',
  'Documentos/Valores', 'Outros',
]

const ESTADOS_BR = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA',
  'PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

const HABILITACOES = [
  { key: 'cnh_e', label: 'CNH Cat. E', required: true },
  { key: 'mopp', label: 'MOPP' },
  { key: 'aet', label: 'AET / Carga Indivisível' },
  { key: 'transp_coletivo', label: 'Transporte Coletivo' },
  { key: 'guindaste', label: 'Guindaste' },
  { key: 'nr11', label: 'NR-11' },
]

const DOCS_VEICULO = [
  { key: 'rntrc', label: 'RNTRC / ANTT', required: true },
  { key: 'tac', label: 'TAC', required: true },
  { key: 'etc', label: 'ETC' },
  { key: 'laudo', label: 'Laudo de vistoria' },
  { key: 'seguro', label: 'Seguro RCFDC' },
  { key: 'tacografo', label: 'Tacógrafo calibrado' },
]

export default function NovaVagaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // Section A — Rota
  const [origem, setOrigem] = useState('')
  const [estadoOrigem, setEstadoOrigem] = useState('')
  const [destino, setDestino] = useState('')
  const [estadoDestino, setEstadoDestino] = useState('')
  const [km, setKm] = useState('')
  const [frequencia, setFrequencia] = useState('')

  // Section B — Veículo
  const [veiculo, setVeiculo] = useState('')
  const [vagasAbertas, setVagasAbertas] = useState('1')
  const [inicio, setInicio] = useState('Imediato')
  const [anoMax, setAnoMax] = useState(2018)
  const [tipoCarga, setTipoCarga] = useState('')

  // Section C — Implemento
  const [implemento, setImplemento] = useState('')

  // Section D — Equipamento da transportadora
  const [contraEquip, setContraEquip] = useState(false)
  const [equipObs, setEquipObs] = useState('')

  // Section E — Remuneração
  const [remunKm, setRemunKm] = useState('')
  const [formaPgto, setFormaPgto] = useState('Quinzenal')
  const [adiantamento, setAdiantamento] = useState('30')

  // Sections F+G — Critérios
  const [habChecked, setHabChecked] = useState<Record<string, boolean>>({ cnh_e: true, rntrc: true, tac: true })

  // Section H — Requisitos adicionais
  const [requisitos, setRequisitos] = useState<string[]>([])
  const [toastMsg, setToastMsg] = useState('')

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({})
  const formRef = useRef<HTMLDivElement>(null)

  const veiculoInfo = VEICULOS.find(v => v.id === veiculo)
  const group = veiculoInfo?.group ?? ''
  const showImplemento = group === 'medio' || group === 'cavalo'

  const kmNum = parseFloat(km) || 0
  const remunNum = parseFloat(remunKm) || 0
  const estimMensal = kmNum > 0 && remunNum > 0 ? Math.round(remunNum * kmNum * 8) : 0

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  function addRequisito() {
    if (requisitos.length >= 6) { showToast('Máximo de 6 requisitos adicionais'); return }
    setRequisitos(prev => [...prev, ''])
  }

  function updateRequisito(i: number, val: string) {
    setRequisitos(prev => prev.map((r, idx) => idx === i ? val : r))
  }

  function removeRequisito(i: number) {
    setRequisitos(prev => prev.filter((_, idx) => idx !== i))
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!origem.trim()) errs.origem = 'Informe a cidade de origem'
    if (!destino.trim()) errs.destino = 'Informe a cidade de destino'
    if (!km || kmNum <= 0) errs.km = 'Informe a distância em km'
    if (!veiculo) errs.veiculo = 'Selecione o tipo de veículo'
    if (!remunKm || remunNum <= 0) errs.remunKm = 'Informe a remuneração por km'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!validate()) {
      formRef.current?.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const rotaOrigem = estadoOrigem ? `${origem.trim()}, ${estadoOrigem}` : origem.trim()
      const rotaDestino = estadoDestino ? `${destino.trim()}, ${estadoDestino}` : destino.trim()

      const descParts: string[] = []
      if (frequencia) descParts.push(`Frequência: ${frequencia}`)
      if (tipoCarga) descParts.push(`Carga: ${tipoCarga}`)
      if (inicio !== 'Imediato') descParts.push(`Início: ${inicio}`)
      descParts.push(`Ano máx. veículo: ${anoMax}`)
      if (contraEquip && equipObs) descParts.push(`Equip. empresa: ${equipObs}`)
      if (adiantamento !== '0') descParts.push(`Adiantamento: ${adiantamento}%`)
      if (requisitos.filter(Boolean).length > 0) descParts.push(`Requisitos: ${requisitos.filter(Boolean).join('; ')}`)

      const { error } = await supabase.from('vagas').insert({
        transportadora_id: user.id,
        titulo: `${veiculo} ${rotaOrigem} → ${rotaDestino}`,
        rota_origem: rotaOrigem,
        rota_destino: rotaDestino,
        km_estimado: kmNum,
        tipo_veiculo: veiculo,
        contrata_equipamento: contraEquip,
        tipo_equipamento: showImplemento && implemento ? implemento : (contraEquip ? 'Fornecido pela empresa' : null),
        valor_contrato: estimMensal || null,
        periodo_meses: 12,
        descricao: descParts.join(' | ') || null,
        status: 'ativa',
      })

      if (error) throw error
      setSubmitted(true)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Erro ao publicar vaga. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-success" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-text-primary mb-2">Vaga publicada!</h2>
        <p className="text-text-secondary mb-8">Sua vaga está ativa e já pode receber candidaturas de motoristas qualificados.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setSubmitted(false); setVeiculo(''); setOrigem(''); setDestino(''); setKm(''); setRemunKm('') }}
            className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-surface"
          >
            Publicar outra
          </button>
          <Link href="/transportadora/vagas">
            <button className="px-5 py-2.5 rounded-xl bg-accent text-bg text-sm font-medium">Ver vagas</button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div ref={formRef} className="max-w-2xl mx-auto space-y-5">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-text-primary text-bg text-sm px-4 py-3 rounded-xl shadow-lg">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/transportadora/vagas">
          <button className="p-2 rounded-md hover:bg-surface text-text-muted transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold text-text-primary">Publicar nova vaga</h1>
          <p className="text-text-secondary text-sm mt-0.5">Preencha os detalhes para receber candidaturas</p>
        </div>
      </div>

      {submitError && (
        <div className="bg-danger-light border border-danger/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-danger flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* A — Rota */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">A. Rota da Operação</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Origem *</label>
              <input
                value={origem}
                onChange={e => { setOrigem(e.target.value); setErrors(p => ({ ...p, origem: '' })) }}
                placeholder="Cidade"
                className={`w-full px-3 py-2 text-sm bg-bg border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent ${errors.origem ? 'border-danger' : 'border-border'}`}
              />
              {errors.origem && <p data-error className="text-xs text-danger mt-1">{errors.origem}</p>}
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Estado</label>
              <select
                value={estadoOrigem}
                onChange={e => setEstadoOrigem(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">UF</option>
                {ESTADOS_BR.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Destino *</label>
              <input
                value={destino}
                onChange={e => { setDestino(e.target.value); setErrors(p => ({ ...p, destino: '' })) }}
                placeholder="Cidade"
                className={`w-full px-3 py-2 text-sm bg-bg border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent ${errors.destino ? 'border-danger' : 'border-border'}`}
              />
              {errors.destino && <p data-error className="text-xs text-danger mt-1">{errors.destino}</p>}
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Estado</label>
              <select
                value={estadoDestino}
                onChange={e => setEstadoDestino(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">UF</option>
                {ESTADOS_BR.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Distância (km) *</label>
              <input
                type="number" min="1" value={km}
                onChange={e => { setKm(e.target.value); setErrors(p => ({ ...p, km: '' })) }}
                placeholder="Ex: 430"
                className={`w-full px-3 py-2 text-sm bg-bg border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent ${errors.km ? 'border-danger' : 'border-border'}`}
              />
              {errors.km && <p data-error className="text-xs text-danger mt-1">{errors.km}</p>}
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Frequência</label>
              <select
                value={frequencia}
                onChange={e => setFrequencia(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Selecione</option>
                {['Diária', '2x por semana', '3x por semana', 'Semanal', 'Quinzenal', 'Sob demanda'].map(f => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* B — Tipo de Veículo */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">B. Tipo de Veículo *</h2>
          {errors.veiculo && <p data-error className="text-xs text-danger -mt-2">{errors.veiculo}</p>}
          <div className="flex flex-wrap gap-2">
            {VEICULOS.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => { setVeiculo(v.id); setImplemento(''); setErrors(p => ({ ...p, veiculo: '' })) }}
                className={`flex flex-col items-center px-3 py-2.5 rounded-xl border text-sm transition-all ${
                  veiculo === v.id
                    ? 'border-accent bg-accent text-bg font-medium'
                    : 'border-border bg-bg text-text-secondary hover:border-accent/50 hover:bg-surface'
                }`}
              >
                <span className="text-lg mb-0.5">{v.icon}</span>
                <span className="text-xs font-medium leading-tight">{v.label}</span>
                {v.sub && <span className="text-[9px] opacity-70 leading-tight">{v.sub}</span>}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border">
            <div>
              <label className="block text-xs text-text-muted mb-1">Vagas abertas</label>
              <input type="number" min="1" value={vagasAbertas}
                onChange={e => setVagasAbertas(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Início</label>
              <select value={inicio} onChange={e => setInicio(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent">
                {['Imediato', '7 dias', '15 dias', '30 dias'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Ano máx. veículo: {anoMax}</label>
              <input type="range" min={2000} max={2025} value={anoMax}
                onChange={e => setAnoMax(Number(e.target.value))}
                className="w-full accent-accent mt-2"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Tipo de carga</label>
              <select value={tipoCarga} onChange={e => setTipoCarga(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent">
                <option value="">Selecione</option>
                {TIPOS_CARGA.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* C — Implemento (conditional) */}
        {showImplemento && (
          <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
            <div>
              <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">C. Implemento</h2>
              <p className="text-xs text-text-muted mt-0.5">
                {group === 'cavalo' ? 'Para cavalos mecânicos' : 'Para veículos de médio porte'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {IMPLEMENTOS[group]?.map(imp => (
                <button
                  key={imp.name}
                  type="button"
                  onClick={() => setImplemento(implemento === imp.name ? '' : imp.name)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    implemento === imp.name
                      ? 'border-accent bg-accent/10 text-text-primary'
                      : 'border-border bg-bg text-text-secondary hover:border-accent/40'
                  }`}
                >
                  <span className="text-base flex-shrink-0">{imp.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium leading-tight truncate">{imp.name}</p>
                    <p className="text-[10px] text-text-muted leading-tight">{imp.dim}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* D — Equipamento da transportadora */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">D. Equipamento da Transportadora</h2>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={contraEquip}
              onChange={e => setContraEquip(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-accent"
            />
            <span className="text-sm text-text-secondary">
              A transportadora fornece o equipamento (implemento próprio)
            </span>
          </label>
          {contraEquip && (
            <>
              <textarea
                value={equipObs}
                onChange={e => setEquipObs(e.target.value)}
                rows={2}
                placeholder="Descreva o equipamento fornecido (opcional)"
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent resize-none"
              />
              <div className="flex items-start gap-2 bg-info/8 border border-info/25 rounded-lg px-3 py-2.5">
                <Info size={14} className="text-info mt-0.5 flex-shrink-0" />
                <p className="text-xs text-info">
                  Vagas com equipamento fornecido tendem a ter remuneração por km ligeiramente menor, pois o custo do implemento é da transportadora.
                </p>
              </div>
            </>
          )}
        </div>

        {/* E — Remuneração */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">E. Remuneração *</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">R$ por km *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">R$</span>
                <input
                  type="number" min="0.01" step="0.01"
                  value={remunKm}
                  onChange={e => { setRemunKm(e.target.value); setErrors(p => ({ ...p, remunKm: '' })) }}
                  placeholder="0,00"
                  className={`w-full pl-9 pr-3 py-2 text-sm bg-bg border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent ${errors.remunKm ? 'border-danger' : 'border-border'}`}
                />
              </div>
              {errors.remunKm && <p data-error className="text-xs text-danger mt-1">{errors.remunKm}</p>}
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Forma de pagamento</label>
              <select value={formaPgto} onChange={e => setFormaPgto(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent">
                {['Semanal', 'Quinzenal', 'Mensal', 'Por viagem'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Adiantamento (%)</label>
              <input type="number" min="0" max="80" value={adiantamento}
                onChange={e => setAdiantamento(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          {estimMensal > 0 && (
            <div className="bg-success/8 border border-success/25 rounded-lg px-4 py-3">
              <p className="text-sm text-success font-medium">
                ≈ R$ {estimMensal.toLocaleString('pt-BR')} est. mensal
                <span className="font-normal text-xs ml-1">(8 viagens/mês)</span>
              </p>
              <p className="text-xs text-text-muted mt-0.5">R$ {remunKm}/km × {km} km × 8 viagens</p>
            </div>
          )}
        </div>

        {/* F — Habilitações */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">F. Habilitações exigidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {HABILITACOES.map(h => (
              <label key={h.key} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!habChecked[h.key]}
                  disabled={h.required}
                  onChange={e => setHabChecked(p => ({ ...p, [h.key]: e.target.checked }))}
                  className="w-4 h-4 accent-accent"
                />
                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                  {h.label}
                  {h.required && <span className="ml-1.5 text-[10px] bg-warning/15 text-warning px-1.5 py-0.5 rounded font-medium">Obrigatório</span>}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* G — Docs veicular */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">G. Documentação veicular</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DOCS_VEICULO.map(d => (
              <label key={d.key} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!habChecked[d.key]}
                  disabled={d.required}
                  onChange={e => setHabChecked(p => ({ ...p, [d.key]: e.target.checked }))}
                  className="w-4 h-4 accent-accent"
                />
                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                  {d.label}
                  {d.required && <span className="ml-1.5 text-[10px] bg-warning/15 text-warning px-1.5 py-0.5 rounded font-medium">Obrigatório</span>}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* H — Requisitos adicionais */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">H. Requisitos adicionais</h2>
          {requisitos.map((r, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={r}
                onChange={e => updateRequisito(i, e.target.value)}
                placeholder={`Requisito ${i + 1}`}
                className="flex-1 px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button type="button" onClick={() => removeRequisito(i)}
                className="px-2 text-text-muted hover:text-danger transition-colors">×</button>
            </div>
          ))}
          <button
            type="button"
            onClick={addRequisito}
            className="text-sm text-accent hover:underline font-medium"
          >
            + Adicionar requisito
          </button>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pb-4">
          <Link href="/transportadora/vagas" className="flex-1">
            <button type="button" className="w-full px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-surface transition-colors">
              Cancelar
            </button>
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-bg text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {loading ? 'Publicando...' : 'Publicar vaga'}
          </button>
        </div>
      </form>
    </div>
  )
}
