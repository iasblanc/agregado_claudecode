'use client'
import { useState, FormEvent, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Input, Select, Textarea } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { TIPOS_VEICULO, TIPOS_EQUIPAMENTO, formatCurrency, calcKmViagem, calcDiasMes } from '@/lib/types'
import { ArrowLeft, MapPin, Truck, Package, DollarSign, Clock, FileText, AlertCircle, TrendingUp } from 'lucide-react'

interface FormData {
  titulo: string
  rota_origem: string
  rota_destino: string
  km_estimado: string
  tipo_veiculo: string
  contrata_equipamento: boolean
  tipo_equipamento: string
  // precificação por km
  valor_km: string
  frequencia_tipo: string
  dias_semana: string
  sentido: string
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
  dias_semana?: string
  periodo_meses?: string
}

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
    dias_semana: '5',
    sentido: 'ida',
    periodo_meses: '',
    descricao: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})

  // ── Estimativa mensal calculada em tempo real ────────────────────────────
  const estimativa = useMemo(() => {
    const km = Number(form.km_estimado)
    const vkm = Number(form.valor_km)
    if (!km || !vkm || !form.frequencia_tipo) return null

    const kmViagem = form.sentido === 'ida_volta' ? km * 2 : km
    let dias: number
    switch (form.frequencia_tipo) {
      case 'diaria':    dias = (Number(form.dias_semana) || 5) * 4; break
      case 'semanal':   dias = 4;  break
      case 'quinzenal': dias = 2;  break
      case 'mensal':    dias = 1;  break
      default: return null
    }
    return { valorViagem: kmViagem * vkm, diasMes: dias, total: kmViagem * vkm * dias, kmViagem, kmMes: kmViagem * dias }
  }, [form.km_estimado, form.valor_km, form.frequencia_tipo, form.dias_semana, form.sentido])

  function handleChange(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {}

    if (!form.titulo.trim()) newErrors.titulo = 'Título da vaga é obrigatório'
    if (!form.rota_origem.trim()) newErrors.rota_origem = 'Cidade de origem é obrigatória'
    if (!form.rota_destino.trim()) newErrors.rota_destino = 'Cidade de destino é obrigatória'
    if (!form.km_estimado || isNaN(Number(form.km_estimado)) || Number(form.km_estimado) <= 0) {
      newErrors.km_estimado = 'Informe a distância estimada em km'
    }
    if (!form.tipo_veiculo) newErrors.tipo_veiculo = 'Selecione o tipo de veículo'
    if (form.contrata_equipamento && !form.tipo_equipamento) {
      newErrors.tipo_equipamento = 'Selecione o tipo de equipamento'
    }
    if (!form.valor_km || isNaN(Number(form.valor_km)) || Number(form.valor_km) <= 0) {
      newErrors.valor_km = 'Informe o valor pago por km (R$/km)'
    }
    if (!form.frequencia_tipo) {
      newErrors.frequencia_tipo = 'Selecione a frequência das viagens'
    }
    if (form.frequencia_tipo === 'diaria') {
      const d = Number(form.dias_semana)
      if (!d || d < 1 || d > 7) newErrors.dias_semana = 'Informe os dias úteis por semana (1 a 7)'
    }
    if (!form.periodo_meses || isNaN(Number(form.periodo_meses)) || Number(form.periodo_meses) <= 0) {
      newErrors.periodo_meses = 'Informe o período em meses'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!validate()) return

    // Calcular valor_contrato (estimativa mensal) antes de salvar
    const kmV = form.sentido === 'ida_volta' ? Number(form.km_estimado) * 2 : Number(form.km_estimado)
    let diasMes: number
    switch (form.frequencia_tipo) {
      case 'semanal':   diasMes = 4;  break
      case 'quinzenal': diasMes = 2;  break
      case 'mensal':    diasMes = 1;  break
      default:          diasMes = (Number(form.dias_semana) || 5) * 4
    }
    const valorContrato = kmV * Number(form.valor_km) * diasMes

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
        dias_semana: form.frequencia_tipo === 'diaria' ? Number(form.dias_semana) : null,
        sentido: form.sentido,
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="KM estimado da rota"
              type="number"
              min="1"
              step="1"
              placeholder="Ex: 580"
              value={form.km_estimado}
              onChange={e => handleChange('km_estimado', e.target.value)}
              error={errors.km_estimado}
              hint="Distância em km (somente ida)"
            />
            <Select
              label="Sentido da viagem"
              value={form.sentido}
              onChange={e => handleChange('sentido', e.target.value)}
            >
              <option value="ida">Somente ida</option>
              <option value="ida_volta">Ida e volta</option>
            </Select>
          </div>
          {form.km_estimado && form.sentido === 'ida_volta' && (
            <p className="text-xs text-text-muted">
              Km por viagem (ida + volta): <span className="font-semibold">{Number(form.km_estimado) * 2} km</span>
            </p>
          )}
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
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Precificação</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Valor pago por km (R$/km)"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Ex: 4.80"
              value={form.valor_km}
              onChange={e => handleChange('valor_km', e.target.value)}
              error={errors.valor_km}
              hint="Valor bruto pago ao agregado por km rodado"
            />

            <Select
              label="Frequência das viagens"
              value={form.frequencia_tipo}
              onChange={e => handleChange('frequencia_tipo', e.target.value)}
              error={errors.frequencia_tipo}
            >
              <option value="">Selecione a frequência</option>
              <option value="diaria">Diária</option>
              <option value="semanal">Semanal (1×/semana)</option>
              <option value="quinzenal">Quinzenal (2×/mês)</option>
              <option value="mensal">Mensal (1×/mês)</option>
            </Select>
          </div>

          {form.frequencia_tipo === 'diaria' && (
            <Input
              label="Dias de trabalho por semana"
              type="number"
              min="1"
              max="7"
              step="1"
              placeholder="Ex: 5"
              value={form.dias_semana}
              onChange={e => handleChange('dias_semana', e.target.value)}
              error={errors.dias_semana}
              hint="Dias úteis por semana em que o agregado realiza viagens"
            />
          )}

          {/* Estimativa calculada em tempo real */}
          {estimativa ? (
            <div className="bg-success-light border border-success/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={15} className="text-success" />
                <p className="text-xs font-semibold text-success uppercase tracking-wide">Estimativa mensal calculada</p>
              </div>
              <p className="font-bold text-success text-2xl mb-2">{formatCurrency(estimativa.total)}<span className="text-sm font-normal">/mês</span></p>
              <div className="space-y-1 text-xs text-text-secondary">
                <div className="flex justify-between">
                  <span>Km por viagem</span>
                  <span className="font-medium">{estimativa.kmViagem.toLocaleString('pt-BR')} km</span>
                </div>
                <div className="flex justify-between">
                  <span>Valor por viagem</span>
                  <span className="font-medium">{formatCurrency(estimativa.valorViagem)}</span>
                </div>
                <div className="flex justify-between">
                  <span>× dias produtivos/mês</span>
                  <span className="font-medium">{estimativa.diasMes} dias</span>
                </div>
                <div className="border-t border-success/20 pt-1 flex justify-between font-semibold text-success">
                  <span>Km total/mês</span>
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
            <Button variant="ghost" fullWidth type="button">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            loading={loading}
            fullWidth
            className="flex-1"
            disabled={!estimativa}
          >
            {loading ? 'Publicando...' : 'Publicar vaga'}
          </Button>
        </div>
      </form>
    </div>
  )
}
