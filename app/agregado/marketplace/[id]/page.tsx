'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import { Select, Textarea } from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import {
  formatCurrency, type Vaga, type Veiculo, type Equipamento, type Motorista, type CustoKmConfig,
  calcEstimativaMensal, calcKmMensal, calcDiasMes, labelFrequencia,
} from '@/lib/types'
import { MapPin, Truck, Package, User, AlertCircle, CheckCircle2, TrendingUp, ChevronRight } from 'lucide-react'

/** Fallback para configs legadas (igual ao marketplace). */
function recalcLegado(config: CustoKmConfig): number | null {
  if (!config.km_mes || config.km_mes === 0) return null
  return (
    ((config.parcela_caminhao ?? 0) + (config.seguro ?? 0) + (config.licenciamento ?? 0) +
     (config.rastreador ?? 0) + (config.outros_fixos ?? 0)) / config.km_mes
    + (config.preco_diesel && config.consumo_km_litro ? config.preco_diesel / config.consumo_km_litro : 0)
    + ((config.manutencao_mensal ?? 0) + (config.pneus_mensal ?? 0) +
       (config.pedagio_mensal ?? 0) + (config.salario_motorista ?? 0)) / config.km_mes
  )
}

export default function VagaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [vaga, setVaga] = useState<Vaga & { transportadoras?: { razao_social: string | null } | null } | null>(null)
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [custoConfig, setCustoConfig] = useState<CustoKmConfig | null>(null)
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

      const [{ data: v }, { data: vs }, { data: es }, { data: ms }, { data: cand }, { data: cfg }] = await Promise.all([
        supabase.from('vagas').select('*, transportadoras(razao_social)').eq('id', id).single(),
        supabase.from('veiculos').select('*').eq('agregado_id', user.id),
        supabase.from('equipamentos').select('*').eq('agregado_id', user.id),
        supabase.from('motoristas').select('*').eq('agregado_id', user.id),
        supabase.from('candidaturas').select('id').eq('vaga_id', id).eq('agregado_id', user.id).maybeSingle(),
        supabase.from('custo_km_config').select('*').eq('agregado_id', user.id).maybeSingle(),
      ])

      setVaga(v as typeof vaga)
      setVeiculos(vs ?? [])
      setEquipamentos(es ?? [])
      setMotoristas(ms ?? [])
      setCustoConfig(cfg)
      if (cand) setJaCandidata(true)
      if (vs && vs.length > 0) setSelectedVeiculo(vs[0].id)
      if (ms && ms.length > 0) setSelectedMotorista(ms[0].id)
      setLoading(false)
    })
  }, [id])

  async function handleCandidatar() {
    if (!userId || !vaga) return
    if (!selectedVeiculo)   { setError('Selecione um veículo para a candidatura.'); return }
    if (!selectedMotorista) { setError('Selecione um motorista para a candidatura.'); return }
    if (vaga.contrata_equipamento && !selectedEquipamento) {
      setError('Esta vaga requer equipamento. Selecione um equipamento.'); return
    }

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
  if (!vaga)  return <div className="px-4 py-10 text-center text-text-muted">Vaga não encontrada</div>

  const veiculosFiltrados = vaga.tipo_veiculo ? veiculos.filter(v => v.tipo === vaga.tipo_veiculo) : veiculos
  const equipFiltrados    = vaga.tipo_equipamento ? equipamentos.filter(e => e.tipo === vaga.tipo_equipamento) : equipamentos

  // ── Cálculo financeiro — fiel ao openVagaDetail do dashboard-agregado-v3.html ──
  const custoKm      = custoConfig ? (custoConfig.custo_km_calculado ?? recalcLegado(custoConfig) ?? 0) : 0
  const km           = vaga.km_estimado ?? 0
  const valorKm      = vaga.valor_km ?? 0
  const ganhoViagem  = valorKm * km
  const custoViagem  = custoKm * km
  const lucroViagem  = ganhoViagem - custoViagem
  const margemPct    = ganhoViagem > 0 ? (lucroViagem / ganhoViagem) * 100 : 0
  const freqMult     = calcDiasMes(vaga) ?? 0
  const ganhoMes     = ganhoViagem * freqMult
  const custoMes     = custoViagem * freqMult
  const lucroMes     = lucroViagem * freqMult
  // cores de margem idênticas ao HTML: ≥25% verde, ≥10% âmbar, <10% vermelho
  const margemVariant: 'success' | 'warning' | 'danger' =
    margemPct >= 25 ? 'success' : margemPct >= 10 ? 'warning' : 'danger'

  const temSimulacao = !!(vaga.valor_km && km && custoKm)
  const estimativa   = calcEstimativaMensal(vaga)

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-text-muted hover:text-text-secondary mb-4 inline-flex items-center gap-1">
        ← Voltar ao marketplace
      </button>

      {/* ── Info da vaga ────────────────────────────────────────── */}
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
          {vaga.tipo_veiculo    && <Badge variant="light"><Truck size={11} className="inline mr-1" />{vaga.tipo_veiculo}</Badge>}
          {vaga.tipo_equipamento && <Badge variant="muted"><Package size={11} className="inline mr-1" />{vaga.tipo_equipamento}</Badge>}
          {vaga.contrata_equipamento && <Badge variant="info">Inclui equipamento</Badge>}
        </div>

        {/* Grid de dados básicos */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-bg rounded-lg p-3 border border-border">
            <p className="text-xs text-text-muted mb-0.5">KM da rota</p>
            <p className="font-semibold text-text-primary text-sm">{km ? `${km.toLocaleString('pt-BR')} km` : '—'}</p>
          </div>
          <div className="bg-bg rounded-lg p-3 border border-border">
            <p className="text-xs text-text-muted mb-0.5">Período</p>
            <p className="font-semibold text-text-primary text-sm">{vaga.periodo_meses ? `${vaga.periodo_meses} meses` : '—'}</p>
          </div>
          <div className="bg-bg rounded-lg p-3 border border-border">
            <p className="text-xs text-text-muted mb-0.5">Valor/km</p>
            <p className="font-semibold text-success text-sm">{valorKm ? `${formatCurrency(valorKm)}/km` : '—'}</p>
          </div>
        </div>

        {/* Frequência */}
        {vaga.frequencia_tipo && (
          <p className="text-xs text-text-muted mb-4">
            🔁 {labelFrequencia(vaga)}
          </p>
        )}

        {/* ── Remuneração por km (destaque — fiel ao HTML) */}
        {vaga.valor_km && (
          <div className="bg-accent rounded-xl p-4 mb-4">
            <p className="text-xs text-bg/70 uppercase tracking-wide mb-1">Remuneração por km</p>
            <p className="font-serif text-3xl font-bold text-bg">{formatCurrency(vaga.valor_km)}</p>
            {ganhoViagem > 0 && (
              <p className="text-sm text-bg/80 mt-1">Ganho por viagem: {formatCurrency(ganhoViagem)}</p>
            )}
          </div>
        )}

        {/* ── Simulação financeira — fiel ao openVagaDetail do dashboard-agregado-v3.html ── */}
        {temSimulacao ? (
          <div className="mb-4">
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2">
              📊 Simulação financeira — baseada no seu custo/km
            </p>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              {/* Linha 1: receita/viagem + custo/viagem */}
              <div className="grid grid-cols-2 border-b border-border">
                <div className="p-3 border-r border-border">
                  <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Receita/viagem</p>
                  <p className="font-serif text-xl text-success">{formatCurrency(ganhoViagem)}</p>
                </div>
                <div className="p-3">
                  <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Custo/viagem est.</p>
                  <p className="font-serif text-xl text-danger">{formatCurrency(custoViagem)}</p>
                </div>
              </div>
              {/* Linha 2: lucro/viagem + margem */}
              <div className="grid grid-cols-2 border-b border-border">
                <div className="p-3 border-r border-border">
                  <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Lucro/viagem est.</p>
                  <p className={`font-serif text-xl ${margemVariant === 'success' ? 'text-success' : margemVariant === 'warning' ? 'text-warning' : 'text-danger'}`}>
                    {formatCurrency(lucroViagem)}
                  </p>
                </div>
                <div className="p-3">
                  <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Margem estimada</p>
                  <p className={`font-serif text-xl ${margemVariant === 'success' ? 'text-success' : margemVariant === 'warning' ? 'text-warning' : 'text-danger'}`}>
                    {margemPct.toFixed(0)}%
                  </p>
                </div>
              </div>
              {/* Linha 3: ganho/mês + lucro/mês (fundo verde) */}
              {freqMult > 0 && (
                <div className="bg-success-light p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
                        Ganho/mês estimado <span className="normal-case">({labelFrequencia(vaga)})</span>
                      </p>
                      <p className="font-serif text-2xl font-semibold text-success">{formatCurrency(ganhoMes)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Lucro/mês est.</p>
                      <p className={`font-serif text-xl ${margemVariant === 'success' ? 'text-success' : margemVariant === 'warning' ? 'text-warning' : 'text-danger'}`}>
                        {formatCurrency(lucroMes)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* Rodapé: referência ao custo/km */}
              <div className="px-3 py-2 bg-bg border-t border-border">
                <p className="text-xs text-text-muted">
                  💡 Baseado no seu custo/km atual de <strong>{formatCurrency(custoKm)}</strong>.{' '}
                  <a href="/agregado/custo-km" className="underline">Calculadora de custos →</a>
                </p>
              </div>
            </div>
          </div>
        ) : vaga.valor_km && !custoConfig ? (
          /* Sem custo/km configurado — mostra estimativa bruta e convite */
          <div className="mb-4">
            <div className="bg-success-light border border-success/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={15} className="text-success" />
                <p className="text-xs font-semibold text-success uppercase tracking-wide">Estimativa de ganho mensal</p>
              </div>
              <p className="font-bold text-success text-3xl mb-1">
                {estimativa ? formatCurrency(estimativa) : '—'}
                <span className="text-sm font-normal text-text-secondary">/mês</span>
              </p>
              {freqMult > 0 && km && valorKm && (
                <p className="text-xs text-text-muted">
                  {formatCurrency(valorKm)}/km × {km.toLocaleString('pt-BR')} km × {freqMult} viagens
                </p>
              )}
            </div>
            <a href="/agregado/custo-km" className="mt-2 flex items-center gap-1.5 text-xs text-accent">
              Configure seu custo/km para ver a simulação financeira completa <ChevronRight size={12} />
            </a>
          </div>
        ) : estimativa ? (
          /* Fallback valor_contrato legado */
          <div className="bg-success-light border border-success/20 rounded-xl p-4 mb-4">
            <p className="text-xs text-success uppercase tracking-wide mb-1">Valor mensal</p>
            <p className="font-bold text-success text-3xl">{formatCurrency(estimativa)}<span className="text-sm font-normal text-text-secondary">/mês</span></p>
          </div>
        ) : null}

        {vaga.descricao && (
          <div>
            <p className="text-xs text-text-muted mb-1 uppercase tracking-wide">Descrição / Peculiaridades</p>
            <p className="text-sm text-text-secondary">{vaga.descricao}</p>
          </div>
        )}
      </div>

      {/* ── Formulário de candidatura ───────────────────────────── */}
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
              {/* Veículo */}
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

              {/* Equipamento */}
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

              {/* Motorista */}
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
