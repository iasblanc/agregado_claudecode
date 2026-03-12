'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Briefcase, LogOut, FileText, Users, Search,
  Plus, Star, User, MoreHorizontal, X, ChevronRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useState, useEffect } from 'react'

const mainNavItems = [
  { href: '/transportadora/dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
  { href: '/transportadora/contratos', icon: FileText, label: 'Contratos', badgeKey: 'contratos' },
  { href: '/transportadora/candidatos', icon: Users, label: 'Candidatos', badgeKey: 'candidatos', alert: true },
  { href: '/transportadora/buscar', icon: Search, label: 'Buscar Motoristas' },
]

const vagasNavItems = [
  { href: '/transportadora/vagas', icon: Briefcase, label: 'Minhas Vagas', badgeKey: 'vagas' },
  { href: '/transportadora/vagas/new', icon: Plus, label: 'Publicar Vaga' },
]

const reputacaoNavItems = [
  { href: '/transportadora/avaliacoes', icon: Star, label: 'Avaliações', badgeKey: 'avaliacoes', alert: true },
]

type NavItem = {
  href: string
  icon: React.ElementType
  label: string
  badgeKey?: string
  alert?: boolean
}

function NavLink({ href, icon: Icon, label, active, badge, alert: isAlert }: {
  href: string; icon: React.ElementType; label: string; active: boolean; badge?: number; alert?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-sans transition-colors ${
        active
          ? 'bg-accent text-bg font-medium'
          : 'text-text-secondary hover:bg-[#E0DAD0] hover:text-text-primary'
      }`}
    >
      <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none ${
          isAlert ? 'bg-warning/20 text-warning' : 'bg-accent/20 text-accent'
        } ${active ? 'bg-bg/20 text-bg' : ''}`}>
          {badge}
        </span>
      )}
    </Link>
  )
}

