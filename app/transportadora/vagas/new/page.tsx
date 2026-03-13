'use client'
import { useState, FormEvent, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Input, Select, Textarea } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { TIPOS_VEICULO, TIPOS_EQUIPAMENTO, formatCurrency, FREQ_MULT } from '@/lib/types'
import { ArrowLeft, MapPin, Truck, Package, DollarSign, Clock, FileText, AlertCircle, TrendingUp } from 'lucide-react'

interface FormData {
  titulo: string
  rota_origem: string
  rota_destino: string
  km_estimado: string
  tipo_veiculo: string
  contrata_equipamento: boolean
  tipo_equipamento: string
  // precificação
  valor_km: string
  frequencia_tipo: string
  // contrato
  periodo_meses: string
  descricao: string
}

interface FormErrors {
  titulo?: string
  rota_origem?: string
  rota_destino?: string
  km_estimado?: string
  tipo_veiculo?: string
  tipo_equipamento?: string
  valor_km?: string
  frequencia_tipo?: string
  periodo_meses?: string
}

// Opções de frequência idênticas ao dashboard-transportadora-v8.html linha 1272
const FREQ_OPTIONS = [
  { value: 'diaria',     label: 'Diária',           mult: 20 },
  { value: '3x_semana',  label: '3x por semana',    mult: 12 },
  { value: '2x_semana',  label: '2x por semana',    mult: 8  },
  { value: 'semanal',    label: 'Semanal',           mult: 4  },
  { value: 'quinzenal',  label: 'Quinzenal',         mult: 2  },
  { value: 'sob_demanda',label: 'Sob demanda',       mult: 0  },
] as const

