'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { Select } from '@/components/ui/Input'
import {
  formatCurrency, TIPOS_VEICULO, TIPOS_EQUIPAMENTO,
  type Vaga, type CustoKmConfig,
  calcEstimativaMensal, calcKmMensal, calcKmViagem, calcDiasMes, labelFrequencia,
} from '@/lib/types'
import { MapPin, ChevronRight, Store, AlertCircle } from 'lucide-react'

interface VagaWithTransportadora extends Vaga {
  transportadoras: { razao_social: string | null; logo_url: string | null } | null
}

/** Fallback para configs legadas sem custo_km_calculado. */
function recalcLegado(config: CustoKmConfig): number | null {
  if (!config.km_mes || config.km_mes === 0) return null
  return (
    ((config.parcela_caminhao ?? 0) + (config.seguro ?? 0) + (config.licenciamento ?? 0) +
     (config.rastreador ?? 0) + (config.outros_fixos ?? 0)) / config.km_mes
    + (config.preco_diesel && config.consumo_km_litro ? config.preco_diesel / config.consumo_km_litro : 0)
    + ((config.manutencao_mensal ?? 0) + (config.pneus_mensal ?? 0) +
       (config.pedagio_mensal ?? 0) + (config.salario_motorista ?? 0)) / config.km_mes
  )
}

/**
 * Analisa viabilidade financeira da vaga para este agregado.
 *
 * Fórmula:
 *   ratio = estimativa_mensal / (custo_km_total × km_mensal)
 *
 * Onde:
 *   estimativa_mensal = valor_km × km_viagem × dias_mes
 *   km_mensal         = km_viagem × dias_mes
 *   km_viagem         = km_estimado × (ida_volta ? 2 : 1)
 */
function getAnalise(
  vaga: Vaga,
  config: CustoKmConfig | null,
): { label: string; variant: 'success' | 'warning' | 'danger' | 'muted' } {
  if (!config) return { label: 'Configure seu custo/km', variant: 'muted' }

  const custoKmTotal = config.custo_km_calculado ?? recalcLegado(config)
  if (!custoKmTotal) return { label: 'Configure seu custo/km', variant: 'muted' }

  const estimativa = calcEstimativaMensal(vaga)
  const kmMes = calcKmMensal(vaga)

  if (!estimativa || !kmMes) return { label: 'Sem dados suficientes', variant: 'muted' }

  const ratio = estimativa / (custoKmTotal * kmMes)
  if (ratio >= 1.15) return { label: 'Contrato saudável', variant: 'success' }
  if (ratio >= 1.0)  return { label: 'No limite',         variant: 'warning' }
  return                     { label: 'Abaixo do custo',  variant: 'danger'  }
}

