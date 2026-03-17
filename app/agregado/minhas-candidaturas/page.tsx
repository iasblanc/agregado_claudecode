'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Badge from '@/components/ui/Badge'
import { formatCurrency, calcEstimativaMensal, labelFrequencia } from '@/lib/types'
import { MapPin, Clock, CheckCircle2, XCircle, Truck, Package, User, Mail, Building2, FileText, ChevronRight } from 'lucide-react'

interface CandidaturaFull {
  id: string
  status: 'pendente' | 'visualizado' | 'em_negociacao' | 'em_formalizacao' | 'contratado' | 'recusado'
  mensagem: string | null
  created_at: string
  vagas: {
    rota_origem: string | null
    rota_destino: string | null
    uf_origem: string | null
    uf_destino: string | null
    valor_km: number | null
    km_estimado: number | null
    frequencia_tipo: string | null
    valor_contrato: number | null
    tipo_veiculo: string | null
    tipo_equipamento: string | null
    transportadoras: { razao_social: string | null } | null
  } | null
  veiculos: { tipo: string; placa: string } | null
  equipamentos: { tipo: string; placa: string | null } | null
  motoristas: { nome: string } | null
}

interface Interesse {
  id: string
  mensagem: string | null
  status: 'pendente' | 'visualizado' | 'aceito' | 'recusado'
  created_at: string
  transportadora_id: string
  transportadoras: { razao_social: string | null } | null
  vagas: { rota_origem: string | null; rota_destino: string | null; valor_contrato: number | null } | null
}

// Status visual config
const STATUS_CFG: Record<string, {
  label: string
  variant: 'warning' | 'success' | 'danger' | 'info' | 'muted'
  icon: React.ElementType
  barColor: string
}> = {
  pendente:         { label: 'Em análise',      variant: 'warning', icon: Clock,        barColor: 'bg-[#C8A84B]' },
  visualizado:      { label: 'Visualizado',     variant: 'info',    icon: Clock,        barColor: 'bg-[#3A4F6B]' },
  em_negociacao:    { label: 'Em negociação',   variant: 'info',    icon: Clock,        barColor: 'bg-[#3A4F6B]' },
  em_formalizacao:  { label: 'Aprovada! Assinar', variant: 'warning', icon: FileText,   barColor: 'bg-[#C26B3A]' },
  contratado:       { label: 'Contratado',      variant: 'success', icon: CheckCircle2, barColor: 'bg-[#3A6B4A]' },
  recusado:         { label: 'Recusado',        variant: 'danger',  icon: XCircle,      barColor: 'bg-[#8B3A3A]' },
}

const INTERESSE_CFG: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'info' | 'muted' }> = {
  pendente:    { label: 'Novo convite',  variant: 'warning' },
  visualizado: { label: 'Visualizado',  variant: 'info' },
  aceito:      { label: 'Aceito',       variant: 'success' },
  recusado:    { label: 'Recusado',     variant: 'danger' },
}

