'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import Badge from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  formatCurrency, calcEstimativaMensal, labelFrequencia,
  type Vaga,
} from '@/lib/types'
import {
  CheckCircle2, X, ChevronRight, FileSignature,
  Calendar, MapPin, Truck, DollarSign,
} from 'lucide-react'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface VagaJoined extends Pick<Vaga, 'valor_km' | 'km_estimado' | 'frequencia_tipo' | 'forma_pagamento' | 'rota_origem' | 'rota_destino' | 'uf_origem' | 'uf_destino' | 'tipo_veiculo' | 'tipo_equipamento' | 'inicio_previsto' | 'periodo_meses' | 'valor_contrato'> {
  transportadora: { razao_social: string | null } | null
}

interface CandidaturaParaAssinar {
  id: string
  status: string
  created_at: string
  vaga: VagaJoined | null
}

interface ContratoAtivo {
  id: string
  status: 'ativo' | 'suspenso' | 'encerrado'
  data_inicio: string | null
  data_fim_prevista: string | null
  created_at: string
  vaga: VagaJoined | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function rota(vaga: VagaJoined | null): string {
  if (!vaga) return '—'
  const orig = [vaga.rota_origem, vaga.uf_origem].filter(Boolean).join('/')
  const dest = [vaga.rota_destino, vaga.uf_destino].filter(Boolean).join('/')
  if (!orig && !dest) return '—'
  return `${orig || '?'} → ${dest || '?'}`
}

// ── Stepper ───────────────────────────────────────────────────────────────────

function Stepper({ step }: { step: number }) {
  const steps = ['Proposta', 'Termos', 'Assinatura', 'Concluído']
  return (
    <div className="flex items-center justify-center gap-0 mb-5 px-2">
      {steps.map((label, i) => {
        const idx = i + 1
        const done = idx < step
        const active = idx === step
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all
                ${done ? 'bg-success border-success text-white' : active ? 'bg-accent border-accent text-bg' : 'bg-bg border-border text-text-muted'}`}>
                {done ? '✓' : idx}
              </div>
              <span className={`text-[9px] mt-1 font-sans ${active ? 'text-text-primary font-medium' : 'text-text-muted'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-8 mx-1 mb-4 transition-all ${done ? 'bg-success' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Modal de assinatura ───────────────────────────────────────────────────────

interface SignModalProps {
  candidatura: CandidaturaParaAssinar
  onClose: () => void
  onSigned: (id: string) => void
}

function SignModal({ candidatura, onClose, onSigned }: SignModalProps) {
  const [step, setStep] = useState(1)
  const [termsChecked, setTermsChecked] = useState(false)
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [signing, setSigning] = useState(false)
  const [hasSig, setHasSig] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  const vaga = candidatura.vaga
  const estimativa = vaga ? calcEstimativaMensal(vaga) : null

  // Canvas helpers
  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const canvas = canvasRef.current; if (!canvas) return
    drawing.current = true
    lastPos.current = getPos(e, canvas)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1A1915'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
    setHasSig(true)
  }

  function stopDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    drawing.current = false
  }

  function clearSig() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSig(false)
  }

  const handleConfirm = useCallback(async () => {
    if (!nome.trim() || !cpf.trim() || !hasSig) return
    setSigning(true)
    try {
      const supabase = createClient()
      // Atualiza candidatura para contratado
      await supabase.from('candidaturas').update({ status: 'contratado' }).eq('id', candidatura.id)
      // Ativa o contrato gerado na aprovação
      await supabase
        .from('contratos_motorista')
        .update({ status: 'ativo', data_inicio: new Date().toISOString().split('T')[0] })
        .eq('candidatura_id', candidatura.id)
        .eq('status', 'pendente_assinatura')
      setStep(4)
      onSigned(candidatura.id)
    } finally {
      setSigning(false)
    }
  }, [nome, cpf, hasSig, candidatura.id, onSigned])

  const canAdvance3 = nome.trim().length > 2 && cpf.trim().length >= 11 && hasSig

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-bg rounded-t-2xl max-h-[92vh] overflow-y-auto shadow-modal">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between border-b border-border">
          <h2 className="font-serif text-lg font-medium text-text-primary">
            {step < 4 ? 'Assinar proposta' : 'Proposta assinada'}
          </h2>
          {step < 4 && (
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-surface text-text-muted">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="px-5 py-4">
          <Stepper step={step} />

          {/* Etapa 1 — Preview da proposta */}
          {step === 1 && (
            <div>
              <p className="text-[9px] uppercase tracking-[.16em] text-text-muted font-sans mb-2">
                {(vaga?.transportadora as { razao_social: string | null } | null)?.razao_social?.toUpperCase() ?? 'TRANSPORTADORA'}
              </p>
              <h3 className="font-serif text-xl font-medium text-text-primary mb-4">{rota(vaga)}</h3>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {[
                  { label: 'Remuneração', value: vaga?.valor_km ? `${formatCurrency(vaga.valor_km)}/km` : '—' },
                  { label: 'Distância', value: vaga?.km_estimado ? `${vaga.km_estimado} km` : '—' },
                  { label: 'Início previsto', value: fmtDate(vaga?.inicio_previsto) },
                  { label: 'Vigência', value: vaga?.periodo_meses ? `${vaga.periodo_meses} meses` : '—' },
                  { label: 'Pagamento', value: vaga?.forma_pagamento ?? '—' },
                  { label: 'Estimativa/mês', value: estimativa ? formatCurrency(estimativa) : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-surface rounded-lg p-2.5">
                    <p className="text-[9px] uppercase tracking-[.1em] text-text-muted font-sans mb-1">{label}</p>
                    <p className="text-sm font-medium text-text-primary">{value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-info-light border border-info/20 rounded-lg p-3 text-xs text-text-secondary mb-4">
                <strong className="text-info">Atenção:</strong> Leia atentamente os termos antes de assinar. Esta proposta foi enviada pela transportadora e aguarda apenas sua assinatura digital.
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full bg-accent text-bg py-3 rounded-pill text-xs font-medium uppercase tracking-[.1em] font-sans">
                Revisar termos →
              </button>
            </div>
          )}

          {/* Etapa 2 — Termos */}
          {step === 2 && (
            <div>
              <div className="bg-surface border border-border rounded-xl p-4 h-48 overflow-y-auto text-xs text-text-secondary leading-relaxed mb-4">
                <p className="font-semibold text-text-primary mb-2">CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TRANSPORTE</p>
                <p className="mb-2">Pelo presente instrumento, as partes acima identificadas — doravante denominadas <strong>CONTRATANTE</strong> (transportadora) e <strong>CONTRATADO</strong> (agregado) — celebram o presente contrato de prestação de serviços de transporte rodoviário de cargas, nos termos da legislação vigente (Lei 11.442/2007 e Resolução ANTT 5.564/2020).</p>
                <p className="mb-2"><strong>Cláusula 1ª — OBJETO.</strong> O CONTRATADO se compromete a prestar serviços de transporte de cargas na rota estipulada, utilizando veículo próprio regularizado junto ao RNTRC/ANTT, durante o período de vigência estabelecido.</p>
                <p className="mb-2"><strong>Cláusula 2ª — REMUNERAÇÃO.</strong> O CONTRATANTE pagará ao CONTRATADO o valor estipulado na proposta por km rodado na rota, na periodicidade e forma de pagamento acordados.</p>
                <p className="mb-2"><strong>Cláusula 3ª — OBRIGAÇÕES DO CONTRATADO.</strong> Manter o veículo em perfeitas condições de tráfego; possuir toda documentação exigida; comunicar qualquer imprevisto; cumprir os prazos de coleta e entrega.</p>
                <p className="mb-2"><strong>Cláusula 4ª — RESCISÃO.</strong> Este contrato poderá ser rescindido por qualquer das partes, mediante aviso prévio de 15 (quinze) dias, sem ônus para nenhuma das partes, salvo em caso de inadimplência ou descumprimento das obrigações.</p>
                <p><strong>Cláusula 5ª — FORO.</strong> As partes elegem o foro da comarca da sede da CONTRATANTE para dirimir quaisquer dúvidas oriundas do presente instrumento.</p>
              </div>
              <label className="flex items-start gap-3 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsChecked}
                  onChange={e => setTermsChecked(e.target.checked)}
                  className="mt-0.5 accent-[#2D2B26]"
                />
                <span className="text-xs text-text-secondary">Li e concordo com os termos e condições do contrato acima</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-border text-text-primary py-3 rounded-pill text-xs font-medium uppercase tracking-[.1em] font-sans">
                  ← Voltar
                </button>
                <button
                  disabled={!termsChecked}
                  onClick={() => setStep(3)}
                  className="flex-[2] bg-accent text-bg py-3 rounded-pill text-xs font-medium uppercase tracking-[.1em] font-sans disabled:opacity-40">
                  Ir para assinatura →
                </button>
              </div>
            </div>
          )}

          {/* Etapa 3 — Assinatura */}
          {step === 3 && (
            <div>
              <p className="text-xs text-text-secondary mb-3">Assine com o dedo ou mouse no espaço abaixo, e confirme seus dados pessoais.</p>
              <div className="border-2 border-dashed border-border rounded-xl overflow-hidden mb-2 relative bg-[#FAF8F4]">
                {!hasSig && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-text-muted text-sm font-sans">✍️ Assine aqui</span>
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={120}
                  className="w-full touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
              </div>
              <button onClick={clearSig} className="text-xs text-text-muted font-sans mb-4">↺ Limpar assinatura</button>
              <div className="grid grid-cols-1 gap-3 mb-4">
                <Input
                  label="Nome completo (conforme CNH)"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Machado"
                />
                <Input
                  label="CPF"
                  value={cpf}
                  onChange={e => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
              <p className="text-[10px] text-text-muted mb-4">🔒 Sua assinatura, IP e timestamp são registrados para fins legais.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 border border-border text-text-primary py-3 rounded-pill text-xs font-medium uppercase tracking-[.1em] font-sans">
                  ← Voltar
                </button>
                <button
                  disabled={!canAdvance3 || signing}
                  onClick={handleConfirm}
                  className="flex-[2] bg-accent text-bg py-3 rounded-pill text-xs font-medium uppercase tracking-[.1em] font-sans disabled:opacity-40">
                  {signing ? 'Assinando...' : 'Assinar e confirmar →'}
                </button>
              </div>
            </div>
          )}

          {/* Etapa 4 — Sucesso */}
          {step === 4 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={36} className="text-success" />
              </div>
              <h3 className="font-serif text-xl font-medium text-text-primary mb-2">Proposta assinada!</h3>
              <p className="text-sm text-text-secondary mb-6">
                Seu contrato com <strong>{(vaga?.transportadora as { razao_social: string | null } | null)?.razao_social}</strong> foi formalizado com sucesso.
                A transportadora receberá uma notificação.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-accent text-bg py-3 rounded-pill text-xs font-medium uppercase tracking-[.1em] font-sans">
                Ver meus contratos
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Contrato Card ─────────────────────────────────────────────────────────────

function ContratoCard({
  item,
  tipo,
  onAssinar,
}: {
  item: CandidaturaParaAssinar | ContratoAtivo
  tipo: 'assinar' | 'ativo' | 'encerrado'
  onAssinar?: (c: CandidaturaParaAssinar) => void
}) {
  const vaga = item.vaga
  const estimativa = vaga ? calcEstimativaMensal(vaga) : null
  const barColor = tipo === 'ativo' ? 'bg-success' : tipo === 'assinar' ? 'bg-warning' : 'bg-border'

  return (
    <div className="border border-border rounded-2xl overflow-hidden mb-3 shadow-card">
      <div className={`h-[3px] w-full ${barColor}`} />
      <div className="p-4">
        <p className="text-[10px] uppercase tracking-[.1em] text-text-muted font-sans mb-1">
          {(vaga?.transportadora as { razao_social: string | null } | null)?.razao_social ?? 'Transportadora'}
        </p>
        <h3 className="font-serif text-[19px] font-medium text-text-primary mb-3">{rota(vaga)}</h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-surface rounded-lg p-2.5">
            <p className="text-[9px] uppercase tracking-[.1em] text-text-muted font-sans mb-1">Remuneração</p>
            <p className="font-serif text-base font-medium text-success">{vaga?.valor_km ? `${formatCurrency(vaga.valor_km)}/km` : '—'}</p>
          </div>
          <div className="bg-surface rounded-lg p-2.5">
            <p className="text-[9px] uppercase tracking-[.1em] text-text-muted font-sans mb-1">Estimativa/mês</p>
            <p className="font-serif text-base font-medium text-text-primary">{estimativa ? formatCurrency(estimativa) : '—'}</p>
          </div>
          <div className="bg-surface rounded-lg p-2.5">
            <p className="text-[9px] uppercase tracking-[.1em] text-text-muted font-sans mb-1">
              {tipo === 'assinar' ? 'Candidatura em' : 'Início'}
            </p>
            <p className="text-sm font-medium text-text-primary">
              {tipo === 'assinar' ? fmtDate(item.created_at) : fmtDate((item as ContratoAtivo).data_inicio)}
            </p>
          </div>
          <div className="bg-surface rounded-lg p-2.5">
            <p className="text-[9px] uppercase tracking-[.1em] text-text-muted font-sans mb-1">
              {tipo === 'assinar' ? 'Pagamento' : 'Previsão término'}
            </p>
            <p className="text-sm font-medium text-text-primary">
              {tipo === 'assinar'
                ? (vaga?.forma_pagamento ?? '—')
                : fmtDate((item as ContratoAtivo).data_fim_prevista)}
            </p>
          </div>
        </div>
        {vaga?.frequencia_tipo && (
          <p className="text-xs text-text-muted mb-3">{labelFrequencia(vaga)}</p>
        )}
        {tipo === 'assinar' && (
          <button
            onClick={() => onAssinar?.(item as CandidaturaParaAssinar)}
            className="w-full bg-accent text-bg py-3 rounded-pill text-xs font-medium uppercase tracking-[.1em] font-sans flex items-center justify-center gap-2">
            <FileSignature size={14} />
            Revisar e assinar →
          </button>
        )}
        {tipo === 'ativo' && (
          <div className="flex gap-2">
            <Badge variant="success">Ativo</Badge>
            <span className="text-xs text-text-muted self-center">· em operação</span>
          </div>
        )}
        {tipo === 'encerrado' && (
          <Badge variant="muted">Encerrado</Badge>
        )}
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ContratosPage() {
  const [tab, setTab] = useState<'assinar' | 'ativos' | 'encerrados'>('assinar')
  const [paraAssinar, setParaAssinar] = useState<CandidaturaParaAssinar[]>([])
  const [ativos, setAtivos] = useState<ContratoAtivo[]>([])
  const [encerrados, setEncerrados] = useState<ContratoAtivo[]>([])
  const [loading, setLoading] = useState(true)
  const [signTarget, setSignTarget] = useState<CandidaturaParaAssinar | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const vagaSelect = 'valor_km, km_estimado, frequencia_tipo, forma_pagamento, rota_origem, rota_destino, uf_origem, uf_destino, tipo_veiculo, tipo_equipamento, inicio_previsto, periodo_meses, valor_contrato, transportadora:transportadoras(razao_social)'

      const [{ data: cands }, { data: ativs }, { data: encerrs }] = await Promise.all([
        supabase.from('candidaturas')
          .select(`id, status, created_at, vaga:vagas(${vagaSelect})`)
          .eq('agregado_id', user.id)
          .eq('status', 'em_formalizacao')
          .order('created_at', { ascending: false }),
        supabase.from('contratos_motorista')
          .select(`id, status, data_inicio, data_fim_prevista, created_at, vaga:vagas(${vagaSelect})`)
          .eq('agregado_id', user.id)
          .eq('status', 'ativo')
          .order('data_inicio', { ascending: false }),
        supabase.from('contratos_motorista')
          .select(`id, status, data_inicio, data_fim_prevista, created_at, vaga:vagas(${vagaSelect})`)
          .eq('agregado_id', user.id)
          .eq('status', 'encerrado')
          .order('data_inicio', { ascending: false }),
      ])

      setParaAssinar((cands ?? []) as unknown as CandidaturaParaAssinar[])
      setAtivos((ativs ?? []) as unknown as ContratoAtivo[])
      setEncerrados((encerrs ?? []) as unknown as ContratoAtivo[])
      setLoading(false)
    })
  }, [])

  function handleSigned(id: string) {
    setParaAssinar(prev => prev.filter(c => c.id !== id))
  }

  const tabs: { key: typeof tab; label: string; count?: number }[] = [
    { key: 'assinar', label: 'Para assinar', count: paraAssinar.length },
    { key: 'ativos', label: 'Ativos', count: ativos.length },
    { key: 'encerrados', label: 'Encerrados' },
  ]

  if (loading) {
    return (
      <div className="px-4 py-5">
        <div className="mb-5">
          <p className="text-[9px] uppercase tracking-[.16em] text-text-muted font-sans mb-1">Meus contratos</p>
          <h1 className="font-serif text-2xl font-medium text-text-primary">Contratos</h1>
        </div>
        {[1, 2].map(i => (
          <div key={i} className="border border-border rounded-2xl overflow-hidden mb-3 animate-pulse">
            <div className="h-[3px] bg-border" />
            <div className="p-4 space-y-2">
              <div className="h-3 bg-surface rounded w-24" />
              <div className="h-5 bg-surface rounded w-40" />
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map(j => <div key={j} className="h-12 bg-surface rounded-lg" />)}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const currentItems =
    tab === 'assinar' ? paraAssinar :
    tab === 'ativos' ? ativos : encerrados

  return (
    <>
      <div className="px-4 py-5">
        {/* Header */}
        <div className="mb-4">
          <p className="text-[9px] uppercase tracking-[.16em] text-text-muted font-sans mb-1">Meus contratos</p>
          <h1 className="font-serif text-2xl font-medium text-text-primary">Contratos</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border mb-4 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[.1em] font-sans whitespace-nowrap border-b-2 transition-all
                ${tab === t.key ? 'text-text-primary border-accent' : 'text-text-muted border-transparent'}`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="bg-warning text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lista */}
        {currentItems.length === 0 ? (
          <div className="text-center py-14">
            <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center mx-auto mb-3">
              {tab === 'assinar' ? <FileSignature size={24} className="text-text-muted" /> :
               tab === 'ativos' ? <Truck size={24} className="text-text-muted" /> :
               <Calendar size={24} className="text-text-muted" />}
            </div>
            <p className="text-sm font-medium text-text-primary">
              {tab === 'assinar' ? 'Nenhuma proposta pendente' :
               tab === 'ativos' ? 'Nenhum contrato ativo' :
               'Nenhum contrato encerrado'}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {tab === 'assinar' ? 'Quando uma transportadora enviar uma proposta, ela aparecerá aqui.' :
               tab === 'ativos' ? 'Seus contratos ativos aparecerão aqui.' :
               'Contratos finalizados aparecerão aqui.'}
            </p>
          </div>
        ) : (
          currentItems.map(item =>
            tab === 'assinar' ? (
              <ContratoCard
                key={item.id}
                item={item}
                tipo="assinar"
                onAssinar={c => setSignTarget(c)}
              />
            ) : (
              <ContratoCard key={item.id} item={item} tipo={tab === 'ativos' ? 'ativo' : 'encerrado'} />
            )
          )
        )}

        {/* Info sobre candidaturas em andamento */}
        {tab === 'ativos' && ativos.length === 0 && paraAssinar.length > 0 && (
          <div className="bg-warning-light border border-warning/20 rounded-xl p-3 mt-2 flex items-center gap-3">
            <DollarSign size={16} className="text-warning flex-shrink-0" />
            <p className="text-xs text-text-secondary">
              Você tem {paraAssinar.length} proposta(s) na aba &quot;Para assinar&quot;. Assine para ativar seus contratos.
            </p>
            <button onClick={() => setTab('assinar')} className="flex-shrink-0">
              <ChevronRight size={14} className="text-text-muted" />
            </button>
          </div>
        )}
      </div>

      {/* Modal de assinatura */}
      {signTarget && (
        <SignModal
          candidatura={signTarget}
          onClose={() => setSignTarget(null)}
          onSigned={(id) => { handleSigned(id); setSignTarget(null) }}
        />
      )}
    </>
  )
}
