'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Star, X, Send } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AvaliacaoRecebida {
  nota: number
  comentario: string | null
  created_at: string
  transportadora_nome: string | null
}

interface ContratoParaAvaliar {
  id: string
  transportadora_id: string | null
  transportadora_nome: string | null
  rota_origem: string | null
  rota_destino: string | null
}

interface Motorista {
  id: string
  nome: string
  cnh: string | null
  media: number | null
  avaliacoes: AvalMotorista[]
}

interface AvalMotorista {
  nota: number
  comentario: string | null
  periodo: string | null
  created_at: string
}

// ── Star rating component ─────────────────────────────────────────────────────

function StarRating({ value, onChange, size = 20 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(i => (
        <button
          key={i}
          onClick={() => onChange?.(i)}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          disabled={!onChange}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            size={size}
            className={i <= (hover || value) ? 'fill-gold text-gold' : 'text-border'}
          />
        </button>
      ))}
    </div>
  )
}

// ── Modal de avaliação ────────────────────────────────────────────────────────

function AvalModal({
  title,
  subtitle,
  onClose,
  onSave,
}: {
  title: string
  subtitle: string
  onClose: () => void
  onSave: (nota: number, comentario: string, periodo?: string) => Promise<void>
  showPeriodo?: boolean
}) {
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!nota) return
    setSaving(true)
    await onSave(nota, comentario, periodo || undefined)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg rounded-t-2xl md:rounded-2xl shadow-modal p-6 animate-in slide-in-from-bottom md:slide-in-from-bottom-0 duration-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-serif text-lg font-medium text-text-primary">{title}</p>
            <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface text-text-muted">
            <X size={16} />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-[11px] text-text-muted mb-2">Nota</p>
          <StarRating value={nota} onChange={setNota} size={28} />
        </div>

        {/* Período (para motoristas) */}
        <div className="mb-4">
          <label className="block text-[11px] text-text-muted mb-1.5">Período <span className="text-text-muted">(opcional)</span></label>
          <input
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
            placeholder="Ex: Março 2026"
            className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-accent"
          />
        </div>

        <div className="mb-5">
          <label className="block text-[11px] text-text-muted mb-1.5">Comentário <span className="text-text-muted">(opcional)</span></label>
          <textarea
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Descreva o desempenho..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary resize-none focus:outline-none focus:border-accent"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!nota || saving}
          className="w-full h-11 rounded-xl bg-accent text-bg font-sans font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Send size={15} />
          {saving ? 'Salvando...' : 'Enviar avaliação'}
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AvaliacoesPage() {
  const [tab, setTab] = useState<'recebidas' | 'avaliar' | 'motoristas'>('recebidas')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const [recebidas, setRecebidas] = useState<AvaliacaoRecebida[]>([])
  const [paraAvaliar, setParaAvaliar] = useState<ContratoParaAvaliar[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])

  // Modal state
  const [modalContratoId, setModalContratoId] = useState<string | null>(null)
  const [modalMotoristId, setModalMotoristId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)

      // 1. Avaliações recebidas
      const { data: rawRecebidas } = await supabase
        .from('avaliacoes')
        .select('nota, comentario, created_at')
        .eq('avaliado_id', user.id)
        .order('created_at', { ascending: false })

      setRecebidas((rawRecebidas ?? []).map(r => ({
        nota: r.nota,
        comentario: r.comentario,
        created_at: r.created_at,
        transportadora_nome: null,
      })))

      // 2. Contratos para avaliar (transportadoras)
      const { data: contratos } = await supabase
        .from('contratos_motorista')
        .select('id, transportadora_id, vagas(rota_origem, rota_destino, transportadoras(razao_social))')
        .eq('agregado_id', user.id)
        .in('status', ['ativo', 'encerrado'])

      // Avaliações já feitas por este user
      const { data: jáAvaliei } = await supabase
        .from('avaliacoes')
        .select('contrato_id')
        .eq('avaliador_id', user.id)

      const jaAvaliadosIds = new Set((jáAvaliei ?? []).map((a: Record<string, string>) => a.contrato_id).filter(Boolean))

      const pendentes: ContratoParaAvaliar[] = (contratos ?? [])
        .filter(c => !jaAvaliadosIds.has(c.id))
        .map(c => {
          const vaga = (c.vagas as unknown as { rota_origem: string | null; rota_destino: string | null; transportadoras: { razao_social: string | null } | null } | null)
          return {
            id: c.id,
            transportadora_id: c.transportadora_id,
            transportadora_nome: vaga?.transportadoras?.razao_social ?? null,
            rota_origem: vaga?.rota_origem ?? null,
            rota_destino: vaga?.rota_destino ?? null,
          }
        })

      setParaAvaliar(pendentes)

      // 3. Motoristas com suas avaliações
      const { data: mots } = await supabase
        .from('motoristas')
        .select('id, nome, cnh')
        .eq('agregado_id', user.id)

      const { data: avalsMotoristas } = await supabase
        .from('avaliacoes_motorista')
        .select('motorista_id, nota, comentario, periodo, created_at')
        .eq('avaliador_id', user.id)
        .order('created_at', { ascending: false })

      const motList: Motorista[] = (mots ?? []).map(m => {
        const avals = (avalsMotoristas ?? []).filter(a => a.motorista_id === m.id)
        const media = avals.length ? avals.reduce((s, a) => s + a.nota, 0) / avals.length : null
        return { id: m.id, nome: m.nome, cnh: m.cnh, media, avaliacoes: avals.slice(0, 3) }
      })
      setMotoristas(motList)

      setLoading(false)
    })
  }, [])

  async function salvarAvaliacaoTransportadora(contratoId: string, nota: number, comentario: string) {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('avaliacoes').insert({
      avaliado_id: paraAvaliar.find(c => c.id === contratoId)?.transportadora_id,
      avaliador_id: userId,
      contrato_id: contratoId,
      nota,
      comentario: comentario || null,
    })
    setParaAvaliar(prev => prev.filter(c => c.id !== contratoId))
  }

  async function salvarAvaliacaoMotorista(motoristId: string, nota: number, comentario: string, periodo?: string) {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('avaliacoes_motorista').insert({
      motorista_id: motoristId,
      avaliador_id: userId,
      nota,
      comentario: comentario || null,
      periodo: periodo || null,
    })
    // Refresh motoristas list
    const { data: avalsMotoristas } = await supabase
      .from('avaliacoes_motorista')
      .select('motorista_id, nota, comentario, periodo, created_at')
      .eq('avaliador_id', userId)
      .order('created_at', { ascending: false })
    setMotoristas(prev => prev.map(m => {
      const avals = (avalsMotoristas ?? []).filter(a => a.motorista_id === m.id)
      const media = avals.length ? avals.reduce((s, a) => s + a.nota, 0) / avals.length : null
      return { ...m, media, avaliacoes: avals.slice(0, 3) }
    }))
  }

  const notaMedia = recebidas.length ? recebidas.reduce((s, a) => s + a.nota, 0) / recebidas.length : null

  const modalContratoData = paraAvaliar.find(c => c.id === modalContratoId)
  const modalMotoristData = motoristas.find(m => m.id === modalMotoristId)

  if (loading) return <div className="px-4 py-10 text-center text-text-muted text-sm">Carregando...</div>

  return (
    <div className="px-4 py-5">
      <div className="mb-5">
        <h1 className="font-serif text-2xl font-medium text-text-primary">Avaliações</h1>
        <p className="text-xs text-text-muted mt-0.5">Sua reputação como agregado</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-5">
        {([
          { key: 'recebidas', label: 'Recebidas' },
          { key: 'avaliar', label: 'Avaliar', badge: paraAvaliar.length },
          { key: 'motoristas', label: 'Motoristas' },
        ] as const).map(({ key, label, badge }: { key: 'recebidas' | 'avaliar' | 'motoristas'; label: string; badge?: number }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-lg text-[13px] font-sans font-medium transition-colors relative
              ${tab === key ? 'bg-bg shadow-card text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
          >
            {label}
            {badge !== undefined && badge > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 bg-warning text-white text-[9px] font-bold rounded-full">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Recebidas */}
      {tab === 'recebidas' && (
        <div>
          {recebidas.length > 0 ? (
            <>
              {/* Stats */}
              <div className="flex items-center gap-4 mb-5 bg-surface border border-border rounded-xl p-4">
                <p className="font-serif text-5xl font-medium text-text-primary leading-none">
                  {notaMedia!.toFixed(1)}
                </p>
                <div>
                  <StarRating value={Math.round(notaMedia!)} size={18} />
                  <p className="text-xs text-text-muted mt-1">{recebidas.length} avaliação{recebidas.length !== 1 ? 'ões' : ''} recebida{recebidas.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="space-y-3">
                {recebidas.map((a, i) => (
                  <div key={i} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-sans font-medium text-text-primary">
                        {a.transportadora_nome ?? 'Transportadora'}
                      </p>
                      <span className="text-[11px] text-text-muted">
                        {new Date(a.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <StarRating value={a.nota} size={14} />
                    {a.comentario && (
                      <p className="text-[13px] text-text-secondary mt-2 italic border-l-2 border-border pl-3">
                        &ldquo;{a.comentario}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <Star size={40} className="text-border mx-auto mb-3" />
              <p className="font-sans font-medium text-text-primary text-sm">Sem avaliações ainda</p>
              <p className="text-xs text-text-muted mt-1">As transportadoras poderão avaliar você após contratos</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Para avaliar */}
      {tab === 'avaliar' && (
        <div>
          {paraAvaliar.length > 0 ? (
            <div className="space-y-3">
              {paraAvaliar.map(c => (
                <div key={c.id} className="bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-sans font-medium text-text-primary">
                        {c.transportadora_nome ?? 'Transportadora'}
                      </p>
                      {c.rota_origem && c.rota_destino && (
                        <p className="text-xs text-text-muted mt-0.5">{c.rota_origem} → {c.rota_destino}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 bg-surface border border-border rounded-full text-text-muted flex-shrink-0">
                      Contrato ativo
                    </span>
                  </div>
                  <button
                    onClick={() => setModalContratoId(c.id)}
                    className="w-full h-9 rounded-lg border border-border bg-bg text-[13px] font-sans font-medium text-text-secondary hover:bg-surface transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Star size={14} className="text-gold" /> Avaliar transportadora →
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Star size={40} className="text-border mx-auto mb-3" />
              <p className="font-sans font-medium text-text-primary text-sm">Nenhuma avaliação pendente</p>
              <p className="text-xs text-text-muted mt-1">Você avaliou todas as suas transportadoras</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Motoristas */}
      {tab === 'motoristas' && (
        <div>
          {motoristas.length > 0 ? (
            <div className="space-y-3">
              {motoristas.map(m => (
                <div key={m.id} className="bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-sans font-medium text-text-primary">{m.nome}</p>
                      {m.cnh && <p className="text-xs text-text-muted mt-0.5">CNH: {m.cnh}</p>}
                    </div>
                    <button
                      onClick={() => setModalMotoristId(m.id)}
                      className="text-[12px] font-sans font-medium text-accent border border-accent/30 rounded-lg px-3 py-1.5 hover:bg-accent/5 transition-colors flex-shrink-0"
                    >
                      + Avaliar
                    </button>
                  </div>

                  {m.media !== null ? (
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <StarRating value={Math.round(m.media)} size={14} />
                        <span className="text-xs text-text-muted">{m.media.toFixed(1)} média</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted mb-3">Sem avaliações</p>
                  )}

                  {m.avaliacoes.length > 0 && (
                    <div className="space-y-2 border-t border-border pt-3">
                      {m.avaliacoes.map((a, i) => (
                        <div key={i} className="text-xs">
                          <div className="flex items-center justify-between mb-0.5">
                            <StarRating value={a.nota} size={11} />
                            <span className="text-text-muted">{a.periodo ?? new Date(a.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</span>
                          </div>
                          {a.comentario && (
                            <p className="text-text-secondary italic truncate">{a.comentario}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <span className="text-4xl block mb-3">🧑‍✈️</span>
              <p className="font-sans font-medium text-text-primary text-sm">Nenhum motorista cadastrado</p>
              <p className="text-xs text-text-muted mt-1">Adicione motoristas em Cadastros → Motoristas</p>
            </div>
          )}
        </div>
      )}

      {/* Modal: avaliar transportadora */}
      {modalContratoId && modalContratoData && (
        <AvalModal
          title="Avaliar transportadora"
          subtitle={modalContratoData.transportadora_nome ?? 'Transportadora'}
          onClose={() => setModalContratoId(null)}
          onSave={(nota, comentario) => salvarAvaliacaoTransportadora(modalContratoId, nota, comentario)}
        />
      )}

      {/* Modal: avaliar motorista */}
      {modalMotoristId && modalMotoristData && (
        <AvalModal
          title="Avaliar motorista"
          subtitle={modalMotoristData.nome}
          onClose={() => setModalMotoristId(null)}
          onSave={(nota, comentario, periodo) => salvarAvaliacaoMotorista(modalMotoristId, nota, comentario, periodo)}
          showPeriodo
        />
      )}
    </div>
  )
}
