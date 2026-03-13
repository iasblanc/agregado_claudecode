'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Star, Loader2 } from 'lucide-react'

// ── Quesitos fiel ao HTML de referência ───────────────────────────────────────
const QUESITOS_TRANS = [
  { key: 'pontualidade',  label: 'Pontualidade nas viagens',         desc: 'Cumprimento de horários de coleta e entrega' },
  { key: 'cuidado',       label: 'Cuidado com a carga',              desc: 'Zelo no manuseio e conservação das mercadorias' },
  { key: 'comunicacao',   label: 'Comunicação e responsividade',     desc: 'Facilidade de contato, atualizações em rota' },
  { key: 'veiculo',       label: 'Conservação do veículo',           desc: 'Manutenção em dia, apresentação do equipamento' },
  { key: 'documentos',    label: 'Conformidade documental',          desc: 'Documentos sempre atualizados e em ordem' },
  { key: 'postura',       label: 'Postura profissional',             desc: 'Comportamento, relação com clientes e equipe' },
  { key: 'prazos',        label: 'Cumprimento de prazos e contratos', desc: 'Respeito aos acordos firmados no contrato' },
]

const QUESITOS_AGRE = [
  { key: 'pagamento',      label: 'Pontualidade nos pagamentos',      desc: 'Frete e adiantamentos pagos no prazo acordado' },
  { key: 'instrucoes',     label: 'Clareza nas instruções de rota',   desc: 'Informações de coleta, entrega e procedimentos' },
  { key: 'suporte',        label: 'Suporte em viagem',                desc: 'Atendimento em casos de dificuldade na rota' },
  { key: 'respeito',       label: 'Respeito e tratamento',            desc: 'Relação ética e respeitosa com o motorista' },
  { key: 'contrato',       label: 'Condições do contrato',            desc: 'Fidelidade às condições acordadas' },
  { key: 'equipamento',    label: 'Qualidade do equipamento fornecido', desc: 'Quando aplicável — estado e manutenção do equip.' },
  { key: 'reconhecimento', label: 'Reconhecimento e valorização',     desc: 'Feedback positivo e parceria de longo prazo' },
]

type SubTab = 'encerrados' | 'recebidas' | 'feitas'

interface ContratoEncerrado {
  id: string
  agregado_id: string
  vaga_id: string
  perfil?: { nome: string | null }
  vaga?: { rota_origem: string | null; rota_destino: string | null }
  data_inicio: string | null
  data_fim_prevista: string | null
}

interface Avaliacao {
  id: string
  candidatura_id: string
  avaliador_id: string
  avaliado_id: string
  nota: number
  comentario: string | null
  created_at: string
  notas_quesitos?: Record<string, number>
  avaliado_perfil?: { nome: string | null }
  avaliador_perfil?: { nome: string | null }
}

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-text-secondary flex-1">{label}</span>
      <div className="flex gap-1">
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

