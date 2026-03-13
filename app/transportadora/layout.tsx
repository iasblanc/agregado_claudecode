'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Briefcase, Users, FileText, Star,
  Search, UserCircle, LogOut, MoreHorizontal, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useState } from 'react'

const primaryNav = [
  { href: '/transportadora/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transportadora/vagas',      icon: Briefcase,       label: 'Vagas' },
  { href: '/transportadora/candidatos', icon: Users,           label: 'Candidatos' },
  { href: '/transportadora/contratos',  icon: FileText,        label: 'Contratos' },
  { href: '/transportadora/avaliacoes', icon: Star,            label: 'Avaliações' },
]

const secondaryNav = [
  { href: '/transportadora/buscar-motoristas', icon: Search,     label: 'Buscar Motoristas' },
  { href: '/transportadora/conta',             icon: UserCircle, label: 'Minha Conta' },
]

// Mobile bottom nav: first 4 items + "Mais" drawer
const mobileMainNav = primaryNav.slice(0, 4)

export default function TransportadoraLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [maisOpen, setMaisOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  function isActive(href: string) {
    if (href === '/transportadora/dashboard') return pathname === href
    return pathname.startsWith(href)
  }

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

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-[10px] font-sans uppercase tracking-widest text-text-muted px-2 mb-2">Menu</p>
          <ul className="space-y-1">
            {primaryNav.map(({ href, icon: Icon, label }) => {
              const active = isActive(href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-sans transition-colors ${
                      active
                        ? 'bg-accent text-bg font-medium'
                        : 'text-text-secondary hover:bg-[#E0DAD0] hover:text-text-primary'
                    }`}
                  >
                    <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>

          <p className="text-[10px] font-sans uppercase tracking-widest text-text-muted px-2 mb-2 mt-5">Ferramentas</p>
          <ul className="space-y-1">
            {secondaryNav.map(({ href, icon: Icon, label }) => {
              const active = isActive(href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-sans transition-colors ${
                      active
                        ? 'bg-accent text-bg font-medium'
                        : 'text-text-secondary hover:bg-[#E0DAD0] hover:text-text-primary'
                    }`}
                  >
                    <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-border">
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
          <button
            onClick={handleLogout}
            className="p-2 rounded-md hover:bg-surface text-text-muted transition-colors"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
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
        <div className="px-1 h-16 flex items-center justify-around">
          {mobileMainNav.map(({ href, icon: Icon, label }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${
                  active ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                <span className={`text-[10px] font-sans ${active ? 'font-semibold' : 'font-normal'}`}>{label}</span>
              </Link>
            )
          })}
          {/* "Mais" button */}
          <button
            onClick={() => setMaisOpen(true)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${
              maisOpen ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <MoreHorizontal size={20} strokeWidth={1.5} />
            <span className="text-[10px] font-sans font-normal">Mais</span>
          </button>
        </div>
      </nav>

      {/* "Mais" Drawer (mobile) */}
      {maisOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end"
          onClick={() => setMaisOpen(false)}
        >
          <div
            className="bg-bg w-full rounded-t-2xl p-5 pb-8 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-serif text-base font-semibold text-text-primary">Mais opções</p>
              <button onClick={() => setMaisOpen(false)} className="p-1.5 rounded-lg hover:bg-surface text-text-muted">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-1">
              {/* Also show Avaliações (5th primary nav) and secondary nav items */}
              {[primaryNav[4], ...secondaryNav].map(({ href, icon: Icon, label }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMaisOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-sans transition-colors ${
                      active
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-text-secondary hover:bg-surface'
                    }`}
                  >
                    <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                    {label}
                  </Link>
                )
              })}
              <button
                onClick={() => { setMaisOpen(false); handleLogout() }}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-sans text-danger hover:bg-danger-light transition-colors"
              >
                <LogOut size={18} strokeWidth={1.8} />
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
