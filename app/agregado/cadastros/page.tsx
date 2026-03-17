'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import {
  TIPOS_VEICULO, TIPOS_EQUIPAMENTO,
  type Veiculo, type Equipamento, type Motorista,
} from '@/lib/types'
import {
  Plus, Trash2, Truck, Package, User,
  AlertTriangle, CheckCircle2, Camera, X,
  Phone, CreditCard, Weight,
} from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function docBadge(dateStr: string | null | undefined) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0)    return { label: 'Vencido',        cls: 'bg-danger-light text-danger',   icon: false }
  if (days <= 30)  return { label: `Vence em ${days}d`, cls: 'bg-warning-light text-warning', icon: false }
  return             { label: 'OK',                  cls: 'bg-success-light text-success',  icon: true }
}

const CNH_CATEGORIAS = ['B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE', 'ACC']

// ── Photo picker ──────────────────────────────────────────────────────────────

interface PhotoPickerProps {
  files: File[]
  maxPhotos: number
  onChange: (files: File[]) => void
  label?: string
}

function PhotoPicker({ files, maxPhotos, onChange, label }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? [])
    const combined = [...files, ...newFiles].slice(0, maxPhotos)
    onChange(combined)
    e.target.value = ''
  }

  function remove(i: number) {
    onChange(files.filter((_, idx) => idx !== i))
  }

  const slots = maxPhotos === 1 ? 1 : 4

  return (
    <div>
      {label && (
        <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-sans">{label}</p>
      )}
      <div className={`grid gap-2 ${slots === 1 ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {files.map((f, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={URL.createObjectURL(f)}
              alt={`Foto ${i + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X size={10} className="text-white" />
            </button>
          </div>
        ))}
        {files.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-text-muted hover:border-accent/40 hover:bg-surface hover:text-accent transition-colors"
          >
            <Camera size={18} />
            <span className="text-[10px] mt-1 font-sans">
              {files.length === 0 ? 'Adicionar' : 'Mais'}
            </span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={maxPhotos > 1}
        className="hidden"
        onChange={handleSelect}
      />
      {maxPhotos > 1 && (
        <p className="text-[10px] text-text-muted mt-1.5 font-sans">
          {files.length}/{maxPhotos} fotos selecionadas
        </p>
      )}
    </div>
  )
}

// ── Thumbnail com fallback ────────────────────────────────────────────────────

