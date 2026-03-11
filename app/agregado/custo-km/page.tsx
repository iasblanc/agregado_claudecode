'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { formatCurrency, formatNumber, type Veiculo, type CustoKmConfig } from '@/lib/types'
import { Calculator, Save, ChevronRight } from 'lucide-react'

export default function CustoKmPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [selectedVeiculoId, setSelectedVeiculoId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Custos Fixos
  const [parcela, setParcela] = useState(0)
  const [seguro, setSeguro] = useState(0)
  const [licenciamento, setLicenciamento] = useState(0)
  const [rastreador, setRastreador] = useState(0)
  const [outrosFixos, setOutrosFixos] = useState(0)

  // Custos Variáveis
  const [precoDiesel, setPrecoDiesel] = useState(0)
  const [consumoKmLitro, setConsumoKmLitro] = useState(0)
  const [manutencao, setManutencao] = useState(0)
  const [pneus, setPneus] = useState(0)
  const [pedagio, setPedagio] = useState(0)
  const [salario, setSalario] = useState(0)
  const [kmMes, setKmMes] = useState(0)

  // Percurso calculator
  const [distancia, setDistancia] = useState(0)
  const [adm, setAdm] = useState(10)
  const [margem, setMargem] = useState(15)

  // Calculations
  const custoFixoMensal = parcela + seguro + licenciamento + rastreador + outrosFixos
  const custoFixoKm = kmMes > 0 ? custoFixoMensal / kmMes : 0
  const custoDieselKm = consumoKmLitro > 0 ? precoDiesel / consumoKmLitro : 0
  const custoVariavelKm = kmMes > 0
    ? custoDieselKm + (manutencao + pneus + pedagio + salario) / kmMes
    : custoDieselKm
  const custoKmTotal = custoFixoKm + custoVariavelKm
  const custoVariavelMensal = kmMes > 0
    ? custoDieselKm * kmMes + manutencao + pneus + pedagio + salario
    : 0
  const custoMesTotal = custoFixoMensal + custoVariavelMensal

  const custoViagem = distancia * custoKmTotal
  const valorAdm = custoViagem * (adm / 100)
  const valorMargem = (custoViagem + valorAdm) * (margem / 100)
  const fretePercurso = distancia > 0 && custoKmTotal > 0
    ? distancia * custoKmTotal * (1 + adm / 100) * (1 + margem / 100)
    : 0

  const loadConfig = useCallback(async (uid: string, vId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('custo_km_config')
      .select('*')
      .eq('agregado_id', uid)
      .eq('veiculo_id', vId)
      .maybeSingle()
    if (data) {
      setParcela(data.parcela_caminhao ?? 0)
      setSeguro(data.seguro ?? 0)
      setLicenciamento(data.licenciamento ?? 0)
      setRastreador(data.rastreador ?? 0)
      setOutrosFixos(data.outros_fixos ?? 0)
      setPrecoDiesel(data.preco_diesel ?? 0)
      setConsumoKmLitro(data.consumo_km_litro ?? 0)
      setManutencao(data.manutencao_mensal ?? 0)
      setPneus(data.pneus_mensal ?? 0)
      setPedagio(data.pedagio_mensal ?? 0)
      setSalario(data.salario_motorista ?? 0)
      setKmMes(data.km_mes ?? 0)
    } else {
      // Reset fields when no config exists for this vehicle
      setParcela(0)
      setSeguro(0)
      setLicenciamento(0)
      setRastreador(0)
      setOutrosFixos(0)
      setPrecoDiesel(0)
      setConsumoKmLitro(0)
      setManutencao(0)
      setPneus(0)
      setPedagio(0)
      setSalario(0)
      setKmMes(0)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data: vs } = await supabase
        .from('veiculos')
        .select('*')
        .eq('agregado_id', user.id)
        .order('created_at', { ascending: false })
      if (vs && vs.length > 0) {
        setVeiculos(vs)
        setSelectedVeiculoId(vs[0].id)
        loadConfig(user.id, vs[0].id)
      }
    })
  }, [loadConfig])

  async function handleSave() {
    if (!userId) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('custo_km_config').upsert(
      {
        agregado_id: userId,
        veiculo_id: selectedVeiculoId || null,
        preco_diesel: precoDiesel,
        consumo_km_litro: consumoKmLitro,
        km_mes: kmMes,
        parcela_caminhao: parcela,
        seguro,
        licenciamento,
        rastreador,
        outros_fixos: outrosFixos,
        salario_motorista: salario,
        manutencao_mensal: manutencao,
        pneus_mensal: pneus,
        pedagio_mensal: pedagio,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'agregado_id,veiculo_id' }
    )
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const NumField = ({
    label,
    value,
    onChange,
    hint,
    step = '0.01',
  }: {
    label: string
    value: number
    onChange: (v: number) => void
    hint?: string
    step?: string
  }) => (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-text-secondary font-sans">{label}</label>
      <input
        type="number"
        min="0"
        step={step}
        value={value || ''}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        placeholder="0,00"
        className="w-full px-3 py-2.5 rounded-md border border-border bg-[#FAF8F4] text-text-primary font-sans text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
      />
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-text-primary">Custo por KM</h1>
        <p className="text-sm text-text-secondary mt-1">Configure seus custos e descubra seu custo real por quilômetro.</p>
      </div>

      {/* Vehicle selector */}
      <div className="bg-surface border border-border rounded-xl p-4 mb-5">
        {veiculos.length > 0 ? (
          <Select
            label="Veículo"
            value={selectedVeiculoId}
            onChange={e => {
              const vId = e.target.value
              setSelectedVeiculoId(vId)
              if (userId) loadConfig(userId, vId)
            }}
          >
            {veiculos.map(v => (
              <option key={v.id} value={v.id}>
                {v.tipo} — {v.placa}{v.ano ? ` (${v.ano})` : ''}
              </option>
            ))}
          </Select>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-text-secondary font-sans">
              Nenhum veículo cadastrado.{' '}
              <a href="/cadastros" className="text-accent underline font-medium">Cadastre um veículo</a>{' '}
              para vincular ao cálculo.
            </p>
          </div>
        )}
      </div>

      {/* Custos Fixos */}
      <div className="bg-surface border border-border rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-info" />
          <h2 className="font-semibold text-text-primary font-sans">Custos Fixos Mensais</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Parcela do caminhão (R$)" value={parcela} onChange={setParcela} />
          <NumField label="Seguro (R$/mês)" value={seguro} onChange={setSeguro} />
          <NumField label="Licenciamento/IPVA (R$/mês)" value={licenciamento} onChange={setLicenciamento} />
          <NumField label="Rastreador (R$/mês)" value={rastreador} onChange={setRastreador} />
          <div className="col-span-2">
            <NumField label="Outros fixos (R$/mês)" value={outrosFixos} onChange={setOutrosFixos} />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
          <span className="text-sm text-text-secondary font-sans">Total fixo mensal</span>
          <span className="font-semibold text-info font-sans">{formatCurrency(custoFixoMensal)}</span>
        </div>
      </div>

      {/* Custos Variáveis */}
      <div className="bg-surface border border-border rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-warning" />
          <h2 className="font-semibold text-text-primary font-sans">Custos Variáveis</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumField
            label="Diesel S-10 (R$/litro)"
            value={precoDiesel}
            onChange={setPrecoDiesel}
            hint="Preço atual na bomba"
          />
          <NumField
            label="Consumo (km/litro)"
            value={consumoKmLitro}
            onChange={setConsumoKmLitro}
            hint="Média do veículo"
          />
          <div className="col-span-2">
            <NumField
              label="KM rodado/mês"
              value={kmMes}
              onChange={setKmMes}
              hint="Quilometragem mensal estimada"
              step="1"
            />
          </div>
          <NumField label="Manutenção (R$/mês)" value={manutencao} onChange={setManutencao} />
          <NumField label="Pneus (R$/mês)" value={pneus} onChange={setPneus} hint="Custo médio mensal" />
          <NumField label="Pedágio (R$/mês)" value={pedagio} onChange={setPedagio} />
          <div className="col-span-2">
            <NumField
              label="Salário motorista (R$/mês)"
              value={salario}
              onChange={setSalario}
              hint="Deixe 0 se você mesmo dirige"
            />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
          <span className="text-sm text-text-secondary font-sans">Total variável mensal</span>
          <span className="font-semibold text-warning font-sans">{formatCurrency(custoVariavelMensal)}</span>
        </div>
      </div>

      {/* Results card */}
      <div className="bg-accent rounded-xl p-5 mb-4 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={18} className="text-white/70" />
          <h2 className="font-semibold text-white font-sans">Resultado do Cálculo</h2>
        </div>

        {/* Main metric */}
        <div className="text-center mb-5">
          <p className="text-white/60 text-sm mb-1">Seu custo por KM</p>
          <p className="font-serif text-5xl font-bold text-white">
            {formatCurrency(custoKmTotal)}
          </p>
          <p className="text-white/60 text-sm mt-1">por quilômetro rodado</p>
        </div>

        {/* Breakdown grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-white/60 text-xs mb-0.5 font-sans">Custo fixo/km</p>
            <p className="font-semibold text-white font-sans">{formatCurrency(custoFixoKm)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-white/60 text-xs mb-0.5 font-sans">Custo variável/km</p>
            <p className="font-semibold text-white font-sans">{formatCurrency(custoVariavelKm)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-white/60 text-xs mb-0.5 font-sans">Diesel/km</p>
            <p className="font-semibold text-white font-sans">{formatCurrency(custoDieselKm)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-white/60 text-xs mb-0.5 font-sans">Custo total/mês</p>
            <p className="font-semibold text-white font-sans">{formatCurrency(custoMesTotal)}</p>
          </div>
        </div>

        {/* Percurso calculator */}
        <div className="border-t border-white/20 pt-5">
          <h3 className="font-semibold text-white font-sans text-sm mb-3 flex items-center gap-1.5">
            <ChevronRight size={14} />
            Calcular frete para um percurso
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <p className="text-white/60 text-xs mb-1 font-sans">Distância (km)</p>
              <input
                type="number"
                min="0"
                step="1"
                value={distancia || ''}
                onChange={e => setDistancia(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-2 py-1.5 rounded-md bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 font-sans"
              />
            </div>
            <div>
              <p className="text-white/60 text-xs mb-1 font-sans">ADM %</p>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={adm}
                onChange={e => setAdm(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1.5 rounded-md bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/40 font-sans"
              />
            </div>
            <div>
              <p className="text-white/60 text-xs mb-1 font-sans">Margem %</p>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={margem}
                onChange={e => setMargem(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1.5 rounded-md bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/40 font-sans"
              />
            </div>
          </div>

          {distancia > 0 && (
            <div className="bg-white/10 rounded-lg p-4">
              <div className="space-y-2 text-sm mb-3">
                <div className="flex justify-between text-white/70 font-sans">
                  <span>Custo da viagem ({formatNumber(distancia, 0)} km)</span>
                  <span>{formatCurrency(custoViagem)}</span>
                </div>
                <div className="flex justify-between text-white/70 font-sans">
                  <span>ADM ({adm}%)</span>
                  <span>{formatCurrency(valorAdm)}</span>
                </div>
                <div className="flex justify-between text-white/70 font-sans">
                  <span>Margem ({margem}%)</span>
                  <span>{formatCurrency(valorMargem)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center border-t border-white/20 pt-3">
                <span className="font-semibold text-white font-sans">Frete sugerido</span>
                <span className="font-bold text-white text-xl font-sans">{formatCurrency(fretePercurso)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save button */}
      <Button
        onClick={handleSave}
        loading={saving}
        fullWidth
        size="lg"
        variant={saved ? 'success' : 'primary'}
      >
        <Save size={18} />
        {saved ? 'Configuração salva!' : 'Salvar configuração'}
      </Button>
    </div>
  )
}
