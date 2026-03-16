'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Calculator, Search, FileText, Star, LogOut, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const navItems = [
  { href: '/agregado/dashboard', icon: LayoutDashboard, label: 'Início' },
  { href: '/agregado/marketplace', icon: Search, label: 'Vagas' },
  { href: '/agregado/contratos', icon: FileText, label: 'Contratos' },
  { href: '/agregado/custo-km', icon: Calculator, label: 'Custos' },
  { href: '/agregado/avaliacoes', icon: Star, label: 'Avaliações' },
]

export default function AgregadoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [pendentesCount, setPendentesCount] = useState(0)

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

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Agregado.Pro" className="h-7 w-auto" />
            <span className="font-serif font-medium text-text-primary">Agregado<em className="italic text-text-secondary">.Pro</em></span>
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

      {/* Main content */}
      <main className="max-w-2xl mx-auto pb-24 px-0">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg/97 backdrop-blur border-t border-border">
        <div className="max-w-2xl mx-auto px-2 h-16 flex items-center justify-around">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/agregado/dashboard' && pathname.startsWith(href))
            const isContratos = href === '/agregado/contratos'
            return (
              <Link key={href} href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors relative
                  ${active ? 'text-accent' : 'text-text-muted hover:text-text-secondary'}`}>
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
        </div>
      </nav>
    </div>
  )
}
