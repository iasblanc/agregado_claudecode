'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Building2, Users, CreditCard, Bell, Link as LinkIcon, Shield, Loader2, CheckCircle2 } from 'lucide-react'
import { Input, Textarea } from '@/components/ui/Input'
import Button from '@/components/ui/Button'

type ContaTab = 'perfil' | 'usuarios' | 'plano' | 'notificacoes' | 'integracao' | 'seguranca'

const NAV_ITEMS: { key: ContaTab; icon: React.ReactNode; label: string }[] = [
  { key: 'perfil',        icon: <Building2 size={16} />,  label: 'Perfil da empresa' },
  { key: 'usuarios',      icon: <Users size={16} />,      label: 'Usuários e acesso' },
  { key: 'plano',         icon: <CreditCard size={16} />, label: 'Plano e faturamento' },
  { key: 'notificacoes',  icon: <Bell size={16} />,       label: 'Notificações' },
  { key: 'integracao',    icon: <LinkIcon size={16} />,   label: 'Integrações' },
  { key: 'seguranca',     icon: <Shield size={16} />,     label: 'Segurança' },
]

interface ToggleRowProps {
  label: string
  desc: string
  email: boolean
  push: boolean
  onEmailChange: (v: boolean) => void
  onPushChange: (v: boolean) => void
}

