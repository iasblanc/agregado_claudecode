'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { formatCurrency, TIPOS_VEICULO, type Vaga } from '@/lib/types'
import {
  Plus, MapPin, Truck, Users, Clock, ChevronRight,
  Loader2, AlertCircle, Package
} from 'lucide-react'

type StatusFilter = 'all' | 'ativa' | 'encerrada' | 'preenchida'

interface VagaWithCount extends Vaga {
  candidaturas_count: number
}

function StatusBadge({ status }: { status: Vaga['status'] }) {
  if (status === 'ativa') return <Badge variant="success">Ativa</Badge>
  if (status === 'encerrada') return <Badge variant="warning">Encerrada</Badge>
  return <Badge variant="info">Preenchida</Badge>
}

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'Todas',
  ativa: 'Ativas',
  encerrada: 'Encerradas',
  preenchida: 'Preenchidas',
}

export default function TransportadoraVagasPage() {
  const router = useRouter()
  const [vagas, setVagas] = useState<VagaWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [encerrandoId, setEncerrandoId] = useState<string | null>(null)

  const fetchVagas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      let query = supabase
        .from('vagas')
        .select('*')
        .eq('transportadora_id', user.id)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data: vagasData, error: vagasError } = await query

      if (vagasError) throw vagasError

      if (!vagasData || vagasData.length === 0) {
        setVagas([])
        setLoading(false)
        return
      }

      // Fetch candidaturas counts per vaga
      const vagaIds = vagasData.map(v => v.id)
      const { data: candidaturasData } = await supabase
        .from('candidaturas')
        .select('vaga_id')
        .in('vaga_id', vagaIds)

      const countMap: Record<string, number> = {}
      candidaturasData?.forEach(c => {
        countMap[c.vaga_id] = (countMap[c.vaga_id] ?? 0) + 1
      })

      const vagasWithCount: VagaWithCount[] = vagasData.map(v => ({
        ...v,
        candidaturas_count: countMap[v.id] ?? 0,
      }))

      setVagas(vagasWithCount)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar vagas')
    } finally {
      setLoading(false)
    }
  }, [filter, router])

  useEffect(() => {
    fetchVagas()
  }, [fetchVagas])

  async function handleEncerrar(vagaId: string) {
    if (!confirm('Deseja encerrar esta vaga? Candidaturas pendentes serão mantidas.')) return
    setEncerrandoId(vagaId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('vagas')
        .update({ status: 'encerrada' })
        .eq('id', vagaId)

      if (error) throw error
      setVagas(prev => prev.map(v => v.id === vagaId ? { ...v, status: 'encerrada' } : v))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao encerrar vaga')
    } finally {
      setEncerrandoId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-text-primary">Vagas publicadas</h1>
          <p className="text-text-secondary text-sm mt-0.5">Gerencie todas as suas vagas de agregado</p>
        </div>
        <Link href="/transportadora/vagas/new">
          <Button size="sm" className="gap-2 flex-shrink-0">
            <Plus size={15} />
            Nova vaga
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 w-fit overflow-x-auto">
        {(Object.keys(STATUS_LABELS) as StatusFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium font-sans transition-all whitespace-nowrap ${
              filter === s
                ? 'bg-accent text-bg shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-[#E0DAD0]'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-text-muted" />
        </div>
      ) : error ? (
        <div className="bg-danger-light border border-danger/20 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-danger">Erro ao carregar vagas</p>
            <p className="text-sm text-text-secondary mt-0.5">{error}</p>
            <button onClick={fetchVagas} className="text-sm text-danger underline mt-2">Tentar novamente</button>
          </div>
        </div>
      ) : vagas.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <Package size={36} className="text-text-muted mx-auto mb-3" />
          <p className="font-medium text-text-secondary">
            {filter === 'all' ? 'Nenhuma vaga publicada ainda' : `Nenhuma vaga ${STATUS_LABELS[filter].toLowerCase()}`}
          </p>
          <p className="text-sm text-text-muted mt-1 mb-5">
            {filter === 'all'
              ? 'Publique sua primeira vaga e comece a receber candidaturas de caminhoneiros.'
              : 'Altere o filtro para ver outras vagas.'}
          </p>
          {filter === 'all' && (
            <Link href="/transportadora/vagas/new">
              <Button size="sm" className="gap-2">
                <Plus size={14} />
                Publicar primeira vaga
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {vagas.map((vaga) => (
            <Card key={vaga.id} padding="none" className="overflow-hidden hover:shadow-card-hover transition-shadow">
              {/* Status color stripe */}
              <div className={`h-1 ${vaga.status === 'ativa' ? 'bg-success' : vaga.status === 'encerrada' ? 'bg-warning' : 'bg-info'}`} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-text-primary">{vaga.titulo || 'Vaga sem título'}</h3>
                      <StatusBadge status={vaga.status} />
                    </div>
                    {(vaga.rota_origem || vaga.rota_destino) && (
                      <div className="flex items-center gap-1 text-sm text-text-secondary mt-1">
                        <MapPin size={13} className="text-text-muted flex-shrink-0" />
                        <span className="truncate">
                          {vaga.rota_origem}
                          {vaga.rota_origem && vaga.rota_destino ? ' → ' : ''}
                          {vaga.rota_destino}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-success flex-shrink-0">
                    {vaga.valor_contrato ? formatCurrency(vaga.valor_contrato) + '/mês' : '—'}
                  </p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {vaga.tipo_veiculo && (
                    <div className="flex items-center gap-1 text-xs text-text-secondary bg-surface border border-border px-2.5 py-1 rounded-pill">
                      <Truck size={11} />
                      {vaga.tipo_veiculo}
                    </div>
                  )}
                  {vaga.tipo_equipamento && (
                    <div className="flex items-center gap-1 text-xs text-text-secondary bg-surface border border-border px-2.5 py-1 rounded-pill">
                      <Package size={11} />
                      {vaga.tipo_equipamento}
                    </div>
                  )}
                  {vaga.periodo_meses && (
                    <div className="flex items-center gap-1 text-xs text-text-secondary bg-surface border border-border px-2.5 py-1 rounded-pill">
                      <Clock size={11} />
                      {vaga.periodo_meses} {vaga.periodo_meses === 1 ? 'mês' : 'meses'}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-text-secondary bg-surface border border-border px-2.5 py-1 rounded-pill">
                    <Users size={11} />
                    {vaga.candidaturas_count} candidatura{vaga.candidaturas_count !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <Link href={`/transportadora/vagas/${vaga.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" fullWidth className="gap-2">
                      <Users size={14} />
                      Ver candidatos
                      <ChevronRight size={13} className="ml-auto" />
                    </Button>
                  </Link>
                  {vaga.status === 'ativa' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEncerrar(vaga.id)}
                      loading={encerrandoId === vaga.id}
                      className="text-warning border-warning/30 hover:bg-warning-light"
                    >
                      Encerrar
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
