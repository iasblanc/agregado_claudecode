'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { FileText, Loader2, ChevronDown, MessageSquare, Clock, AlertTriangle, Send } from 'lucide-react'
import { formatCurrency } from '@/lib/types'

type ContratoStatus = 'pendente_assinatura' | 'ativo' | 'suspenso' | 'encerrado'
type MsgTipo = 'transportadora' | 'motorista'

interface Mensagem {
  de: MsgTipo
  texto: string
  hora: string
}

interface TimelineItem {
  tipo: 'green' | 'blue' | 'orange' | 'muted'
  titulo: string
  sub: string
}

interface Ocorrencia {
  tipo: string
  desc: string
  data: string
}

interface Contrato {
  id: string
  candidatura_id: string
  transportadora_id: string
  agregado_id: string
  vaga_id: string
  status: ContratoStatus
  data_inicio: string | null
  data_fim_prevista: string | null
  observacoes: string | null
  mensagens: Mensagem[]
  timeline: TimelineItem[]
  ocorrencias: Ocorrencia[]
  created_at: string
  // joins
  candidatura?: {
    mensagem: string | null
  }
  vaga?: {
    rota_origem: string | null
    rota_destino: string | null
    km_estimado: number | null
    valor_km: number | null
    tipo_veiculo: string | null
    tipo_equipamento: string | null
  }
  perfil?: {
    nome: string | null
    telefone: string | null
  }
}

const OCORRENCIA_TIPOS = [
  'Atraso', 'Manutenção', 'Documentação', 'Equipamento',
  'Acidente', 'Desvio de rota', 'Problema de carga', 'Outro',
]

const OC_COLORS: Record<string, string> = {
  Atraso: 'text-warning',
  Documentação: 'text-danger',
  Acidente: 'text-danger',
  Equipamento: 'text-info',
  Manutenção: 'text-info',
}

