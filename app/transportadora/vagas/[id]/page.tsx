'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { formatCurrency, type Vaga, type Candidatura, calcEstimativaMensal, calcKmMensal, calcDiasMes, labelFrequencia } from '@/lib/types'
import {
  ArrowLeft, MapPin, Truck, Package, Clock, DollarSign,
  Users, User, MessageSquare, CheckCircle2, XCircle,
  Loader2, AlertCircle, CalendarDays, TrendingUp, RefreshCw,
  Pencil, PauseCircle, PlayCircle, Copy, FileText,
} from 'lucide-react'

interface Profile {
  nome: string | null
}

interface Veiculo {
  tipo: string
  placa: string
}

interface Equipamento {
  tipo: string
  placa: string | null
}

interface Motorista {
  nome: string
}

interface CandidaturaEnricada extends Candidatura {
  perfil?: Profile
  veiculos?: Veiculo | null
  equipamentos?: Equipamento | null
  motoristas?: Motorista | null
}

const CAND_STATUS: Record<Candidatura['status'], { label: string; variant: 'warning' | 'success' | 'danger' | 'info' | 'muted' }> = {
  pendente:        { label: 'Novo',             variant: 'warning' },
  visualizado:     { label: 'Visualizado',      variant: 'muted'   },
  em_negociacao:   { label: 'Em negociação',    variant: 'info'    },
  em_formalizacao: { label: 'Em formalização',  variant: 'warning' },
  aceito:          { label: 'Aprovado',         variant: 'success' },
  contratado:      { label: 'Contratado',       variant: 'success' },
  recusado:        { label: 'Recusado',         variant: 'danger'  },
}

