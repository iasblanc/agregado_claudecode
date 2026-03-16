'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { MapPin, Truck, Package, User, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type CandStatus = 'pendente' | 'visualizado' | 'em_negociacao' | 'em_formalizacao' | 'aceito' | 'contratado' | 'recusado'

interface CandidaturaFull {
  id: string
  status: CandStatus
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
    tipo_veiculo: string | null
    tipo_equipamento: string | null
    transportadoras: { razao_social: string | null } | null
  } | null
  veiculos: { tipo: string; placa: string } | null
  equipamentos: { tipo: string; placa: string | null } | null
  motoristas: { nome: string } | null
}

// ── Status configuration ──────────────────────────────────────────────────────

const statusConfig: Record<CandStatus, { label: string; colorClass: string; step: number }> = {
  pendente:        { label: 'Aguardando análise', colorClass: 'text-warning bg-warning-light border-warning/20',   step: 1 },
  visualizado:     { label: 'Visualizado',         colorClass: 'text-info bg-info-light border-info/20',            step: 2 },
  em_negociacao:   { label: 'Em negociação',       colorClass: 'text-gold bg-gold-light border-gold/20',            step: 3 },
  em_formalizacao: { label: 'Proposta enviada',    colorClass: 'text-warning bg-warning-light border-warning/20',   step: 4 },
  aceito:          { label: 'Aceito',              colorClass: 'text-success bg-success-light border-success/20',   step: 5 },
  contratado:      { label: 'Contratado',          colorClass: 'text-success bg-success-light border-success/20',   step: 5 },
  recusado:        { label: 'Não selecionado',     colorClass: 'text-danger bg-danger-light border-danger/20',      step: 0 },
}

const timelineSteps = ['Enviada', 'Visto', 'Negoc.', 'Proposta', 'Contrato']

// ── Timeline component ────────────────────────────────────────────────────────

