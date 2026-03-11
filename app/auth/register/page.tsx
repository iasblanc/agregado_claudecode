'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Truck, Building2, ChevronRight, Eye, EyeOff } from 'lucide-react'
import type { UserTipo } from '@/lib/types'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [tipo, setTipo] = useState<UserTipo | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!tipo) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: signUpErr } = await supabase.auth.signUp({ email, password })
    if (signUpErr || !data.user) {
      setError(signUpErr?.message || 'Erro ao criar conta.')
      setLoading(false)
      return
    }

    const { error: profileErr } = await supabase.from('profiles').insert({
      id: data.user.id,
      tipo,
      nome,
      is_admin: false,
    })

    if (profileErr) {
      setError('Erro ao salvar perfil. Tente novamente.')
      setLoading(false)
      return
    }

    // Create type-specific profile
    if (tipo === 'agregado') {
      await supabase.from('agregados').insert({ id: data.user.id })
    } else {
      await supabase.from('transportadoras').insert({ id: data.user.id })
    }

    if (tipo === 'transportadora') router.push('/transportadora/dashboard')
    else router.push('/agregado/dashboard')
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-md flex items-center justify-center">
            <Truck size={16} className="text-bg" />
          </div>
          <span className="font-serif font-semibold text-text-primary text-lg">Agregado.Pro</span>
        </Link>
        <Link href="/auth/login" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
          Já tenho conta
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-semibold text-text-primary mb-2">Criar conta grátis</h1>
            <p className="text-text-secondary font-sans">
              {step === 1 ? 'Qual é o seu perfil?' : 'Complete seu cadastro'}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8 justify-center">
            {[1, 2].map(s => (
              <div key={s} className={`h-1.5 rounded-pill transition-all ${s <= step ? 'bg-accent w-12' : 'bg-border w-6'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <button onClick={() => { setTipo('agregado'); setStep(2) }}
                className={`p-5 rounded-xl border-2 text-left transition-all cursor-pointer ${tipo === 'agregado' ? 'border-accent bg-accent/5' : 'border-border bg-surface hover:border-text-muted'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-success-light rounded-lg flex items-center justify-center flex-shrink-0">
                    <Truck size={24} className="text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-text-primary font-sans text-lg">Sou Agregado</p>
                    <p className="text-sm text-text-secondary mt-0.5">Caminhoneiro autônomo ou dono de frota própria</p>
                  </div>
                  <ChevronRight size={20} className="text-text-muted" />
                </div>
              </button>

              <button onClick={() => { setTipo('transportadora'); setStep(2) }}
                className={`p-5 rounded-xl border-2 text-left transition-all cursor-pointer ${tipo === 'transportadora' ? 'border-accent bg-accent/5' : 'border-border bg-surface hover:border-text-muted'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-info-light rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 size={24} className="text-info" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-text-primary font-sans text-lg">Sou Transportadora</p>
                    <p className="text-sm text-text-secondary mt-0.5">Empresa que contrata agregados e publica contratos</p>
                  </div>
                  <ChevronRight size={20} className="text-text-muted" />
                </div>
              </button>
            </div>
          )}

          {step === 2 && tipo && (
            <div className="bg-surface rounded-xl border border-border p-6 shadow-card">
              <button onClick={() => setStep(1)} className="text-sm text-text-muted hover:text-text-secondary mb-4 inline-flex items-center gap-1">
                ← Voltar
              </button>
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <Input
                  label={tipo === 'agregado' ? 'Seu nome completo' : 'Nome da empresa / responsável'}
                  type="text"
                  placeholder={tipo === 'agregado' ? 'João Silva' : 'Transportadora XYZ'}
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  required
                />
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
                      placeholder="mínimo 6 caracteres"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-3 py-2.5 pr-10 rounded-md border border-border bg-[#FAF8F4] text-text-primary font-sans text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-danger-light border border-danger/20 text-danger text-sm rounded-md px-3 py-2">{error}</div>
                )}

                <Button type="submit" fullWidth loading={loading} size="lg">
                  Criar conta
                </Button>
              </form>

              <p className="text-xs text-text-muted text-center mt-4">
                Ao criar sua conta você concorda com nossos{' '}
                <span className="underline cursor-pointer">Termos de Uso</span> e{' '}
                <span className="underline cursor-pointer">Política de Privacidade</span>
              </p>
            </div>
          )}

          <p className="text-center text-sm text-text-secondary mt-6">
            Já tem conta?{' '}
            <Link href="/auth/login" className="text-accent font-medium hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