export default function MarketplaceAgregadoPage() {
  const [vagas, setVagas] = useState<VagaWithTransportadora[]>([])
  const [custoConfig, setCustoConfig] = useState<CustoKmConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtroVeiculo, setFiltroVeiculo] = useState('')
  const [filtroEquip, setFiltroEquip] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const [{ data: vs }, { data: cfg }] = await Promise.all([
        supabase.from('vagas').select('*, transportadoras(razao_social, logo_url)').eq('status', 'ativa').order('created_at', { ascending: false }),
        supabase.from('custo_km_config').select('*').eq('agregado_id', user.id).maybeSingle(),
      ])
      setVagas((vs as VagaWithTransportadora[]) ?? [])
      setCustoConfig(cfg)
      setLoading(false)
    })
  }, [])

  const filtradas = vagas.filter(v => {
    if (filtroVeiculo && v.tipo_veiculo !== filtroVeiculo) return false
    if (filtroEquip && v.tipo_equipamento !== filtroEquip) return false
    return true
  })

  if (loading) return <div className="px-4 py-10 text-center text-text-muted">Carregando vagas...</div>

  return (
    <div className="px-4 py-5">
      <div className="mb-5">
        <h1 className="font-serif text-2xl font-bold text-text-primary">Marketplace</h1>
        <p className="text-text-secondary text-sm mt-1">Contratos de agregado disponíveis</p>
      </div>

      {!custoConfig && (
        <Link href="/agregado/custo-km">
          <div className="bg-warning-light border border-warning/20 rounded-xl p-3 mb-4 flex items-center gap-3">
            <AlertCircle size={18} className="text-warning flex-shrink-0" />
            <p className="text-sm text-text-secondary flex-1">Configure seu custo/km para ver a análise de cada contrato</p>
            <ChevronRight size={14} className="text-text-muted" />
          </div>
        </Link>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <Select value={filtroVeiculo} onChange={e => setFiltroVeiculo(e.target.value)} className="flex-1 py-2 text-sm">
          <option value="">Tipo de veículo</option>
          {TIPOS_VEICULO.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select value={filtroEquip} onChange={e => setFiltroEquip(e.target.value)} className="flex-1 py-2 text-sm">
          <option value="">Equipamento</option>
          {TIPOS_EQUIPAMENTO.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
      </div>

      {filtradas.length === 0 ? (
        <div className="text-center py-16">
          <Store size={40} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-primary font-semibold">Nenhuma vaga encontrada</p>
          <p className="text-text-muted text-sm mt-1">Tente ajustar os filtros</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(vaga => {
            const analise    = getAnalise(vaga, custoConfig)
            const estimativa = calcEstimativaMensal(vaga)
            const kmViagem   = calcKmViagem(vaga)
            const diasMes    = calcDiasMes(vaga)

            return (
              <div key={vaga.id} className="bg-surface border border-border rounded-xl p-4 shadow-card">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm text-text-primary font-medium mb-0.5">
                      <MapPin size={13} className="text-text-muted flex-shrink-0" />
                      <span className="truncate">{vaga.rota_origem} → {vaga.rota_destino}</span>
                    </div>
                    <p className="text-xs text-text-muted">
                      {vaga.transportadoras?.razao_social ?? 'Transportadora'}
                      {vaga.km_estimado ? ` · ${vaga.km_estimado} km` : ''}
                      {vaga.periodo_meses ? ` · ${vaga.periodo_meses} meses` : ''}
                    </p>
                  </div>
                  <Badge variant={analise.variant}>{analise.label}</Badge>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {vaga.tipo_veiculo && <Badge variant="light">{vaga.tipo_veiculo}</Badge>}
                  {vaga.tipo_equipamento && <Badge variant="muted">{vaga.tipo_equipamento}</Badge>}
                  {vaga.contrata_equipamento && <Badge variant="info">+ Equipamento</Badge>}
                </div>

                {vaga.descricao && (
                  <p className="text-xs text-text-secondary mb-3 line-clamp-2">{vaga.descricao}</p>
                )}

                {/* Estimativa mensal com breakdown */}
                <div className="bg-bg rounded-lg p-3 mb-3 border border-border">
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-xs text-text-muted mb-0.5">Estimativa mensal</p>
                      <p className="font-bold text-text-primary text-lg leading-none">
                        {estimativa ? formatCurrency(estimativa) : '—'}
                        <span className="text-xs font-normal text-text-muted">/mês</span>
                      </p>
                    </div>
                    {/* Mini breakdown quando há dados de precificação */}
                    {vaga.valor_km && kmViagem && diasMes && (
                      <p className="text-xs text-text-muted text-right leading-relaxed">
                        {formatCurrency(vaga.valor_km)}/km<br />
                        × {kmViagem.toLocaleString('pt-BR')} km × {diasMes} dias
                      </p>
                    )}
                  </div>
                  {/* Frequência */}
                  {vaga.frequencia_tipo && (
                    <p className="text-xs text-text-muted mt-1.5 border-t border-border pt-1.5">
                      Frequência: {labelFrequencia(vaga)}
                      {vaga.sentido === 'ida_volta' ? ' · Ida e volta' : ' · Somente ida'}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end">
                  <Link href={`/agregado/marketplace/${vaga.id}`}>
                    <button className="flex items-center gap-1.5 bg-accent text-bg px-4 py-2 rounded-pill text-sm font-medium hover:bg-[#1A1915] transition-colors">
                      Ver contrato <ChevronRight size={14} />
                    </button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
