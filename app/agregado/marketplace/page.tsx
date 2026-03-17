'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import {
  formatCurrency, TIPOS_VEICULO,
  type Vaga, type CustoKmConfig, type Veiculo,
  calcEstimativaMensal, calcKmMensal, labelFrequencia,
} from '@/lib/types'
import { MapPin, Store, AlertCircle, ChevronRight, CheckCircle2, Star } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function getAnalise(vaga: Vaga, config: CustoKmConfig | null) {
  if (!config) return { variant: 'muted' as const }
  const custoKmTotal = config.custo_km_calculado ?? recalcLegado(config)
  if (!custoKmTotal) return { variant: 'muted' as const }
  const estimativa = calcEstimativaMensal(vaga)
  const kmMes = calcKmMensal(vaga)
  if (!estimativa || !kmMes) return { variant: 'muted' as const }
  const ratio = estimativa / (custoKmTotal * kmMes)
  if (ratio >= 1.15) return { variant: 'success' as const }
  if (ratio >= 1.0)  return { variant: 'warning' as const }
  return { variant: 'danger' as const }
}

function calcMatch(vaga: Vaga, veiculos: Veiculo[], custoKm: CustoKmConfig | null): number {
  let score = 0
  if (veiculos.some(v => v.tipo === vaga.tipo_veiculo)) score += 40
  else if (veiculos.length > 0) score += 10
  if (veiculos.length > 0) score += 25
  if (custoKm?.custo_km_calculado) score += 20
  score += 15
  return Math.min(score, 99)
}

function matchColor(pct: number): string {
  if (pct >= 80) return 'text-success'
  if (pct >= 60) return 'text-warning'
  return 'text-text-muted'
}

function analiseColor(v: 'success' | 'warning' | 'danger' | 'muted') {
  return v === 'success' ? 'bg-success-light text-success' :
         v === 'warning' ? 'bg-warning-light text-warning' :
         v === 'danger'  ? 'bg-danger-light text-danger'  : 'hidden'
}

// ── Página ────────────────────────────────────────────────────────────────────

interface VagaWithTransportadora extends Vaga {
  transportadoras: { razao_social: string | null; logo_url: string | null } | null
}

