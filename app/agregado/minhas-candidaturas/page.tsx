'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Badge from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/types'
import { MapPin, Clock, CheckCircle2, XCircle, Truck, Package, User } from 'lucide-react'

interface CandidaturaFull {
  id: string
  status: 'pendente' | 'aceito' | 'recusado'
  mensagem: string | null
  created_at: string
  vagas: {
    rota_origem: string | null
    rota_destino: string | null
    valor_contrato: number | null
    tipo_veiculo: string | null
    tipo_equipamento: string | null
    transportadoras: { razao_social: string | null } | null
  } | null
  veiculos: { tipo: string; placa: string } | null
  equipamentos: { tipo: string; placa: string | null } | null
  motoristas: { nome: string } | null
}

const statusConfig = {
  pendente: { label: 'Em análise', variant: 'warning' as const, icon: Clock },
  aceito: { label: 'Aceito', variant: 'success' as const, icon: CheckCircle2 },
  recusado: { label: 'Recusado', variant: 'danger' as const, icon: XCircle },
}

export default function MinhasCandidaturasPage() {
  const [candidaturas, setCandidaturas] = useState<CandidaturaFull[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('candidaturas')
        .select(`
          id, status, mensagem, created_at,
          vagas(rota_origem, rota_destino, valor_contrato, tipo_veiculo, tipo_equipamento, transportadoras(razao_social)),
          veiculos(tipo, placa),
          equipamentos(tipo, placa),
          motoristas(nome)
        `)
        .eq('agregado_id', user.id)
        .order('created_at', { ascending: false })
      setCandidaturas((data as unknown as CandidaturaFull[]) ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="px-4 py-10 text-center text-text-muted">Carregando...</div>

  return (
    <div className="px-4 py-5">
      <div className="mb-5">
        <h1 className="font-serif text-2xl font-bold text-text-primary">Minhas Candidaturas</h1>
        <p className="text-text-secondary text-sm mt-1">{candidaturas.length} candidatura{candidaturas.length !== 1 ? 's' : ''}</p>
      </div>

      {candidaturas.length === 0 ? (
        <div className="text-center py-16">
          <MapPin size={40} className="text-text-muted mx-auto mb-3" />
          <p className="font-semibold text-text-primary">Nenhuma candidatura ainda</p>
          <p className="text-text-muted text-sm mt-1">Explore contratos no marketplace e candidate-se</p>
          <a href="/agregado/marketplace" className="text-accent text-sm underline mt-3 inline-block">Ver contratos disponíveis</a>
        </div>
      ) : (
        <div className="space-y-3">
          {candidaturas.map(c => {
            const { label, variant, icon: StatusIcon } = statusConfig[c.status]
            return (
              <div key={c.id} className="bg-surface border border-border rounded-xl p-4 shadow-card">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-text-primary text-sm">
                      {c.vagas?.rota_origem} → {c.vagas?.rota_destino}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {c.vagas?.transportadoras?.razao_social ?? 'Transportadora'}
                    </p>
                  </div>
                  <Badge variant={variant} className="flex items-center gap-1">
                    <StatusIcon size={11} />{label}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                  {c.veiculos && (
                    <div className="bg-bg border border-border rounded-md p-2">
                      <p className="text-text-muted flex items-center gap-1 mb-0.5"><Truck size={10} />Veículo</p>
                      <p className="font-medium text-text-primary">{c.veiculos.tipo}</p>
                      <p className="text-text-muted">{c.veiculos.placa}</p>
                    </div>
                  )}
                  {c.equipamentos && (
                    <div className="bg-bg border border-border rounded-md p-2">
                      <p className="text-text-muted flex items-center gap-1 mb-0.5"><Package size={10} />Equip.</p>
                      <p className="font-medium text-text-primary truncate">{c.equipamentos.tipo.split(' ')[0]}</p>
                    </div>
                  )}
                  {c.motoristas && (
                    <div className="bg-bg border border-border rounded-md p-2">
                      <p className="text-text-muted flex items-center gap-1 mb-0.5"><User size={10} />Motorista</p>
                      <p className="font-medium text-text-primary truncate">{c.motoristas.nome.split(' ')[0]}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-text-muted border-t border-border pt-2">
                  <span>Candidatura em {new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                  {c.vagas?.valor_contrato && (
                    <span className="font-semibold text-text-primary">{formatCurrency(c.vagas.valor_contrato)}/mês</span>
                  )}
                </div>

                {c.status === 'aceito' && (
                  <div className="mt-3 bg-success-light border border-success/20 rounded-lg p-3 text-sm text-success">
                    🎉 Parabéns! Sua candidatura foi aceita. A transportadora entrará em contato.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
