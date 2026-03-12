'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }
    // Get profile type to redirect
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('tipo, is_admin').eq('id', user.id).single()
      if (profile?.is_admin) router.push('/admin/dashboard')
      else if (profile?.tipo === 'transportadora') router.push('/transportadora/dashboard')
      else router.push('/agregado/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Agregado.Pro" className="h-9 w-auto" />
          <span className="font-serif font-semibold text-text-primary text-lg">Agregado.Pro</span>
        </Link>
        <Link href="/auth/register" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
          Criar conta
        </Link>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-semibold text-text-primary mb-2">Bem-vindo de volta</h1>
            <p className="text-text-secondary font-sans">Entre para acessar sua plataforma</p>
          </div>

          <div className="bg-surface rounded-xl border border-border p-6 shadow-card">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text-secondary font-sans">Senha</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full px-3 py-2.5 pr-10 rounded-md border border-border bg-[#FAF8F4] text-text-primary font-sans text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-danger-light border border-danger/20 text-danger text-sm rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <Button type="submit" fullWidth loading={loading} size="lg">
                Entrar
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-text-secondary">
                Não tem conta?{' '}
                <Link href="/auth/register" className="text-accent font-medium hover:underline">
                  Cadastre-se grátis
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
