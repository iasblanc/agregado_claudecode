import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { type Vaga } from '@/lib/types'
import {
  MapPin, Truck, Package, ArrowRight, LogIn, UserPlus,
  Eye, EyeOff, TrendingUp, Shield, Star
} from 'lucide-react'

export const revalidate = 60 // Revalidate every 60 seconds

export default async function PublicVagasPage() {
  const supabase = await createClient()

  const { data: vagas } = await supabase
    .from('vagas')
    .select('id, rota_origem, rota_destino, km_estimado, tipo_veiculo, tipo_equipamento, contrata_equipamento, periodo_meses, status, created_at')
    .eq('status', 'ativa')
    .order('created_at', { ascending: false })

  const vagasList: Partial<Vaga>[] = vagas ?? []

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center">
              <Truck size={14} className="text-bg" />
            </div>
            <span className="font-serif font-semibold text-text-primary">Agregado.Pro</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <LogIn size={14} />
                <span className="hidden sm:inline">Entrar</span>
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="gap-1.5">
                <UserPlus size={14} />
                Cadastrar grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border bg-surface py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="success" className="mb-4">
            {vagasList.length} contratos disponíveis agora
          </Badge>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-text-primary mb-4">
            Contratos disponíveis
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto mb-6">
            Vagas de agregado publicadas por transportadoras. Crie sua conta gratuita para ver valores, empresa e se candidatar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="gap-2">
                <UserPlus size={16} />
                Criar conta grátis — Ver contratos completos
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="secondary" size="lg" className="gap-2">
                <LogIn size={16} />
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Vagas list */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {vagasList.length === 0 ? (
          <div className="text-center py-16">
            <Package size={40} className="text-text-muted mx-auto mb-4" />
            <h2 className="font-serif text-xl font-semibold text-text-primary mb-2">Nenhum contrato disponível no momento</h2>
            <p className="text-text-secondary mb-6">Novas vagas são publicadas regularmente. Crie sua conta para ser notificado.</p>
            <Link href="/auth/register">
              <Button className="gap-2">
                <UserPlus size={15} />
                Criar conta grátis
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vagasList.map((vaga) => (
              <div key={vaga.id} className="bg-surface border border-border rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow group">
                <div className="h-1 bg-success" />
                <div className="p-4">
                  {/* Rota */}
                  <div className="flex items-start gap-2 mb-3">
                    <MapPin size={15} className="text-text-muted flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary text-sm truncate">
                        {vaga.rota_origem}
                        {vaga.rota_origem && vaga.rota_destino ? ' → ' : ''}
                        {vaga.rota_destino}
                      </p>
                      {vaga.km_estimado && (
                        <p className="text-xs text-text-muted">{vaga.km_estimado.toLocaleString('pt-BR')} km estimados</p>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="success">Ativa</Badge>
                    {vaga.tipo_veiculo && <Badge variant="light">{vaga.tipo_veiculo}</Badge>}
                    {vaga.tipo_equipamento && <Badge variant="muted">{vaga.tipo_equipamento}</Badge>}
                    {vaga.periodo_meses && (
                      <Badge variant="muted">{vaga.periodo_meses} {vaga.periodo_meses === 1 ? 'mês' : 'meses'}</Badge>
                    )}
                  </div>

                  {/* Hidden valor */}
                  <div className="bg-bg border border-border rounded-lg p-3 mb-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-text-muted">Valor mensal</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <EyeOff size={12} className="text-text-muted" />
                        <p className="text-sm font-semibold text-text-muted select-none blur-sm">
                          R$ ●●.●●●
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Empresa</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <EyeOff size={12} className="text-text-muted" />
                        <p className="text-xs text-text-muted select-none blur-sm">●●●●●●●●</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <Link href={`/vagas/${vaga.id}`}>
                    <Button variant="secondary" size="sm" fullWidth className="gap-2 group-hover:bg-accent group-hover:text-bg transition-all">
                      Ver contrato completo
                      <ArrowRight size={13} />
                    </Button>
                  </Link>
                  <p className="text-xs text-text-muted text-center mt-2">
                    Crie sua conta grátis para candidatar-se
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Benefits banner */}
      <section className="bg-surface border-t border-border py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-2xl font-bold text-text-primary mb-2">
            Por que criar uma conta gratuita?
          </h2>
          <p className="text-text-secondary mb-8">Mais do que ver contratos — gerencie seu negócio com visibilidade real.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: Eye,
                color: 'bg-success-light text-success',
                title: 'Veja valores completos',
                desc: 'Acesse o valor cheio do contrato, nome e histórico da transportadora.',
              },
              {
                icon: TrendingUp,
                color: 'bg-info-light text-info',
                title: 'Análise automática',
                desc: 'Compare o contrato com seu custo real por km e saiba se o negócio vale.',
              },
              {
                icon: Shield,
                color: 'bg-gold-light text-gold',
                title: 'Candidate-se com confiança',
                desc: 'Envie candidatura com sua frota e motoristas em segundos.',
              },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-bg border border-border rounded-xl p-5 text-left">
                <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon size={18} />
                </div>
                <p className="font-semibold text-text-primary text-sm mb-1">{title}</p>
                <p className="text-xs text-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/auth/register">
              <Button size="lg" className="gap-2">
                <UserPlus size={16} />
                Criar conta grátis — É rápido e gratuito
                <ArrowRight size={15} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A1915] text-bg/60 py-6 px-4 text-center text-sm">
        <p>© {new Date().getFullYear()} Agregado.Pro · <Link href="/" className="hover:text-bg transition-colors">Página inicial</Link></p>
      </footer>
    </div>
  )
}
