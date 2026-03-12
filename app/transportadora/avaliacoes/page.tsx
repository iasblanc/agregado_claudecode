'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, Star } from 'lucide-react'

const QUESITOS_TRANS = [
  { key: 'pontualidade', label: 'Pontualidade nas viagens', desc: 'Cumprimento de horários de coleta e entrega' },
  { key: 'cuidado', label: 'Cuidado com a carga', desc: 'Zelo no manuseio e conservação das mercadorias' },
  { key: 'comunicacao', label: 'Comunicação e responsividade', desc: 'Facilidade de contato, atualizações em rota' },
  { key: 'veiculo', label: 'Conservação do veículo', desc: 'Manutenção em dia, apresentação do equipamento' },
  { key: 'documentos', label: 'Conformidade documental', desc: 'Documentos sempre atualizados e em ordem' },
  { key: 'postura', label: 'Postura profissional', desc: 'Comportamento, relação com clientes e equipe' },
  { key: 'prazos', label: 'Cumprimento de prazos e contratos', desc: 'Respeito aos acordos firmados no contrato' },
]

type Tab = 'avaliar' | 'recebidas' | 'enviadas'

interface PendingContract {
  id: string
  created_at: string
  avaliado: boolean
  avaliando: boolean
  profile: { id: string; nome: string | null } | null
  vaga: { rota_origem: string | null; rota_destino: string | null } | null
}

interface Avaliacao {
  id: string
  nota: number
  comentario: string | null
  created_at: string
  notas?: Record<string, number>
  avaliador: { nome: string | null } | null
  avaliado: { nome: string | null } | null
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="text-2xl transition-colors leading-none"
          style={{ color: n <= (hover || value) ? '#C8A84B' : 'var(--border-color, #ddd)' }}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className="text-base" style={{ color: n <= Math.round(value) ? '#C8A84B' : 'var(--border-color, #ddd)' }}>★</span>
      ))}
    </div>
  )
}

