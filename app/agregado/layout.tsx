'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Calculator, Search, FileText,
  TrendingUp, User, Truck, Settings2, Users,
  Star, BookText, LogOut, Bell, ChevronRight, Menu, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

// ── Estrutura de nav ──────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  sub?: string
  emoji: string
  etcOnly?: boolean
  badge?: number
}

const primaryItems: NavItem[] = [
  { href: '/agregado/dashboard',      emoji: '🏠', label: 'Início' },
  { href: '/agregado/marketplace',    emoji: '🔍', label: 'Vagas' },
  { href: '/agregado/contratos',      emoji: '📋', label: 'Contratos' },
  { href: '/agregado/custo-km',       emoji: '📊', label: 'Gestão de Custos' },
  { href: '/agregado/gestao-negocio', emoji: '📊', label: 'Gestão do Negócio' },
]

const secondaryItems: NavItem[] = [
  { href: '/agregado/perfil',                      emoji: '👤', label: 'Meu Perfil',     sub: 'Dados, CNH, RNTRC' },
  { href: '/agregado/cadastros',                   emoji: '🚛', label: 'Meu Caminhão',   sub: 'Placa, documentos, seguro' },
  { href: '/agregado/cadastros?tab=equip',         emoji: '⚙️', label: 'Equipamentos',   sub: 'Implementos e carretas' },
  { href: '/agregado/cadastros?tab=motoristas',    emoji: '🧑‍✈️', label: 'Motoristas',   sub: 'Equipe da empresa', etcOnly: true },
]

const tertiaryItems: NavItem[] = [
  { href: '/agregado/avaliacoes',  emoji: '⭐', label: 'Avaliações',  sub: 'Sua reputação' },
  { href: '/agregado/documentos',  emoji: '📄', label: 'Documentos', sub: 'Validade e uploads' },
]

// Drawer mobile = secundários + terciários
const moreItems = [...secondaryItems, ...tertiaryItems]

// Bottom nav (5 items mobile)
const bottomNavItems = [
  { href: '/agregado/dashboard',   Icon: LayoutDashboard, label: 'Início' },
  { href: '/agregado/marketplace', Icon: Search,          label: 'Vagas' },
  { href: '/agregado/contratos',   Icon: FileText,        label: 'Contratos' },
  { href: '/agregado/custo-km',    Icon: Calculator,      label: 'Custos' },
]

// ── Sidebar item component ────────────────────────────────────────────────────

