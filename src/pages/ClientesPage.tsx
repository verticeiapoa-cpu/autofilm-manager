import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MessageCircle, Pencil, Plus, Search, Trash2, User, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { PageHeader } from '../components/ui/PageHeader'
import { Select } from '../components/ui/Select'
import type { Cliente } from '../types'

interface ClienteCard extends Cliente {
  total_servicos: number
  ultimo_servico?: string
  placas: string[]
}

interface ClienteForm {
  nome: string
  whatsapp: string
  email: string
  cpf: string
  origem: string
}

type FormErrors = Partial<Record<keyof ClienteForm, string>>

const FORM_INITIAL: ClienteForm = {
  nome: '',
  whatsapp: '',
  email: '',
  cpf: '',
  origem: 'app',
}

const ORIGEM_OPTIONS = [
  { value: 'app', label: 'App / Sistema' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google', label: 'Google' },
  { value: 'outro', label: 'Outro' },
]

function fmtDate(iso?: string): string {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR }) }
  catch { return '—' }
}

function waLink(num: string): string {
  return `https://wa.me/55${num.replace(/\D/g, '')}`
}

// ── Modal de criação / edição ───────────────────────────────────────────────

interface ModalClienteProps {
  mode: 'create' | 'edit'
  form: ClienteForm
  errors: FormErrors
  saving: boolean
  onChange: <K extends keyof ClienteForm>(k: K, v: ClienteForm[K]) => void
  onSave: () => void
  onClose: () => void
}

