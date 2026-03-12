'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { KpiCard } from '@/components/ui/Card'
import {
  formatCurrency, formatNumber, type Transacao, type Veiculo, type Contrato,
  CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA
} from '@/lib/types'
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend)

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
type Tab = 'dashboard' | 'fluxo' | 'dre' | 'porplaca' | 'contratos' | 'config'

const defaultForm = {
  data: new Date().toISOString().split('T')[0],
  tipo: 'entrada' as 'entrada' | 'saida',
  categoria: '',
  valor: '',
  placa: '',
  contrato_id: '',
  descricao: '',
}

const CHART_COLORS = ['#3A6B4A', '#C26B3A', '#C8A84B', '#3A4F6B', '#8B3A3A', '#6B3A6B', '#3A6B6B', '#6B5C3A']
const barOpts = { responsive: true, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true } } }

const inputCls = 'w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary font-sans focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors'

function margemColor(m: number) {
  return m >= 30 ? 'text-success' : m >= 10 ? 'text-[#7A6040]' : 'text-danger'
}

export default function GestaoNegocioPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [userId, setUserId] = useState<string | null>(null)
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [newContrato, setNewContrato] = useState('')

  // Filtros globais (visíveis em dashboard/fluxo/dre)
  const [filtroMes, setFiltroMes] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [filtroPlaca, setFiltroPlaca] = useState('')
  const [filtroContrato, setFiltroContrato] = useState('')
  // Filtro tipo (exclusivo da aba fluxo)
  const [filtroTipo, setFiltroTipo] = useState('')

  const loadData = useCallback(async (uid: string) => {
    const supabase = createClient()
    const [{ data: ts }, { data: vs }, { data: cs }] = await Promise.all([
      supabase.from('transacoes').select('*').eq('agregado_id', uid).order('data', { ascending: false }),
      supabase.from('veiculos').select('*').eq('agregado_id', uid),
      supabase.from('contratos').select('*').eq('agregado_id', uid).order('nome'),
    ])
    setTransacoes(ts ?? [])
    setVeiculos(vs ?? [])
    setContratos(cs ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      loadData(user.id)
    })
  }, [loadData])

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const nomeContrato = (id: string | null) => contratos.find(c => c.id === id)?.nome ?? null

  // ─── Transações filtradas (para dash/fluxo/dre) ───────────────────────────
  const filtradas = transacoes.filter(t => {
    const matchMes = filtroMes ? t.data.startsWith(filtroMes) : true
    const matchPlaca = filtroPlaca ? t.placa === filtroPlaca : true
    const matchContrato = filtroContrato ? t.contrato_id === filtroContrato : true
    const matchTipo = filtroTipo ? t.tipo === filtroTipo : true
    return matchMes && matchPlaca && matchContrato && matchTipo
  })

  const receita = filtradas.filter(t => t.tipo === 'entrada').reduce((a, t) => a + t.valor, 0)
  const despesa = filtradas.filter(t => t.tipo === 'saida').reduce((a, t) => a + t.valor, 0)
  const lucro = receita - despesa
  const margem = receita > 0 ? (lucro / receita) * 100 : 0

  // Gráfico mensal (últimos 6 meses, sem filtro)
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const monthlyData = last6Months.map(m => {
    const ts = transacoes.filter(t => t.data.startsWith(m))
    const r = ts.filter(t => t.tipo === 'entrada').reduce((a, t) => a + t.valor, 0)
    const d = ts.filter(t => t.tipo === 'saida').reduce((a, t) => a + t.valor, 0)
    return { mes: MESES[parseInt(m.split('-')[1]) - 1], receita: r, despesa: d, lucro: r - d }
  })

  // Despesas por categoria (filtradas)
  const despesasPorCategoria = filtradas.filter(t => t.tipo === 'saida').reduce<Record<string, number>>((acc, t) => {
    acc[t.categoria] = (acc[t.categoria] || 0) + t.valor; return acc
  }, {})

  // Por placa (TODAS as transações — sem filtro)
  const placas = [...new Set(veiculos.map(v => v.placa))]
  const porPlaca = placas.map(placa => {
    const ts = transacoes.filter(t => t.placa === placa)
    const r = ts.filter(t => t.tipo === 'entrada').reduce((a, t) => a + t.valor, 0)
    const d = ts.filter(t => t.tipo === 'saida').reduce((a, t) => a + t.valor, 0)
    return { placa, receita: r, despesa: d, lucro: r - d, margem: r > 0 ? ((r - d) / r) * 100 : 0 }
  })

  // Por contrato (TODAS as transações — sem filtro)
  const porContrato = contratos.map(c => {
    const ts = transacoes.filter(t => t.contrato_id === c.id)
    const r = ts.filter(t => t.tipo === 'entrada').reduce((a, t) => a + t.valor, 0)
    const d = ts.filter(t => t.tipo === 'saida').reduce((a, t) => a + t.valor, 0)
    return { id: c.id, nome: c.nome, receita: r, despesa: d, lucro: r - d, margem: r > 0 ? ((r - d) / r) * 100 : 0 }
  }).filter(c => c.receita > 0 || c.despesa > 0)

  // ─── CRUD Transações ──────────────────────────────────────────────────────
  async function handleSave() {
    if (!userId || !form.categoria || !form.valor) return
    setSaving(true)
    const supabase = createClient()
    const payload = {
      agregado_id: userId,
      data: form.data,
      tipo: form.tipo,
      categoria: form.categoria,
      valor: parseFloat(form.valor),
      placa: form.placa || null,
      contrato_id: form.contrato_id || null,
      descricao: form.descricao || null,
    }
    if (editingId) {
      await supabase.from('transacoes').update(payload).eq('id', editingId)
    } else {
      await supabase.from('transacoes').insert(payload)
    }
    await loadData(userId)
    setModalOpen(false); setEditingId(null); setForm(defaultForm); setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('transacoes').delete().eq('id', id)
    setTransacoes(prev => prev.filter(t => t.id !== id))
  }

  function openEdit(t: Transacao) {
    setForm({ data: t.data, tipo: t.tipo, categoria: t.categoria, valor: String(t.valor), placa: t.placa ?? '', contrato_id: t.contrato_id ?? '', descricao: t.descricao ?? '' })
    setEditingId(t.id); setModalOpen(true)
  }

  // ─── CRUD Contratos ───────────────────────────────────────────────────────
  async function handleAddContrato() {
    if (!userId || !newContrato.trim()) return
    const supabase = createClient()
    const { data } = await supabase.from('contratos').insert({ agregado_id: userId, nome: newContrato.trim() }).select().single()
    if (data) { setContratos(p => [...p, data as Contrato]); setNewContrato('') }
  }

  async function handleDeleteContrato(id: string) {
    if (transacoes.some(t => t.contrato_id === id)) {
      alert('Este contrato possui lançamentos e não pode ser removido.'); return
    }
    if (!confirm('Remover este contrato?')) return
    const supabase = createClient()
    await supabase.from('contratos').delete().eq('id', id)
    setContratos(p => p.filter(c => c.id !== id))
    if (filtroContrato === id) setFiltroContrato('')
  }

  const cats = form.tipo === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA
  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'fluxo', label: 'Fluxo de Caixa' },
    { key: 'dre', label: 'DRE' },
    { key: 'porplaca', label: 'Por Placa' },
    { key: 'contratos', label: 'Contratos' },
    { key: 'config', label: 'Configurações' },
  ]
  const showFilters = ['dashboard', 'fluxo', 'dre'].includes(activeTab)

  if (loading) return <div className="px-4 py-10 text-center text-text-muted">Carregando...</div>

  return (
    <div>
      {/* Tab nav */}
      <div className="sticky top-14 z-30 bg-bg border-b border-border">
        <div className="flex overflow-x-auto scrollbar-hide px-4 gap-1 py-2">
          {tabs.map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-pill text-sm font-medium transition-colors font-sans ${activeTab === key ? 'bg-accent text-bg' : 'text-text-secondary hover:bg-surface'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Filtros globais (dashboard / fluxo / dre) */}
        {showFilters && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
            <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
              className="px-2 py-1 rounded-md border border-border bg-surface text-sm text-text-primary font-sans focus:outline-none" />
            <select value={filtroPlaca} onChange={e => setFiltroPlaca(e.target.value)}
              className="px-2 py-1 rounded-md border border-border bg-surface text-sm text-text-secondary font-sans focus:outline-none">
              <option value="">Todas as placas</option>
              {veiculos.map(v => <option key={v.id} value={v.placa}>{v.placa}</option>)}
            </select>
            {contratos.length > 0 && (
              <select value={filtroContrato} onChange={e => setFiltroContrato(e.target.value)}
                className="px-2 py-1 rounded-md border border-border bg-surface text-sm text-text-secondary font-sans focus:outline-none">
                <option value="">Todos os contratos</option>
                {contratos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            )}
            {(filtroPlaca || filtroContrato || filtroMes) && (
              <button onClick={() => { setFiltroPlaca(''); setFiltroContrato('') }}
                className="px-2 py-1 text-xs text-text-muted underline">
                Limpar
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-4">
        {/* FAB */}
        <button onClick={() => { setForm(defaultForm); setEditingId(null); setModalOpen(true) }}
          className="fixed bottom-20 right-4 z-30 w-12 h-12 bg-accent text-bg rounded-full shadow-modal flex items-center justify-center hover:bg-[#1A1915] transition-colors">
          <Plus size={22} />
        </button>

        {/* ─── Dashboard ─── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Receita total" value={formatCurrency(receita)} color="success" icon={<TrendingUp size={18} />} />
              <KpiCard label="Despesas" value={formatCurrency(despesa)} color="danger" icon={<TrendingDown size={18} />} />
              <KpiCard label="Lucro líquido" value={formatCurrency(lucro)} color={lucro >= 0 ? 'success' : 'danger'} icon={<DollarSign size={18} />} />
              <KpiCard label="Margem líquida" value={`${formatNumber(margem, 1)}%`} color={margem >= 30 ? 'success' : margem >= 10 ? 'gold' : 'danger'} icon={<Percent size={18} />} />
            </div>

            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-sm font-semibold text-text-primary mb-3">Resultado Mensal</p>
              <Bar data={{
                labels: monthlyData.map(m => m.mes),
                datasets: [
                  { label: 'Receita', data: monthlyData.map(m => m.receita), backgroundColor: '#3A6B4A', borderRadius: 4 },
                  { label: 'Despesas', data: monthlyData.map(m => m.despesa), backgroundColor: '#8B3A3A', borderRadius: 4 },
                  { label: 'Lucro', data: monthlyData.map(m => m.lucro), backgroundColor: '#7A6040', borderRadius: 4 },
                ]
              }} options={barOpts} />
            </div>

            {Object.keys(despesasPorCategoria).length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-4">
                <p className="text-sm font-semibold text-text-primary mb-3">Despesas por Categoria</p>
                <div className="flex justify-center">
                  <div style={{ width: 200, height: 200 }}>
                    <Doughnut data={{
                      labels: Object.keys(despesasPorCategoria),
                      datasets: [{ data: Object.values(despesasPorCategoria), backgroundColor: CHART_COLORS }],
                    }} options={{ plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }} />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-sm font-semibold text-text-primary mb-3">Evolução do Lucro</p>
              <Line data={{
                labels: monthlyData.map(m => m.mes),
                datasets: [{ label: 'Lucro', data: monthlyData.map(m => m.lucro), borderColor: '#3A6B4A', backgroundColor: '#3A6B4A22', tension: 0.3, fill: true }]
              }} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false } } }} />
            </div>
          </div>
        )}

        {/* ─── Fluxo de Caixa ─── */}
        {activeTab === 'fluxo' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-success-light border border-success/20 rounded-xl p-3 text-center">
                <p className="text-xs text-success mb-1">Entradas</p>
                <p className="font-semibold text-success text-sm">{formatCurrency(receita)}</p>
              </div>
              <div className="bg-danger-light border border-danger/20 rounded-xl p-3 text-center">
                <p className="text-xs text-danger mb-1">Saídas</p>
                <p className="font-semibold text-danger text-sm">{formatCurrency(despesa)}</p>
              </div>
              <div className={`${lucro >= 0 ? 'bg-success-light border-success/20' : 'bg-danger-light border-danger/20'} border rounded-xl p-3 text-center`}>
                <p className={`text-xs mb-1 ${lucro >= 0 ? 'text-success' : 'text-danger'}`}>Saldo</p>
                <p className={`font-semibold text-sm ${lucro >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(lucro)}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-secondary font-sans focus:outline-none">
                <option value="">Todos</option>
                <option value="entrada">Entradas</option>
                <option value="saida">Saídas</option>
              </select>
            </div>

            {filtradas.length === 0 ? (
              <div className="text-center py-10 text-text-muted">
                <p>Nenhuma transação encontrada</p>
                <button onClick={() => { setForm(defaultForm); setModalOpen(true) }} className="text-accent underline text-sm mt-2">Adicionar primeira transação</button>
              </div>
            ) : (
              <div className="space-y-2">
                {filtradas.map(t => {
                  const nc = nomeContrato(t.contrato_id)
                  return (
                    <div key={t.id} className="bg-surface border border-border rounded-xl p-3 flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.tipo === 'entrada' ? 'bg-success' : 'bg-danger'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-text-primary">{t.categoria}</p>
                          {t.placa && <Badge variant="light" className="text-[10px]">{t.placa}</Badge>}
                          {nc && <Badge variant="light" className="text-[10px]">{nc}</Badge>}
                        </div>
                        {t.descricao && <p className="text-xs text-text-muted truncate">{t.descricao}</p>}
                        <p className="text-xs text-text-muted">{new Date(t.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`font-semibold text-sm ${t.tipo === 'entrada' ? 'text-success' : 'text-danger'}`}>
                          {t.tipo === 'saida' ? '-' : '+'}{formatCurrency(t.valor)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(t)} className="p-1.5 text-text-muted hover:text-text-primary rounded-md hover:bg-[#E0DAD0]"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(t.id)} className="p-1.5 text-text-muted hover:text-danger rounded-md hover:bg-danger-light"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── DRE ─── */}
        {activeTab === 'dre' && (
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-xl p-4">
              <h2 className="font-serif text-lg font-bold text-text-primary">Demonstrativo de Resultado</h2>
              {(filtroPlaca || filtroContrato) && (
                <p className="text-xs text-text-muted mt-1">
                  {filtroPlaca && `Placa: ${filtroPlaca}`}
                  {filtroPlaca && filtroContrato && ' · '}
                  {filtroContrato && `Contrato: ${contratos.find(c => c.id === filtroContrato)?.nome}`}
                </p>
              )}
              <div className="space-y-1 mt-4">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm font-semibold text-success">(+) Receita Operacional</span>
                  <span className="text-sm font-semibold text-success">{formatCurrency(receita)}</span>
                </div>
                {Object.entries(despesasPorCategoria).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between py-1.5 pl-4">
                    <span className="text-sm text-text-secondary">(-) {cat}</span>
                    <span className="text-sm text-danger">{formatCurrency(val)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 border-t border-border">
                  <span className="text-sm font-semibold text-danger">(-) Total Despesas</span>
                  <span className="text-sm font-semibold text-danger">{formatCurrency(despesa)}</span>
                </div>
                <div className={`flex justify-between py-3 border-t-2 ${lucro >= 0 ? 'border-success' : 'border-danger'}`}>
                  <span className={`font-bold font-serif text-lg ${lucro >= 0 ? 'text-success' : 'text-danger'}`}>(=) Resultado Líquido</span>
                  <span className={`font-bold text-lg ${lucro >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(lucro)}</span>
                </div>
                <div className="flex justify-between py-1 text-text-secondary">
                  <span className="text-sm">Margem líquida</span>
                  <span className={`text-sm font-semibold ${margemColor(margem)}`}>{formatNumber(margem, 1)}%</span>
                </div>
              </div>
            </div>

            {Object.keys(despesasPorCategoria).length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-4">
                <p className="text-sm font-semibold text-text-primary mb-3">Composição das Despesas</p>
                <div className="flex justify-center">
                  <div style={{ width: 220, height: 220 }}>
                    <Doughnut data={{
                      labels: Object.keys(despesasPorCategoria),
                      datasets: [{ data: Object.values(despesasPorCategoria), backgroundColor: CHART_COLORS }],
                    }} options={{ plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }} />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-sm font-semibold text-text-primary mb-3">Receita × Lucro Mensal</p>
              <Bar data={{
                labels: monthlyData.map(m => m.mes),
                datasets: [
                  { label: 'Receita', data: monthlyData.map(m => m.receita), backgroundColor: '#3A6B4A', borderRadius: 3 },
                  { label: 'Lucro', data: monthlyData.map(m => m.lucro), backgroundColor: '#7A6040', borderRadius: 3 },
                ]
              }} options={barOpts} />
            </div>
          </div>
        )}

        {/* ─── Por Placa ─── */}
        {activeTab === 'porplaca' && (
          <div className="space-y-4">
            {porPlaca.length === 0 ? (
              <p className="text-center text-text-muted py-8">Nenhum veículo com transações cadastradas</p>
            ) : (
              <>
                {porPlaca.map(({ placa, receita: r, despesa: d, lucro: l, margem: m }) => (
                  <div key={placa} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-text-primary">{placa}</p>
                      <Badge variant={l >= 0 ? 'success' : 'danger'}>{l >= 0 ? 'Lucrativo' : 'Negativo'}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-text-muted text-xs">Receita</p><p className="font-semibold text-success">{formatCurrency(r)}</p></div>
                      <div><p className="text-text-muted text-xs">Despesas</p><p className="font-semibold text-danger">{formatCurrency(d)}</p></div>
                      <div><p className="text-text-muted text-xs">Lucro</p><p className={`font-semibold ${l >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(l)}</p></div>
                      <div><p className="text-text-muted text-xs">Margem</p><p className={`font-semibold ${margemColor(m)}`}>{formatNumber(m, 1)}%</p></div>
                    </div>
                  </div>
                ))}
                <div className="bg-surface border border-border rounded-xl p-4">
                  <p className="text-sm font-semibold text-text-primary mb-3">Comparativo por Placa</p>
                  <Bar data={{
                    labels: porPlaca.map(p => p.placa),
                    datasets: [
                      { label: 'Receita', data: porPlaca.map(p => p.receita), backgroundColor: '#3A6B4A', borderRadius: 4 },
                      { label: 'Despesas', data: porPlaca.map(p => p.despesa), backgroundColor: '#8B3A3A', borderRadius: 4 },
                      { label: 'Lucro', data: porPlaca.map(p => p.lucro), backgroundColor: '#7A6040', borderRadius: 4 },
                    ]
                  }} options={barOpts} />
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── Contratos ─── */}
        {activeTab === 'contratos' && (
          <div className="space-y-4">
            {porContrato.length === 0 ? (
              <div className="text-center py-10 text-text-muted">
                <p>Nenhum contrato com movimentações</p>
                <button onClick={() => setActiveTab('config')} className="text-accent underline text-sm mt-2">Cadastrar contratos</button>
              </div>
            ) : (
              <>
                {porContrato.map(({ id, nome, receita: r, despesa: d, lucro: l, margem: m }, i) => (
                  <div key={id} className="bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="h-0.5" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold text-text-primary">{nome}</p>
                        <Badge variant={l >= 0 ? 'success' : 'danger'}>{l >= 0 ? 'Lucrativo' : 'Negativo'}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-text-muted text-xs">Receita</p><p className="font-semibold text-success">{formatCurrency(r)}</p></div>
                        <div><p className="text-text-muted text-xs">Despesas</p><p className="font-semibold text-danger">{formatCurrency(d)}</p></div>
                        <div><p className="text-text-muted text-xs">Lucro</p><p className={`font-semibold ${l >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(l)}</p></div>
                        <div><p className="text-text-muted text-xs">Margem</p><p className={`font-semibold ${margemColor(m)}`}>{formatNumber(m, 1)}%</p></div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="bg-surface border border-border rounded-xl p-4">
                  <p className="text-sm font-semibold text-text-primary mb-3">Comparativo por Contrato</p>
                  <Bar data={{
                    labels: porContrato.map(c => c.nome),
                    datasets: [
                      { label: 'Receita', data: porContrato.map(c => c.receita), backgroundColor: '#3A6B4A', borderRadius: 4 },
                      { label: 'Despesas', data: porContrato.map(c => c.despesa), backgroundColor: '#8B3A3A', borderRadius: 4 },
                      { label: 'Lucro', data: porContrato.map(c => c.lucro), backgroundColor: '#7A6040', borderRadius: 4 },
                    ]
                  }} options={barOpts} />
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── Configurações ─── */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            {/* Veículos */}
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="font-semibold text-text-primary mb-3">Veículos cadastrados</p>
              {veiculos.length === 0 ? (
                <p className="text-sm text-text-muted">Nenhum veículo cadastrado. <a href="/agregado/cadastros" className="text-accent underline">Cadastrar</a></p>
              ) : (
                <div className="space-y-2">
                  {veiculos.map(v => (
                    <div key={v.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{v.placa}</p>
                        <p className="text-xs text-text-muted">{v.tipo}</p>
                      </div>
                      <Badge variant="light">{v.ano || '—'}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contratos */}
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="font-semibold text-text-primary mb-3">Contratos</p>
              <div className="flex gap-2 mb-3">
                <input value={newContrato} onChange={e => setNewContrato(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddContrato()}
                  placeholder="Nome do contrato" className={inputCls} />
                <button onClick={handleAddContrato}
                  className="px-4 py-2 rounded-md border border-border bg-bg text-sm font-medium text-text-primary hover:border-text-secondary transition-colors whitespace-nowrap">
                  Adicionar
                </button>
              </div>
              {contratos.length === 0 ? (
                <p className="text-sm text-text-muted">Nenhum contrato cadastrado.</p>
              ) : (
                <div className="space-y-1">
                  {contratos.map(c => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-sm font-medium text-text-primary">{c.nome}</span>
                      <button onClick={() => handleDeleteContrato(c.id)}
                        className="text-xs text-danger hover:underline">Remover</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Categorias */}
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="font-semibold text-text-primary mb-3">Categorias de despesas</p>
              <div className="space-y-1.5">
                {[...CATEGORIAS_SAIDA].map(cat => (
                  <div key={cat} className="text-sm text-text-secondary py-1 border-b border-border last:border-0">{cat}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Novo / Editar Lançamento */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditingId(null) }} title={editingId ? 'Editar Lançamento' : 'Novo Lançamento'}>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {(['entrada', 'saida'] as const).map(tp => (
              <button key={tp} onClick={() => setForm(f => ({ ...f, tipo: tp, categoria: '' }))}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors border ${form.tipo === tp ? (tp === 'entrada' ? 'bg-success-light border-success text-success' : 'bg-danger-light border-danger text-danger') : 'border-border text-text-secondary hover:bg-surface'}`}>
                {tp === 'entrada' ? 'Entrada' : 'Saída'}
              </button>
            ))}
          </div>
          <Input label="Data" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} required />
          <Select label="Categoria" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} required>
            <option value="">Selecione...</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Valor (R$)" type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" required />
          <Select label="Placa (opcional)" value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value }))}>
            <option value="">Nenhuma</option>
            {veiculos.map(v => <option key={v.id} value={v.placa}>{v.placa} — {v.tipo}</option>)}
          </Select>
          {contratos.length > 0 && (
            <Select label="Contrato (opcional)" value={form.contrato_id} onChange={e => setForm(f => ({ ...f, contrato_id: e.target.value }))}>
              <option value="">Nenhum</option>
              {contratos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          )}
          <Input label="Descrição (opcional)" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Abastecimento rodovia" />
          <Button onClick={handleSave} loading={saving} fullWidth>
            {editingId ? 'Salvar alterações' : 'Lançar'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
