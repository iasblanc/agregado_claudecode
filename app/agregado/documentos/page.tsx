'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Upload, FileText, CheckCircle2, XCircle, Clock, AlertTriangle,
  Trash2, Plus, X, Eye, CalendarDays,
} from 'lucide-react'

// ── Tipos ────────────────────────────────────────────────────────────────────

type DocTipo = 'cnh' | 'rntrc' | 'crlv' | 'seguro' | 'contrato_social' | 'outros'
type DocStatus = 'pendente' | 'verificado' | 'rejeitado' | 'vencido'

interface Documento {
  id: string
  tipo: DocTipo
  nome_arquivo: string | null
  url: string | null
  storage_path: string | null
  data_validade: string | null
  status: DocStatus
  observacao: string | null
  created_at: string
}

// ── Config ────────────────────────────────────────────────────────────────────

const TIPOS: { key: DocTipo; label: string; descricao: string; temValidade: boolean }[] = [
  { key: 'cnh',             label: 'CNH',                   descricao: 'Carteira Nacional de Habilitação',    temValidade: true  },
  { key: 'rntrc',           label: 'RNTRC',                 descricao: 'Registro Nacional de Transportadores', temValidade: true },
  { key: 'crlv',            label: 'CRLV',                  descricao: 'Certificado de Registro do Veículo',  temValidade: true  },
  { key: 'seguro',          label: 'Seguro',                descricao: 'Apólice de seguro do veículo',        temValidade: true  },
  { key: 'contrato_social', label: 'Contrato Social',       descricao: 'Para MEI e empresas',                temValidade: false },
  { key: 'outros',          label: 'Outros',                descricao: 'Outros documentos relevantes',       temValidade: false },
]

const STATUS_CONFIG: Record<DocStatus, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  pendente:    { label: 'Aguardando verificação', icon: Clock,         color: 'text-warning',  bg: 'bg-warning-light',  border: 'border-warning/20'  },
  verificado:  { label: 'Verificado',             icon: CheckCircle2,  color: 'text-success',  bg: 'bg-success-light',  border: 'border-success/20'  },
  rejeitado:   { label: 'Rejeitado',              icon: XCircle,       color: 'text-danger',   bg: 'bg-danger-light',   border: 'border-danger/20'   },
  vencido:     { label: 'Vencido',                icon: AlertTriangle, color: 'text-danger',   bg: 'bg-danger-light',   border: 'border-danger/20'   },
}

