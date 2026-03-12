'use client'
import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Loader2, AlertCircle, Users, CheckCircle2, XCircle, FileText, ChevronRight } from 'lucide-react'

type PipelineStatus = 'novo' | 'visualizado' | 'em negociação' | 'interesse enviado' | 'aprovado' | 'em formalização' | 'contratado' | 'recusado'

const PIPELINE_BADGE: Record<PipelineStatus, string> = {
  'novo': 'bg-warning/15 text-warning border border-warning/30',
  'visualizado': 'bg-border/50 text-text-muted border border-border',
  'em negociação': 'bg-success/15 text-success border border-success/30',
  'interesse enviado': 'bg-[#C8A84B]/15 text-[#C8A84B] border border-[#C8A84B]/30',
  'aprovado': 'bg-success/15 text-success border border-success/30',
  'recusado': 'bg-danger/15 text-danger border border-danger/30',
  'contratado': 'bg-text-primary/10 text-text-primary border border-text-primary/20',
  'em formalização': 'bg-info/15 text-info border border-info/30',
}

const PODE_APROVAR: PipelineStatus[] = ['novo', 'visualizado', 'em negociação', 'interesse enviado']
const PODE_RECUSAR: PipelineStatus[] = ['novo', 'visualizado', 'em negociação', 'interesse enviado', 'aprovado']

interface Cand {
  id: string
  pipeline_status: PipelineStatus
  status: string
  created_at: string
  mensagem: string | null
  profile: { id: string; nome: string | null; telefone: string | null } | null
  vaga: { id: string; titulo: string | null; rota_origem: string | null; rota_destino: string | null; tipo_veiculo: string | null; valor_contrato: number | null; km_estimado: number | null } | null
}

