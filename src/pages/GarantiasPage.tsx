import { useEffect, useState } from 'react'
import { format, parseISO, differenceInDays, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  MessageCircle,
  Search,
  Shield,
  XCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface GarantiaItem {
  id: string
  tipo: string
  data_conclusao: string | null
  garantia_validade: string
  valor_total: number | null
  veiculo: {
    marca: string
    modelo: string
    placa: string | null
    cliente: {
      id: string
      nome: string
      whatsapp: string
    } | null
  } | null
  peliculas: string
}

type Filtro = 'todas' | 'vencendo' | 'vencidas'

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  solar: 'Insulfilm Solar',
  ppf: 'PPF',
  ambos: 'Solar + PPF',
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR }) }
  catch { return '—' }
}

function diasRestantes(iso: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const val = parseISO(iso)
  val.setHours(0, 0, 0, 0)
  return differenceInDays(val, hoje)
}

function waLink(
  whatsapp: string,
  nome: string,
  marcaModelo: string,
  dias: number,
  dataFmt: string,
): string {
  const msg =
    `Olá ${nome}! 👋 A garantia da película aplicada no seu ${marcaModelo} vence em ${dias} dias (${dataFmt}). ` +
    `Caso queira fazer uma revisão ou renovação, estamos à disposição! 🚗`
  return `https://wa.me/55${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
}

// ── Página ────────────────────────────────────────────────────────────────────

export function GarantiasPage() {
  const [items, setItems] = useState<GarantiaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)

    const { data: svcs } = await supabase
      .from('servicos')
      .select(`
        id, tipo, data_conclusao, garantia_validade, valor_total,
        veiculo:veiculos(
          marca, modelo, placa,
          cliente:clientes(id, nome, whatsapp)
        )
      `)
      .eq('status', 'concluido')
      .not('garantia_validade', 'is', null)
      .order('garantia_validade', { ascending: true })

    if (!svcs) { setLoading(false); return }

    const ids = svcs.map(s => s.id)
    const { data: itens } = ids.length > 0
      ? await supabase
          .from('itens_servico')
          .select('servico_id, marca_pelicula, serie_pelicula, peca')
          .in('servico_id', ids)
      : { data: [] }

    const enriched: GarantiaItem[] = svcs.map(s => {
      const sItens = (itens ?? []).filter(i => i.servico_id === s.id)
      const peliculas = sItens
        .map(i => [i.marca_pelicula, i.serie_pelicula].filter(Boolean).join(' ') || i.peca)
        .filter(Boolean)
        .join(' · ')
      return { ...s, peliculas } as unknown as GarantiaItem
    })

    setItems(enriched)
    setLoading(false)
  }

  // ── Filtros ─────────────────────────────────────────────────────────────────

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const limite30 = addDays(hoje, 30)

  function isVencida(iso: string): boolean {
    const v = parseISO(iso); v.setHours(0, 0, 0, 0); return v < hoje
  }
  function isVencendo(iso: string): boolean {
    const v = parseISO(iso); v.setHours(0, 0, 0, 0)
    return v >= hoje && v <= limite30
  }

  const counts: Record<Filtro, number> = {
    todas: items.length,
    vencendo: items.filter(i => isVencendo(i.garantia_validade)).length,
    vencidas: items.filter(i => isVencida(i.garantia_validade)).length,
  }

  const filtered = items.filter(item => {
    if (filtro === 'vencendo' && !isVencendo(item.garantia_validade)) return false
    if (filtro === 'vencidas' && !isVencida(item.garantia_validade)) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const nome = item.veiculo?.cliente?.nome?.toLowerCase() ?? ''
      const vei = `${item.veiculo?.marca ?? ''} ${item.veiculo?.modelo ?? ''}`.toLowerCase()
      if (!nome.includes(q) && !vei.includes(q)) return false
    }
    return true
  })

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: 'todas',    label: 'Todas' },
    { key: 'vencendo', label: 'Vencendo em 30 dias' },
    { key: 'vencidas', label: 'Vencidas' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Garantias"
        breadcrumbs={[{ label: 'Garantias' }]}
      />

      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-center gap-3">
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sora font-medium transition-all',
              filtro === f.key
                ? 'bg-[#CC0000] text-white'
                : 'bg-[#1A1A1A] border border-[#2A2A2A] text-brand-muted hover:text-brand-text hover:border-[#CC0000]/40',
            ].join(' ')}
          >
            {f.label}
            <span className={[
              'text-xs px-1.5 py-0.5 rounded-full font-medium',
              filtro === f.key ? 'bg-white/20 text-white' : 'bg-[#2A2A2A] text-brand-muted',
            ].join(' ')}>
              {counts[f.key]}
            </span>
          </button>
        ))}

        {/* Busca */}
        <div className="relative ml-auto">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar cliente ou veículo…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm font-sora text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-[#CC0000]/50 w-64"
          />
        </div>
      </div>

      {/* ── Lista ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-[#CC0000] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-brand-muted">
            <Shield size={36} strokeWidth={1.2} className="opacity-30" />
            <p className="text-sm font-sora">Nenhuma garantia encontrada</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const dias = diasRestantes(item.garantia_validade)
            const vencida = dias < 0
            const vencendo = !vencida && dias <= 30

            const accentColor = vencida
              ? 'border-l-[#CC0000]'
              : vencendo
              ? 'border-l-[#D4A017]'
              : 'border-l-[#22c55e]'

            const marcaModelo = item.veiculo
              ? `${item.veiculo.marca} ${item.veiculo.modelo}`
              : ''

            return (
              <div
                key={item.id}
                className={`bg-[#1A1A1A] border border-[#2A2A2A] border-l-[3px] ${accentColor} rounded-[8px] p-4`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                  {/* Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-rajdhani font-bold text-base text-brand-text">
                        {item.veiculo?.cliente?.nome ?? '—'}
                      </span>
                      <span className="text-brand-muted text-xs">·</span>
                      <span className="text-sm text-brand-muted font-sora flex items-center gap-1">
                        <Car size={12} className="text-[#888]" />
                        {marcaModelo || '—'}
                        {item.veiculo?.placa && ` — ${item.veiculo.placa}`}
                      </span>
                    </div>

                    {item.peliculas && (
                      <p className="text-xs text-brand-muted font-sora">{item.peliculas}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs font-sora text-brand-muted">
                      <span>
                        Tipo:{' '}
                        <span className="text-brand-text">
                          {TIPO_LABEL[item.tipo] ?? item.tipo}
                        </span>
                      </span>
                      {item.data_conclusao && (
                        <span>
                          Aplicação:{' '}
                          <span className="text-brand-text">
                            {fmtDate(item.data_conclusao)}
                          </span>
                        </span>
                      )}
                      <span>
                        Vencimento:{' '}
                        <span className="text-brand-text">
                          {fmtDate(item.garantia_validade)}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Badge + Contatar */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {vencida ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 font-sora">
                        <XCircle size={11} />
                        Vencida há {Math.abs(dias)} dia{Math.abs(dias) !== 1 ? 's' : ''}
                      </span>
                    ) : vencendo ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-sora">
                        <AlertTriangle size={11} />
                        Vence em {dias} dia{dias !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 font-sora">
                        <CheckCircle2 size={11} />
                        Ativa · {dias} dias
                      </span>
                    )}

                    {item.veiculo?.cliente?.whatsapp && (
                      <a
                        href={waLink(
                          item.veiculo.cliente.whatsapp,
                          item.veiculo.cliente.nome,
                          marcaModelo,
                          dias,
                          fmtDate(item.garantia_validade),
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
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