function Timeline({ step }: { step: number }) {
  if (step === 0) return null // recusado — sem timeline
  return (
    <div className="flex items-center gap-0 mt-3 mb-1">
      {timelineSteps.map((label, i) => {
        const stepNum = i + 1
        const done = stepNum < step
        const active = stepNum === step
        const isLast = i === timelineSteps.length - 1
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                ${done ? 'bg-success border-success' : active ? 'bg-accent border-accent' : 'bg-bg border-border'}`}>
                {done && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className={`text-[9px] font-sans mt-0.5 text-center leading-tight
                ${done ? 'text-success' : active ? 'text-text-primary font-semibold' : 'text-text-muted'}`}>
                {label}
              </span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mb-3.5 mx-0.5 transition-colors ${done ? 'bg-success' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

function CandCard({ c }: { c: CandidaturaFull }) {
  const cfg = statusConfig[c.status]
  const vaga = c.vagas

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-serif text-[15px] font-medium text-text-primary truncate">
            {vaga?.rota_origem} → {vaga?.rota_destino}
          </p>
          <p className="text-xs text-text-muted mt-0.5 truncate">
            {vaga?.transportadoras?.razao_social ?? 'Transportadora'}
            {vaga?.tipo_veiculo ? ` · ${vaga.tipo_veiculo}` : ''}
          </p>
        </div>
        <span className={`text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-1 rounded-full border flex-shrink-0 ${cfg.colorClass}`}>
          {cfg.label}
        </span>
      </div>

      {/* Timeline */}
      <Timeline step={cfg.step} />

      {/* Recusado: mensagem suave */}
      {c.status === 'recusado' && (
        <div className="bg-surface border border-border rounded-lg px-3 py-2 mt-2">
          <p className="text-xs text-text-muted">Esta vaga não seguiu em frente. Continue candidatando-se a outras oportunidades.</p>
        </div>
      )}

      {/* Detalhes */}
      {(c.veiculos || c.equipamentos || c.motoristas) && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {c.veiculos && (
            <div className="bg-bg border border-border rounded-md p-2">
              <p className="text-text-muted flex items-center gap-1 mb-0.5 text-[10px]"><Truck size={9} />Veículo</p>
              <p className="font-sans font-medium text-text-primary text-[11px] truncate">{c.veiculos.tipo}</p>
              <p className="text-text-muted text-[10px]">{c.veiculos.placa}</p>
            </div>
          )}
          {c.equipamentos && (
            <div className="bg-bg border border-border rounded-md p-2">
              <p className="text-text-muted flex items-center gap-1 mb-0.5 text-[10px]"><Package size={9} />Equip.</p>
              <p className="font-sans font-medium text-text-primary text-[11px] truncate">{c.equipamentos.tipo.split(' ')[0]}</p>
            </div>
          )}
          {c.motoristas && (
            <div className="bg-bg border border-border rounded-md p-2">
              <p className="text-text-muted flex items-center gap-1 mb-0.5 text-[10px]"><User size={9} />Motorista</p>
              <p className="font-sans font-medium text-text-primary text-[11px] truncate">{c.motoristas.nome.split(' ')[0]}</p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
        <span className="text-[11px] text-text-muted">
          {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        {vaga?.valor_km && (
          <span className="font-serif text-[14px] font-medium text-success">{formatCurrency(vaga.valor_km)}/km</span>
        )}
      </div>

      {/* CTAs por status */}
      {c.status === 'em_formalizacao' && (
        <Link href="/agregado/contratos">
          <div className="mt-3 bg-warning-light border border-warning/20 rounded-lg px-3 py-2.5 flex items-center justify-between">
            <p className="text-[13px] font-sans font-medium text-warning">Proposta aguardando sua assinatura</p>
            <ChevronRight size={14} className="text-warning flex-shrink-0" />
          </div>
        </Link>
      )}
      {c.status === 'contratado' && (
        <Link href="/agregado/contratos?tab=ativos">
          <div className="mt-3 bg-success-light border border-success/20 rounded-lg px-3 py-2.5 flex items-center justify-between">
            <p className="text-[13px] font-sans font-medium text-success">🎉 Contratado — ver contrato ativo</p>
            <ChevronRight size={14} className="text-success flex-shrink-0" />
          </div>
        </Link>
      )}
      {c.status === 'aceito' && (
        <div className="mt-3 bg-success-light border border-success/20 rounded-lg px-3 py-2.5">
          <p className="text-[13px] font-sans font-medium text-success">🎉 Candidatura aceita — aguardando contrato formal</p>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const tabFilters: { key: string; label: string; statuses: CandStatus[] }[] = [
  { key: 'ativas',     label: 'Ativas',      statuses: ['pendente', 'visualizado', 'em_negociacao', 'em_formalizacao', 'aceito'] },
  { key: 'contratos',  label: 'Contratos',   statuses: ['contratado'] },
  { key: 'recusadas',  label: 'Recusadas',   statuses: ['recusado'] },
]

export default function MinhasCandidaturasPage() {
  const [candidaturas, setCandidaturas] = useState<CandidaturaFull[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('ativas')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('candidaturas')
        .select(`
          id, status, mensagem, created_at,
          vagas(rota_origem, rota_destino, uf_origem, uf_destino, valor_km, km_estimado, frequencia_tipo, tipo_veiculo, tipo_equipamento, transportadoras(razao_social)),
          veiculos(tipo, placa),
          equipamentos(tipo, placa),
          motoristas(nome)
        `)
        .eq('agregado_id', user.id)
        .order('created_at', { ascending: false })
      setCandidaturas((data as unknown as CandidaturaFull[]) ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="px-4 py-10 text-center text-text-muted text-sm">Carregando...</div>

  const activeTab = tabFilters.find(t => t.key === tab)!
  const filtered = candidaturas.filter(c => activeTab.statuses.includes(c.status))

  return (
    <div className="px-4 py-5">
      <div className="mb-5">
        <h1 className="font-serif text-2xl font-medium text-text-primary">Minhas Candidaturas</h1>
        <p className="text-xs text-text-muted mt-0.5">{candidaturas.length} candidatura{candidaturas.length !== 1 ? 's' : ''} no total</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-5">
        {tabFilters.map(t => {
          const count = candidaturas.filter(c => t.statuses.includes(c.status)).length
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-[13px] font-sans font-medium transition-colors
                ${tab === t.key ? 'bg-bg shadow-card text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            >
              {t.label}
              {count > 0 && (
                <span className={`ml-1.5 inline-flex items-center justify-center w-4 h-4 text-white text-[9px] font-bold rounded-full
                  ${t.key === 'contratos' ? 'bg-success' : t.key === 'recusadas' ? 'bg-danger' : 'bg-accent'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <MapPin size={40} className="text-text-muted mx-auto mb-3" />
          <p className="font-sans font-medium text-text-primary text-sm">Nenhuma candidatura aqui</p>
          <p className="text-xs text-text-muted mt-1">
            {tab === 'ativas' ? 'Explore vagas no marketplace e candidate-se' : 'Nada nesta categoria ainda'}
          </p>
          {tab === 'ativas' && (
            <Link href="/agregado/marketplace" className="text-accent text-sm underline mt-3 inline-block">
              Ver vagas disponíveis
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => <CandCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  )
}
