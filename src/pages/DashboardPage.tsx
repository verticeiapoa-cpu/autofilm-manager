import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, addDays, differenceInDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar,
  Car,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  MessageCircle,
  Package,
  ClipboardList,
  Inbox,
  Shield,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  useAppStore,
  selectAgendamentosHoje,
  selectLoadingAgendamentos,
  selectEstoqueAlertas,
} from '../store'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import type { Estoque, Servico } from '../types'

// ─── tipos locais ────────────────────────────────────────────────────────────

interface GarantiaProxima {
  id: string
  tipo: string
  garantia_validade: string
  veiculo: {
    marca: string
    modelo: string
    cliente: { nome: string; whatsapp: string } | null
  } | null
}

interface ServicoComJoin extends Servico {
  veiculo: {
    marca: string
    modelo: string
    cliente: {
      nome: string
    } | null
  } | null
}

interface KpiData {
  agendamentosHoje: number
  carrosEmExecucao: number
  concluidosMes: number
  faturamentoMes: number
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function fmtDateShort(iso?: string | null): string {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR }) }
  catch { return '—' }
}

function waGarantiaLink(whatsapp: string, nome: string, marcaModelo: string, dias: number, dataFmt: string): string {
  const msg =
    `Olá ${nome}! 👋 A garantia da película aplicada no seu ${marcaModelo} vence em ${dias} dias (${dataFmt}). ` +
    `Caso queira fazer uma revisão ou renovação, estamos à disposição! 🚗`
  return `https://wa.me/55${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
}

function formatHora(hora: string | undefined) {
  if (!hora) return '—'
  return hora.slice(0, 5)
}

const tipoServicoLabel: Record<string, string> = {
  solar: 'Insulfilm',
  ppf: 'PPF',
  ambos: 'Insulfilm + PPF',
  consulta: 'Consulta',
}

// ─── skeleton ────────────────────────────────────────────────────────────────

function SkeletonBox({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#2A2A2A] rounded-md ${className}`} />
}

function KpiSkeleton() {
  return (
    <Card className="flex flex-col gap-3">
      <SkeletonBox className="h-4 w-24" />
      <SkeletonBox className="h-8 w-16" />
      <SkeletonBox className="h-3 w-32" />
    </Card>
  )
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-[#2A2A2A]">
      <SkeletonBox className="h-4 w-12" />
      <SkeletonBox className="h-4 flex-1" />
      <SkeletonBox className="h-5 w-20" />
    </div>
  )
}

