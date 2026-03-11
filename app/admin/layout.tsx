'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Users, Briefcase, ClipboardList,
  LogOut, Truck, Shield, Loader2, Menu, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/usuarios', icon: Users, label: 'Usuários' },
  { href: '/admin/vagas', icon: Briefcase, label: 'Vagas' },
  { href: '/admin/candidaturas', icon: ClipboardList, label: 'Candidaturas' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        router.replace('/')
        return
      }
      setAuthorized(true)
      setChecking(false)
    }
    checkAdmin()
  }, [router])

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-text-muted" />
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-[#1A1915]/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-60 bg-surface border-r border-border flex flex-col
        transition-transform duration-200 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border flex-shrink-0">
          <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center">
            <Truck size={14} className="text-bg" />
          </div>
          <div>
            <span className="font-serif font-semibold text-text-primary text-sm leading-none block">Agregado.Pro</span>
            <div className="flex items-center gap-1 mt-0.5">
              <Shield size={9} className="text-danger" />
              <span className="text-[10px] text-danger font-sans font-medium">Admin</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-[10px] font-sans uppercase tracking-widest text-text-muted px-2 mb-2">Navegação</p>
          <ul className="space-y-1">
            {navItems.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href))
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
      <header className="md:hidden fixed top-0 left-0 right-0 z-20 bg-bg/95 backdrop-blur border-b border-border h-14 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-md hover:bg-surface text-text-muted transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-6 h-6 bg-accent rounded-md flex items-center justify-center">
            <Truck size={12} className="text-bg" />
          </div>
          <span className="font-serif font-semibold text-text-primary text-sm">Admin</span>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-md hover:bg-surface text-text-muted transition-colors"
          title="Sair"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 md:ml-60 min-h-screen pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
