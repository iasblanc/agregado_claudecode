'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import {
  CheckCircle2, Loader2, Star, Shield, Lock,
  ChevronRight, ToggleLeft,
} from 'lucide-react'

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']
const CATEGORIAS_CNH = ['A','B','AB','C','D','E','AC','AD','AE']

interface ProfileData {
  nome: string
  telefone: string
  email: string
  cpf: string
  cnh: string
  cnh_categoria: string
  cnh_validade: string
  endereco: string
  cidade: string
  uf: string
  rntrc: string
  cnpj: string
  razao_social: string
  inscricao_estadual: string
  tipo_agregado: string // 'TAC' | 'ETC'
  rotas_atuacao: string[]
  disponivel: boolean
  anos_experiencia: number
}

// Completion checklist items
const CHECKLIST = [
  { key: 'nome',         label: 'Nome completo',        check: (p: ProfileData) => p.nome.trim().length > 3 },
  { key: 'telefone',     label: 'Telefone',             check: (p: ProfileData) => p.telefone.trim().length > 8 },
  { key: 'cpf',         label: 'CPF',                  check: (p: ProfileData) => p.cpf.trim().length >= 11 },
  { key: 'cnh',         label: 'CNH',                  check: (p: ProfileData) => p.cnh.trim().length >= 8 },
  { key: 'cnh_validade', label: 'Validade da CNH',      check: (p: ProfileData) => !!p.cnh_validade },
  { key: 'rntrc',       label: 'RNTRC',                check: (p: ProfileData) => p.rntrc.trim().length >= 7 },
  { key: 'rotas',       label: 'Rotas de atuação',     check: (p: ProfileData) => p.rotas_atuacao.length > 0 },
  { key: 'cidade',      label: 'Cidade / UF',          check: (p: ProfileData) => p.cidade.trim().length > 1 },
]

