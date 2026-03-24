import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Inbox,
  Plus,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import type { Agendamento, StatusAgendamento, TipoServico } from '../types'

// ─── tipos locais ─────────────────────────────────────────────────────────────

type FilterKey = 'todos' | StatusAgendamento | 'em_execucao'

interface FilterTab {
  label: string
  value: FilterKey
}

// ─── constantes ──────────────────────────────────────────────────────────────

const filterTabs: FilterTab[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Pendente', value: 'pendente' },
  { label: 'Confirmado', value: 'confirmado' },
  { label: 'Em Execução', value: 'em_execucao' },
]

const tipoLabel: Record<string, string> = {
  solar: 'Insulfilm',
  ppf: 'PPF',
  ambos: 'Insulfilm + PPF',
  consulta: 'Consulta',
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatHora(hora: string | undefined) {
  return hora ? hora.slice(0, 5) : '—'
}

function formatData(data: string | undefined) {
  if (!data) return '—'
  try {
    return format(new Date(data + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })
  } catch {
    return data
  }
}

// ─── skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-[#1A1A1A] border border-[#2A2A2A] border-l-2 border-l-brand-gold rounded-[8px] p-5 flex flex-col gap-3">
      <div className="flex justify-between">
        <div className="h-4 bg-[#2A2A2A] rounded w-1/3" />
        <div className="h-5 bg-[#2A2A2A] rounded w-20" />
      </div>
      <div className="h-5 bg-[#2A2A2A] rounded w-1/2" />
      <div className="h-3 bg-[#2A2A2A] rounded w-2/3" />
      <div className="h-8 bg-[#2A2A2A] rounded mt-1" />
    </div>
  )
}

// ─── componente principal ─────────────────────────────────────────────────────

