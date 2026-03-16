'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Badge from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/types'
import { MapPin, Clock, CheckCircle2, XCircle, Truck, Package, User, Mail, Building2, FileText } from 'lucide-react'

interface CandidaturaFull {
  id: string
  status: 'pendente' | 'visualizado' | 'em_negociacao' | 'em_formalizacao' | 'contratado' | 'recusado'
  mensagem: string | null
  created_at: string
  vagas: {
    rota_origem: string | null
    rota_destino: string | null
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

const statusConfig: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'info' | 'default'; icon: React.ElementType }> = {
  pendente:         { label: 'Em análise',     variant: 'warning',  icon: Clock },
  visualizado:      { label: 'Visualizado',    variant: 'info',     icon: Clock },
  em_negociacao:    { label: 'Em negociação',  variant: 'info',     icon: Clock },
  em_formalizacao:  { label: 'Em formalização', variant: 'warning', icon: FileText },
  contratado:       { label: 'Contratado',     variant: 'success',  icon: CheckCircle2 },
  recusado:         { label: 'Recusado',       variant: 'danger',   icon: XCircle },
}

const interesseStatusConfig: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'info' | 'default' }> = {
  pendente:   { label: 'Novo convite',  variant: 'warning' },
  visualizado:{ label: 'Visualizado',  variant: 'info' },
  aceito:     { label: 'Aceito',       variant: 'success' },
  recusado:   { label: 'Recusado',     variant: 'danger' },
}

