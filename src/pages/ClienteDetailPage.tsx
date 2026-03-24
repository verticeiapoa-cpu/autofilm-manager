import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertTriangle,
  Award,
  CalendarPlus,
  Car,
  CheckCircle2,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { PageHeader } from '../components/ui/PageHeader'
import { Select } from '../components/ui/Select'
import { VeiculoFields } from '../components/ui/VeiculoFields'
import type { Cliente, ItemServico, Servico, Veiculo } from '../types'

interface ServicoComItens extends Servico {
  itens: ItemServico[]
  veiculo: Veiculo
}

// ── Formulários ──────────────────────────────────────────────────────────────

interface ClienteForm {
  nome: string
  whatsapp: string
  email: string
  cpf: string
  origem: string
}

type ClienteErrors = Partial<Record<keyof ClienteForm, string>>

interface VeiculoForm {
  marca: string
  modelo: string
  ano: string
  cor: string
  placa: string
}

type VeiculoErrors = Partial<Record<keyof VeiculoForm, string>>

const VEI_INITIAL: VeiculoForm = { marca: '', modelo: '', ano: '', cor: '', placa: '' }

const ORIGEM_OPTIONS = [
  { value: 'app', label: 'App / Sistema' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google', label: 'Google' },
  { value: 'outro', label: 'Outro' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR }) }
  catch { return '—' }
}

