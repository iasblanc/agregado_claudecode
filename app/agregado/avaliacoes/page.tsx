'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Star, Loader2 } from 'lucide-react'

// ── Quesitos: Agregado avalia Transportadora ──────────────────────────────────

const QUESITOS_TRANS = [
  { key: 'pagamento',      label: 'Pontualidade nos pagamentos',       desc: 'Frete e adiantamentos pagos no prazo acordado' },
  { key: 'instrucoes',     label: 'Clareza nas instruções de rota',    desc: 'Informações de coleta, entrega e procedimentos' },
  { key: 'suporte',        label: 'Suporte em viagem',                 desc: 'Atendimento em casos de dificuldade na rota' },
  { key: 'respeito',       label: 'Respeito e tratamento',             desc: 'Relação ética e respeitosa com o motorista' },
  { key: 'contrato',       label: 'Condições do contrato',             desc: 'Fidelidade às condições acordadas' },
  { key: 'equipamento',    label: 'Qualidade do equipamento fornecido', desc: 'Estado e manutenção do implemento (quando aplicável)' },
  { key: 'reconhecimento', label: 'Reconhecimento e valorização',      desc: 'Feedback positivo e parceria de longo prazo' },
]

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ContratoEncerrado {
  id: string
  transportadora_id: string
  vaga_id: string
  candidatura_id: string | null
  data_inicio: string | null
  data_fim_prevista: string | null
  transportadora?: { razao_social: string | null }
  vaga?: { rota_origem: string | null; rota_destino: string | null }
}

interface Avaliacao {
  id: string
  contrato_id: string | null
  avaliador_id: string
  avaliado_id: string
  tipo_avaliado: string | null
  nota: number
  notas_quesitos: Record<string, number> | null
  comentario: string | null
  created_at: string
  avaliador_perfil?: { nome: string | null }
}

// ── Componentes ───────────────────────────────────────────────────────────────

function StarRow({
  label, desc, value, onChange,
}: { label: string; desc: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="py-2.5 border-b border-border last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary font-medium leading-tight">{label}</p>
          <p className="text-[11px] text-text-muted leading-tight mt-0.5">{desc}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" onClick={() => onChange(n)} className="p-0.5 transition-transform hover:scale-110">
              <Star size={20} className={n <= value ? 'text-warning fill-warning' : 'text-border'} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function StarsDisplay({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={size} className={n <= Math.round(value) ? 'text-warning fill-warning' : 'text-border'} />
      ))}
    </div>
  )
}

