'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { formatCurrency, type Vaga } from '@/lib/types'
import {
  Plus, Truck, Users, ChevronRight,
  Loader2, AlertCircle, Package, MoreVertical, Pause, Play, X as XIcon
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

function VagaDropdown({ vaga, onUpdate }: {
  vaga: VagaWithCount
  onUpdate: (id: string, updates: Partial<Vaga>) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleToggle() {
    setOpen(false)
    const supabase = createClient()
    const newStatus = vaga.status === 'ativa' ? 'encerrada' : 'ativa'
    const { error } = await supabase.from('vagas').update({ status: newStatus }).eq('id', vaga.id)
    if (!error) onUpdate(vaga.id, { status: newStatus })
    else alert('Erro ao atualizar vaga')
  }

  async function handleEncerrar() {
    setOpen(false)
    if (!confirm('Deseja encerrar esta vaga? Candidaturas pendentes serão mantidas.')) return
    const supabase = createClient()
    const { error } = await supabase.from('vagas').update({ status: 'encerrada' }).eq('id', vaga.id)
    if (!error) onUpdate(vaga.id, { status: 'encerrada' })
    else alert('Erro ao encerrar vaga')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v) }}
        className="p-1.5 rounded-md hover:bg-[#E0DAD0] text-text-muted transition-colors"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-surface border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
          {vaga.status !== 'encerrada' && (
            <button
              onClick={handleToggle}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-text-primary hover:bg-[#E0DAD0] transition-colors"
            >
              {vaga.status === 'ativa' ? <><Pause size={14} /> Pausar vaga</> : <><Play size={14} /> Reativar vaga</>}
            </button>
          )}
          {vaga.status !== 'encerrada' && (
            <button
              onClick={handleEncerrar}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-danger hover:bg-danger-light transition-colors"
            >
              <XIcon size={14} /> Encerrar vaga
            </button>
          )}
          {vaga.status === 'encerrada' && (
            <button
              onClick={handleToggle}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-success hover:bg-success-light transition-colors"
            >
              <Play size={14} /> Reativar vaga
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function TransportadoraVagasPage() {
  const router = useRouter()
  const [vagas, setVagas] = useState<VagaWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('all')

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

      const vagaIds = vagasData.map(v => v.id)
      const { data: candidaturasData } = await supabase
        .from('candidaturas')
        .select('vaga_id')
        .in('vaga_id', vagaIds)

      const countMap: Record<string, number> = {}
      candidaturasData?.forEach(c => {
        countMap[c.vaga_id] = (countMap[c.vaga_id] ?? 0) + 1
      })

      setVagas(vagasData.map(v => ({ ...v, candidaturas_count: countMap[v.id] ?? 0 })))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar vagas')
    } finally {
      setLoading(false)
    }
  }, [filter, router])

  useEffect(() => { fetchVagas() }, [fetchVagas])

  function handleUpdate(id: string, updates: Partial<Vaga>) {
    setVagas(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))
  }

  const statusBarColor = (status: Vaga['status']) => {
    if (status === 'ativa') return 'bg-success'
    if (status === 'encerrada') return 'bg-text-muted'
    return 'bg-[#C8A84B]'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-text-primary">Minhas Vagas</h1>
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
            {filter === 'all' ? 'Publique sua primeira vaga e comece a receber candidaturas.' : 'Altere o filtro para ver outras vagas.'}
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
            <div key={vaga.id} className="bg-surface border border-border rounded-xl overflow-hidden hover:shadow-card-hover transition-shadow flex">
              {/* Left status bar */}
              <div className={`w-1 flex-shrink-0 ${statusBarColor(vaga.status)}`} />
              <div className="flex-1 p-4">
                {/* Top row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-serif font-semibold text-text-primary text-base leading-tight">
                      {vaga.rota_origem || '—'} → {vaga.rota_destino || '—'}
                    </p>
                    {vaga.titulo && (
                      <p className="text-xs text-text-muted mt-0.5">{vaga.titulo}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <StatusBadge status={vaga.status} />
                    <VagaDropdown vaga={vaga} onUpdate={handleUpdate} />
                  </div>
                </div>

                {/* Meta badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {vaga.tipo_veiculo && (
                    <span className="flex items-center gap-1 text-xs text-text-secondary bg-bg border border-border px-2 py-0.5 rounded-pill">
                      <Truck size={10} /> {vaga.tipo_veiculo}
                    </span>
                  )}
                  {vaga.tipo_equipamento && (
                    <span className="text-xs text-text-secondary bg-bg border border-border px-2 py-0.5 rounded-pill">
                      {vaga.tipo_equipamento}
                    </span>
                  )}
                  {vaga.km_estimado && (
                    <span className="text-xs text-text-secondary bg-bg border border-border px-2 py-0.5 rounded-pill">
                      {vaga.km_estimado} km
                    </span>
                  )}
                  {vaga.valor_contrato && (
                    <span className="text-xs font-medium text-success bg-success-light border border-success/20 px-2 py-0.5 rounded-pill">
                      {formatCurrency(vaga.valor_contrato)}/mês
                    </span>
                  )}
                </div>

                {/* Stats + action */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Users size={12} />
                    {vaga.candidaturas_count} candidatura{vaga.candidaturas_count !== 1 ? 's' : ''}
                  </span>
                  <Link href={`/transportadora/candidatos?vaga=${vaga.id}`}>
                    <button className="flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">
                      Ver candidatos <ChevronRight size={12} />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