function StatusBadge({ status }: { status: Candidatura['status'] }) {
  const cfg = CAND_STATUS[status] ?? CAND_STATUS.pendente
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

function VagaStatusBadge({ status }: { status: Vaga['status'] }) {
  if (status === 'ativa')      return <Badge variant="success">Ativa</Badge>
  if (status === 'pausada')    return <Badge variant="warning">Pausada</Badge>
  if (status === 'encerrada')  return <Badge variant="danger">Encerrada</Badge>
  return <Badge variant="info">Preenchida</Badge>
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

export default function VagaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const vagaId = params.id as string

  const [vaga, setVaga] = useState<Vaga | null>(null)
  const [candidaturas, setCandidaturas] = useState<CandidaturaEnricada[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  function showFeedback(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  async function handlePausar() {
    if (!vaga) return
    const novoStatus = vaga.status === 'pausada' ? 'ativa' : 'pausada'
    const label = novoStatus === 'pausada' ? 'pausar' : 'reativar'
    if (!confirm(`Deseja ${label} esta vaga?`)) return
    setActionLoading('pausar')
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('vagas').update({ status: novoStatus }).eq('id', vagaId)
      if (error) throw error
      setVaga(prev => prev ? { ...prev, status: novoStatus } : prev)
      showFeedback(novoStatus === 'pausada' ? 'Vaga pausada.' : 'Vaga reativada.')
    } catch (err: unknown) {
      alert((err as { message?: string })?.message ?? `Erro ao ${label} vaga`)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDuplicar() {
    if (!vaga) return
    if (!confirm('Duplicar esta vaga? Uma cópia ativa será criada.')) return
    setActionLoading('duplicar')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, created_at, transportadora, ...rest } = vaga
      const { error } = await supabase.from('vagas').insert({
        ...rest,
        transportadora_id: session.user.id,
        titulo: (rest.titulo ? rest.titulo + ' (cópia)' : null),
        status: 'ativa',
      })
      if (error) throw error
      showFeedback('Vaga duplicada! Verifique a lista de vagas.')
    } catch (err: unknown) {
      alert((err as { message?: string })?.message ?? 'Erro ao duplicar vaga')
    } finally {
      setActionLoading(null)
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/login'); return }
      const userId = session.user.id

      // Fetch vaga
      const { data: vagaData, error: vagaError } = await supabase
        .from('vagas')
        .select('*')
        .eq('id', vagaId)
        .eq('transportadora_id', userId)
        .single()

      if (vagaError || !vagaData) {
        setError('Vaga não encontrada ou você não tem permissão para visualizá-la.')
        setLoading(false)
        return
      }

      setVaga(vagaData)

      // Fetch candidaturas — mirror exact join syntax from candidatos/page.tsx that is known to work
      const { data: candidaturasData, error: candError } = await supabase
        .from('candidaturas')
        .select(`
          *,
          perfil:profiles!agregado_id (nome),
          veiculos (tipo, placa)
        `)
        .eq('vaga_id', vagaId)
        .order('created_at', { ascending: false })

      if (candError) {
        // Surface the real Supabase error message
        setError(candError.message ?? 'Erro ao carregar candidaturas')
        setLoading(false)
        return
      }

      // Enrich with equipamento/motorista data via separate queries if needed
      const ids = (candidaturasData ?? []).map(c => c.id)
      let enriched = candidaturasData ?? []

      if (ids.length > 0) {
        const [eqRes, motRes] = await Promise.all([
          supabase.from('candidaturas').select('id, equipamento_id, equipamentos(tipo, placa)').in('id', ids),
          supabase.from('candidaturas').select('id, motorista_id, motoristas(nome)').in('id', ids),
        ])
        const eqMap = Object.fromEntries((eqRes.data ?? []).map(r => [r.id, (r as unknown as { equipamentos: Equipamento | null }).equipamentos]))
        const motMap = Object.fromEntries((motRes.data ?? []).map(r => [r.id, (r as unknown as { motoristas: Motorista | null }).motoristas]))
        enriched = enriched.map(c => ({
          ...c,
          equipamentos: eqMap[c.id] ?? null,
          motoristas: motMap[c.id] ?? null,
        }))
      }

      setCandidaturas(enriched as unknown as CandidaturaEnricada[])
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Erro inesperado ao carregar dados')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vagaId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleAceitar(candidaturaId: string) {
    if (!confirm('Aprovar este candidato e enviar proposta para assinatura digital?')) return

    setActionLoading(candidaturaId)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const cand = candidaturas.find(c => c.id === candidaturaId)
      if (!cand) return

      const dataInicio = new Date().toISOString().split('T')[0]
      const meses = vaga?.periodo_meses ?? 12
      const dataFim = new Date(Date.now() + meses * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // 1. Create contratos_motorista (pendente_assinatura — aguarda assinatura do agregado)
      const { error: contractError } = await supabase.from('contratos_motorista').insert({
        candidatura_id: candidaturaId,
        transportadora_id: session.user.id,
        agregado_id: cand.agregado_id,
        vaga_id: vagaId,
        status: 'pendente_assinatura',
        data_inicio: dataInicio,
        data_fim_prevista: dataFim,
      })
      if (contractError) throw contractError

      // 2. Move candidatura to em_formalizacao
      const { error: acceptError } = await supabase
        .from('candidaturas').update({ status: 'em_formalizacao' }).eq('id', candidaturaId)
      if (acceptError) throw acceptError

      // 3. If last open slot: auto-reject remaining actionable candidaturas + mark vaga preenchida
      const vagasAbertas = vaga?.vagas_abertas ?? 1
      if (vagasAbertas <= 1) {
        await supabase.from('candidaturas')
          .update({ status: 'recusado' })
          .eq('vaga_id', vagaId)
          .in('status', ['pendente', 'visualizado', 'em_negociacao'])
          .neq('id', candidaturaId)

        await supabase.from('vagas').update({ status: 'preenchida' }).eq('id', vagaId)
        setVaga(prev => prev ? { ...prev, status: 'preenchida' } : prev)

        setCandidaturas(prev => prev.map(c => {
          if (c.id === candidaturaId) return { ...c, status: 'em_formalizacao' as const }
          if (['pendente', 'visualizado', 'em_negociacao'].includes(c.status)) return { ...c, status: 'recusado' as const }
          return c
        }))
      } else {
        setVaga(prev => prev ? { ...prev, vagas_abertas: vagasAbertas - 1 } : prev)
        setCandidaturas(prev => prev.map(c =>
          c.id === candidaturaId ? { ...c, status: 'em_formalizacao' as const } : c
        ))
      }

      showFeedback('Candidato aprovado! Aguardando assinatura digital do agregado.')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao aprovar candidatura')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRecusar(candidaturaId: string) {
    if (!confirm('Recusar este candidato?')) return

    setActionLoading(candidaturaId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('candidaturas')
        .update({ status: 'recusado' })
        .eq('id', candidaturaId)

      if (error) throw error

      setCandidaturas(prev => prev.map(c =>
        c.id === candidaturaId ? { ...c, status: 'recusado' } : c
      ))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao recusar candidatura')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-text-muted" />
      </div>
    )
  }

  if (error || !vaga) {
    return (
      <div className="space-y-4">
        <Link href="/transportadora/vagas">
          <button className="flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary transition-colors">
            <ArrowLeft size={16} />
            Voltar para vagas
          </button>
        </Link>
        <div className="bg-danger-light border border-danger/20 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-danger">Erro</p>
            <p className="text-sm text-text-secondary mt-0.5">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const pendentes = candidaturas.filter(c => ['pendente', 'visualizado', 'em_negociacao'].includes(c.status)).length
  const emFormalizacao = candidaturas.filter(c => c.status === 'em_formalizacao').length
  const contratados = candidaturas.filter(c => c.status === 'contratado').length

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/transportadora/vagas">
          <button className="flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary transition-colors mb-4">
            <ArrowLeft size={16} />
            Voltar para vagas
          </button>
        </Link>
        {feedback && (
          <div className="bg-success-light border border-success/20 rounded-xl px-4 py-3 text-sm text-success font-medium mb-2">
            {feedback}
          </div>
        )}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-2xl font-bold text-text-primary">{vaga.titulo || 'Detalhes da vaga'}</h1>
              <VagaStatusBadge status={vaga.status} />
            </div>
            <p className="text-text-muted text-sm mt-1">
              Publicada em {formatDate(vaga.created_at)}
            </p>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/transportadora/vagas/${vagaId}/editar`}>
              <Button variant="secondary" size="sm" className="gap-1.5">
                <Pencil size={14} />
                Editar
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-text-secondary"
              onClick={handleDuplicar}
              loading={actionLoading === 'duplicar'}
              title="Duplicar vaga"
            >
              <Copy size={14} />
              Duplicar
            </Button>
            {(vaga.status === 'ativa' || vaga.status === 'pausada') && (
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1.5 ${vaga.status === 'pausada' ? 'text-success' : 'text-warning'}`}
                onClick={handlePausar}
                loading={actionLoading === 'pausar'}
              >
                {vaga.status === 'pausada'
                  ? <><PlayCircle size={14} />Reativar</>
                  : <><PauseCircle size={14} />Pausar</>
                }
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Vaga info */}
      <Card padding="lg">
        <h2 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Truck size={16} className="text-text-muted" />
          Detalhes da vaga
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(vaga.rota_origem || vaga.rota_destino) && (
            <div className="flex items-start gap-2">
              <MapPin size={15} className="text-text-muted mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Rota</p>
                <p className="text-sm text-text-primary">
                  {vaga.rota_origem}{vaga.rota_origem && vaga.rota_destino ? ' → ' : ''}{vaga.rota_destino}
                </p>
                {vaga.km_estimado && (
                  <p className="text-xs text-text-muted">{vaga.km_estimado.toLocaleString('pt-BR')} km estimados</p>
                )}
              </div>
            </div>
          )}
          {vaga.tipo_veiculo && (
            <div className="flex items-start gap-2">
              <Truck size={15} className="text-text-muted mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Veículo</p>
                <p className="text-sm text-text-primary">{vaga.tipo_veiculo}</p>
              </div>
            </div>
          )}
          {vaga.tipo_equipamento && (
            <div className="flex items-start gap-2">
              <Package size={15} className="text-text-muted mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Equipamento</p>
                <p className="text-sm text-text-primary">{vaga.tipo_equipamento}</p>
              </div>
            </div>
          )}
          {vaga.valor_km && (
            <div className="flex items-start gap-2">
              <DollarSign size={15} className="text-text-muted mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Valor por km</p>
                <p className="text-sm font-semibold text-text-primary">{formatCurrency(vaga.valor_km)}/km</p>
              </div>
            </div>
          )}
          {vaga.frequencia_tipo && (
            <div className="flex items-start gap-2">
              <RefreshCw size={15} className="text-text-muted mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Frequência</p>
                <p className="text-sm text-text-primary">{labelFrequencia(vaga)}</p>
              </div>
            </div>
          )}
          {vaga.periodo_meses && (
            <div className="flex items-start gap-2">
              <Clock size={15} className="text-text-muted mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Período</p>
                <p className="text-sm text-text-primary">{vaga.periodo_meses} {vaga.periodo_meses === 1 ? 'mês' : 'meses'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Estimativa mensal — resumo para a transportadora */}
        {(() => {
          const est  = calcEstimativaMensal(vaga)
          const dias = calcDiasMes(vaga)
          const kmM  = calcKmMensal(vaga)
          if (!est) return null
          return (
            <div className="mt-4 bg-success-light border border-success/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-success" />
                <p className="text-xs font-semibold text-success uppercase tracking-wide">Estimativa mensal ao agregado</p>
              </div>
              <p className="font-bold text-success text-2xl mb-2">{formatCurrency(est)}<span className="text-sm font-normal text-text-secondary">/mês</span></p>
              {dias && kmM && vaga.valor_km && vaga.km_estimado && (
                <p className="text-xs text-text-muted">
                  {formatCurrency(vaga.valor_km)}/km × {vaga.km_estimado.toLocaleString('pt-BR')} km × {dias} viagens = {formatCurrency(est)}/mês · {kmM.toLocaleString('pt-BR')} km/mês
                </p>
              )}
            </div>
          )
        })()}
        {vaga.descricao && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-text-muted uppercase tracking-wide mb-1.5">Descrição</p>
            <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{vaga.descricao}</p>
          </div>
        )}
      </Card>

      {/* Candidatos section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold text-text-primary flex items-center gap-2">
            <Users size={20} />
            Candidatos
          </h2>
          <div className="flex items-center gap-2">
            {pendentes > 0 && (
              <Badge variant="warning">{pendentes} para analisar</Badge>
            )}
            {emFormalizacao > 0 && (
              <Badge variant="warning">{emFormalizacao} aguard. assinatura</Badge>
            )}
            {contratados > 0 && (
              <Badge variant="success">{contratados} contratado{contratados !== 1 ? 's' : ''}</Badge>
            )}
            <span className="text-sm text-text-muted">{candidaturas.length} total</span>
          </div>
        </div>

        {candidaturas.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-10 text-center">
            <Users size={36} className="text-text-muted mx-auto mb-3" />
            <p className="font-medium text-text-secondary">Nenhuma candidatura recebida ainda</p>
            <p className="text-sm text-text-muted mt-1">
              {vaga.status === 'ativa'
                ? 'Aguarde candidaturas de caminhoneiros. A vaga está ativa e visível no marketplace.'
                : 'Esta vaga não está mais aceitando candidaturas.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {candidaturas.map((candidatura) => (
              <Card key={candidatura.id} padding="none" className="overflow-hidden">
                <div className={`h-1 ${
                  candidatura.status === 'aceito' ? 'bg-success' :
                  candidatura.status === 'recusado' ? 'bg-danger' : 'bg-warning'
                }`} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-info-light rounded-full flex items-center justify-center flex-shrink-0">
                        <User size={16} className="text-info" />
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary">
                          {candidatura.perfil?.nome || 'Agregado'}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                          <CalendarDays size={11} />
                          {formatDate(candidatura.created_at)}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={candidatura.status} />
                  </div>

                  {/* Asset info */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {candidatura.veiculos && (
                      <div className="flex items-center gap-1.5 text-xs bg-surface border border-border px-2.5 py-1 rounded-pill text-text-secondary">
                        <Truck size={11} />
                        {candidatura.veiculos.tipo} · {candidatura.veiculos.placa}
                      </div>
                    )}
                    {candidatura.equipamentos && (
                      <div className="flex items-center gap-1.5 text-xs bg-surface border border-border px-2.5 py-1 rounded-pill text-text-secondary">
                        <Package size={11} />
                        {candidatura.equipamentos.tipo}
                        {candidatura.equipamentos.placa ? ` · ${candidatura.equipamentos.placa}` : ''}
                      </div>
                    )}
                    {candidatura.motoristas && (
                      <div className="flex items-center gap-1.5 text-xs bg-surface border border-border px-2.5 py-1 rounded-pill text-text-secondary">
                        <User size={11} />
                        Motorista: {candidatura.motoristas.nome}
                      </div>
                    )}
                  </div>

                  {candidatura.mensagem && (
                    <div className="flex items-start gap-2 bg-surface rounded-lg p-3 mb-3">
                      <MessageSquare size={13} className="text-text-muted flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-text-secondary leading-relaxed">{candidatura.mensagem}</p>
                    </div>
                  )}

                  {/* Action buttons — for all actionable statuses while vaga not encerrada */}
                  {vaga.status !== 'encerrada' && ['pendente', 'visualizado', 'em_negociacao'].includes(candidatura.status) && (
                    <div className="flex gap-2 pt-3 border-t border-border">
                      <Button
                        variant="success"
                        size="sm"
                        className="gap-1.5 flex-1"
                        onClick={() => handleAceitar(candidatura.id)}
                        loading={actionLoading === candidatura.id}
                      >
                        <CheckCircle2 size={14} />
                        Aprovar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="gap-1.5 flex-1"
                        onClick={() => handleRecusar(candidatura.id)}
                        loading={actionLoading === candidatura.id}
                      >
                        <XCircle size={14} />
                        Recusar
                      </Button>
                    </div>
                  )}

                  {/* Status note for em_formalizacao */}
                  {candidatura.status === 'em_formalizacao' && (
                    <div className="flex items-center gap-2 pt-3 border-t border-border">
                      <FileText size={14} className="text-[#C26B3A]" />
                      <p className="text-xs text-[#C26B3A] font-medium">Aprovado — aguardando assinatura digital do agregado</p>
                    </div>
                  )}

                  {/* Status note for contratado */}
                  {candidatura.status === 'contratado' && (
                    <div className="flex items-center gap-2 pt-3 border-t border-border">
                      <CheckCircle2 size={14} className="text-success" />
                      <p className="text-xs text-success font-medium">Contrato ativo</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
