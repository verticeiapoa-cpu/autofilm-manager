import { useCallback, useEffect, useState } from 'react'
import {
  format, startOfMonth, endOfMonth,
  subMonths, subDays, differenceInCalendarDays,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart2, TrendingDown, TrendingUp,
  Users, Package, Calendar, DollarSign,
  Award, Filter,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import { Select } from '../components/ui/Select'
import { Input } from '../components/ui/Input'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type PeriodoPreset = 'mes_atual' | 'mes_anterior' | '3_meses' | 'personalizado'

interface Filtro {
  preset: PeriodoPreset
  dataInicio: string // YYYY-MM-DD
  dataFim: string
}

interface ConsumoItem {
  bobinaNome: string
  marca: string
  serie: string
  metros: number
  custo: number
}

interface Top5Item {
  nome: string
  valor: number
  qtd: number
}

interface OrigemItem {
  origem: string
  count: number
}

interface Dados {
  // Card 1
  faturamentoTotal: number
  faturamentoAnterior: number
  mediaFaturamento: number
  // Card 2
  totalServicos: number
  porTipo: { solar: number; ppf: number; ambos: number }
  ticketMedio: number
  // Card 3
  consumoPorBobina: ConsumoItem[]
  totalMetros: number
  custoTotalMaterial: number
  peliculaMaisUsada: string
  // Card 4
  novosClientes: number
  recorrentes: number
  top5: Top5Item[]
  // Card 5
  totalAgendamentos: number
  taxaConversao: number
  origens: OrigemItem[]
}

// ── Helpers de data ───────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function computePeriodo(preset: PeriodoPreset, customInicio: string, customFim: string): { inicio: string; fim: string } {
  const hoje = new Date()
  switch (preset) {
    case 'mes_atual':
      return { inicio: toYMD(startOfMonth(hoje)), fim: toYMD(endOfMonth(hoje)) }
    case 'mes_anterior': {
      const prev = subMonths(hoje, 1)
      return { inicio: toYMD(startOfMonth(prev)), fim: toYMD(endOfMonth(prev)) }
    }
    case '3_meses': {
      const tres = subMonths(hoje, 2)
      return { inicio: toYMD(startOfMonth(tres)), fim: toYMD(endOfMonth(hoje)) }
    }
    case 'personalizado':
      return { inicio: customInicio, fim: customFim }
  }
}

function computeAnterior(inicio: string, fim: string): { inicio: string; fim: string } {
  const d1 = new Date(inicio + 'T00:00:00')
  const d2 = new Date(fim + 'T00:00:00')
  const dias = differenceInCalendarDays(d2, d1) + 1
  const antFim = subDays(d1, 1)
  const antInicio = subDays(antFim, dias - 1)
  return { inicio: toYMD(antInicio), fim: toYMD(antFim) }
}

function fmtCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtPct(v: number, dec = 1): string {
  return v.toFixed(dec) + '%'
}

const PERIODO_OPTIONS = [
  { value: 'mes_atual',    label: 'Mês atual' },
  { value: 'mes_anterior', label: 'Mês anterior' },
  { value: '3_meses',      label: 'Últimos 3 meses' },
  { value: 'personalizado', label: 'Personalizado' },
]

const ORIGEM_LABEL: Record<string, string> = {
  portal:    'Portal',
  whatsapp:  'WhatsApp',
  telefone:  'Telefone',
  app:       'App',
}

// ── Gráfico de rosca (SVG puro) ───────────────────────────────────────────────

interface DonutProps {
  solar: number
  ppf: number
  ambos: number
}

