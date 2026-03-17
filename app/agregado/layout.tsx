'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Calculator, Search, FileText, Star,
  TrendingUp, BookUser, LogOut, Bell, UserCircle, ShieldCheck,
  Truck, Package, ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

// ── Itens de navegação ─────────────────────────────────────────────────────
const primaryNav = [
  { href: '/agregado/dashboard',      label: 'Início',             Icon: LayoutDashboard },
  { href: '/agregado/marketplace',    label: 'Vagas',              Icon: Search           },
  { href: '/agregado/contratos',      label: 'Contratos',          Icon: FileText         },
  { href: '/agregado/custo-km',       label: 'Gestão de Custos',   Icon: Calculator       },
  { href: '/agregado/gestao-negocio', label: 'Gestão do Negócio',  Icon: TrendingUp       },
]

// Itens do drawer "Mais" (mobile) — organizados por grupo
const maisGrupo1 = [
  { href: '/agregado/perfil',      label: 'Meu Perfil',       sub: 'Dados, CNH, RNTRC',                Icon: UserCircle, bg: 'bg-[#E0DAD0]'                       },
  { href: '/agregado/cadastros',   label: 'Minha Frota',      sub: 'Placa, documentos, seguro',        Icon: Truck,      bg: 'bg-[#E0DAD0]'                       },
  { href: '/agregado/cadastros',   label: 'Equipamentos',     sub: 'Implementos e carretas',           Icon: Package,    bg: 'bg-[#E0DAD0]'                       },
  { href: '/agregado/minhas-candidaturas', label: 'Minhas Candidaturas', sub: 'Status das candidaturas', Icon: Search, bg: 'bg-warning-light'                    },
]
const maisGrupo2 = [
  { href: '/agregado/avaliacoes',  label: 'Avaliações',       sub: 'Sua reputação no marketplace',    Icon: Star,       bg: 'bg-gold-light'                      },
  { href: '/agregado/gestao-negocio', label: 'Gestão do Negócio', sub: 'Fluxo de caixa, DRE, por placa', Icon: TrendingUp, bg: 'bg-success-light'                },
  { href: '/agregado/documentos',  label: 'Documentos',       sub: 'Validade e uploads',              Icon: ShieldCheck, bg: 'bg-[#E0DAD0]'                      },
]

// Bottom nav mobile — 4 itens + "Mais"
const bottomNav = [
  { href: '/agregado/dashboard',   label: 'Início',     Icon: LayoutDashboard },
  { href: '/agregado/marketplace', label: 'Vagas',      Icon: Search           },
  { href: '/agregado/contratos',   label: 'Contratos',  Icon: FileText         },
  { href: '/agregado/custo-km',    label: 'Custos',     Icon: Calculator       },
]

// Desktop sidebar secondary
const sidebarSecondary = [
  { href: '/agregado/perfil',             label: 'Meu Perfil',           Icon: UserCircle },
  { href: '/agregado/cadastros',          label: 'Frota e Cadastros',    Icon: Truck      },
  { href: '/agregado/documentos',         label: 'Documentos',           Icon: ShieldCheck },
  { href: '/agregado/avaliacoes',         label: 'Avaliações',           Icon: Star       },
  { href: '/agregado/minhas-candidaturas',label: 'Candidaturas',         Icon: BookUser   },
]

