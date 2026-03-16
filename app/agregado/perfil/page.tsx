'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { User, Truck, Shield, CheckCircle2, Loader2 } from 'lucide-react'

type Tab = 'pessoal' | 'empresa' | 'seguranca'

interface FormPessoal {
  nome: string
  telefone: string
  cpf: string
  cnh: string
  cnh_categoria: string
  cnh_validade: string
  endereco: string
  cidade: string
  uf: string
}

interface FormEmpresa {
  tipo_agregado: string
  rntrc: string
  cnpj: string
  razao_social: string
  inscricao_estadual: string
}

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']
const CATEGORIAS_CNH = ['A','B','AB','C','D','E','AC','AD','AE']
const TIPOS_AGREGADO = ['Motorista autônomo (CPF)','Microempreendedor Individual (MEI)','Empresa (CNPJ)']

export default function PerfilPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pessoal')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [pessoal, setPessoal] = useState<FormPessoal>({
    nome: '', telefone: '', cpf: '', cnh: '',
    cnh_categoria: 'E', cnh_validade: '', endereco: '', cidade: '', uf: 'SP',
  })
  const [empresa, setEmpresa] = useState<FormEmpresa>({
    tipo_agregado: 'Motorista autônomo (CPF)',
    rntrc: '', cnpj: '', razao_social: '', inscricao_estadual: '',
  })
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [senhaConfirm, setSenhaConfirm] = useState('')
  const [senhaErro, setSenhaErro] = useState('')
  const [senhaOk, setSenhaOk] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const [{ data: profile }, { data: agregado }] = await Promise.all([
        supabase.from('profiles').select('nome, telefone').eq('id', user.id).single(),
        supabase.from('agregados').select('cpf, cnh, cnh_categoria, cnh_validade, endereco, cidade, uf, rntrc, cnpj, razao_social, inscricao_estadual, tipo_agregado').eq('id', user.id).single(),
      ])

      if (profile) {
        setPessoal(prev => ({
          ...prev,
          nome: profile.nome ?? '',
          telefone: profile.telefone ?? '',
        }))
      }
      if (agregado) {
        setPessoal(prev => ({
          ...prev,
          cpf: (agregado as Record<string, string | null>).cpf ?? '',
          cnh: (agregado as Record<string, string | null>).cnh ?? '',
          cnh_categoria: (agregado as Record<string, string | null>).cnh_categoria ?? 'E',
          cnh_validade: (agregado as Record<string, string | null>).cnh_validade ?? '',
          endereco: (agregado as Record<string, string | null>).endereco ?? '',
          cidade: (agregado as Record<string, string | null>).cidade ?? '',
          uf: (agregado as Record<string, string | null>).uf ?? 'SP',
        }))
        setEmpresa({
          tipo_agregado: (agregado as Record<string, string | null>).tipo_agregado ?? 'Motorista autônomo (CPF)',
          rntrc: (agregado as Record<string, string | null>).rntrc ?? '',
          cnpj: (agregado as Record<string, string | null>).cnpj ?? '',
          razao_social: (agregado as Record<string, string | null>).razao_social ?? '',
          inscricao_estadual: (agregado as Record<string, string | null>).inscricao_estadual ?? '',
        })
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function savePessoal() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await Promise.all([
      supabase.from('profiles').update({ nome: pessoal.nome.trim(), telefone: pessoal.telefone.trim() }).eq('id', user.id),
      supabase.from('agregados').update({
        cpf: pessoal.cpf.trim(),
        cnh: pessoal.cnh.trim(),
        cnh_categoria: pessoal.cnh_categoria,
        cnh_validade: pessoal.cnh_validade || null,
        endereco: pessoal.endereco.trim(),
        cidade: pessoal.cidade.trim(),
        uf: pessoal.uf,
      }).eq('id', user.id),
    ])

    setSaving(false)
    flashSaved()
  }

  async function saveEmpresa() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('agregados').update({
      tipo_agregado: empresa.tipo_agregado,
      rntrc: empresa.rntrc.trim(),
      cnpj: empresa.cnpj.trim() || null,
      razao_social: empresa.razao_social.trim() || null,
      inscricao_estadual: empresa.inscricao_estadual.trim() || null,
    }).eq('id', user.id)

    setSaving(false)
    flashSaved()
  }

  async function saveSenha() {
    setSenhaErro('')
    if (senhaNova !== senhaConfirm) { setSenhaErro('As senhas não coincidem.'); return }
    if (senhaNova.length < 8) { setSenhaErro('A nova senha deve ter pelo menos 8 caracteres.'); return }

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: senhaNova })
    setSaving(false)

    if (error) { setSenhaErro(error.message); return }
    setSenhaOk(true)
    setSenhaAtual(''); setSenhaNova(''); setSenhaConfirm('')
    setTimeout(() => setSenhaOk(false), 4000)
  }

  function flashSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div className="px-4 py-5 flex items-center justify-center min-h-[40vh]">
        <Loader2 size={28} className="animate-spin text-text-muted" />
      </div>
    )
  }

  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'pessoal', label: 'Dados pessoais', icon: User },
    { key: 'empresa', label: 'Empresa / Habilitação', icon: Truck },
    { key: 'seguranca', label: 'Segurança', icon: Shield },
  ]

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans">Minha conta</p>
          <h1 className="font-serif text-2xl font-bold text-text-primary">Perfil</h1>
        </div>
        {saved && (
          <div className="flex items-center gap-1.5 text-success text-xs font-medium bg-success-light px-3 py-1.5 rounded-pill border border-success/20">
            <CheckCircle2 size={13} />
            Salvo
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 bg-surface border border-border rounded-xl p-4">
        <div className="w-14 h-14 rounded-full bg-[#E0DAD0] border border-border flex items-center justify-center font-serif text-xl font-semibold text-text-secondary flex-shrink-0">
          {pessoal.nome.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'A'}
        </div>
        <div>
          <p className="font-semibold text-text-primary">{pessoal.nome || 'Seu nome'}</p>
          <p className="text-xs text-text-muted">{pessoal.cidade ? `${pessoal.cidade} · ` : ''}{pessoal.uf}</p>
          <p className="text-xs text-text-muted mt-0.5">RNTRC: {empresa.rntrc || '—'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto gap-0">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-medium whitespace-nowrap border-b-2 transition-all uppercase tracking-[.08em] font-sans ${
              tab === key ? 'border-accent text-text-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* DADOS PESSOAIS */}
      {tab === 'pessoal' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <Input
              label="Nome completo"
              value={pessoal.nome}
              onChange={e => setPessoal(p => ({ ...p, nome: e.target.value }))}
              placeholder="Ex: Carlos Eduardo Machado"
            />
            <Input
              label="Telefone / WhatsApp"
              value={pessoal.telefone}
              onChange={e => setPessoal(p => ({ ...p, telefone: e.target.value }))}
              placeholder="(11) 99999-9999"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="CPF"
                value={pessoal.cpf}
                onChange={e => setPessoal(p => ({ ...p, cpf: e.target.value }))}
                placeholder="000.000.000-00"
              />
              <Input
                label="CNH"
                value={pessoal.cnh}
                onChange={e => setPessoal(p => ({ ...p, cnh: e.target.value }))}
                placeholder="00000000000"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Categoria CNH</label>
                <select
                  value={pessoal.cnh_categoria}
                  onChange={e => setPessoal(p => ({ ...p, cnh_categoria: e.target.value }))}
                  className="w-full border border-border rounded-lg bg-bg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
                >
                  {CATEGORIAS_CNH.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <Input
                label="Validade CNH"
                type="date"
                value={pessoal.cnh_validade}
                onChange={e => setPessoal(p => ({ ...p, cnh_validade: e.target.value }))}
              />
            </div>
            <Input
              label="Endereço"
              value={pessoal.endereco}
              onChange={e => setPessoal(p => ({ ...p, endereco: e.target.value }))}
              placeholder="Rua, número, complemento"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Cidade"
                value={pessoal.cidade}
                onChange={e => setPessoal(p => ({ ...p, cidade: e.target.value }))}
                placeholder="São Paulo"
              />
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">UF</label>
                <select
                  value={pessoal.uf}
                  onChange={e => setPessoal(p => ({ ...p, uf: e.target.value }))}
                  className="w-full border border-border rounded-lg bg-bg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
                >
                  {UFS.map(uf => <option key={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
          </div>
          <Button onClick={savePessoal} disabled={saving} className="w-full">
            {saving ? 'Salvando...' : 'Salvar dados pessoais'}
          </Button>
        </div>
      )}

      {/* EMPRESA / HABILITAÇÃO */}
      {tab === 'empresa' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Tipo de agregado</label>
              <select
                value={empresa.tipo_agregado}
                onChange={e => setEmpresa(p => ({ ...p, tipo_agregado: e.target.value }))}
                className="w-full border border-border rounded-lg bg-bg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
              >
                {TIPOS_AGREGADO.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <Input
              label="RNTRC (Registro Nacional de Transportadores Rodoviários de Cargas)"
              value={empresa.rntrc}
              onChange={e => setEmpresa(p => ({ ...p, rntrc: e.target.value }))}
              placeholder="000000000"
            />
            {empresa.tipo_agregado !== 'Motorista autônomo (CPF)' && (
              <>
                <Input
                  label="CNPJ"
                  value={empresa.cnpj}
                  onChange={e => setEmpresa(p => ({ ...p, cnpj: e.target.value }))}
                  placeholder="00.000.000/0001-00"
                />
                <Input
                  label="Razão social"
                  value={empresa.razao_social}
                  onChange={e => setEmpresa(p => ({ ...p, razao_social: e.target.value }))}
                  placeholder="Nome da empresa"
                />
                <Input
                  label="Inscrição estadual (opcional)"
                  value={empresa.inscricao_estadual}
                  onChange={e => setEmpresa(p => ({ ...p, inscricao_estadual: e.target.value }))}
                  placeholder="000.000.000.000"
                />
              </>
            )}
          </div>
          <div className="bg-info-light border border-info/20 rounded-xl p-3 text-xs text-text-secondary">
            <strong className="text-info">Atenção:</strong> O RNTRC é obrigatório para realizar fretes. Mantenha seus dados sempre atualizados para garantir elegibilidade nas vagas.
          </div>
          <Button onClick={saveEmpresa} disabled={saving} className="w-full">
            {saving ? 'Salvando...' : 'Salvar dados da empresa'}
          </Button>
        </div>
      )}

      {/* SEGURANÇA */}
      {tab === 'seguranca' && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-text-primary text-sm">Alterar senha</h2>
            <Input
              label="Nova senha"
              type="password"
              value={senhaNova}
              onChange={e => setSenhaNova(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              value={senhaConfirm}
              onChange={e => setSenhaConfirm(e.target.value)}
              placeholder="Repita a senha"
            />
            {senhaErro && (
              <p className="text-xs text-danger">{senhaErro}</p>
            )}
            {senhaOk && (
              <p className="text-xs text-success flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Senha alterada com sucesso!
              </p>
            )}
            <Button onClick={saveSenha} disabled={saving || !senhaNova || !senhaConfirm} className="w-full">
              {saving ? 'Salvando...' : 'Alterar senha'}
            </Button>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-text-primary text-sm">Conta</h2>
            <p className="text-xs text-text-secondary">
              Para excluir sua conta ou solicitar exportação dos seus dados, entre em contato com o suporte.
            </p>
            <button className="text-xs text-danger hover:underline">Solicitar exclusão de conta</button>
          </div>
        </div>
      )}
    </div>
  )
}