export default function MinhasCandidaturasPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'candidaturas' | 'convites'>('candidaturas')
  const [candidaturas, setCandidaturas] = useState<CandidaturaFull[]>([])
  const [interesses, setInteresses] = useState<Interesse[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      const [candRes, intRes] = await Promise.all([
        supabase
          .from('candidaturas')
          .select(`
            id, status, mensagem, created_at,
            vagas(rota_origem, rota_destino, uf_origem, uf_destino, valor_km, km_estimado, frequencia_tipo, valor_contrato, tipo_veiculo, tipo_equipamento, transportadoras(razao_social)),
            veiculos(tipo, placa),
            equipamentos(tipo, placa),
            motoristas(nome)
          `)
          .eq('agregado_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('interesses')
          .select(`
            id, mensagem, status, created_at, transportadora_id,
            transportadoras:transportadora_id(razao_social),
            vagas(rota_origem, rota_destino, valor_contrato)
          `)
          .eq('agregado_id', user.id)
          .order('created_at', { ascending: false }),
      ])
      setCandidaturas((candRes.data as unknown as CandidaturaFull[]) ?? [])
      setInteresses((intRes.data as unknown as Interesse[]) ?? [])
      setLoading(false)
    })
  }, [router])

  async function markInteresseViewed(id: string) {
    const interesse = interesses.find(i => i.id === id)
    if (!interesse || interesse.status !== 'pendente') return
    const supabase = createClient()
    await supabase.from('interesses').update({ status: 'visualizado' }).eq('id', id)
    setInteresses(prev => prev.map(i => i.id === id ? { ...i, status: 'visualizado' as const } : i))
  }

  async function respondInteresse(id: string, resposta: 'aceito' | 'recusado') {
    setUpdatingId(id)
    const supabase = createClient()
    await supabase.from('interesses').update({ status: resposta }).eq('id', id)
    setInteresses(prev => prev.map(i => i.id === id ? { ...i, status: resposta } : i))
    setUpdatingId(null)
  }

  const newConvitesCount = interesses.filter(i => i.status === 'pendente').length
  const pendentesCount = candidaturas.filter(c => ['pendente', 'visualizado', 'em_negociacao'].includes(c.status)).length
  const formalizacaoCount = candidaturas.filter(c => c.status === 'em_formalizacao').length

  if (loading) return <div className="px-4 py-10 text-center text-text-muted text-sm">Carregando...</div>

  return (
    <div className="px-4 py-5">
      {/* Header */}
      <div className="mb-4">
        <p className="text-[9px] uppercase tracking-[.16em] text-text-muted font-sans mb-1">Minha jornada</p>
        <h1 className="font-serif text-2xl font-medium text-text-primary">Candidaturas</h1>
      </div>

      {/* Alerta de formalização */}
      {formalizacaoCount > 0 && (
        <Link href="/agregado/contratos">
          <div className="bg-[rgba(194,107,58,.1)] border border-[rgba(194,107,58,.25)] rounded-xl p-3.5 mb-4 flex items-center gap-3">
            <FileText size={18} className="text-[#C26B3A] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-[#C26B3A]">
                {formalizacaoCount === 1 ? '1 proposta aprovada' : `${formalizacaoCount} propostas aprovadas`} aguardando sua assinatura
              </p>
              <p className="text-[11px] text-text-secondary mt-0.5">Acesse Contratos para assinar e formalizar</p>
            </div>
            <ChevronRight size={16} className="text-[#C26B3A] flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border mb-4">
        <button
          onClick={() => setTab('candidaturas')}
          className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[.08em] border-b-2 transition-all font-sans ${
            tab === 'candidaturas' ? 'border-[#2D2B26] text-text-primary' : 'border-transparent text-text-muted'
          }`}
        >
          Candidaturas
          {pendentesCount > 0 && (
            <span className="bg-[#C8A84B] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {pendentesCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('convites')}
          className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[.08em] border-b-2 transition-all font-sans ${
            tab === 'convites' ? 'border-[#2D2B26] text-text-primary' : 'border-transparent text-text-muted'
          }`}
        >
          Convites
          {newConvitesCount > 0 && (
            <span className="bg-[#C26B3A] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {newConvitesCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab: Candidaturas */}
      {tab === 'candidaturas' && (
        candidaturas.length === 0 ? (
          <div className="text-center py-16">
            <MapPin size={40} className="text-text-muted mx-auto mb-3" />
            <p className="font-serif text-lg font-medium text-text-primary">Nenhuma candidatura ainda</p>
            <p className="text-text-muted text-sm mt-1">Explore vagas no marketplace e candidate-se</p>
            <Link href="/agregado/marketplace" className="text-[#C26B3A] text-sm underline mt-3 inline-block">
              Ver vagas disponíveis
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {candidaturas.map(c => {
              const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.pendente
              const { label, variant, icon: StatusIcon, barColor } = cfg
              const estimativa = c.vagas ? calcEstimativaMensal(c.vagas as Parameters<typeof calcEstimativaMensal>[0]) : null
              const rota = [
                [c.vagas?.rota_origem, c.vagas?.uf_origem].filter(Boolean).join('/'),
                [c.vagas?.rota_destino, c.vagas?.uf_destino].filter(Boolean).join('/'),
              ].filter(Boolean).join(' → ')

              return (
                <div key={c.id} className="bg-bg border border-border rounded-2xl overflow-hidden shadow-card">
                  {/* Status bar 3px top */}
                  <div className={`h-[3px] w-full ${barColor}`} />

                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-[.1em] text-text-muted font-sans mb-0.5">
                          {c.vagas?.transportadoras?.razao_social ?? 'Transportadora'}
                        </p>
                        <h3 className="font-serif text-[18px] font-medium text-text-primary leading-tight truncate">
                          {rota || '—'}
                        </h3>
                      </div>
                      <Badge variant={variant} className="flex items-center gap-1 shrink-0 mt-0.5">
                        <StatusIcon size={11} />{label}
                      </Badge>
                    </div>

                    {/* Remuneração */}
                    {(c.vagas?.valor_km || estimativa) && (
                      <div className="bg-surface rounded-xl px-3 py-2.5 mb-3 flex items-center justify-between">
                        {c.vagas?.valor_km && (
                          <div>
                            <p className="text-[10px] text-text-muted">R$/km</p>
                            <p className="font-serif text-[20px] font-medium text-[#3A6B4A] leading-none">
                              {formatCurrency(c.vagas.valor_km)}
                            </p>
                          </div>
                        )}
                        {estimativa && (
                          <div className="text-right">
                            <p className="text-[10px] text-text-muted">Estimativa/mês</p>
                            <p className="font-serif text-[18px] font-medium text-[#3A6B4A] leading-none">
                              {formatCurrency(estimativa)}
                            </p>
                            {c.vagas?.frequencia_tipo && (
                              <p className="text-[9px] text-text-muted mt-0.5">
                                {labelFrequencia(c.vagas as Parameters<typeof labelFrequencia>[0])}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Veículo / Equipamento / Motorista */}
                    {(c.veiculos || c.equipamentos || c.motoristas) && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {c.veiculos && (
                          <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs">
                            <Truck size={11} className="text-text-muted" />
                            <span className="text-text-secondary">{c.veiculos.tipo}</span>
                            <span className="text-text-muted">{c.veiculos.placa}</span>
                          </div>
                        )}
                        {c.equipamentos && (
                          <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs">
                            <Package size={11} className="text-text-muted" />
                            <span className="text-text-secondary truncate max-w-[100px]">{c.equipamentos.tipo.split(' ')[0]}</span>
                          </div>
                        )}
                        {c.motoristas && (
                          <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs">
                            <User size={11} className="text-text-muted" />
                            <span className="text-text-secondary">{c.motoristas.nome.split(' ')[0]}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[11px] text-text-muted border-t border-border pt-2.5">
                      <span>Candidatura em {new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>

                    {/* CTA: em_formalizacao */}
                    {c.status === 'em_formalizacao' && (
                      <Link href="/agregado/contratos">
                        <div className="mt-3 flex items-center gap-2 bg-[rgba(194,107,58,.1)] border border-[rgba(194,107,58,.25)] rounded-xl p-3 cursor-pointer hover:bg-[rgba(194,107,58,.15)] transition-colors">
                          <FileText size={15} className="text-[#C26B3A] flex-shrink-0" />
                          <span className="text-[13px] font-medium text-[#C26B3A] flex-1">
                            Proposta aprovada! Ir para assinar →
                          </span>
                          <ChevronRight size={14} className="text-[#C26B3A]" />
                        </div>
                      </Link>
                    )}

                    {/* CTA: contratado */}
                    {c.status === 'contratado' && (
                      <Link href="/agregado/contratos">
                        <div className="mt-3 flex items-center gap-2 bg-[rgba(58,107,74,.08)] border border-[rgba(58,107,74,.2)] rounded-xl p-3 cursor-pointer hover:bg-[rgba(58,107,74,.12)] transition-colors">
                          <CheckCircle2 size={15} className="text-[#3A6B4A] flex-shrink-0" />
                          <span className="text-[13px] font-medium text-[#3A6B4A] flex-1">
                            Contrato ativo! Ver em Contratos →
                          </span>
                          <ChevronRight size={14} className="text-[#3A6B4A]" />
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Tab: Convites */}
      {tab === 'convites' && (
        interesses.length === 0 ? (
          <div className="text-center py-16">
            <Mail size={40} className="text-text-muted mx-auto mb-3" />
            <p className="font-serif text-lg font-medium text-text-primary">Nenhum convite recebido</p>
            <p className="text-text-muted text-sm mt-1">Quando transportadoras entrarem em contato, aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {interesses.map(i => {
              const cfg = INTERESSE_CFG[i.status] ?? INTERESSE_CFG.pendente
              const isPendente = i.status === 'pendente' || i.status === 'visualizado'
              return (
                <div
                  key={i.id}
                  className="bg-bg border border-border rounded-2xl p-4 shadow-card"
                  onClick={() => markInteresseViewed(i.id)}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-[#E0DAD0] border border-border flex items-center justify-center flex-shrink-0">
                        <Building2 size={18} className="text-text-muted" />
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary text-sm">
                          {(i.transportadoras as { razao_social?: string | null } | null)?.razao_social ?? 'Transportadora'}
                        </p>
                        <p className="text-xs text-text-muted">{new Date(i.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <Badge variant={cfg.variant} className="shrink-0">{cfg.label}</Badge>
                  </div>

                  {i.mensagem && (
                    <p className="text-sm text-text-secondary bg-surface border border-border rounded-xl p-3 mb-3 italic">
                      "{i.mensagem}"
                    </p>
                  )}

                  {i.vagas && (
                    <div className="text-xs text-text-muted mb-3">
                      <span className="font-medium text-text-secondary">
                        {i.vagas.rota_origem} → {i.vagas.rota_destino}
                      </span>
                      {i.vagas.valor_contrato && (
                        <span className="ml-2 font-semibold text-text-primary">{formatCurrency(i.vagas.valor_contrato)}/mês</span>
                      )}
                    </div>
                  )}

                  {isPendente && (
                    <div className="flex items-center gap-2 pt-3 border-t border-border">
                      <button
                        onClick={e => { e.stopPropagation(); respondInteresse(i.id, 'recusado') }}
                        disabled={updatingId === i.id}
                        className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-border text-text-secondary hover:bg-surface transition-colors disabled:opacity-50"
                      >
                        Recusar
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); respondInteresse(i.id, 'aceito') }}
                        disabled={updatingId === i.id}
                        className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-[#2D2B26] text-[#F5F2EC] hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        Aceitar convite
                      </button>
                    </div>
                  )}

                  {i.status === 'aceito' && (
                    <div className="mt-2 text-xs text-[#3A6B4A] bg-[rgba(58,107,74,.08)] border border-[rgba(58,107,74,.2)] rounded-xl px-3 py-2">
                      ✓ Você aceitou este convite. Aguarde a transportadora formalizar o contrato.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
