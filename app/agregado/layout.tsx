'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Calculator, Search, FileText, Star,
  TrendingUp, BookUser, LogOut, Bell, MoreHorizontal, X, UserCircle, ShieldCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

// Sidebar principal (desktop + mobile drawer)
const primaryNav = [
  { href: '/agregado/dashboard',    icon: LayoutDashboard, label: 'Início' },
  { href: '/agregado/marketplace',  icon: Search,          label: 'Vagas' },
  { href: '/agregado/contratos',    icon: FileText,        label: 'Contratos' },
  { href: '/agregado/custo-km',     icon: Calculator,      label: 'Gestão de Custos' },
  { href: '/agregado/gestao-negocio', icon: TrendingUp,    label: 'Gestão do Negócio' },
]

const secondaryNav = [
  { href: '/agregado/cadastros',    icon: BookUser,        label: 'Frota e Cadastros' },
  { href: '/agregado/documentos',   icon: ShieldCheck,     label: 'Documentos' },
  { href: '/agregado/avaliacoes',   icon: Star,            label: 'Avaliações' },
  { href: '/agregado/minhas-candidaturas', icon: Search,   label: 'Minhas Candidaturas' },
  { href: '/agregado/perfil',       icon: UserCircle,      label: 'Meu Perfil' },
]

// Bottom nav mobile: 4 principais + "Mais" drawer
const mobileMainNav = primaryNav.slice(0, 4)

export default function AgregadoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [pendentesCount, setPendentesCount] = useState(0)
  const [maisOpen, setMaisOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { count } = await supabase
        .from('candidaturas')
        .select('*', { count: 'exact', head: true })
        .eq('agregado_id', user.id)
        .eq('status', 'em_formalizacao')
      setPendentesCount(count ?? 0)
    })
  }, [pathname])

  // Close mobile drawer on route change
  useEffect(() => { setMaisOpen(false) }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  function isActive(href: string) {
    if (href === '/agregado/dashboard') return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row">
      {/* ── Desktop Sidebar ──────────────────────────────────── */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-60 bg-surface border-r border-border z-40">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border flex-shrink-0">
          <img src="/logo.svg" alt="Agregado.Pro" className="h-7 w-auto" />
          <div>
            <span className="font-serif font-semibold text-text-primary text-sm leading-none block">Agregado.Pro</span>
            <span className="text-[10px] text-text-muted font-sans">Agregado</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-[10px] font-sans uppercase tracking-widest text-text-muted px-2 mb-2">Menu</p>
          <ul className="space-y-1">
            {primaryNav.map(({ href, icon: Icon, label }) => {
              const active = isActive(href)
              const isContratos = href === '/agregado/contratos'
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-sans transition-colors relative ${
                      active
                        ? 'bg-accent text-bg font-medium'
                        : 'text-text-secondary hover:bg-[#E0DAD0] hover:text-text-primary'
                    }`}
                  >
                    <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                    {label}
                    {isContratos && pendentesCount > 0 && (
                      <span className="ml-auto min-w-[18px] h-[18px] bg-warning text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                        {pendentesCount}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          <p className="text-[10px] font-sans uppercase tracking-widest text-text-muted px-2 mb-2 mt-5">Minha área</p>
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

        {/* Notificações + Logout */}
        <div className="px-3 py-4 border-t border-border space-y-1">
          <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-sans text-text-secondary hover:bg-[#E0DAD0] transition-colors">
            <Bell size={16} strokeWidth={1.8} />
            Notificações
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-sans text-text-secondary hover:bg-[#E0DAD0] hover:text-danger transition-colors"
          >
            <LogOut size={16} strokeWidth={1.8} />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ────────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-40 bg-bg/95 backdrop-blur border-b border-border">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Agregado.Pro" className="h-7 w-auto" />
            <span className="font-serif font-medium text-text-primary">
              Agregado<em className="italic text-text-secondary">.Pro</em>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button className="relative p-2 rounded-full border border-border bg-bg hover:bg-surface text-text-muted transition-colors">
              <Bell size={16} />
            </button>
            <button onClick={handleLogout} className="p-2 rounded-md hover:bg-surface text-text-muted transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="flex-1 md:ml-60 min-h-screen">
        <div className="max-w-3xl mx-auto px-0 pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Navigation ─────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg/97 backdrop-blur border-t border-border">
        <div className="px-1 h-16 flex items-center justify-around">
          {mobileMainNav.map(({ href, icon: Icon, label }) => {
            const active = isActive(href)
            const isContratos = href === '/agregado/contratos'
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors relative ${
                  active ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <div className="relative">
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                  {isContratos && pendentesCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-warning text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 border-[1.5px] border-bg">
                      {pendentesCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-sans ${active ? 'font-semibold' : 'font-normal'}`}>{label}</span>
              </Link>
            )
          })}
          {/* Mais button */}
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

      {/* ── "Mais" Drawer (mobile) ───────────────────────────── */}
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
              {/* 5th primary nav item + secondary nav */}
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