export default function NovaVagaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [form, setForm] = useState<FormData>({
    titulo: '',
    rota_origem: '',
    rota_destino: '',
    km_estimado: '',
    tipo_veiculo: '',
    contrata_equipamento: false,
    tipo_equipamento: '',
    valor_km: '',
    frequencia_tipo: '',
    periodo_meses: '',
    descricao: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})

  // ── Estimativa mensal calculada em tempo real ────────────────────────────
  // Fiel ao calcRemunPreview do dashboard-transportadora-v8.html
  const estimativa = useMemo(() => {
    const km  = Number(form.km_estimado)
    const vkm = Number(form.valor_km)
    if (!km || !vkm || !form.frequencia_tipo) return null

    const freqOpt = FREQ_OPTIONS.find(f => f.value === form.frequencia_tipo)
    if (!freqOpt || freqOpt.mult === 0) return null   // sob_demanda sem estimativa

    const valorViagem = km * vkm
    const diasMes     = freqOpt.mult
    return { valorViagem, diasMes, total: valorViagem * diasMes, kmMes: km * diasMes }
  }, [form.km_estimado, form.valor_km, form.frequencia_tipo])

  function handleChange(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {}
    if (!form.titulo.trim())      newErrors.titulo      = 'Título da vaga é obrigatório'
    if (!form.rota_origem.trim()) newErrors.rota_origem = 'Cidade de origem é obrigatória'
    if (!form.rota_destino.trim())newErrors.rota_destino= 'Cidade de destino é obrigatória'
    if (!form.km_estimado || isNaN(Number(form.km_estimado)) || Number(form.km_estimado) <= 0)
      newErrors.km_estimado = 'Informe a distância estimada em km'
    if (!form.tipo_veiculo) newErrors.tipo_veiculo = 'Selecione o tipo de veículo'
    if (form.contrata_equipamento && !form.tipo_equipamento)
      newErrors.tipo_equipamento = 'Selecione o tipo de equipamento'
    if (!form.valor_km || isNaN(Number(form.valor_km)) || Number(form.valor_km) <= 0)
      newErrors.valor_km = 'Informe o valor pago por km (R$/km)'
    if (!form.frequencia_tipo)
      newErrors.frequencia_tipo = 'Selecione a frequência das viagens'
    if (!form.periodo_meses || isNaN(Number(form.periodo_meses)) || Number(form.periodo_meses) <= 0)
      newErrors.periodo_meses = 'Informe o período em meses'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!validate()) return

    // Calcular valor_contrato antes de salvar (null para sob_demanda)
    const freqOpt = FREQ_OPTIONS.find(f => f.value === form.frequencia_tipo)
    const valorContrato = freqOpt && freqOpt.mult > 0
      ? Number(form.km_estimado) * Number(form.valor_km) * freqOpt.mult
      : null

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { error } = await supabase.from('vagas').insert({
        transportadora_id: user.id,
        titulo: form.titulo.trim(),
        rota_origem: form.rota_origem.trim(),
        rota_destino: form.rota_destino.trim(),
        km_estimado: Number(form.km_estimado),
        tipo_veiculo: form.tipo_veiculo,
        contrata_equipamento: form.contrata_equipamento,
        tipo_equipamento: form.contrata_equipamento ? form.tipo_equipamento : null,
        valor_km: Number(form.valor_km),
        frequencia_tipo: form.frequencia_tipo,
        valor_contrato: valorContrato,
        periodo_meses: Number(form.periodo_meses),
        descricao: form.descricao.trim() || null,
        status: 'ativa' as const,
      })

      if (error) throw error
      router.push('/transportadora/vagas')
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Erro ao publicar vaga. Tente novamente.')
    } finally {
      setLoading(false)
    }
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificação */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Identificação</h2>
          </div>
          <Input
            label="Título da vaga"
            placeholder="Ex: Motorista agregado rota SP–RJ Cavalo 6x2"
            value={form.titulo}
            onChange={e => handleChange('titulo', e.target.value)}
            error={errors.titulo}
          />
        </div>

        {/* Rota */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={16} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Rota</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Cidade de origem"
              placeholder="Ex: São Paulo, SP"
              value={form.rota_origem}
              onChange={e => handleChange('rota_origem', e.target.value)}
              error={errors.rota_origem}
            />
            <Input
              label="Cidade de destino"
              placeholder="Ex: Rio de Janeiro, RJ"
              value={form.rota_destino}
              onChange={e => handleChange('rota_destino', e.target.value)}
              error={errors.rota_destino}
            />
          </div>
          <Input
            label="Distância (km)"
            type="number"
            min="1"
            step="1"
            placeholder="Ex: 580"
            value={form.km_estimado}
            onChange={e => handleChange('km_estimado', e.target.value)}
            error={errors.km_estimado}
            hint="Distância em km entre origem e destino"
          />
        </div>

        {/* Veículo e Equipamento */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Truck size={16} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Veículo e Equipamento</h2>
          </div>
          <Select
            label="Tipo de veículo exigido"
            value={form.tipo_veiculo}
            onChange={e => handleChange('tipo_veiculo', e.target.value)}
            error={errors.tipo_veiculo}
          >
            <option value="">Selecione o tipo de veículo</option>
            {TIPOS_VEICULO.map(tipo => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </Select>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="contrata_equipamento"
              checked={form.contrata_equipamento}
              onChange={e => {
                handleChange('contrata_equipamento', e.target.checked)
                if (!e.target.checked) handleChange('tipo_equipamento', '')
              }}
              className="mt-1 w-4 h-4 accent-accent cursor-pointer"
            />
            <label htmlFor="contrata_equipamento" className="text-sm text-text-secondary cursor-pointer leading-snug">
              <span className="font-medium text-text-primary">Contrata com equipamento</span>
              <br />
              <span className="text-xs text-text-muted">Marque se o agregado deve possuir e trazer o equipamento (semirreboque, prancha etc.)</span>
            </label>
          </div>

          {form.contrata_equipamento && (
            <Select
              label="Tipo de equipamento exigido"
              value={form.tipo_equipamento}
              onChange={e => handleChange('tipo_equipamento', e.target.value)}
              error={errors.tipo_equipamento}
            >
              <option value="">Selecione o tipo de equipamento</option>
              {TIPOS_EQUIPAMENTO.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </Select>
          )}
        </div>

        {/* Precificação */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Remuneração</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Valor por km (R$/km)"
              type="number"
              min="0.01"
              step="0.10"
              placeholder="Ex: 4.80"
              value={form.valor_km}
              onChange={e => handleChange('valor_km', e.target.value)}
              error={errors.valor_km}
              hint="Remuneração bruta paga ao agregado por km rodado"
            />
            <Select
              label="Frequência da rota"
              value={form.frequencia_tipo}
              onChange={e => handleChange('frequencia_tipo', e.target.value)}
              error={errors.frequencia_tipo}
            >
              <option value="">Selecione a frequência</option>
              {FREQ_OPTIONS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </Select>
          </div>

          {/* Preview da estimativa mensal */}
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

        {/* Contrato */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Duração do Contrato</h2>
          </div>
          <Input
            label="Período (meses)"
            type="number"
            min="1"
            step="1"
            placeholder="Ex: 12"
            value={form.periodo_meses}
            onChange={e => handleChange('periodo_meses', e.target.value)}
            error={errors.periodo_meses}
          />
        </div>

        {/* Descrição */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Descrição e Observações</h2>
          </div>
          <Textarea
            label="Descrição / peculiaridades (opcional)"
            placeholder="Descreva detalhes importantes: tipo de carga, diárias, adiantamentos, requisitos específicos, etc."
            rows={5}
            value={form.descricao}
            onChange={e => handleChange('descricao', e.target.value)}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pb-4">
          <Link href="/transportadora/vagas" className="flex-1">
            <Button variant="ghost" fullWidth type="button">Cancelar</Button>
          </Link>
          <Button type="submit" loading={loading} fullWidth className="flex-1">
            {loading ? 'Publicando...' : 'Publicar vaga'}
          </Button>
        </div>
      </form>
    </div>
  )
}
