'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Badge from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Users, Search, Truck, Building2, Loader2, AlertCircle, UserX } from 'lucide-react'

interface ProfileRow {
  id: string
  nome: string | null
  tipo: 'agregado' | 'transportadora'
  is_admin: boolean
  created_at: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function AdminUsuariosPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'agregado' | 'transportadora'>('all')

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      let query = supabase
        .from('profiles')
        .select('id, nome, tipo, is_admin, created_at')
        .order('created_at', { ascending: false })

      if (typeFilter !== 'all') {
        query = query.eq('tipo', typeFilter)
      }

      const { data, error: err } = await query

      if (err) throw err
      setProfiles(data ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [router, typeFilter])

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  const filtered = profiles.filter(p => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (p.nome?.toLowerCase().includes(q)) ||
      p.id.toLowerCase().includes(q)
    )
  })

  const totalAgregados = profiles.filter(p => p.tipo === 'agregado').length
  const totalTransportadoras = profiles.filter(p => p.tipo === 'transportadora').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold text-text-primary">Usuários</h1>
        <p className="text-text-secondary text-sm mt-0.5">
          {profiles.length} usuários cadastrados ·{' '}
          {totalAgregados} agregados ·{' '}
          {totalTransportadoras} transportadoras
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome ou ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 h-fit">
          {(['all', 'agregado', 'transportadora'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium font-sans transition-all whitespace-nowrap ${
                typeFilter === t
                  ? 'bg-accent text-bg shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-[#E0DAD0]'
              }`}
            >
              {t === 'all' ? 'Todos' : t === 'agregado' ? 'Agregados' : 'Transportadoras'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-text-muted" />
        </div>
      ) : error ? (
        <div className="bg-danger-light border border-danger/20 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-danger">Erro ao carregar usuários</p>
            <p className="text-sm text-text-secondary mt-0.5">{error}</p>
            <button onClick={fetchProfiles} className="text-sm text-danger underline mt-2">Tentar novamente</button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          {search ? (
            <>
              <Search size={32} className="text-text-muted mx-auto mb-3" />
              <p className="font-medium text-text-secondary">Nenhum usuário encontrado</p>
              <p className="text-sm text-text-muted mt-1">Tente buscar por outro nome ou ID.</p>
            </>
          ) : (
            <>
              <UserX size={32} className="text-text-muted mx-auto mb-3" />
              <p className="font-medium text-text-secondary">Nenhum usuário cadastrado</p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-surface border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-[#E8E4DC]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Tipo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">User ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Data cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-[#E8E4DC]/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                            p.tipo === 'transportadora' ? 'bg-info-light' : 'bg-success-light'
                          }`}>
                            {p.tipo === 'transportadora'
                              ? <Building2 size={13} className="text-info" />
                              : <Truck size={13} className="text-success" />
                            }
                          </div>
                          <div>
                            <span className="font-medium text-text-primary">
                              {p.nome || <span className="text-text-muted italic text-xs">Sem nome</span>}
                            </span>
                            {p.is_admin && (
                              <Badge variant="danger" className="ml-2 text-[10px]">Admin</Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={p.tipo === 'transportadora' ? 'info' : 'success'}>
                          {p.tipo === 'transportadora' ? 'Transportadora' : 'Agregado'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-text-muted font-mono text-xs">
                        {p.id.substring(0, 8)}…{p.id.substring(p.id.length - 4)}
                      </td>
                      <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                        {formatDate(p.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-border bg-[#E8E4DC]/30">
              <p className="text-xs text-text-muted">
                Exibindo {filtered.length} de {profiles.length} usuários
              </p>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden flex flex-col gap-2">
            {filtered.map((p) => (
              <div key={p.id} className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      p.tipo === 'transportadora' ? 'bg-info-light' : 'bg-success-light'
                    }`}>
                      {p.tipo === 'transportadora'
                        ? <Building2 size={14} className="text-info" />
                        : <Truck size={14} className="text-success" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary text-sm truncate">
                        {p.nome || <span className="text-text-muted italic">Sem nome</span>}
                      </p>
                      <p className="text-xs text-text-muted font-mono">
                        {p.id.substring(0, 8)}…
                      </p>
                    </div>
                  </div>
                  <Badge variant={p.tipo === 'transportadora' ? 'info' : 'success'}>
                    {p.tipo === 'transportadora' ? 'Transp.' : 'Agregado'}
                  </Badge>
                </div>
                <p className="text-xs text-text-muted">Cadastro: {formatDate(p.created_at)}</p>
              </div>
            ))}
            <p className="text-xs text-text-muted text-center py-2">
              {filtered.length} de {profiles.length} usuários
            </p>
          </div>
        </>
      )}
    </div>
  )
}