// ─── componente principal ─────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate()

  // store
  const agendamentosHoje = useAppStore(selectAgendamentosHoje)
  const loadingAgendamentos = useAppStore(selectLoadingAgendamentos)
  const estoqueAlertas = useAppStore(selectEstoqueAlertas)
  const fetchAgendamentosHoje = useAppStore((s) => s.fetchAgendamentosHoje)
  const fetchEstoqueAlertas = useAppStore((s) => s.fetchEstoqueAlertas)

  // local state
  const [kpi, setKpi] = useState<KpiData | null>(null)
  const [loadingKpi, setLoadingKpi] = useState(true)
  const [ultimosServicos, setUltimosServicos] = useState<ServicoComJoin[]>([])
  const [loadingUltimos, setLoadingUltimos] = useState(true)
  const [garantiasProximas, setGarantiasProximas] = useState<GarantiaProxima[]>([])

  useEffect(() => {
    fetchAgendamentosHoje()
    fetchEstoqueAlertas()
    loadKpi()
    loadUltimosServicos()
    loadGarantiasProximas()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadKpi() {
    setLoadingKpi(true)
    try {
      const hoje = new Date().toISOString().slice(0, 10)
      const inicioMes = startOfMonth(new Date()).toISOString().slice(0, 10)
      const fimMes = endOfMonth(new Date()).toISOString().slice(0, 10)

      const [agCount, execCount, concluidosRes] = await Promise.all([
        supabase
          .from('agendamentos')
          .select('id', { count: 'exact', head: true })
          .eq('data_solicitada', hoje),

        supabase
          .from('servicos')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'em_execucao'),

        supabase
          .from('servicos')
          .select('id, valor_total')
          .eq('status', 'concluido')
          .gte('data_conclusao', inicioMes)
          .lte('data_conclusao', fimMes),
      ])

      const concluidosMes = concluidosRes.data?.length ?? 0
      const faturamentoMes =
        concluidosRes.data?.reduce((acc, s) => acc + (s.valor_total ?? 0), 0) ?? 0

      setKpi({
        agendamentosHoje: agCount.count ?? 0,
        carrosEmExecucao: execCount.count ?? 0,
        concluidosMes,
        faturamentoMes,
      })
    } finally {
      setLoadingKpi(false)
    }
  }

  async function loadUltimosServicos() {
    setLoadingUltimos(true)
    try {
      const { data } = await supabase
        .from('servicos')
        .select(`
          *,
          veiculo:veiculos(
            marca,
            modelo,
            cliente:clientes(nome)
          )
        `)
        .eq('status', 'concluido')
        .order('data_conclusao', { ascending: false })
        .limit(5)

      setUltimosServicos((data ?? []) as ServicoComJoin[])
    } finally {
      setLoadingUltimos(false)
    }
  }

  async function loadGarantiasProximas() {
    const hoje = new Date().toISOString().slice(0, 10)
    const limite = addDays(new Date(), 30).toISOString().slice(0, 10)
    const { data } = await supabase
      .from('servicos')
      .select(`
        id, tipo, garantia_validade,
        veiculo:veiculos(
          marca, modelo,
          cliente:clientes(nome, whatsapp)
        )
      `)
      .eq('status', 'concluido')
      .gte('garantia_validade', hoje)
      .lte('garantia_validade', limite)
      .order('garantia_validade', { ascending: true })
    setGarantiasProximas((data ?? []) as unknown as GarantiaProxima[])
  }

  const kpiCards = [
    {
      label: 'Agendamentos hoje',
      value: kpi?.agendamentosHoje ?? 0,
      icon: Calendar,
      sub: format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR }),
      highlight: false,
    },
    {
      label: 'Carros em execução',
      value: kpi?.carrosEmExecucao ?? 0,
      icon: Car,
      sub: 'Serviços em andamento',
      highlight: false,
    },
    {
      label: 'Concluídos no mês',
      value: kpi?.concluidosMes ?? 0,
      icon: CheckCircle2,
      sub: format(new Date(), 'MMMM yyyy', { locale: ptBR }),
      highlight: false,
    },
    {
      label: 'Faturamento do mês',
      value: kpi ? formatCurrency(kpi.faturamentoMes) : '—',
      icon: DollarSign,
      sub: 'Serviços concluídos',
      highlight: true,
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Dashboard" />

      {/* ── SEÇÃO 1 — KPIs ──────────────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingKpi
            ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
            : kpiCards.map((card) => {
                const Icon = card.icon
                return (
                  <Card key={card.label} accent className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#888] font-sora uppercase tracking-wider">
                        {card.label}
                      </span>
                      <Icon size={16} className="text-[#555]" />
                    </div>
                    <span
                      className={`font-heading font-bold text-3xl tracking-tight ${
                        card.highlight ? 'text-brand-gold' : 'text-brand-text'
                      }`}
                    >
                      {card.value}
                    </span>
                    <span className="text-xs text-[#666] font-sora capitalize">{card.sub}</span>
                  </Card>
                )
              })}
        </div>
      </section>

      {/* ── SEÇÃO 2 — Alertas de Estoque ────────────────────────────────── */}
      {estoqueAlertas.length > 0 && (
        <section>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-[8px] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-yellow-400" />
                <h2 className="font-heading font-bold text-yellow-400 text-xl tracking-wide">
                  Alerta de Estoque
                </h2>
              </div>
              <Link to="/estoque">
                <Button variant="secondary" size="sm">
                  <Package size={14} />
                  Ver Estoque
                </Button>
              </Link>
            </div>

            <ul className="flex flex-col divide-y divide-yellow-500/10">
              {estoqueAlertas.map((bobina: Estoque) => (
                <li key={bobina.id} className="flex items-center justify-between py-2.5">
                  <div className="flex flex-col">
                    <span className="text-sm text-brand-text font-sora font-medium">
                      {bobina.nome}
                    </span>
                    <span className="text-xs text-[#888] font-sora">
                      {bobina.marca}
                      {bobina.serie ? ` · ${bobina.serie}` : ''}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-yellow-400 font-sora">
                      {bobina.metros_restantes.toFixed(1)} m restantes
                    </p>
                    <p className="text-xs text-[#888] font-sora">
                      alerta em {bobina.alerta_metros.toFixed(1)} m
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── SEÇÃO 2b — Garantias Próximas do Vencimento ─────────────────── */}
      {garantiasProximas.length > 0 && (
        <section>
          <div className="bg-[#D4A017]/10 border border-[#D4A017]/30 rounded-[8px] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-[#D4A017]" />
                <h2 className="font-heading font-bold text-[#D4A017] text-xl tracking-wide">
                  Garantias Próximas do Vencimento
                </h2>
              </div>
              <Link to="/garantias">
                <Button variant="secondary" size="sm">
                  <Shield size={14} />
                  Ver Todas
                </Button>
              </Link>
            </div>

            <ul className="flex flex-col divide-y divide-[#D4A017]/10">
              {garantiasProximas.map(g => {
                const dias = differenceInDays(parseISO(g.garantia_validade), new Date())
                const marcaModelo = g.veiculo
                  ? `${g.veiculo.marca} ${g.veiculo.modelo}`
                  : '—'
                return (
                  <li key={g.id} className="flex items-center justify-between py-3 gap-4">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-brand-text font-sora font-medium truncate">
                        {g.veiculo?.cliente?.nome ?? '—'}
                      </span>
                      <span className="text-xs text-[#888] font-sora">
                        {marcaModelo}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#D4A017] font-sora">
                          {dias} dia{dias !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-[#888] font-sora">
                          vence {fmtDateShort(g.garantia_validade)}
                        </p>
                      </div>
                      {g.veiculo?.cliente?.whatsapp && (
                        <a
                          href={waGarantiaLink(
                            g.veiculo.cliente.whatsapp,
                            g.veiculo.cliente.nome ?? '',
                            marcaModelo,
                            dias,
                            fmtDateShort(g.garantia_validade),
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/10"
                          >
                            <MessageCircle size={13} />
                            Contatar
                          </Button>
                        </a>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      {/* ── SEÇÃO 3 — Agenda do Dia ──────────────────────────────────────── */}
      <section>
        <Card accent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#888]" />
              <h2 className="font-heading font-bold text-xl text-brand-text tracking-wide">
                Agenda do Dia
              </h2>
            </div>
            <Link to="/agendamentos/novo">
              <Button variant="primary" size="sm">
                + Novo Agendamento
              </Button>
            </Link>
          </div>

          {loadingAgendamentos ? (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <RowSkeleton key={i} />
              ))}
            </div>
          ) : agendamentosHoje.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-[#555]">
              <Calendar size={32} strokeWidth={1.2} />
              <p className="text-sm font-sora">Nenhum agendamento para hoje</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[#2A2A2A]">
              {agendamentosHoje.map((ag) => (
                <div key={ag.id} className="flex items-center gap-4 py-3">
                  <span className="text-sm font-bold text-brand-gold font-sora w-12 shrink-0">
                    {formatHora(ag.hora_preferencial)}
                  </span>

                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm text-brand-text font-sora font-medium truncate">
                      {ag.nome_cliente ?? '—'}
                    </span>
                    <span className="text-xs text-[#888] font-sora">
                      {ag.modelo_veiculo ?? 'Veículo não informado'}
                      {ag.servico_interesse
                        ? ` · ${tipoServicoLabel[ag.servico_interesse] ?? ag.servico_interesse}`
                        : ''}
                    </span>
                  </div>

                  <Badge status={ag.status} />

                  {ag.status === 'confirmado' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/checklist/${ag.id}`)}
                    >
                      <ClipboardList size={13} />
                      Iniciar Checklist
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* ── SEÇÃO 4 — Últimos 5 Serviços Concluídos ─────────────────────── */}
      <section>
        <Card accent>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={16} className="text-[#888]" />
            <h2 className="font-heading font-bold text-xl text-brand-text tracking-wide">
              Últimos Serviços Concluídos
            </h2>
          </div>

          {loadingUltimos ? (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <RowSkeleton key={i} />
              ))}
            </div>
          ) : ultimosServicos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-[#555]">
              <Inbox size={36} strokeWidth={1.2} />
              <p className="text-sm font-sora">Nenhum serviço concluído ainda</p>
              <p className="text-xs font-sora">Os serviços finalizados aparecerão aqui</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-sora">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    {['Cliente', 'Veículo', 'Serviço', 'Data', 'Valor'].map((col) => (
                      <th
                        key={col}
                        className="pb-2 text-left text-xs text-[#666] uppercase tracking-wider font-medium"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ultimosServicos.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-[#1F1F1F] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 text-brand-text font-medium">
                        {s.veiculo?.cliente?.nome ?? '—'}
                      </td>
                      <td className="py-3 text-[#aaa]">
                        {s.veiculo ? `${s.veiculo.marca} ${s.veiculo.modelo}` : '—'}
                      </td>
                      <td className="py-3 text-[#aaa]">
                        {tipoServicoLabel[s.tipo] ?? s.tipo}
                      </td>
                      <td className="py-3 text-[#aaa] whitespace-nowrap">
                        {s.data_conclusao
                          ? format(new Date(s.data_conclusao), 'dd/MM/yyyy')
                          : '—'}
                      </td>
                      <td className="py-3 text-brand-gold font-semibold whitespace-nowrap">
                        {s.valor_total != null ? formatCurrency(s.valor_total) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  )
}