function PhotoThumb({ src, fallback }: { src?: string | null; fallback: React.ReactNode }) {
  if (src) {
    return (
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
      {fallback}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'veiculos' | 'equipamentos' | 'motoristas'

export default function CadastrosPage() {
  const [activeTab, setActiveTab]   = useState<Tab>('veiculos')
  const [veiculos, setVeiculos]     = useState<Veiculo[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [userId, setUserId]         = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Vehicle form ──────────────────────────────────────────────────────────
  const [vTipo,      setVTipo]      = useState<string>(TIPOS_VEICULO[0])
  const [vPlaca,     setVPlaca]     = useState('')
  const [vAno,       setVAno]       = useState('')
  const [vModelo,    setVModelo]    = useState('')
  const [vCor,       setVCor]       = useState('')
  const [vValor,     setVValor]     = useState('')
  const [vRenavam,   setVRenavam]   = useState('')
  const [vCrlvVenc,  setVCrlvVenc]  = useState('')
  const [vSeguroVenc,setVSeguroVenc]= useState('')
  const [vFotos,     setVFotos]     = useState<File[]>([])

  // ── Equipment form ────────────────────────────────────────────────────────
  const [eTipo,       setETipo]      = useState<string>(TIPOS_EQUIPAMENTO[0])
  const [ePlaca,      setEPlaca]     = useState('')
  const [eAno,        setEAno]       = useState('')
  const [eCapacidade, setECapacidade]= useState('')
  const [eTara,       setETara]      = useState('')
  const [eCrlvVenc,   setECrlvVenc]  = useState('')
  const [eFoto,       setEFoto]      = useState<File[]>([])

  // ── Motorista form ────────────────────────────────────────────────────────
  const [mNome,        setMNome]        = useState('')
  const [mTelefone,    setMTelefone]    = useState('')
  const [mCnh,         setMCnh]         = useState('')
  const [mCnhCategoria,setMCnhCategoria]= useState('')
  const [mCnhVenc,     setMCnhVenc]     = useState('')
  const [mFoto,        setMFoto]        = useState<File[]>([])

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await Promise.all([
        fetchVeiculos(user.id),
        fetchEquipamentos(user.id),
        fetchMotoristas(user.id),
      ])
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchVeiculos(uid: string) {
    const { data } = await supabase.from('veiculos').select('*').eq('agregado_id', uid).order('created_at', { ascending: false })
    if (data) setVeiculos(data)
  }
  async function fetchEquipamentos(uid: string) {
    const { data } = await supabase.from('equipamentos').select('*').eq('agregado_id', uid).order('created_at', { ascending: false })
    if (data) setEquipamentos(data)
  }
  async function fetchMotoristas(uid: string) {
    const { data } = await supabase.from('motoristas').select('*').eq('agregado_id', uid).order('created_at', { ascending: false })
    if (data) setMotoristas(data)
  }

  function resetForms() {
    setVTipo(TIPOS_VEICULO[0]); setVPlaca(''); setVAno(''); setVModelo(''); setVCor('')
    setVValor(''); setVRenavam(''); setVCrlvVenc(''); setVSeguroVenc(''); setVFotos([])
    setETipo(TIPOS_EQUIPAMENTO[0]); setEPlaca(''); setEAno(''); setECapacidade('')
    setETara(''); setECrlvVenc(''); setEFoto([])
    setMNome(''); setMTelefone(''); setMCnh(''); setMCnhCategoria(''); setMCnhVenc(''); setMFoto([])
  }

  function openModal() { resetForms(); setModalOpen(true) }

  // ── Upload helper ─────────────────────────────────────────────────────────
  async function uploadFoto(file: File, path: string): Promise<string | null> {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const fullPath = `${path}.${ext}`
    const { error } = await supabase.storage.from('frota-fotos').upload(fullPath, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('frota-fotos').getPublicUrl(fullPath)
    return data.publicUrl
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!userId) return
    setSaving(true)
    try {
      if (activeTab === 'veiculos') {
        if (!vPlaca.trim()) return
        const { data, error } = await supabase.from('veiculos').insert({
          agregado_id: userId,
          tipo:        vTipo,
          placa:       vPlaca.trim().toUpperCase(),
          ano:         vAno ? parseInt(vAno) : null,
          modelo:      vModelo.trim() || null,
          cor:         vCor.trim() || null,
          renavam:     vRenavam.trim() || null,
          valor_veiculo: vValor ? parseFloat(vValor.replace(',', '.')) : null,
          crlv_venc:   vCrlvVenc || null,
          seguro_venc: vSeguroVenc || null,
        }).select().single()
        if (!error && data) {
          // Upload up to 4 fotos
          if (vFotos.length > 0) {
            const urls: string[] = []
            for (let i = 0; i < vFotos.length; i++) {
              const url = await uploadFoto(vFotos[i], `${userId}/veiculos/${data.id}/${i}`)
              if (url) urls.push(url)
            }
            if (urls.length > 0) {
              await supabase.from('veiculos').update({ fotos: urls }).eq('id', data.id)
            }
          }
          await fetchVeiculos(userId)
          setModalOpen(false)
        }

      } else if (activeTab === 'equipamentos') {
        const { data, error } = await supabase.from('equipamentos').insert({
          agregado_id: userId,
          tipo:        eTipo,
          placa:       ePlaca.trim() ? ePlaca.trim().toUpperCase() : null,
          ano:         eAno ? parseInt(eAno) : null,
          capacidade:  eCapacidade.trim() || null,
          tara:        eTara ? parseFloat(eTara.replace(',', '.')) : null,
          crlv_venc:   eCrlvVenc || null,
        }).select().single()
        if (!error && data) {
          if (eFoto.length > 0) {
            const url = await uploadFoto(eFoto[0], `${userId}/equipamentos/${data.id}/foto`)
            if (url) await supabase.from('equipamentos').update({ foto_url: url }).eq('id', data.id)
          }
          await fetchEquipamentos(userId)
          setModalOpen(false)
        }

      } else {
        if (!mNome.trim()) return
        const { data, error } = await supabase.from('motoristas').insert({
          agregado_id:   userId,
          nome:          mNome.trim(),
          telefone:      mTelefone.trim() || null,
          cnh:           mCnh.trim() || null,
          cnh_categoria: mCnhCategoria || null,
          cnh_venc:      mCnhVenc || null,
        }).select().single()
        if (!error && data) {
          if (mFoto.length > 0) {
            const url = await uploadFoto(mFoto[0], `${userId}/motoristas/${data.id}/foto`)
            if (url) await supabase.from('motoristas').update({ foto_url: url }).eq('id', data.id)
          }
          await fetchMotoristas(userId)
          setModalOpen(false)
        }
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!userId || !confirm('Excluir este cadastro?')) return
    setDeletingId(id)
    try {
      if (activeTab === 'veiculos') {
        await supabase.from('veiculos').delete().eq('id', id)
        await fetchVeiculos(userId)
      } else if (activeTab === 'equipamentos') {
        await supabase.from('equipamentos').delete().eq('id', id)
        await fetchEquipamentos(userId)
      } else {
        await supabase.from('motoristas').delete().eq('id', id)
        await fetchMotoristas(userId)
      }
    } finally {
      setDeletingId(null)
    }
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'veiculos',     label: 'Veículos',     icon: <Truck size={16} />,   count: veiculos.length },
    { key: 'equipamentos', label: 'Equipamentos', icon: <Package size={16} />, count: equipamentos.length },
    { key: 'motoristas',   label: 'Motoristas',   icon: <User size={16} />,    count: motoristas.length },
  ]

  const modalTitle =
    activeTab === 'veiculos'     ? 'Novo Veículo'      :
    activeTab === 'equipamentos' ? 'Novo Equipamento'  : 'Novo Motorista'

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif font-semibold text-2xl text-text-primary">Cadastros</h1>
          <p className="text-sm text-text-secondary mt-1">Gerencie seus veículos, equipamentos e motoristas.</p>
        </div>
        <Button size="sm" onClick={openModal}>
          <Plus size={16} />
          Adicionar
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-sm font-medium font-sans transition-all duration-150
              ${activeTab === tab.key
                ? 'bg-accent text-[#F5F2EC] shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-[#E0DAD0]'
              }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden text-xs">{tab.label.slice(0, 3)}</span>
            <Badge variant={activeTab === tab.key ? 'light' : 'muted'} className="ml-0.5 text-xs">
              {tab.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-surface border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">

          {/* ── Veículos ── */}
          {activeTab === 'veiculos' && (
            <>
              {veiculos.length === 0 ? (
                <EmptyState icon={<Truck size={32} />} text="Nenhum veículo cadastrado" />
              ) : veiculos.map(v => {
                const crlvBadge   = docBadge(v.crlv_venc)
                const seguroBadge = docBadge(v.seguro_venc)
                const fotos       = v.fotos ?? []
                return (
                  <div key={v.id} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <PhotoThumb src={fotos[0]} fallback={<Truck size={18} className="text-accent" />} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-text-primary text-sm font-sans">{v.placa}</span>
                            <Badge variant="muted">{v.tipo}</Badge>
                          </div>
                          <button
                            onClick={() => handleDelete(v.id)}
                            disabled={deletingId === v.id}
                            className="p-1.5 rounded-lg hover:bg-danger-light text-text-muted hover:text-danger transition-colors disabled:opacity-50 flex-shrink-0"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="text-xs text-text-muted font-sans mt-0.5 flex flex-wrap gap-x-2">
                          {v.modelo && <span>{v.modelo}</span>}
                          {v.ano && <span>Ano {v.ano}</span>}
                          {v.cor && <span>{v.cor}</span>}
                          {v.valor_veiculo && (
                            <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.valor_veiculo)}</span>
                          )}
                        </div>
                        {/* Doc badges */}
                        {(crlvBadge || seguroBadge) && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {crlvBadge && (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${crlvBadge.cls}`}>
                                {crlvBadge.icon ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                                CRLV {crlvBadge.label}
                              </span>
                            )}
                            {seguroBadge && (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${seguroBadge.cls}`}>
                                {seguroBadge.icon ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                                Seguro {seguroBadge.label}
                              </span>
                            )}
                          </div>
                        )}
                        {/* Fotos extras (thumb row) */}
                        {fotos.length > 1 && (
                          <div className="flex gap-1.5 mt-2">
                            {fotos.slice(1).map((url, i) => (
                              <div key={i} className="w-8 h-8 rounded-md overflow-hidden border border-border">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* ── Equipamentos ── */}
          {activeTab === 'equipamentos' && (
            <>
              {equipamentos.length === 0 ? (
                <EmptyState icon={<Package size={32} />} text="Nenhum equipamento cadastrado" />
              ) : equipamentos.map(e => {
                const crlvBadge = docBadge(e.crlv_venc)
                return (
                  <div key={e.id} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <PhotoThumb src={e.foto_url} fallback={<Package size={18} className="text-accent" />} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-text-primary text-sm font-sans">{e.tipo}</span>
                          <button
                            onClick={() => handleDelete(e.id)}
                            disabled={deletingId === e.id}
                            className="p-1.5 rounded-lg hover:bg-danger-light text-text-muted hover:text-danger transition-colors disabled:opacity-50 flex-shrink-0"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="text-xs text-text-muted font-sans mt-0.5 flex flex-wrap gap-x-2">
                          {e.placa && <span>Placa: {e.placa}</span>}
                          {e.ano && <span>Ano {e.ano}</span>}
                          {e.capacidade && <span>Cap. {e.capacidade}</span>}
                          {e.tara && <span>Tara {e.tara.toLocaleString('pt-BR')} kg</span>}
                        </div>
                        {crlvBadge && (
                          <div className="flex gap-2 mt-2">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${crlvBadge.cls}`}>
                              {crlvBadge.icon ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                              CRLV {crlvBadge.label}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* ── Motoristas ── */}
          {activeTab === 'motoristas' && (
            <>
              {motoristas.length === 0 ? (
                <EmptyState icon={<User size={32} />} text="Nenhum motorista cadastrado" />
              ) : motoristas.map(m => {
                const cnhBadge = docBadge(m.cnh_venc)
                const initials = m.nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <div key={m.id} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      {m.foto_url ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.foto_url} alt={m.nome} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 font-serif text-sm font-semibold text-accent">
                          {initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-text-primary text-sm font-sans">{m.nome}</span>
                          <button
                            onClick={() => handleDelete(m.id)}
                            disabled={deletingId === m.id}
                            className="p-1.5 rounded-lg hover:bg-danger-light text-text-muted hover:text-danger transition-colors disabled:opacity-50 flex-shrink-0"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="text-xs text-text-muted font-sans mt-0.5 flex flex-wrap gap-x-2">
                          {m.telefone && (
                            <span className="flex items-center gap-1"><Phone size={10} />{m.telefone}</span>
                          )}
                          {m.cnh && (
                            <span className="flex items-center gap-1">
                              <CreditCard size={10} />
                              CNH {m.cnh}
                              {m.cnh_categoria ? ` · Cat. ${m.cnh_categoria}` : ''}
                            </span>
                          )}
                        </div>
                        {cnhBadge && (
                          <div className="flex gap-2 mt-2">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${cnhBadge.cls}`}>
                              {cnhBadge.icon ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                              CNH {cnhBadge.label}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* ── Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} width="lg">
        <div className="space-y-4">

          {/* Vehicle form */}
          {activeTab === 'veiculos' && (
            <>
              <Select label="Tipo de Veículo" value={vTipo} onChange={e => setVTipo(e.target.value)}>
                {TIPOS_VEICULO.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Placa *"
                  placeholder="ABC-1234"
                  value={vPlaca}
                  onChange={e => setVPlaca(e.target.value)}
                  maxLength={8}
                />
                <Input
                  label="Ano de Fabricação"
                  type="number"
                  placeholder="2020"
                  value={vAno}
                  onChange={e => setVAno(e.target.value)}
                  min={1980}
                  max={new Date().getFullYear() + 1}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Modelo"
                  placeholder="Ex: Scania R450"
                  value={vModelo}
                  onChange={e => setVModelo(e.target.value)}
                />
                <Input
                  label="Cor"
                  placeholder="Ex: Branco"
                  value={vCor}
                  onChange={e => setVCor(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Valor do Veículo (R$)"
                  type="number"
                  placeholder="0,00"
                  value={vValor}
                  onChange={e => setVValor(e.target.value)}
                  min={0}
                  step={0.01}
                />
                <Input
                  label="RENAVAM"
                  placeholder="00000000000"
                  value={vRenavam}
                  onChange={e => setVRenavam(e.target.value)}
                  maxLength={11}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Vencimento CRLV"
                  type="date"
                  value={vCrlvVenc}
                  onChange={e => setVCrlvVenc(e.target.value)}
                />
                <Input
                  label="Vencimento Seguro"
                  type="date"
                  value={vSeguroVenc}
                  onChange={e => setVSeguroVenc(e.target.value)}
                />
              </div>

              <div className="pt-1 border-t border-border">
                <PhotoPicker
                  files={vFotos}
                  maxPhotos={4}
                  onChange={setVFotos}
                  label="Fotos do Veículo (até 4)"
                />
              </div>
            </>
          )}

          {/* Equipment form */}
          {activeTab === 'equipamentos' && (
            <>
              <Select label="Tipo de Equipamento" value={eTipo} onChange={e => setETipo(e.target.value)}>
                {TIPOS_EQUIPAMENTO.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Placa (opcional)"
                  placeholder="ABC-1234"
                  value={ePlaca}
                  onChange={e => setEPlaca(e.target.value)}
                  maxLength={8}
                />
                <Input
                  label="Ano de Fabricação"
                  type="number"
                  placeholder="2020"
                  value={eAno}
                  onChange={e => setEAno(e.target.value)}
                  min={1980}
                  max={new Date().getFullYear() + 1}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Capacidade"
                  placeholder="Ex: 27t ou 80m³"
                  value={eCapacidade}
                  onChange={e => setECapacidade(e.target.value)}
                />
                <div className="space-y-1">
                  <label className="text-xs text-text-muted uppercase tracking-wide font-sans flex items-center gap-1">
                    <Weight size={10} /> Tara (kg)
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 8500"
                    value={eTara}
                    onChange={e => setETara(e.target.value)}
                    min={0}
                    step={1}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-bg text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent/40"
                  />
                </div>
              </div>

              <Input
                label="Vencimento CRLV"
                type="date"
                value={eCrlvVenc}
                onChange={e => setECrlvVenc(e.target.value)}
              />

              <div className="pt-1 border-t border-border">
                <PhotoPicker
                  files={eFoto}
                  maxPhotos={1}
                  onChange={setEFoto}
                  label="Foto do Equipamento"
                />
              </div>
            </>
          )}

          {/* Motorista form */}
          {activeTab === 'motoristas' && (
            <>
              <Input
                label="Nome Completo *"
                placeholder="João da Silva"
                value={mNome}
                onChange={e => setMNome(e.target.value)}
              />

              <Input
                label="Telefone"
                placeholder="(11) 99999-9999"
                value={mTelefone}
                onChange={e => setMTelefone(e.target.value)}
                type="tel"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Número CNH"
                  placeholder="00000000000"
                  value={mCnh}
                  onChange={e => setMCnh(e.target.value)}
                  maxLength={11}
                />
                <div className="space-y-1">
                  <label className="text-xs text-text-muted uppercase tracking-wide font-sans flex items-center gap-1">
                    <CreditCard size={10} /> Categoria CNH
                  </label>
                  <select
                    value={mCnhCategoria}
                    onChange={e => setMCnhCategoria(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-bg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/40"
                  >
                    <option value="">Selecionar</option>
                    {CNH_CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Vencimento CNH"
                  type="date"
                  value={mCnhVenc}
                  onChange={e => setMCnhVenc(e.target.value)}
                />
                <div className="flex items-end">
                  {mCnhVenc && (() => {
                    const b = docBadge(mCnhVenc)
                    return b ? (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-full mb-0.5 ${b.cls}`}>
                        {b.icon ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                        CNH {b.label}
                      </span>
                    ) : null
                  })()}
                </div>
              </div>

              <div className="pt-1 border-t border-border">
                <PhotoPicker
                  files={mFoto}
                  maxPhotos={1}
                  onChange={setMFoto}
                  label="Foto do Motorista"
                />
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              fullWidth
              onClick={handleSave}
              loading={saving}
              disabled={
                (activeTab === 'veiculos'   && !vPlaca.trim()) ||
                (activeTab === 'motoristas' && !mNome.trim())
              }
            >
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-text-muted gap-3">
      <div className="opacity-30">{icon}</div>
      <p className="text-sm font-sans">{text}</p>
      <p className="text-xs font-sans opacity-60">Clique em Adicionar para começar</p>
    </div>
  )
}

