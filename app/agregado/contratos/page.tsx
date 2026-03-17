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
  CheckCircle2, X, ChevronDown, FileSignature,
  Calendar, Truck, DollarSign, Send, MessageSquare,
  Info,
} from 'lucide-react'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Mensagem {
  de: 'transportadora' | 'motorista'
  texto: string
  hora: string
}

interface VagaJoined extends Pick<Vaga,
  'valor_km' | 'km_estimado' | 'frequencia_tipo' | 'forma_pagamento' |
  'rota_origem' | 'rota_destino' | 'uf_origem' | 'uf_destino' |
  'tipo_veiculo' | 'tipo_equipamento' | 'inicio_previsto' | 'periodo_meses' | 'valor_contrato'
> {
  transportadora: { razao_social: string | null } | null
}

interface CandidaturaParaAssinar {
  id: string
  vaga_id: string
  status: string
  created_at: string
  vaga: VagaJoined | null
}

interface ContratoAtivo {
  id: string
  status: 'ativo' | 'suspenso' | 'encerrado'
  data_inicio: string | null
  data_fim_prevista: string | null
  mensagens: Mensagem[]
  observacoes: string | null
  created_at: string
  vaga: VagaJoined | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function rotaStr(vaga: VagaJoined | null): string {
  if (!vaga) return '—'
  const orig = [vaga.rota_origem, vaga.uf_origem].filter(Boolean).join('/')
  const dest = [vaga.rota_destino, vaga.uf_destino].filter(Boolean).join('/')
  if (!orig && !dest) return '—'
  return `${orig || '?'} → ${dest || '?'}`
}

// ── Stepper (modal de assinatura) ─────────────────────────────────────────────

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
      await supabase.from('candidaturas').update({ status: 'contratado' }).eq('id', candidatura.id)
      await supabase
        .from('contratos_motorista')
        .update({ status: 'ativo', data_inicio: new Date().toISOString().split('T')[0] })
        .eq('candidatura_id', candidatura.id)
        .eq('status', 'pendente_assinatura')
      // Decrement vagas_abertas (sem raça crítica: fetch then update)
      if (candidatura.vaga_id) {
        const { data: vagaData } = await supabase
          .from('vagas').select('vagas_abertas').eq('id', candidatura.vaga_id).single()
        if (vagaData && (vagaData.vagas_abertas ?? 0) > 0) {
          await supabase.from('vagas')
            .update({ vagas_abertas: (vagaData.vagas_abertas as number) - 1 })
            .eq('id', candidatura.vaga_id)
        }
      }
      setStep(4)
      onSigned(candidatura.id)
    } finally {
      setSigning(false)
    }
  }, [nome, cpf, hasSig, candidatura.id, candidatura.vaga_id, onSigned])

  const canAdvance3 = nome.trim().length > 2 && cpf.trim().length >= 11 && hasSig

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-bg rounded-t-2xl max-h-[92vh] overflow-y-auto shadow-modal">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
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

          {step === 1 && (
            <div>
              <p className="text-[9px] uppercase tracking-[.16em] text-text-muted font-sans mb-2">
                {(vaga?.transportadora as { razao_social: string | null } | null)?.razao_social?.toUpperCase() ?? 'TRANSPORTADORA'}
              </p>
              <h3 className="font-serif text-xl font-medium text-text-primary mb-4">{rotaStr(vaga)}</h3>
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
                <strong className="text-info">Atenção:</strong> Leia atentamente os termos antes de assinar.
              </div>
              <button onClick={() => setStep(2)} className="w-full bg-accent text-bg py-3 rounded-pill text-xs font-medium uppercase tracking-[.1em] font-sans">
                Revisar termos →
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="bg-surface border border-border rounded-xl p-4 h-48 overflow-y-auto text-xs text-text-secondary leading-relaxed mb-4">
                <p className="font-semibold text-text-primary mb-2">CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TRANSPORTE</p>
                <p className="mb-2">Pelo presente instrumento, as partes identificadas — denominadas <strong>CONTRATANTE</strong> (transportadora) e <strong>CONTRATADO</strong> (agregado) — celebram o presente contrato nos termos da Lei 11.442/2007 e Resolução ANTT 5.564/2020.</p>
                <p className="mb-2"><strong>Cláusula 1ª — OBJETO.</strong> O CONTRATADO se compromete a prestar serviços de transporte de cargas na rota estipulada, com veículo regularizado junto ao RNTRC/ANTT.</p>
                <p className="mb-2"><strong>Cláusula 2ª — REMUNERAÇÃO.</strong> O CONTRATANTE pagará o valor por km acordado, na periodicidade e forma de pagamento estabelecidos.</p>
                <p className="mb-2"><strong>Cláusula 3ª — OBRIGAÇÕES DO CONTRATADO.</strong> Manter veículo em condições de tráfego; documentação atualizada; comunicar imprevistos; cumprir prazos.</p>
                <p className="mb-2"><strong>Cláusula 4ª — RESCISÃO.</strong> Rescisão por qualquer parte com aviso prévio de 15 dias, sem ônus, salvo inadimplência.</p>
                <p><strong>Cláusula 5ª — FORO.</strong> Comarca da sede da CONTRATANTE.</p>
              </div>
              <label className="flex items-start gap-3 mb-4 cursor-pointer">
                <input type="checkbox" checked={termsChecked} onChange={e => setTermsChecked(e.target.checked)} className="mt-0.5 accent-[#2D2B26]" />
                <span className="text-xs text-text-secondary">Li e concordo com os termos e condições do contrato</span>
              </label>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 border border-border text-text-primary py-3 rounded-pill text-xs font-medium uppercase tracking-[.1em] font-sans">← Voltar</button>
                <button disabled={!termsChecked} onClick={() => setStep(3)} className="flex-[2] bg-accent text-bg py-3 rounded-pill text-xs font-medium uppercase tracking-[.1em] font-sans disabled:opacity-40">Ir para assinatura →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-xs text-text-secondary mb-3">Assine com o dedo ou mouse e confirme seus dados.</p>
              <div className="border-2 border-dashed border-border rounded-xl overflow-hidden mb-2 relative bg-[#FAF8F4]">
                {!hasSig && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-text-muted text-sm font-sans">✍️ Assine aqui</span>
                  </div>
                )}
                <canvas ref={canvasRef} width={340} height={120} className="w-full touch-none"
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
              </div>
              <button onClick={clearSig} className="text-xs text-text-muted font-sans mb-4">↺ Limpar assinatura</button>
              <div className="grid grid-cols-1 gap-3 mb-4">
                <Input label="Nome completo (conforme CNH)" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Carlos Eduardo Machado" />
                <Input label="CPF" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" />
              </div>
              <p className="text-[10px] text-text-muted mb-4">🔒 Assinatura, IP e timestamp registrados para fins legais.</p>
              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="flex-1 border border-border text-text-primary py-3 rounded-pill text-xs font-medium uppercase tracking-[.1em] font-sans">← Voltar</button>
                <button disabled={!canAdvance3 || signing} onClick={handleConfirm} className="flex-[2] bg-accent text-bg py-3 rounded-pill text-xs font-medium uppercase tracking-[.1em] font-sans disabled:opacity-40">
                  {signing ? 'Assinando...' : 'Assinar e confirmar →'}
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={36} className="text-success" />
              </div>
              <h3 className="font-serif text-xl font-medium text-text-primary mb-2">Proposta assinada!</h3>
              <p className="text-sm text-text-secondary mb-6">
                Seu contrato com <strong>{(vaga?.transportadora as { razao_social: string | null } | null)?.razao_social}</strong> foi formalizado.
              </p>
              <button onClick={onClose} className="w-full bg-accent text-bg py-3 rounded-pill text-xs font-medium uppercase tracking-[.1em] font-sans">
                Ver meus contratos
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Painel expandido de contrato ativo ────────────────────────────────────────

function ContratoExpandido({
  contrato,
  userId,
  onChange,
}: {
  contrato: ContratoAtivo
  userId: string
  onChange: (c: ContratoAtivo) => void
}) {
  const [activeTab, setActiveTab] = useState<'detalhes' | 'mensagens'>('detalhes')
  const [msgInput, setMsgInput] = useState('')
  const [saving, setSaving] = useState(false)
  const msgEndRef = useRef<HTMLDivElement>(null)
  const vaga = contrato.vaga
  const nomeTransp = (vaga?.transportadora as { razao_social: string | null } | null)?.razao_social ?? 'Transportadora'
  const estimativa = vaga ? calcEstimativaMensal(vaga) : null

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [contrato.mensagens])

  async function sendMsg() {
    const texto = msgInput.trim()
    if (!texto) return
    const now = new Date()
    const hora = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    const novaMensagem: Mensagem = { de: 'motorista', texto, hora: `Agora, ${hora}` }
    const novasMensagens = [...(contrato.mensagens ?? []), novaMensagem]

    setSaving(true)
    const supabase = createClient()
    await supabase.from('contratos_motorista').update({ mensagens: novasMensagens }).eq('id', contrato.id)
    onChange({ ...contrato, mensagens: novasMensagens })
    setMsgInput('')
    setSaving(false)
  }

  const tabs = [
    { key: 'detalhes' as const, label: 'Detalhes', icon: Info },
    {
      key: 'mensagens' as const,
      label: 'Mensagens',
      icon: MessageSquare,
      count: contrato.mensagens?.length ?? 0,
    },
  ]

  return (
    <div className="border-t border-border">
      {/* Sub-tabs */}
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === t.key ? 'border-accent text-text-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            <t.icon size={12} />
            {t.label}
            {'count' in t && (t.count ?? 0) > 0 && (
              <span className="bg-[#E0DAD0] text-text-secondary text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* DETALHES */}
        {activeTab === 'detalhes' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: 'Transportadora', v: nomeTransp },
                { l: 'Remuneração', v: vaga?.valor_km ? `${formatCurrency(vaga.valor_km)}/km` : '—' },
                { l: 'Estimativa/mês', v: estimativa ? formatCurrency(estimativa) : '—' },
                { l: 'Distância/viagem', v: vaga?.km_estimado ? `${vaga.km_estimado} km` : '—' },
                { l: 'Início', v: fmtDate(contrato.data_inicio) },
                { l: 'Previsão término', v: fmtDate(contrato.data_fim_prevista) },
                { l: 'Pagamento', v: vaga?.forma_pagamento ?? '—' },
                { l: 'Frequência', v: vaga ? labelFrequencia(vaga) : '—' },
              ].map(item => (
                <div key={item.l} className="bg-bg rounded-lg p-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">{item.l}</p>
                  <p className="text-sm font-medium text-text-primary mt-0.5 leading-snug">{item.v}</p>
                </div>
              ))}
            </div>
            {contrato.observacoes && (
              <div className="bg-bg rounded-lg p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Observações</p>
                <p className="text-sm text-text-secondary">{contrato.observacoes}</p>
              </div>
            )}
          </div>
        )}

        {/* MENSAGENS */}
        {activeTab === 'mensagens' && (
          <div className="space-y-3">
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {(contrato.mensagens ?? []).length === 0 ? (
                <p className="text-sm text-text-muted text-center py-8">Nenhuma mensagem ainda.<br /><span className="text-xs">Envie uma mensagem para a transportadora.</span></p>
              ) : (
                <>
                  {contrato.mensagens.map((m, i) => (
                    <div
                      key={i}
                      className={`flex flex-col max-w-[82%] ${m.de === 'motorista' ? 'ml-auto items-end' : 'items-start'}`}
                    >
                      <div className={`rounded-xl px-3 py-2 text-sm leading-snug ${
                        m.de === 'motorista'
                          ? 'bg-accent text-bg'
                          : 'bg-[#E8E3D8] text-text-primary'
                      }`}>
                        {m.texto}
                      </div>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {m.de === 'motorista' ? 'Você' : nomeTransp.split(' ')[0]} · {m.hora}
                      </p>
                    </div>
                  ))}
                  <div ref={msgEndRef} />
                </>
              )}
            </div>
            <div className="flex gap-2 border-t border-border pt-3">
              <textarea
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() } }}
                placeholder="Escreva uma mensagem para a transportadora..."
                rows={1}
                className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
              <button
                onClick={sendMsg}
                disabled={saving || !msgInput.trim()}
                className="w-9 h-9 rounded-full bg-accent text-bg flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Card de Contrato Ativo/Encerrado ──────────────────────────────────────────

