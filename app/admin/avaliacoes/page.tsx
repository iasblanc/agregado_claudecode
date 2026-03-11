'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Badge from '@/components/ui/Badge'
import { Star } from 'lucide-react'

interface Avaliacao {
  id: string
  nota: number
  comentario: string | null
  created_at: string
  avaliador: { nome: string | null; tipo: string } | null
  avaliado: { nome: string | null; tipo: string } | null
  candidaturas: { vagas: { rota_origem: string | null; rota_destino: string | null } | null } | null
}

export default function AdminAvaliacoesPage() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('avaliacoes')
        .select(`
          id, nota, comentario, created_at,
          avaliador:profiles!avaliador_id(nome, tipo),
          avaliado:profiles!avaliado_id(nome, tipo),
          candidaturas(vagas(rota_origem, rota_destino))
        `)
        .order('created_at', { ascending: false })
      setAvaliacoes((data as unknown as Avaliacao[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleDelete(id: string) {
    if (!window.confirm('Remover esta avaliação permanentemente?')) return
    const supabase = createClient()
    await supabase.from('avaliacoes').delete().eq('id', id)
    setAvaliacoes(prev => prev.filter(a => a.id !== id))
  }

  const total = avaliacoes.length
  const media = total > 0 ? (avaliacoes.reduce((sum, a) => sum + a.nota, 0) / total).toFixed(1) : '—'
  const baixas = avaliacoes.filter(a => a.nota <= 2).length

  if (loading) {
    return (
      <div className="px-4 py-5">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-surface rounded w-48" />
          <div className="grid grid-cols-3 gap-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-surface rounded-xl" />)}
          </div>
          {[1,2,3].map(i => <div key={i} className="h-20 bg-surface rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-5">
      <div className="mb-5">
        <h1 className="font-serif text-2xl font-bold text-text-primary">Avaliações — Admin</h1>
        <p className="text-text-secondary text-sm mt-1">{total} avaliações na plataforma</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-surface border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-text-primary">{total}</p>
          <p className="text-xs text-text-muted">Total</p>
        </div>
        <div className="bg-[#C8A84B]/10 border border-[#C8A84B]/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[#C8A84B]">{media}</p>
          <p className="text-xs text-[#C8A84B]">Nota média</p>
        </div>
        <div className="bg-danger-light border border-danger/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-danger">{baixas}</p>
          <p className="text-xs text-danger">Notas ≤ 2</p>
        </div>
      </div>

      {total === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <Star size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma avaliação registrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {avaliacoes.map(a => {
            const rota = a.candidaturas?.vagas
              ? `${a.candidaturas.vagas.rota_origem ?? '?'} → ${a.candidaturas.vagas.rota_destino ?? '?'}`
              : null
            const notaVariant = a.nota <= 2 ? 'danger' : a.nota === 3 ? 'warning' : 'success'
            return (
              <div key={a.id} className="bg-surface border border-border rounded-xl p-4 shadow-card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Stars */}
                      <span className="text-[#C8A84B] text-sm leading-none" aria-label={`Nota ${a.nota}`}>
                        {'★'.repeat(a.nota)}{'☆'.repeat(5 - a.nota)}
                      </span>
                      <Badge variant={notaVariant}>{a.nota}/5</Badge>
                    </div>
                    <p className="text-sm text-text-primary">
                      <span className="font-medium">{a.avaliador?.nome ?? 'Anônimo'}</span>
                      <span className="text-text-muted mx-1">({a.avaliador?.tipo ?? '—'})</span>
                      <span className="text-text-muted">avaliou</span>
                      <span className="font-medium mx-1">{a.avaliado?.nome ?? 'Anônimo'}</span>
                      <span className="text-text-muted">({a.avaliado?.tipo ?? '—'})</span>
                    </p>
                    {rota && (
                      <p className="text-xs text-text-muted mt-0.5">Contrato: {rota}</p>
                    )}
                    {a.comentario && (
                      <p className="text-xs text-text-secondary mt-1 italic">"{a.comentario}"</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="flex-shrink-0 text-xs text-danger hover:underline font-medium"
                  >
                    Excluir
                  </button>
                </div>
                <p className="text-xs text-text-muted">
                  {new Date(a.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
