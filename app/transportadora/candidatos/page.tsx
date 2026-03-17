'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Users, Filter, CheckCircle2, X, Eye, Loader2, FileText, AlertTriangle, ShieldCheck, ShieldX, CalendarDays, ExternalLink } from 'lucide-react'
import Badge from '@/components/ui/Badge'

type DocStatus = 'pendente' | 'verificado' | 'rejeitado' | 'vencido'
interface Documento {
  id: string
  tipo: string
  nome_arquivo: string | null
  url: string | null
  data_validade: string | null
  status: DocStatus
  observacao: string | null
}
const TIPO_LABEL: Record<string, string> = {
  cnh: 'CNH', rntrc: 'RNTRC', crlv: 'CRLV', seguro: 'Seguro',
  contrato_social: 'Contrato Social', outros: 'Outros',
}
const DOC_STATUS_CFG: Record<DocStatus, { label: string; color: string; bg: string }> = {
  pendente:   { label: 'Pendente',   color: 'text-warning', bg: 'bg-warning-light'  },
  verificado: { label: 'Verificado', color: 'text-success', bg: 'bg-success-light'  },
  rejeitado:  { label: 'Rejeitado',  color: 'text-danger',  bg: 'bg-danger-light'   },
  vencido:    { label: 'Vencido',    color: 'text-danger',  bg: 'bg-danger-light'   },
}

// Status pipeline fiel ao HTML de referência
type CandStatus = 'pendente' | 'visualizado' | 'em_negociacao' | 'em_formalizacao' | 'aceito' | 'contratado' | 'recusado'

interface Candidatura {
  id: string
  vaga_id: string
  agregado_id: string
  status: CandStatus
  mensagem: string | null
  created_at: string
  vagas: {
    id: string
    rota_origem: string | null
    rota_destino: string | null
    tipo_veiculo: string | null
    valor_km: number | null
    periodo_meses: number | null
  } | null
  perfil: {
    nome: string | null
  } | null
  agregados: {
    cpf: string | null
    cnh: string | null
  } | null
  veiculos: {
    tipo: string
    placa: string
    ano: number | null
  } | null
}

const STATUS_LABEL: Record<CandStatus, string> = {
  pendente:        'Novo',
  visualizado:     'Visualizado',
  em_negociacao:   'Em negociação',
  em_formalizacao: 'Em formalização',
  aceito:          'Aprovado',
  contratado:      'Contratado',
  recusado:        'Recusado',
}

const STATUS_BADGE: Record<CandStatus, string> = {
  pendente:        'bg-orange-100 text-orange-700',
  visualizado:     'bg-gray-100 text-gray-600',
  em_negociacao:   'bg-green-100 text-green-700',
  em_formalizacao: 'bg-blue-100 text-blue-700',
  aceito:          'bg-green-100 text-green-700',
  contratado:      'bg-accent/10 text-accent',
  recusado:        'bg-red-100 text-red-700',
}

const PODE_APROVAR: CandStatus[] = ['pendente', 'visualizado', 'em_negociacao', 'em_formalizacao']
const PODE_RECUSAR: CandStatus[] = ['pendente', 'visualizado', 'em_negociacao', 'em_formalizacao', 'aceito']

