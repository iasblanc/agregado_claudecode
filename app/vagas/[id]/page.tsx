import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import {
  MapPin, Truck, Package, Clock, ArrowRight,
  LogIn, UserPlus, Eye, EyeOff, CheckCircle2,
  Lock, Star, TrendingUp, Shield, Building2, BarChart3
} from 'lucide-react'

export const revalidate = 60

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PublicVagaDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch only public-safe fields — no valor, no transportadora name
  const { data: vaga } = await supabase
    .from('vagas')
    .select('id, rota_origem, rota_destino, km_estimado, tipo_veiculo, tipo_equipamento, contrata_equipamento, periodo_meses, descricao, status, created_at')
    .eq('id', id)
    .single()

  if (!vaga) notFound()

  // Truncate description to ~120 chars
  const descTruncated = vaga.descricao
    ? vaga.descricao.length > 120
      ? vaga.descricao.substring(0, 120) + '…'
      : vaga.descricao
    : null

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/vagas" className="flex items-center gap-2">
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

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Back link */}
        <Link
          href="/vagas"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          ← Todos os contratos
        </Link>

        {/* Vaga header */}
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="success">Contrato ativo</Badge>
            {vaga.tipo_veiculo && <Badge variant="light">{vaga.tipo_veiculo}</Badge>}
          </div>
          <h1 className="font-serif text-3xl font-bold text-text-primary">
            {vaga.rota_origem}
            {vaga.rota_origem && vaga.rota_destino ? ' → ' : ''}
            {vaga.rota_destino}
          </h1>
          {vaga.km_estimado && (
            <p className="text-text-muted mt-1 flex items-center gap-1.5">
              <MapPin size={14} />
              {vaga.km_estimado.toLocaleString('pt-BR')} km estimados
            </p>
          )}
        </div>

        {/* Public info card */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-text-primary">Detalhes do contrato</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {vaga.tipo_veiculo && (
              <div className="flex items-start gap-2">
                <Truck size={15} className="text-text-muted mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide">Veículo</p>
                  <p className="text-sm text-text-primary">{vaga.tipo_veiculo}</p>
                </div>
              </div>
            )}
            {vaga.tipo_equipamento && (
              <div className="flex items-start gap-2">
                <Package size={15} className="text-text-muted mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide">Equipamento</p>
                  <p className="text-sm text-text-primary">{vaga.tipo_equipamento}</p>
                </div>
              </div>
            )}
            {vaga.periodo_meses && (
              <div className="flex items-start gap-2">
                <Clock size={15} className="text-text-muted mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide">Período</p>
                  <p className="text-sm text-text-primary">
                    {vaga.periodo_meses} {vaga.periodo_meses === 1 ? 'mês' : 'meses'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Partial description */}
          {descTruncated && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-text-muted uppercase tracking-wide mb-1.5">Descrição</p>
              <p className="text-sm text-text-secondary leading-relaxed">
                {descTruncated}
              </p>
              {vaga.descricao && vaga.descricao.length > 120 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Lock size={12} className="text-text-muted" />
                  <p className="text-xs text-text-muted italic">Descrição completa disponível após cadastro</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hidden info card */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <EyeOff size={15} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary">Informações restritas</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-bg border border-border rounded-lg p-3">
              <p className="text-xs text-text-muted mb-1">Valor mensal do contrato</p>
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-warning" />
                <p className="text-lg font-bold text-text-primary blur-sm select-none">
                  R$ ●●.●●●
                </p>
              </div>
              <p className="text-xs text-warning mt-1">Visível após cadastro</p>
            </div>
            <div className="bg-bg border border-border rounded-lg p-3">
              <p className="text-xs text-text-muted mb-1">Transportadora</p>
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-warning" />
                <p className="text-sm font-semibold text-text-muted blur-sm select-none">
                  ●●●●●●●● Transportes
                </p>
              </div>
              <p className="text-xs text-warning mt-1">Nome visível após cadastro</p>
            </div>
          </div>
        </div>

        {/* Big CTA Banner */}
        <div className="bg-accent rounded-2xl p-6 sm:p-8 text-center">
          <div className="inline-flex items-center gap-2 bg-bg/10 border border-bg/20 text-bg/80 px-3 py-1 rounded-pill text-xs font-medium mb-4">
            <Lock size={11} />
            Conteúdo exclusivo para cadastrados
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-bg mb-3">
            Veja o contrato completo e candidate-se
          </h2>
          <p className="text-bg/70 text-sm sm:text-base mb-6 max-w-md mx-auto">
            Crie sua conta gratuita em menos de 2 minutos e tenha acesso a todos os detalhes desta vaga — e de todas as outras.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/register">
              <Button
                size="lg"
                className="gap-2 bg-bg! text-accent! hover:bg-surface! w-full sm:w-auto"
              >
                <UserPlus size={16} />
                Criar conta grátis — Candidatar-se
                <ArrowRight size={15} />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                className="gap-2 bg-transparent! text-bg! border border-bg/30! hover:bg-bg/10! w-full sm:w-auto"
              >
                <LogIn size={15} />
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>

        {/* What you'll see after registering */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Eye size={16} className="text-text-muted" />
            O que você verá ao se cadastrar
          </h3>
          <ul className="space-y-3">
            {[
              {
                icon: TrendingUp,
                color: 'bg-success-light text-success',
                title: 'Valor completo do contrato',
                desc: 'Veja o valor mensal exato e compare com seu custo por km.',
              },
              {
                icon: Building2,
                color: 'bg-info-light text-info',
                title: 'Empresa e histórico da transportadora',
                desc: 'Nome completo, CNPJ e avaliações de outros agregados que já trabalharam com ela.',
              },
              {
                icon: BarChart3,
                color: 'bg-gold-light text-gold',
                title: 'Análise automática: contrato vs seu custo/km',
                desc: 'O sistema calcula automaticamente se este contrato cobre seus custos reais e qual a margem.',
              },
              {
                icon: Shield,
                color: 'bg-warning-light text-warning',
                title: 'Candidatura com sua frota',
                desc: 'Selecione seu veículo, equipamento e motorista e envie candidatura em segundos.',
              },
              {
                icon: Star,
                color: 'bg-danger-light text-danger',
                title: 'Descrição completa e peculiaridades',
                desc: 'Todos os detalhes operacionais, diárias, adiantamentos e observações da vaga.',
              },
            ].map(({ icon: Icon, color, title, desc }) => (
              <li key={title} className="flex items-start gap-3">
                <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Icon size={14} />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{title}</p>
                  <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 pt-4 border-t border-border">
            <Link href="/auth/register">
              <Button fullWidth className="gap-2">
                <UserPlus size={15} />
                Criar conta grátis — Começar agora
                <ArrowRight size={14} />
              </Button>
            </Link>
            <p className="text-xs text-text-muted text-center mt-2">Grátis para sempre · Sem cartão de crédito</p>
          </div>
        </div>

        {/* Other vagas CTA */}
        <div className="text-center py-4">
          <p className="text-text-muted text-sm mb-3">Ver outros contratos disponíveis</p>
          <Link href="/vagas">
            <Button variant="ghost" size="sm" className="gap-2">
              ← Voltar para todos os contratos
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1A1915] text-bg/60 py-6 px-4 text-center text-sm mt-8">
        <p>© {new Date().getFullYear()} Agregado.Pro · <Link href="/" className="hover:text-bg transition-colors">Página inicial</Link></p>
      </footer>
    </div>
  )
}
