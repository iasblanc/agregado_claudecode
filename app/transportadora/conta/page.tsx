'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, Building2, Users, CreditCard, Bell, Link2, Shield } from 'lucide-react'

type Tab = 'perfil' | 'usuarios' | 'plano' | 'notificacoes' | 'integracoes' | 'seguranca'

const TABS = [
  { id: 'perfil', label: '🏢 Perfil', icon: Building2 },
  { id: 'usuarios', label: '👤 Usuários', icon: Users },
  { id: 'plano', label: '💳 Plano', icon: CreditCard },
  { id: 'notificacoes', label: '🔔 Notificações', icon: Bell },
  { id: 'integracoes', label: '🔗 Integrações', icon: Link2 },
  { id: 'seguranca', label: '🔐 Segurança', icon: Shield },
] as const

const FATURAS = [
  { mes: 'Março 2026', valor: 297, status: 'Pago' },
  { mes: 'Fevereiro 2026', valor: 297, status: 'Pago' },
  { mes: 'Janeiro 2026', valor: 297, status: 'Pago' },
]

const NOTIF_ROWS = [
  { label: 'Novo candidato em vaga', desc: 'Quando alguém se candidata a uma vaga sua', email: true, push: true },
  { label: 'Motorista responde interesse', desc: 'Resposta a um interesse que você marcou', email: true, push: true },
  { label: 'Nova avaliação recebida', desc: 'Um agregado avaliou sua empresa', email: true, push: false },
  { label: 'Documento vencendo', desc: 'Documentos com prazo de validade próximo', email: true, push: false },
  { label: 'Resumo semanal', desc: 'Resumo de atividades da semana', email: true, push: false },
  { label: 'Novidades e atualizações', desc: 'Novas funcionalidades e comunicados', email: false, push: false },
]

const INTEGRACOES = [
  { name: 'Rastreamento via API', desc: 'Integre com seu sistema de rastreamento', status: 'disponível' },
  { name: 'ERP / TMS', desc: 'Sincronize fretes e documentos', status: 'em breve' },
  { name: 'WhatsApp Business', desc: 'Receba notificações via WhatsApp', status: 'conectado' },
  { name: 'API Key', desc: 'Acesse a API do Agregado.Pro diretamente', status: 'ativo' },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex w-9 h-5 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-border'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
  )
}

