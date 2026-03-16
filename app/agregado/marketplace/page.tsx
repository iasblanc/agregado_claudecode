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
import { MapPin, ChevronRight, Store, AlertCircle, X, CheckCircle2, Truck, Star, UserCircle, AlertTriangle } from 'lucide-react'

interface VagaWithTransportadora extends Vaga {
  transportadoras: { razao_social: string | null; logo_url: string | null } | null
}

interface AgregadoProfile {
  nome: string
  rntrc: string
  tipo_agregado: string
  rotas_atuacao: string[]
  nota?: number
  totalAvaliacoes?: number
  completionPct?: number
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
  const [userId, setUserId] = useState<string>('')
  const [myProfile, setMyProfile] = useState<AgregadoProfile | null>(null)

  // Candidatura modal
  const [candidaturaVaga, setCandidaturaVaga] = useState<VagaWithTransportadora | null>(null)
  const [candidatando, setCandidatando] = useState(false)
  const [candidatadoIds, setCandidatadoIds] = useState<Set<string>>(new Set())

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
      setUserId(user.id)
      const [{ data: vs }, { data: cfg }, { data: veics }, { data: agr }, { data: prof }, { data: avals }, { data: candExist }] = await Promise.all([
        supabase.from('vagas').select('*, transportadoras(razao_social, logo_url)').eq('status', 'ativa').order('created_at', { ascending: false }),
        supabase.from('custo_km_config').select('*').eq('agregado_id', user.id).maybeSingle(),
        supabase.from('veiculos').select('*').eq('agregado_id', user.id),
        supabase.from('agregados').select('nome, rntrc, tipo_agregado, rotas_atuacao, cnh, cnh_validade, cidade').eq('id', user.id).single(),
        supabase.from('profiles').select('nome, telefone').eq('id', user.id).single(),
        supabase.from('avaliacoes').select('nota_geral').eq('avaliado_id', user.id),
        supabase.from('candidaturas').select('vaga_id').eq('agregado_id', user.id),
      ])
      setVagas((vs as VagaWithTransportadora[]) ?? [])
      setCustoConfig(cfg)
      setVeiculos(veics ?? [])

      // Build profile summary for modal
      const a = agr as Record<string, unknown> | null
      const p = prof as Record<string, unknown> | null
      const nome = (p?.nome as string) || (a?.nome as string) || ''
      const rntrc = (a?.rntrc as string) || ''
      const cnh = (a?.cnh as string) || ''
      const cnhVal = (a?.cnh_validade as string) || ''
      const cidade = (a?.cidade as string) || ''
      const rotas = (a?.rotas_atuacao as string[]) || []
      const tipo = (a?.tipo_agregado as string) || 'TAC'

      // Compute completion (same logic as perfil page)
      let done = 0
      if (nome.trim().length > 3) done++
      if ((p?.telefone as string || '').trim().length > 8) done++
      if ((a?.cpf as string || '').trim().length >= 11) done++
      if (cnh.trim().length >= 8) done++
      if (cnhVal) done++
      if (rntrc.trim().length >= 7) done++
      if (rotas.length > 0) done++
      if (cidade.trim().length > 1) done++
      const completionPct = Math.round((done / 8) * 100)

      const nota = avals && avals.length > 0
        ? (avals as Record<string,number>[]).reduce((s, av) => s + (av.nota_geral ?? 0), 0) / avals.length
        : 0

      setMyProfile({ nome, rntrc, tipo_agregado: tipo, rotas_atuacao: rotas, nota, totalAvaliacoes: avals?.length ?? 0, completionPct })

      // Mark already-applied vagas
      if (candExist) {
        setCandidatadoIds(new Set((candExist as {vaga_id: string}[]).map(c => c.vaga_id)))
      }

