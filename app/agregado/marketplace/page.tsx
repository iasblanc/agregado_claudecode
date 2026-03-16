'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import {
  formatCurrency, TIPOS_VEICULO,
  type Vaga, type CustoKmConfig, type Veiculo,
  calcEstimativaMensal, calcKmMensal, calcDiasMes, labelFrequencia,
} from '@/lib/types'
import { MapPin, ChevronRight, Store, AlertCircle } from 'lucide-react'

interface VagaWithTransportadora extends Vaga {
  transportadoras: { razao_social: string | null; logo_url: string | null } | null
}

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
  if (!config) return { label: 'Configure custo/km', variant: 'muted' as const }
  const custoKmTotal = config.custo_km_calculado ?? recalcLegado(config)
  if (!custoKmTotal) return { label: 'Configure custo/km', variant: 'muted' as const }
  const estimativa = calcEstimativaMensal(vaga)
  const kmMes = calcKmMensal(vaga)
  if (!estimativa || !kmMes) return { label: 'Sem dados', variant: 'muted' as const }
  const ratio = estimativa / (custoKmTotal * kmMes)
  if (ratio >= 1.15) return { label: 'Contrato saudável', variant: 'success' as const }
  if (ratio >= 1.0) return { label: 'No limite', variant: 'warning' as const }
  return { label: 'Abaixo do custo', variant: 'danger' as const }
}

/** Score de compatibilidade: 0–99 */
function calcMatch(vaga: Vaga, veiculos: Veiculo[], custoKm: CustoKmConfig | null): number {
  let score = 0
  // 40% — tipo de veículo
  if (veiculos.some(v => v.tipo === vaga.tipo_veiculo)) score += 40
  else if (veiculos.length > 0) score += 10
  // 25% — tem veículo cadastrado (disponibilidade)
  if (veiculos.length > 0) score += 25
  // 20% — custo/km calculado
  if (custoKm?.custo_km_calculado) score += 20
  // 15% — base
  score += 15
  return Math.min(score, 99)
}

