'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Briefcase, Users, FileText, Star, Plus, ChevronRight, MapPin, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { formatCurrency } from '@/lib/types'

interface AlertaCard {
  tipo: 'urgente' | 'atencao' | 'info' | 'ok'
  icon: string
  title: string
  sub: string
  href?: string
}

interface VagaPerf {
  id: string
  rota_origem: string | null
  rota_destino: string | null
  titulo: string | null
  status: string
  candidaturas_count: number
}

const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const DAYS = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']

export default function TransportadoraDashboard() {
  const router = useRouter()

  const [greeting, setGreeting] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [nomeExibido, setNomeExibido] = useState('Transportadora')
  const [loading, setLoading] = useState(true)

  const [kpiVagas, setKpiVagas] = useState(0)
  const [kpiCandNovos, setKpiCandNovos] = useState(0)
  const [kpiContratos, setKpiContratos] = useState(0)
  const [kpiAvalPend, setKpiAvalPend] = useState(0)

  const [alertas, setAlertas] = useState<AlertaCard[]>([])
  const [vagasPerf, setVagasPerf] = useState<VagaPerf[]>([])
  const [recentCands, setRecentCands] = useState<{
    id: string; nome: string; vaga: string; status: string; created_at: string
  }[]>([])

  const fetchData = useCallback(async () => {
    const now = new Date()
    const h = now.getHours()
    setGreeting(h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite')
    setDateStr(`${DAYS[now.getDay()]}, ${now.getDate()} de ${MONTHS[now.getMonth()]} de ${now.getFullYear()}`)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const [{ data: trans }, { data: prof }] = await Promise.all([
      supabase.from('transportadoras').select('razao_social').eq('id', user.id).single(),
      supabase.from('profiles').select('nome').eq('id', user.id).single(),
    ])
    setNomeExibido(trans?.razao_social || prof?.nome || 'Transportadora')

    // Vagas IDs
    const { data: vagasData } = await supabase
      .from('vagas')
      .select('id, rota_origem, rota_destino, titulo, status')
      .eq('transportadora_id', user.id)

    const vagaIds = vagasData?.map(v => v.id) ?? []

    // KPIs in parallel
    const [
      { count: vagasAtivas },
      { data: cands },
      { count: contratosAtivos },
      { count: contratoEnc },
    ] = await Promise.all([
      supabase.from('vagas').select('*', { count: 'exact', head: true }).eq('transportadora_id', user.id).eq('status', 'ativa'),
      vagaIds.length
        ? supabase.from('candidaturas').select('id, vaga_id, status, created_at, profiles!agregado_id(nome), vagas(rota_origem, rota_destino)').in('vaga_id', vagaIds).order('created_at', { ascending: false }).limit(50)
        : Promise.resolve({ data: [] }),
      supabase.from('contratos_motorista').select('*', { count: 'exact', head: true }).eq('transportadora_id', user.id).eq('status', 'ativo'),
      supabase.from('contratos_motorista').select('*', { count: 'exact', head: true }).eq('transportadora_id', user.id).eq('status', 'encerrado'),
    ])

    setKpiVagas(vagasAtivas ?? 0)
    setKpiContratos(contratosAtivos ?? 0)
    setKpiAvalPend(contratoEnc ?? 0)

    const allCands = (cands as unknown as { id: string; vaga_id: string; status: string; created_at: string; 'profiles!agregado_id': { nome: string | null } | null; vagas: { rota_origem: string | null; rota_destino: string | null } | null }[]) ?? []
    const novos = allCands.filter(c => c.status === 'pendente').length
    setKpiCandNovos(novos)

    // Recent candidates
    const recent = allCands.slice(0, 4).map(c => ({
      id: c.id,
      nome: c['profiles!agregado_id']?.nome ?? 'Motorista',
      vaga: c.vagas ? `${c.vagas.rota_origem ?? ''} → ${c.vagas.rota_destino ?? ''}` : '—',
      status: c.status,
      created_at: c.created_at,
    }))
    setRecentCands(recent)

    // Vagas performance
    const vagasComCandidatos: VagaPerf[] = (vagasData ?? []).map(v => ({
      ...v,
      candidaturas_count: allCands.filter(c => c.vaga_id === v.id).length,
    }))
    setVagasPerf(vagasComCandidatos.filter(v => v.status === 'ativa'))

    // Alert cards
    const alertasArr: AlertaCard[] = []
    if (novos > 0) {
      alertasArr.push({
        tipo: 'atencao',
        icon: '👤',
        title: `${novos} candidato${novos > 1 ? 's' : ''} aguardando análise`,
        sub: 'Responda para não perder bons motoristas',
        href: '/transportadora/candidatos',
      })
    }
    const avalPend = contratoEnc ?? 0
    if (avalPend > 0) {
      alertasArr.push({
        tipo: 'info',
        icon: '⭐',
        title: `${avalPend} avaliação${avalPend > 1 ? 'ões' : ''} pendente${avalPend > 1 ? 's' : ''}`,
        sub: 'Avalie seus ex-agregados — ajuda outros transportadores',
        href: '/transportadora/avaliacoes',
      })
    }
    const vagasSemCand = vagasComCandidatos.filter(v => v.status === 'ativa' && v.candidaturas_count === 0).length
    if (vagasSemCand > 0) {
      alertasArr.push({
        tipo: 'info',
        icon: '📢',
        title: `${vagasSemCand} vaga${vagasSemCand > 1 ? 's' : ''} sem candidatos`,
        sub: 'Considere ajustar a remuneração ou os requisitos',
        href: '/transportadora/vagas',
      })
    }
    if (alertasArr.length === 0) {
      alertasArr.push({ tipo: 'ok', icon: '✅', title: 'Tudo em dia', sub: 'Nenhuma ação urgente pendente no momento' })
    }
    setAlertas(alertasArr)
    setLoading(false)
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  const STATUS_BADGE: Record<string, string> = {
    pendente:        'bg-orange-100 text-orange-700',
    visualizado:     'bg-gray-100 text-gray-600',
    em_negociacao:   'bg-green-100 text-green-700',
    em_formalizacao: 'bg-blue-100 text-blue-700',
    aceito:          'bg-green-100 text-green-700',
    contratado:      'bg-accent/10 text-accent',
    recusado:        'bg-red-100 text-red-700',
  }

  const STATUS_LABEL: Record<string, string> = {
    pendente: 'Novo', visualizado: 'Visualizado', em_negociacao: 'Em negociação',
    em_formalizacao: 'Em formalização', aceito: 'Aprovado', contratado: 'Contratado', recusado: 'Recusado',
  }

  const ALERT_STYLES: Record<string, string> = {
    urgente: 'bg-danger-light border-danger/20',
    atencao: 'bg-warning-light border-warning/20',
    info:    'bg-info/5 border-info/20',
    ok:      'bg-success-light border-success/20',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans">Transportadora</p>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="font-serif text-3xl font-semibold text-text-primary">
            {greeting}, <em>{nomeExibido}.</em>
          </h1>
          <span className="text-sm text-text-muted">{dateStr}</span>
        </div>
      </div>

      {/* Alert cards */}
      <div className="space-y-2">
        {alertas.map((a, i) => {
          const content = (
            <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${ALERT_STYLES[a.tipo] ?? ''} transition-all hover:shadow-sm`}>
              <span className="text-xl flex-shrink-0">{a.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{a.title}</p>
                <p className="text-xs text-text-secondary">{a.sub}</p>
              </div>
              {a.href && <ChevronRight size={16} className="text-text-muted flex-shrink-0" />}
            </div>
          )
          return a.href ? (
            <Link key={i} href={a.href}>{content}</Link>
          ) : (
            <div key={i}>{content}</div>
          )
        })}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Vagas ativas', value: kpiVagas, color: 'bg-success', href: '/transportadora/vagas' },
          { label: 'Candidatos novos', value: kpiCandNovos, color: 'bg-warning', href: '/transportadora/candidatos' },
          { label: 'Contratos ativos', value: kpiContratos, color: 'bg-gold', href: '/transportadora/contratos' },
          { label: 'Avaliações pendentes', value: kpiAvalPend, color: 'bg-info', href: '/transportadora/avaliacoes' },
        ].map(kpi => (
          <Link key={kpi.label} href={kpi.href}>
            <div className="bg-surface border border-border rounded-xl p-4 relative overflow-hidden hover:shadow-card-hover transition-shadow cursor-pointer">
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${kpi.color}`} />
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted mb-2">{kpi.label}</p>
              <p className="font-serif text-3xl font-semibold text-text-primary leading-none">
                {loading ? '—' : kpi.value}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent candidates */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg font-semibold text-text-primary">Candidatos recentes</h2>
            <Link href="/transportadora/candidatos" className="text-sm text-text-muted hover:text-text-secondary flex items-center gap-1">
              Ver todos <ChevronRight size={14} />
            </Link>
          </div>
          {recentCands.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-6 text-center">
              <Users size={28} className="text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">Nenhuma candidatura recebida ainda</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentCands.map(c => (
                <Link key={c.id} href="/transportadora/candidatos">
                  <div className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl hover:shadow-card-hover transition-shadow cursor-pointer">
                    <div className="w-9 h-9 rounded-full bg-[#E0DAD0] border border-border flex items-center justify-center font-serif text-sm font-semibold text-text-secondary flex-shrink-0">
                      {c.nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{c.nome}</p>
                      <p className="text-xs text-text-muted truncate">{c.vaga}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-pill flex-shrink-0 ${STATUS_BADGE[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Vaga performance */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg font-semibold text-text-primary">Desempenho das vagas</h2>
            <Link href="/transportadora/vagas/new" className="text-sm text-success hover:opacity-80 flex items-center gap-1">
              <Plus size={14} /> Nova vaga
            </Link>
          </div>
          {vagasPerf.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-6 text-center">
              <Briefcase size={28} className="text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">Publique vagas para ver o desempenho</p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
              {vagasPerf.map(v => (
                <div key={v.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin size={12} className="text-text-muted flex-shrink-0" />
                      <span className="text-sm font-medium text-text-primary truncate">
                        {v.rota_origem} → {v.rota_destino}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-text-secondary flex-shrink-0 ml-2">
                      {v.candidaturas_count} candidato{v.candidaturas_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-all"
                      style={{ width: `${Math.min(100, v.candidaturas_count * 8)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick action */}
      <Link href="/transportadora/vagas/new">
        <div className="bg-accent rounded-xl p-5 flex items-center justify-between gap-4 cursor-pointer hover:opacity-90 transition-opacity">
          <div>
            <p className="font-semibold text-bg">Publicar nova vaga de agregado</p>
            <p className="text-sm text-bg/70 mt-0.5">
              Defina rota, tipo de veículo, critérios e receba candidaturas de agregados qualificados.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-bg/10 rounded-pill px-4 py-2 flex-shrink-0">
            <Plus size={16} className="text-bg" />
            <span className="text-sm font-medium text-bg hidden sm:inline">Publicar vaga</span>
          </div>
        </div>
      </Link>
    </div>
  )
}