      setLoading(false)
    })
  }, [])

  async function handleCandidatar() {
    if (!candidaturaVaga || !userId) return
    setCandidatando(true)
    const supabase = createClient()
    const { error } = await supabase.from('candidaturas').insert({
      vaga_id: candidaturaVaga.id,
      agregado_id: userId,
      status: 'pendente',
    })
    setCandidatando(false)
    if (!error) {
      setCandidatadoIds(prev => new Set([...prev, candidaturaVaga.id]))
      setCandidaturaVaga(null)
    }
  }

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

                <div className="flex gap-2">
                  <Link href={`/agregado/marketplace/${vaga.id}`} className="flex-1">
                    <button className="w-full flex items-center justify-center gap-1.5 border border-border text-text-secondary py-3 rounded-pill text-[11px] font-medium uppercase tracking-[.1em] font-sans hover:bg-surface transition-colors">
                      Ver detalhes
                    </button>
                  </Link>
                  {candidatadoIds.has(vaga.id) ? (
                    <button disabled className="flex-1 flex items-center justify-center gap-1.5 bg-success/10 text-success py-3 rounded-pill text-[11px] font-medium uppercase tracking-[.1em] font-sans cursor-not-allowed">
                      <CheckCircle2 size={13} /> Candidatado
                    </button>
                  ) : (
                    <button
                      onClick={() => setCandidaturaVaga(vaga)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-accent text-bg py-3 rounded-pill text-[11px] font-medium uppercase tracking-[.1em] font-sans hover:opacity-90 transition-opacity"
                    >
                      Candidatar-me <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal: Candidatar-me ─────────────────────────────── */}
      {candidaturaVaga && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
          onClick={() => setCandidaturaVaga(null)}
        >
          <div
            className="bg-bg w-full max-w-md rounded-2xl p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-semibold text-text-primary">Candidatar-me</h2>
              <button onClick={() => setCandidaturaVaga(null)} className="p-1.5 rounded-lg hover:bg-surface text-text-muted">
                <X size={18} />
              </button>
            </div>

            {/* Vaga resumo */}
            <div className="bg-surface border border-border rounded-xl p-3 mb-4">
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans mb-0.5">
                {candidaturaVaga.transportadoras?.razao_social ?? 'Transportadora'}
              </p>
              <p className="font-serif text-base font-semibold text-text-primary">
                {[candidaturaVaga.rota_origem, candidaturaVaga.uf_origem].filter(Boolean).join('/')}
                {' → '}
                {[candidaturaVaga.rota_destino, candidaturaVaga.uf_destino].filter(Boolean).join('/')}
              </p>
              {candidaturaVaga.valor_km && (
                <p className="text-sm text-success font-medium mt-0.5">
                  {formatCurrency(candidaturaVaga.valor_km)}/km
                </p>
              )}
            </div>

            {/* Perfil resumo */}
            {myProfile && (
              <div className="bg-surface border border-border rounded-xl p-3 mb-3">
                <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans mb-2">Seu perfil</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2D2B26] flex items-center justify-center font-serif text-sm font-bold text-[#F5F2EC] flex-shrink-0">
                    {myProfile.nome.split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'A'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-text-primary text-sm">{myProfile.nome || 'Perfil incompleto'}</p>
                    <p className="text-[11px] text-text-muted">{myProfile.tipo_agregado} · RNTRC: {myProfile.rntrc || '—'}</p>
                  </div>
                </div>

                {/* Completude */}
                <div className="mt-2.5">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-text-muted font-sans">Completude do perfil</span>
                    <span className={`text-[10px] font-semibold ${myProfile.completionPct === 100 ? 'text-success' : 'text-[#C26B3A]'}`}>
                      {myProfile.completionPct}%
                    </span>
                  </div>
                  <div className="w-full h-1 bg-[#E0DAD0] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${myProfile.completionPct === 100 ? 'bg-[#3A6B4A]' : 'bg-[#C26B3A]'}`}
                      style={{ width: `${myProfile.completionPct}%` }}
                    />
                  </div>
                </div>

                {/* Rating */}
                {myProfile.totalAvaliacoes! > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} size={12} className={n <= Math.round(myProfile.nota!) ? 'text-[#C8A84B] fill-[#C8A84B]' : 'text-border'} />
                      ))}
                    </div>
                    <span className="text-[11px] text-text-muted">{myProfile.nota!.toFixed(1)} ({myProfile.totalAvaliacoes} aval.)</span>
                  </div>
                )}

                {/* Veículo */}
                <div className={`flex items-center gap-1.5 mt-2 text-[11px] ${veiculos.length > 0 ? 'text-success' : 'text-[#C26B3A]'}`}>
                  <Truck size={12} />
                  {veiculos.length > 0 ? `${veiculos.length} veículo(s) cadastrado(s)` : 'Nenhum veículo cadastrado'}
                </div>
              </div>
            )}

            {/* Alertas */}
            {myProfile && myProfile.completionPct! < 100 && (
              <div className="flex items-start gap-2 bg-warning-light border border-warning/20 rounded-xl p-3 mb-3 text-xs text-text-secondary">
                <AlertTriangle size={14} className="text-warning flex-shrink-0 mt-0.5" />
                <span>Seu perfil está incompleto. Completar aumenta suas chances de ser selecionado.</span>
              </div>
            )}
            {veiculos.length === 0 && (
              <div className="flex items-start gap-2 bg-warning-light border border-warning/20 rounded-xl p-3 mb-3 text-xs text-text-secondary">
                <AlertTriangle size={14} className="text-warning flex-shrink-0 mt-0.5" />
                <span>Cadastre um veículo para aumentar sua compatibilidade com as vagas.</span>
              </div>
            )}

            {/* Ações */}
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setCandidaturaVaga(null)}
                className="flex-1 py-3 border border-border rounded-xl text-sm font-medium text-text-secondary hover:bg-surface transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCandidatar}
                disabled={candidatando}
                className="flex-1 py-3 bg-[#2D2B26] text-[#F5F2EC] rounded-xl text-sm font-medium hover:bg-[#1a1917] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {candidatando ? 'Enviando...' : <>Confirmar candidatura <ChevronRight size={14} /></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