function diasParaVencer(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

// ── Upload Modal ──────────────────────────────────────────────────────────────

interface UploadModalProps {
  onClose: () => void
  onSaved: (doc: Documento) => void
  userId: string
}

function UploadModal({ onClose, onSaved, userId }: UploadModalProps) {
  const [tipo, setTipo] = useState<DocTipo>('cnh')
  const [dataValidade, setDataValidade] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const tipoConfig = TIPOS.find(t => t.key === tipo)!

  async function handleSave() {
    if (!file) { setError('Selecione um arquivo.'); return }
    setUploading(true)
    setError('')

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${userId}/${tipo}_${Date.now()}.${ext}`

      // Upload to Supabase Storage bucket 'documentos'
      const { error: storageErr } = await supabase.storage
        .from('documentos')
        .upload(path, file, { upsert: false })

      let url: string | null = null
      let storagePath: string | null = null

      if (storageErr) {
        // Bucket might not exist yet – save metadata without URL as fallback
        console.warn('Storage upload failed:', storageErr.message)
      } else {
        storagePath = path
        const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path)
        url = urlData?.publicUrl ?? null
      }

      const { data, error: dbErr } = await supabase
        .from('documentos')
        .insert({
          agregado_id: userId,
          tipo,
          nome_arquivo: file.name,
          url,
          storage_path: storagePath,
          data_validade: dataValidade || null,
          status: 'pendente',
        })
        .select()
        .single()

      if (dbErr) throw dbErr
      onSaved(data as Documento)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar documento.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-bg rounded-t-2xl p-5 pb-8 shadow-modal max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-medium text-text-primary">Enviar documento</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-surface text-text-muted"><X size={18} /></button>
        </div>

        {/* Tipo */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-secondary mb-2">Tipo de documento</label>
          <div className="grid grid-cols-2 gap-2">
            {TIPOS.map(t => (
              <button
                key={t.key}
                onClick={() => setTipo(t.key)}
                className={`flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-colors ${
                  tipo === t.key
                    ? 'border-accent bg-accent/5 text-accent'
                    : 'border-border bg-surface text-text-secondary hover:border-accent/40'
                }`}
              >
                <span className="text-xs font-semibold">{t.label}</span>
                <span className="text-[10px] text-text-muted leading-tight mt-0.5">{t.descricao}</span>
              </button>
            ))}
          </div>
        </div>

        {/* File picker */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-secondary mb-2">Arquivo (PDF, JPG ou PNG, máx 10 MB)</label>
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
              file ? 'border-accent/40 bg-accent/5' : 'border-border hover:border-accent/30'
            }`}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm text-text-primary">
                <FileText size={18} className="text-accent" />
                <span className="truncate max-w-[200px]">{file.name}</span>
              </div>
            ) : (
              <>
                <Upload size={24} className="text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-secondary">Clique para selecionar</p>
                <p className="text-xs text-text-muted mt-1">PDF, JPG ou PNG</p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {/* Validade */}
        {tipoConfig.temValidade && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Data de validade <span className="text-text-muted">(opcional)</span>
            </label>
            <input
              type="date"
              value={dataValidade}
              onChange={e => setDataValidade(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-bg text-text-primary focus:outline-none focus:border-accent/60"
            />
          </div>
        )}

        {error && (
          <div className="mb-3 bg-danger-light border border-danger/20 rounded-lg px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border border-border rounded-pill py-2.5 text-sm text-text-secondary hover:bg-surface transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={uploading || !file}
            className="flex-[2] bg-accent text-bg rounded-pill py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <><span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />Enviando...</>
            ) : (
              <><Upload size={14} />Enviar documento</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Document Card ─────────────────────────────────────────────────────────────

function DocCard({ doc, onDelete }: { doc: Documento; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false)
  const tipoLabel = TIPOS.find(t => t.key === doc.tipo)?.label ?? doc.tipo
  const dias = diasParaVencer(doc.data_validade)
  const isExpired = dias !== null && dias < 0
  const isExpiring = dias !== null && dias >= 0 && dias <= 30
  const effectiveStatus: DocStatus = isExpired && doc.status !== 'vencido' ? 'vencido' : doc.status
  const cfg = STATUS_CONFIG[effectiveStatus]
  const StatusIcon = cfg.icon

  async function handleDelete() {
    if (!confirm('Remover este documento?')) return
    setDeleting(true)
    const supabase = createClient()
    if (doc.storage_path) {
      await supabase.storage.from('documentos').remove([doc.storage_path])
    }
    await supabase.from('documentos').delete().eq('id', doc.id)
    onDelete(doc.id)
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#E8E3D8] flex items-center justify-center flex-shrink-0">
            <FileText size={16} className="text-text-secondary" />
          </div>
          <div>
            <p className="font-semibold text-text-primary text-sm">{tipoLabel}</p>
            {doc.nome_arquivo && (
              <p className="text-[11px] text-text-muted truncate max-w-[180px]">{doc.nome_arquivo}</p>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${cfg.bg} ${cfg.color} border ${cfg.border} shrink-0`}>
          <StatusIcon size={11} />
          {cfg.label}
        </div>
      </div>

      {doc.data_validade && (
        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${
          isExpired ? 'bg-danger-light text-danger' :
          isExpiring ? 'bg-warning-light text-warning' :
          'bg-bg text-text-secondary border border-border'
        }`}>
          <CalendarDays size={12} />
          <span>
            {isExpired ? `Vencido em ${fmtDate(doc.data_validade)}` :
             isExpiring ? `Vence em ${dias} dia${dias !== 1 ? 's' : ''} · ${fmtDate(doc.data_validade)}` :
             `Válido até ${fmtDate(doc.data_validade)}`}
          </span>
        </div>
      )}

      {doc.observacao && (
        <div className="bg-danger-light border border-danger/20 rounded-lg px-3 py-2 text-xs text-danger">
          <strong>Motivo da rejeição:</strong> {doc.observacao}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-border">
        {doc.url ? (
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-accent hover:underline"
          >
            <Eye size={12} /> Visualizar
          </a>
        ) : (
          <span className="text-xs text-text-muted italic">Arquivo não disponível</span>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto flex items-center gap-1.5 text-xs text-text-muted hover:text-danger transition-colors disabled:opacity-50"
        >
          <Trash2 size={12} />
          {deleting ? 'Removendo...' : 'Remover'}
        </button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function DocumentosPage() {
  const [docs, setDocs] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('documentos')
        .select('*')
        .eq('agregado_id', user.id)
        .order('created_at', { ascending: false })
      setDocs((data as Documento[]) ?? [])
      setLoading(false)
    })
  }, [])

  // Group docs by tipo
  const byTipo = TIPOS.map(t => ({
    ...t,
    docs: docs.filter(d => d.tipo === t.key),
  }))

  const totalPendente = docs.filter(d => d.status === 'pendente').length
  const totalVencido = docs.filter(d => {
    const dias = diasParaVencer(d.data_validade)
    return (dias !== null && dias < 0) || d.status === 'vencido'
  }).length
  const totalVencendo = docs.filter(d => {
    const dias = diasParaVencer(d.data_validade)
    return dias !== null && dias >= 0 && dias <= 30 && d.status !== 'vencido'
  }).length

  if (loading) {
    return (
      <div className="px-4 py-5">
        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-widest text-text-muted">Compliance</p>
          <h1 className="font-serif text-2xl font-bold text-text-primary">Documentos</h1>
        </div>
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-[#E8E3D8] rounded w-1/3 mb-2" />
              <div className="h-3 bg-[#E8E3D8] rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const totalDocs = TIPOS.length
  const verificados = docs.filter(d => d.status === 'verificado').length
  const progressPct = Math.round((verificados / totalDocs) * 100)
  const docsEnviados = docs.length

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans">Compliance</p>
          <h1 className="font-serif text-2xl font-bold text-text-primary">Meus Documentos</h1>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 bg-accent text-bg px-4 py-2 rounded-pill text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} />
          Enviar
        </button>
      </div>

      {/* Summary hero card */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            totalVencido > 0 ? 'bg-danger-light' : totalVencendo > 0 ? 'bg-warning-light' : verificados === totalDocs ? 'bg-success-light' : 'bg-[#E8E3D8]'
          }`}>
            <FileText size={18} className={
              totalVencido > 0 ? 'text-danger' : totalVencendo > 0 ? 'text-warning' : verificados === totalDocs ? 'text-success' : 'text-text-secondary'
            } />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[.1em] text-text-muted font-sans mb-0.5">Status documental</p>
            <p className="text-[15px] font-medium text-text-primary font-sans">
              {totalVencido > 0
                ? `${totalVencido} documento${totalVencido > 1 ? 's' : ''} vencido${totalVencido > 1 ? 's' : ''}`
                : totalVencendo > 0
                ? `${totalVencendo} vence${totalVencendo > 1 ? 'm' : ''} em breve`
                : verificados === totalDocs
                ? 'Todos os documentos verificados'
                : docsEnviados === 0
                ? 'Nenhum documento enviado'
                : `${verificados} de ${totalDocs} tipos verificados`}
            </p>
          </div>
          <span className={`font-serif text-[22px] font-medium leading-none ${
            totalVencido > 0 ? 'text-danger' : totalVencendo > 0 ? 'text-warning' : 'text-[#3A6B4A]'
          }`}>
            {progressPct}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#E0DAD0] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              totalVencido > 0 ? 'bg-danger' : totalVencendo > 0 ? 'bg-[#C8A84B]' : 'bg-[#3A6B4A]'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex gap-4 mt-2.5">
          <span className="text-[11px] text-[#3A6B4A] flex items-center gap-1">
            <CheckCircle2 size={11} /> {verificados} verificado{verificados !== 1 ? 's' : ''}
          </span>
          {totalPendente > 0 && (
            <span className="text-[11px] text-[#C8A84B] flex items-center gap-1">
              <Clock size={11} /> {totalPendente} pendente{totalPendente !== 1 ? 's' : ''}
            </span>
          )}
          {totalVencido > 0 && (
            <span className="text-[11px] text-danger flex items-center gap-1">
              <AlertTriangle size={11} /> {totalVencido} vencido{totalVencido !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Alertas de compliance */}
      {(totalVencido > 0 || totalVencendo > 0 || totalPendente > 0) && (
        <div className="space-y-2">
          {totalVencido > 0 && (
            <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3 flex items-center gap-3">
              <AlertTriangle size={16} className="text-danger flex-shrink-0" />
              <p className="text-sm text-danger">
                <strong>{totalVencido} documento{totalVencido > 1 ? 's' : ''} vencido{totalVencido > 1 ? 's' : ''}.</strong>{' '}
                Renove para manter sua habilitação nas vagas.
              </p>
            </div>
          )}
          {totalVencendo > 0 && (
            <div className="bg-warning-light border border-warning/20 rounded-xl px-4 py-3 flex items-center gap-3">
              <CalendarDays size={16} className="text-warning flex-shrink-0" />
              <p className="text-sm text-warning">
                <strong>{totalVencendo} documento{totalVencendo > 1 ? 's' : ''}</strong>{' '}
                vence{totalVencendo > 1 ? 'm' : ''} em até 30 dias.
              </p>
            </div>
          )}
          {totalPendente > 0 && (
            <div className="bg-info-light border border-info/20 rounded-xl px-4 py-3 flex items-center gap-3">
              <Clock size={16} className="text-info flex-shrink-0" />
              <p className="text-sm text-info">
                <strong>{totalPendente} documento{totalPendente > 1 ? 's' : ''}</strong>{' '}
                aguardando verificação pela transportadora.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Checklist por tipo */}
      <div className="space-y-4">
        {byTipo.map(({ key, label, descricao, docs: tipoDocs }) => (
          <div key={key}>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{label}</p>
              <span className="text-[10px] text-text-muted">{descricao}</span>
              {tipoDocs.length === 0 && (
                <span className="ml-auto text-[10px] text-text-muted italic">Não enviado</span>
              )}
            </div>
            {tipoDocs.length > 0 ? (
              <div className="space-y-2">
                {tipoDocs.map(doc => (
                  <DocCard
                    key={doc.id}
                    doc={doc}
                    onDelete={id => setDocs(prev => prev.filter(d => d.id !== id))}
                  />
                ))}
              </div>
            ) : (
              <button
                onClick={() => setShowUpload(true)}
                className="w-full border-2 border-dashed border-border rounded-xl py-4 text-xs text-text-muted hover:border-accent/30 hover:text-accent transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus size={14} />
                Enviar {label}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          userId={userId}
          onClose={() => setShowUpload(false)}
          onSaved={doc => {
            setDocs(prev => [doc, ...prev])
            setShowUpload(false)
          }}
        />
      )}
    </div>
  )
}