export default function MinhasCandidaturasPage() {
  const [tab, setTab] = useState<'candidaturas' | 'convites'>('candidaturas')
  const [candidaturas, setCandidaturas] = useState<CandidaturaFull[]>([])
  const [interesses, setInteresses] = useState<Interesse[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const [candRes, intRes] = await Promise.all([
        supabase
          .from('candidaturas')
          .select(`
            id, status, mensagem, created_at,
            vagas(rota_origem, rota_destino, valor_contrato, tipo_veiculo, tipo_equipamento, transportadoras(razao_social)),
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
  }, [])

  async function markInteresseViewed(id: string) {
    const interesse = interesses.find(i => i.id === id)
    if (!interesse || interesse.status !== 'pendente') return
    const supabase = createClient()
    await supabase.from('interesses').update({ status: 'visualizado' }).eq('id', id)
    setInteresses(prev => prev.map(i => i.id === id ? { ...i, status: 'visualizado' } : i))
  }

  async function respondInteresse(id: string, resposta: 'aceito' | 'recusado') {
    setUpdatingId(id)
    const supabase = createClient()
    await supabase.from('interesses').update({ status: resposta }).eq('id', id)
    setInteresses(prev => prev.map(i => i.id === id ? { ...i, status: resposta } : i))
    setUpdatingId(null)
  }

  const newConvitesCount = interesses.filter(i => i.status === 'pendente').length

  if (loading) return <div className="px-4 py-10 text-center text-text-muted">Carregando...</div>

  return (
    <div className="px-4 py-5">
      <div className="mb-5">
        <h1 className="font-serif text-2xl font-bold text-text-primary">Candidaturas e Convites</h1>
        <p className="text-text-secondary text-sm mt-1">
          {candidaturas.length} candidatura{candidaturas.length !== 1 ? 's' : ''} · {interesses.length} convite{interesses.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-5">
        <button
          onClick={() => setTab('candidaturas')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'candidaturas' ? 'bg-bg shadow-sm text-text-primary' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          Minhas Candidaturas
        </button>
        <button
          onClick={() => setTab('convites')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors relative ${
            tab === 'convites' ? 'bg-bg shadow-sm text-text-primary' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          Convites
          {newConvitesCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] bg-warning text-white text-[9px] font-bold rounded-full px-1">
              {newConvitesCount}
            </span>
          )}
        </button>
      </div>

      {/* Candidaturas Tab */}
      {tab === 'candidaturas' && (
        candidaturas.length === 0 ? (
          <div className="text-center py-16">
            <MapPin size={40} className="text-text-muted mx-auto mb-3" />
            <p className="font-semibold text-text-primary">Nenhuma candidatura ainda</p>
            <p className="text-text-muted text-sm mt-1">Explore vagas no marketplace e candidate-se</p>
            <a href="/agregado/marketplace" className="text-accent text-sm underline mt-3 inline-block">Ver vagas disponíveis</a>
          </div>
        ) : (
          <div className="space-y-3">
            {candidaturas.map(c => {
              const cfg = statusConfig[c.status] ?? statusConfig.pendente
              const { label, variant, icon: StatusIcon } = cfg
              return (
                <div key={c.id} className="bg-surface border border-border rounded-xl p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold text-text-primary text-sm">
                        {c.vagas?.rota_origem} → {c.vagas?.rota_destino}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {c.vagas?.transportadoras?.razao_social ?? 'Transportadora'}
                      </p>
                    </div>
                    <Badge variant={variant} className="flex items-center gap-1 shrink-0">
                      <StatusIcon size={11} />{label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                    {c.veiculos && (
                      <div className="bg-bg border border-border rounded-md p-2">
                        <p className="text-text-muted flex items-center gap-1 mb-0.5"><Truck size={10} />Veículo</p>
                        <p className="font-medium text-text-primary">{c.veiculos.tipo}</p>
                        <p className="text-text-muted">{c.veiculos.placa}</p>
                      </div>
                    )}
                    {c.equipamentos && (
                      <div className="bg-bg border border-border rounded-md p-2">
                        <p className="text-text-muted flex items-center gap-1 mb-0.5"><Package size={10} />Equip.</p>
                        <p className="font-medium text-text-primary truncate">{c.equipamentos.tipo.split(' ')[0]}</p>
                      </div>
                    )}
                    {c.motoristas && (
                      <div className="bg-bg border border-border rounded-md p-2">
                        <p className="text-text-muted flex items-center gap-1 mb-0.5"><User size={10} />Motorista</p>
                        <p className="font-medium text-text-primary truncate">{c.motoristas.nome.split(' ')[0]}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-text-muted border-t border-border pt-2">
                    <span>Candidatura em {new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                    {c.vagas?.valor_contrato && (
                      <span className="font-semibold text-text-primary">{formatCurrency(c.vagas.valor_contrato)}/mês</span>
                    )}
                  </div>

                  {c.status === 'em_formalizacao' && (
                    <div className="mt-3 bg-warning-light border border-warning/20 rounded-lg p-3 text-sm text-warning-dark">
                      Sua candidatura foi aprovada! Acesse <strong>Contratos</strong> para assinar o contrato digital.
                    </div>
                  )}
                  {c.status === 'contratado' && (
                    <div className="mt-3 bg-success-light border border-success/20 rounded-lg p-3 text-sm text-success">
                      🎉 Contrato ativo! Acesse <strong>Contratos</strong> para acompanhar.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Convites Tab */}
      {tab === 'convites' && (
        interesses.length === 0 ? (
          <div className="text-center py-16">
            <Mail size={40} className="text-text-muted mx-auto mb-3" />
            <p className="font-semibold text-text-primary">Nenhum convite recebido</p>
            <p className="text-text-muted text-sm mt-1">Quando transportadoras entrarem em contato, aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {interesses.map(i => {
              const cfg = interesseStatusConfig[i.status] ?? interesseStatusConfig.pendente
              const isPendente = i.status === 'pendente' || i.status === 'visualizado'
              return (
                <div
                  key={i.id}
                  className="bg-surface border border-border rounded-xl p-4 shadow-card"
                  onClick={() => markInteresseViewed(i.id)}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#E0DAD0] border border-border flex items-center justify-center flex-shrink-0">
                        <Building2 size={16} className="text-text-muted" />
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary text-sm">
                          {(i.transportadoras as any)?.razao_social ?? 'Transportadora'}
                        </p>
                        <p className="text-xs text-text-muted">{new Date(i.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <Badge variant={cfg.variant} className="shrink-0">{cfg.label}</Badge>
                  </div>

                  {i.mensagem && (
                    <p className="text-sm text-text-secondary bg-bg border border-border rounded-lg p-3 mb-3 italic">
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
                        className="flex-1 py-2 text-sm font-medium rounded-lg border border-border text-text-secondary hover:bg-[#E0DAD0] transition-colors disabled:opacity-50"
                      >
                        Recusar
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); respondInteresse(i.id, 'aceito') }}
                        disabled={updatingId === i.id}
                        className="flex-1 py-2 text-sm font-medium rounded-lg bg-accent text-bg hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        Aceitar convite
                      </button>
                    </div>
                  )}

                  {i.status === 'aceito' && (
                    <div className="mt-2 text-xs text-success bg-success-light border border-success/20 rounded-lg px-3 py-2">
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
