import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { KpiCard } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'
import { TrendingUp, AlertCircle, ChevronRight, Truck, MapPin } from 'lucide-react'
import { formatCurrency } from '@/lib/types'

export default async function AgregadoDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('nome').eq('id', user.id).single()

  // Get current month transactions
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const { data: transacoes } = await supabase
    .from('transacoes')
    .select('tipo, valor')
    .eq('agregado_id', user.id)
    .gte('data', firstDay)

  const receita = transacoes?.filter(t => t.tipo === 'entrada').reduce((a, t) => a + t.valor, 0) ?? 0
  const despesa = transacoes?.filter(t => t.tipo === 'saida').reduce((a, t) => a + t.valor, 0) ?? 0
  const lucro = receita - despesa
  const margem = receita > 0 ? (lucro / receita) * 100 : 0

  // Active candidaturas
  const { data: candidaturas } = await supabase
    .from('candidaturas')
    .select('status')
    .eq('agregado_id', user.id)
  const pendentes = candidaturas?.filter(c => c.status === 'pendente').length ?? 0
  const aceitas = candidaturas?.filter(c => c.status === 'aceito').length ?? 0

  // Vehicles count
  const { count: veiculosCount } = await supabase
    .from('veiculos')
    .select('*', { count: 'exact', head: true })
    .eq('agregado_id', user.id)

  const mesNome = now.toLocaleString('pt-BR', { month: 'long' })

  return (
    <div className="px-4 py-5">
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-text-muted text-sm font-sans">Olá, {profile?.nome?.split(' ')[0] || 'Agregado'} 👋</p>
        <h1 className="font-serif text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary text-sm mt-0.5 capitalize">{mesNome} de {now.getFullYear()}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <KpiCard label="Receita do mês" value={formatCurrency(receita)} color="success"
          icon={<TrendingUp size={20} />} />
        <KpiCard label="Despesas do mês" value={formatCurrency(despesa)} color="danger"
          icon={<AlertCircle size={20} />} />
        <KpiCard label={`Resultado (${margem.toFixed(0)}%)`} value={formatCurrency(lucro)}
          color={lucro >= 0 ? 'success' : 'danger'} />
        <KpiCard label="Contratos ativos" value={`${aceitas}`} sub={`${pendentes} em análise`} color="info" />
      </div>

      {/* Alerts */}
      {(veiculosCount ?? 0) === 0 && (
        <Link href="/agregado/cadastros">
          <div className="bg-warning-light border border-warning/20 rounded-xl p-4 mb-4 flex items-start gap-3">
            <Truck size={20} className="text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-warning">Cadastre seu veículo</p>
              <p className="text-xs text-text-secondary mt-0.5">Adicione seu caminhão para calcular o custo/km e se candidatar a contratos.</p>
            </div>
            <ChevronRight size={16} className="text-text-muted flex-shrink-0 mt-0.5" />
          </div>
        </Link>
      )}

      {lucro < 0 && receita > 0 && (
        <div className="bg-danger-light border border-danger/20 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-danger">Atenção: resultado negativo</p>
            <p className="text-xs text-text-secondary mt-0.5">Suas despesas estão superando as receitas este mês. Revise seus custos.</p>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <h2 className="font-serif text-lg font-semibold text-text-primary mb-3">Acesso rápido</h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { href: '/agregado/gestao-negocio', label: 'Lançar transação', icon: TrendingUp, color: 'bg-success-light text-success' },
          { href: '/agregado/marketplace', label: 'Ver contratos', icon: MapPin, color: 'bg-info-light text-info' },
          { href: '/agregado/custo-km', label: 'Custo/km', icon: AlertCircle, color: 'bg-gold-light text-gold' },
          { href: '/agregado/cadastros', label: 'Minha frota', icon: Truck, color: 'bg-warning-light text-warning' },
        ].map(({ href, label, icon: Icon, color }) => (
          <Link key={href} href={href}
            className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3 hover:shadow-card-hover transition-shadow">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
              <Icon size={18} />
            </div>
            <p className="text-sm font-medium text-text-primary">{label}</p>
          </Link>
        ))}
      </div>

      {/* Candidaturas recentes */}
      {(candidaturas?.length ?? 0) > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg font-semibold text-text-primary">Minhas candidaturas</h2>
            <Link href="/agregado/minhas-candidaturas" className="text-sm text-text-muted hover:text-text-secondary">
              Ver todas
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {candidaturas?.slice(0, 3).map((c, i) => (
              <div key={i} className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                <p className="text-sm text-text-primary">Candidatura #{i + 1}</p>
                <Badge variant={c.status === 'aceito' ? 'success' : c.status === 'recusado' ? 'danger' : 'warning'}>
                  {c.status === 'aceito' ? 'Aceito' : c.status === 'recusado' ? 'Recusado' : 'Em análise'}
                </Badge>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