function QuesitosBreakdown({ notas }: { notas: Record<string, number> }) {
  if (!notas || Object.keys(notas).length === 0) return null
  return (
    <div className="mt-2 space-y-1">
      {QUESITOS_TRANS.filter(q => notas[q.key] !== undefined).map(q => (
        <div key={q.key} className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted flex-1">{q.label}</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} size={12} className={n <= notas[q.key] ? 'text-warning fill-warning' : 'text-border'} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

type SubTab = 'encerrados' | 'recebidas' | 'feitas'

export default function AvaliacoesAgregadoPage() {
  const router = useRouter()
  const [subTab, setSubTab] = useState<SubTab>('encerrados')
  const [encerrados, setEncerrados] = useState<ContratoEncerrado[]>([])
  const [recebidas, setRecebidas] = useState<Avaliacao[]>([])
  const [feitas, setFeitas] = useState<Avaliacao[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string>('')

  const [avalNotas, setAvalNotas] = useState<Record<string, Record<string, number>>>({})
  const [avalComent, setAvalComent] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState<string | null>(null)
  const [enviados, setEnviados] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    setUserId(user.id)

    // Contratos encerrados deste agregado
    const { data: contratoEnc } = await supabase
      .from('contratos_motorista')
      .select(`
        id, transportadora_id, vaga_id, candidatura_id, data_inicio, data_fim_prevista,
        transportadora:transportadoras(razao_social),
        vaga:vagas(rota_origem, rota_destino)
      `)
      .eq('agregado_id', user.id)
      .eq('status', 'encerrado')
      .order('data_fim_prevista', { ascending: false })

    setEncerrados((contratoEnc as unknown as ContratoEncerrado[]) ?? [])

    // Avaliações que recebi (avaliado = eu)
    const { data: avsReceb } = await supabase
      .from('avaliacoes')
      .select('*, avaliador_perfil:profiles!avaliador_id(nome)')
      .eq('avaliado_id', user.id)
      .order('created_at', { ascending: false })
    setRecebidas((avsReceb as unknown as Avaliacao[]) ?? [])

    // Avaliações que fiz (avaliador = eu)
    const { data: avsFeitas } = await supabase
      .from('avaliacoes')
      .select('*')
      .eq('avaliador_id', user.id)
      .order('created_at', { ascending: false })
    setFeitas((avsFeitas as unknown as Avaliacao[]) ?? [])

    setLoading(false)
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  async function enviarAvaliacao(contrato: ContratoEncerrado) {
    const notas = avalNotas[contrato.id] ?? {}
    if (Object.keys(notas).length < QUESITOS_TRANS.length) {
      alert('Avalie todos os quesitos antes de enviar.')
      return
    }
    const notaMedia = Object.values(notas).reduce((a, b) => a + b, 0) / Object.keys(notas).length

    setEnviando(contrato.id)
    const supabase = createClient()
    const { error } = await supabase.from('avaliacoes').insert({
      avaliador_id: userId,
      avaliado_id: contrato.transportadora_id,
      tipo_avaliado: 'transportadora',
      nota: Math.round(notaMedia),
      notas_quesitos: notas,
      comentario: avalComent[contrato.id]?.trim() || null,
      contrato_id: contrato.id,
      candidatura_id: contrato.candidatura_id ?? null,
    })

    if (!error) {
      setEnviados(prev => new Set([...prev, contrato.id]))
    }
    setEnviando(null)
  }

  const notaGeral = recebidas.length
    ? recebidas.reduce((sum, a) => sum + a.nota, 0) / recebidas.length
    : 0

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans">Reputação</p>
        <h1 className="font-serif text-2xl font-bold text-text-primary">Avaliações</h1>
      </div>

      {/* Sub-tabs */}
      <div className="flex overflow-x-auto border-b border-border gap-0">
        {([
          { key: 'encerrados' as const, label: 'Avaliar transportadoras', count: encerrados.filter(c => !enviados.has(c.id)).length },
          { key: 'recebidas' as const, label: 'Avaliações recebidas', count: 0 },
          { key: 'feitas' as const, label: 'Minhas avaliações', count: 0 },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
              subTab === t.key
                ? 'border-accent text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="bg-warning-light text-warning text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-text-muted" />
        </div>
      ) : (
        <>
          {/* AVALIAR TRANSPORTADORAS */}
          {subTab === 'encerrados' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Avalie as transportadoras ao final de cada contrato. As avaliações são divididas por quesitos e ficam visíveis nos perfis.
              </p>
              {encerrados.length === 0 ? (
                <div className="bg-surface border border-border rounded-xl p-8 text-center">
                  <Star size={32} className="text-text-muted mx-auto mb-3" />
                  <p className="font-medium text-text-secondary">Nenhum contrato encerrado para avaliar</p>
                </div>
              ) : (
                encerrados.map(c => {
                  if (enviados.has(c.id)) return null
                  const razao = (c.transportadora as { razao_social: string | null } | undefined)?.razao_social ?? 'Transportadora'
                  const rota = c.vaga ? `${c.vaga.rota_origem ?? ''} → ${c.vaga.rota_destino ?? ''}` : '—'
                  const periodo = [
                    c.data_inicio ? new Date(c.data_inicio).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : null,
                    c.data_fim_prevista ? new Date(c.data_fim_prevista).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : null,
                  ].filter(Boolean).join(' – ')

                  return (
                    <div key={c.id} className="bg-surface border border-border rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-[#E0DAD0] border border-border flex items-center justify-center font-serif text-sm font-semibold text-text-secondary">
                          {razao.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary">{razao}</p>
                          <p className="text-xs text-text-muted">{rota}{periodo ? ` · ${periodo}` : ''}</p>
                        </div>
                      </div>

                      <div className="space-y-0 bg-bg rounded-xl border border-border px-4 py-2 mb-4">
                        {QUESITOS_TRANS.map(q => (
                          <StarRow
                            key={q.key}
                            label={q.label}
                            desc={q.desc}
                            value={avalNotas[c.id]?.[q.key] ?? 0}
                            onChange={n => setAvalNotas(prev => ({
                              ...prev,
                              [c.id]: { ...prev[c.id], [q.key]: n },
                            }))}
                          />
                        ))}
                      </div>

                      <textarea
                        placeholder="Comentário sobre a transportadora (opcional)"
                        rows={3}
                        value={avalComent[c.id] ?? ''}
                        onChange={e => setAvalComent(prev => ({ ...prev, [c.id]: e.target.value }))}
                        className="w-full border border-border bg-bg rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50 mb-3"
                      />

                      <button
                        onClick={() => enviarAvaliacao(c)}
                        disabled={
                          enviando === c.id ||
                          Object.keys(avalNotas[c.id] ?? {}).length < QUESITOS_TRANS.length
                        }
                        className="w-full bg-accent text-bg rounded-pill py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {enviando === c.id ? 'Enviando...' : 'Enviar avaliação →'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* RECEBIDAS */}
          {subTab === 'recebidas' && (
            <div className="space-y-4">
              {recebidas.length === 0 ? (
                <div className="bg-surface border border-border rounded-xl p-8 text-center">
                  <Star size={32} className="text-text-muted mx-auto mb-3" />
                  <p className="font-medium text-text-secondary">Nenhuma avaliação recebida ainda</p>
                </div>
              ) : (
                <>
                  <div className="bg-surface border border-border rounded-xl p-5 flex items-center gap-6">
                    <div className="text-center">
                      <p className="font-serif text-5xl font-bold text-text-primary">{notaGeral.toFixed(1)}</p>
                      <StarsDisplay value={notaGeral} size={18} />
                      <p className="text-xs text-text-muted mt-1">
                        média geral · {recebidas.length} avaliação{recebidas.length !== 1 ? 'ões' : ''}
                      </p>
                    </div>
                  </div>

                  {recebidas.map(a => {
                    const quesitos = a.tipo_avaliado === 'motorista'
                      ? [
                          { key: 'pontualidade', label: 'Pontualidade' },
                          { key: 'direcao', label: 'Habilidade de direção' },
                          { key: 'cuidado', label: 'Cuidado com a carga' },
                          { key: 'comunicacao', label: 'Comunicação' },
                          { key: 'documentos', label: 'Conformidade documental' },
                          { key: 'postura', label: 'Postura profissional' },
                          { key: 'produtividade', label: 'Produtividade' },
                        ]
                      : [
                          { key: 'pontualidade', label: 'Pontualidade' },
                          { key: 'cuidado', label: 'Cuidado com a carga' },
                          { key: 'comunicacao', label: 'Comunicação' },
                          { key: 'veiculo', label: 'Conservação do veículo' },
                          { key: 'documentos', label: 'Conformidade documental' },
                          { key: 'postura', label: 'Postura profissional' },
                          { key: 'prazos', label: 'Cumprimento de prazos' },
                        ]
                    const tipoLabel = a.tipo_avaliado === 'motorista' ? 'Motorista' : 'Empresa agregada'

                    return (
                      <div key={a.id} className="bg-surface border border-border rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <p className="font-medium text-text-primary text-sm">
                              {a.avaliador_perfil?.nome ?? 'Transportadora'}
                            </p>
                            <p className="text-[11px] text-text-muted">
                              {tipoLabel} · {new Date(a.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="text-right">
                            <StarsDisplay value={a.nota} />
                            <p className="text-[10px] text-text-muted mt-0.5">{a.nota.toFixed(1)} / 5</p>
                          </div>
                        </div>
                        {a.notas_quesitos && Object.keys(a.notas_quesitos).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {quesitos.filter(q => a.notas_quesitos![q.key] !== undefined).map(q => (
                              <div key={q.key} className="flex items-center gap-2">
                                <span className="text-[11px] text-text-muted flex-1">{q.label}</span>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map(n => (
                                    <Star key={n} size={12} className={n <= a.notas_quesitos![q.key] ? 'text-warning fill-warning' : 'text-border'} />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {a.comentario && (
                          <p className="text-sm text-text-secondary italic mt-2">"{a.comentario}"</p>
                        )}
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )}

          {/* FEITAS */}
          {subTab === 'feitas' && (
            <div className="space-y-4">
              {feitas.length === 0 ? (
                <div className="bg-surface border border-border rounded-xl p-8 text-center">
                  <Star size={32} className="text-text-muted mx-auto mb-3" />
                  <p className="font-medium text-text-secondary">Nenhuma avaliação enviada ainda</p>
                </div>
              ) : (
                feitas.map(a => (
                  <div key={a.id} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-medium text-text-primary text-sm">Transportadora avaliada</p>
                        <p className="text-xs text-text-muted">
                          {new Date(a.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <StarsDisplay value={a.nota} />
                        <p className="text-[10px] text-text-muted mt-0.5">{a.nota.toFixed(1)} / 5</p>
                      </div>
                    </div>
                    {a.notas_quesitos && Object.keys(a.notas_quesitos).length > 0 && (
                      <QuesitosBreakdown notas={a.notas_quesitos} />
                    )}
                    {a.comentario && (
                      <p className="text-sm text-text-secondary italic mt-2">"{a.comentario}"</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
