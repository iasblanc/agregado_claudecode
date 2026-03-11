'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import { Select, Textarea } from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { formatCurrency, type Vaga, type Veiculo, type Equipamento, type Motorista } from '@/lib/types'
import { MapPin, Truck, Package, User, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function VagaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [vaga, setVaga] = useState<Vaga & { transportadoras?: { razao_social: string | null } | null } | null>(null)
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [jaCandidata, setJaCandidata] = useState(false)
  const [error, setError] = useState('')

  const [selectedVeiculo, setSelectedVeiculo] = useState('')
  const [selectedEquipamento, setSelectedEquipamento] = useState('')
  const [selectedMotorista, setSelectedMotorista] = useState('')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)

      const [{ data: v }, { data: vs }, { data: es }, { data: ms }, { data: cand }] = await Promise.all([
        supabase.from('vagas').select('*, transportadoras(razao_social)').eq('id', id).single(),
        supabase.from('veiculos').select('*').eq('agregado_id', user.id),
        supabase.from('equipamentos').select('*').eq('agregado_id', user.id),
        supabase.from('motoristas').select('*').eq('agregado_id', user.id),
        supabase.from('candidaturas').select('id').eq('vaga_id', id).eq('agregado_id', user.id).maybeSingle(),
      ])

      setVaga(v as typeof vaga)
      setVeiculos(vs ?? [])
      setEquipamentos(es ?? [])
      setMotoristas(ms ?? [])
      if (cand) setJaCandidata(true)
      if (vs && vs.length > 0) setSelectedVeiculo(vs[0].id)
      if (ms && ms.length > 0) setSelectedMotorista(ms[0].id)
      setLoading(false)
    })
  }, [id])

  async function handleCandidatar() {
    if (!userId || !vaga) return
    if (!selectedVeiculo) { setError('Selecione um veículo para a candidatura.'); return }
    if (!selectedMotorista) { setError('Selecione um motorista para a candidatura.'); return }
    if (vaga.contrata_equipamento && !selectedEquipamento) { setError('Esta vaga requer equipamento. Selecione um equipamento.'); return }

    setSubmitting(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('candidaturas').insert({
      vaga_id: id,
      agregado_id: userId,
      veiculo_id: selectedVeiculo || null,
      equipamento_id: (vaga.contrata_equipamento && selectedEquipamento) ? selectedEquipamento : null,
      motorista_id: selectedMotorista || null,
      mensagem: mensagem || null,
      status: 'pendente',
    })
    if (err) {
      setError('Erro ao enviar candidatura. Você pode já ter se candidatado.')
    } else {
      setSubmitted(true)
      setJaCandidata(true)
    }
    setSubmitting(false)
  }

  if (loading) return <div className="px-4 py-10 text-center text-text-muted">Carregando...</div>
  if (!vaga) return <div className="px-4 py-10 text-center text-text-muted">Vaga não encontrada</div>

  // Filter vehicles by required type
  const veiculosFiltrados = vaga.tipo_veiculo
    ? veiculos.filter(v => v.tipo === vaga.tipo_veiculo)
    : veiculos

  const equipFiltrados = vaga.tipo_equipamento
    ? equipamentos.filter(e => e.tipo === vaga.tipo_equipamento)
    : equipamentos

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-text-muted hover:text-text-secondary mb-4 inline-flex items-center gap-1">
        ← Voltar ao marketplace
      </button>

      {/* Vaga info */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-4 shadow-card">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-serif text-xl font-bold text-text-primary">
              {vaga.rota_origem} → {vaga.rota_destino}
            </p>
            <p className="text-sm text-text-secondary mt-0.5">
              {(vaga as any).transportadoras?.razao_social ?? 'Transportadora'}
            </p>
          </div>
          <Badge variant={vaga.status === 'ativa' ? 'success' : 'muted'}>
            {vaga.status === 'ativa' ? 'Ativa' : vaga.status}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {vaga.tipo_veiculo && <Badge variant="light"><Truck size={11} className="inline mr-1" />{vaga.tipo_veiculo}</Badge>}
          {vaga.tipo_equipamento && <Badge variant="muted"><Package size={11} className="inline mr-1" />{vaga.tipo_equipamento}</Badge>}
          {vaga.contrata_equipamento && <Badge variant="info">Inclui equipamento</Badge>}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-bg rounded-lg p-3 border border-border">
            <p className="text-xs text-text-muted mb-0.5">KM estimado</p>
            <p className="font-semibold text-text-primary text-sm">{vaga.km_estimado ? `${vaga.km_estimado} km` : '—'}</p>
          </div>
          <div className="bg-bg rounded-lg p-3 border border-border">
            <p className="text-xs text-text-muted mb-0.5">Período</p>
            <p className="font-semibold text-text-primary text-sm">{vaga.periodo_meses ? `${vaga.periodo_meses} meses` : '—'}</p>
          </div>
          <div className="bg-success-light border border-success/20 rounded-lg p-3">
            <p className="text-xs text-success mb-0.5">Valor/mês</p>
            <p className="font-bold text-success text-sm">{vaga.valor_contrato ? formatCurrency(vaga.valor_contrato) : '—'}</p>
          </div>
        </div>

        {vaga.descricao && (
          <div>
            <p className="text-xs text-text-muted mb-1 uppercase tracking-wide">Descrição / Peculiaridades</p>
            <p className="text-sm text-text-secondary">{vaga.descricao}</p>
          </div>
        )}
      </div>

      {/* Candidatura form */}
      {jaCandidata || submitted ? (
        <div className="bg-success-light border border-success/20 rounded-xl p-5 text-center">
          <CheckCircle2 size={32} className="text-success mx-auto mb-3" />
          <p className="font-semibold text-success">Candidatura enviada!</p>
          <p className="text-sm text-text-secondary mt-1">A transportadora irá analisar seu perfil e responderá em breve.</p>
          <button onClick={() => router.push('/agregado/minhas-candidaturas')} className="mt-4 text-sm text-accent underline">
            Ver minhas candidaturas
          </button>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl p-5 shadow-card">
          <h2 className="font-serif text-lg font-bold text-text-primary mb-4">Candidatar-se</h2>

          {veiculos.length === 0 ? (
            <div className="bg-warning-light border border-warning/20 rounded-lg p-4 mb-4 flex gap-3">
              <AlertCircle size={18} className="text-warning flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-warning">Nenhum veículo cadastrado</p>
                <a href="/agregado/cadastros" className="text-sm text-accent underline">Cadastrar veículo →</a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Vehicle selector */}
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1 block">
                  <Truck size={14} className="inline mr-1" />
                  Veículo para este contrato *
                </label>
                {veiculosFiltrados.length === 0 ? (
                  <div className="bg-danger-light border border-danger/20 rounded-lg p-3 text-sm text-danger">
                    Você não possui {vaga.tipo_veiculo} cadastrado. <a href="/agregado/cadastros" className="underline">Cadastrar</a>
                  </div>
                ) : (
                  <select value={selectedVeiculo} onChange={e => setSelectedVeiculo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-md border border-border bg-[#FAF8F4] text-text-primary font-sans text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="">Selecione o veículo</option>
                    {veiculosFiltrados.map(v => (
                      <option key={v.id} value={v.id}>{v.tipo} — {v.placa}{v.ano ? ` (${v.ano})` : ''}</option>
                    ))}
                  </select>
                )}
                {vaga.tipo_veiculo && veiculosFiltrados.length < veiculos.length && (
                  <p className="text-xs text-text-muted mt-1">Exibindo apenas {vaga.tipo_veiculo} (exigido pela vaga)</p>
                )}
              </div>

              {/* Equipment selector (only if required) */}
              {vaga.contrata_equipamento && (
                <div>
                  <label className="text-sm font-medium text-text-secondary mb-1 block">
                    <Package size={14} className="inline mr-1" />
                    Equipamento *
                  </label>
                  {equipFiltrados.length === 0 ? (
                    <div className="bg-danger-light border border-danger/20 rounded-lg p-3 text-sm text-danger">
                      Nenhum equipamento compatível cadastrado. <a href="/agregado/cadastros" className="underline">Cadastrar</a>
                    </div>
                  ) : (
                    <select value={selectedEquipamento} onChange={e => setSelectedEquipamento(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-md border border-border bg-[#FAF8F4] text-text-primary font-sans text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                      <option value="">Selecione o equipamento</option>
                      {equipFiltrados.map(e => (
                        <option key={e.id} value={e.id}>{e.tipo}{e.placa ? ` — ${e.placa}` : ''}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Driver selector */}
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1 block">
                  <User size={14} className="inline mr-1" />
                  Motorista *
                </label>
                {motoristas.length === 0 ? (
                  <div className="bg-warning-light border border-warning/20 rounded-lg p-3 text-sm text-warning">
                    Nenhum motorista cadastrado. <a href="/agregado/cadastros" className="underline text-accent">Cadastrar</a>
                  </div>
                ) : (
                  <select value={selectedMotorista} onChange={e => setSelectedMotorista(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-md border border-border bg-[#FAF8F4] text-text-primary font-sans text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="">Selecione o motorista</option>
                    {motoristas.map(m => (
                      <option key={m.id} value={m.id}>{m.nome}{m.cnh ? ` — CNH ${m.cnh}` : ''}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Message */}
              <Textarea label="Mensagem para a transportadora (opcional)" value={mensagem}
                onChange={e => setMensagem(e.target.value)}
                placeholder="Apresente-se, destaque sua experiência na rota ou mencione algo relevante..."
                rows={3} />

              {error && (
                <div className="bg-danger-light border border-danger/20 text-danger text-sm rounded-md px-3 py-2">{error}</div>
              )}

              <Button onClick={handleCandidatar} loading={submitting} fullWidth size="lg">
                Enviar Candidatura
              </Button>
              <p className="text-xs text-text-muted text-center">
                Seus dados (veículo, equipamento, motorista) serão visíveis para a transportadora após o envio.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