function ModalCliente({ mode, form, errors, saving, onChange, onSave, onClose }: ModalClienteProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
          <h3 className="font-rajdhani font-bold text-lg text-brand-text">
            {mode === 'create' ? 'Novo Cliente' : 'Editar Cliente'}
          </h3>
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
            {mode === 'create' ? 'Cadastrar Cliente' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Página Principal ─────────────────────────────────────────────────────────

export function ClientesPage() {
  const navigate = useNavigate()

  const [clientes, setClientes] = useState<ClienteCard[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  // modal criar
  const [modalCreate, setModalCreate] = useState(false)
  // modal editar
  const [editTarget, setEditTarget] = useState<ClienteCard | null>(null)
  // modal excluir
  const [deleteTarget, setDeleteTarget] = useState<ClienteCard | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const [form, setForm] = useState<ClienteForm>(FORM_INITIAL)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchClientes = useCallback(async () => {
    setLoading(true)

    const { data: clientesData } = await supabase
      .from('clientes')
      .select('*')
      .order('nome', { ascending: true })

    if (!clientesData) { setLoading(false); return }

    const enriched = await Promise.all(
      clientesData.map(async (c) => {
        const { data: veiculos } = await supabase
          .from('veiculos')
          .select('id, placa')
          .eq('cliente_id', c.id)

        const veiculoIds = (veiculos ?? []).map(v => v.id)
        const placas = (veiculos ?? [])
          .map(v => v.placa)
          .filter((p): p is string => Boolean(p))

        let total_servicos = 0
        let ultimo_servico: string | undefined

        if (veiculoIds.length > 0) {
          const { data: servicos } = await supabase
            .from('servicos')
            .select('id, data_agendamento')
            .in('veiculo_id', veiculoIds)
            .order('data_agendamento', { ascending: false })

          total_servicos = servicos?.length ?? 0
          ultimo_servico = servicos?.[0]?.data_agendamento ?? undefined
        }

        return { ...c, total_servicos, ultimo_servico, placas }
      })
    )

    setClientes(enriched)
    setLoading(false)
  }, [])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  const filtrados = clientes.filter(c => {
    if (!busca.trim()) return true
    const q = busca.toLowerCase()
    return (
      c.nome.toLowerCase().includes(q) ||
      c.whatsapp.includes(q) ||
      c.placas.some(p => p.toLowerCase().includes(q))
    )
  })

  function setField<K extends keyof ClienteForm>(k: K, v: ClienteForm[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function validate(): boolean {
    const next: FormErrors = {}
    if (!form.nome.trim()) next.nome = 'Informe o nome'
    if (!form.whatsapp.trim()) next.whatsapp = 'Informe o WhatsApp'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  // ── Criar ──
  function openCreate() {
    setForm(FORM_INITIAL)
    setErrors({})
    setModalCreate(true)
  }

  async function handleCreate() {
    if (!validate()) return
    setSaving(true)
    await supabase.from('clientes').insert({
      nome: form.nome.trim(),
      whatsapp: form.whatsapp.trim(),
      email: form.email.trim() || null,
      cpf: form.cpf.trim() || null,
      origem: form.origem,
      data_cadastro: new Date().toISOString(),
    })
    setSaving(false)
    setModalCreate(false)
    fetchClientes()
  }

  // ── Editar ──
  function openEdit(c: ClienteCard, e: React.MouseEvent) {
    e.stopPropagation()
    setEditTarget(c)
    setForm({
      nome: c.nome,
      whatsapp: c.whatsapp,
      email: c.email ?? '',
      cpf: c.cpf ?? '',
      origem: c.origem ?? 'app',
    })
    setErrors({})
  }

  async function handleEdit() {
    if (!validate() || !editTarget) return
    setSaving(true)
    await supabase.from('clientes').update({
      nome: form.nome.trim(),
      whatsapp: form.whatsapp.trim(),
      email: form.email.trim() || null,
      cpf: form.cpf.trim() || null,
      origem: form.origem,
    }).eq('id', editTarget.id)
    setSaving(false)
    setEditTarget(null)
    fetchClientes()
  }

  // ── Excluir ──
  function openDelete(c: ClienteCard, e: React.MouseEvent) {
    e.stopPropagation()
    setDeleteError('')
    setDeleteTarget(c)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)

    if (deleteTarget.total_servicos > 0) {
      setDeleteError(
        `Este cliente possui ${deleteTarget.total_servicos} serviço${deleteTarget.total_servicos !== 1 ? 's' : ''} vinculado${deleteTarget.total_servicos !== 1 ? 's' : ''}. Exclua os serviços antes de remover o cliente.`
      )
      setDeleting(false)
      return
    }

    // Excluir veículos vinculados antes do cliente
    const { data: veiculos } = await supabase
      .from('veiculos')
      .select('id')
      .eq('cliente_id', deleteTarget.id)

    if (veiculos && veiculos.length > 0) {
      const ids = veiculos.map(v => v.id)
      await supabase.from('veiculos').delete().in('id', ids)
    }

    await supabase.from('clientes').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    fetchClientes()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        breadcrumbs={[{ label: 'Clientes' }]}
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} />
            Novo Cliente
          </Button>
        }
      />

      <Input
        placeholder="Buscar por nome, WhatsApp ou placa..."
        icon={<Search size={14} />}
        value={busca}
        onChange={e => setBusca(e.target.value)}
      />

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-[#CC0000] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <Card>
          <div className="flex items-center gap-3 text-brand-muted py-4">
            <User size={18} className="opacity-40 shrink-0" />
            <span className="text-sm font-sora">
              {busca ? 'Nenhum cliente encontrado para essa busca.' : 'Nenhum cliente cadastrado.'}
            </span>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map(c => (
            <button
              key={c.id}
              onClick={() => navigate(`/clientes/${c.id}`)}
              className={[
                'text-left w-full bg-[#1A1A1A] border border-[#2A2A2A] border-l-[3px] border-l-[#CC0000]',
                'rounded-[8px] p-4 space-y-3 transition-all duration-150',
                'hover:border-[#CC0000]/50 hover:bg-[#1f1f1f]',
              ].join(' ')}
            >
              {/* Linha do nome + ações */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-rajdhani font-bold text-brand-text text-base truncate">{c.nome}</p>
                  {c.origem && (
                    <p className="text-xs text-brand-muted font-sora capitalize">{c.origem}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* WhatsApp */}
                  <a
                    href={waLink(c.whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="p-1.5 rounded text-[#25D366] hover:text-[#1da851] hover:bg-white/5 transition-colors"
                    title="Abrir WhatsApp"
                  >
                    <MessageCircle size={14} />
                  </a>
                  {/* Editar */}
                  <button
                    onClick={e => openEdit(c, e)}
                    className="p-1.5 rounded text-brand-muted hover:text-brand-text hover:bg-white/5 transition-colors"
                    title="Editar cliente"
                  >
                    <Pencil size={14} />
                  </button>
                  {/* Excluir */}
                  <button
                    onClick={e => openDelete(c, e)}
                    className="p-1.5 rounded text-brand-muted hover:text-[#CC0000] hover:bg-[#CC0000]/10 transition-colors"
                    title="Excluir cliente"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p className="text-xs text-brand-muted font-sora">{c.whatsapp}</p>

              {c.placas.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {c.placas.map(p => (
                    <span
                      key={p}
                      className="px-2 py-0.5 bg-[#111] border border-[#2A2A2A] rounded text-xs font-mono text-brand-text tracking-widest"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-brand-muted font-sora pt-1 border-t border-[#2A2A2A]">
                <span>{c.total_servicos} serviço{c.total_servicos !== 1 ? 's' : ''}</span>
                {c.ultimo_servico && (
                  <span>Último: {fmtDate(c.ultimo_servico)}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Modal Criar ── */}
      {modalCreate && (
        <ModalCliente
          mode="create"
          form={form}
          errors={errors}
          saving={saving}
          onChange={setField}
          onSave={handleCreate}
          onClose={() => setModalCreate(false)}
        />
      )}

      {/* ── Modal Editar ── */}
      {editTarget && (
        <ModalCliente
          mode="edit"
          form={form}
          errors={errors}
          saving={saving}
          onChange={setField}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* ── Modal Excluir ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative z-10 w-full max-w-sm bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
              <h3 className="font-rajdhani font-bold text-lg text-brand-text">Excluir Cliente</h3>
              <button onClick={() => setDeleteTarget(null)} className="text-brand-muted hover:text-brand-text transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-brand-muted font-sora leading-relaxed">
                Deseja excluir o cliente <span className="text-brand-text font-semibold">{deleteTarget.nome}</span>?
                Esta ação não pode ser desfeita.
              </p>
              {deleteError && (
                <div className="flex items-start gap-2 p-3 bg-[#CC0000]/10 border border-[#CC0000]/30 rounded-lg">
                  <span className="text-xs text-[#CC0000] font-sora leading-relaxed">{deleteError}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#2A2A2A]">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
              {!deleteError && (
                <Button
                  size="sm"
                  loading={deleting}
                  onClick={handleDelete}
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
