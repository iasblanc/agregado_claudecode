'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Star, Loader2, User, Truck } from 'lucide-react'

// ── Quesitos por tipo de avaliado ─────────────────────────────────────────────

const QUESITOS_AGREGADO = [
  { key: 'pontualidade',  label: 'Pontualidade nas viagens',          desc: 'Cumprimento de horários de coleta e entrega' },
  { key: 'cuidado',       label: 'Cuidado com a carga',               desc: 'Zelo no manuseio e conservação das mercadorias' },
  { key: 'comunicacao',   label: 'Comunicação e responsividade',      desc: 'Facilidade de contato, atualizações em rota' },
  { key: 'veiculo',       label: 'Conservação do veículo',            desc: 'Manutenção em dia, apresentação do equipamento' },
  { key: 'documentos',    label: 'Conformidade documental',           desc: 'Documentos sempre atualizados e em ordem' },
  { key: 'postura',       label: 'Postura profissional',              desc: 'Comportamento, relação com clientes e equipe' },
  { key: 'prazos',        label: 'Cumprimento de prazos e contratos', desc: 'Respeito aos acordos firmados no contrato' },
]

const QUESITOS_MOTORISTA = [
  { key: 'pontualidade',  label: 'Pontualidade nas viagens',          desc: 'Horários de coleta, entrega e escalas' },
  { key: 'direcao',       label: 'Habilidade de direção',             desc: 'Condução segura e econômica do veículo' },
  { key: 'cuidado',       label: 'Cuidado com a carga',               desc: 'Manuseio adequado, sem avarias' },
  { key: 'comunicacao',   label: 'Comunicação',                       desc: 'Clareza nos reportes e resposta a chamados' },
  { key: 'documentos',    label: 'Conformidade documental',           desc: 'CNH, documentos do veículo e viagem em dia' },
  { key: 'postura',       label: 'Postura profissional',              desc: 'Apresentação e trato com clientes/equipe' },
  { key: 'produtividade', label: 'Produtividade e comprometimento',   desc: 'Cumprimento de metas e entregas' },
]

// ── Tipos ─────────────────────────────────────────────────────────────────────

type AvalTab = 'encerrados' | 'recebidas' | 'feitas'
type TipoAval = 'agregado' | 'motorista'

interface Motorista {
  id: string
  nome: string
}

interface ContratoEncerrado {
  id: string
  agregado_id: string
  vaga_id: string
  candidatura_id: string | null
  perfil?: { nome: string | null }
  vaga?: { rota_origem: string | null; rota_destino: string | null }
  data_inicio: string | null
  data_fim_prevista: string | null
  motoristas_list?: Motorista[]
}

interface Avaliacao {
  id: string
  contrato_id: string | null
  avaliador_id: string
  avaliado_id: string
  motorista_id: string | null
  tipo_avaliado: string | null
  nota: number
  notas_quesitos: Record<string, number> | null
  comentario: string | null
  created_at: string
  avaliado_perfil?: { nome: string | null }
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
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                size={20}
                className={n <= value ? 'text-warning fill-warning' : 'text-border'}
              />
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
        <Star
          key={n}
          size={size}
          className={n <= Math.round(value) ? 'text-warning fill-warning' : 'text-border'}
        />
      ))}
    </div>
  )
}