export default function CandidatosPage() {
  const router = useRouter()
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<string>('')
  const [selectedCand, setSelectedCand] = useState<Candidatura | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalTab, setModalTab] = useState<'perfil' | 'documentos'>('perfil')
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState<string | null>(null)
  // Rejection dialog state
  const [rejectDialog, setRejectDialog] = useState<{ id: string; nome: string; fromModal?: boolean } | null>(null)
  const [rejectMotivo, setRejectMotivo] = useState('')

  const fetchCandidaturas = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // Get all vagas ids for this transportadora
    const { data: vagasData } = await supabase
      .from('vagas')
      .select('id')
      .eq('transportadora_id', user.id)

    const vagaIds = vagasData?.map(v => v.id) ?? []
    if (!vagaIds.length) { setCandidaturas([]); setLoading(false); return }

    let query = supabase
      .from('candidaturas')
      .select(`
        id, vaga_id, agregado_id, status, mensagem, created_at,
        vagas (id, rota_origem, rota_destino, tipo_veiculo, valor_km, periodo_meses),
        perfil:profiles!agregado_id (nome),
        agregados (cpf, cnh),
        veiculos (tipo, placa, ano)
      `)
      .in('vaga_id', vagaIds)
      .order('created_at', { ascending: false })

    if (filtroStatus) {
      query = query.eq('status', filtroStatus)
    }

    const { data } = await query
    setCandidaturas((data as unknown as Candidatura[]) ?? [])
    setLoading(false)
  }, [filtroStatus, router])

  useEffect(() => { fetchCandidaturas() }, [fetchCandidaturas])

  async function updateStatus(id: string, status: CandStatus) {
    setActionLoading(id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (status === 'aceito') {
      // Aprovação: criar contrato_motorista + mover para em_formalizacao
      const cand = candidaturas.find(c => c.id === id)
      if (cand) {
        const dataInicio = new Date().toISOString().split('T')[0]
        const meses = cand.vagas?.periodo_meses ?? 12
        const dataFim = new Date(Date.now() + meses * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        await supabase.from('contratos_motorista').insert({
          candidatura_id: id,
          transportadora_id: user.id,
          agregado_id: cand.agregado_id,
          vaga_id: cand.vaga_id,
          status: 'pendente_assinatura',
          data_inicio: dataInicio,
          data_fim_prevista: dataFim,
        })
        // Move candidatura para em_formalizacao (agregado verá na aba "Para assinar")
        await supabase.from('candidaturas').update({ status: 'em_formalizacao' }).eq('id', id)
        const finalStatus: CandStatus = 'em_formalizacao'
        setCandidaturas(prev => prev.map(c => c.id === id ? { ...c, status: finalStatus } : c))
        if (showModal && selectedCand?.id === id) {
          setSelectedCand(prev => prev ? { ...prev, status: finalStatus } : null)
        }
        setActionLoading(null)
        return
      }
    }

    await supabase.from('candidaturas').update({ status }).eq('id', id)
    setCandidaturas(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    setActionLoading(null)
    if (showModal && selectedCand?.id === id) {
      setSelectedCand(prev => prev ? { ...prev, status } : null)
    }
  }

  async function confirmReject() {
    if (!rejectDialog) return
    setActionLoading(rejectDialog.id)
    const supabase = createClient()
    await supabase.from('candidaturas').update({ status: 'recusado' }).eq('id', rejectDialog.id)
    setCandidaturas(prev => prev.map(c => c.id === rejectDialog.id ? { ...c, status: 'recusado' as CandStatus } : c))
    if (rejectDialog.fromModal) {
      setSelectedCand(prev => prev ? { ...prev, status: 'recusado' as CandStatus } : null)
      setShowModal(false)
    }
    setActionLoading(null)
    setRejectDialog(null)
    setRejectMotivo('')
  }

  async function loadDocumentos(agregadoId: string) {
    setDocsLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('documentos')
      .select('id, tipo, nome_arquivo, url, data_validade, status, observacao')
      .eq('agregado_id', agregadoId)
      .order('tipo')
    setDocumentos((data as Documento[]) ?? [])
    setDocsLoading(false)
  }

  async function verifyDoc(docId: string, newStatus: 'verificado' | 'rejeitado', obs?: string) {
    setVerifyLoading(docId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('documentos').update({
      status: newStatus,
      observacao: obs ?? null,
      verificado_por: user?.id,
      verificado_em: new Date().toISOString(),
    }).eq('id', docId)
    setDocumentos(prev => prev.map(d => d.id === docId ? { ...d, status: newStatus, observacao: obs ?? null } : d))
    setVerifyLoading(null)
  }

  function openModal(c: Candidatura) {
    setSelectedCand(c)
    setShowModal(true)
    setModalTab('perfil')
    setDocumentos([])
    // Mark as viewed
    if (c.status === 'pendente') updateStatus(c.id, 'visualizado')
  }

  function handleTabChange(tab: 'perfil' | 'documentos') {
    setModalTab(tab)
    if (tab === 'documentos' && selectedCand && documentos.length === 0) {
      loadDocumentos(selectedCand.agregado_id)
    }
  }

  const novosCount = candidaturas.filter(c => c.status === 'pendente').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans">Recebidos</p>
          <h1 className="font-serif text-2xl font-bold text-text-primary">Candidatos</h1>
        </div>
        {novosCount > 0 && (
          <span className="bg-warning-light text-warning text-xs font-semibold px-3 py-1.5 rounded-pill border border-warning/20">
            {novosCount} novo{novosCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-text-muted" />
          <span className="text-xs text-text-muted">Status:</span>
        </div>
        {(['', 'pendente', 'visualizado', 'em_negociacao', 'em_formalizacao', 'contratado', 'recusado'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className={`px-3 py-1 rounded-pill text-xs font-medium border transition-all ${
              filtroStatus === s
                ? 'bg-accent text-bg border-accent'
                : 'bg-bg border-border text-text-secondary hover:border-accent/40'
            }`}
          >
            {s ? STATUS_LABEL[s as CandStatus] : 'Todos'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-text-muted" />
        </div>
      ) : candidaturas.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <Users size={36} className="text-text-muted mx-auto mb-3" />
          <p className="font-medium text-text-secondary">Nenhum candidato encontrado</p>
          <p className="text-sm text-text-muted mt-1">
            {filtroStatus ? 'Altere o filtro de status' : 'Publique vagas para receber candidaturas'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {candidaturas.map(c => {
            const nome = c.perfil?.nome ?? 'Motorista'
            const initials = nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
            const vaga = c.vagas
            const rota = vaga ? `${vaga.rota_origem ?? ''} → ${vaga.rota_destino ?? ''}` : '—'
            const isNew = c.status === 'pendente'

            return (
              <div
                key={c.id}
                className={`bg-surface border rounded-xl p-4 transition-shadow hover:shadow-card-hover ${
                  isNew ? 'border-warning/30' : 'border-border'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[#E0DAD0] border border-border flex items-center justify-center font-serif text-sm font-semibold text-text-secondary flex-shrink-0">
                    {initials}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-text-primary text-sm">{nome}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-pill uppercase tracking-wide ${STATUS_BADGE[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      {vaga?.tipo_veiculo ?? '—'} · {rota}
                    </p>
                    {c.mensagem && (
                      <p className="text-xs text-text-secondary mt-1 italic line-clamp-1">"{c.mensagem}"</p>
                    )}
                  </div>
                  {/* Date */}
                  <div className="text-[11px] text-text-muted flex-shrink-0">
                    {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => openModal(c)}
                    className="flex items-center gap-1.5 text-xs text-text-secondary border border-border px-3 py-1.5 rounded-pill hover:border-accent/40 transition-colors"
                  >
                    <Eye size={12} />
                    Ver perfil
                  </button>
                  {c.status === 'contratado' && (
                    <span className="flex items-center gap-1 text-xs text-success font-medium">
                      <CheckCircle2 size={13} />
                      Contratado
                    </span>
                  )}
                  {PODE_APROVAR.includes(c.status) && (
                    <button
                      onClick={() => updateStatus(c.id, 'aceito')}
                      disabled={actionLoading === c.id}
                      className="flex items-center gap-1.5 text-xs font-medium text-success bg-success-light border border-success/20 px-3 py-1.5 rounded-pill hover:bg-success/10 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={12} />
                      Aprovar
                    </button>
                  )}
                  {PODE_RECUSAR.includes(c.status) && (
                    <button
                      onClick={() => { setRejectDialog({ id: c.id, nome }); setRejectMotivo('') }}
                      disabled={actionLoading === c.id}
                      className="flex items-center gap-1.5 text-xs font-medium text-danger bg-danger-light border border-danger/20 px-3 py-1.5 rounded-pill hover:bg-danger/10 transition-colors disabled:opacity-50 ml-auto"
                    >
                      <X size={12} />
                      Recusar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Candidate Detail Modal */}
      {showModal && selectedCand && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="bg-bg w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#E0DAD0] border border-border flex items-center justify-center font-serif text-lg font-semibold text-text-secondary">
                  {(selectedCand.perfil?.nome ?? 'M').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-text-primary">{selectedCand.perfil?.nome ?? 'Motorista'}</p>
                  <p className="text-xs text-text-muted">{selectedCand.vagas?.tipo_veiculo ?? '—'}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-surface rounded-lg text-text-muted">
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {(['perfil', 'documentos'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`flex-1 py-2.5 text-xs font-medium capitalize border-b-2 transition-colors ${
                    modalTab === tab ? 'border-accent text-text-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {tab === 'perfil' ? 'Perfil' : 'Documentos'}
                </button>
              ))}
            </div>

            {/* Modal body — Perfil */}
            {modalTab === 'perfil' && (
              <div className="p-5 space-y-4">
                <div className="bg-surface rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Candidatou-se para</p>
                  <p className="font-serif text-lg font-semibold text-text-primary">
                    {selectedCand.vagas?.rota_origem} → {selectedCand.vagas?.rota_destino}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Status</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-pill ${STATUS_BADGE[selectedCand.status]}`}>
                      {STATUS_LABEL[selectedCand.status]}
                    </span>
                  </div>
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Remuneração</p>
                    <p className="text-sm font-semibold text-success">
                      {selectedCand.vagas?.valor_km ? `R$ ${selectedCand.vagas.valor_km.toFixed(2).replace('.', ',')}/km` : '—'}
                    </p>
                  </div>
                </div>

                {selectedCand.veiculos && (
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Veículo</p>
                    <p className="text-sm font-medium text-text-primary">
                      {selectedCand.veiculos.tipo} · {selectedCand.veiculos.placa}
                      {selectedCand.veiculos.ano ? ` · ${selectedCand.veiculos.ano}` : ''}
                    </p>
                  </div>
                )}

                {selectedCand.mensagem && (
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Mensagem do candidato</p>
                    <p className="text-sm text-text-secondary italic">"{selectedCand.mensagem}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Modal body — Documentos */}
            {modalTab === 'documentos' && (
              <div className="p-5 max-h-[50vh] overflow-y-auto">
                {docsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={22} className="animate-spin text-text-muted" />
                  </div>
                ) : documentos.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText size={32} className="text-text-muted mx-auto mb-2" />
                    <p className="text-sm text-text-secondary font-medium">Nenhum documento enviado</p>
                    <p className="text-xs text-text-muted mt-1">O candidato ainda não enviou documentos.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documentos.map(doc => {
                      const dias = doc.data_validade
                        ? Math.ceil((new Date(doc.data_validade).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : null
                      const isExpired = dias !== null && dias < 0
                      const effectiveStatus: DocStatus = isExpired ? 'vencido' : doc.status
                      const cfg = DOC_STATUS_CFG[effectiveStatus]
                      return (
                        <div key={doc.id} className="border border-border rounded-xl p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <FileText size={14} className="text-text-muted flex-shrink-0" />
                              <span className="text-sm font-semibold text-text-primary">
                                {TIPO_LABEL[doc.tipo] ?? doc.tipo}
                              </span>
                              {doc.nome_arquivo && (
                                <span className="text-[10px] text-text-muted truncate max-w-[100px]">{doc.nome_arquivo}</span>
                              )}
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </div>

                          {doc.data_validade && (
                            <div className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg ${
                              isExpired ? 'bg-danger-light text-danger' :
                              (dias !== null && dias <= 30) ? 'bg-warning-light text-warning' :
                              'bg-bg border border-border text-text-muted'
                            }`}>
                              <CalendarDays size={11} />
                              {isExpired
                                ? `Vencido em ${new Date(doc.data_validade).toLocaleDateString('pt-BR')}`
                                : `Válido até ${new Date(doc.data_validade).toLocaleDateString('pt-BR')}`}
                            </div>
                          )}

                          {doc.observacao && (
                            <p className="text-xs text-danger bg-danger-light border border-danger/20 rounded-lg px-2.5 py-1.5 italic">
                              {doc.observacao}
                            </p>
                          )}

                          <div className="flex items-center gap-2 pt-1 border-t border-border">
                            {doc.url && (
                              <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-accent hover:underline">
                                <ExternalLink size={11} /> Ver arquivo
                              </a>
                            )}
                            {effectiveStatus !== 'verificado' && !isExpired && (
                              <button
                                onClick={() => verifyDoc(doc.id, 'verificado')}
                                disabled={verifyLoading === doc.id}
                                className="ml-auto flex items-center gap-1 text-xs text-success bg-success-light border border-success/20 px-2.5 py-1 rounded-pill hover:bg-success/10 disabled:opacity-50 transition-colors"
                              >
                                <ShieldCheck size={11} />
                                {verifyLoading === doc.id ? '...' : 'Verificar'}
                              </button>
                            )}
                            {effectiveStatus !== 'rejeitado' && (
                              <button
                                onClick={async () => {
                                  await verifyDoc(doc.id, 'rejeitado')
                                }}
                                disabled={verifyLoading === doc.id}
                                className="flex items-center gap-1 text-xs text-danger bg-danger-light border border-danger/20 px-2.5 py-1 rounded-pill hover:bg-danger/10 disabled:opacity-50 transition-colors"
                              >
                                <ShieldX size={11} />
                                Rejeitar
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Summary */}
                    <div className="pt-1 flex items-center gap-3 text-xs text-text-muted">
                      <span className="flex items-center gap-1 text-success">
                        <ShieldCheck size={12} /> {documentos.filter(d => d.status === 'verificado').length} verificado{documentos.filter(d => d.status === 'verificado').length !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1 text-warning">
                        <AlertTriangle size={12} /> {documentos.filter(d => d.status === 'pendente').length} pendente{documentos.filter(d => d.status === 'pendente').length !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1 text-danger">
                        <X size={12} /> {documentos.filter(d => d.status === 'rejeitado' || d.status === 'vencido').length} rejeitado/vencido
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal footer */}
            <div className="flex items-center gap-2 p-5 border-t border-border">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-pill border border-border text-sm text-text-secondary hover:bg-surface transition-colors"
              >
                Fechar
              </button>
              {PODE_RECUSAR.includes(selectedCand.status) && (
                <button
                  onClick={() => {
                    setRejectDialog({ id: selectedCand.id, nome: selectedCand.perfil?.nome ?? 'Candidato', fromModal: true })
                    setRejectMotivo('')
                  }}
                  className="px-4 py-2 rounded-pill border border-danger/20 text-sm text-danger bg-danger-light hover:bg-danger/10 transition-colors"
                >
                  ✕ Recusar
                </button>
              )}
              {PODE_APROVAR.includes(selectedCand.status) && (
                <button
                  onClick={async () => {
                    await updateStatus(selectedCand.id, 'aceito')
                    setShowModal(false)
                  }}
                  className="ml-auto px-4 py-2 rounded-pill bg-accent text-bg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  ✓ Aprovar → Formalizar contrato
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection dialog */}
      {rejectDialog && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-bg w-full max-w-sm rounded-2xl p-5 shadow-xl">
            <h3 className="font-serif text-lg font-medium text-text-primary mb-1">Recusar candidatura</h3>
            <p className="text-sm text-text-muted mb-4">
              Tem certeza que deseja recusar <strong>{rejectDialog.nome}</strong>?
            </p>
            <textarea
              value={rejectMotivo}
              onChange={e => setRejectMotivo(e.target.value)}
              placeholder="Motivo da recusa (opcional — ficará visível para o candidato)"
              rows={3}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-surface text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent/40 resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setRejectDialog(null); setRejectMotivo('') }}
                className="flex-1 py-2.5 text-sm border border-border rounded-xl text-text-secondary hover:bg-surface transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReject}
                disabled={!!actionLoading}
                className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-danger text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Confirmar recusa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
