'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Search, Filter, MapPin, Truck, Star, Send, X, Loader2, ChevronRight, CheckCircle2 } from 'lucide-react'

const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

const VTYPE_OPTIONS = [
  '','Automóvel','Van','3/4','Toco','Truck','Cavalo 4×2','Cavalo 6×2','Cavalo 6×4',
]

interface AgregadoCard {
  id: string
  nome: string
  uf: string | null
  tipo_veiculo: string | null
  placa: string | null
  ano_veiculo: number | null
  cnh: string | null
  cpf_mask: string
  foto_url: string | null
  nota_media: number | null
  total_avaliacoes: number
}

export default function BuscarMotoristasPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [motoristas, setMotoristas] = useState<AgregadoCard[]>([])
  const [filtroUF, setFiltroUF] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroNome, setFiltroNome] = useState('')
  const [selected, setSelected] = useState<AgregadoCard | null>(null)
  const [sendLoading, setSendLoading] = useState<string | null>(null)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const fetchMotoristas = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // Fetch agregados with vehicle info
    let query = supabase
      .from('agregados')
      .select(`
        id,
        cpf,
        foto_url,
        profiles!inner (nome),
        veiculos (tipo, placa, ano)
      `)

    const { data } = await query

    if (!data) { setLoading(false); return }

    // Fetch average ratings
    const ids = data.map(a => a.id)
    const { data: avalData } = ids.length
      ? await supabase
          .from('avaliacoes')
          .select('avaliado_id, nota')
          .in('avaliado_id', ids)
      : { data: [] }

    const avalMap: Record<string, { total: number; count: number }> = {}
    for (const av of (avalData ?? [])) {
      if (!avalMap[av.avaliado_id]) avalMap[av.avaliado_id] = { total: 0, count: 0 }
      avalMap[av.avaliado_id].total += av.nota
      avalMap[av.avaliado_id].count += 1
    }

    const cards: AgregadoCard[] = (data as any[]).map(a => {
      const veiculo = Array.isArray(a.veiculos) ? a.veiculos[0] : a.veiculos
      const aval = avalMap[a.id]
      const cpf: string = a.cpf ?? ''
      return {
        id: a.id,
        nome: a.profiles?.nome ?? 'Motorista',
        uf: null, // profiles doesn't store UF yet
        tipo_veiculo: veiculo?.tipo ?? null,
        placa: veiculo?.placa ?? null,
        ano_veiculo: veiculo?.ano ?? null,
        cnh: a.cnh ?? null,
        cpf_mask: cpf ? `***.***.${cpf.slice(6, 9)}-**` : '—',
        foto_url: a.foto_url ?? null,
        nota_media: aval ? parseFloat((aval.total / aval.count).toFixed(1)) : null,
        total_avaliacoes: aval?.count ?? 0,
      }
    })

    setMotoristas(cards)
    setLoading(false)
  }, [router])

  useEffect(() => { fetchMotoristas() }, [fetchMotoristas])

  const filtered = motoristas.filter(m => {
    if (filtroNome && !m.nome.toLowerCase().includes(filtroNome.toLowerCase())) return false
    if (filtroTipo && m.tipo_veiculo !== filtroTipo) return false
    return true
  })

  async function sendInteresse(agregadoId: string) {
    setSendLoading(agregadoId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('interesses').insert({
        transportadora_id: user.id,
        agregado_id: agregadoId,
        mensagem: 'Temos interesse em trabalhar com você. Entre em contato conosco.',
      })
    }
    setSentIds(prev => new Set([...prev, agregadoId]))
    setSendLoading(null)
  }

  function renderStars(nota: number | null) {
    if (!nota) return null
    return (
      <div className="flex items-center gap-0.5">
        {[1,2,3,4,5].map(i => (
          <Star
            key={i}
            size={11}
            className={i <= Math.round(nota) ? 'text-gold fill-gold' : 'text-border fill-border'}
          />
        ))}
        <span className="text-[10px] text-text-muted ml-1">{nota}</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans">Marketplace</p>
        <h1 className="font-serif text-2xl font-bold text-text-primary">Buscar Motoristas</h1>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Filter size={13} />
          <span>Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Nome */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Nome do motorista"
              value={filtroNome}
              onChange={e => setFiltroNome(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-bg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60"
            />
          </div>
          {/* UF */}
          <select
            value={filtroUF}
            onChange={e => setFiltroUF(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-bg text-text-primary focus:outline-none focus:border-accent/60"
          >
            <option value="">Todos os estados</option>
            {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
          {/* Tipo veículo */}
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-bg text-text-primary focus:outline-none focus:border-accent/60"
          >
            <option value="">Todos os veículos</option>
            {VTYPE_OPTIONS.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <Truck size={36} className="text-text-muted mx-auto mb-3" />
          <p className="font-medium text-text-secondary">Nenhum motorista encontrado</p>
          <p className="text-sm text-text-muted mt-1">Ajuste os filtros para ampliar a busca</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(m => {
            const initials = m.nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
            const sent = sentIds.has(m.id)
            return (
              <div
                key={m.id}
                className="bg-surface border border-border rounded-xl p-4 hover:shadow-card-hover transition-shadow"
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-[#E0DAD0] border border-border flex items-center justify-center font-serif text-base font-semibold text-text-secondary flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary text-sm truncate">{m.nome}</p>
                    {m.nota_media !== null
                      ? renderStars(m.nota_media)
                      : <p className="text-[10px] text-text-muted">Sem avaliações</p>
                    }
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 mb-3">
                  {m.tipo_veiculo && (
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <Truck size={12} className="text-text-muted flex-shrink-0" />
                      <span>{m.tipo_veiculo}{m.ano_veiculo ? ` · ${m.ano_veiculo}` : ''}</span>
                    </div>
                  )}
                  {m.placa && (
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <span className="text-text-muted text-[10px] font-medium">PLACA</span>
                      <span className="font-mono">{m.placa}</span>
                    </div>
                  )}
                  {m.cnh && (
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <span className="text-text-muted text-[10px] font-medium">CNH</span>
                      <span>{m.cnh}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => setSelected(m)}
                    className="flex items-center gap-1.5 text-xs text-text-secondary border border-border px-3 py-1.5 rounded-pill hover:border-accent/40 transition-colors"
                  >
                    Ver perfil <ChevronRight size={11} />
                  </button>
                  <button
                    onClick={() => sendInteresse(m.id)}
                    disabled={sent || sendLoading === m.id}
                    className={`ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-pill border transition-colors disabled:opacity-60 ${
                      sent
                        ? 'bg-success-light border-success/20 text-success'
                        : 'bg-accent border-accent text-bg hover:opacity-90'
                    }`}
                  >
                    {sendLoading === m.id ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : sent ? (
                      <><CheckCircle2 size={11} /> Enviado</>
                    ) : (
                      <><Send size={11} /> Contatar</>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Driver Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div className="bg-bg w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#E0DAD0] border border-border flex items-center justify-center font-serif text-lg font-semibold text-text-secondary">
                  {selected.nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-text-primary">{selected.nome}</p>
                  <p className="text-xs text-text-muted">{selected.tipo_veiculo ?? 'Motorista'}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-surface rounded-lg text-text-muted">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Veículo</p>
                  <p className="text-sm font-medium text-text-primary">{selected.tipo_veiculo ?? '—'}</p>
                </div>
                <div className="bg-surface rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Ano</p>
                  <p className="text-sm font-medium text-text-primary">{selected.ano_veiculo ?? '—'}</p>
                </div>
                <div className="bg-surface rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Placa</p>
                  <p className="text-sm font-mono text-text-primary">{selected.placa ?? '—'}</p>
                </div>
                <div className="bg-surface rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">CNH</p>
                  <p className="text-sm font-medium text-text-primary">{selected.cnh ?? '—'}</p>
                </div>
              </div>

              {selected.nota_media !== null && (
                <div className="bg-surface rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-2">Avaliação</p>
                  <div className="flex items-center gap-3">
                    <p className="font-serif text-3xl font-semibold text-text-primary">{selected.nota_media}</p>
                    <div>
                      {renderStars(selected.nota_media)}
                      <p className="text-xs text-text-muted mt-0.5">{selected.total_avaliacoes} avaliação{selected.total_avaliacoes !== 1 ? 'ões' : ''}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 p-5 border-t border-border">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded-pill border border-border text-sm text-text-secondary hover:bg-surface transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => { sendInteresse(selected.id); setSelected(null) }}
                disabled={sentIds.has(selected.id) || sendLoading === selected.id}
                className="ml-auto flex items-center gap-2 px-4 py-2 rounded-pill bg-accent text-bg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                <Send size={14} />
                {sentIds.has(selected.id) ? 'Interesse enviado' : 'Enviar interesse'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