function QuesitosBreakdown({ notas, quesitos }: { notas: Record<string, number>; quesitos: typeof QUESITOS_AGREGADO }) {
  if (!notas || Object.keys(notas).length === 0) return null
  return (
    <div className="mt-2 space-y-1">
      {quesitos.filter(q => notas[q.key] !== undefined).map(q => (
        <div key={q.key} className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted flex-1">{q.label}</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <Star
                key={n}
                size={12}
                className={n <= notas[q.key] ? 'text-warning fill-warning' : 'text-border'}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Bloco de avaliação de um contrato ──────────────────────────────────────────

function AvaliacaoBlock({
  contrato,
  tipoAval,
  quesitos,
  notas,
  comentario,
  onChangeNota,
  onChangeComent,
  onEnviar,
  enviando,
  enviados,
}: {
  contrato: ContratoEncerrado
  tipoAval: TipoAval
  quesitos: typeof QUESITOS_AGREGADO
  notas: Record<string, number>
  comentario: string
  onChangeNota: (key: string, val: number) => void
  onChangeComent: (val: string) => void
  onEnviar: () => void
  enviando: boolean
  enviados: boolean
}) {
  const allFilled = Object.keys(notas).length >= quesitos.length
  const label = tipoAval === 'agregado' ? 'Empresa agregada' : 'Motorista'

  return (
    <div className="bg-bg rounded-xl border border-border px-4 py-2 mb-4">
      <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans mb-2 pt-2">{label}</p>
      {quesitos.map(q => (
        <StarRow
          key={q.key}
          label={q.label}
          desc={q.desc}
          value={notas[q.key] ?? 0}
          onChange={val => onChangeNota(q.key, val)}
        />
      ))}
      <div className="pt-3 pb-2">
        <textarea
          placeholder={`Comentário sobre o ${tipoAval === 'agregado' ? 'agregado' : 'motorista'} (opcional)`}
          rows={2}
          value={comentario}
          onChange={e => onChangeComent(e.target.value)}
          className="w-full border border-border bg-surface rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
      </div>
      <button
        onClick={onEnviar}
        disabled={enviando || enviados || !allFilled}
        className="w-full bg-accent text-bg rounded-pill py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 mb-2"
      >
        {enviados ? '✓ Enviado' : enviando ? 'Enviando...' : `Enviar avaliação do ${tipoAval === 'agregado' ? 'agregado' : 'motorista'} →`}
      </button>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AvaliacoesPage() {
  const router = useRouter()
  const [subTab, setSubTab] = useState<AvalTab>('encerrados')
  const [encerrados, setEncerrados] = useState<ContratoEncerrado[]>([])
  const [recebidas, setRecebidas] = useState<Avaliacao[]>([])
  const [feitas, setFeitas] = useState<Avaliacao[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string>('')

  // State: notas[contratoId][tipo][key] e coment[contratoId][tipo]
  const [avalNotas, setAvalNotas] = useState<Record<string, Record<TipoAval, Record<string, number>>>>({})
  const [avalComent, setAvalComent] = useState<Record<string, Record<TipoAval, string>>>({})
  const [enviando, setEnviando] = useState<string | null>(null)
  const [enviados, setEnviados] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    setUserId(user.id)

    // Contratos encerrados desta transportadora
    const { data: contratoEnc } = await supabase
      .from('contratos_motorista')
      .select(`
        id, agregado_id, vaga_id, candidatura_id, data_inicio, data_fim_prevista,
        perfil:profiles!agregado_id(nome),
        vaga:vagas(rota_origem, rota_destino)
      `)
      .eq('transportadora_id', user.id)
      .eq('status', 'encerrado')
      .order('data_fim_prevista', { ascending: false })

    // Para cada contrato encerrado, buscar motoristas do agregado
    const contratosEnc = (contratoEnc as unknown as ContratoEncerrado[]) ?? []
    for (const c of contratosEnc) {
      const { data: mots } = await supabase
        .from('motoristas')
        .select('id, nome')
        .eq('agregado_id', c.agregado_id)
      c.motoristas_list = (mots ?? []) as Motorista[]
    }
    setEncerrados(contratosEnc)

    // Avaliações recebidas (avaliado = eu como transportadora)
    const { data: avsReceb } = await supabase
      .from('avaliacoes')
      .select('*, avaliador_perfil:profiles!avaliador_id(nome)')
      .eq('avaliado_id', user.id)
      .order('created_at', { ascending: false })
    setRecebidas((avsReceb as unknown as Avaliacao[]) ?? [])

    // Avaliações feitas (avaliador = eu)
    const { data: avsFeitas } = await supabase
      .from('avaliacoes')
      .select('*, avaliado_perfil:profiles!avaliado_id(nome)')
      .eq('avaliador_id', user.id)
      .order('created_at', { ascending: false })
    setFeitas((avsFeitas as unknown as Avaliacao[]) ?? [])

    setLoading(false)
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  function setNota(contratoId: string, tipo: TipoAval, key: string, val: number) {
    setAvalNotas(prev => ({
      ...prev,
      [contratoId]: {
        ...prev[contratoId],
        [tipo]: { ...prev[contratoId]?.[tipo], [key]: val },
      },
    }))
  }

  function setComent(contratoId: string, tipo: TipoAval, val: string) {
    setAvalComent(prev => ({
      ...prev,
      [contratoId]: { ...prev[contratoId], [tipo]: val },
    }))
  }

  async function enviar(contrato: ContratoEncerrado, tipo: TipoAval, motorista?: Motorista) {
    const quesitos = tipo === 'agregado' ? QUESITOS_AGREGADO : QUESITOS_MOTORISTA
    const notas = avalNotas[contrato.id]?.[tipo] ?? {}
    if (Object.keys(notas).length < quesitos.length) {
      alert('Avalie todos os quesitos antes de enviar.')
      return
    }
    const notaMedia = Object.values(notas).reduce((a, b) => a + b, 0) / Object.keys(notas).length
    const key = `${contrato.id}_${tipo}${motorista ? `_${motorista.id}` : ''}`

    setEnviando(key)
    const supabase = createClient()
    await supabase.from('avaliacoes').insert({
      avaliador_id: userId,
      avaliado_id: contrato.agregado_id,
      tipo_avaliado: tipo,
      motorista_id: motorista?.id ?? null,
      nota: Math.round(notaMedia),
      notas_quesitos: notas,
      comentario: avalComent[contrato.id]?.[tipo]?.trim() || null,
      contrato_id: contrato.id,
      candidatura_id: contrato.candidatura_id ?? null,
    })
    setEnviados(prev => new Set([...prev, key]))
    setEnviando(null)
  }

  const notaGeral = recebidas.length
    ? recebidas.reduce((sum, a) => sum + a.nota, 0) / recebidas.length
    : 0

  // Agrupa feitas por contrato para exibição
  const feitasAgrupadas = feitas.reduce<Record<string, Avaliacao[]>>((acc, a) => {
    const key = a.contrato_id ?? a.id
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans">Reputação</p>
        <h1 className="font-serif text-2xl font-bold text-text-primary">Avaliações</h1>
      </div>

      {/* Sub-tabs */}
      <div className="flex overflow-x-auto border-b border-border gap-0">
        {([
          { key: 'encerrados' as const, label: 'Avaliar contratos encerrados', count: encerrados.length },
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
          {/* ENCERRADOS */}
          {subTab === 'encerrados' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Avalie o agregado e, separadamente, cada motorista ao final do contrato. As avaliações são divididas por quesitos e ficam visíveis nos perfis.
              </p>
              {encerrados.length === 0 ? (
                <div className="bg-surface border border-border rounded-xl p-8 text-center">
                  <Star size={32} className="text-text-muted mx-auto mb-3" />
                  <p className="font-medium text-text-secondary">Nenhum contrato encerrado encontrado</p>
                </div>
              ) : (
                encerrados.map(c => {
                  const nome = c.perfil?.nome ?? 'Agregado'
                  const rota = c.vaga ? `${c.vaga.rota_origem ?? ''} → ${c.vaga.rota_destino ?? ''}` : '—'
                  const periodo = [
                    c.data_inicio ? new Date(c.data_inicio).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : null,
                    c.data_fim_prevista ? new Date(c.data_fim_prevista).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : null,
                  ].filter(Boolean).join(' – ')

                  const keyAgregado = `${c.id}_agregado`
                  const jaEnviouAgregado = enviados.has(keyAgregado)

                  return (
                    <div key={c.id} className="bg-surface border border-border rounded-xl p-5">
                      {/* Header do contrato */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-[#E0DAD0] border border-border flex items-center justify-center font-serif text-sm font-semibold text-text-secondary">
                          {nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary">{nome}</p>
                          <p className="text-xs text-text-muted">{rota}{periodo ? ` · ${periodo}` : ''}</p>
                        </div>
                      </div>

                      {/* Avaliação do AGREGADO */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Truck size={14} className="text-text-muted" />
                          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                            Avaliação da empresa agregada
                          </p>
                        </div>
                        <AvaliacaoBlock
                          contrato={c}
                          tipoAval="agregado"
                          quesitos={QUESITOS_AGREGADO}
                          notas={avalNotas[c.id]?.agregado ?? {}}
                          comentario={avalComent[c.id]?.agregado ?? ''}
                          onChangeNota={(key, val) => setNota(c.id, 'agregado', key, val)}
                          onChangeComent={val => setComent(c.id, 'agregado', val)}
                          onEnviar={() => enviar(c, 'agregado')}
                          enviando={enviando === keyAgregado}
                          enviados={jaEnviouAgregado}
                        />
                      </div>

                      {/* Avaliação de cada MOTORISTA */}
                      {c.motoristas_list && c.motoristas_list.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <User size={14} className="text-text-muted" />
                            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                              Avaliação dos motoristas
                            </p>
                          </div>
                          {c.motoristas_list.map(mot => {
                            const keyMot = `${c.id}_motorista_${mot.id}`
                            const jaEnviouMot = enviados.has(keyMot)
                            return (
                              <div key={mot.id}>
                                <p className="text-sm font-medium text-text-primary mb-2">
                                  {mot.nome}
                                </p>
                                <AvaliacaoBlock
                                  contrato={c}
                                  tipoAval="motorista"
                                  quesitos={QUESITOS_MOTORISTA}
                                  notas={avalNotas[c.id]?.motorista ?? {}}
                                  comentario={avalComent[c.id]?.motorista ?? ''}
                                  onChangeNota={(key, val) => setNota(c.id, 'motorista', key, val)}
                                  onChangeComent={val => setComent(c.id, 'motorista', val)}
                                  onEnviar={() => enviar(c, 'motorista', mot)}
                                  enviando={enviando === keyMot}
                                  enviados={jaEnviouMot}
                                />
                              </div>
                            )
                          })}
                        </div>
                      )}
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

                  {recebidas.map(a => (
                    <div key={a.id} className="bg-surface border border-border rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="font-medium text-text-primary text-sm">
                            {a.avaliador_perfil?.nome ?? 'Agregado'}
                          </p>
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
                        <QuesitosBreakdown notas={a.notas_quesitos} quesitos={QUESITOS_AGREGADO} />
                      )}
                      {a.comentario && (
                        <p className="text-sm text-text-secondary italic mt-2">"{a.comentario}"</p>
                      )}
                    </div>
                  ))}
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
                Object.entries(feitasAgrupadas).map(([groupKey, avals]) => (
                  <div key={groupKey} className="bg-surface border border-border rounded-xl p-4 space-y-3">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted font-sans">
                      Contrato encerrado
                    </p>
                    {avals.map(a => {
                      const tipoLabel = a.tipo_avaliado === 'motorista' ? 'Motorista' :
                                        a.tipo_avaliado === 'agregado' ? 'Agregado' : 'Avaliado'
                      const quesitos = a.tipo_avaliado === 'motorista' ? QUESITOS_MOTORISTA : QUESITOS_AGREGADO
                      return (
                        <div key={a.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <div>
                              <p className="font-medium text-text-primary text-sm">
                                {tipoLabel}: {a.avaliado_perfil?.nome ?? '—'}
                              </p>
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
                            <QuesitosBreakdown notas={a.notas_quesitos} quesitos={quesitos} />
                          )}
                          {a.comentario && (
                            <p className="text-sm text-text-secondary italic mt-2">"{a.comentario}"</p>
                          )}
                        </div>
                      )
                    })}
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