export default function ContratosPage() {
  const router = useRouter()
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<string>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Record<string, string>>({})
  const [msgInputs, setMsgInputs] = useState<Record<string, string>>({})
  const [ocInputs, setOcInputs] = useState<Record<string, { tipo: string; desc: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const fetchContratos = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    let query = supabase
      .from('contratos_motorista')
      .select(`
        *,
        candidatura:candidaturas (mensagem),
        vaga:vagas (rota_origem, rota_destino, km_estimado, valor_km, tipo_veiculo, tipo_equipamento),
        perfil:profiles!agregado_id (nome, telefone)
      `)
      .eq('transportadora_id', user.id)
      .order('created_at', { ascending: false })

    if (filtroStatus) {
      query = query.eq('status', filtroStatus)
    }

    const { data } = await query
    setContratos((data as unknown as Contrato[]) ?? [])
    setLoading(false)
  }, [filtroStatus, router])

  useEffect(() => { fetchContratos() }, [fetchContratos])

  async function updateContratoStatus(id: string, status: ContratoStatus) {
    setSaving(id)
    const supabase = createClient()
    await supabase.from('contratos_motorista').update({ status }).eq('id', id)
    setContratos(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    setSaving(null)
  }

  async function sendMsg(contratoId: string) {
    const texto = msgInputs[contratoId]?.trim()
    if (!texto) return
    const now = new Date()
    const hora = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    const novaMensagem: Mensagem = { de: 'transportadora', texto, hora: `Agora, ${hora}` }
    const contrato = contratos.find(c => c.id === contratoId)
    if (!contrato) return
    const novasMensagens = [...(contrato.mensagens ?? []), novaMensagem]

    setSaving(contratoId)
    const supabase = createClient()
    await supabase.from('contratos_motorista').update({ mensagens: novasMensagens }).eq('id', contratoId)
    setContratos(prev => prev.map(c => c.id === contratoId ? { ...c, mensagens: novasMensagens } : c))
    setMsgInputs(prev => ({ ...prev, [contratoId]: '' }))
    setSaving(null)
  }

  async function addOcorrencia(contratoId: string) {
    const input = ocInputs[contratoId]
    if (!input?.desc?.trim()) return
    const contrato = contratos.find(c => c.id === contratoId)
    if (!contrato) return
    const novaOcorrencia: Ocorrencia = {
      tipo: input.tipo || 'Outro',
      desc: input.desc.trim(),
      data: new Date().toLocaleDateString('pt-BR'),
    }
    const novasOcorrencias = [...(contrato.ocorrencias ?? []), novaOcorrencia]

    setSaving(contratoId)
    const supabase = createClient()
    await supabase.from('contratos_motorista').update({ ocorrencias: novasOcorrencias }).eq('id', contratoId)
    setContratos(prev => prev.map(c => c.id === contratoId ? { ...c, ocorrencias: novasOcorrencias } : c))
    setOcInputs(prev => ({ ...prev, [contratoId]: { tipo: 'Atraso', desc: '' } }))
    setSaving(null)
  }

  function getTab(id: string) {
    return activeTab[id] ?? 'detalhes'
  }

  const badgeClass: Record<ContratoStatus, string> = {
    pendente_assinatura: 'bg-[rgba(194,107,58,.12)] text-[#C26B3A]',
    ativo:     'bg-success-light text-success',
    suspenso:  'bg-warning-light text-warning',
    encerrado: 'bg-gray-100 text-gray-600',
  }

  const badgeLabel: Record<ContratoStatus, string> = {
    pendente_assinatura: 'Aguard. assinatura',
    ativo: 'Ativo',
    suspenso: 'Suspenso',
    encerrado: 'Encerrado',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans">Gestão operacional</p>
          <h1 className="font-serif text-2xl font-bold text-text-primary">Contratos ativos</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['', 'pendente_assinatura', 'ativo', 'suspenso', 'encerrado'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className={`px-3 py-1 rounded-pill text-xs font-medium border transition-all ${
              filtroStatus === s
                ? 'bg-accent text-bg border-accent'
                : 'bg-bg border-border text-text-secondary hover:border-accent/40'
            }`}
          >
            {s === '' ? 'Todos' : s === 'pendente_assinatura' ? 'Aguard. assinatura' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-text-muted" />
        </div>
      ) : contratos.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <FileText size={36} className="text-text-muted mx-auto mb-3" />
          <p className="font-medium text-text-secondary">Nenhum contrato encontrado</p>
          <p className="text-sm text-text-muted mt-1">Os contratos aparecem após aprovar candidaturas</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {contratos.map(c => {
            const nome = c.perfil?.nome ?? 'Motorista'
            const initials = nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
            const rota = c.vaga ? `${c.vaga.rota_origem ?? ''} → ${c.vaga.rota_destino ?? ''}` : '—'
            const isExpanded = expandedId === c.id
            const tab = getTab(c.id)

            return (
              <div key={c.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                {/* Contract header */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[#E8E3D8] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                >
                  {/* Status bar */}
                  <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                    c.status === 'ativo' ? 'bg-success' :
                    c.status === 'suspenso' ? 'bg-warning' :
                    c.status === 'pendente_assinatura' ? 'bg-[#C26B3A]' : 'bg-border'
                  }`} />

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-[#E0DAD0] border border-border flex items-center justify-center font-serif text-sm font-semibold text-text-secondary flex-shrink-0">
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-text-primary text-sm">{nome}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-pill ${badgeClass[c.status]}`}>
                        {badgeLabel[c.status]}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted">
                      {c.vaga?.tipo_veiculo ?? '—'} · {rota}
                      {c.vaga?.valor_km ? ` · R$${c.vaga.valor_km.toFixed(2).replace('.', ',')}/km` : ''}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {c.status === 'pendente_assinatura' && (
                      <span className="text-[10px] text-[#C26B3A] font-sans">Aguardando agregado</span>
                    )}
                    {c.status === 'ativo' && (
                      <>
                        <button
                          onClick={() => updateContratoStatus(c.id, 'suspenso')}
                          disabled={saving === c.id}
                          className="text-xs px-3 py-1.5 rounded-pill border border-border text-text-secondary hover:bg-warning-light hover:border-warning/20 hover:text-warning transition-colors"
                        >
                          ⏸ Suspender
                        </button>
                        <button
                          onClick={() => { if (!window.confirm('Encerrar este contrato?')) return; updateContratoStatus(c.id, 'encerrado') }}
                          disabled={saving === c.id}
                          className="text-xs px-3 py-1.5 rounded-pill border border-danger/20 text-danger bg-danger-light hover:bg-danger/10 transition-colors"
                        >
                          Encerrar
                        </button>
                      </>
                    )}
                    {c.status === 'suspenso' && (
                      <>
                        <button
                          onClick={() => updateContratoStatus(c.id, 'ativo')}
                          disabled={saving === c.id}
                          className="text-xs px-3 py-1.5 rounded-pill bg-accent text-bg hover:opacity-90 transition-opacity"
                        >
                          ▶ Reativar
                        </button>
                        <button
                          onClick={() => { if (!window.confirm('Encerrar este contrato?')) return; updateContratoStatus(c.id, 'encerrado') }}
                          disabled={saving === c.id}
                          className="text-xs px-3 py-1.5 rounded-pill border border-danger/20 text-danger bg-danger-light hover:bg-danger/10 transition-colors"
                        >
                          Encerrar
                        </button>
                      </>
                    )}
                    <ChevronDown
                      size={16}
                      className={`text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Tabs */}
                    <div className="flex border-b border-border overflow-x-auto">
                      {(['detalhes', 'mensagens', 'timeline', 'ocorrencias'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setActiveTab(prev => ({ ...prev, [c.id]: t }))}
                          className={`px-4 py-2.5 text-xs font-medium capitalize whitespace-nowrap border-b-2 transition-colors ${
                            tab === t
                              ? 'border-accent text-text-primary'
                              : 'border-transparent text-text-muted hover:text-text-secondary'
                          }`}
                        >
                          {t === 'detalhes' && 'Detalhes'}
                          {t === 'mensagens' && (
                            <span className="flex items-center gap-1.5">
                              Mensagens
                              {(c.mensagens?.length ?? 0) > 0 && (
                                <span className="bg-[#E0DAD0] text-text-secondary text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                  {c.mensagens.length}
                                </span>
                              )}
                            </span>
                          )}
                          {t === 'timeline' && 'Linha do tempo'}
                          {t === 'ocorrencias' && (
                            <span className="flex items-center gap-1.5">
                              Ocorrências
                              {(c.ocorrencias?.length ?? 0) > 0 && (
                                <span className="bg-warning-light text-warning text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                  {c.ocorrencias.length}
                                </span>
                              )}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="p-4">
                      {/* DETALHES */}
                      {tab === 'detalhes' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { l: 'Motorista / Empresa', v: nome },
                              { l: 'Telefone', v: c.perfil?.telefone ?? '—' },
                              { l: 'Veículo', v: c.vaga?.tipo_veiculo ?? '—' },
                              { l: 'Implemento', v: c.vaga?.tipo_equipamento ?? '—' },
                              { l: 'Rota', v: rota },
                              { l: 'Remuneração', v: c.vaga?.valor_km ? `R$${c.vaga.valor_km.toFixed(2).replace('.', ',')}/km` : '—' },
                              { l: 'Início', v: c.data_inicio ? new Date(c.data_inicio).toLocaleDateString('pt-BR') : '—' },
                              { l: 'Previsão fim', v: c.data_fim_prevista ? new Date(c.data_fim_prevista).toLocaleDateString('pt-BR') : '—' },
                            ].map(item => (
                              <div key={item.l} className="bg-bg rounded-lg p-2.5">
                                <p className="text-[10px] uppercase tracking-wide text-text-muted">{item.l}</p>
                                <p className="text-sm font-medium text-text-primary mt-0.5">{item.v}</p>
                              </div>
                            ))}
                          </div>
                          {c.observacoes && (
                            <div className="bg-bg rounded-lg p-2.5">
                              <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Observações</p>
                              <p className="text-sm text-text-secondary">{c.observacoes}</p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              className="text-xs px-3 py-1.5 rounded-pill border border-border text-text-secondary hover:bg-surface transition-colors"
                              onClick={() => alert('Contrato PDF — em desenvolvimento')}
                            >
                              📄 Ver contrato
                            </button>
                            {c.status === 'encerrado' && (
                              <button
                                className="text-xs px-3 py-1.5 rounded-pill bg-accent text-bg hover:opacity-90"
                                onClick={() => router.push('/transportadora/avaliacoes')}
                              >
                                ⭐ Avaliar agregado →
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* MENSAGENS */}
                      {tab === 'mensagens' && (
                        <div className="space-y-3">
                          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                            {(c.mensagens ?? []).length === 0 ? (
                              <p className="text-sm text-text-muted text-center py-6">Nenhuma mensagem ainda</p>
                            ) : (
                              c.mensagens.map((m, i) => (
                                <div
                                  key={i}
                                  className={`flex flex-col max-w-[80%] ${m.de === 'transportadora' ? 'ml-auto items-end' : 'items-start'}`}
                                >
                                  <div className={`rounded-xl px-3 py-2 text-sm ${
                                    m.de === 'transportadora'
                                      ? 'bg-accent text-bg'
                                      : 'bg-[#E8E3D8] text-text-primary'
                                  }`}>
                                    {m.texto}
                                  </div>
                                  <p className="text-[10px] text-text-muted mt-0.5">
                                    {m.de === 'transportadora' ? 'Você' : nome.split(' ')[0]} · {m.hora}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                          <div className="flex gap-2 border-t border-border pt-3">
                            <textarea
                              value={msgInputs[c.id] ?? ''}
                              onChange={e => setMsgInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(c.id) } }}
                              placeholder="Escreva uma mensagem..."
                              rows={1}
                              className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent/50"
                            />
                            <button
                              onClick={() => sendMsg(c.id)}
                              disabled={saving === c.id || !msgInputs[c.id]?.trim()}
                              className="w-9 h-9 rounded-full bg-accent text-bg flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity"
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* TIMELINE */}
                      {tab === 'timeline' && (
                        <div className="space-y-0">
                          {(c.timeline ?? []).length === 0 ? (
                            <p className="text-sm text-text-muted text-center py-6">Nenhum evento registrado</p>
                          ) : (
                            c.timeline.map((t, i) => (
                              <div key={i} className="flex gap-3 pb-4 relative">
                                <div className="flex flex-col items-center">
                                  <div className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${
                                    t.tipo === 'green' ? 'bg-success' :
                                    t.tipo === 'blue' ? 'bg-info' :
                                    t.tipo === 'orange' ? 'bg-warning' : 'bg-border'
                                  }`} />
                                  {i < c.timeline.length - 1 && (
                                    <div className="w-0.5 bg-border flex-1 mt-1" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-text-primary">{t.titulo}</p>
                                  <p className="text-xs text-text-muted">{t.sub}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* OCORRÊNCIAS */}
                      {tab === 'ocorrencias' && (
                        <div className="space-y-3">
                          {/* Add new occurrence */}
                          <div className="bg-bg border border-border rounded-xl p-3 space-y-2">
                            <p className="text-[10px] uppercase tracking-wide text-text-muted">Registrar nova ocorrência</p>
                            <div className="flex flex-wrap gap-2">
                              <select
                                value={ocInputs[c.id]?.tipo ?? 'Atraso'}
                                onChange={e => setOcInputs(prev => ({ ...prev, [c.id]: { ...prev[c.id], tipo: e.target.value, desc: prev[c.id]?.desc ?? '' } }))}
                                className="border border-border rounded-lg bg-bg px-2 py-1.5 text-xs text-text-primary focus:outline-none"
                              >
                                {OCORRENCIA_TIPOS.map(t => <option key={t}>{t}</option>)}
                              </select>
                              <input
                                value={ocInputs[c.id]?.desc ?? ''}
                                onChange={e => setOcInputs(prev => ({ ...prev, [c.id]: { tipo: prev[c.id]?.tipo ?? 'Atraso', desc: e.target.value } }))}
                                placeholder="Descreva o ocorrido..."
                                className="flex-1 min-w-32 border border-border rounded-lg bg-bg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
                              />
                              <button
                                onClick={() => addOcorrencia(c.id)}
                                disabled={saving === c.id}
                                className="text-xs px-3 py-1.5 rounded-pill bg-accent text-bg hover:opacity-90 disabled:opacity-50 transition-opacity"
                              >
                                Registrar
                              </button>
                            </div>
                          </div>

                          {/* Ocorrência list */}
                          {(c.ocorrencias ?? []).length === 0 ? (
                            <div className="text-center py-6">
                              <AlertTriangle size={24} className="text-text-muted mx-auto mb-2" />
                              <p className="text-sm text-text-muted">Sem ocorrências registradas</p>
                            </div>
                          ) : (
                            [...c.ocorrencias].reverse().map((o, i) => (
                              <div key={i} className="bg-bg border border-border rounded-xl p-3">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className={`text-xs font-semibold uppercase tracking-wide ${OC_COLORS[o.tipo] ?? 'text-info'}`}>
                                    {o.tipo}
                                  </span>
                                  <span className="text-[10px] text-text-muted">{o.data}</span>
                                </div>
                                <p className="text-sm text-text-secondary">{o.desc}</p>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
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