export function AgendamentosPage() {
  const navigate = useNavigate()

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [veiculosEmExecucao, setVeiculosEmExecucao] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('todos')
  const [updating, setUpdating] = useState<string | null>(null)
  const [startingChecklist, setStartingChecklist] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [agRes, execRes] = await Promise.all([
        supabase
          .from('agendamentos')
          .select('*')
          .order('data_solicitada', { ascending: false })
          .order('hora_preferencial', { ascending: true }),
        supabase
          .from('servicos')
          .select('veiculo_id')
          .eq('status', 'em_execucao'),
      ])

      setAgendamentos((agRes.data ?? []) as Agendamento[])

      const ids = new Set<string>(
        (execRes.data ?? [])
          .map((s: { veiculo_id: string }) => s.veiculo_id)
          .filter(Boolean),
      )
      setVeiculosEmExecucao(ids)
    } finally {
      setLoading(false)
    }
  }

  const confirmar = useCallback(async (id: string) => {
    setUpdating(id)
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'confirmado' })
        .eq('id', id)
      if (!error) {
        setAgendamentos(prev =>
          prev.map(a => (a.id === id ? { ...a, status: 'confirmado' as StatusAgendamento } : a)),
        )
      }
    } finally {
      setUpdating(null)
    }
  }, [])

  const iniciarChecklist = useCallback(async (ag: Agendamento) => {
    if (!ag.veiculo_id) return
    setStartingChecklist(ag.id)
    try {
      const { data: existing } = await supabase
        .from('servicos')
        .select('id')
        .eq('veiculo_id', ag.veiculo_id)
        .eq('status', 'agendado')
        .limit(1)

      let servicoId: string

      if (existing && existing.length > 0) {
        servicoId = (existing[0] as { id: string }).id
      } else {
        const tipo: TipoServico =
          ag.servico_interesse === 'consulta' || !ag.servico_interesse
            ? 'solar'
            : ag.servico_interesse

        const { data: novo, error } = await supabase
          .from('servicos')
          .insert({
            veiculo_id: ag.veiculo_id,
            tipo,
            status: 'agendado',
            data_agendamento: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (error || !novo) return
        servicoId = (novo as { id: string }).id
      }

      navigate(`/checklist/${servicoId}`)
    } finally {
      setStartingChecklist(null)
    }
  }, [navigate])

  const cancelar = useCallback(async (id: string) => {
    setUpdating(id)
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'cancelado' })
        .eq('id', id)
      if (!error) {
        setAgendamentos(prev =>
          prev.map(a => (a.id === id ? { ...a, status: 'cancelado' as StatusAgendamento } : a)),
        )
      }
    } finally {
      setUpdating(null)
    }
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'todos') return agendamentos
    if (filter === 'em_execucao') {
      return agendamentos.filter(a => a.veiculo_id && veiculosEmExecucao.has(a.veiculo_id))
    }
    return agendamentos.filter(a => a.status === filter)
  }, [agendamentos, filter, veiculosEmExecucao])

  const counts = useMemo(() => {
    const acc: Partial<Record<FilterKey, number>> = { todos: agendamentos.length }
    for (const ag of agendamentos) {
      acc[ag.status] = (acc[ag.status] ?? 0) + 1
    }
    acc.em_execucao = agendamentos.filter(
      a => a.veiculo_id && veiculosEmExecucao.has(a.veiculo_id),
    ).length
    return acc
  }, [agendamentos, veiculosEmExecucao])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Agendamentos"
        action={
          <Link to="/agendamentos/novo">
            <Button variant="primary" size="md">
              <Plus size={15} />
              Novo Agendamento
            </Button>
          </Link>
        }
      />

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {filterTabs.map(tab => {
          const count = counts[tab.value] ?? 0
          const active = filter === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-sora font-medium transition-colors border ${
                active
                  ? 'bg-brand-red border-brand-red text-white'
                  : 'bg-transparent border-[#2A2A2A] text-[#888] hover:border-[#3A3A3A] hover:text-brand-text'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-white/20 text-white' : 'bg-[#2A2A2A] text-[#666]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Lista ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center">
            <Inbox size={28} strokeWidth={1.2} className="text-[#444]" />
          </div>
          <p className="font-heading font-bold text-xl text-[#444] tracking-wide">
            Nenhum agendamento
          </p>
          <p className="text-sm font-sora text-[#555]">
            {filter === 'todos'
              ? 'Crie o primeiro agendamento.'
              : 'Nenhum agendamento com este filtro.'}
          </p>
          {filter === 'todos' && (
            <Link to="/agendamentos/novo">
              <Button variant="primary" size="sm" className="mt-2">
                <Plus size={14} />
                Novo Agendamento
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(ag => (
            <AgendamentoCard
              key={ag.id}
              agendamento={ag}
              emExecucao={ag.veiculo_id ? veiculosEmExecucao.has(ag.veiculo_id) : false}
              updating={updating === ag.id}
              startingChecklist={startingChecklist === ag.id}
              onConfirmar={() => confirmar(ag.id)}
              onCancelar={() => cancelar(ag.id)}
              onIniciarChecklist={() => iniciarChecklist(ag)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Card de agendamento ──────────────────────────────────────────────────────

interface AgendamentoCardProps {
  agendamento: Agendamento
  emExecucao: boolean
  updating: boolean
  startingChecklist: boolean
  onConfirmar: () => void
  onCancelar: () => void
  onIniciarChecklist: () => void
}

function AgendamentoCard({
  agendamento: ag,
  emExecucao,
  updating,
  startingChecklist,
  onConfirmar,
  onCancelar,
  onIniciarChecklist,
}: AgendamentoCardProps) {
  const isCancelado = ag.status === 'cancelado'

  return (
    <Card accent className={`flex flex-col gap-3 h-full ${isCancelado ? 'opacity-60' : ''}`}>
      {/* Hora + Data + Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-brand-gold" />
            <span className="font-heading font-bold text-lg text-brand-gold tracking-wide">
              {formatHora(ag.hora_preferencial)}
            </span>
          </div>
          <span className="text-xs text-[#666] font-sora">{formatData(ag.data_solicitada)}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {emExecucao && <Badge status="em_execucao" />}
          <Badge status={ag.status} />
        </div>
      </div>

      {/* Cliente */}
      <div>
        <p className="font-heading font-bold text-base text-brand-text leading-tight">
          {ag.nome_cliente ?? '—'}
        </p>
        {ag.whatsapp_cliente && (
          <p className="text-xs text-[#666] font-sora mt-0.5">{ag.whatsapp_cliente}</p>
        )}
      </div>

      {/* Veículo + Serviço */}
      <div className="flex-1 flex flex-col gap-1">
        {ag.modelo_veiculo && (
          <p className="text-xs text-[#999] font-sora">{ag.modelo_veiculo}</p>
        )}
        {ag.servico_interesse && (
          <span className="text-xs font-medium text-brand-gold font-sora">
            {tipoLabel[ag.servico_interesse] ?? ag.servico_interesse}
          </span>
        )}
        {ag.observacoes && (
          <p className="text-xs text-[#666] font-sora line-clamp-2 mt-0.5 italic">
            {ag.observacoes}
          </p>
        )}
      </div>

      {/* Ações */}
      <div className="pt-2 border-t border-[#2A2A2A]">
        {isCancelado ? (
          <span className="text-xs text-[#555] font-sora">Agendamento cancelado</span>
        ) : (
          <div className="flex gap-2">
            {ag.status === 'pendente' && (
              <Button
                variant="primary"
                size="sm"
                loading={updating}
                onClick={onConfirmar}
                className="flex-1"
              >
                <CheckCircle2 size={13} />
                Confirmar
              </Button>
            )}
            {ag.status === 'confirmado' && (
              <Button
                variant="secondary"
                size="sm"
                loading={startingChecklist}
                onClick={onIniciarChecklist}
                className="flex-1"
              >
                <ClipboardList size={13} />
                Iniciar Checklist
              </Button>
            )}
            {ag.status === 'reagendado' && (
              <div className="flex-1 flex items-center">
                <Badge status="reagendado" />
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              loading={updating}
              onClick={onCancelar}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <XCircle size={13} />
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