function fmtDateLong(iso?: string | null): string {
  if (!iso) return '—'
  try { return format(parseISO(iso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) }
  catch { return '—' }
}

function fmtCurrency(v?: number | null): string {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function waLink(num: string): string {
  return `https://wa.me/55${num.replace(/\D/g, '')}`
}

const TIPO_LABEL: Record<string, string> = {
  solar: 'Insulfilm Solar',
  ppf: 'PPF',
  ambos: 'Solar + PPF',
}

// ── Modal Veículo (criar / editar) ───────────────────────────────────────────

interface ModalVeiculoProps {
  mode: 'create' | 'edit'
  form: VeiculoForm
  errors: VeiculoErrors
  saving: boolean
  onChange: <K extends keyof VeiculoForm>(k: K, v: VeiculoForm[K]) => void
  onSave: () => void
  onClose: () => void
}

function ModalVeiculo({ mode, form, errors, saving, onChange, onSave, onClose }: ModalVeiculoProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
          <h3 className="font-rajdhani font-bold text-lg text-brand-text">
            {mode === 'create' ? 'Adicionar Veículo' : 'Editar Veículo'}
          </h3>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <VeiculoFields
            marca={form.marca}
            modelo={form.modelo}
            ano={form.ano}
            placa={form.placa}
            cor={form.cor}
            showCor
            onMarca={v => onChange('marca', v)}
            onModelo={v => onChange('modelo', v)}
            onAno={v => onChange('ano', v)}
            onPlaca={v => onChange('placa', v)}
            onCor={v => onChange('cor', v)}
            errorModelo={errors.modelo}
          />
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#2A2A2A]">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            loading={saving}
            onClick={onSave}
            className="bg-[#CC0000] hover:bg-[#E60000] text-white font-semibold"
          >
            {mode === 'create' ? 'Salvar Veículo' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Cliente (editar) ───────────────────────────────────────────────────

interface ModalClienteProps {
  form: ClienteForm
  errors: ClienteErrors
  saving: boolean
  onChange: <K extends keyof ClienteForm>(k: K, v: ClienteForm[K]) => void
  onSave: () => void
  onClose: () => void
}

function ModalCliente({ form, errors, saving, onChange, onSave, onClose }: ModalClienteProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
          <h3 className="font-rajdhani font-bold text-lg text-brand-text">Editar Cliente</h3>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Input
            label="Nome"
            placeholder="Nome completo"
            value={form.nome}
            onChange={e => onChange('nome', e.target.value)}
            error={errors.nome}
          />
          <Input
            label="WhatsApp"
            placeholder="(51) 99999-9999"
            value={form.whatsapp}
            onChange={e => onChange('whatsapp', e.target.value)}
            error={errors.whatsapp}
          />
          <Input
            label="E-mail"
            type="email"
            placeholder="email@exemplo.com"
            value={form.email}
            onChange={e => onChange('email', e.target.value)}
          />
          <Input
            label="CPF"
            placeholder="000.000.000-00"
            value={form.cpf}
            onChange={e => onChange('cpf', e.target.value)}
          />
          <Select
            label="Origem"
            options={ORIGEM_OPTIONS}
            value={form.origem}
            onChange={e => onChange('origem', e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#2A2A2A]">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            loading={saving}
            onClick={onSave}
            className="bg-[#CC0000] hover:bg-[#E60000] text-white font-semibold"
          >
            Salvar Alterações
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────

export function ClienteDetailPage() {
  const { clienteId } = useParams<{ clienteId: string }>()
  const navigate = useNavigate()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [servicos, setServicos] = useState<ServicoComItens[]>([])
  const [loading, setLoading] = useState(true)

  // ── Estado: editar cliente ──
  const [editCli, setEditCli] = useState(false)
  const [cliForm, setCliForm] = useState<ClienteForm>({ nome: '', whatsapp: '', email: '', cpf: '', origem: 'app' })
  const [cliErrors, setCliErrors] = useState<ClienteErrors>({})
  const [savingCli, setSavingCli] = useState(false)

  // ── Estado: excluir cliente ──
  const [deleteCli, setDeleteCli] = useState(false)
  const [deleteCliError, setDeleteCliError] = useState('')
  const [deletingCli, setDeletingCli] = useState(false)

  // ── Estado: adicionar / editar veículo ──
  const [modalVei, setModalVei] = useState(false)
  const [editVei, setEditVei] = useState<Veiculo | null>(null)
  const [veiForm, setVeiForm] = useState<VeiculoForm>(VEI_INITIAL)
  const [veiErrors, setVeiErrors] = useState<VeiculoErrors>({})
  const [savingVei, setSavingVei] = useState(false)

  // ── Estado: excluir veículo ──
  const [deleteVei, setDeleteVei] = useState<Veiculo | null>(null)
  const [deleteVeiError, setDeleteVeiError] = useState('')
  const [deletingVei, setDeletingVei] = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!clienteId) return
    setLoading(true)

    const { data: cli } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', clienteId)
      .single()

    if (!cli) { setLoading(false); return }
    setCliente(cli)

    const { data: veisData } = await supabase
      .from('veiculos')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: true })

    const veiList = veisData ?? []
    setVeiculos(veiList)

    if (veiList.length === 0) { setLoading(false); return }

    const veiIds = veiList.map(v => v.id)

    const { data: servicosData } = await supabase
      .from('servicos')
      .select('*')
      .in('veiculo_id', veiIds)
      .order('data_agendamento', { ascending: false })

    const svcList = servicosData ?? []

    const enriched = await Promise.all(
      svcList.map(async (s) => {
        const { data: itens } = await supabase
          .from('itens_servico')
          .select('*')
          .eq('servico_id', s.id)
          .order('created_at', { ascending: true })

        const veiculo = veiList.find(v => v.id === s.veiculo_id)!
        return { ...s, itens: itens ?? [], veiculo }
      })
    )

    setServicos(enriched)
    setLoading(false)
  }, [clienteId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Editar cliente ────────────────────────────────────────────────────────

  function openEditCliente() {
    if (!cliente) return
    setCliForm({
      nome: cliente.nome,
      whatsapp: cliente.whatsapp,
      email: cliente.email ?? '',
      cpf: cliente.cpf ?? '',
      origem: cliente.origem ?? 'app',
    })
    setCliErrors({})
    setEditCli(true)
  }

  function validateCli(): boolean {
    const next: ClienteErrors = {}
    if (!cliForm.nome.trim()) next.nome = 'Informe o nome'
    if (!cliForm.whatsapp.trim()) next.whatsapp = 'Informe o WhatsApp'
    setCliErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSaveCli() {
    if (!validateCli() || !clienteId) return
    setSavingCli(true)
    await supabase.from('clientes').update({
      nome: cliForm.nome.trim(),
      whatsapp: cliForm.whatsapp.trim(),
      email: cliForm.email.trim() || null,
      cpf: cliForm.cpf.trim() || null,
      origem: cliForm.origem,
    }).eq('id', clienteId)
    setSavingCli(false)
    setEditCli(false)
    fetchAll()
  }

  // ── Excluir cliente ───────────────────────────────────────────────────────

  function openDeleteCliente() {
    setDeleteCliError('')
    setDeleteCli(true)
  }

  async function handleDeleteCliente() {
    if (!clienteId) return
    setDeletingCli(true)

    if (servicos.length > 0) {
      setDeleteCliError(
        `Este cliente possui ${servicos.length} serviço${servicos.length !== 1 ? 's' : ''} vinculado${servicos.length !== 1 ? 's' : ''}. Exclua os serviços antes de remover o cliente.`
      )
      setDeletingCli(false)
      return
    }

    if (veiculos.length > 0) {
      const ids = veiculos.map(v => v.id)
      await supabase.from('veiculos').delete().in('id', ids)
    }

    await supabase.from('clientes').delete().eq('id', clienteId)
    setDeletingCli(false)
    navigate('/clientes')
  }

  // ── Adicionar veículo ─────────────────────────────────────────────────────

  function openAddVei() {
    setEditVei(null)
    setVeiForm(VEI_INITIAL)
    setVeiErrors({})
    setModalVei(true)
  }

  // ── Editar veículo ────────────────────────────────────────────────────────

  function openEditVei(v: Veiculo) {
    setEditVei(v)
    setVeiForm({
      marca: v.marca,
      modelo: v.modelo,
      ano: v.ano != null ? String(v.ano) : '',
      cor: v.cor ?? '',
      placa: v.placa ?? '',
    })
    setVeiErrors({})
    setModalVei(true)
  }

  function setVeiField<K extends keyof VeiculoForm>(k: K, v: VeiculoForm[K]) {
    setVeiForm(prev => ({ ...prev, [k]: v }))
  }

  function validateVei(): boolean {
    const next: VeiculoErrors = {}
    if (!veiForm.marca.trim()) next.marca = 'Informe a marca'
    if (!veiForm.modelo.trim()) next.modelo = 'Informe o modelo'
    setVeiErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSaveVeiculo() {
    if (!validateVei() || !clienteId) return
    setSavingVei(true)

    const payload = {
      marca: veiForm.marca.trim(),
      modelo: veiForm.modelo.trim(),
      ano: veiForm.ano ? Number(veiForm.ano) : null,
      cor: veiForm.cor.trim() || null,
      placa: veiForm.placa.trim() || null,
    }

    if (editVei) {
      await supabase.from('veiculos').update(payload).eq('id', editVei.id)
    } else {
      await supabase.from('veiculos').insert({ ...payload, cliente_id: clienteId })
    }

    setSavingVei(false)
    setModalVei(false)
    setEditVei(null)
    fetchAll()
  }

  // ── Excluir veículo ───────────────────────────────────────────────────────

  function openDeleteVei(v: Veiculo) {
    setDeleteVeiError('')
    setDeleteVei(v)
  }

  async function handleDeleteVei() {
    if (!deleteVei) return
    setDeletingVei(true)

    // Verificar serviços vinculados ao veículo
    const { data: svcVei } = await supabase
      .from('servicos')
      .select('id')
      .eq('veiculo_id', deleteVei.id)

    if (svcVei && svcVei.length > 0) {
      setDeleteVeiError(
        `Este veículo possui ${svcVei.length} serviço${svcVei.length !== 1 ? 's' : ''} vinculado${svcVei.length !== 1 ? 's' : ''}. Exclua os serviços antes de remover o veículo.`
      )
      setDeletingVei(false)
      return
    }

    await supabase.from('veiculos').delete().eq('id', deleteVei.id)
    setDeletingVei(false)
    setDeleteVei(null)
    fetchAll()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#CC0000] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="p-8 text-center text-brand-muted font-sora text-sm">
        Cliente não encontrado.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={cliente.nome}
        breadcrumbs={[
          { label: 'Clientes', href: '/clientes' },
          { label: cliente.nome },
        ]}
        action={
          <Button
            size="sm"
            onClick={() => navigate('/agendamentos/novo')}
            className="bg-[#CC0000] hover:bg-[#E60000] text-white font-semibold"
          >
            <CalendarPlus size={14} />
            Novo Agendamento
          </Button>
        }
      />

      {/* ── Header do cliente ── */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] border-l-[3px] border-l-[#CC0000] rounded-[8px] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User size={14} className="text-[#CC0000] shrink-0" />
              <span className="font-rajdhani font-bold text-xl text-brand-text">{cliente.nome}</span>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-brand-muted font-sora">
              <a
                href={waLink(cliente.whatsapp)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[#25D366] hover:text-[#1da851] transition-colors"
              >
                <MessageCircle size={13} />
                {cliente.whatsapp}
              </a>
              {cliente.email && <span>{cliente.email}</span>}
              {cliente.cpf && <span>CPF: {cliente.cpf}</span>}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="text-right space-y-0.5">
              <p className="text-xs text-brand-muted font-sora uppercase tracking-wider">Origem</p>
              <p className="text-sm text-brand-text font-sora capitalize">{cliente.origem || '—'}</p>
              <p className="text-xs text-brand-muted font-sora mt-1">
                Cadastrado em {fmtDateLong(cliente.data_cadastro || cliente.created_at)}
              </p>
            </div>

            {/* Ações do cliente */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={openEditCliente}
                className="border border-[#2A2A2A] text-brand-muted hover:text-brand-text hover:border-[#CC0000]/40"
              >
                <Pencil size={13} />
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={openDeleteCliente}
                className="border border-[#2A2A2A] text-brand-muted hover:text-[#CC0000] hover:border-[#CC0000]/40 hover:bg-[#CC0000]/10"
              >
                <Trash2 size={13} />
                Excluir
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Veículos ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-rajdhani font-bold text-xl text-brand-text">Veículos</h2>
          <Button size="sm" variant="secondary" onClick={openAddVei}>
            <Plus size={14} />
            Adicionar Veículo
          </Button>
        </div>

        {veiculos.length === 0 ? (
          <Card>
            <div className="flex items-center gap-3 text-brand-muted py-3">
              <Car size={18} className="opacity-40 shrink-0" />
              <span className="text-sm font-sora">Nenhum veículo vinculado.</span>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {veiculos.map(v => (
              <div
                key={v.id}
                className="bg-[#1A1A1A] border border-[#2A2A2A] border-l-[3px] border-l-[#D4A017] rounded-[8px] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Car size={14} className="text-[#D4A017] shrink-0" />
                    <span className="font-rajdhani font-bold text-brand-text truncate">
                      {v.marca} {v.modelo}{v.ano && ` ${v.ano}`}
                    </span>
                  </div>
                  {/* Ações do veículo */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditVei(v)}
                      className="p-1.5 rounded text-brand-muted hover:text-brand-text hover:bg-white/5 transition-colors"
                      title="Editar veículo"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => openDeleteVei(v)}
                      className="p-1.5 rounded text-brand-muted hover:text-[#CC0000] hover:bg-[#CC0000]/10 transition-colors"
                      title="Excluir veículo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-xs text-brand-muted font-sora">
                  {v.cor && <span>{v.cor}</span>}
                  {v.placa && (
                    <span className="px-2 py-0.5 bg-[#111] border border-[#2A2A2A] rounded font-mono text-brand-text tracking-widest">
                      {v.placa}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Timeline de serviços ── */}
      <div className="space-y-3">
        <h2 className="font-rajdhani font-bold text-xl text-brand-text">Histórico de Serviços</h2>

        {servicos.length === 0 ? (
          <Card>
            <div className="flex items-center gap-3 text-brand-muted py-3">
              <Award size={18} className="opacity-40 shrink-0" />
              <span className="text-sm font-sora">Nenhum serviço registrado.</span>
            </div>
          </Card>
        ) : (
          <div className="relative space-y-4">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[#2A2A2A]" />

            {servicos.map(s => (
              <div key={s.id} className="relative flex gap-4">
                <div
                  className={[
                    'shrink-0 mt-4 w-5 h-5 rounded-full border-2 z-10',
                    s.status === 'concluido'
                      ? 'bg-green-500/20 border-green-500'
                      : s.status === 'em_execucao'
                      ? 'bg-yellow-500/20 border-yellow-500'
                      : s.status === 'cancelado'
                      ? 'bg-red-500/20 border-red-500'
                      : 'bg-blue-500/20 border-blue-500',
                  ].join(' ')}
                />

                <div className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-[8px] p-4 space-y-2">
                  <div className="flex flex-wrap items-start gap-2 justify-between">
                    <div className="space-y-0.5">
                      <p className="font-rajdhani font-bold text-brand-text text-base">
                        {TIPO_LABEL[s.tipo] ?? s.tipo}
                      </p>
                      <p className="text-xs text-brand-muted font-sora">
                        {s.veiculo.marca} {s.veiculo.modelo}
                        {s.veiculo.placa && ` · ${s.veiculo.placa}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge status={s.status} />
                      {s.garantia_validade && (() => {
                        const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
                        const val = parseISO(s.garantia_validade); val.setHours(0, 0, 0, 0)
                        const dias = differenceInDays(val, hoje)
                        if (dias < 0) return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 font-sora">
                            <XCircle size={10} /> Garantia vencida
                          </span>
                        )
                        if (dias <= 30) return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-sora">
                            <AlertTriangle size={10} /> Vence em {dias} dia{dias !== 1 ? 's' : ''}
                          </span>
                        )
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 font-sora">
                            <CheckCircle2 size={10} /> Garantia ativa
                          </span>
                        )
                      })()}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-brand-muted font-sora">
                    {s.data_agendamento && <span>Agendado: {fmtDate(s.data_agendamento)}</span>}
                    {s.data_conclusao && <span>Concluído: {fmtDate(s.data_conclusao)}</span>}
                    {s.valor_total != null && (
                      <span className="text-brand-text font-medium">{fmtCurrency(s.valor_total)}</span>
                    )}
                  </div>

                  {s.status === 'concluido' && s.itens.length > 0 && (
                    <div className="pt-2 space-y-1.5 border-t border-[#2A2A2A]">
                      <p className="text-xs font-semibold text-brand-muted font-sora uppercase tracking-wider">
                        Películas aplicadas
                      </p>
                      <div className="grid gap-1">
                        {s.itens.map(item => (
                          <div key={item.id} className="flex items-center gap-2 text-xs font-sora">
                            <span className="text-brand-text font-medium w-32 shrink-0">{item.peca}</span>
                            <span className="text-brand-muted">
                              {item.marca_pelicula ?? '—'}
                              {item.serie_pelicula ? ` · ${item.serie_pelicula}` : ''}
                            </span>
                            <span
                              className={[
                                'ml-auto px-1.5 py-0.5 rounded text-xs font-medium shrink-0',
                                item.tipo_aplicacao === 'ppf'
                                  ? 'bg-blue-500/10 text-blue-400'
                                  : 'bg-yellow-500/10 text-yellow-400',
                              ].join(' ')}
                            >
                              {item.tipo_aplicacao === 'ppf' ? 'PPF' : 'Solar'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {s.status === 'concluido' && (
                    <div className="pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="border border-[#2A2A2A] text-[#D4A017] hover:bg-[#D4A017]/10"
                        onClick={() => navigate(`/certificado/${s.id}`)}
                      >
                        <Award size={13} />
                        Ver Certificado
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Editar Cliente ── */}
      {editCli && (
        <ModalCliente
          form={cliForm}
          errors={cliErrors}
          saving={savingCli}
          onChange={(k, v) => setCliForm(prev => ({ ...prev, [k]: v }))}
          onSave={handleSaveCli}
          onClose={() => setEditCli(false)}
        />
      )}

      {/* ── Modal Excluir Cliente ── */}
      {deleteCli && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteCli(false)} />
          <div className="relative z-10 w-full max-w-sm bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
              <h3 className="font-rajdhani font-bold text-lg text-brand-text">Excluir Cliente</h3>
              <button onClick={() => setDeleteCli(false)} className="text-brand-muted hover:text-brand-text transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-brand-muted font-sora leading-relaxed">
                Deseja excluir o cliente <span className="text-brand-text font-semibold">{cliente.nome}</span>?
                Esta ação não pode ser desfeita.
              </p>
              {deleteCliError && (
                <div className="p-3 bg-[#CC0000]/10 border border-[#CC0000]/30 rounded-lg">
                  <span className="text-xs text-[#CC0000] font-sora leading-relaxed">{deleteCliError}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#2A2A2A]">
              <Button variant="ghost" size="sm" onClick={() => setDeleteCli(false)}>Cancelar</Button>
              {!deleteCliError && (
                <Button
                  size="sm"
                  loading={deletingCli}
                  onClick={handleDeleteCliente}
                  className="bg-[#CC0000] hover:bg-[#E60000] text-white font-semibold"
                >
                  <Trash2 size={14} />
                  Excluir
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Adicionar / Editar Veículo ── */}
      {modalVei && (
        <ModalVeiculo
          mode={editVei ? 'edit' : 'create'}
          form={veiForm}
          errors={veiErrors}
          saving={savingVei}
          onChange={setVeiField}
          onSave={handleSaveVeiculo}
          onClose={() => { setModalVei(false); setEditVei(null) }}
        />
      )}

      {/* ── Modal Excluir Veículo ── */}
      {deleteVei && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteVei(null)} />
          <div className="relative z-10 w-full max-w-sm bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
              <h3 className="font-rajdhani font-bold text-lg text-brand-text">Excluir Veículo</h3>
              <button onClick={() => setDeleteVei(null)} className="text-brand-muted hover:text-brand-text transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-brand-muted font-sora leading-relaxed">
                Deseja excluir o veículo{' '}
                <span className="text-brand-text font-semibold">
                  {deleteVei.marca} {deleteVei.modelo}{deleteVei.placa && ` — ${deleteVei.placa}`}
                </span>?
                Esta ação não pode ser desfeita.
              </p>
              {deleteVeiError && (
                <div className="p-3 bg-[#CC0000]/10 border border-[#CC0000]/30 rounded-lg">
                  <span className="text-xs text-[#CC0000] font-sora leading-relaxed">{deleteVeiError}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#2A2A2A]">
              <Button variant="ghost" size="sm" onClick={() => setDeleteVei(null)}>Cancelar</Button>
              {!deleteVeiError && (
                <Button
                  size="sm"
                  loading={deletingVei}
                  onClick={handleDeleteVei}
                  className="bg-[#CC0000] hover:bg-[#E60000] text-white font-semibold"
                >
                  <Trash2 size={14} />
                  Excluir
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
