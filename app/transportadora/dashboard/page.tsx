import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, Bell, Briefcase, Users, FileText, Star, Plus, ChevronRight } from 'lucide-react'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function todayPtBR() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

function pipelineBadgeClass(status: string) {
  const map: Record<string, string> = {
    'novo': 'bg-warning/15 text-warning border border-warning/30',
    'visualizado': 'bg-border text-text-muted border border-border',
    'em negociação': 'bg-success/15 text-success border border-success/30',
    'interesse enviado': 'bg-[#C8A84B]/15 text-[#C8A84B] border border-[#C8A84B]/30',
    'aprovado': 'bg-success/15 text-success border border-success/30',
    'recusado': 'bg-danger/15 text-danger border border-danger/30',
    'contratado': 'bg-text-primary/10 text-text-primary border border-text-primary/20',
    'em formalização': 'bg-info/15 text-info border border-info/30',
  }
  return map[status] ?? 'bg-border text-text-muted border border-border'
}

export default async function TransportadoraDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: transportadora } = await supabase
    .from('transportadoras')
    .select('razao_social')
    .eq('id', user.id)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome')
    .eq('id', user.id)
    .single()

  const nomeExibido = transportadora?.razao_social || profile?.nome || 'Transportadora'

  // Fetch vaga ids for this transportadora
  const { data: vagasAll } = await supabase
    .from('vagas')
    .select('id, status')
    .eq('transportadora_id', user.id)

  const ids = vagasAll?.map(v => v.id) ?? []
  const vagasAtivas = vagasAll?.filter(v => v.status === 'ativa').length ?? 0
  const vagasOther = (vagasAll?.length ?? 0) - vagasAtivas

  let candNovos = 0
  let contratosAtivos = 0
  let avalPend = 0
  const recentCands: Array<{
    id: string; pipeline_status: string; created_at: string
    profile: { nome: string | null } | null
    vaga: { rota_origem: string | null; rota_destino: string | null } | null
  }> = []

  if (ids.length > 0) {
    const [candNovosRes, contratosRes, avalRes, recentRes] = await Promise.all([
      supabase.from('candidaturas').select('id', { count: 'exact', head: true })
        .in('vaga_id', ids).eq('pipeline_status', 'novo'),
      supabase.from('candidaturas').select('id', { count: 'exact', head: true })
        .in('vaga_id', ids).eq('status', 'aceito').eq('contrato_status', 'ativo'),
      supabase.from('candidaturas').select('id', { count: 'exact', head: true })
        .in('vaga_id', ids).eq('status', 'aceito').eq('contrato_status', 'encerrado'),
      supabase.from('candidaturas')
        .select('id, pipeline_status, created_at, profile:profiles!agregado_id(nome), vaga:vagas!vaga_id(rota_origem, rota_destino)')
        .in('vaga_id', ids)
        .order('created_at', { ascending: false })
        .limit(4),
    ])

    candNovos = candNovosRes.count ?? 0
    contratosAtivos = contratosRes.count ?? 0
    avalPend = avalRes.count ?? 0
    if (recentRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recentCands.push(...(recentRes.data as any[]).map((c: any) => ({
        id: c.id as string,
        pipeline_status: c.pipeline_status as string,
        created_at: c.created_at as string,
        profile: Array.isArray(c.profile) ? c.profile[0] : c.profile,
        vaga: Array.isArray(c.vaga) ? c.vaga[0] : c.vaga,
      })))
    }
  }

  // Alert cards
  const alerts: Array<{ type: 'warning' | 'info' | 'success'; msg: string; href: string }> = []
  if (candNovos > 0) alerts.push({ type: 'warning', msg: `${candNovos} candidato${candNovos > 1 ? 's' : ''} novo${candNovos > 1 ? 's' : ''} aguardando análise`, href: '/transportadora/candidatos' })
  if (avalPend > 0) alerts.push({ type: 'info', msg: `${avalPend} contrato${avalPend > 1 ? 's' : ''} encerrado${avalPend > 1 ? 's' : ''} aguardando avaliação`, href: '/transportadora/avaliacoes' })
  if (vagasAtivas === 0) alerts.push({ type: 'success', msg: 'Publique sua primeira vaga para começar', href: '/transportadora/vagas/new' })

  const alertStyles = {
    warning: { bg: 'bg-warning/8 border-warning/25', icon: <AlertTriangle size={16} className="text-warning" />, text: 'text-warning' },
    info: { bg: 'bg-info/8 border-info/25', icon: <Bell size={16} className="text-info" />, text: 'text-info' },
    success: { bg: 'bg-success/8 border-success/25', icon: <Plus size={16} className="text-success" />, text: 'text-success' },
  }

  const kpis = [
    { label: 'Vagas Ativas', value: vagasAtivas, sub: `${vagasOther} pausadas/encerradas`, color: 'border-t-success', icon: <Briefcase size={18} className="text-success" /> },
    { label: 'Candidatos Novos', value: candNovos, sub: 'aguardando análise', color: 'border-t-warning', icon: <Users size={18} className="text-warning" /> },
    { label: 'Contratos Ativos', value: contratosAtivos, sub: 'agregados operando', color: 'border-t-[#C8A84B]', icon: <FileText size={18} className="text-[#C8A84B]" /> },
    { label: 'Aval. Pendentes', value: avalPend, sub: 'contratos encerrados', color: 'border-t-info', icon: <Star size={18} className="text-info" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-text-muted text-sm font-sans capitalize">{todayPtBR()}</p>
        <h1 className="font-serif text-2xl font-bold text-text-primary">
          {greeting()}, <em>{nomeExibido}</em>
        </h1>
      </div>

      {/* Alert cards */}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {alerts.map((a, i) => (
            <Link key={i} href={a.href}>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${alertStyles[a.type].bg} hover:opacity-90 transition-opacity`}>
                {alertStyles[a.type].icon}
                <p className={`text-sm font-sans font-medium flex-1 ${alertStyles[a.type].text}`}>{a.msg}</p>
                <ChevronRight size={14} className={alertStyles[a.type].text} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className={`bg-surface border border-border border-t-4 ${k.color} rounded-xl px-4 py-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-sans text-text-muted uppercase tracking-wide">{k.label}</span>
              {k.icon}
            </div>
            <p className="font-serif text-3xl font-bold text-text-primary leading-none">{k.value}</p>
            <p className="text-xs text-text-muted mt-1 font-sans">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Bottom split: candidatos recentes + vagas */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Candidatos recentes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-base font-semibold text-text-primary">Candidatos recentes</h2>
            <Link href="/transportadora/candidatos" className="text-xs text-text-muted hover:text-text-secondary flex items-center gap-1">
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>
          {recentCands.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-6 text-center text-sm text-text-muted">
              Nenhum candidato ainda
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentCands.map(c => (
                <div key={c.id} className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/15 text-accent text-sm font-semibold flex items-center justify-center flex-shrink-0">
                    {(c.profile?.nome ?? 'M').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{c.profile?.nome ?? 'Motorista'}</p>
                    <p className="text-xs text-text-muted truncate">
                      {c.vaga?.rota_origem} → {c.vaga?.rota_destino}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${pipelineBadgeClass(c.pipeline_status)}`}>
                      {c.pipeline_status}
                    </span>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximas ações / publicar */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-base font-semibold text-text-primary">Ações rápidas</h2>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/transportadora/vagas/new" className="bg-surface border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 hover:shadow-card-hover transition-shadow">
              <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center">
                <Plus size={16} className="text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">Publicar nova vaga</p>
                <p className="text-xs text-text-muted">Atraia motoristas qualificados</p>
              </div>
              <ChevronRight size={14} className="text-text-muted" />
            </Link>
            <Link href="/transportadora/candidatos" className="bg-surface border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 hover:shadow-card-hover transition-shadow">
              <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center">
                <Users size={16} className="text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">Analisar candidatos</p>
                <p className="text-xs text-text-muted">{candNovos > 0 ? `${candNovos} novo${candNovos > 1 ? 's' : ''} esperando` : 'Pipeline de candidatos'}</p>
              </div>
              <ChevronRight size={14} className="text-text-muted" />
            </Link>
            <Link href="/transportadora/buscar" className="bg-surface border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 hover:shadow-card-hover transition-shadow">
              <div className="w-8 h-8 rounded-lg bg-info/15 flex items-center justify-center">
                <Users size={16} className="text-info" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">Buscar motoristas</p>
                <p className="text-xs text-text-muted">Encontre agregados disponíveis</p>
              </div>
              <ChevronRight size={14} className="text-text-muted" />
            </Link>
            <Link href="/transportadora/contratos" className="bg-surface border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 hover:shadow-card-hover transition-shadow">
              <div className="w-8 h-8 rounded-lg bg-[#C8A84B]/15 flex items-center justify-center">
                <FileText size={16} className="text-[#C8A84B]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">Contratos ativos</p>
                <p className="text-xs text-text-muted">{contratosAtivos > 0 ? `${contratosAtivos} agregado${contratosAtivos > 1 ? 's' : ''} operando` : 'Nenhum contrato ativo'}</p>
              </div>
              <ChevronRight size={14} className="text-text-muted" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
