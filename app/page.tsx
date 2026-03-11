import Link from 'next/link'
import { Truck, Building2, BarChart3, MapPin, TrendingUp, Star, CheckCircle2, ArrowRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg font-sans">
      {/* ── Sticky Header ──────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-bg/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Agregado.Pro" className="h-9 w-auto" />
            <span className="font-serif font-semibold text-text-primary text-xl">Agregado.Pro</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-text-secondary">
            <Link href="#como-funciona" className="hover:text-text-primary transition-colors">Como funciona</Link>
            <Link href="#pilares" className="hover:text-text-primary transition-colors">Solução</Link>
            <Link href="/vagas" className="hover:text-text-primary transition-colors">Ver contratos</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm">Cadastrar grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="pt-20 pb-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-success-light border border-success/20 text-success px-3 py-1 rounded-pill text-sm font-medium mb-6">
            🚛 Para caminhoneiros agregados e transportadoras
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-text-primary leading-tight mb-6">
            O sistema operacional do<br />
            <span className="text-success">caminhoneiro agregado</span>
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Gestão financeira completa, cálculo real de custo por km e acesso ao marketplace de contratos. Tudo integrado para você saber se está lucrando ou perdendo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/register?tipo=agregado">
              <Button size="lg" className="gap-2">
                <Truck size={18} />
                Sou Agregado — Começar grátis
              </Button>
            </Link>
            <Link href="/auth/register?tipo=transportadora">
              <Button size="lg" variant="secondary" className="gap-2">
                <Building2 size={18} />
                Sou Transportadora
              </Button>
            </Link>
          </div>
          <p className="text-sm text-text-muted mt-4">Grátis para começar · Sem cartão de crédito</p>
        </div>
      </section>

      {/* ── Numbers ─────────────────────────────────────── */}
      <section className="border-y border-border bg-surface py-10 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '2M+', label: 'Caminhões no Brasil' },
            { value: '700 mil', label: 'Caminhoneiros autônomos' },
            { value: 'R$ 0', label: 'Para começar a usar' },
            { value: '100%', label: 'Focado no agregado' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="font-serif text-3xl font-bold text-text-primary">{value}</p>
              <p className="text-sm text-text-secondary mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Problema ───────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <Badge variant="warning" className="mb-4">O problema</Badge>
            <h2 className="font-serif text-4xl font-bold text-text-primary mb-4">
              Você sabe quanto está ganhando de verdade?
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              O caminhoneiro agregado opera como uma empresa, mas geralmente sem controle financeiro. Contratos abaixo do custo, margens invisíveis e crédito difícil.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '📉', title: 'Contratos abaixo do custo', desc: 'Sem saber o custo/km real, muitos aceitam contratos que geram prejuízo.' },
              { icon: '🚫', title: 'Margens invisíveis', desc: 'Sem DRE e fluxo de caixa, é impossível saber se o negócio está saudável.' },
              { icon: '💳', title: 'Crédito inacessível', desc: 'Sem histórico financeiro estruturado, o acesso a crédito é caro ou impossível.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-danger-light border border-danger/20 rounded-xl p-6">
                <p className="text-3xl mb-3">{icon}</p>
                <h3 className="font-semibold text-text-primary mb-2">{title}</h3>
                <p className="text-sm text-text-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pilares ─────────────────────────────────────── */}
      <section id="pilares" className="py-20 px-4 sm:px-6 bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <Badge variant="success" className="mb-4">A solução</Badge>
            <h2 className="font-serif text-4xl font-bold text-text-primary mb-4">
              Um sistema completo em três pilares
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-bg rounded-xl border border-border p-6 shadow-card">
              <div className="w-12 h-12 bg-success-light rounded-lg flex items-center justify-center mb-4">
                <BarChart3 size={24} className="text-success" />
              </div>
              <h3 className="font-serif text-xl font-bold text-text-primary mb-3">Gestão Financeira</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                {['Custo por km calculado automaticamente', 'DRE simplificada em tempo real', 'Fluxo de caixa por contrato', 'Resultado por veículo/placa'].map(i => (
                  <li key={i} className="flex items-start gap-2"><CheckCircle2 size={14} className="text-success flex-shrink-0 mt-0.5" />{i}</li>
                ))}
              </ul>
            </div>
            <div className="bg-bg rounded-xl border border-border p-6 shadow-card">
              <div className="w-12 h-12 bg-info-light rounded-lg flex items-center justify-center mb-4">
                <MapPin size={24} className="text-info" />
              </div>
              <h3 className="font-serif text-xl font-bold text-text-primary mb-3">Marketplace</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                {['Contratos publicados por transportadoras', 'Análise automática: contrato vs seu custo', 'Candidatura com seleção de frota', 'Avaliações de transportadoras'].map(i => (
                  <li key={i} className="flex items-start gap-2"><CheckCircle2 size={14} className="text-info flex-shrink-0 mt-0.5" />{i}</li>
                ))}
              </ul>
            </div>
            <div className="bg-bg rounded-xl border border-border p-6 shadow-card">
              <div className="w-12 h-12 bg-gold-light rounded-lg flex items-center justify-center mb-4">
                <TrendingUp size={24} className="text-gold" />
              </div>
              <h3 className="font-serif text-xl font-bold text-text-primary mb-3">Crédito Inteligente</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                {['Score baseado no resultado real', 'Crédito vinculado ao contrato ativo', 'Benefícios por uso e desempenho', 'Em breve — fase 3'].map(i => (
                  <li key={i} className="flex items-start gap-2"><CheckCircle2 size={14} className="text-gold flex-shrink-0 mt-0.5" />{i}</li>
                ))}
              </ul>
              <Badge variant="gold" className="mt-4">Em breve</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* ── Como funciona ──────────────────────────────── */}
      <section id="como-funciona" className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold text-text-primary mb-4">Como funciona</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-success-light rounded-lg flex items-center justify-center">
                  <Truck size={20} className="text-success" />
                </div>
                <h3 className="font-serif text-xl font-bold text-text-primary">Para o Agregado</h3>
              </div>
              <div className="space-y-6">
                {[
                  { n: '1', title: 'Cadastre sua frota', desc: 'Registre veículos, equipamentos e motoristas em um único lugar.' },
                  { n: '2', title: 'Configure o custo/km', desc: 'Informe combustível, manutenção, parcelas. O sistema calcula tudo.' },
                  { n: '3', title: 'Lance receitas e despesas', desc: 'Veja sua DRE e fluxo de caixa em tempo real.' },
                  { n: '4', title: 'Candidate-se a contratos', desc: 'Veja se a vaga cobre seu custo real antes de se candidatar.' },
                ].map(({ n, title, desc }) => (
                  <div key={n} className="flex gap-4">
                    <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{n}</div>
                    <div>
                      <p className="font-semibold text-text-primary text-sm">{title}</p>
                      <p className="text-sm text-text-secondary mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-info-light rounded-lg flex items-center justify-center">
                  <Building2 size={20} className="text-info" />
                </div>
                <h3 className="font-serif text-xl font-bold text-text-primary">Para a Transportadora</h3>
              </div>
              <div className="space-y-6">
                {[
                  { n: '1', title: 'Publique sua vaga de agregado', desc: 'Informe rota, tipo de veículo, equipamento, valor e critérios.' },
                  { n: '2', title: 'Receba candidaturas', desc: 'Veja os candidatos com histórico de avaliações e fotos da frota.' },
                  { n: '3', title: 'Analise e aceite', desc: 'Tome decisões com base em dados reais dos caminhoneiros.' },
                  { n: '4', title: 'Gerencie contratos ativos', desc: 'Acompanhe status e evolução dos seus contratos.' },
                ].map(({ n, title, desc }) => (
                  <div key={n} className="flex gap-4">
                    <div className="w-8 h-8 bg-info rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{n}</div>
                    <div>
                      <p className="font-semibold text-text-primary text-sm">{title}</p>
                      <p className="text-sm text-text-secondary mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Preview marketplace ─────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-surface">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-serif text-3xl font-bold text-text-primary mb-3">Contratos disponíveis agora</h2>
            <p className="text-text-secondary">Crie sua conta para ver valores e se candidatar</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {[
              { origem: 'São Paulo, SP', destino: 'Rio de Janeiro, RJ', veiculo: 'Cavalo 6x2', equip: 'SEMI-REBOQUE 15 MTS', km: '430 km' },
              { origem: 'Curitiba, PR', destino: 'São Paulo, SP', veiculo: 'Truck', equip: null, km: '408 km' },
              { origem: 'Belo Horizonte, MG', destino: 'Brasília, DF', veiculo: 'Cavalo 4x2', equip: 'PRANCHA 12 MTS', km: '740 km' },
              { origem: 'Porto Alegre, RS', destino: 'Florianópolis, SC', veiculo: 'Toco', equip: null, km: '478 km' },
            ].map(({ origem, destino, veiculo, equip, km }) => (
              <div key={origem} className="bg-bg border border-border rounded-xl p-4 shadow-card">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-1 text-sm text-text-secondary">
                      <MapPin size={13} className="text-text-muted" />
                      {origem} → {destino}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{km} estimado</p>
                  </div>
                  <Badge variant="success">Ativa</Badge>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="light">{veiculo}</Badge>
                  {equip && <Badge variant="muted">{equip}</Badge>}
                </div>
                <div className="flex items-center justify-between">
                  <div className="bg-surface rounded-md px-3 py-1.5 border border-border">
                    <p className="text-xs text-text-muted">Valor mensal</p>
                    <p className="text-sm font-semibold text-text-primary blur-sm select-none">R$ ●●.●●●</p>
                  </div>
                  <Link href="/auth/register">
                    <Button size="sm" variant="secondary">Ver completo <ArrowRight size={12} /></Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link href="/vagas">
              <Button variant="ghost">Ver todos os contratos <ArrowRight size={14} /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Depoimentos ───────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-serif text-3xl font-bold text-text-primary">O que dizem nossos usuários</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Carlos M.', role: 'Caminhoneiro agregado — SP', quote: 'Agora sei exatamente o custo do meu km. Já recusei dois contratos que dariam prejuízo.' },
              { name: 'Rogério S.', role: 'Dono de frota — PR', quote: 'A DRE por placa mudou como gerencio meus três caminhões. Visibilidade total.' },
              { name: 'Marcos N.', role: 'Transportadora — MG', quote: 'Publicamos vagas e recebemos candidatos qualificados com histórico verificado.' },
            ].map(({ name, role, quote }) => (
              <div key={name} className="bg-surface border border-border rounded-xl p-5 shadow-card">
                <div className="flex gap-0.5 mb-3">
                  {[1,2,3,4,5].map(i => <Star key={i} size={14} className="text-gold fill-gold" />)}
                </div>
                <p className="text-sm text-text-secondary mb-4 italic">&ldquo;{quote}&rdquo;</p>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{name}</p>
                  <p className="text-xs text-text-muted">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ─────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-accent">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-4xl font-bold text-bg mb-4">Comece grátis hoje</h2>
          <p className="text-bg/70 text-lg mb-8">
            Saiba se seu caminhão está dando lucro ou prejuízo. Em menos de 10 minutos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/register?tipo=agregado">
              <Button size="lg" className="bg-bg! text-accent! hover:bg-surface! gap-2">
                <Truck size={18} />
                Sou Agregado — Começar
              </Button>
            </Link>
            <Link href="/auth/register?tipo=transportadora">
              <Button size="lg" className="bg-transparent! text-bg! border border-bg/30! hover:bg-bg/10! gap-2">
                <Building2 size={18} />
                Sou Transportadora
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer className="bg-[#1A1915] text-bg/60 py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-bg/10 rounded-md flex items-center justify-center">
                  <Truck size={14} className="text-bg" />
                </div>
                <span className="font-serif font-semibold text-bg text-lg">Agregado.Pro</span>
              </div>
              <p className="text-sm max-w-xs">Sistema operacional e infraestrutura financeira do caminhoneiro agregado brasileiro.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
              <div>
                <p className="text-bg font-medium mb-2">Produto</p>
                <div className="space-y-1.5">
                  <Link href="/vagas" className="block hover:text-bg transition-colors">Ver contratos</Link>
                  <Link href="/auth/register" className="block hover:text-bg transition-colors">Criar conta</Link>
                  <Link href="/auth/login" className="block hover:text-bg transition-colors">Entrar</Link>
                </div>
              </div>
              <div>
                <p className="text-bg font-medium mb-2">Funcionalidades</p>
                <div className="space-y-1.5">
                  <span className="block">Gestão financeira</span>
                  <span className="block">Custo por km</span>
                  <span className="block">Marketplace</span>
                </div>
              </div>
              <div>
                <p className="text-bg font-medium mb-2">Legal</p>
                <div className="space-y-1.5">
                  <span className="block">Termos de uso</span>
                  <span className="block">Privacidade</span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-bg/10 pt-6 text-xs">
            © {new Date().getFullYear()} Agregado.Pro. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
