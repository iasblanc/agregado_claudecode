'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, AlertCircle, FileText, ChevronDown, Send, Star } from 'lucide-react'
import Link from 'next/link'

type ContratoStatus = 'ativo' | 'suspenso' | 'encerrado'

interface Mensagem {
  id: string
  de: 'transportadora' | 'motorista'
  texto: string
  created_at: string
}

interface Ocorrencia {
  id: string
  tipo: string
  descricao: string
  created_at: string
}

interface ContratoRec {
  id: string
  status: string
  pipeline_status: string
  contrato_status: ContratoStatus
  created_at: string
  mensagem: string | null
  profile: { id: string; nome: string | null; telefone: string | null; cnpj?: string | null } | null
  vaga: {
    id: string
    rota_origem: string | null
    rota_destino: string | null
    tipo_veiculo: string | null
    tipo_equipamento: string | null
    valor_contrato: number | null
    km_estimado: number | null
    contrata_equipamento: boolean
  } | null
  mensagens: Mensagem[]
  ocorrencias: Ocorrencia[]
}

const TIPOS_OCORRENCIA = ['Atraso', 'Documentação', 'Avaria na carga', 'Acidente', 'Manutenção', 'Comunicação', 'Desvio de rota', 'Outros']

function statusBarColor(s: ContratoStatus) {
  if (s === 'ativo') return 'bg-success'
  if (s === 'suspenso') return 'bg-warning'
  return 'bg-text-muted'
}

function ocorrenciaColor(tipo: string) {
  if (tipo === 'Atraso' || tipo === 'Manutenção') return 'text-warning bg-warning/10 border-warning/30'
  if (tipo === 'Acidente' || tipo === 'Documentação') return 'text-danger bg-danger/10 border-danger/30'
  return 'text-info bg-info/10 border-info/30'
}

