import { createClient } from '@/lib/supabase-server'
import Badge from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/types'

export default async function AdminCandidaturasPage() {
  const supabase = await createClient()
  const { data: candidaturas } = await supabase
    .from('candidaturas')
    .select(`
      id, status, created_at,
      vagas(rota_origem, rota_destino, valor_contrato),
      veiculos(tipo, placa),
      motoristas(nome)
    `)
    .order('created_at', { ascending: false })

  const pendentes = candidaturas?.filter(c => c.status === 'pendente').length ?? 0
  const aceitas = candidaturas?.filter(c => c.status === 'aceito').length ?? 0
  const recusadas = candidaturas?.filter(c => c.status === 'recusado').length ?? 0

  return (
    <div className="px-4 py-5">
      <div className="mb-5">
        <h1 className="font-serif text-2xl font-bold text-text-primary">Candidaturas — Admin</h1>
        <p className="text-text-secondary text-sm mt-1">{candidaturas?.length ?? 0} candidaturas na plataforma</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-warning-light border border-warning/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-warning">{pendentes}</p>
          <p className="text-xs text-warning">Pendentes</p>
        </div>
        <div className="bg-success-light border border-success/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-success">{aceitas}</p>
          <p className="text-xs text-success">Aceitas</p>
        </div>
        <div className="bg-danger-light border border-danger/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-danger">{recusadas}</p>
          <p className="text-xs text-danger">Recusadas</p>
        </div>
      </div>

      <div className="space-y-3">
        {(candidaturas ?? []).map(c => (
          <div key={c.id} className="bg-surface border border-border rounded-xl p-4 shadow-card">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {(c as any).vagas?.rota_origem} → {(c as any).vagas?.rota_destino}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {(c as any).veiculos?.tipo} — {(c as any).veiculos?.placa}
                  {(c as any).motoristas?.nome ? ` · ${(c as any).motoristas.nome}` : ''}
                </p>
              </div>
              <Badge variant={c.status === 'aceito' ? 'success' : c.status === 'recusado' ? 'danger' : 'warning'}>
                {c.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>{new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
              {(c as any).vagas?.valor_contrato && (
                <span className="font-semibold text-text-primary">{formatCurrency((c as any).vagas.valor_contrato)}/mês</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
