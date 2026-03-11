'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Briefcase, LogOut, Truck, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useState } from 'react'

const navItems = [
  { href: '/transportadora/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transportadora/vagas', icon: Briefcase, label: 'Vagas' },
]

export default function TransportadoraLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-56 bg-surface border-r border-border z-40">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border flex-shrink-0">
          <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center">
            <Truck size={14} className="text-bg" />
          </div>
          <div>
            <span className="font-serif font-semibold text-text-primary text-sm leading-none block">Agregado.Pro</span>
            <span className="text-[10px] text-text-muted font-sans">Transportadora</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-[10px] font-sans uppercase tracking-widest text-text-muted px-2 mb-2">Menu</p>
          <ul className="space-y-1">
            {navItems.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || (href !== '/transportadora/dashboard' && pathname.startsWith(href))
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
            <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center">
              <Truck size={14} className="text-bg" />
            </div>
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
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/transportadora/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-6 py-2 rounded-lg transition-colors ${
                  active ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
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
