import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Car, CheckCircle, Clock, DollarSign, Package, Plus, User, Wrench, X } from 'lucide-react'
import { addMonths } from 'date-fns'
import { supabase } from '../lib/supabase'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { PageHeader } from '../components/ui/PageHeader'
import { Select } from '../components/ui/Select'
import type { Cliente, Estoque, ItemServico, Servico, TabelaPreco, TipoAplicacao, Veiculo } from '../types'

const PECAS = [
  'Para-brisa',
  'Lateral Dir',
  'Lateral Esq',
  'Traseiro',
  'Teto',
  'Capô',
  'Triângulo Dir Diant',
  'Triângulo Esq Diant',
]

const GARANTIA_OPTIONS = [
  { value: '12', label: '12 meses' },
  { value: '24', label: '24 meses' },
  { value: '36', label: '36 meses' },
]

const TIPO_SERVICO_LABEL: Record<string, string> = {
  solar: 'Insulfilm Solar',
  ppf: 'PPF',
  ambos: 'Solar + PPF',
}

interface ServicoData {
  servico: Servico
  veiculo: Veiculo
  cliente: Cliente
}

interface ModalForm {
  peca: string
  tipo_aplicacao: TipoAplicacao
  bobina_id: string
  metros_gastos: string
  marca_pelicula: string
  serie_pelicula: string
}

type ModalErrors = Partial<Record<keyof ModalForm, string>>

