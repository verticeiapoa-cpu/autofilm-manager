import { useCallback, useEffect, useState } from 'react'
import { DollarSign, Pencil, Plus, Tag, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { PageHeader } from '../components/ui/PageHeader'
import { Select } from '../components/ui/Select'
import type { TabelaPreco, TipoPreco } from '../types'

// ── Tipos do formulário ───────────────────────────────────────────────────────

interface PrecoForm {
  nome: string
  tipo: TipoPreco
  peca: string
  preco: string
  descricao: string
}

type FormErrors = Partial<Record<keyof PrecoForm, string>>

const FORM_INITIAL: PrecoForm = {
  nome: '',
  tipo: 'solar',
  peca: '',
  preco: '',
  descricao: '',
}

const TIPO_OPTIONS = [
  { value: 'solar', label: 'Insulfilm Solar' },
  { value: 'ppf',   label: 'PPF' },
  { value: 'ambos', label: 'Solar + PPF' },
]

const TIPO_BADGE: Record<TipoPreco, { label: string; cls: string }> = {
  solar: { label: 'Solar',    cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  ppf:   { label: 'PPF',     cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  ambos: { label: 'Ambos',   cls: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
}

function fmtCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── Componente principal ──────────────────────────────────────────────────────

export function TabelaPrecosPage() {
  const [precos, setPrecos]     = useState<TabelaPreco[]>([])
  const [loading, setLoading]   = useState(true)

  // Modal criar/editar
  const [modalOpen, setModalOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState<TabelaPreco | null>(null)
  const [form, setForm]             = useState<PrecoForm>(FORM_INITIAL)
  const [errors, setErrors]         = useState<FormErrors>({})
  const [saving, setSaving]         = useState(false)

  // Modal excluir
  const [deleteTarget, setDeleteTarget] = useState<TabelaPreco | null>(null)
  const [deleting, setDeleting]         = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchPrecos = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tabela_precos')
      .select('*')
      .order('tipo', { ascending: true })
      .order('nome', { ascending: true })
    setPrecos((data ?? []) as TabelaPreco[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPrecos() }, [fetchPrecos])

  // ── Helpers ────────────────────────────────────────────────────────────────

  function setField<K extends keyof PrecoForm>(k: K, v: PrecoForm[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function validate(): boolean {
    const next: FormErrors = {}
    if (!form.nome.trim())                       next.nome  = 'Informe o nome'
    if (!form.preco || isNaN(Number(form.preco)) || Number(form.preco) <= 0)
      next.preco = 'Informe um preço válido'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  // ── Abrir modal criar ──────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null)
    setForm(FORM_INITIAL)
    setErrors({})
    setModalOpen(true)
  }

  // ── Abrir modal editar ─────────────────────────────────────────────────────

  function openEdit(p: TabelaPreco) {
    setEditTarget(p)
    setForm({
      nome:      p.nome,
      tipo:      p.tipo,
      peca:      p.peca ?? '',
      preco:     String(p.preco),
      descricao: p.descricao ?? '',
    })
    setErrors({})
    setModalOpen(true)
  }

  // ── Salvar (criar ou editar) ───────────────────────────────────────────────

  async function handleSave() {
    if (!validate()) return
    setSaving(true)

    const payload = {
      nome:      form.nome.trim(),
      tipo:      form.tipo,
      peca:      form.peca.trim()      || null,
      preco:     Number(form.preco),
      descricao: form.descricao.trim() || null,
    }

    if (editTarget) {
      await supabase.from('tabela_precos').update(payload).eq('id', editTarget.id)
    } else {
      await supabase.from('tabela_precos').insert({ ...payload, ativo: true })
    }

    setSaving(false)
    setModalOpen(false)
    fetchPrecos()
  }

  // ── Toggle ativo ───────────────────────────────────────────────────────────

  async function handleToggle(p: TabelaPreco) {
    await supabase
      .from('tabela_precos')
      .update({ ativo: !p.ativo })
      .eq('id', p.id)
    fetchPrecos()
  }

  // ── Excluir ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await supabase.from('tabela_precos').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    fetchPrecos()
  }

  // ── Agrupamento por tipo ───────────────────────────────────────────────────

  const grupos = (([
    { tipo: 'solar' as TipoPreco, label: 'Insulfilm Solar', items: precos.filter(p => p.tipo === 'solar') },
    { tipo: 'ppf'   as TipoPreco, label: 'PPF',             items: precos.filter(p => p.tipo === 'ppf') },
    { tipo: 'ambos' as TipoPreco, label: 'Solar + PPF',     items: precos.filter(p => p.tipo === 'ambos') },
  ]) as { tipo: TipoPreco; label: string; items: TabelaPreco[] }[]).filter(g => g.items.length > 0)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tabela de Preços"
        breadcrumbs={[{ label: 'Preços' }]}
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} />
            Novo Preço
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-[#CC0000] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : precos.length === 0 ? (
        <Card>
          <div className="flex items-center gap-3 text-brand-muted py-4">
            <DollarSign size={18} className="opacity-40 shrink-0" />
            <span className="text-sm font-sora">Nenhum preço cadastrado.</span>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {grupos.map(({ tipo, label, items }) => (
            <section key={tipo} className="space-y-3">
              {/* Título do grupo */}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border font-sora ${TIPO_BADGE[tipo].cls}`}>
                  {TIPO_BADGE[tipo].label}
                </span>
                <h2 className="font-rajdhani font-bold text-lg text-brand-text">{label}</h2>
              </div>

              {/* Tabela */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2A2A2A]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-brand-muted font-sora uppercase tracking-wider">
                        Serviço
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-brand-muted font-sora uppercase tracking-wider hidden sm:table-cell">
                        Peça
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-brand-muted font-sora uppercase tracking-wider">
                        Preço
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-brand-muted font-sora uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p, i) => (
                      <tr
                        key={p.id}
                        className={[
                          'transition-colors',
                          i < items.length - 1 ? 'border-b border-[#222]' : '',
                          !p.ativo ? 'opacity-50' : '',
                        ].join(' ')}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-brand-text font-sora">{p.nome}</p>
                          {p.descricao && (
                            <p className="text-xs text-brand-muted font-sora mt-0.5">{p.descricao}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {p.peca ? (
                            <span className="flex items-center gap-1 text-xs text-brand-muted font-sora">
                              <Tag size={11} />
                              {p.peca}
                            </span>
                          ) : (
                            <span className="text-xs text-brand-muted/40 font-sora">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-rajdhani font-bold text-[#D4A017] text-base">
                            {fmtCurrency(p.preco)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggle(p)}
                            className="flex items-center gap-1 mx-auto text-xs font-sora transition-colors"
                            title={p.ativo ? 'Desativar' : 'Ativar'}
                          >
                            {p.ativo ? (
                              <>
                                <ToggleRight size={18} className="text-green-400" />
                                <span className="text-green-400 hidden sm:inline">Ativo</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft size={18} className="text-brand-muted" />
                                <span className="text-brand-muted hidden sm:inline">Inativo</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(p)}
                              className="p-1.5 rounded text-brand-muted hover:text-brand-text hover:bg-white/5 transition-colors"
                              title="Editar"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="p-1.5 rounded text-brand-muted hover:text-[#CC0000] hover:bg-[#CC0000]/10 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Modal Criar / Editar ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
              <h3 className="font-rajdhani font-bold text-lg text-brand-text">
                {editTarget ? 'Editar Preço' : 'Novo Preço'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-brand-muted hover:text-brand-text transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <Input
                label="Nome do serviço"
                placeholder="Ex: Insulfilm Para-brisa"
                value={form.nome}
                onChange={e => setField('nome', e.target.value)}
                error={errors.nome}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Tipo"
                  options={TIPO_OPTIONS}
                  value={form.tipo}
                  onChange={e => setField('tipo', e.target.value as TipoPreco)}
                />
                <Input
                  label="Preço (R$)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={form.preco}
                  onChange={e => setField('preco', e.target.value)}
                  error={errors.preco}
                />
              </div>
              <Input
                label="Peça (opcional)"
                placeholder="Ex: Para-brisa, Capô..."
                value={form.peca}
                onChange={e => setField('peca', e.target.value)}
              />
              <Input
                label="Descrição (opcional)"
                placeholder="Detalhes do serviço..."
                value={form.descricao}
                onChange={e => setField('descricao', e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#2A2A2A]">
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button
                size="sm"
                loading={saving}
                onClick={handleSave}
                className="bg-[#CC0000] hover:bg-[#E60000] text-white font-semibold"
              >
                {editTarget ? 'Salvar Alterações' : 'Cadastrar Preço'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Excluir ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative z-10 w-full max-w-sm bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
              <h3 className="font-rajdhani font-bold text-lg text-brand-text">Excluir Preço</h3>
              <button onClick={() => setDeleteTarget(null)} className="text-brand-muted hover:text-brand-text transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-brand-muted font-sora leading-relaxed">
                Deseja excluir o preço{' '}
                <span className="text-brand-text font-semibold">{deleteTarget.nome}</span>?
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#2A2A2A]">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
              <Button
                size="sm"
                loading={deleting}
                onClick={handleDelete}
                className="bg-[#CC0000] hover:bg-[#E60000] text-white font-semibold"
              >
                <Trash2 size={14} />
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
