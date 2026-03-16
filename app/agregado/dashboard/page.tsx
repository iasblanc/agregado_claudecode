import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { KpiCard } from '@/components/ui/Card'
import Link from 'next/link'
import {
  ChevronRight, FileText, MapPin, Star,
  CheckCircle2, AlertTriangle, Info, Bell, ShieldAlert,
} from 'lucide-react'
import { formatCurrency, calcEstimativaMensal } from '@/lib/types'

export default async function AgregadoDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const now = new Date()
  const mesNome = now.toLocaleString('pt-BR', { month: 'long' })
  const diaNome = now.toLocaleString('pt-BR', { weekday: 'long' })
  const hora = now.getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  const [
    { data: profile },
    { data: agregado },
    { data: contratos },
    { data: paraAssinar },
    { data: candidaturasPendentes },
    { data: avaliacoes },
    { count: veiculosCount },
    { data: vagasRecentes },
    { data: documentos },
  ] = await Promise.all([
    supabase.from('profiles').select('nome, telefone').eq('id', user.id).single(),
    supabase.from('agregados').select('cpf, cnh').eq('id', user.id).maybeSingle(),
    supabase.from('contratos_motorista')
      .select('id, data_inicio, data_fim_prevista, vaga:vagas(valor_km, km_estimado, frequencia_tipo, forma_pagamento)')
      .eq('agregado_id', user.id)
      .eq('status', 'ativo'),
    supabase.from('candidaturas')
      .select('id')
      .eq('agregado_id', user.id)
      .eq('status', 'em_formalizacao'),
    supabase.from('candidaturas')
      .select('id')
      .eq('agregado_id', user.id)
      .in('status', ['pendente', 'visualizado', 'em_negociacao']),
    supabase.from('avaliacoes').select('nota').eq('avaliado_id', user.id),
    supabase.from('veiculos').select('*', { count: 'exact', head: true }).eq('agregado_id', user.id),
    supabase.from('vagas')
      .select('id, rota_origem, uf_origem, rota_destino, uf_destino, valor_km, km_estimado, frequencia_tipo, tipo_veiculo, transportadora:transportadoras(razao_social)')
      .eq('status', 'ativa')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('documentos')
      .select('id, tipo, status, data_validade')
      .eq('agregado_id', user.id),
  ])

  // KPIs
  const contratosAtivos = contratos?.length ?? 0
  const proximoPagamento = contratos?.[0]?.vaga
    ? (calcEstimativaMensal(contratos[0].vaga as unknown as Parameters<typeof calcEstimativaMensal>[0]) ?? 0)
    : 0
  const candidaturasPendentesCount = (candidaturasPendentes?.length ?? 0) + (paraAssinar?.length ?? 0)
  const notaMedia = avaliacoes?.length
    ? avaliacoes.reduce((s, a) => s + (a.nota ?? 0), 0) / avaliacoes.length
    : null

  // Completude do perfil
  const checks = [
    !!profile?.nome,
    !!profile?.telefone,
    !!agregado?.cpf,
    !!agregado?.cnh,
    (veiculosCount ?? 0) > 0,
  ]
  const profilePct = Math.round(checks.filter(Boolean).length / checks.length * 100)

  // Compliance: document alerts
  const todayMs = Date.now()
  const docsVencidos = (documentos ?? []).filter(d => {
    if (!d.data_validade) return false
    return new Date(d.data_validade).getTime() < todayMs
  }).length
  const docsVencendo = (documentos ?? []).filter(d => {
    if (!d.data_validade) return false
    const diff = new Date(d.data_validade).getTime() - todayMs
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return dias >= 0 && dias <= 30
  }).length
  const hasMissingCritical = !documentos?.some(d => d.tipo === 'cnh') ||
    !documentos?.some(d => d.tipo === 'rntrc')

  const primeiroNome = profile?.nome?.split(' ')[0] || 'Agregado'

  return (
    <div className="px-4 py-5">
      {/* Saudação */}
      <div className="mb-5">
        <p className="text-[9px] font-medium uppercase tracking-[.16em] text-text-muted font-sans">Agregado</p>
        <h1 className="font-serif text-2xl font-medium text-text-primary">
          {saudacao}, <em className="italic text-text-secondary">{primeiroNome}.</em>
        </h1>
        <p className="text-xs text-text-muted capitalize mt-0.5">{diaNome}, {mesNome} de {now.getFullYear()}</p>
      </div>

      {/* Banner de completude do perfil */}
      {profilePct < 100 ? (
        <Link href="/agregado/cadastros">
          <div className="bg-warning-light border border-warning/25 rounded-xl p-3.5 mb-4 flex items-center gap-3 cursor-pointer">
            <span className="text-2xl flex-shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">
                {checks.filter(Boolean).length === checks.length - 1
                  ? '1 requisito pendente para candidatar-se'
                  : `${checks.length - checks.filter(Boolean).length} requisitos pendentes para candidatar-se`}
              </p>
              <div className="h-1 bg-border rounded mt-2 overflow-hidden">
                <div className="h-1 bg-warning rounded transition-all" style={{ width: `${profilePct}%` }} />
              </div>
            </div>
            <span className="font-serif text-lg font-medium text-text-primary flex-shrink-0">{profilePct}%</span>
          </div>
        </Link>
      ) : (
        <div className="bg-success-light border border-success/25 rounded-xl p-3.5 mb-4 flex items-center gap-3">
          <CheckCircle2 size={22} className="text-success flex-shrink-0" />
          <p className="text-sm font-medium text-text-primary flex-1">Perfil completo — você pode se candidatar a vagas!</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <Link href="/agregado/contratos">
          <div className="bg-success-light border border-success/20 rounded-xl p-3.5 cursor-pointer">
            <p className="text-[9px] font-medium uppercase tracking-[.14em] text-text-secondary font-sans mb-1">Contratos ativos</p>
            <p className="font-serif text-[30px] font-medium leading-none text-text-primary">{contratosAtivos}</p>
            <p className="text-[10px] text-text-secondary mt-1">em operação →</p>
          </div>
        </Link>
        <Link href="/agregado/custo-km">
          <div className="bg-gold-light border border-gold/20 rounded-xl p-3.5 cursor-pointer">
            <p className="text-[9px] font-medium uppercase tracking-[.14em] text-text-secondary font-sans mb-1">Próximo pagamento</p>
            {proximoPagamento > 0 ? (
              <>
                <p className="font-serif text-[22px] font-medium leading-none text-text-primary">
                  {formatCurrency(proximoPagamento)}
                </p>
                <p className="text-[10px] text-text-secondary mt-1">estimativa mensal →</p>
              </>
            ) : (
              <>
                <p className="font-serif text-[15px] font-medium leading-none text-text-muted mt-1">sem contratos ativos</p>
                <p className="text-[10px] text-text-secondary mt-1">calcular custo →</p>
              </>
            )}
          </div>
        </Link>
        <Link href="/agregado/marketplace">
          <div className="bg-warning-light border border-warning/20 rounded-xl p-3.5 cursor-pointer">
            <p className="text-[9px] font-medium uppercase tracking-[.14em] text-text-secondary font-sans mb-1">Candidaturas</p>
            <p className="font-serif text-[30px] font-medium leading-none text-text-primary">{candidaturasPendentesCount}</p>
            <p className="text-[10px] text-text-secondary mt-1">ver vagas →</p>
          </div>
        </Link>
        <div className="bg-info-light border border-info/20 rounded-xl p-3.5">
          <p className="text-[9px] font-medium uppercase tracking-[.14em] text-text-secondary font-sans mb-1">Avaliação média</p>
          {notaMedia !== null ? (
            <>
              <p className="font-serif text-[30px] font-medium leading-none text-text-primary">{notaMedia.toFixed(1)}</p>
              <p className="text-[10px] text-text-secondary mt-1 flex items-center gap-0.5">
                <Star size={9} className="fill-gold text-gold" /> ver avaliações →
              </p>
            </>
          ) : (
            <>
              <p className="font-serif text-[15px] font-medium leading-none text-text-muted mt-1">sem avaliações</p>
              <p className="text-[10px] text-text-secondary mt-1">ver avaliações →</p>
            </>
          )}
        </div>
      </div>

      {/* Alertas dinâmicos */}
      <div className="mb-5">
        {(paraAssinar?.length ?? 0) > 0 && (
          <Link href="/agregado/contratos">
            <div className="bg-warning-light border border-warning/25 rounded-xl p-3 mb-2.5 flex items-center gap-3">
              <Bell size={18} className="text-warning flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-warning">
                  {paraAssinar!.length === 1 ? '1 proposta' : `${paraAssinar!.length} propostas`} aguardando sua assinatura
                </p>
                <p className="text-[11px] text-text-secondary mt-0.5">A transportadora já assinou — falta só você</p>
              </div>
              <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
            </div>
          </Link>
        )}
        {profilePct < 100 && (
          <Link href="/agregado/cadastros">
            <div className="bg-info-light border border-info/20 rounded-xl p-3 mb-2.5 flex items-center gap-3">
              <Info size={18} className="text-info flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-info">Perfil {profilePct}% completo</p>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  {checks.length - checks.filter(Boolean).length} campo(s) faltando para candidatar-se a vagas
                </p>
              </div>
              <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
            </div>
          </Link>
        )}
        {/* Compliance: documentos vencidos ou vencendo */}
        {docsVencidos > 0 && (
          <Link href="/agregado/documentos">
            <div className="bg-danger-light border border-danger/20 rounded-xl p-3 mb-2.5 flex items-center gap-3">
              <ShieldAlert size={18} className="text-danger flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-danger">
                  {docsVencidos} documento{docsVencidos > 1 ? 's' : ''} vencido{docsVencidos > 1 ? 's' : ''}
                </p>
                <p className="text-[11px] text-text-secondary mt-0.5">Renove para continuar habilitado nas vagas</p>
              </div>
              <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
            </div>
          </Link>
        )}
        {docsVencendo > 0 && (
          <Link href="/agregado/documentos">
            <div className="bg-warning-light border border-warning/25 rounded-xl p-3 mb-2.5 flex items-center gap-3">
              <AlertTriangle size={18} className="text-warning flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-warning">
                  {docsVencendo} documento{docsVencendo > 1 ? 's' : ''} vence{docsVencendo > 1 ? 'm' : ''} em breve
                </p>
                <p className="text-[11px] text-text-secondary mt-0.5">Renove com antecedência para evitar interrupções</p>
              </div>
              <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
            </div>
          </Link>
        )}
        {hasMissingCritical && (
          <Link href="/agregado/documentos">
            <div className="bg-info-light border border-info/20 rounded-xl p-3 mb-2.5 flex items-center gap-3">
              <FileText size={18} className="text-info flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-info">Documentos obrigatórios ausentes</p>
                <p className="text-[11px] text-text-secondary mt-0.5">Envie CNH e RNTRC para se candidatar a vagas</p>
              </div>
              <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
            </div>
          </Link>
        )}
        {(paraAssinar?.length ?? 0) === 0 && profilePct === 100 && docsVencidos === 0 && docsVencendo === 0 && !hasMissingCritical && (
          <div className="bg-success-light border border-success/20 rounded-xl p-3 mb-2.5 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-success flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-success">Tudo em ordem</p>
              <p className="text-[11px] text-text-secondary mt-0.5">Perfil completo, documentos em dia e pronto para novas oportunidades</p>
            </div>
          </div>
        )}
      </div>

      {/* Vagas compatíveis */}
      {(vagasRecentes?.length ?? 0) > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-[20px] font-medium text-text-primary">Vagas compatíveis</h2>
            <Link href="/agregado/marketplace" className="text-sm text-text-muted hover:text-text-secondary font-sans flex items-center gap-0.5">
              Ver todas →
            </Link>
          </div>
          <div className="space-y-2.5">
            {vagasRecentes!.map(vaga => {
              const estimativa = calcEstimativaMensal(vaga as unknown as Parameters<typeof calcEstimativaMensal>[0])
              return (
                <Link key={vaga.id} href={`/agregado/marketplace/${vaga.id}`}>
                  <div className="bg-bg border border-border rounded-xl p-4 flex items-center gap-3">
                    <MapPin size={16} className="text-text-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary font-serif truncate">
                        {vaga.rota_origem} → {vaga.rota_destino}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {(vaga.transportadora as unknown as { razao_social: string | null } | null)?.razao_social ?? 'Transportadora'}
                        {vaga.tipo_veiculo ? ` · ${vaga.tipo_veiculo}` : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {vaga.valor_km ? (
                        <p className="font-serif text-[17px] font-medium text-success leading-none">
                          {formatCurrency(vaga.valor_km)}/km
                        </p>
                      ) : estimativa ? (
                        <p className="font-serif text-[15px] font-medium text-text-primary leading-none">
                          {formatCurrency(estimativa)}/mês
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
          {/* Links rápidos abaixo das vagas */}
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <Link href="/agregado/contratos"
              className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
              <FileText size={18} className="text-info flex-shrink-0" />
              <p className="text-sm font-medium text-text-primary">Meus contratos</p>
            </Link>
            <Link href="/agregado/gestao-negocio"
              className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle size={18} className="text-warning flex-shrink-0" />
              <p className="text-sm font-medium text-text-primary">Gestão financeira</p>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