const MODAL_INITIAL: ModalForm = {
  peca: '',
  tipo_aplicacao: 'solar',
  bobina_id: '',
  metros_gastos: '',
  marca_pelicula: '',
  serie_pelicula: '',
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

function fmtCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ExecucaoServicoPage() {
  const { servicoId } = useParams<{ servicoId: string }>()
  const navigate = useNavigate()

  const [pageData, setPageData] = useState<ServicoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [itens, setItens] = useState<ItemServico[]>([])
  const [bobinas, setBobinas] = useState<Estoque[]>([])
  const [elapsed, setElapsed] = useState(0)

  // Modal peça
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ModalForm>(MODAL_INITIAL)
  const [errors, setErrors] = useState<ModalErrors>({})
  const [savingPeca, setSavingPeca] = useState(false)

  // Conclusão
  const [valorTotal, setValorTotal] = useState('')
  const [garantiaMeses, setGarantiaMeses] = useState('12')
  const [observacoes, setObservacoes] = useState('')
  const [concluindo, setConcluindo] = useState(false)

  // Modal preço padrão
  const [modalPrecos, setModalPrecos] = useState(false)
  const [tabelaPrecos, setTabelaPrecos] = useState<TabelaPreco[]>([])
  const [loadingPrecos, setLoadingPrecos] = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchServico = useCallback(async () => {
    if (!servicoId) return
    setLoading(true)

    const { data: servico } = await supabase
      .from('servicos')
      .select('*')
      .eq('id', servicoId)
      .single()

    if (!servico) { setLoading(false); return }

    const { data: veiculo } = await supabase
      .from('veiculos')
      .select('*')
      .eq('id', servico.veiculo_id)
      .single()

    if (!veiculo) { setLoading(false); return }

    const { data: cliente } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', veiculo.cliente_id)
      .single()

    if (!cliente) { setLoading(false); return }

    setPageData({ servico, veiculo, cliente })
    setLoading(false)
  }, [servicoId])

  const fetchItens = useCallback(async () => {
    if (!servicoId) return
    const { data } = await supabase
      .from('itens_servico')
      .select('*')
      .eq('servico_id', servicoId)
      .order('created_at', { ascending: true })
    setItens(data ?? [])
  }, [servicoId])

  const fetchBobinas = useCallback(async () => {
    const { data } = await supabase
      .from('estoque')
      .select('*')
      .eq('status', 'ativa')
      .order('nome', { ascending: true })
    setBobinas(data ?? [])
  }, [])

  useEffect(() => {
    fetchServico()
    fetchItens()
    fetchBobinas()
  }, [fetchServico, fetchItens, fetchBobinas])

  // Timer em tempo real
  useEffect(() => {
    if (!pageData?.servico.data_agendamento) return
    const start = new Date(pageData.servico.data_agendamento).getTime()
    const tick = () => setElapsed(Date.now() - start)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [pageData?.servico.data_agendamento])

  // ── Handlers: peça ────────────────────────────────────────────────────────

  function openModal() {
    setForm(MODAL_INITIAL)
    setErrors({})
    setModalOpen(true)
  }

  function handleBobinaChange(bobinaId: string) {
    const bobina = bobinas.find(b => b.id === bobinaId)
    setForm(prev => ({
      ...prev,
      bobina_id: bobinaId,
      marca_pelicula: bobina?.marca ?? '',
      serie_pelicula: bobina?.serie ?? '',
    }))
  }

  function validateModal(): boolean {
    const next: ModalErrors = {}
    if (!form.peca) next.peca = 'Selecione a peça'
    if (!form.bobina_id) next.bobina_id = 'Selecione a bobina'
    const m = Number(form.metros_gastos)
    if (!form.metros_gastos || isNaN(m) || m <= 0) next.metros_gastos = 'Informe os metros gastos'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSavePeca() {
    if (!validateModal() || !servicoId) return
    setSavingPeca(true)

    const metros = Number(form.metros_gastos)

    const { error } = await supabase.from('itens_servico').insert({
      servico_id: servicoId,
      peca: form.peca,
      tipo_aplicacao: form.tipo_aplicacao,
      bobina_id: form.bobina_id || null,
      metros_gastos: metros,
      marca_pelicula: form.marca_pelicula || null,
      serie_pelicula: form.serie_pelicula || null,
    })

    if (!error && form.bobina_id) {
      const bobina = bobinas.find(b => b.id === form.bobina_id)
      if (bobina) {
        await supabase
          .from('estoque')
          .update({
            metros_usados: bobina.metros_usados + metros,
            metros_restantes: bobina.metros_restantes - metros,
          })
          .eq('id', form.bobina_id)
      }
    }

    setSavingPeca(false)
    setModalOpen(false)
    fetchItens()
    fetchBobinas()
  }

  // ── Handlers: preço padrão ────────────────────────────────────────────────

  async function openModalPrecos() {
    if (!pageData) return
    setLoadingPrecos(true)
    setModalPrecos(true)

    const tipo = pageData.servico.tipo // 'solar' | 'ppf' | 'ambos'

    const { data } = await supabase
      .from('tabela_precos')
      .select('*')
      .eq('ativo', true)
      .order('tipo', { ascending: true })
      .order('preco', { ascending: true })

    const todos = (data ?? []) as TabelaPreco[]

    // Filtra por tipo: se o serviço é 'ambos', mostra tudo; caso contrário filtra por tipo ou 'ambos'
    const filtrados = tipo === 'ambos'
      ? todos
      : todos.filter(p => p.tipo === tipo || p.tipo === 'ambos')

    setTabelaPrecos(filtrados)
    setLoadingPrecos(false)
  }

  function aplicarPreco(preco: TabelaPreco) {
    setValorTotal(String(preco.preco))
    setModalPrecos(false)
  }

  // ── Conclusão ─────────────────────────────────────────────────────────────

  async function handleConcluir() {
    if (!servicoId) return
    setConcluindo(true)

    const dataConclusao = new Date().toISOString()
    const garantiaValidade = addMonths(new Date(), Number(garantiaMeses)).toISOString()

    await supabase
      .from('servicos')
      .update({
        status: 'concluido',
        data_conclusao: dataConclusao,
        garantia_meses: Number(garantiaMeses),
        garantia_validade: garantiaValidade,
        valor_total: valorTotal ? Number(valorTotal) : null,
        observacoes_tecnicas: observacoes || null,
      })
      .eq('id', servicoId)

    setConcluindo(false)
    navigate(`/certificado/${servicoId}`)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#CC0000] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!pageData) {
    return (
      <div className="p-8 text-center text-brand-muted font-sora text-sm">
        Serviço não encontrado.
      </div>
    )
  }

  const { servico, veiculo, cliente } = pageData
  const isConcluido = servico.status === 'concluido'

  const bobinaOptions = bobinas.map(b => ({
    value: b.id,
    label: `${b.nome} — ${b.metros_restantes.toFixed(2)} m restantes`,
  }))

  const pecaOptions = PECAS.map(p => ({ value: p, label: p }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Execução do Serviço"
        breadcrumbs={[
          { label: 'Agendamentos', href: '/agendamentos' },
          { label: 'Execução' },
        ]}
      />

      {/* ── SEÇÃO 1 — Header do serviço ── */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] border-l-[3px] border-l-[#CC0000] rounded-[8px] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User size={14} className="text-[#CC0000] shrink-0" />
              <span className="font-rajdhani font-bold text-lg text-brand-text">
                {cliente.nome}
              </span>
              {cliente.whatsapp && (
                <span className="text-brand-muted text-sm">· {cliente.whatsapp}</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Car size={14} className="text-brand-muted shrink-0" />
              <span className="text-brand-text font-medium">
                {veiculo.marca} {veiculo.modelo}
                {veiculo.ano && ` ${veiculo.ano}`}
              </span>
              {veiculo.cor && (
                <span className="text-brand-muted">· {veiculo.cor}</span>
              )}
              {veiculo.placa && (
                <span className="px-2 py-0.5 bg-[#111111] border border-[#2A2A2A] rounded text-xs font-mono text-brand-text tracking-widest">
                  {veiculo.placa}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Wrench size={14} className="text-brand-muted shrink-0" />
              <span className="text-brand-text">
                {TIPO_SERVICO_LABEL[servico.tipo] ?? servico.tipo}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-3">
            <Badge status={servico.status} />

            {servico.data_agendamento && !isConcluido && (
              <div className="flex items-center gap-2 bg-[#111111] border border-[#2A2A2A] rounded-lg px-3 py-2">
                <Clock size={13} className="text-[#CC0000]" />
                <span className="font-mono text-[#CC0000] text-sm font-bold tracking-widest">
                  {formatElapsed(elapsed)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SEÇÃO 2 — Peças aplicadas ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-rajdhani font-bold text-xl text-brand-text">Peças Aplicadas</h2>
          {!isConcluido && (
            <Button size="sm" onClick={openModal}>
              <Plus size={14} />
              Adicionar Peça
            </Button>
          )}
        </div>

        {itens.length === 0 ? (
          <Card>
            <div className="flex items-center gap-3 text-brand-muted py-3">
              <Package size={18} className="opacity-40 shrink-0" />
              <span className="text-sm font-sora">Nenhuma peça registrada ainda.</span>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {itens.map(item => (
              <div
                key={item.id}
                className="bg-[#1A1A1A] border border-[#2A2A2A] border-l-[3px] border-l-[#CC0000] rounded-[8px] p-4 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-rajdhani font-bold text-brand-text text-base">
                    {item.peca}
                  </span>
                  <span
                    className={[
                      'text-xs px-2 py-0.5 rounded border font-medium font-sora',
                      item.tipo_aplicacao === 'ppf'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
                    ].join(' ')}
                  >
                    {item.tipo_aplicacao === 'ppf' ? 'PPF' : 'Solar'}
                  </span>
                </div>
                {item.marca_pelicula && (
                  <p className="text-xs text-brand-muted font-sora">
                    {item.marca_pelicula}
                    {item.serie_pelicula && ` · ${item.serie_pelicula}`}
                  </p>
                )}
                {item.metros_gastos != null && (
                  <p className="text-xs text-brand-muted font-sora">
                    {item.metros_gastos.toFixed(2)} m utilizados
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SEÇÃO 3 — Conclusão ── */}
      {!isConcluido && (
        <Card>
          <h2 className="font-rajdhani font-bold text-xl text-brand-text mb-5">
            Concluir Serviço
          </h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Valor total + botão preço padrão */}
              <div className="space-y-2">
                <Input
                  label="Valor Total (R$)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={valorTotal}
                  onChange={e => setValorTotal(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openModalPrecos}
                  className="border border-[#2A2A2A] text-[#D4A017] hover:bg-[#D4A017]/10 hover:border-[#D4A017]/40 w-full"
                >
                  <DollarSign size={13} />
                  Usar preço padrão
                </Button>
              </div>

              <Select
                label="Garantia"
                options={GARANTIA_OPTIONS}
                value={garantiaMeses}
                onChange={e => setGarantiaMeses(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-brand-muted font-sora uppercase tracking-wider">
                Observações Técnicas
              </label>
              <textarea
                rows={3}
                placeholder="Condições do serviço, detalhes técnicos..."
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                className={[
                  'w-full bg-[#111111] border border-[#2A2A2A] rounded-lg',
                  'text-sm text-brand-text font-sora placeholder:text-brand-muted/50',
                  'px-3 py-2.5 resize-none',
                  'focus:outline-none focus:ring-1 focus:border-brand-gold focus:ring-brand-gold/20',
                  'transition-all duration-150',
                ].join(' ')}
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button
                size="lg"
                loading={concluindo}
                onClick={handleConcluir}
                className="bg-[#CC0000] hover:bg-[#E60000] text-white font-semibold"
              >
                <CheckCircle size={18} />
                Concluir Serviço
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Modal — Adicionar Peça ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
              <h3 className="font-rajdhani font-bold text-lg text-brand-text">
                Adicionar Peça
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-brand-muted hover:text-brand-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <Select
                label="Peça"
                placeholder="Selecione a peça"
                options={pecaOptions}
                value={form.peca}
                onChange={e => setForm(prev => ({ ...prev, peca: e.target.value }))}
                error={errors.peca}
              />

              <Select
                label="Tipo"
                options={[
                  { value: 'solar', label: 'Solar' },
                  { value: 'ppf', label: 'PPF' },
                ]}
                value={form.tipo_aplicacao}
                onChange={e =>
                  setForm(prev => ({ ...prev, tipo_aplicacao: e.target.value as TipoAplicacao }))
                }
              />

              <Select
                label="Bobina"
                placeholder="Selecione a bobina"
                options={bobinaOptions}
                value={form.bobina_id}
                onChange={e => handleBobinaChange(e.target.value)}
                error={errors.bobina_id}
              />

              <Input
                label="Metros Gastos"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 1.35"
                value={form.metros_gastos}
                onChange={e => setForm(prev => ({ ...prev, metros_gastos: e.target.value }))}
                error={errors.metros_gastos}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Marca da Película"
                  placeholder="Ex: Llumar"
                  value={form.marca_pelicula}
                  onChange={e => setForm(prev => ({ ...prev, marca_pelicula: e.target.value }))}
                />
                <Input
                  label="Série"
                  placeholder="Ex: ATR"
                  value={form.serie_pelicula}
                  onChange={e => setForm(prev => ({ ...prev, serie_pelicula: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#2A2A2A]">
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                loading={savingPeca}
                onClick={handleSavePeca}
                className="bg-[#CC0000] hover:bg-[#E60000] text-white font-semibold"
              >
                Salvar Peça
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal — Preço Padrão ── */}
      {modalPrecos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setModalPrecos(false)}
          />
          <div className="relative z-10 w-full max-w-lg bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-[#D4A017]" />
                <h3 className="font-rajdhani font-bold text-lg text-brand-text">Preços Padrão</h3>
              </div>
              <button
                onClick={() => setModalPrecos(false)}
                className="text-brand-muted hover:text-brand-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {loadingPrecos ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : tabelaPrecos.length === 0 ? (
                <div className="text-center py-10 text-brand-muted font-sora text-sm">
                  Nenhum preço ativo encontrado para este tipo de serviço.
                </div>
              ) : (
                <div className="space-y-1">
                  {tabelaPrecos.map(p => (
                    <button
                      key={p.id}
                      onClick={() => aplicarPreco(p)}
                      className={[
                        'w-full text-left px-4 py-3 rounded-lg',
                        'flex items-center justify-between gap-3',
                        'hover:bg-[#D4A017]/10 transition-colors group',
                        'border border-transparent hover:border-[#D4A017]/30',
                      ].join(' ')}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-brand-text font-sora group-hover:text-[#D4A017] transition-colors truncate">
                          {p.nome}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.peca && (
                            <span className="text-xs text-brand-muted font-sora">{p.peca}</span>
                          )}
                          {p.descricao && (
                            <span className="text-xs text-brand-muted/60 font-sora truncate">
                              {p.descricao}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-rajdhani font-bold text-[#D4A017] text-lg shrink-0">
                        {fmtCurrency(p.preco)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-[#2A2A2A]">
              <p className="text-xs text-brand-muted font-sora">
                Clique em um preço para aplicar. O valor pode ser editado manualmente após.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