export default function VagasPage() {
  const [vagas, setVagas] = useState<VagaWithTransportadora[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [custoConfig, setCustoConfig] = useState<CustoKmConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [candidatadoIds, setCandidatadoIds] = useState<Set<string>>(new Set())
  const [avgRating, setAvgRating] = useState<number>(0)

  // Filtros
  const [filtroVeiculo, setFiltroVeiculo] = useState('')
  const [filtroUF, setFiltroUF]           = useState('')
  const [filtroCarga, setFiltroCarga]     = useState('')
  const [filtroRemun, setFiltroRemun]     = useState('')
  const [filtroSort, setFiltroSort]       = useState('match')
  const [filtroTexto, setFiltroTexto]     = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const [{ data: vs }, { data: cfg }, { data: veics }, { data: avals }, { data: candExist }] = await Promise.all([
        supabase.from('vagas').select('*, transportadoras(razao_social, logo_url)').eq('status', 'ativa').order('created_at', { ascending: false }),
        supabase.from('custo_km_config').select('*').eq('agregado_id', user.id).maybeSingle(),
        supabase.from('veiculos').select('*').eq('agregado_id', user.id),
        supabase.from('avaliacoes').select('nota_geral').eq('avaliado_id', user.id),
        supabase.from('candidaturas').select('vaga_id').eq('agregado_id', user.id),
      ])
      setVagas((vs as VagaWithTransportadora[]) ?? [])
      setCustoConfig(cfg)
      setVeiculos(veics ?? [])
      if (avals && avals.length > 0) {
        setAvgRating((avals as { nota_geral: number }[]).reduce((s, a) => s + (a.nota_geral ?? 0), 0) / avals.length)
      }
      if (candExist) setCandidatadoIds(new Set((candExist as { vaga_id: string }[]).map(c => c.vaga_id)))
      setLoading(false)
    })
  }, [])

  const ufsDisponiveis = useMemo(() => {
    const s = new Set<string>()
    vagas.forEach(v => { if (v.uf_origem) s.add(v.uf_origem); if (v.uf_destino) s.add(v.uf_destino) })
    return Array.from(s).sort()
  }, [vagas])

  const cargasDisponiveis = useMemo(() => {
    const s = new Set<string>()
    vagas.forEach(v => { if (v.tipo_carga) s.add(v.tipo_carga) })
    return Array.from(s).sort()
  }, [vagas])

  const filtradas = useMemo(() => {
    let result = vagas.filter(v => {
      if (filtroVeiculo && v.tipo_veiculo !== filtroVeiculo) return false
      if (filtroUF && v.uf_origem !== filtroUF && v.uf_destino !== filtroUF) return false
      if (filtroCarga && v.tipo_carga !== filtroCarga) return false
      if (filtroRemun) { const min = parseFloat(filtroRemun); if (!v.valor_km || v.valor_km < min) return false }
      if (filtroTexto) {
        const q = filtroTexto.toLowerCase()
        const match = v.transportadoras?.razao_social?.toLowerCase().includes(q) ||
          v.rota_origem?.toLowerCase().includes(q) || v.rota_destino?.toLowerCase().includes(q) ||
          v.uf_origem?.toLowerCase().includes(q) || v.uf_destino?.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })

    result = [...result].sort((a, b) => {
      if (filtroSort === 'match')  return calcMatch(b, veiculos, custoConfig) - calcMatch(a, veiculos, custoConfig)
      if (filtroSort === 'remun')  return (b.valor_km ?? 0) - (a.valor_km ?? 0)
      if (filtroSort === 'km')     return (b.km_estimado ?? 0) - (a.km_estimado ?? 0)
      if (filtroSort === 'margem') {
        const est = (x: Vaga) => calcEstimativaMensal(x) ?? 0
        const km  = (x: Vaga) => calcKmMensal(x) ?? 1
        const custo = custoConfig?.custo_km_calculado ?? 0
        const mA = custo > 0 ? (est(a) - custo * km(a)) / (est(a) || 1) : 0
        const mB = custo > 0 ? (est(b) - custo * km(b)) / (est(b) || 1) : 0
        return mB - mA
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return result
  }, [vagas, veiculos, custoConfig, filtroVeiculo, filtroUF, filtroCarga, filtroRemun, filtroSort, filtroTexto])

  const hasFilters = filtroVeiculo || filtroUF || filtroCarga || filtroRemun || filtroTexto
  function clearFilters() { setFiltroVeiculo(''); setFiltroUF(''); setFiltroCarga(''); setFiltroRemun(''); setFiltroTexto('') }

  if (loading) return <div className="px-4 py-10 text-center text-text-muted text-sm">Carregando vagas...</div>

  return (
    <div className="px-4 py-5">
      {/* Header */}
      <div className="mb-4">
        <p className="text-[9px] uppercase tracking-[.16em] text-text-muted font-sans mb-1">Marketplace</p>
        <h1 className="font-serif text-2xl font-medium text-text-primary">Vagas disponíveis</h1>
        {avgRating > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Star size={12} className="text-warning fill-warning" />
            <span className="text-xs text-text-muted">Sua nota: {avgRating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {!custoConfig && (
        <Link href="/agregado/custo-km">
          <div className="bg-warning-light border border-warning/20 rounded-xl p-3 mb-4 flex items-center gap-3">
            <AlertCircle size={16} className="text-warning flex-shrink-0" />
            <p className="text-xs text-text-secondary flex-1">Configure seu custo/km para ver análise de viabilidade e score de compatibilidade</p>
            <ChevronRight size={13} className="text-text-muted" />
          </div>
        </Link>
      )}

      {/* Busca */}
      <div className="relative mb-2.5">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none z-10">🔍</span>
        <input
          type="text"
          value={filtroTexto}
          onChange={e => setFiltroTexto(e.target.value)}
          placeholder="Buscar por transportadora, cidade ou estado..."
          className="w-full pl-9 pr-3 py-2.5 border border-border rounded-pill bg-bg font-sans text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {/* Filtros chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2.5 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        <select value={filtroVeiculo} onChange={e => setFiltroVeiculo(e.target.value)}
          className="flex-shrink-0 border border-border bg-bg font-sans text-xs text-text-secondary px-3 py-2 rounded-pill focus:outline-none cursor-pointer">
          <option value="">🚛 Veículo</option>
          {TIPOS_VEICULO.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filtroUF} onChange={e => setFiltroUF(e.target.value)}
          className="flex-shrink-0 border border-border bg-bg font-sans text-xs text-text-secondary px-3 py-2 rounded-pill focus:outline-none cursor-pointer">
          <option value="">📍 Estado</option>
          {ufsDisponiveis.map(uf => <option key={uf} value={uf}>{uf}</option>)}
        </select>
        <select value={filtroCarga} onChange={e => setFiltroCarga(e.target.value)}
          className="flex-shrink-0 border border-border bg-bg font-sans text-xs text-text-secondary px-3 py-2 rounded-pill focus:outline-none cursor-pointer">
          <option value="">📦 Carga</option>
          {cargasDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroRemun} onChange={e => setFiltroRemun(e.target.value)}
          className="flex-shrink-0 border border-border bg-bg font-sans text-xs text-text-secondary px-3 py-2 rounded-pill focus:outline-none cursor-pointer">
          <option value="">💰 R$/km</option>
          <option value="2.5">+ R$ 2,50/km</option>
          <option value="3.0">+ R$ 3,00/km</option>
          <option value="3.5">+ R$ 3,50/km</option>
        </select>
        <select value={filtroSort} onChange={e => setFiltroSort(e.target.value)}
          className="flex-shrink-0 border border-border bg-bg font-sans text-xs text-text-secondary px-3 py-2 rounded-pill focus:outline-none cursor-pointer">
          <option value="match">Mais compatíveis</option>
          <option value="remun">Maior remuneração</option>
          <option value="margem">Maior margem</option>
          <option value="km">Mais km</option>
          <option value="recente">Mais recente</option>
        </select>
      </div>

      {/* Count + limpar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-text-secondary font-sans">
          {filtradas.length} {filtradas.length === 1 ? 'vaga encontrada' : 'vagas encontradas'}
        </p>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-accent font-sans underline">Limpar filtros</button>
        )}
      </div>

      {/* Cards compactos */}
      {filtradas.length === 0 ? (
        <div className="text-center py-14">
          <Store size={36} className="text-text-muted mx-auto mb-3" />
          <p className="text-sm font-medium text-text-primary">Nenhuma vaga encontrada</p>
          <p className="text-xs text-text-muted mt-1">Tente ajustar os filtros</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtradas.map(vaga => {
            const matchPct   = calcMatch(vaga, veiculos, custoConfig)
            const estimativa = calcEstimativaMensal(vaga)
            const analise    = getAnalise(vaga, custoConfig)
            const jaCandidato = candidatadoIds.has(vaga.id)

            return (
              <Link key={vaga.id} href={`/agregado/marketplace/${vaga.id}`}>
                <div className="bg-bg border border-border rounded-xl px-4 py-3 shadow-card hover:shadow-card-hover hover:border-accent/20 transition-all cursor-pointer relative">
                  {/* Match badge */}
                  <div className="absolute top-3 right-3 text-right">
                    <p className={`font-serif text-[18px] font-semibold leading-none ${matchColor(matchPct)}`}>{matchPct}%</p>
                    <p className="text-[8px] uppercase tracking-[.1em] text-text-muted">match</p>
                  </div>

                  {/* Transportadora */}
                  <p className="text-[9px] uppercase tracking-[.1em] text-text-muted font-sans mb-0.5 pr-14">
                    {vaga.transportadoras?.razao_social ?? 'Transportadora'}
                  </p>

                  {/* Rota */}
                  <h3 className="font-serif text-[16px] font-medium text-text-primary leading-tight pr-14 mb-2">
                    {[vaga.rota_origem, vaga.uf_origem].filter(Boolean).join('/')}
                    {' → '}
                    {[vaga.rota_destino, vaga.uf_destino].filter(Boolean).join('/')}
                  </h3>

                  {/* Badges de meta */}
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {vaga.tipo_veiculo && <Badge variant="light" className="text-[10px]">{vaga.tipo_veiculo}</Badge>}
                    {vaga.km_estimado  && (
                      <Badge variant="muted" className="text-[10px]">
                        <MapPin size={9} className="mr-0.5" />{vaga.km_estimado} km
                      </Badge>
                    )}
                    {vaga.frequencia_tipo && <Badge variant="muted" className="text-[10px]">{labelFrequencia(vaga)}</Badge>}
                    {vaga.tipo_carga && <Badge variant="muted" className="text-[10px]">{vaga.tipo_carga}</Badge>}
                    {vaga.contrata_equipamento && <Badge variant="info" className="text-[10px]">+ Equipamento</Badge>}
                  </div>

                  {/* Remuneração inline */}
                  <div className="flex items-end justify-between gap-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-serif text-[20px] font-semibold text-success leading-none">
                        {vaga.valor_km ? formatCurrency(vaga.valor_km) : '—'}
                      </span>
                      <span className="text-[10px] text-text-muted">/km</span>
                      {estimativa && (
                        <>
                          <span className="text-text-muted text-[10px]">·</span>
                          <span className="text-[13px] font-medium text-text-primary">{formatCurrency(estimativa)}</span>
                          <span className="text-[10px] text-text-muted">/mês</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Análise financeira dot */}
                      {analise.variant !== 'muted' && (
                        <span className={`w-2 h-2 rounded-full ${
                          analise.variant === 'success' ? 'bg-success' :
                          analise.variant === 'warning' ? 'bg-warning' : 'bg-danger'
                        }`} title="Análise financeira" />
                      )}
                      {jaCandidato ? (
                        <span className="flex items-center gap-1 text-[10px] text-success font-medium">
                          <CheckCircle2 size={11} /> Candidatado
                        </span>
                      ) : (
                        <span className="text-[10px] text-accent font-medium flex items-center gap-0.5">
                          Ver vaga <ChevronRight size={11} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
