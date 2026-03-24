import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { Download, LayoutDashboard, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAppStore, selectConfiguracoes } from '../store'
import { Button } from '../components/ui/Button'
import type { Cliente, ItemServico, Servico, Veiculo } from '../types'

interface PageData {
  servico: Servico
  veiculo: Veiculo
  cliente: Cliente
  itens: ItemServico[]
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  try { return format(parseISO(iso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) }
  catch { return '—' }
}

function tipoLabel(tipo: string): string {
  return tipo === 'ppf' ? 'PPF' : 'Solar'
}

export function CertificadoPage() {
  const { servicoId } = useParams<{ servicoId: string }>()
  const navigate      = useNavigate()
  const certRef       = useRef<HTMLDivElement>(null)
  const configuracoes = useAppStore(selectConfiguracoes)

  const nomeEstetica = configuracoes?.nome_estetica ?? 'AutoFilm'
  const slogan       = configuracoes?.slogan        ?? 'Aplicação Profissional de Película'
  const endereco     = configuracoes?.endereco      ?? 'Barão do Amazonas, 1681 · Partenon · Porto Alegre'
  const logoUrl      = configuracoes?.logo_url

  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const fetchData = useCallback(async () => {
    if (!servicoId) return
    setLoading(true)

    const { data: servico } = await supabase
      .from('servicos')
      .select('*')
      .eq('id', servicoId)
      .single()

    if (!servico) { setLoading(false); return }

    const [{ data: veiculo }, { data: itens }] = await Promise.all([
      supabase.from('veiculos').select('*').eq('id', servico.veiculo_id).single(),
      supabase.from('itens_servico').select('*').eq('servico_id', servicoId).order('created_at', { ascending: true }),
    ])

    if (!veiculo) { setLoading(false); return }

    const { data: clienteData } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', veiculo.cliente_id)
      .single()

    if (!clienteData) { setLoading(false); return }

    setData({ servico, veiculo, cliente: clienteData, itens: itens ?? [] })
    setLoading(false)
  }, [servicoId])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDownloadPdf() {
    if (!certRef.current || !data) return
    setDownloadingPdf(true)
    try {
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        backgroundColor: '#0A0A0A',
        useCORS: true,
        logging: false,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = (canvas.height * pdfW) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH)
      const numCert = servicoId?.slice(0, 8).toUpperCase() ?? 'CERT'
      pdf.save(`certificado-${numCert}.pdf`)
    } finally {
      setDownloadingPdf(false)
    }
  }

  function handleWhatsApp() {
    if (!data) return
    const num = data.cliente.whatsapp.replace(/\D/g, '')
    const msg = encodeURIComponent(
      `Olá ${data.cliente.nome}! 🎉 Seu carro está pronto! Segue o certificado de garantia da película aplicada. Qualquer dúvida estou à disposição! 🚗✨`
    )
    window.open(`https://wa.me/55${num}?text=${msg}`, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-brand-muted font-sora text-sm">
        Certificado não encontrado.
      </div>
    )
  }

  const { servico, veiculo, cliente, itens } = data
  const numCert = servicoId?.slice(0, 8).toUpperCase() ?? '—'
  const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* ── Ações ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="border border-[#2A2A2A]"
        >
          <LayoutDashboard size={14} />
          Voltar ao Dashboard
        </Button>

        <div className="ml-auto flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleWhatsApp}
            className="border border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10"
          >
            <MessageCircle size={14} />
            Enviar WhatsApp
          </Button>

          <Button
            size="sm"
            loading={downloadingPdf}
            onClick={handleDownloadPdf}
            className="bg-[#D4A017] hover:bg-[#e6b020] text-[#0A0A0A] font-semibold"
          >
            {!downloadingPdf && <Download size={14} />}
            Baixar PDF
          </Button>
        </div>
      </div>

      {/* ── Certificado (capturado pelo html2canvas) ── */}
      <div
        id="certificado-content"
        ref={certRef}
        style={{ backgroundColor: '#0A0A0A', fontFamily: 'Inter, sans-serif' }}
        className="rounded-xl overflow-hidden"
      >
        {/* Borda dourada superior */}
        <div style={{ height: 6, background: 'linear-gradient(90deg, #D4A017, #f0c040, #D4A017)' }} />

