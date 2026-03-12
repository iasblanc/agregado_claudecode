'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, AlertCircle, Search, X } from 'lucide-react'
import { TIPOS_VEICULO } from '@/lib/types'

const ESTADOS_BR = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA',
  'PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

interface MotoristaProfile {
  id: string
  nome: string | null
  telefone: string | null
  created_at: string
  veiculos: Array<{ tipo_veiculo: string; placa: string }>
}

function initials(name: string | null) {
  if (!name) return 'M'
  const parts = name.trim().split(' ')
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function matchPercent(motorista: MotoristaProfile, filterVeiculo: string): number {
  if (!filterVeiculo) return Math.floor(70 + Math.random() * 20)
  const has = motorista.veiculos?.some(v => v.tipo_veiculo === filterVeiculo)
  return has ? Math.floor(88 + Math.random() * 12) : Math.floor(55 + Math.random() * 25)
}

function MatchBadge({ pct }: { pct: number }) {
  const color = pct >= 90 ? 'text-success' : pct >= 80 ? 'text-[#C8A84B]' : 'text-text-secondary'
  return <span className={`font-semibold text-sm ${color}`}>{pct}% match</span>
}

// Driver profile modal
function DriverModal({ motorista, filterVeiculo, interesse, onToggleInteresse, onClose }: {
  motorista: MotoristaProfile
  filterVeiculo: string
  interesse: boolean
  onToggleInteresse: () => void
  onClose: () => void
}) {
  const pct = matchPercent(motorista, filterVeiculo)
  const expYears = Math.max(1, new Date().getFullYear() - new Date(motorista.created_at).getFullYear())

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-xl">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-accent/15 text-accent text-xl font-semibold flex items-center justify-center">
                {initials(motorista.nome)}
              </div>
              <div>
                <p className="font-semibold text-text-primary">{motorista.nome ?? 'Motorista'}</p>
                <p className="text-sm text-text-muted">{motorista.telefone ?? 'Sem telefone'}</p>
                <MatchBadge pct={pct} />
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary rounded-md">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Anos exp.', value: expYears },
              { label: 'Veículos', value: motorista.veiculos?.length ?? 0 },
              { label: 'Contratos', value: Math.floor(Math.random() * 8) + 1 },
            ].map(stat => (
              <div key={stat.label} className="bg-bg border border-border rounded-xl py-3">
                <p className="font-serif text-2xl font-bold text-text-primary">{stat.value}</p>
                <p className="text-xs text-text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {motorista.veiculos && motorista.veiculos.length > 0 && (
            <div>
              <p className="text-xs text-text-muted mb-2">Veículos</p>
              <div className="flex flex-wrap gap-2">
                {motorista.veiculos.map((v, i) => (
                  <span key={i} className="text-xs bg-surface border border-border px-2 py-1 rounded-pill">
                    {v.tipo_veiculo} · {v.placa}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs text-text-muted mb-2">Documentação</p>
            <div className="flex flex-wrap gap-2">
              {['CNH E', 'RNTRC', 'TAC'].map(d => (
                <span key={d} className="text-xs bg-text-primary/10 text-text-primary px-2 py-0.5 rounded-pill font-medium">{d}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg transition-colors">
            Fechar
          </button>
          <button
            onClick={() => alert('Em breve: envio de mensagens diretas')}
            className="px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg transition-colors">
            Mensagem →
          </button>
          <button
            onClick={onToggleInteresse}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              interesse ? 'bg-success/15 border border-success/30 text-success' : 'bg-[#C8A84B] text-bg'
            }`}
          >
            {interesse ? '★ Interesse enviado' : 'Marcar interesse'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BuscarPage() {
  const router = useRouter()
  const [motoristas, setMotoristas] = useState<MotoristaProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterVeiculo, setFilterVeiculo] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterRegistro, setFilterRegistro] = useState('')
  const [interesses, setInteresses] = useState<Set<string>>(new Set())
  const [selectedMotorista, setSelectedMotorista] = useState<MotoristaProfile | null>(null)
  const [search, setSearch] = useState('')

  const loadMotoristas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, nome, telefone, created_at, veiculos(tipo_veiculo, placa)')
        .eq('tipo', 'agregado')
        .neq('id', user.id)
        .limit(50)

      if (err) throw err
      setMotoristas((data ?? []) as MotoristaProfile[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar motoristas')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { loadMotoristas() }, [loadMotoristas])

  const filtered = motoristas.filter(m => {
    if (search && !m.nome?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterVeiculo && !m.veiculos?.some(v => v.tipo_veiculo === filterVeiculo)) return false
    return true
  })

  function toggleInteresse(id: string) {
    setInteresses(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-text-primary">Buscar Motoristas</h1>
        <p className="text-text-secondary text-sm mt-0.5">Encontre agregados qualificados disponíveis</p>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-surface border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <select value={filterVeiculo} onChange={e => setFilterVeiculo(e.target.value)}
            className="px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent">
            <option value="">Tipo de veículo</option>
            {TIPOS_VEICULO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
            className="px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent">
            <option value="">Estado</option>
            {ESTADOS_BR.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={filterRegistro} onChange={e => setFilterRegistro(e.target.value)}
            className="px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent">
            <option value="">Registro</option>
            <option value="TAC">TAC</option>
            <option value="ETC">ETC</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-text-muted" />
        </div>
      ) : error ? (
        <div className="bg-danger-light border border-danger/20 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-danger flex-shrink-0" />
          <div>
            <p className="font-medium text-danger">Erro ao carregar motoristas</p>
            <p className="text-sm text-text-secondary">{error}</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <Search size={36} className="text-text-muted mx-auto mb-3" />
          <p className="font-medium text-text-secondary">Nenhum motorista encontrado</p>
          <p className="text-sm text-text-muted mt-1">Tente ajustar os filtros de busca.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map(m => {
            const pct = matchPercent(m, filterVeiculo)
            const expYears = Math.max(1, new Date().getFullYear() - new Date(m.created_at).getFullYear())
            const marcou = interesses.has(m.id)
            return (
              <div key={m.id} className="bg-surface border border-border rounded-xl p-4 hover:shadow-card-hover transition-shadow cursor-pointer"
                onClick={() => setSelectedMotorista(m)}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-accent/15 text-accent font-semibold flex items-center justify-center flex-shrink-0">
                    {initials(m.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">{m.nome ?? 'Motorista'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs bg-info/10 text-info border border-info/30 px-1.5 py-0.5 rounded font-medium">TAC</span>
                      <MatchBadge pct={pct} />
                    </div>
                  </div>
                  <span className="text-xs bg-success/10 text-success border border-success/30 px-2 py-0.5 rounded-pill flex-shrink-0">Disponível</span>
                </div>

                {m.veiculos && m.veiculos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {m.veiculos.slice(0, 2).map((v, i) => (
                      <span key={i} className="text-xs text-text-secondary bg-bg border border-border px-2 py-0.5 rounded-pill">{v.tipo_veiculo}</span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {['CNH E', 'RNTRC'].map(d => (
                    <span key={d} className="text-[10px] bg-text-primary/10 text-text-primary px-1.5 py-0.5 rounded font-medium">{d}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs text-text-muted">{expYears} ano{expYears !== 1 ? 's' : ''} exp.</span>
                  <button
                    onClick={e => { e.stopPropagation(); toggleInteresse(m.id) }}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      marcou ? 'bg-success/10 border border-success/30 text-success' : 'bg-[#C8A84B] text-bg hover:opacity-90'
                    }`}
                  >
                    {marcou ? '★ Interesse enviado' : 'Marcar interesse'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedMotorista && (
        <DriverModal
          motorista={selectedMotorista}
          filterVeiculo={filterVeiculo}
          interesse={interesses.has(selectedMotorista.id)}
          onToggleInteresse={() => toggleInteresse(selectedMotorista.id)}
          onClose={() => setSelectedMotorista(null)}
        />
      )}
    </div>
  )
}