function SbItem({ item, active, badge, onClick }: {
  item: NavItem
  active: boolean
  badge?: number
  onClick?: () => void
}) {
  const content = (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group
      ${active ? 'bg-accent text-bg' : 'text-text-secondary hover:bg-surface hover:text-text-primary'}`}
    >
      <span className="text-base w-6 text-center flex-shrink-0">{item.emoji}</span>
      <span className={`text-[13px] font-sans font-medium flex-1 ${active ? '' : ''}`}>{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="min-w-[18px] h-4.5 bg-warning text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 flex items-center justify-center">
          {badge}
        </span>
      )}
    </div>
  )

  if (onClick) {
    return <button onClick={onClick} className="w-full text-left">{content}</button>
  }

  return <Link href={item.href}>{content}</Link>
}

// ── More Drawer (mobile) ──────────────────────────────────────────────────────

function MoreDrawer({ open, onClose, pendentesCount }: {
  open: boolean
  onClose: () => void
  pendentesCount: number
}) {
  const router = useRouter()

  function go(href: string) {
    router.push(href)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-bg rounded-t-2xl shadow-modal pb-8 animate-in slide-in-from-bottom duration-200">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-9 h-1 bg-border rounded-full" />
        </div>

        <div className="px-4 pb-2">
          {/* Itens secundários */}
          {secondaryItems.map(item => (
            <button
              key={item.href}
              onClick={() => go(item.href)}
              className="w-full flex items-center gap-3 py-3 border-b border-border last:border-0"
            >
              <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-lg flex-shrink-0">
                {item.emoji}
              </div>
              <div className="flex-1 text-left">
                <p className="text-[13px] font-medium text-text-primary font-sans">{item.label}</p>
                {item.sub && <p className="text-[11px] text-text-muted">{item.sub}</p>}
              </div>
              <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
            </button>
          ))}

          {/* Divider */}
          <div className="h-2.5" />
          <div className="h-px bg-border mb-2.5" />

          {/* Itens terciários */}
          {tertiaryItems.map(item => (
            <button
              key={item.href}
              onClick={() => go(item.href)}
              className="w-full flex items-center gap-3 py-3 border-b border-border last:border-0"
            >
              <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-lg flex-shrink-0">
                {item.emoji}
              </div>
              <div className="flex-1 text-left">
                <p className="text-[13px] font-medium text-text-primary font-sans">{item.label}</p>
                {item.sub && <p className="text-[11px] text-text-muted">{item.sub}</p>}
              </div>
              <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
            </button>
          ))}

          {/* Gestão do Negócio também no drawer */}
          <button
            onClick={() => go('/agregado/gestao-negocio')}
            className="w-full flex items-center gap-3 py-3 border-t border-border mt-1"
          >
            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-lg flex-shrink-0">
              📊
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-medium text-text-primary font-sans">Gestão do Negócio</p>
              <p className="text-[11px] text-text-muted">Fluxo de caixa, DRE, por placa</p>
            </div>
            <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Layout principal ───────────────────────────────────────────────────────────

export default function AgregadoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [pendentesCount, setPendentesCount] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)

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

  // Fechar drawer ao navegar
  useEffect(() => { setMoreOpen(false) }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  function isActive(href: string) {
    if (href === '/agregado/dashboard') return pathname === href
    return pathname.startsWith(href.split('?')[0])
  }

  return (
    <div className="bg-bg min-h-screen">

      {/* ── Topbar (full width, sticky) ── */}
      <header className="sticky top-0 z-40 h-14 bg-bg/95 backdrop-blur border-b border-border flex items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Agregado.Pro" className="h-7 w-auto" />
          <span className="font-serif font-medium text-text-primary">
            Agregado<em className="italic text-text-secondary">.Pro</em>
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Notificação bell */}
          <button className="relative p-2 rounded-full border border-border bg-bg hover:bg-surface text-text-muted transition-colors">
            <Bell size={16} />
          </button>

          {/* Logout (desktop only) */}
          <button
            onClick={handleLogout}
            className="hidden md:flex p-2 rounded-md hover:bg-surface text-text-muted transition-colors"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── Body: sidebar + content ── */}
      <div className="md:flex">

        {/* ── Sidebar (desktop only, sticky below header) ── */}
        <aside className="hidden md:flex flex-col w-60 flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] border-r border-border bg-bg overflow-y-auto">
          <div className="flex-1 py-3 px-2 space-y-0.5">

            {/* Primários */}
            {primaryItems.map(item => (
              <SbItem
                key={item.href}
                item={item}
                active={isActive(item.href)}
                badge={item.href === '/agregado/contratos' ? pendentesCount : undefined}
              />
            ))}

            {/* Divider */}
            <div className="h-2" />
            <div className="h-px bg-border mx-2 my-1" />
            <div className="h-1" />

            {/* Secundários */}
            {secondaryItems.map(item => (
              <SbItem
                key={item.href}
                item={item}
                active={isActive(item.href)}
              />
            ))}

            {/* Divider */}
            <div className="h-2" />
            <div className="h-px bg-border mx-2 my-1" />
            <div className="h-1" />

            {/* Terciários */}
            {tertiaryItems.map(item => (
              <SbItem
                key={item.href}
                item={item}
                active={isActive(item.href)}
              />
            ))}
          </div>

          {/* Rodapé sidebar: logout */}
          <div className="border-t border-border p-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:bg-surface hover:text-danger transition-colors"
            >
              <LogOut size={16} className="flex-shrink-0" />
              <span className="text-[13px] font-sans font-medium">Sair da conta</span>
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* ── Bottom navigation (mobile only) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-bg/97 backdrop-blur border-t border-border">
        <div className="h-full flex items-center justify-around px-1">
          {/* 4 itens primários */}
          {bottomNavItems.map(({ href, Icon, label }) => {
            const active = isActive(href)
            const isContratos = href === '/agregado/contratos'
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors relative
                  ${active ? 'text-accent' : 'text-text-muted hover:text-text-secondary'}`}
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

          {/* Botão Mais → drawer */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors
              ${moreOpen ? 'text-accent' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <Menu size={20} strokeWidth={1.5} />
            <span className="text-[10px] font-sans font-normal">Mais</span>
          </button>
        </div>
      </nav>

      {/* ── More drawer (mobile) ── */}
      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} pendentesCount={pendentesCount} />
    </div>
  )
}
