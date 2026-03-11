import { createClient } from '@/lib/supabase-server'
import Badge from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/types'
import { MapPin } from 'lucide-react'

export default async function AdminVagasPage() {
  const supabase = await createClient()
  const { data: vagas } = await supabase
    .from('vagas')
    .select('*, transportadoras(razao_social)')
    .order('created_at', { ascending: false })

  const ativas = vagas?.filter(v => v.status === 'ativa').length ?? 0
  const encerradas = vagas?.filter(v => v.status === 'encerrada').length ?? 0
  const preenchidas = vagas?.filter(v => v.status === 'preenchida').length ?? 0

  return (
    <div className="px-4 py-5">
      <div className="mb-5">
        <h1 className="font-serif text-2xl font-bold text-text-primary">Vagas — Admin</h1>
        <p className="text-text-secondary text-sm mt-1">{vagas?.length ?? 0} vagas publicadas na plataforma</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-success-light border border-success/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-success">{ativas}</p>
          <p className="text-xs text-success">Ativas</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-text-primary">{preenchidas}</p>
          <p className="text-xs text-text-muted">Preenchidas</p>
        </div>
        <div className="bg-danger-light border border-danger/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-danger">{encerradas}</p>
          <p className="text-xs text-danger">Encerradas</p>
        </div>
      </div>

      <div className="space-y-3">
        {(vagas ?? []).map(v => (
          <div key={v.id} className="bg-surface border border-border rounded-xl p-4 shadow-card">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-sm font-medium text-text-primary">
                  <MapPin size={13} className="text-text-muted" />
                  {v.rota_origem} → {v.rota_destino}
                </div>
                <p className="text-xs text-text-muted mt-0.5">{(v as any).transportadoras?.razao_social}</p>
              </div>
              <Badge variant={v.status === 'ativa' ? 'success' : v.status === 'preenchida' ? 'info' : 'muted'}>
                {v.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>{v.tipo_veiculo} {v.tipo_equipamento ? `· ${v.tipo_equipamento}` : ''}</span>
              <span className="font-semibold text-text-primary">{v.valor_contrato ? formatCurrency(v.valor_contrato) : '—'}/mês</span>
            </div>
            <div className="text-xs text-text-muted mt-1">
              {new Date(v.created_at).toLocaleDateString('pt-BR')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
