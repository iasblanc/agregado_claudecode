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
  ShieldCheck, ShieldAlert, Star, AlertTriangle,
} from 'lucide-react'

interface Profile {
  nome: string | null
}

interface VeiculoInfo {
  tipo: string
  placa: string
  ano: number | null
}

interface EquipamentoInfo {
  tipo: string
  placa: string | null
}

interface MotoristaInfo {
  nome: string
}

interface DocSummary {
  total: number
  verificados: number
  pendentes: number
  rejeitados: number
}

interface CandidaturaEnricada extends Candidatura {
  perfil?: Profile | null
  veiculos?: VeiculoInfo | null
  equipamentos?: EquipamentoInfo | null
  motoristas?: MotoristaInfo | null
  docSummary?: DocSummary | null
  notaMedia?: number | null
}

const PIPELINE: Array<Candidatura['status']> = [
  'pendente', 'visualizado', 'em_negociacao', 'em_formalizacao', 'contratado',
]
const PIPELINE_LABELS: Record<string, string> = {
  pendente:        'Novo',
  visualizado:     'Visto',
  em_negociacao:   'Negociando',
  em_formalizacao: 'Formalização',
  contratado:      'Contratado',
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

/** Mini stepper mostrando onde a candidatura está no pipeline */
function PipelineStrip({ status }: { status: Candidatura['status'] }) {
  if (status === 'recusado') {
    return (
      <div className="flex items-center gap-1.5 py-2">
        <XCircle size={12} className="text-danger flex-shrink-0" />
        <span className="text-xs text-danger">Candidatura recusada</span>
      </div>
    )
  }
  if (status === 'aceito') {
    // 'aceito' maps to em_formalizacao visually
    const activeIdx = PIPELINE.indexOf('em_formalizacao')
    return <StepBar activeIdx={activeIdx} />
  }
  const activeIdx = PIPELINE.indexOf(status)
  return <StepBar activeIdx={activeIdx} />
}

function StepBar({ activeIdx }: { activeIdx: number }) {
  return (
    <div className="flex items-center gap-0 w-full py-2 overflow-x-auto">
      {PIPELINE.map((step, i) => {
        const done    = i < activeIdx
        const current = i === activeIdx
        return (
          <div key={step} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                done    ? 'bg-success border-success' :
                current ? 'bg-accent border-accent' :
                          'bg-bg border-border'
              }`}>
                {done && <CheckCircle2 size={10} className="text-white" />}
                {current && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className={`text-[9px] mt-0.5 whitespace-nowrap font-medium ${
                done || current ? 'text-text-primary' : 'text-text-muted'
              }`}>
                {PIPELINE_LABELS[step]}
              </span>
            </div>
            {i < PIPELINE.length - 1 && (
              <div className={`h-0.5 flex-1 mx-0.5 ${done ? 'bg-success' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Badge de resumo de documentos */
function DocBadge({ summary }: { summary: DocSummary | null | undefined }) {
  if (!summary || summary.total === 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-text-muted bg-surface border border-border px-2.5 py-1 rounded-pill">
        <FileText size={11} />
        Sem documentos
      </div>
    )
  }
  const allOk = summary.verificados === summary.total
  const hasRejected = summary.rejeitados > 0
  return (
    <div className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-pill border ${
      hasRejected ? 'bg-danger-light border-danger/20 text-danger' :
      allOk       ? 'bg-success-light border-success/20 text-success' :
                    'bg-warning-light border-warning/20 text-warning'
    }`}>
      {hasRejected ? <ShieldAlert size={11} /> : allOk ? <ShieldCheck size={11} /> : <AlertTriangle size={11} />}
      {summary.verificados}/{summary.total} doc{summary.total !== 1 ? 's' : ''} verificado{summary.verificados !== 1 ? 's' : ''}
    </div>
  )
}

/** Badge de nota média */
function NotaBadge({ nota }: { nota: number | null | undefined }) {
  if (nota == null) {
    return (
      <div className="flex items-center gap-1 text-xs text-text-muted bg-surface border border-border px-2.5 py-1 rounded-pill">
        <Star size={11} />
        Sem avaliações
      </div>
    )
  }
  return (
    <div className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-pill border font-medium ${
      nota >= 4 ? 'bg-success-light border-success/20 text-success' :
      nota >= 3 ? 'bg-warning-light border-warning/20 text-warning' :
                  'bg-danger-light border-danger/20 text-danger'
    }`}>
      <Star size={11} className="fill-current" />
      {nota.toFixed(1)} média
    </div>
  )
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

      // Step 1: fetch candidaturas plain (no joins — avoids schema cache FK issues)
      const { data: candsData, error: candError } = await supabase
        .from('candidaturas')
        .select('*')
        .eq('vaga_id', vagaId)
        .order('created_at', { ascending: false })

      if (candError) {
        setError(candError.message ?? 'Erro ao carregar candidaturas')
        setLoading(false)
        return
      }

      const cands = candsData ?? []

      // Step 2: collect unique IDs for batch fetches
      const agregadoIds = [...new Set(cands.map(c => c.agregado_id).filter(Boolean))] as string[]
      const veiculoIds  = [...new Set(cands.map(c => c.veiculo_id).filter(Boolean))]  as string[]
      const equipIds    = [...new Set(cands.map(c => c.equipamento_id).filter(Boolean))] as string[]
      const motIds      = [...new Set(cands.map(c => c.motorista_id).filter(Boolean))] as string[]

      // Step 3: parallel fetch all related data directly by ID
      // Note: documentos and avaliacoes are fetched for decision support (no sensitive fields)
      const [profilesRes, veiculosRes, equipRes, motRes, docsRes, notasRes] = await Promise.all([
        agregadoIds.length ? supabase.from('profiles').select('id, nome').in('id', agregadoIds) : Promise.resolve({ data: [] }),
        veiculoIds.length  ? supabase.from('veiculos').select('id, tipo, placa, ano').in('id', veiculoIds) : Promise.resolve({ data: [] }),
        equipIds.length    ? supabase.from('equipamentos').select('id, tipo, placa').in('id', equipIds) : Promise.resolve({ data: [] }),
        motIds.length      ? supabase.from('motoristas').select('id, nome').in('id', motIds) : Promise.resolve({ data: [] }),
        // Documentos: apenas tipo + status para o resumo (sem url/conteúdo)
        agregadoIds.length ? supabase.from('documentos').select('agregado_id, status').in('agregado_id', agregadoIds) : Promise.resolve({ data: [] }),
        // Avaliações: nota média por agregado
        agregadoIds.length ? supabase.from('avaliacoes').select('avaliado_id, nota').in('avaliado_id', agregadoIds) : Promise.resolve({ data: [] }),
      ])

      const profileMap = Object.fromEntries(
        (profilesRes.data ?? []).map((p: {id: string; nome: string | null}) => [p.id, p])
      )
      const veiculoMap = Object.fromEntries(
        (veiculosRes.data ?? []).map((v: {id: string; tipo: string; placa: string; ano: number | null}) => [v.id, v])
      )
      const equipMap = Object.fromEntries(
        (equipRes.data ?? []).map((e: {id: string; tipo: string; placa: string | null}) => [e.id, e])
      )
      const motMap = Object.fromEntries(
        (motRes.data ?? []).map((m: {id: string; nome: string}) => [m.id, m])
      )

      // Build doc summary per agregado_id
      type DocRow = { agregado_id: string; status: string }
      const docSummaryMap: Record<string, DocSummary> = {}
      for (const doc of (docsRes.data ?? []) as DocRow[]) {
        if (!docSummaryMap[doc.agregado_id]) {
          docSummaryMap[doc.agregado_id] = { total: 0, verificados: 0, pendentes: 0, rejeitados: 0 }
        }
        const s = docSummaryMap[doc.agregado_id]
        s.total++
        if (doc.status === 'verificado') s.verificados++
        else if (doc.status === 'rejeitado' || doc.status === 'vencido') s.rejeitados++
        else s.pendentes++
      }

      // Build nota média per avaliado_id
      type NotaRow = { avaliado_id: string; nota: number }
      const notaAccum: Record<string, { sum: number; count: number }> = {}
      for (const av of (notasRes.data ?? []) as NotaRow[]) {
        if (!notaAccum[av.avaliado_id]) notaAccum[av.avaliado_id] = { sum: 0, count: 0 }
        notaAccum[av.avaliado_id].sum += av.nota
        notaAccum[av.avaliado_id].count++
      }
      const notaMap: Record<string, number> = Object.fromEntries(
        Object.entries(notaAccum).map(([id, { sum, count }]) => [id, sum / count])
      )

      // Step 4: merge
      const enriched: CandidaturaEnricada[] = cands.map(c => ({
        ...c,
        perfil:       c.agregado_id    ? (profileMap[c.agregado_id]    ?? null) : null,
        veiculos:     c.veiculo_id     ? (veiculoMap[c.veiculo_id]     ?? null) : null,
        equipamentos: c.equipamento_id ? (equipMap[c.equipamento_id]   ?? null) : null,
        motoristas:   c.motorista_id   ? (motMap[c.motorista_id]       ?? null) : null,
        docSummary:   c.agregado_id    ? (docSummaryMap[c.agregado_id] ?? null) : null,
        notaMedia:    c.agregado_id    ? (notaMap[c.agregado_id]       ?? null) : null,
      }))

      setCandidaturas(enriched)
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
                {vaga.ano_maximo_veiculo && (
                  <p className="text-xs text-text-muted">Ano máximo: {vaga.ano_maximo_veiculo}</p>
                )}
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

        {/* Estimativa mensal */}
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
            {candidaturas.map((candidatura) => {
              const anoVeiculo = candidatura.veiculos?.ano
              const anoMaximo  = vaga.ano_maximo_veiculo
              const anoAlerta  = anoVeiculo && anoMaximo && anoVeiculo < anoMaximo

              return (
                <Card key={candidatura.id} padding="none" className="overflow-hidden">
                  {/* Color strip by status */}
                  <div className={`h-1 ${
                    candidatura.status === 'contratado'      ? 'bg-success' :
                    candidatura.status === 'em_formalizacao' ? 'bg-info' :
                    candidatura.status === 'recusado'        ? 'bg-danger' :
                    candidatura.status === 'aceito'          ? 'bg-success' :
                                                               'bg-warning'
                  }`} />

                  <div className="p-4 space-y-3">
                    {/* Header: avatar + nome + data + status */}
                    <div className="flex items-start justify-between gap-3">
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
                            Candidatou em {formatDate(candidatura.created_at)}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={candidatura.status} />
                    </div>

                    {/* Pipeline visual */}
                    <PipelineStrip status={candidatura.status} />

                    {/* Assets: veículo, equipamento, motorista */}
                    <div className="flex flex-wrap gap-2">
                      {candidatura.veiculos && (
                        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-pill border ${
                          anoAlerta
                            ? 'bg-warning-light border-warning/30 text-warning'
                            : 'bg-surface border-border text-text-secondary'
                        }`}>
                          <Truck size={11} />
                          {candidatura.veiculos.tipo} · {candidatura.veiculos.placa}
                          {anoVeiculo ? ` · ${anoVeiculo}` : ''}
                          {anoAlerta && <AlertTriangle size={10} className="ml-0.5" />}
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

                    {/* Decision aids: documentos + avaliação */}
                    <div className="flex flex-wrap gap-2">
                      <DocBadge summary={candidatura.docSummary} />
                      <NotaBadge nota={candidatura.notaMedia} />
                    </div>

                    {/* Mensagem do candidato */}
                    {candidatura.mensagem && (
                      <div className="flex items-start gap-2 bg-surface rounded-lg p-3">
                        <MessageSquare size={13} className="text-text-muted flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-text-secondary leading-relaxed">{candidatura.mensagem}</p>
                      </div>
                    )}

                    {/* Action buttons */}
                    {vaga.status !== 'encerrada' && ['pendente', 'visualizado', 'em_negociacao'].includes(candidatura.status) && (
                      <div className="flex gap-2 pt-1 border-t border-border">
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
                    {(candidatura.status === 'em_formalizacao' || candidatura.status === 'aceito') && (
                      <div className="flex items-center gap-2 pt-1 border-t border-border">
                        <FileText size={14} className="text-info" />
                        <p className="text-xs text-info font-medium">Aprovado — aguardando assinatura digital do agregado</p>
                      </div>
                    )}

                    {/* Status note for contratado */}
                    {candidatura.status === 'contratado' && (
                      <div className="flex items-center gap-2 pt-1 border-t border-border">
                        <CheckCircle2 size={14} className="text-success" />
                        <p className="text-xs text-success font-medium">Contrato ativo</p>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