function DonutChart({ solar, ppf, ambos }: DonutProps) {
  const total = solar + ppf + ambos
  const r = 40
  const cx = 56
  const cy = 56
  const sw = 14
  const circ = 2 * Math.PI * r        // ~251.33
  const gap = total > 1 ? 3 : 0

  if (total === 0) {
    return (
      <svg width="112" height="112" viewBox="0 0 112 112">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2A2A2A" strokeWidth={sw} />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="#555" fontSize="11">—</text>
      </svg>
    )
  }

  const segs = [
    { key: 'solar', value: solar, color: '#D4A017' },
    { key: 'ppf',   value: ppf,   color: '#3B82F6' },
    { key: 'ambos', value: ambos, color: '#A855F7' },
  ].filter(s => s.value > 0)

  let cumulative = 0
  const paths = segs.map(seg => {
    const pct = seg.value / total
    const dashLen = Math.max(0, pct * circ - gap)
    const dashOffset = circ - cumulative
    cumulative += pct * circ
    return { ...seg, dashLen, dashOffset }
  })

  return (
    <svg
      width="112"
      height="112"
      viewBox="0 0 112 112"
      style={{ transform: 'rotate(-90deg)' }}
    >
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1A1A1A" strokeWidth={sw} />
      {/* Segments */}
      {paths.map(p => (
        <circle
          key={p.key}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={p.color}
          strokeWidth={sw}
          strokeDasharray={`${p.dashLen} ${circ}`}
          strokeDashoffset={p.dashOffset}
          strokeLinecap="butt"
        />
      ))}
      {/* Center: rendered after counter-rotating */}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fill="#F0F0F0"
        fontSize="16"
        fontWeight="bold"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${cx}px ${cy}px` }}
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        fill="#666"
        fontSize="9"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${cx}px ${cy}px` }}
      >
        serviços
      </text>
    </svg>
  )
}

// ── Barra simples CSS ─────────────────────────────────────────────────────────

function BarraCSS({ valor, total, cor = '#CC0000', label, count }: {
  valor: number; total: number; cor?: string; label: string; count: number
}) {
  const pct = total > 0 ? (valor / total) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-sora">
        <span className="text-brand-muted capitalize">{label}</span>
        <span className="text-brand-text font-medium">{count}</span>
      </div>
      <div className="h-2 bg-[#111] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: cor }}
        />
      </div>
    </div>
  )
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

