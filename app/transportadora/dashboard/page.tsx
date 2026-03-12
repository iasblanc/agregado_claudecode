import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { KpiCard } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { Briefcase, Users, CheckCircle2, FileCheck2, MapPin, Plus, ChevronRight } from 'lucide-react'
import { formatCurrency, type Vaga } from '@/lib/types'

function StatusBadge({ status }: { status: Vaga['status'] }) {
  if (status === 'ativa') return <Badge variant="success">Ativa</Badge>
  if (status === 'encerrada') return <Badge variant="warning">Encerrada</Badge>
  return <Badge variant="info">Preenchida</Badge>
}

export default async function TransportadoraDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch profile + transportadora info
  const { data: profile } = await supabase
    .from('profiles')
    .select('nome')
    .eq('id', user.id)
    .single()

  const { data: transportadora } = await supabase
    .from('transportadoras')
    .select('razao_social')
    .eq('id', user.id)
    .single()

  const nomeExibido = transportadora?.razao_social || profile?.nome || 'Transportadora'

  // KPI: vagas ativas
  const { count: vagasAtivas } = await supabase
    .from('vagas')
    .select('*', { count: 'exact', head: true })
    .eq('transportadora_id', user.id)
    .eq('status', 'ativa')

  // KPI: candidaturas recebidas (total)
  const { data: vagaIds } = await supabase
    .from('vagas')
    .select('id')
    .eq('transportadora_id', user.id)

  const ids = vagaIds?.map(v => v.id) ?? []

  let candidaturasTotal = 0
  let candidaturasAceitas = 0
  let contratosPreenchidos = 0

  if (ids.length > 0) {
    const { count: total } = await supabase
      .from('candidaturas')
      .select('*', { count: 'exact', head: true })
      .in('vaga_id', ids)

    const { count: aceitas } = await supabase
      .from('candidaturas')
      .select('*', { count: 'exact', head: true })
      .in('vaga_id', ids)
      .eq('status', 'aceito')

    const { count: preenchidas } = await supabase
      .from('vagas')
      .select('*', { count: 'exact', head: true })
      .eq('transportadora_id', user.id)
      .eq('status', 'preenchida')

    candidaturasTotal = total ?? 0
    candidaturasAceitas = aceitas ?? 0
    contratosPreenchidos = preenchidas ?? 0
  }

  // Last 5 vagas
  const { data: ultimasVagas } = await supabase
    .from('vagas')
    .select('id, titulo, rota_origem, rota_destino, tipo_veiculo, valor_contrato, periodo_meses, status, created_at')
    .eq('transportadora_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-text-muted text-sm font-sans">Bem-vindo de volta</p>
          <h1 className="font-serif text-2xl font-bold text-text-primary">Olá, {nomeExibido}</h1>
          <p className="text-text-secondary text-sm mt-0.5">Painel da Transportadora</p>
        </div>
        <Link href="/transportadora/vagas/new">
          <Button size="sm" className="gap-2 flex-shrink-0">
            <Plus size={15} />
            <span className="hidden sm:inline">Publicar vaga</span>
            <span className="sm:hidden">Nova vaga</span>
          </Button>
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Vagas ativas"
          value={String(vagasAtivas ?? 0)}
          color="success"
          icon={<Briefcase size={20} />}
        />
        <KpiCard
          label="Candidaturas"
          value={String(candidaturasTotal)}
          color="info"
          icon={<Users size={20} />}
        />
        <KpiCard
          label="Candidatos aceitos"
          value={String(candidaturasAceitas)}
          color="gold"
          icon={<CheckCircle2 size={20} />}
        />
        <KpiCard
          label="Contratos fechados"
          value={String(contratosPreenchidos)}
          color="warning"
          icon={<FileCheck2 size={20} />}
        />
      </div>

      {/* Quick Action */}
      <div className="bg-success-light border border-success/20 rounded-xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-text-primary">Publicar nova vaga de agregado</p>
          <p className="text-sm text-text-secondary mt-0.5">
            Defina rota, tipo de veículo, valor e receba candidaturas de caminhoneiros qualificados.
          </p>
        </div>
        <Link href="/transportadora/vagas/new" className="flex-shrink-0">
          <Button variant="success" size="sm" className="gap-1.5">
            <Plus size={15} />
            Publicar vaga
          </Button>
        </Link>
      </div>

      {/* Recent Vagas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-lg font-semibold text-text-primary">Últimas vagas publicadas</h2>
          <Link href="/transportadora/vagas" className="text-sm text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1">
            Ver todas
            <ChevronRight size={14} />
          </Link>
        </div>

        {(!ultimasVagas || ultimasVagas.length === 0) ? (
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <Briefcase size={32} className="text-text-muted mx-auto mb-3" />
            <p className="font-medium text-text-secondary">Nenhuma vaga publicada ainda</p>
            <p className="text-sm text-text-muted mt-1 mb-4">Publique sua primeira vaga e comece a receber candidaturas.</p>
            <Link href="/transportadora/vagas/new">
              <Button size="sm" className="gap-2">
                <Plus size={14} />
                Publicar primeira vaga
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {ultimasVagas.map((vaga) => (
              <Link key={vaga.id} href={`/transportadora/vagas/${vaga.id}`}>
                <div className="bg-surface border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 hover:shadow-card-hover transition-shadow cursor-pointer group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-text-primary text-sm truncate">
                        {vaga.titulo || 'Vaga sem título'}
                      </p>
                      <StatusBadge status={vaga.status} />
                    </div>
                    {(vaga.rota_origem || vaga.rota_destino) && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-text-muted">
                        <MapPin size={11} />
                        <span className="truncate">
                          {vaga.rota_origem}{vaga.rota_origem && vaga.rota_destino ? ' → ' : ''}{vaga.rota_destino}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {vaga.tipo_veiculo && (
                        <span className="text-xs text-text-secondary">{vaga.tipo_veiculo}</span>
                      )}
                      {vaga.valor_contrato && (
                        <span className="text-xs font-medium text-success">
                          {formatCurrency(vaga.valor_contrato)}/mês
                        </span>
                      )}
                      {vaga.periodo_meses && (
                        <span className="text-xs text-text-muted">{vaga.periodo_meses} {vaga.periodo_meses === 1 ? 'mês' : 'meses'}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-text-muted flex-shrink-0 group-hover:text-text-secondary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
