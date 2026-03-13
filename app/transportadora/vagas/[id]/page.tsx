'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { formatCurrency, type Vaga, type Candidatura } from '@/lib/types'
import {
  ArrowLeft, MapPin, Truck, Package, Clock, DollarSign,
  Users, User, MessageSquare, CheckCircle2, XCircle,
  Loader2, AlertCircle, CalendarDays, TrendingUp, RefreshCw,
} from 'lucide-react'
import { calcEstimativaMensal, calcKmViagem, calcDiasMes, calcKmMensal, labelFrequencia, labelSentido, formatCurrency as fc } from '@/lib/types'

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
  profiles?: Profile
  veiculos?: Veiculo | null
  equipamentos?: Equipamento | null
  motoristas?: Motorista | null
}

function StatusBadge({ status }: { status: Candidatura['status'] }) {
  if (status === 'aceito') return <Badge variant="success">Aceito</Badge>
  if (status === 'recusado') return <Badge variant="danger">Recusado</Badge>
  return <Badge variant="warning">Pendente</Badge>
}

function VagaStatusBadge({ status }: { status: Vaga['status'] }) {
  if (status === 'ativa') return <Badge variant="success">Ativa</Badge>
  if (status === 'encerrada') return <Badge variant="warning">Encerrada</Badge>
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

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      // Fetch vaga
      const { data: vagaData, error: vagaError } = await supabase
        .from('vagas')
        .select('*')
        .eq('id', vagaId)
        .eq('transportadora_id', user.id)
        .single()

      if (vagaError || !vagaData) {
        setError('Vaga não encontrada ou você não tem permissão para visualizá-la.')
        setLoading(false)
        return
      }

      setVaga(vagaData)

      // Fetch candidaturas with joined data
      const { data: candidaturasData, error: candError } = await supabase
        .from('candidaturas')
        .select(`
          *,
          profiles:agregado_id (nome),
          veiculos:veiculo_id (tipo, placa),
          equipamentos:equipamento_id (tipo, placa),
          motoristas:motorista_id (nome)
        `)
        .eq('vaga_id', vagaId)
        .order('created_at', { ascending: false })

      if (candError) throw candError

      setCandidaturas(candidaturasData ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [vagaId, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleAceitar(candidaturaId: string) {
    if (!confirm('Aceitar este candidato? As demais candidaturas pendentes serão recusadas e a vaga será marcada como preenchida.')) return

    setActionLoading(candidaturaId)
    try {
      const supabase = createClient()

      // Accept this candidatura
      const { error: acceptError } = await supabase
        .from('candidaturas')
        .update({ status: 'aceito' })
        .eq('id', candidaturaId)

      if (acceptError) throw acceptError

      // Reject all other pending candidaturas for this vaga
      const { error: rejectError } = await supabase
        .from('candidaturas')
        .update({ status: 'recusado' })
        .eq('vaga_id', vagaId)
        .eq('status', 'pendente')
        .neq('id', candidaturaId)

      if (rejectError) throw rejectError

      // Mark vaga as preenchida
      const { error: vagaError } = await supabase
        .from('vagas')
        .update({ status: 'preenchida' })
        .eq('id', vagaId)

      if (vagaError) throw vagaError

      // Optimistic update
      setVaga(prev => prev ? { ...prev, status: 'preenchida' } : prev)
      setCandidaturas(prev => prev.map(c => {
        if (c.id === candidaturaId) return { ...c, status: 'aceito' }
        if (c.status === 'pendente') return { ...c, status: 'recusado' }
        return c
      }))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao aceitar candidatura')
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

  const pendentes = candidaturas.filter(c => c.status === 'pendente').length
  const aceitos = candidaturas.filter(c => c.status === 'aceito').length

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
                  <p className="text-xs text-text-muted">{vaga.km_estimado.toLocaleString('pt-BR')} km ({labelSentido(vaga)})</p>
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
          {(vaga as any).valor_km && (
            <div className="flex items-start gap-2">
              <DollarSign size={15} className="text-text-muted mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Valor por km</p>
                <p className="text-sm font-semibold text-text-primary">{fc((vaga as any).valor_km)}/km</p>
              </div>
            </div>
          )}
          {(vaga as any).frequencia_tipo && (
            <div className="flex items-start gap-2">
              <RefreshCw size={15} className="text-text-muted mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Frequência</p>
                <p className="text-sm text-text-primary">{labelFrequencia(vaga as any)}</p>
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
          const est  = calcEstimativaMensal(vaga as any)
          const kmV  = calcKmViagem(vaga as any)
          const dias = calcDiasMes(vaga as any)
          const kmM  = calcKmMensal(vaga as any)
          if (!est) return null
          return (
            <div className="mt-4 bg-success-light border border-success/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-success" />
                <p className="text-xs font-semibold text-success uppercase tracking-wide">Estimativa mensal ao agregado</p>
              </div>
              <p className="font-bold text-success text-2xl mb-2">{fc(est)}<span className="text-sm font-normal text-text-secondary">/mês</span></p>
              {kmV && dias && kmM && (vaga as any).valor_km && (
                <p className="text-xs text-text-muted">
                  {fc((vaga as any).valor_km)}/km × {kmV.toLocaleString('pt-BR')} km × {dias} dias = {fc(est)}/mês · {kmM.toLocaleString('pt-BR')} km/mês
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
              <Badge variant="warning">{pendentes} pendente{pendentes !== 1 ? 's' : ''}</Badge>
            )}
            {aceitos > 0 && (
              <Badge variant="success">{aceitos} aceito{aceitos !== 1 ? 's' : ''}</Badge>
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
                          {candidatura.profiles?.nome || 'Agregado'}
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

                  {/* Action buttons — only show if vaga is ativa and candidatura is pendente */}
                  {vaga.status === 'ativa' && candidatura.status === 'pendente' && (
                    <div className="flex gap-2 pt-3 border-t border-border">
                      <Button
                        variant="success"
                        size="sm"
                        className="gap-1.5 flex-1"
                        onClick={() => handleAceitar(candidatura.id)}
                        loading={actionLoading === candidatura.id}
                      >
                        <CheckCircle2 size={14} />
                        Aceitar
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

                  {/* Show accepted badge note */}
                  {candidatura.status === 'aceito' && (
                    <div className="flex items-center gap-2 pt-3 border-t border-border">
                      <CheckCircle2 size={14} className="text-success" />
                      <p className="text-xs text-success font-medium">Candidatura aceita — contrato fechado</p>
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