function initials(name: string | null) {
  if (!name) return 'M'
  const parts = name.trim().split(' ')
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function AvaliacoesPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('avaliar')
  const [pending, setPending] = useState<PendingContract[]>([])
  const [recebidas, setRecebidas] = useState<Avaliacao[]>([])
  const [enviadas, setEnviadas] = useState<Avaliacao[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [notas, setNotas] = useState<Record<string, Record<string, number>>>({})
  const [comentarios, setComentarios] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      const { data: vagasData } = await supabase
        .from('vagas').select('id').eq('transportadora_id', user.id)
      const vagaIds = vagasData?.map(v => v.id) ?? []

      if (vagaIds.length > 0) {
        // Pending: contratos encerrados
        const { data: contratosEnc } = await supabase
          .from('candidaturas')
          .select('id, created_at, profile:profiles!agregado_id(id, nome), vaga:vagas!vaga_id(rota_origem, rota_destino)')
          .in('vaga_id', vagaIds)
          .eq('status', 'aceito')
          .eq('contrato_status', 'encerrado')

        // Check which ones already have avaliacao
        const encIds = contratosEnc?.map(c => c.id) ?? []
        let avaliadosIds: string[] = []
        if (encIds.length > 0) {
          const { data: avalExist } = await supabase
            .from('avaliacoes')
            .select('candidatura_id')
            .in('candidatura_id', encIds)
            .eq('avaliador_id', user.id)
          avaliadosIds = avalExist?.map(a => a.candidatura_id) ?? []
        }

        setPending((contratosEnc ?? []).map(c => ({
          id: c.id as string,
          created_at: c.created_at as string,
          avaliado: avaliadosIds.includes(c.id as string),
          avaliando: false,
          profile: (Array.isArray(c.profile) ? c.profile[0] : c.profile) as PendingContract['profile'],
          vaga: (Array.isArray(c.vaga) ? c.vaga[0] : c.vaga) as PendingContract['vaga'],
        })))

        // Recebidas
        const { data: rec } = await supabase
          .from('avaliacoes')
          .select('id, nota, comentario, created_at, notas, avaliador:profiles!avaliador_id(nome), avaliado:profiles!avaliado_id(nome)')
          .eq('avaliado_id', user.id)
          .order('created_at', { ascending: false })
        setRecebidas((rec ?? []).map(r => ({
          ...r,
          avaliador: Array.isArray(r.avaliador) ? r.avaliador[0] : r.avaliador,
          avaliado: Array.isArray(r.avaliado) ? r.avaliado[0] : r.avaliado,
        })) as Avaliacao[])

        // Enviadas
        const { data: env } = await supabase
          .from('avaliacoes')
          .select('id, nota, comentario, created_at, notas, avaliador:profiles!avaliador_id(nome), avaliado:profiles!avaliado_id(nome)')
          .eq('avaliador_id', user.id)
          .order('created_at', { ascending: false })
        setEnviadas((env ?? []).map(r => ({
          ...r,
          avaliador: Array.isArray(r.avaliador) ? r.avaliador[0] : r.avaliador,
          avaliado: Array.isArray(r.avaliado) ? r.avaliado[0] : r.avaliado,
        })) as Avaliacao[])
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { loadData() }, [loadData])

  function setNota(contractId: string, key: string, val: number) {
    setNotas(prev => ({ ...prev, [contractId]: { ...(prev[contractId] ?? {}), [key]: val } }))
  }

  async function submitAvaliacao(contractId: string, avaliado_id: string) {
    const ns = notas[contractId] ?? {}
    const allFilled = QUESITOS_TRANS.every(q => ns[q.key] > 0)
    if (!allFilled) { alert('Avalie todos os critérios antes de enviar.'); return }

    setSubmitting(prev => ({ ...prev, [contractId]: true }))
    try {
      const supabase = createClient()
      const avgNota = Object.values(ns).reduce((a, b) => a + b, 0) / Object.values(ns).length

      const { error } = await supabase.from('avaliacoes').insert({
        candidatura_id: contractId,
        avaliador_id: userId,
        avaliado_id,
        nota: Math.round(avgNota),
        comentario: comentarios[contractId] || null,
        notas: ns,
      })

      if (error) throw error
      setPending(prev => prev.map(p => p.id === contractId ? { ...p, avaliado: true, avaliando: false } : p))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao enviar avaliação')
    } finally {
      setSubmitting(prev => ({ ...prev, [contractId]: false }))
    }
  }

  const overallAvg = recebidas.length > 0
    ? recebidas.reduce((a, r) => a + r.nota, 0) / recebidas.length
    : 0

  const avgPerCriterio = QUESITOS_TRANS.map(q => {
    const vals = recebidas.map(r => (r.notas?.[q.key] ?? 0)).filter(v => v > 0)
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    return { ...q, avg }
  })

  const tabs = [
    { id: 'avaliar', label: `Avaliar${pending.filter(p => !p.avaliado).length > 0 ? ` (${pending.filter(p => !p.avaliado).length})` : ''}` },
    { id: 'recebidas', label: `Recebidas${recebidas.length > 0 ? ` (${recebidas.length})` : ''}` },
    { id: 'enviadas', label: `Enviadas${enviadas.length > 0 ? ` (${enviadas.length})` : ''}` },
  ] as const

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-text-primary">Avaliações</h1>
        <p className="text-text-secondary text-sm mt-0.5">Sistema bidirecional de avaliações</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium font-sans transition-all whitespace-nowrap ${
              tab === t.id ? 'bg-accent text-bg shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-[#E0DAD0]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-text-muted" />
        </div>
      ) : (
        <>
          {/* Tab: Avaliar */}
          {tab === 'avaliar' && (
            <div className="space-y-4">
              {pending.length === 0 && (
                <div className="bg-surface border border-border rounded-xl p-10 text-center">
                  <Star size={36} className="text-text-muted mx-auto mb-3" />
                  <p className="font-medium text-text-secondary">Nenhum contrato encerrado para avaliar</p>
                  <p className="text-sm text-text-muted mt-1">As avaliações ficam disponíveis após o encerramento de contratos.</p>
                </div>
              )}
              {pending.map(p => (
                <div key={p.id} className="bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/15 text-accent font-semibold flex items-center justify-center flex-shrink-0 text-sm">
                        {initials(p.profile?.nome ?? null)}
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{p.profile?.nome ?? 'Agregado'}</p>
                        <p className="text-xs text-text-muted">{p.vaga?.rota_origem} → {p.vaga?.rota_destino}</p>
                      </div>
                    </div>
                    {p.avaliado ? (
                      <span className="text-xs bg-success/10 text-success border border-success/30 px-2.5 py-1 rounded-full">✓ Avaliado</span>
                    ) : (
                      <button
                        onClick={() => setPending(prev => prev.map(pp => pp.id === p.id ? { ...pp, avaliando: !pp.avaliando } : pp))}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[#C8A84B] text-bg font-medium"
                      >
                        Avaliar
                      </button>
                    )}
                  </div>

                  {p.avaliando && !p.avaliado && (
                    <div className="border-t border-border pt-4 space-y-4">
                      {QUESITOS_TRANS.map(q => (
                        <div key={q.key} className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-text-primary">{q.label}</p>
                            <p className="text-xs text-text-muted">{q.desc}</p>
                          </div>
                          <StarInput
                            value={notas[p.id]?.[q.key] ?? 0}
                            onChange={v => setNota(p.id, q.key, v)}
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs text-text-muted mb-1">Comentário (opcional)</label>
                        <textarea
                          value={comentarios[p.id] ?? ''}
                          onChange={e => setComentarios(prev => ({ ...prev, [p.id]: e.target.value }))}
                          rows={2}
                          placeholder="Deixe um comentário sobre a parceria..."
                          className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setPending(prev => prev.map(pp => pp.id === p.id ? { ...pp, avaliando: false } : pp))}
                          className="px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:bg-bg"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => submitAvaliacao(p.id, p.profile?.id ?? '')}
                          disabled={submitting[p.id]}
                          className="px-4 py-2 rounded-lg bg-accent text-bg text-sm font-medium disabled:opacity-50"
                        >
                          {submitting[p.id] ? 'Enviando...' : 'Enviar avaliação'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tab: Recebidas */}
          {tab === 'recebidas' && (
            <div className="space-y-6">
              {recebidas.length === 0 ? (
                <div className="bg-surface border border-border rounded-xl p-10 text-center">
                  <Star size={36} className="text-text-muted mx-auto mb-3" />
                  <p className="font-medium text-text-secondary">Nenhuma avaliação recebida ainda</p>
                </div>
              ) : (
                <>
                  {/* Overall score */}
                  <div className="bg-surface border border-border rounded-xl p-5 text-center">
                    <p className="font-serif text-5xl font-bold text-text-primary mb-2">{overallAvg.toFixed(1)}</p>
                    <StarDisplay value={overallAvg} />
                    <p className="text-sm text-text-muted mt-2">{recebidas.length} avaliação{recebidas.length !== 1 ? 'ões' : ''} recebida{recebidas.length !== 1 ? 's' : ''}</p>
                  </div>

                  {/* Per-criterion bars */}
                  {avgPerCriterio.some(c => c.avg > 0) && (
                    <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
                      <h3 className="font-semibold text-text-primary text-sm">Média por critério</h3>
                      {avgPerCriterio.map(c => (
                        <div key={c.key} className="flex items-center gap-3">
                          <p className="text-xs text-text-secondary w-40 flex-shrink-0">{c.label}</p>
                          <div className="flex-1 bg-bg border border-border rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-[#C8A84B] rounded-full transition-all" style={{ width: `${(c.avg / 5) * 100}%` }} />
                          </div>
                          <p className="text-xs font-medium text-text-primary w-6 text-right">{c.avg.toFixed(1)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cards */}
                  {recebidas.map(av => (
                    <div key={av.id} className="bg-surface border border-border rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-accent/15 text-accent font-semibold flex items-center justify-center text-sm">
                          {initials(av.avaliador?.nome ?? null)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-text-primary text-sm">{av.avaliador?.nome ?? 'Agregado'}</p>
                          <p className="text-xs text-text-muted">{new Date(av.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-serif text-2xl font-bold text-[#C8A84B]">{av.nota.toFixed(1)}</p>
                          <StarDisplay value={av.nota} />
                        </div>
                      </div>
                      {av.comentario && (
                        <p className="text-sm text-text-secondary italic border-t border-border pt-3 mt-2">
                          &ldquo;{av.comentario}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Tab: Enviadas */}
          {tab === 'enviadas' && (
            <div className="space-y-4">
              {enviadas.length === 0 ? (
                <div className="bg-surface border border-border rounded-xl p-10 text-center">
                  <Star size={36} className="text-text-muted mx-auto mb-3" />
                  <p className="font-medium text-text-secondary">Nenhuma avaliação enviada ainda</p>
                </div>
              ) : enviadas.map(av => (
                <div key={av.id} className="bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-accent/15 text-accent font-semibold flex items-center justify-center text-sm">
                      {initials(av.avaliado?.nome ?? null)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-text-primary text-sm">{av.avaliado?.nome ?? 'Agregado'}</p>
                      <p className="text-xs text-text-muted">{new Date(av.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-2xl font-bold text-[#C8A84B]">{av.nota.toFixed(1)}</p>
                      <StarDisplay value={av.nota} />
                    </div>
                  </div>
                  {av.comentario && (
                    <p className="text-sm text-text-secondary italic">&ldquo;{av.comentario}&rdquo;</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