function ReportCard({ title, icon, children }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] border-l-[3px] border-l-[#CC0000] rounded-[8px] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-[#CC0000]">{icon}</span>
        <h2 className="font-rajdhani font-bold text-lg text-brand-text uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ── Stat simples ──────────────────────────────────────────────────────────────

function Stat({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-brand-muted font-sora uppercase tracking-wider">{label}</p>
      <p className="font-rajdhani font-bold text-2xl text-brand-text">{value}</p>
      {sub && <div className="text-xs font-sora">{sub}</div>}
    </div>
  )
}

// ── Comparativo ───────────────────────────────────────────────────────────────

function Comparativo({ atual, anterior }: { atual: number; anterior: number }) {
  if (anterior === 0 && atual === 0) return null
  if (anterior === 0) {
    return <span className="flex items-center gap-1 text-green-400"><TrendingUp size={12} /> Novo período</span>
  }
  const diff = ((atual - anterior) / anterior) * 100
  const positivo = diff >= 0
  return (
    <span className={`flex items-center gap-1 ${positivo ? 'text-green-400' : 'text-red-400'}`}>
      {positivo ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {positivo ? '+' : ''}{fmtPct(diff)} vs período anterior
    </span>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="border-t border-[#2A2A2A]" />
}

// ── Página principal ──────────────────────────────────────────────────────────

export function RelatoriosPage() {
  const hoje = new Date()
  const defaultFiltro: Filtro = {
    preset: 'mes_atual',
    dataInicio: toYMD(startOfMonth(hoje)),
    dataFim: toYMD(endOfMonth(hoje)),
  }

  const [filtro, setFiltro]       = useState<Filtro>(defaultFiltro)
  const [preset, setPreset]       = useState<PeriodoPreset>('mes_atual')
  const [customInicio, setCustomInicio] = useState(toYMD(startOfMonth(hoje)))
  const [customFim, setCustomFim]       = useState(toYMD(hoje))

  const [dados, setDados]         = useState<Dados | null>(null)
  const [loading, setLoading]     = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchDados = useCallback(async (f: Filtro) => {
    setLoading(true)

    const inicio = f.dataInicio
    const fim    = f.dataFim
    const ant    = computeAnterior(inicio, fim)

    const inicioISO  = inicio + 'T00:00:00'
    const fimISO     = fim    + 'T23:59:59'
    const antInicioISO = ant.inicio + 'T00:00:00'
    const antFimISO    = ant.fim    + 'T23:59:59'

    // Queries em paralelo: serviços + serviços anteriores + agendamentos + novos clientes
    const [
      { data: svcPeriodo },
      { data: svcAnterior },
      { data: agendamentos },
      { count: novosClientesCount },
    ] = await Promise.all([
      supabase
        .from('servicos')
        .select('id, tipo, valor_total, veiculo_id')
        .eq('status', 'concluido')
        .gte('data_conclusao', inicioISO)
        .lte('data_conclusao', fimISO),
      supabase
        .from('servicos')
        .select('valor_total')
        .eq('status', 'concluido')
        .gte('data_conclusao', antInicioISO)
        .lte('data_conclusao', antFimISO),
      supabase
        .from('agendamentos')
        .select('origem, status')
        .gte('created_at', inicioISO)
        .lte('created_at', fimISO),
      supabase
        .from('clientes')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', inicioISO)
        .lte('created_at', fimISO),
    ])

    const svcs = svcPeriodo ?? []
    const svcIds = svcs.map(s => s.id)

    // Itens + bobinas (só se há serviços)
    let itens:   Record<string, unknown>[] = []
    let bobinas: Record<string, unknown>[] = []

    if (svcIds.length > 0) {
      const { data: itensData } = await supabase
        .from('itens_servico')
        .select('servico_id, bobina_id, metros_gastos, marca_pelicula, serie_pelicula')
        .in('servico_id', svcIds)
      itens = (itensData ?? []) as Record<string, unknown>[]

      const bobinaIds = [...new Set(
        itens.filter(i => i.bobina_id).map(i => i.bobina_id as string)
      )]
      if (bobinaIds.length > 0) {
        const { data: bobinasData } = await supabase
          .from('estoque')
          .select('id, nome, marca, serie, custo_total, metros_totais')
          .in('id', bobinaIds)
        bobinas = (bobinasData ?? []) as Record<string, unknown>[]
      }
    }

    // Veículos → clientes (só se há serviços)
    let veiculos: Record<string, unknown>[] = []
    let clientes: Record<string, unknown>[] = []
    let svcsTodosClientes: Record<string, unknown>[] = []

    const veiculoIds = [...new Set(svcs.filter(s => s.veiculo_id).map(s => s.veiculo_id as string))]

    if (veiculoIds.length > 0) {
      const { data: veisData } = await supabase
        .from('veiculos')
        .select('id, cliente_id')
        .in('id', veiculoIds)
      veiculos = (veisData ?? []) as Record<string, unknown>[]

      const clienteIds = [...new Set(veiculos.filter(v => v.cliente_id).map(v => v.cliente_id as string))]
      if (clienteIds.length > 0) {
        // Clientes do período + todos os serviços (histórico) para calcular recorrentes
        const [{ data: clientesData }, { data: svcsTodos }] = await Promise.all([
          supabase.from('clientes').select('id, nome').in('id', clienteIds),
          supabase
            .from('servicos')
            .select('veiculo_id')
            .eq('status', 'concluido')
            .in('veiculo_id', veiculoIds),
        ])
        clientes = (clientesData ?? []) as Record<string, unknown>[]
        svcsTodosClientes = (svcsTodos ?? []) as Record<string, unknown>[]
      }
    }

    // ── Processar: Card 1 — Faturamento ─────────────────────────────────────

    const faturamentoTotal    = svcs.reduce((s, v) => s + ((v.valor_total as number) ?? 0), 0)
    const faturamentoAnterior = (svcAnterior ?? []).reduce((s, v) => s + ((v.valor_total as number) ?? 0), 0)
    const svcsComValor        = svcs.filter(s => s.valor_total != null)
    const mediaFaturamento    = svcsComValor.length > 0
      ? svcsComValor.reduce((s, v) => s + (v.valor_total as number), 0) / svcsComValor.length
      : 0

    // ── Processar: Card 2 — Serviços ────────────────────────────────────────

    const porTipo = { solar: 0, ppf: 0, ambos: 0 }
    svcs.forEach(s => {
      if (s.tipo === 'solar') porTipo.solar++
      else if (s.tipo === 'ppf') porTipo.ppf++
      else if (s.tipo === 'ambos') porTipo.ambos++
    })
    const ticketMedio = svcsComValor.length > 0
      ? svcsComValor.reduce((s, v) => s + (v.valor_total as number), 0) / svcsComValor.length
      : 0

    // ── Processar: Card 3 — Estoque ─────────────────────────────────────────

    const bobinaMap = new Map(bobinas.map(b => [b.id as string, b]))
    const consumoMap = new Map<string, ConsumoItem>()
    let totalMetros = 0
    let custoTotalMaterial = 0

    itens.forEach(item => {
      const metros = (item.metros_gastos as number) ?? 0
      totalMetros += metros
      const bobinaId = item.bobina_id as string | undefined
      if (bobinaId) {
        const b = bobinaMap.get(bobinaId)
        if (b) {
          const custoPorMetro = (b.metros_totais as number) > 0
            ? ((b.custo_total as number) ?? 0) / (b.metros_totais as number)
            : 0
          const custo = metros * custoPorMetro
          custoTotalMaterial += custo
          const prev = consumoMap.get(bobinaId)
          if (prev) {
            prev.metros += metros
            prev.custo  += custo
          } else {
            consumoMap.set(bobinaId, {
              bobinaNome: b.nome as string,
              marca: b.marca as string,
              serie: (b.serie as string) ?? '',
              metros,
              custo,
            })
          }
        }
      }
    })

    const consumoPorBobina = Array.from(consumoMap.values())
      .sort((a, b) => b.metros - a.metros)

    // Película mais usada (por metros)
    const pelMap = new Map<string, number>()
    itens.forEach(item => {
      const key = [item.marca_pelicula, item.serie_pelicula].filter(Boolean).join(' · ')
      if (key) pelMap.set(key, (pelMap.get(key) ?? 0) + ((item.metros_gastos as number) ?? 0))
    })
    let peliculaMaisUsada = '—'
    let pelMaxM = 0
    pelMap.forEach((m, k) => { if (m > pelMaxM) { pelMaxM = m; peliculaMaisUsada = k } })

    // ── Processar: Card 4 — Clientes ────────────────────────────────────────

    const veiculoToCliente = new Map(veiculos.map(v => [v.id as string, v.cliente_id as string]))
    const clienteNomeMap   = new Map(clientes.map(c => [c.id as string, c.nome as string]))

    const clienteStats = new Map<string, { valor: number; qtd: number }>()
    svcs.forEach(s => {
      const clienteId = veiculoToCliente.get(s.veiculo_id as string)
      if (clienteId) {
        const stat = clienteStats.get(clienteId) ?? { valor: 0, qtd: 0 }
        stat.valor += (s.valor_total as number) ?? 0
        stat.qtd++
        clienteStats.set(clienteId, stat)
      }
    })

    // Recorrentes: clientes do período que têm mais serviços históricos do que os do período
    const totalHistorico = new Map<string, number>()
    svcsTodosClientes.forEach(s => {
      const clienteId = veiculoToCliente.get(s.veiculo_id as string)
      if (clienteId) totalHistorico.set(clienteId, (totalHistorico.get(clienteId) ?? 0) + 1)
    })
    let recorrentes = 0
    clienteStats.forEach((stat, cid) => {
      if ((totalHistorico.get(cid) ?? 0) > stat.qtd) recorrentes++
    })

    const top5 = Array.from(clienteStats.entries())
      .map(([id, stat]) => ({ nome: clienteNomeMap.get(id) ?? '?', ...stat }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)

    // ── Processar: Card 5 — Agenda ───────────────────────────────────────────

    const ags             = agendamentos ?? []
    const totalAgs        = ags.length
    const taxaConversao   = totalAgs > 0 ? (svcs.length / totalAgs) * 100 : 0

    const origensCounts   = new Map<string, number>()
    ags.forEach(a => {
      const o = (a.origem as string) ?? 'outro'
      origensCounts.set(o, (origensCounts.get(o) ?? 0) + 1)
    })
    const origens = Array.from(origensCounts.entries())
      .map(([origem, count]) => ({ origem, count }))
      .sort((a, b) => b.count - a.count)

    setDados({
      faturamentoTotal, faturamentoAnterior, mediaFaturamento,
      totalServicos: svcs.length, porTipo, ticketMedio,
      consumoPorBobina, totalMetros, custoTotalMaterial, peliculaMaisUsada,
      novosClientes: novosClientesCount ?? 0, recorrentes, top5,
      totalAgendamentos: totalAgs, taxaConversao, origens,
    })

    setLoading(false)
  }, [])

  useEffect(() => {
    const { inicio, fim } = computePeriodo('mes_atual', customInicio, customFim)
    const f: Filtro = { preset: 'mes_atual', dataInicio: inicio, dataFim: fim }
    setFiltro(f)
    fetchDados(f)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Aplicar filtro ─────────────────────────────────────────────────────────

  function handleAplicar() {
    const { inicio, fim } = computePeriodo(preset, customInicio, customFim)
    const f: Filtro = { preset, dataInicio: inicio, dataFim: fim }
    setFiltro(f)
    fetchDados(f)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const origemCores: Record<string, string> = {
    portal: '#CC0000', whatsapp: '#25D366', telefone: '#D4A017', app: '#3B82F6',
  }

  const totalOrigens = dados?.origens.reduce((s, o) => s + o.count, 0) ?? 0

  const periodoLabel = (() => {
    if (!filtro.dataInicio) return ''
    const f = (s: string) => format(new Date(s + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })
    return `${f(filtro.dataInicio)} — ${f(filtro.dataFim)}`
  })()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        breadcrumbs={[{ label: 'Relatórios' }]}
      />

      {/* ── Filtros ── */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[8px] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-52">
            <Select
              label="Período"
              options={PERIODO_OPTIONS}
              value={preset}
              onChange={e => setPreset(e.target.value as PeriodoPreset)}
            />
          </div>

          {preset === 'personalizado' && (
            <>
              <div className="w-40">
                <Input
                  label="De"
                  type="date"
                  value={customInicio}
                  onChange={e => setCustomInicio(e.target.value)}
                />
              </div>
              <div className="w-40">
                <Input
                  label="Até"
                  type="date"
                  value={customFim}
                  onChange={e => setCustomFim(e.target.value)}
                />
              </div>
            </>
          )}

          <Button
            onClick={handleAplicar}
            loading={loading}
            className="bg-[#CC0000] hover:bg-[#E60000] text-white font-semibold"
          >
            {!loading && <Filter size={14} />}
            Aplicar
          </Button>

          {periodoLabel && (
            <span className="text-xs text-brand-muted font-sora ml-auto self-end pb-1">
              {periodoLabel}
            </span>
          )}
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-[#CC0000] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Cards ── */}
      {!loading && dados && (
        <div className="space-y-4">

          {/* ── Grid superior: Card 1 + Card 2 ── */}
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Card 1 — Faturamento */}
            <ReportCard title="Faturamento" icon={<DollarSign size={16} />}>
              <div className="grid grid-cols-2 gap-4">
                <Stat
                  label="Total faturado"
                  value={fmtCurrency(dados.faturamentoTotal)}
                  sub={<Comparativo atual={dados.faturamentoTotal} anterior={dados.faturamentoAnterior} />}
                />
                <Stat
                  label="Período anterior"
                  value={fmtCurrency(dados.faturamentoAnterior)}
                />
              </div>
              <Divider />
              <Stat
                label="Média por serviço"
                value={fmtCurrency(dados.mediaFaturamento)}
              />
            </ReportCard>

            {/* Card 2 — Serviços */}
            <ReportCard title="Serviços Concluídos" icon={<Award size={16} />}>
              <div className="flex items-center gap-6">
                {/* Donut */}
                <DonutChart
                  solar={dados.porTipo.solar}
                  ppf={dados.porTipo.ppf}
                  ambos={dados.porTipo.ambos}
                />

                {/* Legenda + ticket */}
                <div className="flex-1 space-y-3">
                  {dados.totalServicos === 0 ? (
                    <p className="text-sm text-brand-muted font-sora">Nenhum serviço concluído.</p>
                  ) : (
                    <div className="space-y-2">
                      {([
                        { tipo: 'solar', label: 'Solar',  cor: '#D4A017', val: dados.porTipo.solar },
                        { tipo: 'ppf',   label: 'PPF',    cor: '#3B82F6', val: dados.porTipo.ppf },
                        { tipo: 'ambos', label: 'Ambos',  cor: '#A855F7', val: dados.porTipo.ambos },
                      ] as const).map(({ label, cor, val }) => (
                        val > 0 && (
                          <div key={label} className="flex items-center gap-2 text-sm font-sora">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cor }} />
                            <span className="text-brand-muted w-14">{label}</span>
                            <span className="text-brand-text font-medium">{val}</span>
                            <span className="text-brand-muted/60 text-xs ml-auto">
                              {fmtPct((val / dados.totalServicos) * 100)}
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                  <Divider />
                  <Stat label="Ticket médio" value={fmtCurrency(dados.ticketMedio)} />
                </div>
              </div>
            </ReportCard>
          </div>

          {/* Card 3 — Estoque Consumido */}
          <ReportCard title="Estoque Consumido" icon={<Package size={16} />}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Total de metros" value={`${dados.totalMetros.toFixed(2)} m`} />
              <Stat label="Custo estimado" value={fmtCurrency(dados.custoTotalMaterial)} />
              <Stat label="Película mais usada" value={dados.peliculaMaisUsada} />
            </div>

            {dados.consumoPorBobina.length > 0 && (
              <>
                <Divider />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        {['Bobina', 'Marca / Série', 'Metros', 'Custo Est.'].map(h => (
                          <th key={h} className="text-left pb-2 text-xs font-semibold text-brand-muted font-sora uppercase tracking-wider pr-4">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dados.consumoPorBobina.map((b, i) => (
                        <tr key={i} className="border-t border-[#222]">
                          <td className="py-2 pr-4 text-brand-text font-sora font-medium">{b.bobinaNome}</td>
                          <td className="py-2 pr-4 text-brand-muted font-sora text-xs">
                            {b.marca}{b.serie ? ` · ${b.serie}` : ''}
                          </td>
                          <td className="py-2 pr-4 font-mono text-brand-text">{b.metros.toFixed(2)} m</td>
                          <td className="py-2 text-[#D4A017] font-rajdhani font-bold">{fmtCurrency(b.custo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </ReportCard>

          {/* ── Grid inferior: Card 4 + Card 5 ── */}
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Card 4 — Clientes */}
            <ReportCard title="Clientes" icon={<Users size={16} />}>
              <div className="grid grid-cols-2 gap-4">
                <Stat
                  label="Novos clientes"
                  value={String(dados.novosClientes)}
                />
                <Stat
                  label="Recorrentes"
                  value={String(dados.recorrentes)}
                  sub={<span className="text-brand-muted">voltaram no período</span>}
                />
              </div>

              {dados.top5.length > 0 && (
                <>
                  <Divider />
                  <p className="text-xs font-semibold text-brand-muted font-sora uppercase tracking-wider">
                    Top 5 por valor
                  </p>
                  <div className="space-y-2">
                    {dados.top5.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm font-sora">
                        <span className="w-5 h-5 rounded-full bg-[#CC0000]/20 text-[#CC0000] flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-brand-text flex-1 truncate">{c.nome}</span>
                        <span className="text-brand-muted text-xs">{c.qtd} svc</span>
                        <span className="font-rajdhani font-bold text-[#D4A017] shrink-0">
                          {fmtCurrency(c.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </ReportCard>

            {/* Card 5 — Agenda */}
            <ReportCard title="Agendamentos" icon={<Calendar size={16} />}>
              <div className="grid grid-cols-2 gap-4">
                <Stat label="Recebidos" value={String(dados.totalAgendamentos)} />
                <Stat
                  label="Taxa de conversão"
                  value={fmtPct(dados.taxaConversao)}
                  sub={
                    <span className="text-brand-muted">
                      {dados.totalServicos} de {dados.totalAgendamentos} agendamentos
                    </span>
                  }
                />
              </div>

              {dados.origens.length > 0 && (
                <>
                  <Divider />
                  <p className="text-xs font-semibold text-brand-muted font-sora uppercase tracking-wider">
                    Origem dos agendamentos
                  </p>
                  <div className="space-y-3">
                    {dados.origens.map(o => (
                      <BarraCSS
                        key={o.origem}
                        label={ORIGEM_LABEL[o.origem] ?? o.origem}
                        valor={o.count}
                        total={totalOrigens}
                        count={o.count}
                        cor={origemCores[o.origem] ?? '#888'}
                      />
                    ))}
                  </div>
                </>
              )}

              {dados.origens.length === 0 && (
                <p className="text-sm text-brand-muted font-sora">
                  Nenhum agendamento neste período.
                </p>
              )}
            </ReportCard>
          </div>

        </div>
      )}

      {/* Empty state */}
      {!loading && !dados && (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-brand-muted">
          <BarChart2 size={32} className="opacity-30" />
          <p className="font-sora text-sm">Aplique um filtro para carregar os dados.</p>
        </div>
      )}
    </div>
  )
}
