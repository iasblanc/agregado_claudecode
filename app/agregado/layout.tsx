'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Calculator, TrendingUp, Store, BookUser, LogOut, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const navItems = [
  { href: '/agregado/dashboard', icon: LayoutDashboard, label: 'Início' },
  { href: '/agregado/custo-km', icon: Calculator, label: 'Custo/KM' },
  { href: '/agregado/gestao-negocio', icon: TrendingUp, label: 'Negócio' },
  { href: '/agregado/marketplace', icon: Store, label: 'Contratos' },
  { href: '/agregado/cadastros', icon: BookUser, label: 'Cadastros' },
]

export default function AgregadoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Agregado.Pro" className="h-7 w-auto" />
            <span className="font-serif font-semibold text-text-primary">Agregado.Pro</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-md hover:bg-surface text-text-muted transition-colors">
              <Bell size={18} />
            </button>
            <button onClick={handleLogout} className="p-2 rounded-md hover:bg-surface text-text-muted transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto pb-24 px-0">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg/95 backdrop-blur border-t border-border">
        <div className="max-w-2xl mx-auto px-2 h-16 flex items-center justify-around">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/agregado/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${active ? 'text-accent' : 'text-text-muted hover:text-text-secondary'}`}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                <span className={`text-[10px] font-sans ${active ? 'font-semibold' : 'font-normal'}`}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
