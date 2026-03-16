'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { CheckCircle2, Circle, Star, Save, ChevronDown } from 'lucide-react'

const UF_BR = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

const CNH_CATS = ['A','AB','AC','AD','AE','B','C','D','E']

export default function PerfilPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Form state
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [rntrc, setRntrc] = useState('')
  const [cnhNumero, setCnhNumero] = useState('')
  const [cnhCategoria, setCnhCategoria] = useState('')
  const [cnhVencimento, setCnhVencimento] = useState('')
  const [rotas, setRotas] = useState<string[]>([])
  const [disponivel, setDisponivel] = useState(true)
  const [tipoEmpresa, setTipoEmpresa] = useState<'TAC' | 'ETC'>('TAC')

  // Stats
  const [notaMedia, setNotaMedia] = useState<number | null>(null)
  const [veiculosCount, setVeiculosCount] = useState(0)
  const [contratosCount, setContratosCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)

      const [
        { data: profile },
        { data: agregado },
        { count: vCount },
        { data: avals },
        { count: cCount },
      ] = await Promise.all([
        supabase.from('profiles').select('nome, telefone, email').eq('id', user.id).single(),
        supabase.from('agregados').select('cpf, cnh_numero, cnh_categoria, cnh_vencimento, rntrc, rotas, disponivel').eq('id', user.id).maybeSingle(),
        supabase.from('veiculos').select('*', { count: 'exact', head: true }).eq('agregado_id', user.id),
        supabase.from('avaliacoes').select('nota').eq('avaliado_id', user.id),
        supabase.from('contratos_motorista').select('*', { count: 'exact', head: true }).eq('agregado_id', user.id).eq('status', 'ativo'),
      ])

      setNome(profile?.nome ?? '')
      setTelefone(profile?.telefone ?? '')
      setEmail(profile?.email ?? user.email ?? '')
      setCpf(agregado?.cpf ?? '')
      setRntrc(agregado?.rntrc ?? '')
      setCnhNumero(agregado?.cnh_numero ?? '')
      setCnhCategoria(agregado?.cnh_categoria ?? '')
      setCnhVencimento(agregado?.cnh_vencimento ?? '')
      setRotas(agregado?.rotas ?? [])
      setDisponivel(agregado?.disponivel ?? true)
      setVeiculosCount(vCount ?? 0)
      setContratosCount(cCount ?? 0)

      if (avals?.length) {
        setNotaMedia(avals.reduce((s, a) => s + (a.nota ?? 0), 0) / avals.length)
      }
      setLoading(false)
    })
  }, [])

  const checks = [
    { label: 'Nome completo', ok: !!nome },
    { label: 'CPF / CNPJ', ok: !!cpf },
    { label: 'Telefone', ok: !!telefone },
    { label: 'E-mail', ok: !!email },
    { label: 'CNH (número, categoria, vencimento)', ok: !!cnhNumero && !!cnhCategoria && !!cnhVencimento },
    { label: 'RNTRC / ANTT', ok: !!rntrc },
    { label: 'Veículo cadastrado', ok: veiculosCount > 0 },
    { label: 'Rotas de atuação', ok: rotas.length > 0 },
  ]
  const pct = Math.round(checks.filter(c => c.ok).length / checks.length * 100)

  function toggleRota(uf: string) {
    setRotas(prev => prev.includes(uf) ? prev.filter(r => r !== uf) : [...prev, uf])
  }

  async function handleSave() {
    if (!userId) return
    setSaving(true)
    const supabase = createClient()
    await Promise.all([
      supabase.from('profiles').update({ nome, telefone, email }).eq('id', userId),
      supabase.from('agregados').upsert({
        id: userId,
        cpf,
        rntrc,
        cnh_numero: cnhNumero,
        cnh_categoria: cnhCategoria,
        cnh_vencimento: cnhVencimento || null,
        rotas,
        disponivel,
      }),
    ])
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const initials = nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'

  if (loading) return <div className="px-4 py-10 text-center text-text-muted text-sm">Carregando...</div>

  return (
    <div className="px-4 py-5 max-w-lg mx-auto md:mx-0">
      {/* Hero */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-bg font-serif text-2xl font-medium flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif text-xl font-medium text-text-primary truncate">{nome || 'Sem nome'}</h1>
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent text-bg">
              {tipoEmpresa}
            </span>
          </div>
          {notaMedia !== null ? (
            <div className="flex items-center gap-1 mt-0.5">
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={11} className={i <= Math.round(notaMedia) ? 'fill-gold text-gold' : 'text-border'} />
              ))}
              <span className="text-xs text-text-muted ml-1">{notaMedia.toFixed(1)} · {contratosCount} contrato{contratosCount !== 1 ? 's' : ''}</span>
            </div>
          ) : (
            <p className="text-xs text-text-muted mt-0.5">Sem avaliações · {contratosCount} contrato{contratosCount !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      {/* TAC / ETC toggle */}
      <div className="flex gap-2 mb-5">
        {(['TAC', 'ETC'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTipoEmpresa(t)}
            className={`flex-1 py-2 rounded-full text-[13px] font-sans font-medium transition-colors border
              ${tipoEmpresa === t
                ? 'bg-accent text-bg border-accent'
                : 'bg-bg text-text-secondary border-border hover:bg-surface'}`}
          >
            {t === 'TAC' ? 'TAC — Autônomo' : 'ETC — Empresa'}
          </button>
        ))}
      </div>

      {/* Checklist de completude */}
      <div className="bg-surface border border-border rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-sans font-medium text-text-primary">Completude do perfil</p>
          <span className="font-serif text-xl font-medium text-text-primary">{pct}%</span>
        </div>
        <div className="h-1.5 bg-border rounded-full mb-3 overflow-hidden">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: pct === 100 ? 'var(--color-success)' : pct >= 60 ? 'var(--color-gold)' : 'var(--color-warning)' }}
          />
        </div>
        <div className="space-y-1.5">
          {checks.map(c => (
            <div key={c.label} className="flex items-center gap-2">
              {c.ok
                ? <CheckCircle2 size={14} className="text-success flex-shrink-0" />
                : <Circle size={14} className="text-border flex-shrink-0" />}
              <span className={`text-xs font-sans ${c.ok ? 'text-text-secondary' : 'text-text-primary'}`}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Seção: Dados pessoais */}
      <section className="mb-5">
        <h2 className="font-sans text-[11px] font-bold uppercase tracking-[.12em] text-text-muted mb-3">Dados pessoais</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Nome completo</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-sm text-text-primary focus:outline-none focus:border-accent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-text-muted mb-1">CPF / CNPJ</label>
              <input
                value={cpf}
                onChange={e => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[11px] text-text-muted mb-1">Telefone</label>
              <input
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">E-mail</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              type="email"
              className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-sm text-text-primary focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">RNTRC / ANTT</label>
            <input
              value={rntrc}
              onChange={e => setRntrc(e.target.value)}
              placeholder="Número RNTRC"
              className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-sm text-text-primary focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      </section>

      {/* Seção: CNH */}
      <section className="mb-5">
        <h2 className="font-sans text-[11px] font-bold uppercase tracking-[.12em] text-text-muted mb-3">CNH</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-text-muted mb-1">Número da CNH</label>
              <input
                value={cnhNumero}
                onChange={e => setCnhNumero(e.target.value)}
                placeholder="00000000000"
                className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[11px] text-text-muted mb-1">Categoria</label>
              <div className="relative">
                <select
                  value={cnhCategoria}
                  onChange={e => setCnhCategoria(e.target.value)}
                  className="w-full h-10 px-3 pr-8 rounded-lg border border-border bg-bg text-sm text-text-primary appearance-none focus:outline-none focus:border-accent"
                >
                  <option value="">Selecione</option>
                  {CNH_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Vencimento</label>
            <input
              value={cnhVencimento}
              onChange={e => setCnhVencimento(e.target.value)}
              type="date"
              className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-sm text-text-primary focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      </section>

      {/* Seção: Rotas de atuação */}
      <section className="mb-5">
        <h2 className="font-sans text-[11px] font-bold uppercase tracking-[.12em] text-text-muted mb-3">
          Rotas de atuação
          <span className="ml-2 normal-case text-[10px] font-normal">{rotas.length} estado{rotas.length !== 1 ? 's' : ''} selecionado{rotas.length !== 1 ? 's' : ''}</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {UF_BR.map(uf => (
            <button
              key={uf}
              onClick={() => toggleRota(uf)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-sans font-medium border transition-colors
                ${rotas.includes(uf)
                  ? 'bg-accent text-bg border-accent'
                  : 'bg-bg text-text-secondary border-border hover:bg-surface'}`}
            >
              {uf}
            </button>
          ))}
        </div>
      </section>

      {/* Seção: Disponibilidade */}
      <section className="mb-6">
        <h2 className="font-sans text-[11px] font-bold uppercase tracking-[.12em] text-text-muted mb-3">Disponibilidade</h2>
        <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-4">
          <div>
            <p className="text-sm font-sans font-medium text-text-primary">Disponível para novas vagas</p>
            <p className="text-xs text-text-muted mt-0.5">
              {disponivel ? 'Seu perfil aparece nas buscas das transportadoras' : 'Perfil oculto nas buscas'}
            </p>
          </div>
          <button
            onClick={() => setDisponivel(d => !d)}
            className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0
              ${disponivel ? 'bg-success' : 'bg-border'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform
              ${disponivel ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </section>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full h-11 rounded-xl font-sans font-medium text-sm flex items-center justify-center gap-2 transition-colors
          ${saved ? 'bg-success text-white' : 'bg-accent text-bg hover:bg-accent/90'}`}
      >
        {saving ? (
          <span className="text-sm">Salvando...</span>
        ) : saved ? (
          <><CheckCircle2 size={16} /> Salvo com sucesso!</>
        ) : (
          <><Save size={16} /> Salvar alterações →</>
        )}
      </button>
    </div>
  )
}