function matchColor(pct: number): string {
  if (pct >= 80) return 'text-success'
  if (pct >= 60) return 'text-warning'
  return 'text-text-muted'
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function MarketplaceAgregadoPage() {
  const [vagas, setVagas] = useState<VagaWithTransportadora[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [custoConfig, setCustoConfig] = useState<CustoKmConfig | null>(null)
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroVeiculo, setFiltroVeiculo] = useState('')
  const [filtroUF, setFiltroUF] = useState('')
  const [filtroCarga, setFiltroCarga] = useState('')
  const [filtroRemun, setFiltroRemun] = useState('')
  const [filtroSort, setFiltroSort] = useState('match')
  const [filtroTexto, setFiltroTexto] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const [{ data: vs }, { data: cfg }, { data: veics }] = await Promise.all([
        supabase.from('vagas').select('*, transportadoras(razao_social, logo_url)').eq('status', 'ativa').order('created_at', { ascending: false }),
        supabase.from('custo_km_config').select('*').eq('agregado_id', user.id).maybeSingle(),
        supabase.from('veiculos').select('*').eq('agregado_id', user.id),
      ])
      setVagas((vs as VagaWithTransportadora[]) ?? [])
      setCustoConfig(cfg)
      setVeiculos(veics ?? [])
      setLoading(false)
    })
  }, [])

  // Derived — UFs e tipos de carga disponíveis para filtro
  const ufsDisponiveis = useMemo(() => {
    const set = new Set<string>()
    vagas.forEach(v => { if (v.uf_origem) set.add(v.uf_origem); if (v.uf_destino) set.add(v.uf_destino) })
    return Array.from(set).sort()
  }, [vagas])

  const cargasDisponiveis = useMemo(() => {
    const set = new Set<string>()
    vagas.forEach(v => { if (v.tipo_carga) set.add(v.tipo_carga) })
    return Array.from(set).sort()
  }, [vagas])

  const filtradas = useMemo(() => {
    let result = vagas.filter(v => {
      if (filtroVeiculo && v.tipo_veiculo !== filtroVeiculo) return false
      if (filtroUF && v.uf_origem !== filtroUF && v.uf_destino !== filtroUF) return false
      if (filtroCarga && v.tipo_carga !== filtroCarga) return false
      if (filtroRemun) {
        const minRemun = parseFloat(filtroRemun)
        if (!v.valor_km || v.valor_km < minRemun) return false
      }
      if (filtroTexto) {
        const q = filtroTexto.toLowerCase()
        const match =
          v.transportadoras?.razao_social?.toLowerCase().includes(q) ||
          v.rota_origem?.toLowerCase().includes(q) ||
          v.rota_destino?.toLowerCase().includes(q) ||
          v.uf_origem?.toLowerCase().includes(q) ||
          v.uf_destino?.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })

    // Ordenação
    result = [...result].sort((a, b) => {
      if (filtroSort === 'match') {
        return calcMatch(b, veiculos, custoConfig) - calcMatch(a, veiculos, custoConfig)
      }
      if (filtroSort === 'remun') {
        return (b.valor_km ?? 0) - (a.valor_km ?? 0)
      }
      if (filtroSort === 'margem') {
        const estA = calcEstimativaMensal(a) ?? 0
        const estB = calcEstimativaMensal(b) ?? 0
        const kmA = calcKmMensal(a) ?? 1
        const kmB = calcKmMensal(b) ?? 1
        const custo = custoConfig?.custo_km_calculado ?? 0
        const margA = custo > 0 ? (estA - custo * kmA) / (estA || 1) : 0
        const margB = custo > 0 ? (estB - custo * kmB) / (estB || 1) : 0
        return margB - margA
      }
      if (filtroSort === 'km') {
        return (b.km_estimado ?? 0) - (a.km_estimado ?? 0)
      }
      // recente
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return result
  }, [vagas, veiculos, custoConfig, filtroVeiculo, filtroUF, filtroCarga, filtroRemun, filtroSort, filtroTexto])

  const hasActiveFilters = filtroVeiculo || filtroUF || filtroCarga || filtroRemun || filtroTexto

  function clearFilters() {
    setFiltroVeiculo('')
    setFiltroUF('')
    setFiltroCarga('')
    setFiltroRemun('')
    setFiltroTexto('')
  }

  if (loading) return <div className="px-4 py-10 text-center text-text-muted text-sm">Carregando vagas...</div>

  return (
    <div className="px-4 py-5">
      {/* Header */}
      <div className="mb-4">
        <p className="text-[9px] uppercase tracking-[.16em] text-text-muted font-sans mb-1">Marketplace</p>
        <h1 className="font-serif text-2xl font-medium text-text-primary">Vagas disponíveis</h1>
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
        {/* Veículo */}
        <select
          value={filtroVeiculo}
          onChange={e => setFiltroVeiculo(e.target.value)}
          className="flex-shrink-0 border border-border bg-bg font-sans text-xs text-text-secondary px-3 py-2 rounded-pill focus:outline-none cursor-pointer"
        >
          <option value="">🚛 Veículo</option>
          {TIPOS_VEICULO.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Estado */}
        <select
          value={filtroUF}
          onChange={e => setFiltroUF(e.target.value)}
          className="flex-shrink-0 border border-border bg-bg font-sans text-xs text-text-secondary px-3 py-2 rounded-pill focus:outline-none cursor-pointer"
        >
          <option value="">📍 Estado</option>
          {ufsDisponiveis.map(uf => <option key={uf} value={uf}>{uf}</option>)}
        </select>

        {/* Carga */}
        <select
          value={filtroCarga}
          onChange={e => setFiltroCarga(e.target.value)}
          className="flex-shrink-0 border border-border bg-bg font-sans text-xs text-text-secondary px-3 py-2 rounded-pill focus:outline-none cursor-pointer"
        >
          <option value="">📦 Carga</option>
          {cargasDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* R$/km */}
        <select
          value={filtroRemun}
          onChange={e => setFiltroRemun(e.target.value)}
          className="flex-shrink-0 border border-border bg-bg font-sans text-xs text-text-secondary px-3 py-2 rounded-pill focus:outline-none cursor-pointer"
        >
          <option value="">💰 R$/km</option>
          <option value="2.5">+ R$ 2,50/km</option>
          <option value="3.0">+ R$ 3,00/km</option>
          <option value="3.5">+ R$ 3,50/km</option>
        </select>

        {/* Ordenação */}
        <select
          value={filtroSort}
          onChange={e => setFiltroSort(e.target.value)}
          className="flex-shrink-0 border border-border bg-bg font-sans text-xs text-text-secondary px-3 py-2 rounded-pill focus:outline-none cursor-pointer"
        >
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
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs text-accent font-sans underline">
            Limpar filtros
          </button>
        )}
      </div>

      {/* Cards */}
      {filtradas.length === 0 ? (
        <div className="text-center py-14">
          <Store size={36} className="text-text-muted mx-auto mb-3" />
          <p className="text-sm font-medium text-text-primary">Nenhuma vaga encontrada</p>
          <p className="text-xs text-text-muted mt-1">Tente ajustar os filtros</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(vaga => {
            const analise = getAnalise(vaga, custoConfig)
            const estimativa = calcEstimativaMensal(vaga)
            const diasMes = calcDiasMes(vaga)
            const matchPct = calcMatch(vaga, veiculos, custoConfig)
            const custoKm = custoConfig?.custo_km_calculado ?? recalcLegado(custoConfig ?? {} as CustoKmConfig) ?? null
            const ganhoViagem = vaga.valor_km && vaga.km_estimado ? vaga.valor_km * vaga.km_estimado : null
            const custoViagem = custoKm && vaga.km_estimado ? custoKm * vaga.km_estimado : null
            const lucroViagem = ganhoViagem && custoViagem ? ganhoViagem - custoViagem : null
            const margemPct = ganhoViagem && lucroViagem ? (lucroViagem / ganhoViagem) * 100 : null

            return (
              <div key={vaga.id} className="bg-bg border border-border rounded-2xl p-4 shadow-card relative overflow-hidden">
                {/* Match % — canto superior direito */}
                <div className="absolute top-3.5 right-4 text-right">
                  <p className={`font-serif text-[22px] font-medium leading-none ${matchColor(matchPct)}`}>{matchPct}%</p>
                  <p className="text-[9px] uppercase tracking-[.08em] text-text-muted mt-0.5">match</p>
                </div>

                {/* Cabeçalho */}
                <p className="text-[10px] uppercase tracking-[.1em] text-text-muted font-sans mb-1">
                  {vaga.transportadoras?.razao_social ?? 'Transportadora'}
                </p>
                <h3 className="font-serif text-[20px] font-medium text-text-primary leading-tight pr-14 mb-2">
                  {[vaga.rota_origem, vaga.uf_origem].filter(Boolean).join('/')}
                  {' → '}
                  {[vaga.rota_destino, vaga.uf_destino].filter(Boolean).join('/')}
                </h3>

                {/* Badges meta */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {vaga.km_estimado && (
                    <Badge variant="muted"><MapPin size={10} className="mr-1" />{vaga.km_estimado} km</Badge>
                  )}
                  {vaga.tipo_veiculo && <Badge variant="light">{vaga.tipo_veiculo}</Badge>}
                  {vaga.tipo_carga && <Badge variant="muted">{vaga.tipo_carga}</Badge>}
                  {vaga.contrata_equipamento && <Badge variant="info">+ Equipamento</Badge>}
                </div>

                {/* Remuneração + simulação */}
                <div className="bg-surface rounded-xl px-3.5 py-2.5 mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-text-muted mb-0.5">Remuneração</p>
                    <p className="font-serif text-[24px] font-medium text-success leading-none">
                      {vaga.valor_km ? formatCurrency(vaga.valor_km) : '—'}
                    </p>
                    <p className="text-[10px] text-text-muted">/km</p>
                  </div>
                  {estimativa && (
                    <div className="text-right">
                      <p className="text-[10px] text-text-muted mb-0.5">Ganho/mês</p>
                      <p className="font-serif text-[18px] font-medium text-success leading-none">
                        {formatCurrency(estimativa)}
                      </p>
                      {diasMes && (
                        <p className="text-[9px] text-text-muted mt-0.5">{diasMes} viagens/mês</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Simulação financeira (apenas se tem custo/km) */}
                {ganhoViagem && custoViagem && lucroViagem !== null && (
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    <div className="bg-surface rounded-lg p-2 text-center">
                      <p className="text-[9px] text-text-muted">Ganho/viagem</p>
                      <p className="text-[11px] font-medium text-text-primary">{formatCurrency(ganhoViagem)}</p>
                    </div>
                    <div className="bg-surface rounded-lg p-2 text-center">
                      <p className="text-[9px] text-text-muted">Custo est.</p>
                      <p className="text-[11px] font-medium text-text-primary">{formatCurrency(custoViagem)}</p>
                    </div>
                    <div className={`rounded-lg p-2 text-center ${lucroViagem >= 0 ? 'bg-success-light' : 'bg-danger-light'}`}>
                      <p className="text-[9px] text-text-muted">Margem est.</p>
                      <p className={`text-[11px] font-medium ${lucroViagem >= 0 ? 'text-success' : 'text-danger'}`}>
                        {margemPct !== null ? `${margemPct.toFixed(0)}%` : '—'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Frequência + análise */}
                <div className="flex items-center justify-between mb-3">
                  {vaga.frequencia_tipo && (
                    <p className="text-xs text-text-muted">{labelFrequencia(vaga)}</p>
                  )}
                  <Badge variant={analise.variant}>{analise.label}</Badge>
                </div>

                <Link href={`/agregado/marketplace/${vaga.id}`}>
                  <button className="w-full flex items-center justify-center gap-1.5 bg-accent text-bg py-3 rounded-pill text-[11px] font-medium uppercase tracking-[.1em] font-sans">
                    Ver detalhes → <ChevronRight size={13} />
                  </button>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