export default function PerfilPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<'perfil' | 'empresa' | 'seguranca'>('perfil')

  const [profile, setProfile] = useState<ProfileData>({
    nome: '', telefone: '', email: '', cpf: '', cnh: '',
    cnh_categoria: 'E', cnh_validade: '', endereco: '', cidade: '', uf: 'SP',
    rntrc: '', cnpj: '', razao_social: '', inscricao_estadual: '',
    tipo_agregado: 'TAC', rotas_atuacao: [], disponivel: true, anos_experiencia: 0,
  })
  const [nota, setNota] = useState(0)
  const [totalAvaliacoes, setTotalAvaliacoes] = useState(0)

  // Senha
  const [senhaNova, setSenhaNova] = useState('')
  const [senhaConfirm, setSenhaConfirm] = useState('')
  const [senhaErro, setSenhaErro] = useState('')
  const [senhaOk, setSenhaOk] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const [{ data: prof }, { data: agr }, { data: avals }] = await Promise.all([
        supabase.from('profiles').select('nome, telefone, email').eq('id', user.id).single(),
        supabase.from('agregados').select('cpf, cnh, cnh_categoria, cnh_validade, endereco, cidade, uf, rntrc, cnpj, razao_social, inscricao_estadual, tipo_agregado, rotas_atuacao, disponivel, anos_experiencia').eq('id', user.id).single(),
        supabase.from('avaliacoes').select('nota_geral').eq('agregado_id', user.id),
      ])

      if (prof || agr) {
        const a = agr as Record<string, unknown> | null
        setProfile({
          nome: (prof?.nome as string) ?? '',
          telefone: (prof?.telefone as string) ?? '',
          email: (prof?.email as string) ?? user.email ?? '',
          cpf: (a?.cpf as string) ?? '',
          cnh: (a?.cnh as string) ?? '',
          cnh_categoria: (a?.cnh_categoria as string) ?? 'E',
          cnh_validade: (a?.cnh_validade as string) ?? '',
          endereco: (a?.endereco as string) ?? '',
          cidade: (a?.cidade as string) ?? '',
          uf: (a?.uf as string) ?? 'SP',
          rntrc: (a?.rntrc as string) ?? '',
          cnpj: (a?.cnpj as string) ?? '',
          razao_social: (a?.razao_social as string) ?? '',
          inscricao_estadual: (a?.inscricao_estadual as string) ?? '',
          tipo_agregado: (a?.tipo_agregado as string) ?? 'TAC',
          rotas_atuacao: (a?.rotas_atuacao as string[]) ?? [],
          disponivel: (a?.disponivel as boolean) ?? true,
          anos_experiencia: (a?.anos_experiencia as number) ?? 0,
        })
      }

      if (avals && avals.length > 0) {
        const total = avals.reduce((s, av) => s + ((av as Record<string, number>).nota_geral ?? 0), 0)
        setNota(total / avals.length)
        setTotalAvaliacoes(avals.length)
      }

      setLoading(false)
    }
    load()
  }, [router])

  // Completion %
  const doneCount = CHECKLIST.filter(item => item.check(profile)).length
  const completionPct = Math.round((doneCount / CHECKLIST.length) * 100)

  function toggleRota(uf: string) {
    setProfile(p => ({
      ...p,
      rotas_atuacao: p.rotas_atuacao.includes(uf)
        ? p.rotas_atuacao.filter(r => r !== uf)
        : [...p.rotas_atuacao, uf],
    }))
  }

  async function savePerfil() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await Promise.all([
      supabase.from('profiles').update({
        nome: profile.nome.trim(),
        telefone: profile.telefone.trim(),
      }).eq('id', user.id),
      supabase.from('agregados').update({
        cpf: profile.cpf.trim(),
        cnh: profile.cnh.trim(),
        cnh_categoria: profile.cnh_categoria,
        cnh_validade: profile.cnh_validade || null,
        endereco: profile.endereco.trim(),
        cidade: profile.cidade.trim(),
        uf: profile.uf,
        rntrc: profile.rntrc.trim(),
        tipo_agregado: profile.tipo_agregado,
        rotas_atuacao: profile.rotas_atuacao,
        disponivel: profile.disponivel,
        anos_experiencia: profile.anos_experiencia,
      }).eq('id', user.id),
    ])

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function saveEmpresa() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('agregados').update({
      cnpj: profile.cnpj.trim() || null,
      razao_social: profile.razao_social.trim() || null,
      inscricao_estadual: profile.inscricao_estadual.trim() || null,
    }).eq('id', user.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function saveSenha() {
    setSenhaErro('')
    if (senhaNova !== senhaConfirm) { setSenhaErro('As senhas não coincidem.'); return }
    if (senhaNova.length < 8) { setSenhaErro('Mínimo 8 caracteres.'); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: senhaNova })
    setSaving(false)
    if (error) { setSenhaErro(error.message); return }
    setSenhaOk(true)
    setSenhaNova(''); setSenhaConfirm('')
    setTimeout(() => setSenhaOk(false), 4000)
  }

  const initials = profile.nome.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'A'
  const tipoLabel = profile.tipo_agregado === 'ETC' ? 'Empresa de Transporte' : 'Transportador Autônomo'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={28} className="animate-spin text-text-muted" />
      </div>
    )
  }

  return (
    <div className="px-4 py-5 space-y-5 max-w-2xl">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-[#2D2B26] flex items-center justify-center font-serif text-2xl font-bold text-[#F5F2EC] flex-shrink-0 shadow-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-[22px] font-bold text-text-primary leading-tight truncate">
              {profile.nome || 'Seu nome'}
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              {profile.tipo_agregado} · {tipoLabel}
            </p>
            {totalAvaliacoes > 0 && (
              <div className="flex items-center gap-1 mt-1">
                {[1,2,3,4,5].map(i => (
                  <Star
                    key={i}
                    size={13}
                    className={i <= Math.round(nota) ? 'text-[#C8A84B] fill-[#C8A84B]' : 'text-border'}
                  />
                ))}
                <span className="text-[11px] text-text-muted ml-0.5">{nota.toFixed(1)} ({totalAvaliacoes})</span>
              </div>
            )}
          </div>
          {/* Disponível toggle */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <span className="text-[9px] uppercase tracking-widest text-text-muted font-sans">Disponível</span>
            <button
              onClick={() => setProfile(p => ({ ...p, disponivel: !p.disponivel }))}
              className={`relative w-[52px] h-[28px] rounded-full transition-colors duration-200 focus:outline-none ${
                profile.disponivel ? 'bg-[#3A6B4A]' : 'bg-border'
              }`}
              aria-label="Toggle disponibilidade"
            >
              <span
                className={`absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  profile.disponivel ? 'translate-x-[26px]' : 'translate-x-[3px]'
                }`}
              />
            </button>
            <span className={`text-[10px] font-medium font-sans ${profile.disponivel ? 'text-[#3A6B4A]' : 'text-text-muted'}`}>
              {profile.disponivel ? 'Sim' : 'Não'}
            </span>
          </div>
        </div>

        {/* Completion bar */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-text-muted font-sans uppercase tracking-widest">Completude do perfil</span>
            <span className={`text-[11px] font-semibold font-sans ${completionPct === 100 ? 'text-[#3A6B4A]' : 'text-[#C26B3A]'}`}>
              {completionPct}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#E0DAD0] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${completionPct === 100 ? 'bg-[#3A6B4A]' : 'bg-[#C26B3A]'}`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          {completionPct < 100 && (
            <div className="mt-2.5 space-y-1">
              {CHECKLIST.filter(item => !item.check(profile)).slice(0, 3).map(item => (
                <div key={item.key} className="flex items-center gap-2 text-[11px] text-text-muted">
                  <div className="w-3.5 h-3.5 rounded-full border border-border flex-shrink-0" />
                  <span>{item.label}</span>
                  <ChevronRight size={10} className="ml-auto" />
                </div>
              ))}
            </div>
          )}
          {completionPct === 100 && (
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#3A6B4A]">
              <CheckCircle2 size={13} className="fill-[#3A6B4A] text-white" />
              Perfil completo — elegível para todas as vagas
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="flex border-b border-border gap-0">
        {([
          { key: 'perfil',    label: 'Perfil' },
          { key: 'empresa',   label: 'Empresa' },
          { key: 'seguranca', label: 'Segurança' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-[11px] font-medium whitespace-nowrap border-b-2 transition-all uppercase tracking-[.08em] font-sans ${
              tab === key ? 'border-[#2D2B26] text-text-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Perfil ───────────────────────────────────────── */}
      {tab === 'perfil' && (
        <div className="space-y-5">

          {/* TAC / ETC toggle */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans mb-2">Tipo de transportador</p>
            <div className="flex gap-2">
              {(['TAC','ETC'] as const).map(tipo => (
                <button
                  key={tipo}
                  onClick={() => setProfile(p => ({ ...p, tipo_agregado: tipo }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium font-sans border transition-all ${
                    profile.tipo_agregado === tipo
                      ? 'bg-[#2D2B26] text-[#F5F2EC] border-[#2D2B26]'
                      : 'bg-bg text-text-secondary border-border hover:border-[#2D2B26]/40'
                  }`}
                >
                  <span className="font-bold">{tipo}</span>
                  <span className="text-[10px] block font-normal opacity-80">
                    {tipo === 'TAC' ? 'Transportador Autônomo' : 'Empresa de Transporte'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Dados pessoais */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans mb-2">Dados pessoais</p>
            <div className="space-y-3">
              <Input
                label="Nome completo"
                value={profile.nome}
                onChange={e => setProfile(p => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Carlos Eduardo Machado"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="CPF"
                  value={profile.cpf}
                  onChange={e => setProfile(p => ({ ...p, cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                />
                <Input
                  label="Telefone"
                  value={profile.telefone}
                  onChange={e => setProfile(p => ({ ...p, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <Input
                label="E-mail"
                value={profile.email}
                disabled
                onChange={() => {}}
                placeholder="email@exemplo.com"
              />
              <Input
                label="RNTRC"
                value={profile.rntrc}
                onChange={e => setProfile(p => ({ ...p, rntrc: e.target.value }))}
                placeholder="000000000"
              />
            </div>
          </div>

          {/* CNH */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans mb-2">Habilitação (CNH)</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Número da CNH"
                  value={profile.cnh}
                  onChange={e => setProfile(p => ({ ...p, cnh: e.target.value }))}
                  placeholder="00000000000"
                />
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Categoria</label>
                  <select
                    value={profile.cnh_categoria}
                    onChange={e => setProfile(p => ({ ...p, cnh_categoria: e.target.value }))}
                    className="w-full border border-border rounded-lg bg-bg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
                  >
                    {CATEGORIAS_CNH.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <Input
                label="Validade da CNH"
                type="date"
                value={profile.cnh_validade}
                onChange={e => setProfile(p => ({ ...p, cnh_validade: e.target.value }))}
              />
            </div>
          </div>

          {/* Localização */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans mb-2">Localização</p>
            <div className="space-y-3">
              <Input
                label="Endereço"
                value={profile.endereco}
                onChange={e => setProfile(p => ({ ...p, endereco: e.target.value }))}
                placeholder="Rua, número, complemento"
              />
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Input
                    label="Cidade"
                    value={profile.cidade}
                    onChange={e => setProfile(p => ({ ...p, cidade: e.target.value }))}
                    placeholder="São Paulo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">UF base</label>
                  <select
                    value={profile.uf}
                    onChange={e => setProfile(p => ({ ...p, uf: e.target.value }))}
                    className="w-full border border-border rounded-lg bg-bg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
                  >
                    {UFS.map(uf => <option key={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Anos de experiência */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans mb-2">Experiência</p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0} max={30}
                value={profile.anos_experiencia}
                onChange={e => setProfile(p => ({ ...p, anos_experiencia: Number(e.target.value) }))}
                className="flex-1 accent-[#2D2B26]"
              />
              <span className="font-serif text-lg font-bold text-text-primary w-16 text-right">
                {profile.anos_experiencia} {profile.anos_experiencia === 1 ? 'ano' : 'anos'}
              </span>
            </div>
          </div>

          {/* Rotas de atuação */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans mb-2">
              Rotas de atuação
              <span className="ml-2 normal-case tracking-normal text-text-muted font-normal">
                ({profile.rotas_atuacao.length} selecionado{profile.rotas_atuacao.length !== 1 ? 's' : ''})
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {UFS.map(uf => {
                const selected = profile.rotas_atuacao.includes(uf)
                return (
                  <button
                    key={uf}
                    onClick={() => toggleRota(uf)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium font-sans transition-all border ${
                      selected
                        ? 'bg-[#2D2B26] text-[#F5F2EC] border-[#2D2B26]'
                        : 'bg-bg text-text-muted border-border hover:border-[#2D2B26]/40 hover:text-text-secondary'
                    }`}
                  >
                    {uf}
                  </button>
                )
              })}
            </div>
            {profile.rotas_atuacao.length > 0 && (
              <button
                onClick={() => setProfile(p => ({ ...p, rotas_atuacao: [] }))}
                className="mt-2 text-[11px] text-text-muted hover:text-danger transition-colors"
              >
                Limpar seleção
              </button>
            )}
          </div>

          {/* Save */}
          <button
            onClick={savePerfil}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-[#2D2B26] text-[#F5F2EC] py-3.5 rounded-xl font-serif text-base font-semibold hover:bg-[#1a1917] transition-colors disabled:opacity-50"
          >
            {saving ? (
              <><Loader2 size={16} className="animate-spin" /> Salvando...</>
            ) : saved ? (
              <><CheckCircle2 size={16} /> Perfil salvo!</>
            ) : (
              <>Salvar alterações <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      )}

      {/* ── Tab: Empresa ──────────────────────────────────────── */}
      {tab === 'empresa' && (
        <div className="space-y-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-sans mb-2">Dados empresariais</p>
            <div className="space-y-3">
              <Input
                label="CNPJ (se ETC ou MEI)"
                value={profile.cnpj}
                onChange={e => setProfile(p => ({ ...p, cnpj: e.target.value }))}
                placeholder="00.000.000/0001-00"
              />
              <Input
                label="Razão social"
                value={profile.razao_social}
                onChange={e => setProfile(p => ({ ...p, razao_social: e.target.value }))}
                placeholder="Nome da empresa"
              />
              <Input
                label="Inscrição estadual (opcional)"
                value={profile.inscricao_estadual}
                onChange={e => setProfile(p => ({ ...p, inscricao_estadual: e.target.value }))}
                placeholder="000.000.000.000"
              />
            </div>
          </div>
          <div className="bg-info-light border border-info/20 rounded-xl p-3 text-xs text-text-secondary">
            <strong className="text-info">RNTRC obrigatório:</strong> Mantenha seus dados sempre atualizados para garantir elegibilidade nas vagas. O RNTRC pode ser editado na aba Perfil.
          </div>
          <button
            onClick={saveEmpresa}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-[#2D2B26] text-[#F5F2EC] py-3.5 rounded-xl font-serif text-base font-semibold hover:bg-[#1a1917] transition-colors disabled:opacity-50"
          >
            {saving ? (
              <><Loader2 size={16} className="animate-spin" /> Salvando...</>
            ) : saved ? (
              <><CheckCircle2 size={16} /> Salvo!</>
            ) : (
              <>Salvar dados da empresa <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      )}

      {/* ── Tab: Segurança ────────────────────────────────────── */}
      {tab === 'seguranca' && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Lock size={15} className="text-text-muted" />
              <h2 className="font-semibold text-text-primary text-sm">Alterar senha</h2>
            </div>
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
            {senhaErro && <p className="text-xs text-danger">{senhaErro}</p>}
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
            <div className="flex items-center gap-2 mb-1">
              <Shield size={15} className="text-text-muted" />
              <h2 className="font-semibold text-text-primary text-sm">Conta</h2>
            </div>
            <p className="text-xs text-text-secondary">
              Para excluir sua conta ou exportar seus dados, entre em contato com o suporte.
            </p>
            <button className="text-xs text-danger hover:underline">Solicitar exclusão de conta</button>
          </div>
        </div>
      )}
    </div>
  )
}