function initials(name: string | null) {
  if (!name) return 'M'
  const parts = name.trim().split(' ')
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

// Stepper for formalization
function Stepper({ step }: { step: number }) {
  const steps = ['Dados', 'Termos', 'Assinatura']
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((s, i) => {
        const num = i + 1
        const done = step > num
        const active = step === num
        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                done ? 'bg-success border-success text-bg' :
                active ? 'bg-text-primary border-text-primary text-bg' :
                'border-border text-text-muted bg-bg'
              }`}>
                {done ? '✓' : num}
              </div>
              <span className={`text-[10px] mt-1 font-sans ${active ? 'text-text-primary font-semibold' : 'text-text-muted'}`}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 h-0.5 mb-4 mx-1 ${step > num ? 'bg-success' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Canvas signature component
function SignatureCanvas({ onHasSig }: { onHasSig: (v: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasSig = useRef(false)

  function getCtx() {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.strokeStyle = '#1A1915'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    return ctx
  }

  function startDraw(x: number, y: number) {
    const ctx = getCtx(); if (!ctx) return
    const rect = canvasRef.current!.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(x - rect.left, y - rect.top)
    drawing.current = true
    if (!hasSig.current) { hasSig.current = true; onHasSig(true) }
  }

  function draw(x: number, y: number) {
    if (!drawing.current) return
    const ctx = getCtx(); if (!ctx) return
    const rect = canvasRef.current!.getBoundingClientRect()
    ctx.lineTo(x - rect.left, y - rect.top)
    ctx.stroke()
  }

  function endDraw() { drawing.current = false }

  function clearSig() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    hasSig.current = false
    onHasSig(false)
  }

  return (
    <div className="space-y-2">
      <div className="relative border-2 border-dashed border-border rounded-xl overflow-hidden bg-bg">
        <canvas
          ref={canvasRef}
          width={500}
          height={160}
          className="w-full h-40 cursor-crosshair touch-none"
          onMouseDown={e => startDraw(e.clientX, e.clientY)}
          onMouseMove={e => draw(e.clientX, e.clientY)}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={e => { e.preventDefault(); startDraw(e.touches[0].clientX, e.touches[0].clientY) }}
          onTouchMove={e => { e.preventDefault(); draw(e.touches[0].clientX, e.touches[0].clientY) }}
          onTouchEnd={endDraw}
        />
        {!hasSig.current && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-2xl text-text-muted opacity-40">✍️ Assine aqui</span>
          </div>
        )}
      </div>
      <button type="button" onClick={clearSig} className="text-xs text-text-muted hover:text-danger transition-colors">Limpar assinatura</button>
    </div>
  )
}

// Formalization Modal
function FormalizacaoModal({
  cand, onClose, onContratado
}: {
  cand: Cand
  onClose: () => void
  onContratado: (id: string) => void
}) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [hasSig, setHasSig] = useState(false)
  const [nomeAssinante, setNomeAssinante] = useState('')
  const [cpfAssinante, setCpfAssinante] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Step 1 fields
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const [dataInicio, setDataInicio] = useState(tomorrow.toISOString().split('T')[0])
  const [vigencia, setVigencia] = useState('12 meses')
  const [formaPgto, setFormaPgto] = useState('Quinzenal')
  const [adiant, setAdiant] = useState('30')

  function maskCpf(v: string) {
    return v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14)
  }

  async function finalize() {
    if (!hasSig) { setError('Por favor, assine no campo acima.'); return }
    if (!nomeAssinante.trim()) { setError('Informe o nome completo.'); return }
    if (cpfAssinante.replace(/\D/g, '').length !== 11) { setError('Informe um CPF válido.'); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.from('candidaturas').update({
        status: 'aceito',
        pipeline_status: 'contratado',
      }).eq('id', cand.id)
      if (err) throw err
      onContratado(cand.id)
      setStep(4)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao finalizar contrato')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl">
        {step < 4 && (
          <div className="px-6 pt-6 pb-2 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif font-semibold text-text-primary">Formalizar contrato</h2>
              <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary rounded-md">✕</button>
            </div>
            <Stepper step={step} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* Step 1 — Dados */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-bg border border-border rounded-xl p-4 space-y-2 text-sm">
                <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans mb-3">Resumo do contrato proposto</p>
                {[
                  ['Agregado', cand.profile?.nome ?? '—'],
                  ['Rota', `${cand.vaga?.rota_origem ?? '—'} → ${cand.vaga?.rota_destino ?? '—'}`],
                  ['Veículo', cand.vaga?.tipo_veiculo ?? '—'],
                  ['Remuneração', cand.vaga?.valor_contrato ? `R$ ${cand.vaga.valor_contrato.toLocaleString('pt-BR')}/mês` : '—'],
                ].map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-text-muted">{label}</span>
                    <span className={`font-medium text-right ${label === 'Remuneração' ? 'text-success' : 'text-text-primary'}`}>{val}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Data de início</label>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Vigência</label>
                  <select value={vigencia} onChange={e => setVigencia(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent">
                    {['6 meses', '12 meses', '24 meses', 'Indeterminado'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Forma de pagamento</label>
                  <select value={formaPgto} onChange={e => setFormaPgto(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent">
                    {['Semanal', 'Quinzenal', 'Mensal', 'Por viagem'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Adiantamento (%)</label>
                  <input type="number" min="0" max="80" value={adiant} onChange={e => setAdiant(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Termos */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="max-h-72 overflow-y-auto bg-bg border border-border rounded-xl p-4 space-y-3 text-xs text-text-secondary leading-relaxed">
                <p><strong>Cláusula 1 — Objeto.</strong> O presente instrumento tem por objeto a prestação de serviços de transporte rodoviário de cargas pelo AGREGADO à TRANSPORTADORA, na rota acordada, mediante a utilização de veículo de propriedade do AGREGADO.</p>
                <p><strong>Cláusula 2 — Prazo.</strong> O contrato terá vigência conforme acordado na proposta, podendo ser renovado por mútuo acordo das partes mediante aditivo escrito.</p>
                <p><strong>Cláusula 3 — Obrigações do Agregado.</strong> O AGREGADO compromete-se a: (i) manter documentação do veículo em dia; (ii) cumprir os itinerários e prazos estipulados; (iii) zelar pela integridade da carga transportada; (iv) comunicar ocorrências imediatamente; (v) manter o veículo em boas condições mecânicas; (vi) observar a legislação de trânsito vigente; (vii) não subcontratar o serviço sem anuência da transportadora; (viii) portar e apresentar documentos quando exigidos; (ix) utilizar equipamentos de segurança obrigatórios; (x) participar de treinamentos quando solicitado; (xi) comunicar com antecedência qualquer indisponibilidade; (xii) respeitar as normas internas da transportadora.</p>
                <p><strong>Cláusula 4 — Obrigações da Transportadora.</strong> A TRANSPORTADORA compromete-se a: (i) efetuar os pagamentos nos prazos acordados; (ii) fornecer as instruções de rota e procedimentos necessários; (iii) disponibilizar suporte em casos de emergência; (iv) respeitar os termos contratuais; (v) fornecer o equipamento quando acordado; (vi) emitir documentos fiscais adequados; (vii) comunicar alterações de rota ou procedimentos com antecedência; (viii) manter sigilo sobre informações do agregado; (ix) oferecer condições de trabalho seguras; (x) cumprir a legislação trabalhista aplicável à relação de agregamento.</p>
                <p><strong>Cláusula 5 — Remuneração.</strong> A remuneração será conforme acordado na proposta, calculada por km rodado, paga na forma e periodicidade definidas, com possibilidade de adiantamento conforme percentual acordado.</p>
                <p><strong>Cláusula 6 — Responsabilidade.</strong> O AGREGADO é responsável por danos à carga decorrentes de sua culpa ou negligência. A TRANSPORTADORA é responsável pelo pagamento da remuneração e pelo fornecimento de condições adequadas de trabalho.</p>
                <p><strong>Cláusula 7 — Multas.</strong> O descumprimento injustificado de viagem programada sujeita o infrator à multa de 20% sobre o valor da viagem, salvo casos de força maior devidamente comprovados.</p>
                <p><strong>Cláusula 8 — Rescisão.</strong> O contrato pode ser rescindido por qualquer das partes mediante aviso prévio de 30 dias, ou imediatamente em casos de descumprimento grave das obrigações contratuais.</p>
                <p><strong>Cláusula 9 — LGPD.</strong> As partes comprometem-se a tratar os dados pessoais trocados nesta relação conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), utilizando-os exclusivamente para a execução deste contrato.</p>
                <p><strong>Cláusula 10 — Assinatura Eletrônica.</strong> As partes concordam que a assinatura eletrônica aposta neste instrumento tem validade jurídica nos termos da Lei 14.063/2020 e MP 2.200-2/2001, sendo considerada prova suficiente de manifestação de vontade.</p>
                <p><strong>Cláusula 11 — Foro.</strong> Fica eleito o foro da comarca da sede da TRANSPORTADORA para dirimir quaisquer controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-accent" />
                <span className="text-sm text-text-secondary">Li e concordo com todos os termos e condições do contrato de prestação de serviços.</span>
              </label>
            </div>
          )}

          {/* Step 3 — Assinatura */}
          {step === 3 && (
            <div className="space-y-4">
              <SignatureCanvas onHasSig={setHasSig} />
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Nome completo *</label>
                  <input value={nomeAssinante} onChange={e => setNomeAssinante(e.target.value)}
                    placeholder="Nome como no documento"
                    className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">CPF *</label>
                  <input value={cpfAssinante}
                    onChange={e => setCpfAssinante(maskCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
              </div>
              <div className="flex items-start gap-2 bg-info/8 border border-info/25 rounded-lg px-3 py-2.5">
                <span className="text-info text-sm">🔒</span>
                <p className="text-xs text-info">Sua assinatura digital tem validade jurídica conforme Lei 14.063/2020. Os dados são armazenados com criptografia.</p>
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
            </div>
          )}

          {/* Step 4 — Sucesso */}
          {step === 4 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={40} className="text-success" />
              </div>
              <h3 className="font-serif text-xl font-bold text-text-primary mb-2">Contrato formalizado!</h3>
              <p className="text-text-secondary text-sm mb-6">O contrato foi assinado e registrado. O agregado receberá notificação.</p>
              <button
                onClick={() => router.push('/transportadora/contratos')}
                className="px-6 py-2.5 rounded-xl bg-accent text-bg text-sm font-medium"
              >
                Ver contrato ativo →
              </button>
            </div>
          )}
        </div>

        {step < 4 && (
          <div className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-bg transition-colors">
                Voltar
              </button>
            ) : (
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-bg transition-colors">
                Cancelar
              </button>
            )}
            {step === 1 && (
              <button onClick={() => setStep(2)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-bg text-sm font-medium">
                Ver termos →
              </button>
            )}
            {step === 2 && (
              <button onClick={() => setStep(3)} disabled={!termsAccepted}
                className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-bg text-sm font-medium disabled:opacity-40">
                Ir para assinatura →
              </button>
            )}
            {step === 3 && (
              <button onClick={finalize} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-success text-bg text-sm font-medium disabled:opacity-50">
                {saving ? 'Salvando...' : 'Finalizar contrato'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Candidate profile modal
function CandModal({ cand, onClose, onAprovar, onRecusar, onFormalizar }: {
  cand: Cand
  onClose: () => void
  onAprovar: (id: string) => void
  onRecusar: (id: string) => void
  onFormalizar: (c: Cand) => void
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-xl">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-accent/15 text-accent text-xl font-semibold flex items-center justify-center">
                {initials(cand.profile?.nome ?? null)}
              </div>
              <div>
                <p className="font-semibold text-text-primary">{cand.profile?.nome ?? 'Motorista'}</p>
                <p className="text-sm text-text-muted">{cand.profile?.telefone ?? 'Sem telefone'}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PIPELINE_BADGE[cand.pipeline_status]}`}>
                  {cand.pipeline_status}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary rounded-md">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="bg-bg border border-border rounded-xl p-4">
            <p className="text-xs text-text-muted mb-2">Candidatou-se para</p>
            <p className="font-medium text-text-primary">{cand.vaga?.rota_origem} → {cand.vaga?.rota_destino}</p>
            <p className="text-xs text-text-muted">{new Date(cand.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
          {cand.mensagem && (
            <div>
              <p className="text-xs text-text-muted mb-1">Mensagem do candidato</p>
              <p className="text-sm text-text-secondary italic">&ldquo;{cand.mensagem}&rdquo;</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-text-muted">Veículo</p>
              <p className="font-medium text-text-primary">{cand.vaga?.tipo_veiculo ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Remuneração</p>
              <p className="font-medium text-success">
                {cand.vaga?.valor_contrato ? `R$ ${cand.vaga.valor_contrato.toLocaleString('pt-BR')}/mês` : '—'}
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex gap-2">
          <button onClick={onClose}
            className="flex-1 px-3 py-2 rounded-lg border border-border text-sm text-text-secondary hover:bg-bg transition-colors">
            Fechar
          </button>
          {PODE_RECUSAR.includes(cand.pipeline_status) && (
            <button onClick={() => onRecusar(cand.id)}
              className="px-3 py-2 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger hover:bg-danger-light transition-colors">
              Recusar
            </button>
          )}
          {PODE_APROVAR.includes(cand.pipeline_status) && (
            <button onClick={() => { onAprovar(cand.id); onClose() }}
              className="flex-1 px-3 py-2 rounded-lg bg-success text-bg text-sm font-medium hover:opacity-90 transition-opacity">
              ✓ Aprovar
            </button>
          )}
          {cand.pipeline_status === 'aprovado' && (
            <button onClick={() => { onClose(); setTimeout(() => onFormalizar(cand), 100) }}
              className="flex-1 px-3 py-2 rounded-lg bg-accent text-bg text-sm font-medium">
              📝 Formalizar
            </button>
          )}
          {cand.pipeline_status === 'em formalização' && (
            <button onClick={() => { onClose(); setTimeout(() => onFormalizar(cand), 100) }}
              className="flex-1 px-3 py-2 rounded-lg bg-info text-bg text-sm font-medium">
              Continuar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function CandidatosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const vagaFilter = searchParams.get('vaga')

  const [cands, setCands] = useState<Cand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterVaga, setFilterVaga] = useState(vagaFilter ?? '')
  const [filterPipeline, setFilterPipeline] = useState('')
  const [vagas, setVagas] = useState<{ id: string; titulo: string | null; rota_origem: string | null; rota_destino: string | null }[]>([])
  const [selectedCand, setSelectedCand] = useState<Cand | null>(null)
  const [formalizando, setFormalizando] = useState<Cand | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: vagasData } = await supabase
        .from('vagas').select('id, titulo, rota_origem, rota_destino')
        .eq('transportadora_id', user.id)
      setVagas(vagasData ?? [])

      const vagaIds = vagasData?.map(v => v.id) ?? []
      if (vagaIds.length === 0) { setCands([]); setLoading(false); return }

      let query = supabase.from('candidaturas')
        .select('id, pipeline_status, status, created_at, mensagem, profile:profiles!agregado_id(id, nome, telefone), vaga:vagas!vaga_id(id, titulo, rota_origem, rota_destino, tipo_veiculo, valor_contrato, km_estimado)')
        .in('vaga_id', vagaIds)
        .order('created_at', { ascending: false })

      if (filterVaga) query = query.eq('vaga_id', filterVaga)
      if (filterPipeline) query = query.eq('pipeline_status', filterPipeline)

      const { data, error: err } = await query
      if (err) throw err
      setCands((data ?? []).map(c => ({
        ...c,
        profile: Array.isArray(c.profile) ? c.profile[0] : c.profile,
        vaga: Array.isArray(c.vaga) ? c.vaga[0] : c.vaga,
      })) as Cand[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar candidatos')
    } finally {
      setLoading(false)
    }
  }, [router, filterVaga, filterPipeline])

  useEffect(() => { loadData() }, [loadData])

  async function openProfile(cand: Cand) {
    setSelectedCand(cand)
    if (cand.pipeline_status === 'novo') {
      const supabase = createClient()
      await supabase.from('candidaturas').update({ pipeline_status: 'visualizado' }).eq('id', cand.id)
      setCands(prev => prev.map(c => c.id === cand.id ? { ...c, pipeline_status: 'visualizado' } : c))
    }
  }

  async function handleAprovar(id: string) {
    const supabase = createClient()
    await supabase.from('candidaturas').update({ pipeline_status: 'aprovado' }).eq('id', id)
    setCands(prev => prev.map(c => c.id === id ? { ...c, pipeline_status: 'aprovado' } : c))
    // Open CF modal after brief delay
    setTimeout(() => {
      const cand = cands.find(c => c.id === id)
      if (cand) setFormalizando({ ...cand, pipeline_status: 'aprovado' })
    }, 700)
  }

  async function handleRecusar(id: string) {
    if (!confirm('Tem certeza que deseja recusar este candidato?')) return
    const supabase = createClient()
    await supabase.from('candidaturas').update({ pipeline_status: 'recusado', status: 'recusado' }).eq('id', id)
    setCands(prev => prev.map(c => c.id === id ? { ...c, pipeline_status: 'recusado', status: 'recusado' } : c))
    setSelectedCand(null)
  }

  function handleContratado(id: string) {
    setCands(prev => prev.map(c => c.id === id ? { ...c, pipeline_status: 'contratado', status: 'aceito' } : c))
  }

  const pipilineOptions: PipelineStatus[] = ['novo', 'visualizado', 'em negociação', 'interesse enviado', 'aprovado', 'em formalização', 'contratado', 'recusado']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-text-primary">Candidatos</h1>
        <p className="text-text-secondary text-sm mt-0.5">Pipeline de candidaturas das suas vagas</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filterVaga} onChange={e => setFilterVaga(e.target.value)}
          className="px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent">
          <option value="">Todas as vagas</option>
          {vagas.map(v => (
            <option key={v.id} value={v.id}>{v.rota_origem} → {v.rota_destino}</option>
          ))}
        </select>
        <select value={filterPipeline} onChange={e => setFilterPipeline(e.target.value)}
          className="px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent">
          <option value="">Todos os status</option>
          {pipilineOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-text-muted" />
        </div>
      ) : error ? (
        <div className="bg-danger-light border border-danger/20 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-danger">Erro ao carregar candidatos</p>
            <p className="text-sm text-text-secondary">{error}</p>
          </div>
        </div>
      ) : cands.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <Users size={36} className="text-text-muted mx-auto mb-3" />
          <p className="font-medium text-text-secondary">Nenhum candidato encontrado</p>
          <p className="text-sm text-text-muted mt-1">Publique vagas para começar a receber candidaturas.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {cands.map(cand => (
            <div key={cand.id} className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/15 text-accent font-semibold flex items-center justify-center flex-shrink-0 text-sm">
                  {initials(cand.profile?.nome ?? null)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-text-primary">{cand.profile?.nome ?? 'Motorista'}</p>
                      <p className="text-xs text-text-muted">
                        {cand.vaga?.rota_origem} → {cand.vaga?.rota_destino}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PIPELINE_BADGE[cand.pipeline_status]}`}>
                        {cand.pipeline_status}
                      </span>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {new Date(cand.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() => openProfile(cand)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-bg transition-colors"
                    >
                      Ver perfil
                    </button>
                    {cand.pipeline_status === 'em formalização' && (
                      <button
                        onClick={() => setFormalizando(cand)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-info/10 border border-info/30 text-info"
                      >
                        <FileText size={11} /> Continuar formalização
                      </button>
                    )}
                    {cand.pipeline_status === 'contratado' && (
                      <Link href="/transportadora/contratos">
                        <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-success/10 border border-success/30 text-success">
                          <CheckCircle2 size={11} /> Ver contrato <ChevronRight size={10} />
                        </button>
                      </Link>
                    )}
                    {PODE_APROVAR.includes(cand.pipeline_status) && (
                      <button
                        onClick={() => handleAprovar(cand.id)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-success text-bg font-medium"
                      >
                        ✓ Aprovar
                      </button>
                    )}
                    {PODE_RECUSAR.includes(cand.pipeline_status) && (
                      <button
                        onClick={() => handleRecusar(cand.id)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/30 text-danger"
                      >
                        <XCircle size={11} /> Recusar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCand && (
        <CandModal
          cand={selectedCand}
          onClose={() => setSelectedCand(null)}
          onAprovar={handleAprovar}
          onRecusar={handleRecusar}
          onFormalizar={c => { setSelectedCand(null); setFormalizando(c) }}
        />
      )}

      {formalizando && (
        <FormalizacaoModal
          cand={formalizando}
          onClose={() => setFormalizando(null)}
          onContratado={handleContratado}
        />
      )}
    </div>
  )
}

export default function CandidatosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-text-muted" /></div>}>
      <CandidatosContent />
    </Suspense>
  )
}