export default function AgregadoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()

  const [pendentesCount, setPendentesCount] = useState(0)
  const [maisOpen, setMaisOpen]             = useState(false)
  const [userName, setUserName]             = useState('')
  const [userInitials, setUserInitials]     = useState('A')
  const [tipoAgregado, setTipoAgregado]     = useState<'TAC' | 'ETC'>('TAC')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const [{ count }, { data: prof }, { data: agr }] = await Promise.all([
        supabase.from('candidaturas').select('*', { count: 'exact', head: true }).eq('agregado_id', user.id).eq('status', 'em_formalizacao'),
        supabase.from('profiles').select('nome').eq('id', user.id).single(),
        supabase.from('agregados').select('tipo_agregado').eq('id', user.id).single(),
      ])
      setPendentesCount(count ?? 0)
      if (prof?.nome) {
        const nome = prof.nome as string
        setUserName(nome.split(' ')[0])
        setUserInitials(
          nome.split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
        )
      }
      const tipo = (agr as Record<string, string> | null)?.tipo_agregado
      if (tipo === 'ETC') setTipoAgregado('ETC')
    })
  }, [pathname])

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

      {/* ══════════════════════════════════════════════════════════
          DESKTOP SIDEBAR
      ══════════════════════════════════════════════════════════ */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-60 bg-bg border-r border-border z-40">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-border flex-shrink-0">
          <span className="font-serif font-medium text-text-primary text-[17px] tracking-[-0.01em]">
            Agregado <em className="italic text-text-secondary">Pro</em>
          </span>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 px-0 py-2 overflow-y-auto">
          {primaryNav.map(({ href, label, Icon }) => {
            const active = isActive(href)
            const isContratos = href === '/agregado/contratos'
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-5 py-[11px] text-[13px] font-sans transition-colors relative w-full ${
                  active ? 'bg-surface text-accent font-semibold' : 'text-text-primary hover:bg-surface'
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.6} />
                {label}
                {isContratos && pendentesCount > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] bg-[#C26B3A] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                    {pendentesCount}
                  </span>
                )}
              </Link>
            )
          })}

          <div className="my-2 mx-4 h-px bg-border" />

          {sidebarSecondary.map(({ href, label, Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-5 py-[11px] text-[13px] font-sans transition-colors ${
                  active ? 'bg-surface text-accent font-semibold' : 'text-text-primary hover:bg-surface'
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.6} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-0 py-2 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-5 py-[11px] text-[13px] font-sans text-text-secondary hover:bg-surface hover:text-danger transition-colors"
          >
            <LogOut size={18} strokeWidth={1.6} />
            Sair
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════
          MOBILE TOPBAR
      ══════════════════════════════════════════════════════════ */}
      <header className="md:hidden sticky top-0 z-40 h-14 bg-bg/95 backdrop-blur-[16px] border-b border-border flex items-center justify-between px-4 gap-3">
        {/* Logo */}
        <div className="font-serif text-[17px] font-medium tracking-[-0.01em] text-text-primary min-w-0">
          Agregado <em className="italic text-text-secondary">Pro</em>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Notification bell */}
          <button className="relative w-9 h-9 rounded-full border border-border bg-bg flex items-center justify-center text-text-secondary">
            <Bell size={15} strokeWidth={1.8} />
            {/* Unread dot — mostrar quando houver notifs não lidas */}
          </button>

          {/* User pill */}
          <button
            onClick={() => router.push('/agregado/perfil')}
            className="flex items-center gap-2 px-3 py-[5px] border border-border rounded-full bg-bg cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-[#2D2B26] text-[#F5F2EC] flex items-center justify-center font-serif text-[11px] font-medium flex-shrink-0">
              {userInitials}
            </div>
            <span className="text-[12px] font-medium text-text-primary font-sans">{userName || 'Perfil'}</span>
            <span className={`text-[9px] font-semibold tracking-[.1em] uppercase px-2 py-[3px] rounded-full flex-shrink-0 ${
              tipoAgregado === 'ETC'
                ? 'bg-[rgba(58,79,107,.1)] text-[#3A4F6B] border border-[rgba(58,79,107,.2)]'
                : 'bg-[rgba(194,107,58,.1)] text-[#C26B3A] border border-[rgba(194,107,58,.25)]'
            }`}>
              {tipoAgregado}
            </span>
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════ */}
      <main className="flex-1 md:ml-60 min-h-screen">
        <div className="max-w-3xl mx-auto px-0 pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════
          MOBILE BOTTOM NAV
      ══════════════════════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 pb-[env(safe-area-inset-bottom)] bg-bg/97 backdrop-blur-[16px] border-t border-border flex">
        {bottomNav.map(({ href, label, Icon }) => {
          const active = isActive(href)
          const isContratos = href === '/agregado/contratos'
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-[3px] text-[9px] font-medium tracking-[.06em] uppercase font-sans relative transition-colors ${
                active ? 'text-[#2D2B26]' : 'text-[#9C988E] hover:text-text-secondary'
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.2 : 1.5} />
                {isContratos && pendentesCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-[#C26B3A] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 border-[1.5px] border-bg">
                    {pendentesCount}
                  </span>
                )}
              </div>
              {label}
            </Link>
          )
        })}

        {/* Mais */}
        <button
          onClick={() => setMaisOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-[3px] text-[9px] font-medium tracking-[.06em] uppercase font-sans transition-colors ${
            maisOpen ? 'text-[#2D2B26]' : 'text-[#9C988E]'
          }`}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={maisOpen ? 2.2 : 1.5}>
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
          Mais
        </button>
      </nav>

      {/* ══════════════════════════════════════════════════════════
          MOBILE "MAIS" DRAWER
      ══════════════════════════════════════════════════════════ */}
      {maisOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-[rgba(26,25,21,.4)] backdrop-blur-[4px] flex items-end"
          onClick={() => setMaisOpen(false)}
        >
          <div
            className="bg-bg w-full rounded-t-[24px] pb-[env(safe-area-inset-bottom)] shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-9 h-1 rounded-full bg-border mx-auto mt-2 mb-3.5" />

            {/* Grupo 1 */}
            {maisGrupo1.map(({ href, label, sub, Icon, bg }) => (
              <Link
                key={`${href}-${label}`}
                href={href}
                onClick={() => setMaisOpen(false)}
                className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-surface transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} className="text-text-secondary" strokeWidth={1.6} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-text-primary font-sans">{label}</p>
                  <p className="text-[11px] text-text-muted font-sans mt-[1px]">{sub}</p>
                </div>
                <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
              </Link>
            ))}

            {/* Divider */}
            <div className="my-1.5 mx-0 h-px bg-border" />

            {/* Grupo 2 */}
            {maisGrupo2.map(({ href, label, sub, Icon, bg }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMaisOpen(false)}
                className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-surface transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} className="text-text-secondary" strokeWidth={1.6} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-text-primary font-sans">{label}</p>
                  <p className="text-[11px] text-text-muted font-sans mt-[1px]">{sub}</p>
                </div>
                <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
              </Link>
            ))}

            {/* Divider + Sair */}
            <div className="my-1.5 mx-0 h-px bg-border" />
            <button
              onClick={() => { setMaisOpen(false); handleLogout() }}
              className="flex items-center gap-3.5 px-5 py-3.5 w-full hover:bg-surface transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-danger-light flex items-center justify-center flex-shrink-0">
                <LogOut size={18} className="text-danger" strokeWidth={1.6} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[15px] font-medium text-danger font-sans">Sair da conta</p>
              </div>
            </button>

            <div className="h-4" />
          </div>
        </div>
      )}
    </div>
  )
}