function ToggleRow({ label, desc, email, push, onEmailChange, onPushChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0 gap-4">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-muted">{desc}</p>
      </div>
      <div className="flex gap-4 flex-shrink-0">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <div
            onClick={() => onEmailChange(!email)}
            className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${email ? 'bg-accent' : 'bg-border'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white m-0.5 transition-transform ${email ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          <span className="text-xs text-text-muted">E-mail</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <div
            onClick={() => onPushChange(!push)}
            className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${push ? 'bg-accent' : 'bg-border'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white m-0.5 transition-transform ${push ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          <span className="text-xs text-text-muted">Push</span>
        </label>
      </div>
    </div>
  )
}

export default function ContaPage() {
  const router = useRouter()
  const [tab, setTab] = useState<ContaTab>('perfil')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Profile data
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [apresentacao, setApresentacao] = useState('')
  const [estados, setEstados] = useState('')
  const [segmentos, setSegmentos] = useState('')

  // Notifications
  const [notif, setNotif] = useState({
    novoCandidato_email: true,  novoCandidato_push: true,
    respostaInteresse_email: true, respostaInteresse_push: true,
    novaAvaliacao_email: true,  novaAvaliacao_push: false,
    documentoVencendo_email: true, documentoVencendo_push: false,
    resumoSemanal_email: true,  resumoSemanal_push: false,
    novidades_email: false,     novidades_push: false,
  })

  // Segurança
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [senhaError, setSenhaError] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      setEmail(user.email ?? '')

      const { data: trans } = await supabase
        .from('transportadoras')
        .select('razao_social, cnpj')
        .eq('id', user.id)
        .single()

      const { data: prof } = await supabase
        .from('profiles')
        .select('nome, telefone')
        .eq('id', user.id)
        .single()

      if (trans) { setRazaoSocial(trans.razao_social ?? ''); setCnpj(trans.cnpj ?? '') }
      if (prof) { setTelefone(prof.telefone ?? '') }
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSavePerfil() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await Promise.all([
      supabase.from('transportadoras').update({ razao_social: razaoSocial, cnpj }).eq('id', user.id),
      supabase.from('profiles').update({ nome: razaoSocial, telefone }).eq('id', user.id),
    ])

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleAlterarSenha() {
    setSenhaError('')
    if (!novaSenha || novaSenha !== confirmarSenha) {
      setSenhaError('As senhas não coincidem.')
      return
    }
    if (novaSenha.length < 6) {
      setSenhaError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (error) { setSenhaError(error.message); return }
    setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha('')
    alert('Senha alterada com sucesso!')
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-text-muted" /></div>
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans">Configurações</p>
        <h1 className="font-serif text-2xl font-bold text-text-primary">Minha Conta</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar nav */}
        <div className="md:w-52 flex-shrink-0">
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === item.key
                    ? 'bg-accent text-bg'
                    : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* PERFIL */}
          {tab === 'perfil' && (
            <div className="space-y-6">
              {saved && (
                <div className="flex items-center gap-2 bg-success-light border border-success/20 rounded-xl p-3 text-sm text-success">
                  <CheckCircle2 size={16} />
                  Perfil salvo com sucesso!
                </div>
              )}

              <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Dados cadastrais</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Razão Social" value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} />
                  <Input label="CNPJ" value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
                  <Input label="Telefone / WhatsApp" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
                  <Input label="E-mail comercial" value={email} disabled hint="O e-mail não pode ser alterado aqui" />
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Perfil operacional</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Estados de operação"
                    value={estados}
                    onChange={e => setEstados(e.target.value)}
                    placeholder="Ex: SP, PR, RS, SC"
                  />
                  <Input
                    label="Segmentos de carga"
                    value={segmentos}
                    onChange={e => setSegmentos(e.target.value)}
                    placeholder="Ex: Carga Seca, Frigorífico"
                  />
                </div>
                <Textarea
                  label="Apresentação da empresa (visível no marketplace)"
                  rows={4}
                  value={apresentacao}
                  onChange={e => setApresentacao(e.target.value)}
                  placeholder="Descreva sua empresa para os agregados..."
                />
              </div>

              <Button onClick={handleSavePerfil} loading={saving}>
                Salvar alterações
              </Button>
            </div>
          )}

          {/* USUÁRIOS */}
          {tab === 'usuarios' && (
            <div className="bg-surface border border-border rounded-xl p-8 text-center">
              <Users size={32} className="text-text-muted mx-auto mb-3" />
              <p className="font-medium text-text-secondary">Gestão de usuários</p>
              <p className="text-sm text-text-muted mt-1">Em breve — adicione operadores e defina permissões</p>
            </div>
          )}

          {/* PLANO */}
          {tab === 'plano' && (
            <div className="space-y-4">
              <div className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-serif text-xl font-semibold text-text-primary">Plano Pro</h2>
                    <p className="text-sm text-text-muted">R$ 297,00/mês · Renovação automática</p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-pill bg-success-light text-success border border-success/20">
                    ATIVO
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    'Vagas ilimitadas',
                    'Candidaturas ilimitadas',
                    'Contratos digitais',
                    'Avaliações por quesito',
                    'Busca ativa de motoristas',
                    'Suporte prioritário',
                  ].map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                      <CheckCircle2 size={14} className="text-success flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <Button variant="secondary" size="sm">Gerenciar assinatura</Button>
              </div>

              <div className="bg-surface border border-border rounded-xl p-5">
                <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide mb-3">Histórico de faturas</h2>
                {[
                  { mes: 'Março 2026', data: '04/03/2026' },
                  { mes: 'Fevereiro 2026', data: '04/02/2026' },
                  { mes: 'Janeiro 2026', data: '04/01/2026' },
                ].map(f => (
                  <div key={f.mes} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{f.mes}</p>
                      <p className="text-xs text-text-muted">{f.data}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-pill bg-success-light text-success">Pago</span>
                      <span className="text-sm font-medium text-text-primary">R$ 297,00</span>
                      <button className="text-xs text-text-muted hover:text-text-secondary underline">↓ PDF</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NOTIFICAÇÕES */}
          {tab === 'notificacoes' && (
            <div className="bg-surface border border-border rounded-xl p-5">
              <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide mb-1">Preferências de notificação</h2>
              <ToggleRow
                label="Novo candidato em vaga"
                desc="Quando um motorista se candidata a uma das suas vagas"
                email={notif.novoCandidato_email}
                push={notif.novoCandidato_push}
                onEmailChange={v => setNotif(p => ({ ...p, novoCandidato_email: v }))}
                onPushChange={v => setNotif(p => ({ ...p, novoCandidato_push: v }))}
              />
              <ToggleRow
                label="Motorista responde interesse"
                desc="Quando um motorista que você marcou interesse responde"
                email={notif.respostaInteresse_email}
                push={notif.respostaInteresse_push}
                onEmailChange={v => setNotif(p => ({ ...p, respostaInteresse_email: v }))}
                onPushChange={v => setNotif(p => ({ ...p, respostaInteresse_push: v }))}
              />
              <ToggleRow
                label="Nova avaliação recebida"
                desc="Quando um agregado avalia sua empresa"
                email={notif.novaAvaliacao_email}
                push={notif.novaAvaliacao_push}
                onEmailChange={v => setNotif(p => ({ ...p, novaAvaliacao_email: v }))}
                onPushChange={v => setNotif(p => ({ ...p, novaAvaliacao_push: v }))}
              />
              <ToggleRow
                label="Documento vencendo"
                desc="Alerta 30 dias antes do vencimento de documentos cadastrados"
                email={notif.documentoVencendo_email}
                push={notif.documentoVencendo_push}
                onEmailChange={v => setNotif(p => ({ ...p, documentoVencendo_email: v }))}
                onPushChange={v => setNotif(p => ({ ...p, documentoVencendo_push: v }))}
              />
              <ToggleRow
                label="Resumo semanal"
                desc="Relatório semanal com candidatos, visualizações e desempenho das vagas"
                email={notif.resumoSemanal_email}
                push={notif.resumoSemanal_push}
                onEmailChange={v => setNotif(p => ({ ...p, resumoSemanal_email: v }))}
                onPushChange={v => setNotif(p => ({ ...p, resumoSemanal_push: v }))}
              />
              <ToggleRow
                label="Novidades e atualizações da plataforma"
                desc="Novos recursos, melhorias e comunicados do Agregado.Pro"
                email={notif.novidades_email}
                push={notif.novidades_push}
                onEmailChange={v => setNotif(p => ({ ...p, novidades_email: v }))}
                onPushChange={v => setNotif(p => ({ ...p, novidades_push: v }))}
              />
            </div>
          )}

          {/* INTEGRAÇÕES */}
          {tab === 'integracao' && (
            <div className="space-y-3">
              <p className="text-sm text-text-muted">Conecte o Agregado.Pro com seus sistemas de gestão e rastreamento</p>
              {[
                { icon: '📡', title: 'Rastreamento via API', desc: 'Conecte seu sistema de rastreamento para monitorar frota agregada', btn: 'Configurar', variant: 'secondary' as const },
                { icon: '📊', title: 'ERP / TMS', desc: 'Sincronize vagas e contratos com seu sistema de gestão de transporte', btn: 'Em breve', variant: 'secondary' as const, disabled: true },
                { icon: '💬', title: 'WhatsApp Business', desc: 'Receba notificações de candidatos e envie mensagens via WhatsApp', btn: 'Conectado ✓', variant: 'success' as const },
                { icon: '🔑', title: 'API Key — Acesso programático', desc: 'agrpro_••••••••••••••••XZ92', btn: 'Regenerar', variant: 'secondary' as const },
              ].map(item => (
                <div key={item.title} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#E0DAD0] flex items-center justify-center text-2xl flex-shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm">{item.title}</p>
                    <p className="text-xs text-text-muted">{item.desc}</p>
                  </div>
                  <Button variant={item.variant} size="sm" disabled={item.disabled}>
                    {item.btn}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* SEGURANÇA */}
          {tab === 'seguranca' && (
            <div className="space-y-5">
              <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Alterar senha</h2>
                <div className="max-w-sm space-y-3">
                  <Input
                    label="Senha atual"
                    type="password"
                    value={senhaAtual}
                    onChange={e => setSenhaAtual(e.target.value)}
                    placeholder="••••••••"
                  />
                  <Input
                    label="Nova senha"
                    type="password"
                    value={novaSenha}
                    onChange={e => setNovaSenha(e.target.value)}
                    placeholder="••••••••"
                  />
                  <Input
                    label="Confirmar nova senha"
                    type="password"
                    value={confirmarSenha}
                    onChange={e => setConfirmarSenha(e.target.value)}
                    placeholder="••••••••"
                    error={senhaError}
                  />
                  <Button onClick={handleAlterarSenha}>Atualizar senha →</Button>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-5">
                <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide mb-3">Autenticação em dois fatores</h2>
                <div className="flex items-center justify-between p-4 bg-bg border border-border rounded-xl">
                  <div>
                    <p className="font-medium text-text-primary text-sm">2FA via aplicativo autenticador</p>
                    <p className="text-xs text-text-muted">Aumenta a segurança exigindo um código adicional no login</p>
                  </div>
                  <Button variant="secondary" size="sm">Ativar</Button>
                </div>
              </div>

              <div className="bg-danger-light border border-danger/20 rounded-xl p-5">
                <h2 className="font-semibold text-danger text-sm uppercase tracking-wide mb-2">Zona de perigo</h2>
                <p className="text-sm font-medium text-text-primary mb-1">Encerrar conta</p>
                <p className="text-xs text-text-muted mb-3">Esta ação é permanente e remove todos os dados da empresa da plataforma</p>
                <button
                  className="text-xs font-medium uppercase tracking-wide text-danger bg-danger-light border border-danger/20 px-4 py-2 rounded-pill hover:bg-danger/10 transition-colors"
                  onClick={() => alert('Entre em contato com o suporte para encerrar a conta.')}
                >
                  Solicitar encerramento
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
