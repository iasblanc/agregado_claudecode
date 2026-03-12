import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { KpiCard } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import {
  Users, Truck, Briefcase, ClipboardList,
  UserCheck, Building2, CheckCircle2, XCircle, Clock
} from 'lucide-react'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, nome')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/')

  // Platform metrics — run in parallel
  const [
    { count: totalAgregados },
    { count: totalTransportadoras },
    { count: vagasAtivas },
    { count: vagasEncerradas },
    { count: vagasPreenchidas },
    { count: candPendentes },
    { count: candAceitas },
    { count: candRecusadas },
    { data: recentProfiles },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tipo', 'agregado'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tipo', 'transportadora'),
    supabase.from('vagas').select('*', { count: 'exact', head: true }).eq('status', 'ativa'),
    supabase.from('vagas').select('*', { count: 'exact', head: true }).eq('status', 'encerrada'),
    supabase.from('vagas').select('*', { count: 'exact', head: true }).eq('status', 'preenchida'),
    supabase.from('candidaturas').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
    supabase.from('candidaturas').select('*', { count: 'exact', head: true }).eq('status', 'aceito'),
    supabase.from('candidaturas').select('*', { count: 'exact', head: true }).eq('status', 'recusado'),
    supabase.from('profiles').select('id, nome, tipo, created_at').order('created_at', { ascending: false }).limit(10),
  ])

  const totalUsuarios = (totalAgregados ?? 0) + (totalTransportadoras ?? 0)
  const totalVagas = (vagasAtivas ?? 0) + (vagasEncerradas ?? 0) + (vagasPreenchidas ?? 0)
  const totalCandidaturas = (candPendentes ?? 0) + (candAceitas ?? 0) + (candRecusadas ?? 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-text-muted text-sm font-sans">Painel administrativo</p>
        <h1 className="font-serif text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary text-sm mt-0.5">
          Visão geral da plataforma · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Users section */}
      <section>
        <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
          <Users size={15} className="text-text-muted" />
          Usuários
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <KpiCard
            label="Total de usuários"
            value={String(totalUsuarios)}
            color="info"
            icon={<Users size={20} />}
          />
          <KpiCard
            label="Agregados"
            value={String(totalAgregados ?? 0)}
            color="success"
            icon={<Truck size={20} />}
          />
          <KpiCard
            label="Transportadoras"
            value={String(totalTransportadoras ?? 0)}
            color="gold"
            icon={<Building2 size={20} />}
          />
        </div>
      </section>

      {/* Vagas section */}
      <section>
        <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
          <Briefcase size={15} className="text-text-muted" />
          Vagas
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Total publicadas"
            value={String(totalVagas)}
            color="info"
            icon={<Briefcase size={20} />}
          />
          <KpiCard
            label="Ativas"
            value={String(vagasAtivas ?? 0)}
            color="success"
            icon={<CheckCircle2 size={20} />}
          />
          <KpiCard
            label="Encerradas"
            value={String(vagasEncerradas ?? 0)}
            color="warning"
            icon={<XCircle size={20} />}
          />
          <KpiCard
            label="Preenchidas"
            value={String(vagasPreenchidas ?? 0)}
            color="gold"
            icon={<UserCheck size={20} />}
          />
        </div>
      </section>

      {/* Candidaturas section */}
      <section>
        <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
          <ClipboardList size={15} className="text-text-muted" />
          Candidaturas
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Total"
            value={String(totalCandidaturas)}
            color="info"
            icon={<ClipboardList size={20} />}
          />
          <KpiCard
            label="Pendentes"
            value={String(candPendentes ?? 0)}
            color="warning"
            icon={<Clock size={20} />}
          />
          <KpiCard
            label="Aceitas"
            value={String(candAceitas ?? 0)}
            color="success"
            icon={<CheckCircle2 size={20} />}
          />
          <KpiCard
            label="Recusadas"
            value={String(candRecusadas ?? 0)}
            color="danger"
            icon={<XCircle size={20} />}
          />
        </div>
      </section>

      {/* Recent signups */}
      <section>
        <h2 className="font-serif text-lg font-semibold text-text-primary mb-4">Cadastros recentes</h2>
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {(!recentProfiles || recentProfiles.length === 0) ? (
            <div className="p-8 text-center">
              <p className="text-text-muted text-sm">Nenhum cadastro ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-[#E8E4DC]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Tipo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide hidden sm:table-cell">ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentProfiles.map((p) => (
                    <tr key={p.id} className="hover:bg-[#E8E4DC]/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-text-primary">
                        {p.nome || <span className="text-text-muted italic">Sem nome</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={p.tipo === 'transportadora' ? 'info' : 'success'}>
                          {p.tipo === 'transportadora' ? 'Transportadora' : 'Agregado'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-text-muted font-mono text-xs hidden sm:table-cell">
                        {p.id.substring(0, 8)}…
                      </td>
                      <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                        {formatDate(p.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