        <div className="px-10 py-8 space-y-6" style={{ color: '#F0F0F0' }}>
          {/* ── Cabeçalho ── */}
          <div className="text-center space-y-1 pb-4" style={{ borderBottom: '1px solid #2A2A2A' }}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={nomeEstetica}
                style={{ height: 64, objectFit: 'contain', margin: '0 auto 8px' }}
                crossOrigin="anonymous"
              />
            ) : (
              <div
                className="text-5xl font-black tracking-widest"
                style={{ color: '#D4A017', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.2em' }}
              >
                AUTO<span style={{ color: '#CC0000' }}>FILM</span>
              </div>
            )}
            <p style={{ color: '#888', fontSize: 11, letterSpacing: '0.15em' }}>
              {nomeEstetica.toUpperCase()}
            </p>
            {endereco && (
              <p style={{ color: '#888', fontSize: 10 }}>{endereco}</p>
            )}

            <div className="pt-4 space-y-1">
              <h1
                className="text-2xl font-black tracking-widest"
                style={{ color: '#D4A017', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.3em' }}
              >
                CERTIFICADO DE GARANTIA
              </h1>
              <p style={{ color: '#aaa', fontSize: 12, letterSpacing: '0.1em' }}>
                {slogan}
              </p>
            </div>
          </div>

          {/* ── Dados cliente + veículo ── */}
          <div className="grid grid-cols-2 gap-6">
            {/* Cliente */}
            <div
              className="space-y-3 p-4 rounded-lg"
              style={{ background: '#111', border: '1px solid #222', borderLeft: '3px solid #D4A017' }}
            >
              <p
                className="text-xs font-bold tracking-widest"
                style={{ color: '#D4A017', fontFamily: 'Rajdhani, sans-serif' }}
              >
                DADOS DO CLIENTE
              </p>
              <div className="space-y-1.5 text-sm">
                <Row label="Nome" value={cliente.nome} />
                {cliente.cpf && <Row label="CPF" value={cliente.cpf} />}
                {cliente.whatsapp && <Row label="WhatsApp" value={cliente.whatsapp} />}
              </div>
            </div>

            {/* Veículo */}
            <div
              className="space-y-3 p-4 rounded-lg"
              style={{ background: '#111', border: '1px solid #222', borderLeft: '3px solid #CC0000' }}
            >
              <p
                className="text-xs font-bold tracking-widest"
                style={{ color: '#CC0000', fontFamily: 'Rajdhani, sans-serif' }}
              >
                DADOS DO VEÍCULO
              </p>
              <div className="space-y-1.5 text-sm">
                <Row label="Veículo" value={`${veiculo.marca} ${veiculo.modelo}`} />
                {veiculo.ano && <Row label="Ano" value={String(veiculo.ano)} />}
                {veiculo.cor && <Row label="Cor" value={veiculo.cor} />}
                {veiculo.placa && <Row label="Placa" value={veiculo.placa} />}
              </div>
            </div>
          </div>

          {/* ── Datas ── */}
          <div
            className="grid grid-cols-2 gap-4 p-4 rounded-lg"
            style={{ background: '#111', border: '1px solid #222' }}
          >
            <div className="text-center space-y-1">
              <p className="text-xs tracking-widest" style={{ color: '#888' }}>DATA DE APLICAÇÃO</p>
              <p className="font-semibold text-sm" style={{ color: '#F0F0F0' }}>
                {fmtDate(servico.data_conclusao)}
              </p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs tracking-widest" style={{ color: '#888' }}>GARANTIA VÁLIDA ATÉ</p>
              <p className="font-semibold text-sm" style={{ color: '#D4A017' }}>
                {fmtDate(servico.garantia_validade)}
              </p>
            </div>
          </div>

          {/* ── Tabela de peças ── */}
          {itens.length > 0 && (
            <div className="space-y-2">
              <p
                className="text-xs font-bold tracking-widest"
                style={{ color: '#D4A017', fontFamily: 'Rajdhani, sans-serif' }}
              >
                PELÍCULAS APLICADAS
              </p>
              <div style={{ border: '1px solid #222', borderRadius: 8, overflow: 'hidden' }}>
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#161616' }}>
                      {['Peça', 'Marca / Película', 'Série', 'Tipo'].map(h => (
                        <th
                          key={h}
                          className="text-left px-3 py-2 text-xs font-semibold tracking-widest"
                          style={{ color: '#888', borderBottom: '1px solid #222' }}
                        >
                          {h.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, i) => (
                      <tr
                        key={item.id}
                        style={{
                          background: i % 2 === 0 ? '#0D0D0D' : '#111',
                          borderBottom: i < itens.length - 1 ? '1px solid #1a1a1a' : undefined,
                        }}
                      >
                        <td className="px-3 py-2" style={{ color: '#F0F0F0' }}>{item.peca}</td>
                        <td className="px-3 py-2" style={{ color: '#ccc' }}>{item.marca_pelicula ?? '—'}</td>
                        <td className="px-3 py-2" style={{ color: '#ccc' }}>{item.serie_pelicula ?? '—'}</td>
                        <td className="px-3 py-2">
                          <span
                            className="text-xs px-2 py-0.5 rounded font-medium"
                            style={
                              item.tipo_aplicacao === 'ppf'
                                ? { background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }
                                : { background: 'rgba(234,179,8,0.15)', color: '#facc15' }
                            }
                          >
                            {tipoLabel(item.tipo_aplicacao)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Texto de garantia ── */}
          <div
            className="p-4 rounded-lg text-sm leading-relaxed"
            style={{ background: '#111', border: '1px solid #222', color: '#aaa' }}
          >
            <p>
              Esta garantia cobre defeitos de fabricação e problemas de aderência da película
              aplicada, desde que respeitadas as condições de uso. Não são cobertos danos causados
              por mau uso, objetos cortantes, produtos químicos abrasivos ou instalação posterior
              de acessórios sobre a película.
            </p>
          </div>

          {/* ── Rodapé ── */}
          <div
            className="flex items-center justify-between pt-4 text-xs"
            style={{ borderTop: '1px solid #2A2A2A', color: '#555' }}
          >
            <span>Nº {numCert}</span>
            <span>Emitido em {hoje}</span>
          </div>
        </div>

        {/* Borda dourada inferior */}
        <div style={{ height: 6, background: 'linear-gradient(90deg, #D4A017, #f0c040, #D4A017)' }} />
      </div>
    </div>
  )
}

// ── sub-componente linha de dado ─────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span style={{ color: '#666', fontSize: 11, minWidth: 56 }}>{label}:</span>
      <span style={{ color: '#F0F0F0' }}>{value}</span>
    </div>
  )
}