export default function AvaliacoesPage() {
  const router = useRouter()
  const [subTab, setSubTab] = useState<SubTab>('encerrados')
  const [encerrados, setEncerrados] = useState<ContratoEncerrado[]>([])
  const [recebidas, setRecebidas] = useState<Avaliacao[]>([])
  const [feitas, setFeitas] = useState<Avaliacao[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string>('')

  // Form state for avaliation
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

    // Contratos encerrados aguardando avaliação
    const { data: contratoEnc } = await supabase
      .from('contratos_motorista')
      .select('id, agregado_id, vaga_id, data_inicio, data_fim_prevista, perfil:profiles!agregado_id(nome), vaga:vagas(rota_origem, rota_destino)')
      .eq('transportadora_id', user.id)
      .eq('status', 'encerrado')

    setEncerrados((contratoEnc as unknown as ContratoEncerrado[]) ?? [])

    // Avaliações recebidas (avaliado = eu como transportadora)
    const { data: avsReceb } = await supabase
      .from('avaliacoes')
      .select('*, avaliador_perfil:profiles!avaliador_id(nome)')
      .eq('avaliado_id', user.id)

    setRecebidas((avsReceb as unknown as Avaliacao[]) ?? [])

    // Avaliações feitas (avaliador = eu)
    const { data: avsFeitas } = await supabase
      .from('avaliacoes')
      .select('*, avaliado_perfil:profiles!avaliado_id(nome)')
      .eq('avaliador_id', user.id)

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
      avaliado_id: contrato.agregado_id,
      nota: Math.round(notaMedia),
      comentario: avalComent[contrato.id]?.trim() || null,
      candidatura_id: contrato.id, // using contrato id as ref
    })

    if (!error) {
      setEnviados(prev => new Set([...prev, contrato.id]))
      await fetchData()
    }
    setEnviando(null)
  }

  // Media geral das notas recebidas
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
          { key: 'encerrados', label: 'Avaliar contratos encerrados', count: encerrados.length - enviados.size },
          { key: 'recebidas', label: 'Avaliações recebidas' },
          { key: 'feitas', label: 'Minhas avaliações' },
        ] as const).map(t => (
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
            {t.count !== undefined && t.count > 0 && (
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
                Avalie os agregados ao final do contrato. As avaliações são divididas por quesitos e ficam visíveis no perfil deles.
              </p>
              {encerrados.length === 0 ? (
                <div className="bg-surface border border-border rounded-xl p-8 text-center">
                  <Star size={32} className="text-text-muted mx-auto mb-3" />
                  <p className="font-medium text-text-secondary">Nenhum contrato aguardando avaliação</p>
                </div>
              ) : (
                encerrados.map(c => {
                  if (enviados.has(c.id)) return null
                  const nome = c.perfil?.nome ?? 'Motorista'
                  const rota = c.vaga ? `${c.vaga.rota_origem ?? ''} → ${c.vaga.rota_destino ?? ''}` : '—'
                  const periodo = [
                    c.data_inicio ? new Date(c.data_inicio).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : null,
                    c.data_fim_prevista ? new Date(c.data_fim_prevista).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : null,
                  ].filter(Boolean).join(' – ')

                  return (
                    <div key={c.id} className="bg-surface border border-border rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-[#E0DAD0] border border-border flex items-center justify-center font-serif text-sm font-semibold text-text-secondary">
                          {nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary">{nome}</p>
                          <p className="text-xs text-text-muted">{rota}{periodo ? ` · ${periodo}` : ''}</p>
                        </div>
                      </div>

                      <div className="space-y-0 bg-bg rounded-xl border border-border px-4 py-2 mb-4">
                        {QUESITOS_TRANS.map(q => (
                          <StarRow
                            key={q.key}
                            label={q.label}
                            value={avalNotas[c.id]?.[q.key] ?? 0}
                            onChange={n => setAvalNotas(prev => ({
                              ...prev,
                              [c.id]: { ...prev[c.id], [q.key]: n },
                            }))}
                          />
                        ))}
                      </div>

                      <textarea
                        placeholder="Comentário sobre o motorista/empresa (opcional)"
                        rows={3}
                        value={avalComent[c.id] ?? ''}
                        onChange={e => setAvalComent(prev => ({ ...prev, [c.id]: e.target.value }))}
                        className="w-full border border-border bg-bg rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50 mb-3"
                      />

                      <button
                        onClick={() => enviarAvaliacao(c)}
                        disabled={enviando === c.id}
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
                  {/* Nota geral */}
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
                            {a.avaliador_perfil?.nome ?? 'Motorista'}
                          </p>
                          <p className="text-xs text-text-muted">
                            {new Date(a.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <StarsDisplay value={a.nota} />
                      </div>
                      {a.comentario && (
                        <p className="text-sm text-text-secondary italic mt-1">"{a.comentario}"</p>
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
                feitas.map(a => (
                  <div key={a.id} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-medium text-text-primary text-sm">
                          Para: {a.avaliado_perfil?.nome ?? 'Motorista'}
                        </p>
                        <p className="text-xs text-text-muted">
                          {new Date(a.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <StarsDisplay value={a.nota} />
                    </div>
                    {a.comentario && (
                      <p className="text-sm text-text-secondary italic mt-1">"{a.comentario}"</p>
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