export default function TransportadoraLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)
  const [badges, setBadges] = useState<Record<string, number>>({})

  useEffect(() => {
    const supabase = createClient()
    async function loadBadges() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [vagasRes, candRes, contratosRes] = await Promise.all([
        supabase.from('vagas').select('id', { count: 'exact', head: true })
          .eq('transportadora_id', user.id).eq('status', 'ativa'),
        supabase.from('candidaturas').select('id', { count: 'exact', head: true })
          .eq('pipeline_status', 'novo')
          .in('vaga_id', await supabase.from('vagas').select('id').eq('transportadora_id', user.id).then(r => (r.data ?? []).map((v: { id: string }) => v.id))),
        supabase.from('candidaturas').select('id', { count: 'exact', head: true })
          .eq('status', 'aceito'),
      ])

      setBadges({
        vagas: vagasRes.count ?? 0,
        candidatos: candRes.count ?? 0,
        contratos: contratosRes.count ?? 0,
      })
    }
    loadBadges()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  function isActive(href: string) {
    if (href === '/transportadora/dashboard') return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  const allNavItems: NavItem[] = [...mainNavItems, ...vagasNavItems, ...reputacaoNavItems]
  const bottomNavItems = [
    mainNavItems[0], // Visão Geral
    mainNavItems[1], // Contratos
    mainNavItems[2], // Candidatos
    mainNavItems[3], // Buscar
    { href: '#mais', icon: MoreHorizontal, label: 'Mais' },
  ]

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-56 bg-surface border-r border-border z-40">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border flex-shrink-0">
          <img src="/logo.svg" alt="Agregado.Pro" className="h-7 w-auto" />
          <div>
            <span className="font-serif font-semibold text-text-primary text-sm leading-none block">Agregado.Pro</span>
            <span className="text-[10px] text-text-muted font-sans">Transportadora</span>
          </div>
        </div>

        {/* Nav — Principal */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
          <div>
            <p className="text-[10px] font-sans uppercase tracking-widest text-text-muted px-2 mb-2">Principal</p>
            <ul className="space-y-0.5">
              {mainNavItems.map(item => (
                <li key={item.href}>
                  <NavLink {...item} active={isActive(item.href)} badge={item.badgeKey ? badges[item.badgeKey] : undefined} alert={item.alert} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-sans uppercase tracking-widest text-text-muted px-2 mb-2">Vagas</p>
            <ul className="space-y-0.5">
              {vagasNavItems.map(item => (
                <li key={item.href}>
                  <NavLink {...item} active={isActive(item.href)} badge={item.badgeKey ? badges[item.badgeKey] : undefined} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-sans uppercase tracking-widest text-text-muted px-2 mb-2">Reputação</p>
            <ul className="space-y-0.5">
              {reputacaoNavItems.map(item => (
                <li key={item.href}>
                  <NavLink {...item} active={isActive(item.href)} badge={item.badgeKey ? badges[item.badgeKey] : undefined} alert={item.alert} />
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Footer — Conta + Logout */}
        <div className="px-3 py-4 border-t border-border space-y-0.5">
          <NavLink href="/transportadora/conta" icon={User} label="Minha Conta" active={isActive('/transportadora/conta')} />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-sans text-text-secondary hover:bg-[#E0DAD0] hover:text-danger transition-colors"
          >
            <LogOut size={16} strokeWidth={1.8} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 bg-bg/90 backdrop-blur border-b border-border">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Agregado.Pro" className="h-7 w-auto" />
            <div>
              <span className="font-serif font-semibold text-text-primary text-sm leading-none block">Agregado.Pro</span>
              <span className="text-[10px] text-text-muted font-sans">Transportadora</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleLogout}
              className="p-2 rounded-md hover:bg-surface text-text-muted transition-colors"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 md:ml-56 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg/95 backdrop-blur border-t border-border">
        <div className="px-2 h-16 flex items-center justify-around">
          {bottomNavItems.map(({ href, icon: Icon, label }) => {
            if (href === '#mais') {
              return (
                <button
                  key="mais"
                  onClick={() => setMoreOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg text-text-muted hover:text-text-secondary transition-colors"
                >
                  <Icon size={20} strokeWidth={1.5} />
                  <span className="text-[10px] font-sans font-normal">{label}</span>
                </button>
              )
            }
            const active = isActive(href)
            const item = allNavItems.find(i => i.href === href)
            const badge = item?.badgeKey ? badges[item.badgeKey] : undefined
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors relative ${
                  active ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                <span className={`text-[10px] font-sans ${active ? 'font-semibold' : 'font-normal'}`}>{label}</span>
                {badge !== undefined && badge > 0 && (
                  <span className="absolute top-1 right-2 w-4 h-4 bg-warning rounded-full text-[9px] text-white flex items-center justify-center font-medium">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Mobile "Mais" Drawer */}
      {moreOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-2xl border-t border-border pb-safe animate-slide-up">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 border-b border-border">
              <span className="font-sans font-medium text-text-primary text-sm">Mais opções</span>
              <button onClick={() => setMoreOpen(false)} className="p-1 rounded text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            <ul className="px-4 py-3 space-y-1">
              {[...vagasNavItems, ...reputacaoNavItems, { href: '/transportadora/conta', icon: User, label: 'Minha Conta' }].map(item => {
                const active = isActive(item.href)
                const badge = 'badgeKey' in item && item.badgeKey ? badges[item.badgeKey as string] : undefined
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-sans transition-colors ${
                        active ? 'bg-accent text-bg font-medium' : 'text-text-primary hover:bg-[#E0DAD0]'
                      }`}
                    >
                      <item.icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                      <span className="flex-1">{item.label}</span>
                      {badge !== undefined && badge > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none bg-warning/20 text-warning">
                          {badge}
                        </span>
                      )}
                      <ChevronRight size={14} className="text-text-muted" />
                    </Link>
                  </li>
                )
              })}
            </ul>
            <div className="h-6" />
          </div>
        </>
      )}
    </div>
  )
}
