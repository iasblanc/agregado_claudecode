'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Input, Select, Textarea } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { TIPOS_VEICULO, TIPOS_EQUIPAMENTO } from '@/lib/types'
import { ArrowLeft, MapPin, Truck, Package, DollarSign, Clock, FileText, AlertCircle } from 'lucide-react'

interface FormData {
  titulo: string
  rota_origem: string
  rota_destino: string
  km_estimado: string
  tipo_veiculo: string
  contrata_equipamento: boolean
  tipo_equipamento: string
  valor_contrato: string
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
  valor_contrato?: string
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
    valor_contrato: '',
    periodo_meses: '',
    descricao: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})

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
    if (!form.valor_contrato || isNaN(Number(form.valor_contrato)) || Number(form.valor_contrato) <= 0) {
      newErrors.valor_contrato = 'Informe o valor do contrato'
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

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const insertData = {
        transportadora_id: user.id,
        titulo: form.titulo.trim(),
        rota_origem: form.rota_origem.trim(),
        rota_destino: form.rota_destino.trim(),
        km_estimado: Number(form.km_estimado),
        tipo_veiculo: form.tipo_veiculo,
        contrata_equipamento: form.contrata_equipamento,
        tipo_equipamento: form.contrata_equipamento ? form.tipo_equipamento : null,
        valor_contrato: Number(form.valor_contrato),
        periodo_meses: Number(form.periodo_meses),
        descricao: form.descricao.trim() || null,
        status: 'ativa' as const,
      }

      const { error } = await supabase.from('vagas').insert(insertData)

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

      {/* Error banner */}
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
            label="KM estimado (distância da rota)"
            type="number"
            min="1"
            step="1"
            placeholder="Ex: 430"
            value={form.km_estimado}
            onChange={e => handleChange('km_estimado', e.target.value)}
            error={errors.km_estimado}
            hint="Distância em quilômetros entre origem e destino"
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

          {/* Contrata equipamento */}
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

        {/* Contrato */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Contrato</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Valor do contrato (R$/mês)"
              type="number"
              min="1"
              step="0.01"
              placeholder="Ex: 12000"
              value={form.valor_contrato}
              onChange={e => handleChange('valor_contrato', e.target.value)}
              error={errors.valor_contrato}
              hint="Remuneração mensal bruta do agregado"
            />
            <div className="flex flex-col gap-1">
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
          </div>
        </div>

        {/* Descrição */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Descrição e Observações</h2>
          </div>
          <Textarea
            label="Descrição / peculiaridades (opcional)"
            placeholder="Descreva detalhes importantes: tipo de carga, frequência de viagens, diárias, adiantamentos, requisitos específicos, etc."
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
          >
            {loading ? 'Publicando...' : 'Publicar vaga'}
          </Button>
        </div>
      </form>
    </div>
  )
}