function initials(name: string | null) {
  if (!name) return 'T'
  const parts = name.trim().split(' ')
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function ContaPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('perfil')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  // Profile fields
  const [razaoSocial, setRazaoSocial] = useState('')
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [cep, setCep] = useState('')
  const [cidade, setCidade] = useState('')
  const [endereco, setEndereco] = useState('')
  const [apresentacao, setApresentacao] = useState('')

  // Security fields
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [senhaConfirm, setSenhaConfirm] = useState('')

  // Notifications
  const [notifToggles, setNotifToggles] = useState(
    NOTIF_ROWS.map(r => ({ email: r.email, push: r.push }))
  )

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      setEmail(user.email ?? '')

      const [{ data: transp }, { data: profile }] = await Promise.all([
        supabase.from('transportadoras').select('razao_social, cnpj').eq('id', user.id).single(),
        supabase.from('profiles').select('nome, telefone').eq('id', user.id).single(),
      ])

      if (transp) {
        setRazaoSocial(transp.razao_social ?? '')
        setCnpj(transp.cnpj ?? '')
      }
      if (profile) {
        setNomeFantasia(profile.nome ?? '')
        setTelefone(profile.telefone ?? '')
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { loadProfile() }, [loadProfile])

  async function saveProfile() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await Promise.all([
        supabase.from('transportadoras').update({ razao_social: razaoSocial, cnpj }).eq('id', user.id),
        supabase.from('profiles').update({ nome: nomeFantasia, telefone }).eq('id', user.id),
      ])

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      alert('Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  async function updateSenha() {
    if (senhaNova !== senhaConfirm) { alert('As senhas não coincidem'); return }
    if (senhaNova.length < 6) { alert('A nova senha deve ter pelo menos 6 caracteres'); return }
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: senhaNova })
    if (error) alert(error.message)
    else { showToast('Senha atualizada com sucesso!'); setSenhaAtual(''); setSenhaNova(''); setSenhaConfirm('') }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-text-muted" /></div>
  }

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-text-primary text-bg text-sm px-4 py-3 rounded-xl shadow-lg">
          {toastMsg}
        </div>
      )}

      <div>
        <h1 className="font-serif text-2xl font-bold text-text-primary">Minha Conta</h1>
        <p className="text-text-secondary text-sm mt-0.5">Configurações da empresa e plataforma</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              tab === t.id ? 'bg-accent text-bg' : 'bg-surface border border-border text-text-secondary hover:bg-[#E0DAD0]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Perfil */}
      {tab === 'perfil' && (
        <div className="space-y-5">
          {/* Company header */}
          <div className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/15 text-accent text-2xl font-bold flex items-center justify-center flex-shrink-0">
              {initials(razaoSocial || nomeFantasia)}
            </div>
            <div>
              <p className="font-serif text-xl font-bold text-text-primary">{razaoSocial || 'Sua empresa'}</p>
              <p className="text-sm text-text-muted">{cnpj || 'CNPJ não cadastrado'}</p>
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] bg-success/10 text-success border border-success/30 px-2 py-0.5 rounded-full font-medium">✓ Conta verificada</span>
                <span className="text-[10px] bg-[#C8A84B]/10 text-[#C8A84B] border border-[#C8A84B]/30 px-2 py-0.5 rounded-full font-medium">Plano Pro</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Dados da empresa</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Razão Social', value: razaoSocial, set: setRazaoSocial },
                { label: 'Nome fantasia', value: nomeFantasia, set: setNomeFantasia },
                { label: 'CNPJ', value: cnpj, set: setCnpj },
                { label: 'Telefone', value: telefone, set: setTelefone },
                { label: 'WhatsApp', value: whatsapp, set: setWhatsapp },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs text-text-muted mb-1">{f.label}</label>
                  <input value={f.value} onChange={e => f.set(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs text-text-muted mb-1">E-mail</label>
                <input value={email} disabled
                  className="w-full px-3 py-2 text-sm bg-bg/50 border border-border rounded-lg text-text-muted" />
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Endereço</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">CEP</label>
                <input value={cep} onChange={e => setCep(e.target.value)}
                  placeholder="00000-000"
                  className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Cidade / UF</label>
                <input value={cidade} onChange={e => setCidade(e.target.value)}
                  placeholder="Ex: São Paulo, SP"
                  className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-text-muted mb-1">Endereço</label>
                <input value={endereco} onChange={e => setEndereco(e.target.value)}
                  placeholder="Rua, número, complemento"
                  className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent" />
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Apresentação</h2>
            <textarea value={apresentacao} onChange={e => setApresentacao(e.target.value)}
              rows={4}
              placeholder="Descreva sua empresa, especialidades, diferenciais... (visível no marketplace)"
              className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          </div>

          <button onClick={saveProfile} disabled={saving}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
              saved ? 'bg-success text-bg' : 'bg-accent text-bg hover:opacity-90'
            } disabled:opacity-50`}>
            {saved ? '✓ Salvo' : saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      )}

      {/* Tab: Usuários */}
      {tab === 'usuarios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">Usuários da conta</h2>
            <button onClick={() => showToast('Em breve disponível')}
              className="text-sm px-3 py-2 rounded-lg bg-accent text-bg font-medium">
              + Convidar usuário
            </button>
          </div>
          {[
            { name: razaoSocial || 'Administrador', email, role: 'Administrador' },
          ].map((u, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent/15 text-accent font-semibold flex items-center justify-center text-sm">
                {initials(u.name)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{u.name}</p>
                <p className="text-xs text-text-muted">{u.email}</p>
              </div>
              <span className="text-xs bg-accent/10 text-accent border border-accent/30 px-2 py-0.5 rounded-full">{u.role}</span>
            </div>
          ))}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg border-b border-border">
                <tr>
                  {['Permissão', 'Administrador', 'Operador', 'Somente leitura'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['Publicar vagas', 'Aprovar candidatos', 'Ver contratos', 'Avaliar agregados', 'Gerenciar usuários', 'Gerenciar pagamentos'].map(p => (
                  <tr key={p} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-text-secondary">{p}</td>
                    <td className="px-4 py-2.5 text-center text-success">✓</td>
                    <td className="px-4 py-2.5 text-center text-success">{['Ver contratos', 'Avaliar agregados'].includes(p) ? '✓' : ['Gerenciar usuários', 'Gerenciar pagamentos'].includes(p) ? '—' : '✓'}</td>
                    <td className="px-4 py-2.5 text-center text-text-muted">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Plano */}
      {tab === 'plano' && (
        <div className="space-y-5">
          {/* Current plan */}
          <div className="bg-text-primary text-bg rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-bg/60 text-xs uppercase tracking-widest">Plano atual</p>
                <p className="font-serif text-2xl font-bold">Pro</p>
              </div>
              <p className="font-serif text-2xl font-bold">R$ 297<span className="text-sm font-normal opacity-60">/mês</span></p>
            </div>
            <p className="text-bg/60 text-xs mb-4">Próxima renovação: 12/04/2026</p>
            <div className="flex flex-wrap gap-2">
              {['Vagas ilimitadas', 'Busca de motoristas', '3 usuários', 'Avaliações', 'Suporte prioritário'].map(f => (
                <span key={f} className="text-xs bg-bg/10 px-2.5 py-1 rounded-pill">{f}</span>
              ))}
            </div>
          </div>

          {/* Plans comparison */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { name: 'Básico', price: 97, features: ['5 vagas ativas', 'Candidatos ilimitados', '1 usuário'] },
              { name: 'Pro', price: 297, features: ['Vagas ilimitadas', 'Busca de motoristas', '3 usuários', 'Avaliações'], current: true },
              { name: 'Enterprise', price: 697, features: ['Multi-unidade', 'API', 'Usuários ilimitados', 'Suporte dedicado'] },
            ].map(plan => (
              <div key={plan.name} className={`rounded-xl p-4 border ${plan.current ? 'border-accent bg-accent/5' : 'border-border bg-surface'}`}>
                <p className="font-semibold text-text-primary">{plan.name}</p>
                {plan.current && <span className="text-[10px] text-accent font-medium">Plano atual</span>}
                <p className="font-serif text-xl font-bold text-text-primary mt-2">R$ {plan.price}<span className="text-xs font-normal text-text-muted">/mês</span></p>
                <ul className="mt-3 space-y-1">
                  {plan.features.map(f => (
                    <li key={f} className="text-xs text-text-secondary flex items-center gap-1">
                      <span className="text-success">✓</span> {f}
                    </li>
                  ))}
                </ul>
                {!plan.current && (
                  <button onClick={() => showToast('Entre em contato com nossa equipe comercial')}
                    className="w-full mt-3 py-2 rounded-lg border border-accent text-accent text-xs font-medium hover:bg-accent/5">
                    {plan.price > 297 ? 'Fazer upgrade' : 'Downgrade'}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Invoices */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-text-primary text-sm">Histórico de faturas</h3>
            </div>
            {FATURAS.map((f, i) => (
              <div key={i} className={`px-4 py-3 flex items-center justify-between ${i < FATURAS.length - 1 ? 'border-b border-border' : ''}`}>
                <div>
                  <p className="text-sm font-medium text-text-primary">{f.mes}</p>
                  <p className="text-xs text-text-muted">R$ {f.valor},00</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-success/10 text-success border border-success/30 px-2 py-0.5 rounded-full">{f.status}</span>
                  <button onClick={() => showToast('PDF indisponível nesta demonstração')}
                    className="text-xs text-text-muted hover:text-text-secondary">PDF</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Notificações */}
      {tab === 'notificacoes' && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] text-xs font-medium text-text-muted bg-bg border-b border-border px-4 py-2.5 gap-8">
              <span>Evento</span>
              <span>E-mail</span>
              <span>Push</span>
            </div>
            {NOTIF_ROWS.map((row, i) => (
              <div key={i} className={`grid grid-cols-[1fr_auto_auto] px-4 py-3 gap-8 items-center ${i < NOTIF_ROWS.length - 1 ? 'border-b border-border' : ''}`}>
                <div>
                  <p className="text-sm font-medium text-text-primary">{row.label}</p>
                  <p className="text-xs text-text-muted">{row.desc}</p>
                </div>
                <Toggle
                  checked={notifToggles[i].email}
                  onChange={v => setNotifToggles(prev => prev.map((t, idx) => idx === i ? { ...t, email: v } : t))}
                />
                <Toggle
                  checked={notifToggles[i].push}
                  onChange={v => setNotifToggles(prev => prev.map((t, idx) => idx === i ? { ...t, push: v } : t))}
                />
              </div>
            ))}
          </div>
          <button onClick={() => showToast('Preferências salvas!')}
            className="px-5 py-2.5 rounded-xl bg-accent text-bg text-sm font-medium">
            Salvar preferências
          </button>
        </div>
      )}

      {/* Tab: Integrações */}
      {tab === 'integracoes' && (
        <div className="grid gap-3">
          {INTEGRACOES.map(integ => (
            <div key={integ.name} className="bg-surface border border-border rounded-xl px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-text-primary text-sm">{integ.name}</p>
                <p className="text-xs text-text-muted">{integ.desc}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                  integ.status === 'conectado' ? 'bg-success/10 text-success border-success/30' :
                  integ.status === 'em breve' ? 'bg-border/50 text-text-muted border-border' :
                  'bg-info/10 text-info border-info/30'
                }`}>
                  {integ.status === 'conectado' ? '✓ Conectado' :
                   integ.status === 'em breve' ? 'Em breve' : 'Disponível'}
                </span>
                {integ.status !== 'em breve' && (
                  <button onClick={() => showToast(integ.name === 'API Key' ? 'Nova API Key gerada!' : 'Funcionalidade em breve')}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-bg transition-colors">
                    {integ.status === 'conectado' ? 'Gerenciar' : integ.name === 'API Key' ? 'Regenerar' : 'Configurar'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Segurança */}
      {tab === 'seguranca' && (
        <div className="space-y-5">
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wide">Alterar senha</h2>
            {[
              { label: 'Senha atual', value: senhaAtual, set: setSenhaAtual },
              { label: 'Nova senha', value: senhaNova, set: setSenhaNova },
              { label: 'Confirmar nova senha', value: senhaConfirm, set: setSenhaConfirm },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs text-text-muted mb-1">{f.label}</label>
                <input type="password" value={f.value} onChange={e => f.set(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent" />
              </div>
            ))}
            <button onClick={updateSenha}
              className="px-5 py-2.5 rounded-xl bg-accent text-bg text-sm font-medium">
              Atualizar senha →
            </button>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-text-primary text-sm">2FA via aplicativo autenticador</p>
              <p className="text-xs text-text-muted">Adicione uma camada extra de segurança com autenticação em dois fatores</p>
            </div>
            <button onClick={() => showToast('2FA em breve disponível')}
              className="px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:bg-bg transition-colors flex-shrink-0">
              Ativar
            </button>
          </div>

          <div className="bg-danger-light border border-danger/20 rounded-xl p-5">
            <h3 className="font-semibold text-danger text-sm mb-2">Zona de perigo</h3>
            <p className="text-xs text-text-secondary mb-4">Encerrar sua conta removerá permanentemente todos os dados associados a esta empresa.</p>
            <button onClick={() => showToast('Entre em contato com o suporte para encerrar sua conta')}
              className="px-4 py-2 rounded-lg border border-danger/40 text-danger text-sm font-medium hover:bg-danger/10">
              Encerrar conta
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