function initials(name: string | null) {
  if (!name) return 'M'
  const parts = name.trim().split(' ')
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function timelineColor(tipo: string) {
  if (tipo === 'Atraso' || tipo === 'Manutenção') return 'bg-warning'
  if (tipo === 'Acidente') return 'bg-danger'
  return 'bg-info'
}

// Contract accordion card
function ContratoCard({ contrato: initial, userId }: { contrato: ContratoRec; userId: string }) {
  const [contrato, setContrato] = useState(initial)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'detalhes' | 'mensagens' | 'timeline' | 'ocorrencias'>('detalhes')
  const [msgText, setMsgText] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [ocTipo, setOcTipo] = useState(TIPOS_OCORRENCIA[0])
  const [ocDesc, setOcDesc] = useState('')
  const [savingOc, setSavingOc] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const msgsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tab === 'mensagens') {
      setTimeout(() => msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [tab, open])

  async function sendMsg() {
    if (!msgText.trim()) return
    setSendingMsg(true)
    const texto = msgText.trim()
    setMsgText('')
    const optimistic: Mensagem = { id: Date.now().toString(), de: 'transportadora', texto, created_at: new Date().toISOString() }
    setContrato(c => ({ ...c, mensagens: [...c.mensagens, optimistic] }))
    try {
      const supabase = createClient()
      await supabase.from('contrato_mensagens').insert({ candidatura_id: contrato.id, de: 'transportadora', texto })
    } catch {
      // keep optimistic
    } finally {
      setSendingMsg(false)
      setTimeout(() => msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  async function registerOcorrencia() {
    if (!ocDesc.trim()) return
    setSavingOc(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('contrato_ocorrencias')
        .insert({ candidatura_id: contrato.id, tipo: ocTipo, descricao: ocDesc.trim() })
        .select()
        .single()
      if (error) throw error
      setContrato(c => ({ ...c, ocorrencias: [data as Ocorrencia, ...c.ocorrencias] }))
      setOcDesc('')
    } catch {
      alert('Erro ao registrar ocorrência')
    } finally {
      setSavingOc(false)
    }
  }

  async function toggleStatus() {
    const newStatus: ContratoStatus = contrato.contrato_status === 'ativo' ? 'suspenso' : 'ativo'
    setUpdatingStatus(true)
    try {
      const supabase = createClient()
      await supabase.from('candidaturas').update({ contrato_status: newStatus }).eq('id', contrato.id)
      setContrato(c => ({ ...c, contrato_status: newStatus }))
    } catch {
      alert('Erro ao atualizar status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const remunEstim = (contrato.vaga?.valor_contrato ?? 0)

  const timelineEvents = [
    { date: contrato.created_at, label: 'Contrato iniciado', color: 'bg-success', desc: 'Formalização concluída' },
    ...contrato.ocorrencias.map(oc => ({
      date: oc.created_at,
      label: oc.tipo,
      color: timelineColor(oc.tipo),
      desc: oc.descricao,
    })).reverse(),
  ]

  const tabs = [
    { id: 'detalhes', label: 'Detalhes' },
    { id: 'mensagens', label: `Mensagens${contrato.mensagens.length > 0 ? ` (${contrato.mensagens.length})` : ''}` },
    { id: 'timeline', label: 'Linha do tempo' },
    { id: 'ocorrencias', label: `Ocorrências${contrato.ocorrencias.length > 0 ? ` (${contrato.ocorrencias.length})` : ''}`, alert: contrato.ocorrencias.length > 0 },
  ] as const

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Card header */}
      <div className="flex">
        <div className={`w-1.5 flex-shrink-0 ${statusBarColor(contrato.contrato_status)}`} />
        <div className="flex-1 p-4">
          <button
            className="w-full flex items-center gap-3 text-left"
            onClick={() => setOpen(o => !o)}
          >
            <div className="w-9 h-9 rounded-full bg-accent/15 text-accent font-semibold flex items-center justify-center flex-shrink-0 text-sm">
              {initials(contrato.profile?.nome ?? null)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-primary truncate">{contrato.profile?.nome ?? 'Agregado'}</p>
              <p className="text-xs text-text-muted truncate">
                {contrato.vaga?.tipo_veiculo} · {contrato.vaga?.tipo_equipamento ?? 'Sem implemento'}
              </p>
              <p className="text-xs text-text-secondary truncate">
                {contrato.vaga?.rota_origem} → {contrato.vaga?.rota_destino}
                {contrato.vaga?.valor_contrato ? ` · R$ ${contrato.vaga.valor_contrato.toLocaleString('pt-BR')}/mês` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                contrato.contrato_status === 'ativo' ? 'bg-success/15 text-success border-success/30' :
                contrato.contrato_status === 'suspenso' ? 'bg-warning/15 text-warning border-warning/30' :
                'bg-border/50 text-text-muted border-border'
              }`}>
                {contrato.contrato_status}
              </span>
              <ChevronDown size={16} className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Quick actions */}
          <div className="flex gap-2 mt-3">
            {contrato.contrato_status !== 'encerrado' && (
              <button
                onClick={toggleStatus}
                disabled={updatingStatus}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  contrato.contrato_status === 'ativo'
                    ? 'border-warning/30 text-warning bg-warning/10 hover:bg-warning/15'
                    : 'border-success/30 text-success bg-success/10 hover:bg-success/15'
                }`}
              >
                {updatingStatus ? '...' : contrato.contrato_status === 'ativo' ? 'Suspender' : 'Reativar'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Accordion body */}
      {open && (
        <div className="border-t border-border">
          {/* Tabs */}
          <div className="flex gap-0 px-4 pt-3 border-b border-border overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as typeof tab)}
                className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.id ? 'border-accent text-text-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
                }`}
              >
                {t.label}
                {'alert' in t && t.alert && tab !== t.id && (
                  <span className="ml-1 w-1.5 h-1.5 inline-block rounded-full bg-warning align-middle" />
                )}
              </button>
            ))}
          </div>

          <div className="p-4">
            {/* Detalhes */}
            {tab === 'detalhes' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {[
                    ['Motorista', contrato.profile?.nome ?? '—'],
                    ['Telefone', contrato.profile?.telefone ?? '—'],
                    ['Veículo', contrato.vaga?.tipo_veiculo ?? '—'],
                    ['Implemento', contrato.vaga?.tipo_equipamento ?? '—'],
                    ['Rota', `${contrato.vaga?.rota_origem ?? '—'} → ${contrato.vaga?.rota_destino ?? '—'}`],
                    ['Remuneração', remunEstim > 0 ? `R$ ${remunEstim.toLocaleString('pt-BR')}/mês` : '—'],
                    ['Início', new Date(contrato.created_at).toLocaleDateString('pt-BR')],
                    ['Status', contrato.contrato_status],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-bg border border-border rounded-lg px-3 py-2.5">
                      <p className="text-[10px] text-text-muted uppercase tracking-wide">{label}</p>
                      <p className={`font-medium text-sm mt-0.5 ${label === 'Remuneração' ? 'text-success' : 'text-text-primary'}`}>{val}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => alert('Funcionalidade em breve')}
                    className="text-xs px-3 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg transition-colors">
                    📄 Ver contrato
                  </button>
                  <button onClick={() => alert('Funcionalidade em breve')}
                    className="text-xs px-3 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg transition-colors">
                    + Registrar viagem
                  </button>
                  {contrato.contrato_status !== 'encerrado' && (
                    <button onClick={() => alert('Funcionalidade em breve')}
                      className="text-xs px-3 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg transition-colors">
                      🔄 Renovar contrato
                    </button>
                  )}
                  {contrato.contrato_status === 'encerrado' && (
                    <Link href="/transportadora/avaliacoes">
                      <button className="text-xs px-3 py-2 rounded-lg bg-[#C8A84B]/15 border border-[#C8A84B]/30 text-[#C8A84B] hover:opacity-90 transition-opacity">
                        <Star size={11} className="inline mr-1" /> Avaliar agregado
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Mensagens */}
            {tab === 'mensagens' && (
              <div className="space-y-3">
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {contrato.mensagens.length === 0 && (
                    <p className="text-sm text-text-muted text-center py-6">Nenhuma mensagem ainda.</p>
                  )}
                  {contrato.mensagens.map(msg => (
                    <div key={msg.id} className={`flex ${msg.de === 'transportadora' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3 py-2 text-sm ${
                        msg.de === 'transportadora'
                          ? 'bg-text-primary text-bg rounded-[14px_14px_4px_14px]'
                          : 'bg-surface border border-border text-text-primary rounded-[14px_14px_14px_4px]'
                      }`}>
                        <p>{msg.texto}</p>
                        <p className={`text-[9px] mt-1 ${msg.de === 'transportadora' ? 'text-bg/60' : 'text-text-muted'}`}>
                          {msg.de === 'transportadora' ? 'Você' : 'Motorista'} · {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={msgsEndRef} />
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() } }}
                    placeholder="Escreva uma mensagem… (Enter para enviar)"
                    rows={2}
                    className="flex-1 px-3 py-2 text-sm bg-bg border border-border rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button onClick={sendMsg} disabled={sendingMsg || !msgText.trim()}
                    className="px-3 py-2 rounded-xl bg-accent text-bg disabled:opacity-40 hover:opacity-90 transition-opacity self-end">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Timeline */}
            {tab === 'timeline' && (
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
                {timelineEvents.map((ev, i) => (
                  <div key={i} className="relative">
                    <div className={`absolute -left-4 top-1.5 w-3 h-3 rounded-full border-2 border-surface ${ev.color}`} />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{ev.label}</p>
                      <p className="text-xs text-text-secondary">{ev.desc}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {new Date(ev.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ocorrências */}
            {tab === 'ocorrencias' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <select value={ocTipo} onChange={e => setOcTipo(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent">
                    {TIPOS_OCORRENCIA.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <input value={ocDesc} onChange={e => setOcDesc(e.target.value)}
                    placeholder="Descrição..."
                    className="flex-[2] px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent" />
                  <button onClick={registerOcorrencia} disabled={savingOc || !ocDesc.trim()}
                    className="px-3 py-2 rounded-lg bg-accent text-bg text-sm font-medium disabled:opacity-40">
                    {savingOc ? '...' : 'Registrar'}
                  </button>
                </div>
                {contrato.ocorrencias.length === 0 ? (
                  <p className="text-sm text-success text-center py-4">✅ Sem ocorrências registradas</p>
                ) : (
                  <div className="space-y-2">
                    {contrato.ocorrencias.map(oc => (
                      <div key={oc.id} className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border ${ocorrenciaColor(oc.tipo)}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{oc.tipo}</span>
                            <span className="text-[10px] text-text-muted">
                              {new Date(oc.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5 opacity-80">{oc.descricao}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ContratosPage() {
  const router = useRouter()
  const [contratos, setContratos] = useState<ContratoRec[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [userId, setUserId] = useState('')

  const loadContratos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      const { data: vagasData } = await supabase
        .from('vagas').select('id').eq('transportadora_id', user.id)

      const vagaIds = vagasData?.map(v => v.id) ?? []
      if (vagaIds.length === 0) { setContratos([]); setLoading(false); return }

      let query = supabase.from('candidaturas')
        .select(`
          id, status, pipeline_status, contrato_status, created_at, mensagem,
          profile:profiles!agregado_id(id, nome, telefone),
          vaga:vagas!vaga_id(id, rota_origem, rota_destino, tipo_veiculo, tipo_equipamento, valor_contrato, km_estimado, contrata_equipamento),
          mensagens:contrato_mensagens(id, de, texto, created_at),
          ocorrencias:contrato_ocorrencias(id, tipo, descricao, created_at)
        `)
        .eq('status', 'aceito')
        .in('vaga_id', vagaIds)
        .order('created_at', { ascending: false })

      if (filterStatus) query = query.eq('contrato_status', filterStatus)

      const { data, error: err } = await query
      if (err) throw err
      setContratos((data ?? []).map(c => ({
        ...c,
        profile: Array.isArray(c.profile) ? c.profile[0] : c.profile,
        vaga: Array.isArray(c.vaga) ? c.vaga[0] : c.vaga,
        mensagens: Array.isArray(c.mensagens) ? c.mensagens : [],
        ocorrencias: Array.isArray(c.ocorrencias) ? c.ocorrencias : [],
      })) as ContratoRec[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar contratos')
    } finally {
      setLoading(false)
    }
  }, [router, filterStatus])

  useEffect(() => { loadContratos() }, [loadContratos])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-text-primary">Contratos</h1>
        <p className="text-text-secondary text-sm mt-0.5">Gerencie seus agregados contratados</p>
      </div>

      <div className="flex gap-2">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent">
          <option value="">Todos os contratos</option>
          <option value="ativo">Ativos</option>
          <option value="suspenso">Suspensos</option>
          <option value="encerrado">Encerrados</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-text-muted" />
        </div>
      ) : error ? (
        <div className="bg-danger-light border border-danger/20 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-danger flex-shrink-0" />
          <div>
            <p className="font-medium text-danger">Erro ao carregar contratos</p>
            <p className="text-sm text-text-secondary">{error}</p>
          </div>
        </div>
      ) : contratos.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <FileText size={36} className="text-text-muted mx-auto mb-3" />
          <p className="font-medium text-text-secondary">Nenhum contrato encontrado</p>
          <p className="text-sm text-text-muted mt-1">Formalize candidaturas para criar contratos ativos.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {contratos.map(c => (
            <ContratoCard key={c.id} contrato={c} userId={userId} />
          ))}
        </div>
      )}
    </div>
  )
}
