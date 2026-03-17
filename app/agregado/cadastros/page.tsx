'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { TIPOS_VEICULO, TIPOS_EQUIPAMENTO, type Veiculo, type Equipamento, type Motorista } from '@/lib/types'
import { Plus, Trash2, Truck, Package, User, AlertTriangle, CheckCircle2 } from 'lucide-react'

function docBadge(dateStr: string | null | undefined) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return { label: 'Vencido', cls: 'bg-danger-light text-danger' }
  if (days <= 30) return { label: `Vence em ${days}d`, cls: 'bg-warning-light text-warning' }
  return { label: 'OK', cls: 'bg-success-light text-success' }
}

type Tab = 'veiculos' | 'equipamentos' | 'motoristas'

export default function CadastrosPage() {
  const [activeTab, setActiveTab] = useState<Tab>('veiculos')
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Vehicle form
  const [vTipo, setVTipo] = useState<string>(TIPOS_VEICULO[0])
  const [vPlaca, setVPlaca] = useState('')
  const [vAno, setVAno] = useState('')
  const [vValor, setVValor] = useState('')
  const [vModelo, setVModelo] = useState('')
  const [vCrlvVenc, setVCrlvVenc] = useState('')
  const [vSeguroVenc, setVSeguroVenc] = useState('')

  // Equipment form
  const [eTipo, setETipo] = useState<string>(TIPOS_EQUIPAMENTO[0])
  const [ePlaca, setEPlaca] = useState('')
  const [eAno, setEAno] = useState('')

  // Motorista form
  const [mNome, setMNome] = useState('')
  const [mCnh, setMCnh] = useState('')

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
  }, [])

  async function fetchVeiculos(uid: string) {
    const { data } = await supabase
      .from('veiculos')
      .select('*')
      .eq('agregado_id', uid)
      .order('created_at', { ascending: false })
    if (data) setVeiculos(data)
  }

  async function fetchEquipamentos(uid: string) {
    const { data } = await supabase
      .from('equipamentos')
      .select('*')
      .eq('agregado_id', uid)
      .order('created_at', { ascending: false })
    if (data) setEquipamentos(data)
  }

  async function fetchMotoristas(uid: string) {
    const { data } = await supabase
      .from('motoristas')
      .select('*')
      .eq('agregado_id', uid)
      .order('created_at', { ascending: false })
    if (data) setMotoristas(data)
  }

  function resetForms() {
    setVTipo(TIPOS_VEICULO[0])
    setVPlaca('')
    setVAno('')
    setVValor('')
    setVModelo('')
    setVCrlvVenc('')
    setVSeguroVenc('')
    setETipo(TIPOS_EQUIPAMENTO[0])
    setEPlaca('')
    setEAno('')
    setMNome('')
    setMCnh('')
  }

  function openModal() {
    resetForms()
    setModalOpen(true)
  }

  async function handleSave() {
    if (!userId) return
    setSaving(true)
    try {
      if (activeTab === 'veiculos') {
        if (!vPlaca.trim()) { setSaving(false); return }
        const { error } = await supabase.from('veiculos').insert({
          agregado_id: userId,
          tipo: vTipo,
          placa: vPlaca.trim().toUpperCase(),
          ano: vAno ? parseInt(vAno) : null,
          valor_veiculo: vValor ? parseFloat(vValor.replace(',', '.')) : null,
          modelo: vModelo.trim() || null,
          crlv_venc: vCrlvVenc || null,
          seguro_venc: vSeguroVenc || null,
        })
        if (!error) {
          await fetchVeiculos(userId)
          setModalOpen(false)
        }
      } else if (activeTab === 'equipamentos') {
        const { error } = await supabase.from('equipamentos').insert({
          agregado_id: userId,
          tipo: eTipo,
          placa: ePlaca.trim() ? ePlaca.trim().toUpperCase() : null,
          ano: eAno ? parseInt(eAno) : null,
        })
        if (!error) {
          await fetchEquipamentos(userId)
          setModalOpen(false)
        }
      } else {
        if (!mNome.trim()) { setSaving(false); return }
        const { error } = await supabase.from('motoristas').insert({
          agregado_id: userId,
          nome: mNome.trim(),
          cnh: mCnh.trim() || null,
        })
        if (!error) {
          await fetchMotoristas(userId)
          setModalOpen(false)
        }
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!userId) return
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

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'veiculos', label: 'Veículos', icon: <Truck size={16} />, count: veiculos.length },
    { key: 'equipamentos', label: 'Equipamentos', icon: <Package size={16} />, count: equipamentos.length },
    { key: 'motoristas', label: 'Motoristas', icon: <User size={16} />, count: motoristas.length },
  ]

  const modalTitle =
    activeTab === 'veiculos'
      ? 'Novo Veículo'
      : activeTab === 'equipamentos'
      ? 'Novo Equipamento'
      : 'Novo Motorista'

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
            <Badge
              variant={activeTab === tab.key ? 'light' : 'muted'}
              className="ml-0.5 text-xs"
            >
              {tab.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-xl bg-surface border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Veículos */}
          {activeTab === 'veiculos' && (
            <>
              {veiculos.length === 0 ? (
                <EmptyState icon={<Truck size={32} />} text="Nenhum veículo cadastrado" />
              ) : (
                veiculos.map(v => {
                  const vv = v as Veiculo & { modelo?: string; crlv_venc?: string; seguro_venc?: string }
                  const crlvBadge = docBadge(vv.crlv_venc)
                  const seguroBadge = docBadge(vv.seguro_venc)
                  return (
                    <div key={v.id} className="bg-surface border border-border rounded-xl px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <Truck size={18} className="text-accent" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-text-primary text-sm font-sans">{v.placa}</span>
                              <Badge variant="muted">{v.tipo}</Badge>
                            </div>
                            <div className="text-xs text-text-muted font-sans mt-0.5">
                              {vv.modelo ? `${vv.modelo} · ` : ''}
                              {v.ano ? `Ano ${v.ano}` : ''}
                              {v.ano && v.valor_veiculo ? ' · ' : ''}
                              {v.valor_veiculo
                                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.valor_veiculo)
                                : ''}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(v.id)}
                          disabled={deletingId === v.id}
                          className="p-2 rounded-lg hover:bg-danger-light text-text-muted hover:text-danger transition-colors disabled:opacity-50 shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {/* Doc badges */}
                      {(crlvBadge || seguroBadge) && (
                        <div className="flex gap-2 mt-2.5 flex-wrap">
                          {crlvBadge && (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${crlvBadge.cls}`}>
                              {crlvBadge.label === 'OK' ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                              CRLV {crlvBadge.label}
                            </span>
                          )}
                          {seguroBadge && (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${seguroBadge.cls}`}>
                              {seguroBadge.label === 'OK' ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                              Seguro {seguroBadge.label}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </>
          )}

          {/* Equipamentos */}
          {activeTab === 'equipamentos' && (
            <>
              {equipamentos.length === 0 ? (
                <EmptyState icon={<Package size={32} />} text="Nenhum equipamento cadastrado" />
              ) : (
                equipamentos.map(e => (
                  <div key={e.id} className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Package size={18} className="text-accent" />
                      </div>
                      <div>
                        <span className="font-medium text-text-primary text-sm font-sans">{e.tipo}</span>
                        <div className="text-xs text-text-muted font-sans mt-0.5">
                          {e.placa ? `Placa: ${e.placa}` : 'Sem placa'}
                          {e.ano ? ` · Ano ${e.ano}` : ''}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(e.id)}
                      disabled={deletingId === e.id}
                      className="p-2 rounded-lg hover:bg-danger-light text-text-muted hover:text-danger transition-colors disabled:opacity-50 shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {/* Motoristas */}
          {activeTab === 'motoristas' && (
            <>
              {motoristas.length === 0 ? (
                <EmptyState icon={<User size={32} />} text="Nenhum motorista cadastrado" />
              ) : (
                motoristas.map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                        <User size={18} className="text-accent" />
                      </div>
                      <div>
                        <span className="font-medium text-text-primary text-sm font-sans">{m.nome}</span>
                        {m.cnh && (
                          <div className="text-xs text-text-muted font-sans mt-0.5">CNH: {m.cnh}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={deletingId === m.id}
                      className="p-2 rounded-lg hover:bg-danger-light text-text-muted hover:text-danger transition-colors disabled:opacity-50 shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle}>
        <div className="space-y-4">
          {/* Vehicle form */}
          {activeTab === 'veiculos' && (
            <>
              <Select
                label="Tipo de Veículo"
                value={vTipo}
                onChange={e => setVTipo(e.target.value)}
              >
                {TIPOS_VEICULO.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
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
                label="Modelo (opcional)"
                placeholder="Ex: Scania R450"
                value={vModelo}
                onChange={e => setVModelo(e.target.value)}
              />
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
            </>
          )}

          {/* Equipment form */}
          {activeTab === 'equipamentos' && (
            <>
              <Select
                label="Tipo de Equipamento"
                value={eTipo}
                onChange={e => setETipo(e.target.value)}
              >
                {TIPOS_EQUIPAMENTO.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
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
                label="CNH"
                placeholder="00000000000"
                value={mCnh}
                onChange={e => setMCnh(e.target.value)}
              />
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              fullWidth
              onClick={handleSave}
              loading={saving}
              disabled={
                (activeTab === 'veiculos' && !vPlaca.trim()) ||
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
