'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { CheckCircle2, AlertTriangle, XCircle, Clock, Upload } from 'lucide-react'

type DocStatus = 'ok' | 'vencendo' | 'vencido' | 'faltante'

interface DocItem {
  nome: string
  emoji: string
  vencimento: string | null
  status: DocStatus
  daysLeft?: number
}

function docStatus(vencimento: string | null): { status: DocStatus; daysLeft?: number } {
  if (!vencimento) return { status: 'faltante' }
  const d = new Date(vencimento)
  const hoje = new Date()
  const diff = (d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return { status: 'vencido', daysLeft: Math.abs(Math.floor(diff)) }
  if (diff < 60) return { status: 'vencendo', daysLeft: Math.floor(diff) }
  return { status: 'ok', daysLeft: Math.floor(diff) }
}

const statusMeta: Record<DocStatus, { label: string; colorClass: string; icon: React.ElementType }> = {
  ok:       { label: 'Válido',     colorClass: 'text-success bg-success-light border-success/20', icon: CheckCircle2 },
  vencendo: { label: 'Vencendo',   colorClass: 'text-gold bg-gold-light border-gold/20',          icon: AlertTriangle },
  vencido:  { label: 'Vencido',    colorClass: 'text-danger bg-danger-light border-danger/20',    icon: XCircle },
  faltante: { label: 'Pendente',   colorClass: 'text-text-muted bg-surface border-border',        icon: Clock },
}

export default function DocumentosPage() {
  const [loading, setLoading] = useState(true)
  const [docs, setDocs] = useState<DocItem[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const [
        { data: agregado },
        { data: veiculos },
        { data: equipamentos },
      ] = await Promise.all([
        supabase.from('agregados').select('cnh_vencimento, rntrc').eq('id', user.id).maybeSingle(),
        supabase.from('veiculos').select('placa, crlv_venc').eq('agregado_id', user.id),
        supabase.from('equipamentos').select('placa, tipo, crlv_venc').eq('agregado_id', user.id),
      ])

      const items: DocItem[] = [
        {
          nome: 'CNH',
          emoji: '🪪',
          vencimento: agregado?.cnh_vencimento ?? null,
          ...docStatus(agregado?.cnh_vencimento ?? null),
        },
        {
          nome: 'RNTRC / ANTT',
          emoji: '📜',
          vencimento: null,
          status: agregado?.rntrc ? 'ok' : 'faltante',
        },
        ...(veiculos ?? []).map(v => ({
          nome: `CRLV — ${v.placa}`,
          emoji: '🚛',
          vencimento: v.crlv_venc ?? null,
          ...docStatus(v.crlv_venc ?? null),
        })),
        ...(equipamentos ?? []).map(e => ({
          nome: `CRLV — ${e.placa ?? e.tipo}`,
          emoji: '⚙️',
          vencimento: e.crlv_venc ?? null,
          ...docStatus(e.crlv_venc ?? null),
        })),
        {
          nome: 'Seguro RCTR-C',
          emoji: '🛡️',
          vencimento: null,
          status: 'faltante' as DocStatus,
        },
        {
          nome: 'Seguro RC-DA',
          emoji: '🛡️',
          vencimento: null,
          status: 'faltante' as DocStatus,
        },
      ]

      setDocs(items)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="px-4 py-10 text-center text-text-muted text-sm">Carregando...</div>

  const okCount = docs.filter(d => d.status === 'ok').length
  const totalCount = docs.length
  const pct = totalCount > 0 ? Math.round(okCount / totalCount * 100) : 0

  const alertDocs = docs.filter(d => d.status === 'vencido' || d.status === 'vencendo')

  return (
    <div className="px-4 py-5">
      <div className="mb-5">
        <h1 className="font-serif text-2xl font-medium text-text-primary">Documentos</h1>
        <p className="text-xs text-text-muted mt-0.5">Controle de validade e uploads</p>
      </div>

      {/* Banner progresso */}
      <div className={`rounded-xl p-4 mb-5 border ${pct === 100 ? 'bg-success-light border-success/20' : alertDocs.length > 0 ? 'bg-warning-light border-warning/25' : 'bg-surface border-border'}`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-sans font-medium text-text-primary">
            {okCount} de {totalCount} documentos válidos
          </p>
          <span className="font-serif text-xl font-medium text-text-primary">{pct}%</span>
        </div>
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: pct === 100 ? 'var(--color-success)' : alertDocs.length > 0 ? 'var(--color-warning)' : 'var(--color-gold)',
            }}
          />
        </div>
        {alertDocs.length > 0 && (
          <p className="text-xs text-warning mt-2">
            {alertDocs.length} documento{alertDocs.length !== 1 ? 's' : ''} {alertDocs.some(d => d.status === 'vencido') ? 'vencido(s)' : 'vencendo em breve'}
          </p>
        )}
      </div>

      {/* Lista de documentos */}
      <div className="space-y-2.5">
        {docs.map((doc, i) => {
          const meta = statusMeta[doc.status]
          const Icon = meta.icon
          return (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
              {/* Emoji */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border ${meta.colorClass}`}>
                {doc.emoji}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-sans font-medium text-text-primary">{doc.nome}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {doc.vencimento
                    ? doc.status === 'vencido'
                      ? `Venceu há ${doc.daysLeft} dia${doc.daysLeft !== 1 ? 's' : ''}`
                      : doc.status === 'vencendo'
                        ? `Vence em ${doc.daysLeft} dia${doc.daysLeft !== 1 ? 's' : ''}`
                        : `Válido até ${new Date(doc.vencimento).toLocaleDateString('pt-BR')}`
                    : doc.status === 'ok'
                      ? 'Cadastrado'
                      : 'Data não informada'}
                </p>
              </div>

              {/* Badge status */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className={`inline-flex items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.colorClass}`}>
                  <Icon size={9} />
                  {meta.label}
                </span>
                {(doc.status === 'faltante' || doc.status === 'vencido') && (
                  <button className="text-[11px] font-sans font-medium text-accent flex items-center gap-1 hover:underline">
                    <Upload size={11} />
                    {doc.status === 'vencido' ? 'Renovar' : 'Enviar'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Nota informativa */}
      <div className="mt-5 bg-info-light border border-info/20 rounded-xl p-3.5">
        <p className="text-[13px] font-sans font-medium text-info mb-1">Sobre os documentos</p>
        <p className="text-xs text-text-secondary">
          Mantenha seus documentos atualizados para garantir elegibilidade para novas vagas. Transportadoras verificam a validade antes de fechar contratos.
        </p>
      </div>
    </div>
  )
}
