import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Package,
  X,
  XCircle,
  Plus,
  Pencil,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { PageHeader } from '../components/ui/PageHeader'
import { Select } from '../components/ui/Select'
import type { Estoque, TipoEstoque, StatusEstoque } from '../types'

// ── helpers ─────────────────────────────────────────────────────────────────

function pct(restantes: number, totais: number): number {
  if (totais === 0) return 0
  return Math.min(100, (restantes / totais) * 100)
}

function barColor(p: number): string {
  if (p > 50) return '#22C55E'
  if (p >= 20) return '#EAB308'
  return '#EF4444'
}

function fmtDate(iso?: string): string {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR }) }
  catch { return '—' }
}

function fmtCurrency(v?: number): string {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── StockBar ─────────────────────────────────────────────────────────────────

function StockBar({ restantes, totais }: { restantes: number; totais: number }) {
  const p = pct(restantes, totais)
  const color = barColor(p)
  return (
    <div className="w-full h-2 bg-[#111111] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${p}%`, backgroundColor: color }}
      />
    </div>
  )
}

// ── tipos do formulário ───────────────────────────────────────────────────────

interface BobinaForm {
  nome: string
  tipo: TipoEstoque
  marca: string
  serie: string
  largura_cm: string
  metros_totais: string
  alerta_metros: string
  data_compra: string
  custo_total: string
  fornecedor: string
}

type BobinaErrors = Partial<Record<keyof BobinaForm, string>>

const FORM_INITIAL: BobinaForm = {
  nome: '',
  tipo: 'solar',
  marca: '',
  serie: '',
  largura_cm: '',
  metros_totais: '',
  alerta_metros: '',
  data_compra: '',
  custo_total: '',
  fornecedor: '',
}

// ── página ────────────────────────────────────────────────────────────────────

export function EstoquePage() {
  const [bobinas, setBobinas] = useState<Estoque[]>([])
  const [loading, setLoading] = useState(true)

  // modal nova bobina
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Estoque | null>(null)
  const [form, setForm] = useState<BobinaForm>(FORM_INITIAL)
  const [errors, setErrors] = useState<BobinaErrors>({})
  const [saving, setSaving] = useState(false)

  // modal confirmar esgotada
  const [esgotandoId, setEsgotandoId] = useState<string | null>(null)

  const fetchBobinas = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('estoque')
      .select('*')
      .order('created_at', { ascending: false })
    setBobinas(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchBobinas() }, [fetchBobinas])

  // ── resumo ─────────────────────────────────────────────────────────────────

  const ativas = bobinas.filter(b => b.status === 'ativa')
  const emAlerta = ativas.filter(b => b.metros_restantes <= b.alerta_metros)
  const criticas = ativas.filter(b => b.metros_restantes <= 1)

  // ── modal helpers ──────────────────────────────────────────────────────────

  function openNova() {
    setEditTarget(null)
    setForm(FORM_INITIAL)
    setErrors({})
    setModalOpen(true)
  }

  function openEditar(b: Estoque) {
    setEditTarget(b)
    setForm({
      nome: b.nome,
      tipo: b.tipo,
      marca: b.marca,
      serie: b.serie ?? '',
      largura_cm: String(b.largura_cm),
      metros_totais: String(b.metros_totais),
      alerta_metros: String(b.alerta_metros),
      data_compra: b.data_compra ?? '',
      custo_total: b.custo_total != null ? String(b.custo_total) : '',
      fornecedor: b.fornecedor ?? '',
    })
    setErrors({})
    setModalOpen(true)
  }

  function setField<K extends keyof BobinaForm>(key: K, value: BobinaForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function validate(): boolean {
    const next: BobinaErrors = {}
    if (!form.nome.trim()) next.nome = 'Informe o nome'
    if (!form.marca.trim()) next.marca = 'Informe a marca'
    const larg = Number(form.largura_cm)
    if (!form.largura_cm || isNaN(larg) || larg <= 0) next.largura_cm = 'Largura inválida'
    const mt = Number(form.metros_totais)
    if (!form.metros_totais || isNaN(mt) || mt <= 0) next.metros_totais = 'Metros inválidos'
    const am = Number(form.alerta_metros)
    if (!form.alerta_metros || isNaN(am) || am < 0) next.alerta_metros = 'Alerta inválido'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)

    const metros_totais = Number(form.metros_totais)
    const payload = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      marca: form.marca.trim(),
      serie: form.serie.trim() || null,
      largura_cm: Number(form.largura_cm),
      metros_totais,
      alerta_metros: Number(form.alerta_metros),
      data_compra: form.data_compra || null,
      custo_total: form.custo_total ? Number(form.custo_total) : null,
      fornecedor: form.fornecedor.trim() || null,
    }

    if (editTarget) {
      // no edit: recalcula metros_restantes se metros_totais mudou
      const delta = metros_totais - editTarget.metros_totais
      await supabase
        .from('estoque')
        .update({
          ...payload,
          metros_restantes: editTarget.metros_restantes + delta,
        })
        .eq('id', editTarget.id)
    } else {
      await supabase.from('estoque').insert({
        ...payload,
        metros_usados: 0,
        metros_restantes: metros_totais,
        status: 'ativa' as StatusEstoque,
      })
    }

    setSaving(false)
    setModalOpen(false)
    fetchBobinas()
  }

  async function handleEsgotada(id: string) {
    await supabase.from('estoque').update({ status: 'esgotada' }).eq('id', id)
    setEsgotandoId(null)
    fetchBobinas()
  }

  // ── render ────────────────────────────────────────────────────────────────

  const tipoOptions = [
    { value: 'solar', label: 'Solar' },
    { value: 'ppf', label: 'PPF' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque de Bobinas"
        breadcrumbs={[{ label: 'Estoque' }]}
        action={
          <Button size="sm" onClick={openNova}>
            <Plus size={14} />
            Nova Bobina
          </Button>
        }
      />

      {/* ── SEÇÃO 1 — Resumo ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Ativas */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] border-l-[3px] border-l-[#22C55E] rounded-[8px] p-5">
          <div className="flex items-center gap-3">
            <Package size={20} className="text-[#22C55E] shrink-0" />
            <div>
              <p className="text-xs text-brand-muted font-sora uppercase tracking-wider">Bobinas Ativas</p>
              <p className="font-rajdhani font-bold text-3xl text-brand-text">{ativas.length}</p>
            </div>
          </div>
        </div>

        {/* Em alerta */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] border-l-[3px] border-l-[#EAB308] rounded-[8px] p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-[#EAB308] shrink-0" />
            <div>
              <p className="text-xs text-brand-muted font-sora uppercase tracking-wider">Em Alerta</p>
              <p className="font-rajdhani font-bold text-3xl text-brand-text">{emAlerta.length}</p>
            </div>
          </div>
          <p className="text-xs text-brand-muted mt-2 font-sora">≤ limite configurado</p>
        </div>

        {/* Críticas */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] border-l-[3px] border-l-[#EF4444] rounded-[8px] p-5">
          <div className="flex items-center gap-3">
            <XCircle size={20} className="text-[#EF4444] shrink-0" />
            <div>
              <p className="text-xs text-brand-muted font-sora uppercase tracking-wider">Críticas</p>
              <p className="font-rajdhani font-bold text-3xl text-brand-text">{criticas.length}</p>
            </div>
          </div>
          <p className="text-xs text-brand-muted mt-2 font-sora">≤ 1 m restante</p>
        </div>
      </div>

      {/* ── SEÇÃO 2 — Lista ── */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-[#CC0000] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bobinas.length === 0 ? (
        <Card>
          <div className="flex items-center gap-3 text-brand-muted py-4">
            <Package size={18} className="opacity-40 shrink-0" />
            <span className="text-sm font-sora">Nenhuma bobina cadastrada.</span>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {bobinas.map(b => {
            const p = pct(b.metros_restantes, b.metros_totais)
            const color = barColor(p)
            const custoPorMetro =
              b.custo_total && b.metros_totais
                ? b.custo_total / b.metros_totais
                : null
            const isEsgotada = b.status === 'esgotada'

            return (
              <div
                key={b.id}
                className={[
                  'bg-[#1A1A1A] border border-[#2A2A2A] border-l-[3px] rounded-[8px] p-4 space-y-3',
                  isEsgotada ? 'border-l-[#444] opacity-60' : 'border-l-[#CC0000]',
                ].join(' ')}
              >
                {/* Cabeçalho */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-rajdhani font-bold text-brand-text text-base leading-tight truncate">
                      {b.nome}
                    </h3>
                    <p className="text-xs text-brand-muted font-sora truncate">
                      {b.marca}{b.serie ? ` · ${b.serie}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={[
                        'text-xs px-2 py-0.5 rounded border font-medium font-sora',
                        b.tipo === 'ppf'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
                      ].join(' ')}
                    >
                      {b.tipo === 'ppf' ? 'PPF' : 'Solar'}
                    </span>
                    {isEsgotada && (
                      <span className="text-xs px-2 py-0.5 rounded border font-medium font-sora bg-zinc-500/10 text-zinc-400 border-zinc-500/30">
                        Esgotada
                      </span>
                    )}
                  </div>
                </div>

                {/* Barra de estoque */}
                <div className="space-y-1.5">
                  <StockBar restantes={b.metros_restantes} totais={b.metros_totais} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-sora font-semibold" style={{ color }}>
                      {b.metros_restantes.toFixed(2)} m restantes
                    </span>
                    <span className="text-xs text-brand-muted font-sora">
                      de {b.metros_totais.toFixed(2)} m
                    </span>
                  </div>
                </div>

                {/* Detalhes */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-sora">
                  {custoPorMetro != null && (
                    <>
                      <span className="text-brand-muted">Custo/metro</span>
                      <span className="text-brand-text text-right">
                        {custoPorMetro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </>
                  )}
                  {b.custo_total != null && (
                    <>
                      <span className="text-brand-muted">Custo total</span>
                      <span className="text-brand-text text-right">{fmtCurrency(b.custo_total)}</span>
                    </>
                  )}
                  {b.largura_cm > 0 && (
                    <>
                      <span className="text-brand-muted">Largura</span>
                      <span className="text-brand-text text-right">{b.largura_cm} cm</span>
                    </>
                  )}
                  {b.data_compra && (
                    <>
                      <span className="text-brand-muted">Compra</span>
                      <span className="text-brand-text text-right">{fmtDate(b.data_compra)}</span>
                    </>
                  )}
                  {b.fornecedor && (
                    <>
                      <span className="text-brand-muted">Fornecedor</span>
                      <span className="text-brand-text text-right truncate">{b.fornecedor}</span>
                    </>
                  )}
                </div>

                {/* Ações */}
                {!isEsgotada && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 border border-[#2A2A2A]"
                      onClick={() => openEditar(b)}
                    >
                      <Pencil size={12} />
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEsgotandoId(b.id)}
                    >
                      <XCircle size={12} />
                      Marcar Esgotada
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal — Nova / Editar Bobina ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A] shrink-0">
              <h3 className="font-rajdhani font-bold text-lg text-brand-text">
                {editTarget ? 'Editar Bobina' : 'Nova Bobina'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-brand-muted hover:text-brand-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Input
                    label="Nome"
                    placeholder="Ex: Llumar ATR 150cm"
                    value={form.nome}
                    onChange={e => setField('nome', e.target.value)}
                    error={errors.nome}
                  />
                </div>

                <Select
                  label="Tipo"
                  options={tipoOptions}
                  value={form.tipo}
                  onChange={e => setField('tipo', e.target.value as TipoEstoque)}
                />

                <Input
                  label="Marca"
                  placeholder="Ex: Llumar"
                  value={form.marca}
                  onChange={e => setField('marca', e.target.value)}
                  error={errors.marca}
                />

                <Input
                  label="Série"
                  placeholder="Ex: ATR"
                  value={form.serie}
                  onChange={e => setField('serie', e.target.value)}
                />

                <Input
                  label="Largura (cm)"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="Ex: 152"
                  value={form.largura_cm}
                  onChange={e => setField('largura_cm', e.target.value)}
                  error={errors.largura_cm}
                />

                <Input
                  label="Metros Totais"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 30.5"
                  value={form.metros_totais}
                  onChange={e => setField('metros_totais', e.target.value)}
                  error={errors.metros_totais}
                />

                <Input
                  label="Alerta (metros)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 5"
                  value={form.alerta_metros}
                  onChange={e => setField('alerta_metros', e.target.value)}
                  error={errors.alerta_metros}
                />

                <Input
                  label="Data de Compra"
                  type="date"
                  value={form.data_compra}
                  onChange={e => setField('data_compra', e.target.value)}
                />

                <Input
                  label="Custo Total (R$)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 850.00"
                  value={form.custo_total}
                  onChange={e => setField('custo_total', e.target.value)}
                />

                <div className="col-span-2">
                  <Input
                    label="Fornecedor"
                    placeholder="Ex: Distribuidora XYZ"
                    value={form.fornecedor}
                    onChange={e => setField('fornecedor', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#2A2A2A] shrink-0">
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                loading={saving}
                onClick={handleSave}
                className="bg-[#CC0000] hover:bg-[#E60000] text-white font-semibold"
              >
                {editTarget ? 'Salvar Alterações' : 'Cadastrar Bobina'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal — Confirmar Esgotada ── */}
      {esgotandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setEsgotandoId(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <XCircle size={22} className="text-[#EF4444] shrink-0" />
              <h3 className="font-rajdhani font-bold text-lg text-brand-text">Confirmar</h3>
            </div>
            <p className="text-sm text-brand-muted font-sora">
              Marcar esta bobina como <span className="text-[#EF4444] font-semibold">esgotada</span>?
              Ela não aparecerá mais na seleção de serviços.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEsgotandoId(null)}>
                Cancelar
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleEsgotada(esgotandoId)}>
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