function ContratoAtivoCard({
  contrato,
  userId,
  onChange,
}: {
  contrato: ContratoAtivo
  userId: string
  onChange: (c: ContratoAtivo) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const vaga = contrato.vaga
  const nomeTransp = (vaga?.transportadora as { razao_social: string | null } | null)?.razao_social ?? 'Transportadora'
  const estimativa = vaga ? calcEstimativaMensal(vaga) : null
  const novasMsg = contrato.mensagens?.filter(m => m.de === 'transportadora').length ?? 0

  const barColor = contrato.status === 'ativo' ? 'bg-success' : contrato.status === 'suspenso' ? 'bg-warning' : 'bg-border'

  return (
    <div className="border border-border rounded-2xl overflow-hidden shadow-card">
      <div className={`h-[3px] w-full ${barColor}`} />
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[.1em] text-text-muted font-sans mb-0.5">{nomeTransp}</p>
            <h3 className="font-serif text-[18px] font-medium text-text-primary leading-tight">{rotaStr(vaga)}</h3>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            {contrato.status === 'ativo' && <Badge variant="success">Ativo</Badge>}
            {contrato.status === 'suspenso' && <Badge variant="warning">Suspenso</Badge>}
            {contrato.status === 'encerrado' && <Badge variant="muted">Encerrado</Badge>}
          </div>
        </div>

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
            <p className="text-[9px] uppercase tracking-[.1em] text-text-muted font-sans mb-1">Início</p>
            <p className="text-sm font-medium text-text-primary">{fmtDate(contrato.data_inicio)}</p>
          </div>
          <div className="bg-surface rounded-lg p-2.5">
            <p className="text-[9px] uppercase tracking-[.1em] text-text-muted font-sans mb-1">Previsão término</p>
            <p className="text-sm font-medium text-text-primary">{fmtDate(contrato.data_fim_prevista)}</p>
          </div>
        </div>

        {vaga?.frequencia_tipo && (
          <p className="text-xs text-text-muted mb-3">{labelFrequencia(vaga)}</p>
        )}

        {/* Botão expandir */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-bg hover:bg-surface transition-colors text-xs font-medium text-text-secondary"
        >
          <span className="flex items-center gap-1.5">
            <MessageSquare size={12} />
            Detalhes e mensagens
            {novasMsg > 0 && (
              <span className="bg-warning text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {novasMsg}
              </span>
            )}
          </span>
          <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {expanded && (
        <ContratoExpandido contrato={contrato} userId={userId} onChange={onChange} />
      )}
    </div>
  )
}

// ── Card Para Assinar ─────────────────────────────────────────────────────────

function CardParaAssinar({
  item,
  onAssinar,
}: {
  item: CandidaturaParaAssinar
  onAssinar: (c: CandidaturaParaAssinar) => void
}) {
  const vaga = item.vaga
  const estimativa = vaga ? calcEstimativaMensal(vaga) : null

  return (
    <div className="border border-warning/30 rounded-2xl overflow-hidden shadow-card">
      <div className="h-[3px] w-full bg-warning" />
      <div className="p-4">
        <p className="text-[10px] uppercase tracking-[.1em] text-text-muted font-sans mb-1">
          {(vaga?.transportadora as { razao_social: string | null } | null)?.razao_social ?? 'Transportadora'}
        </p>
        <h3 className="font-serif text-[19px] font-medium text-text-primary mb-3">{rotaStr(vaga)}</h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { label: 'Remuneração', value: vaga?.valor_km ? `${formatCurrency(vaga.valor_km)}/km` : '—' },
            { label: 'Estimativa/mês', value: estimativa ? formatCurrency(estimativa) : '—' },
            { label: 'Candidatura em', value: fmtDate(item.created_at) },
            { label: 'Pagamento', value: vaga?.forma_pagamento ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface rounded-lg p-2.5">
              <p className="text-[9px] uppercase tracking-[.1em] text-text-muted font-sans mb-1">{label}</p>
              <p className="text-sm font-medium text-text-primary">{value}</p>
            </div>
          ))}
        </div>
        {vaga?.frequencia_tipo && (
          <p className="text-xs text-text-muted mb-3">{labelFrequencia(vaga)}</p>
        )}
        <button
          onClick={() => onAssinar(item)}
          className="w-full bg-accent text-bg py-3 rounded-pill text-xs font-medium uppercase tracking-[.1em] font-sans flex items-center justify-center gap-2"
        >
          <FileSignature size={14} />
          Revisar e assinar →
        </button>
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
  const [userId, setUserId] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const vagaSelect = 'valor_km, km_estimado, frequencia_tipo, forma_pagamento, rota_origem, rota_destino, uf_origem, uf_destino, tipo_veiculo, tipo_equipamento, inicio_previsto, periodo_meses, valor_contrato, transportadora:transportadoras(razao_social)'

    const [{ data: cands }, { data: ativs }, { data: encerrs }] = await Promise.all([
      supabase.from('candidaturas')
        .select(`id, vaga_id, status, created_at, vaga:vagas(${vagaSelect})`)
        .eq('agregado_id', user.id)
        .eq('status', 'em_formalizacao')
        .order('created_at', { ascending: false }),
      supabase.from('contratos_motorista')
        .select(`id, status, data_inicio, data_fim_prevista, mensagens, observacoes, created_at, vaga:vagas(${vagaSelect})`)
        .eq('agregado_id', user.id)
        .in('status', ['ativo', 'suspenso'])
        .order('data_inicio', { ascending: false }),
      supabase.from('contratos_motorista')
        .select(`id, status, data_inicio, data_fim_prevista, mensagens, observacoes, created_at, vaga:vagas(${vagaSelect})`)
        .eq('agregado_id', user.id)
        .eq('status', 'encerrado')
        .order('data_inicio', { ascending: false }),
    ])

    setParaAssinar((cands ?? []) as unknown as CandidaturaParaAssinar[])
    setAtivos((ativs ?? []) as unknown as ContratoAtivo[])
    setEncerrados((encerrs ?? []) as unknown as ContratoAtivo[])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function handleSigned(id: string) {
    setParaAssinar(prev => prev.filter(c => c.id !== id))
    // Reload to pick up the newly created active contract
    setTimeout(loadData, 500)
  }

  const tabs = [
    { key: 'assinar' as const, label: 'Para assinar', count: paraAssinar.length },
    { key: 'ativos' as const, label: 'Ativos', count: ativos.length },
    { key: 'encerrados' as const, label: 'Encerrados' },
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
              <div className="grid grid-cols-2 gap-2">{[1,2,3,4].map(j => <div key={j} className="h-12 bg-surface rounded-lg" />)}</div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="px-4 py-5">
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
              {'count' in t && t.count !== undefined && t.count > 0 && (
                <span className="bg-warning text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Para assinar */}
        {tab === 'assinar' && (
          paraAssinar.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center mx-auto mb-3">
                <FileSignature size={24} className="text-text-muted" />
              </div>
              <p className="text-sm font-medium text-text-primary">Nenhuma proposta pendente</p>
              <p className="text-xs text-text-muted mt-1">Quando uma transportadora aprovar sua candidatura, a proposta aparecerá aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paraAssinar.map(c => (
                <CardParaAssinar key={c.id} item={c} onAssinar={c => setSignTarget(c)} />
              ))}
            </div>
          )
        )}

        {/* Ativos */}
        {tab === 'ativos' && (
          ativos.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center mx-auto mb-3">
                <Truck size={24} className="text-text-muted" />
              </div>
              <p className="text-sm font-medium text-text-primary">Nenhum contrato ativo</p>
              <p className="text-xs text-text-muted mt-1">Seus contratos ativos aparecerão aqui.</p>
              {paraAssinar.length > 0 && (
                <div className="bg-warning-light border border-warning/20 rounded-xl p-3 mt-4 flex items-center gap-3">
                  <DollarSign size={16} className="text-warning flex-shrink-0" />
                  <p className="text-xs text-text-secondary text-left">Você tem {paraAssinar.length} proposta(s) aguardando assinatura.</p>
                  <button onClick={() => setTab('assinar')} className="flex-shrink-0 text-xs font-medium text-accent">Ver →</button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {ativos.map(c => (
                <ContratoAtivoCard
                  key={c.id}
                  contrato={c}
                  userId={userId}
                  onChange={updated => setAtivos(prev => prev.map(x => x.id === updated.id ? updated : x))}
                />
              ))}
            </div>
          )
        )}

        {/* Encerrados */}
        {tab === 'encerrados' && (
          encerrados.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center mx-auto mb-3">
                <Calendar size={24} className="text-text-muted" />
              </div>
              <p className="text-sm font-medium text-text-primary">Nenhum contrato encerrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {encerrados.map(c => (
                <ContratoAtivoCard
                  key={c.id}
                  contrato={c}
                  userId={userId}
                  onChange={updated => setEncerrados(prev => prev.map(x => x.id === updated.id ? updated : x))}
                />
              ))}
            </div>
          )
        )}
      </div>

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
