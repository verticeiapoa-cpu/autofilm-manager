import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowLeft,
  Search,
  User,
  UserPlus,
  Car,
  Wrench,
  Calendar,
  Clock,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageCircle,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { PageHeader } from '../components/ui/PageHeader'
import { VeiculoFields } from '../components/ui/VeiculoFields'
import type { ServicoInteresse } from '../types'

// ─── tipos locais ─────────────────────────────────────────────────────────────

interface ClienteResult {
  id: string
  nome: string
  whatsapp: string
}

// ─── constantes ──────────────────────────────────────────────────────────────

const tipoServicoOptions = [
  { value: 'solar', label: 'Insulfilm Solar' },
  { value: 'ppf', label: 'PPF — Paint Protection Film' },
  { value: 'ambos', label: 'Insulfilm + PPF' },
  { value: 'consulta', label: 'Consulta / Orçamento' },
]

const tipoLabel: Record<string, string> = {
  solar: 'Insulfilm Solar',
  ppf: 'PPF',
  ambos: 'Insulfilm + PPF',
  consulta: 'Consulta',
}

// ─── componente principal ─────────────────────────────────────────────────────

export function NovoAgendamentoPage() {
  const navigate = useNavigate()

  // ── busca de cliente ────────────────────────────────────────────────────────
  const [busca, setBusca] = useState('')
  const [sugestoes, setSugestoes] = useState<ClienteResult[]>([])
  const [buscando, setBuscando] = useState(false)
  const [showSugestoes, setShowSugestoes] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteResult | null>(null)
  const [modoNovo, setModoNovo] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoWhatsapp, setNovoWhatsapp] = useState('')

  // ── veículo ─────────────────────────────────────────────────────────────────
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [ano, setAno] = useState('')
  const [placa, setPlaca] = useState('')

  // ── serviço ─────────────────────────────────────────────────────────────────
  const [tipoServico, setTipoServico] = useState<ServicoInteresse>('solar')
  const [dataAg, setDataAg] = useState('')
  const [horaAg, setHoraAg] = useState('')
  const [observacoes, setObservacoes] = useState('')

  // ── ui ──────────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [modalSucesso, setModalSucesso] = useState(false)
  const [mensagemWpp, setMensagemWpp] = useState('')
  const [wppNumber, setWppNumber] = useState('')
  const [copiado, setCopiado] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // fechar dropdown ao clicar fora
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSugestoes(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const buscarClientes = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 2) {
      setSugestoes([])
      setShowSugestoes(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data } = await supabase
          .from('clientes')
          .select('id, nome, whatsapp')
          .or(`nome.ilike.%${q}%,whatsapp.ilike.%${q}%`)
          .limit(8)
        setSugestoes((data ?? []) as ClienteResult[])
        setShowSugestoes(true)
      } finally {
        setBuscando(false)
      }
    }, 300)
  }, [])

  function handleBuscaChange(value: string) {
    setBusca(value)
    setClienteSelecionado(null)
    setModoNovo(false)
    buscarClientes(value)
  }

  function selecionarCliente(c: ClienteResult) {
    setClienteSelecionado(c)
    setBusca(c.nome)
    setModoNovo(false)
    setShowSugestoes(false)
    setErrors(prev => ({ ...prev, cliente: '' }))
  }

  function iniciarNovoCliente() {
    setModoNovo(true)
    setClienteSelecionado(null)
    setShowSugestoes(false)
    if (busca && !busca.match(/^\d/)) setNovoNome(busca)
  }

  function limparCliente() {
    setClienteSelecionado(null)
    setModoNovo(false)
    setBusca('')
    setSugestoes([])
    setNovoNome('')
    setNovoWhatsapp('')
  }

  // ── validação ───────────────────────────────────────────────────────────────

  function validate() {
    const errs: Record<string, string> = {}

    if (!clienteSelecionado && !modoNovo) {
      errs.cliente = 'Selecione ou cadastre um cliente'
    }
    if (modoNovo) {
      if (!novoNome.trim()) errs.novoNome = 'Nome obrigatório'
      if (!novoWhatsapp.trim()) errs.novoWhatsapp = 'WhatsApp obrigatório'
    }
    if (!modelo.trim()) errs.modelo = 'Informe o modelo do veículo'
    if (!dataAg) errs.data = 'Selecione a data'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── salvar ──────────────────────────────────────────────────────────────────

  async function handleSalvar() {
    if (!validate()) return
    setSaving(true)

    try {
      let clienteId: string | undefined
      let nomeCliente: string
      let whatsappCliente: string

      // 1. resolver cliente
      if (clienteSelecionado) {
        clienteId = clienteSelecionado.id
        nomeCliente = clienteSelecionado.nome
        whatsappCliente = clienteSelecionado.whatsapp
      } else {
        const { data: cData, error: cErr } = await supabase
          .from('clientes')
          .insert({ nome: novoNome.trim(), whatsapp: novoWhatsapp.trim(), origem: 'app' })
          .select('id')
          .single()
        if (cErr) throw cErr
        clienteId = cData.id
        nomeCliente = novoNome.trim()
        whatsappCliente = novoWhatsapp.trim()
      }

      // 2. inserir veículo
      let veiculoId: string | undefined
      const modeloVeiculo = [marca.trim(), modelo.trim()].filter(Boolean).join(' ')

      const { data: vData, error: vErr } = await supabase
        .from('veiculos')
        .insert({
          cliente_id: clienteId,
          marca: marca.trim() || 'N/I',
          modelo: modelo.trim(),
          ano: ano ? parseInt(ano) : null,
          placa: placa.trim() || null,
        })
        .select('id')
        .single()
      if (vErr) throw vErr
      veiculoId = vData.id

      // 3. inserir agendamento
      const { error: agErr } = await supabase.from('agendamentos').insert({
        cliente_id: clienteId,
        veiculo_id: veiculoId,
        nome_cliente: nomeCliente,
        whatsapp_cliente: whatsappCliente,
        modelo_veiculo: modeloVeiculo || null,
        servico_interesse: tipoServico,
        data_solicitada: dataAg,
        hora_preferencial: horaAg || null,
        status: 'confirmado',
        origem: 'app',
        observacoes: observacoes.trim() || null,
      })
      if (agErr) throw agErr

      // 4. montar mensagem WhatsApp
      const dataFormatada = dataAg
        ? format(parseISO(dataAg), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
        : 'data a confirmar'
      const horaFormatada = horaAg ? horaAg.slice(0, 5) : 'horário a confirmar'
      const tipoFormatado = tipoLabel[tipoServico] ?? tipoServico

      setMensagemWpp(
        `Olá ${nomeCliente}! ✅ Seu agendamento na AutoFilm está confirmado para ${dataFormatada} às ${horaFormatada}. Serviço: ${tipoFormatado}. Qualquer dúvida, pode chamar aqui. Até lá! 🚗`,
      )
      setWppNumber(whatsappCliente.replace(/\D/g, ''))
      setModalSucesso(true)
    } catch (e) {
      console.error(e)
      setErrors({ geral: 'Erro ao salvar o agendamento. Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  async function copiarMensagem() {
    await navigator.clipboard.writeText(mensagemWpp)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  function abrirWhatsApp() {
    window.open(`https://wa.me/55${wppNumber}?text=${encodeURIComponent(mensagemWpp)}`, '_blank')
  }

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <PageHeader
        title="Novo Agendamento"
        breadcrumbs={[
          { label: 'Agendamentos', href: '/agendamentos' },
          { label: 'Novo' },
        ]}
        action={
          <Link to="/agendamentos">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={14} />
              Voltar
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-5">

        {/* ── Seção 1: Cliente ─────────────────────────────────────────── */}
        <Card accent>
          <div className="flex items-center gap-2 mb-4">
            <User size={15} className="text-[#888]" />
            <h2 className="font-heading font-bold text-lg text-brand-text tracking-wide">
              Cliente
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            {/* campo de busca */}
            <div ref={dropdownRef} className="relative">
              <Input
                label="Buscar cliente"
                placeholder="Nome ou WhatsApp..."
                value={busca}
                onChange={e => handleBuscaChange(e.target.value)}
                onFocus={() => sugestoes.length > 0 && !clienteSelecionado && setShowSugestoes(true)}
                icon={
                  buscando ? (
                    <div className="w-3.5 h-3.5 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search size={14} />
                  )
                }
                error={errors.cliente}
                disabled={!!clienteSelecionado || modoNovo}
              />

              {/* chip cliente selecionado */}
              {clienteSelecionado && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-brand-gold/10 border border-brand-gold/30 rounded-lg">
                  <CheckCircle2 size={14} className="text-brand-gold shrink-0" />
                  <span className="text-sm text-brand-gold font-sora font-medium flex-1 truncate">
                    {clienteSelecionado.nome} — {clienteSelecionado.whatsapp}
                  </span>
                  <button
                    onClick={limparCliente}
                    className="text-brand-gold/50 hover:text-brand-gold transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* dropdown de sugestões */}
              {showSugestoes && !clienteSelecionado && (
                <div className="absolute z-20 top-full mt-1 w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-2xl overflow-hidden">
                  {sugestoes.length > 0 ? (
                    <>
                      {sugestoes.map(c => (
                        <button
                          key={c.id}
                          onMouseDown={() => selecionarCliente(c)}
                          className="w-full text-left px-4 py-2.5 hover:bg-[#2A2A2A] transition-colors flex flex-col gap-0.5"
                        >
                          <span className="text-sm text-brand-text font-sora font-medium">
                            {c.nome}
                          </span>
                          <span className="text-xs text-[#888] font-sora">{c.whatsapp}</span>
                        </button>
                      ))}
                      <button
                        onMouseDown={iniciarNovoCliente}
                        className="w-full text-left px-4 py-2.5 border-t border-[#2A2A2A] hover:bg-[#2A2A2A] transition-colors flex items-center gap-2 text-brand-gold"
                      >
                        <UserPlus size={13} />
                        <span className="text-xs font-sora font-medium">
                          Cadastrar novo cliente
                        </span>
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col">
                      <div className="px-4 py-3 text-sm text-[#666] font-sora">
                        Nenhum cliente encontrado
                      </div>
                      <button
                        onMouseDown={iniciarNovoCliente}
                        className="w-full text-left px-4 py-2.5 border-t border-[#2A2A2A] hover:bg-[#2A2A2A] transition-colors flex items-center gap-2 text-brand-gold"
                      >
                        <UserPlus size={13} />
                        <span className="text-xs font-sora font-medium">
                          Cadastrar novo cliente
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* cadastro rápido */}
            {modoNovo && (
              <div className="flex flex-col gap-3 p-4 bg-[#0D0D0D] border border-brand-gold/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus size={13} className="text-brand-gold" />
                    <span className="text-xs text-brand-gold font-sora font-medium uppercase tracking-wider">
                      Novo cliente
                    </span>
                  </div>
                  <button
                    onClick={limparCliente}
                    className="text-[#555] hover:text-[#888] transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Nome *"
                    placeholder="Nome completo"
                    value={novoNome}
                    onChange={e => setNovoNome(e.target.value)}
                    error={errors.novoNome}
                  />
                  <Input
                    label="WhatsApp *"
                    placeholder="(51) 99999-9999"
                    value={novoWhatsapp}
                    onChange={e => setNovoWhatsapp(e.target.value)}
                    error={errors.novoWhatsapp}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ── Seção 2: Veículo ─────────────────────────────────────────── */}
        <Card accent>
          <div className="flex items-center gap-2 mb-4">
            <Car size={15} className="text-[#888]" />
            <h2 className="font-heading font-bold text-lg text-brand-text tracking-wide">
              Veículo
            </h2>
          </div>
          <VeiculoFields
            marca={marca}
            modelo={modelo}
            ano={ano}
            placa={placa}
            onMarca={setMarca}
            onModelo={setModelo}
            onAno={setAno}
            onPlaca={setPlaca}
            errorModelo={errors.modelo}
          />
        </Card>

        {/* ── Seção 3: Serviço & Horário ───────────────────────────────── */}
        <Card accent>
          <div className="flex items-center gap-2 mb-4">
            <Wrench size={15} className="text-[#888]" />
            <h2 className="font-heading font-bold text-lg text-brand-text tracking-wide">
              Serviço & Horário
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Select
                label="Tipo de serviço"
                options={tipoServicoOptions}
                value={tipoServico}
                onChange={e => setTipoServico(e.target.value as ServicoInteresse)}
              />
            </div>
            <Input
              label="Data *"
              type="date"
              value={dataAg}
              onChange={e => setDataAg(e.target.value)}
              error={errors.data}
              icon={<Calendar size={14} />}
            />
            <Input
              label="Hora preferencial"
              type="time"
              value={horaAg}
              onChange={e => setHoraAg(e.target.value)}
              icon={<Clock size={14} />}
            />
            <div className="sm:col-span-2">
              <Input
                label="Observações"
                placeholder="Informações adicionais sobre o serviço..."
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* erro geral */}
        {errors.geral && (
          <p className="text-sm text-red-400 font-sora px-1">{errors.geral}</p>
        )}

        {/* ── Botões de ação ───────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <Link to="/agendamentos">
            <Button variant="ghost" size="md">
              Cancelar
            </Button>
          </Link>
          <Button variant="primary" size="md" loading={saving} onClick={handleSalvar}>
            <CheckCircle2 size={15} />
            Confirmar Agendamento
          </Button>
        </div>
      </div>

      {/* ── Modal de Sucesso ─────────────────────────────────────────────────── */}
      {modalSucesso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-6 flex flex-col gap-5">
              {/* header */}
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-green-400" />
                </div>
                <h2 className="font-heading font-bold text-xl text-brand-text tracking-wide">
                  Agendamento Confirmado!
                </h2>
                <p className="text-sm text-[#888] font-sora">
                  Envie a mensagem abaixo para o cliente via WhatsApp
                </p>
              </div>

              {/* mensagem */}
              <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
                <p className="text-sm text-brand-text font-sora leading-relaxed">
                  {mensagemWpp}
                </p>
              </div>

              {/* ações */}
              <div className="flex flex-col gap-2">
                <Button variant="primary" size="md" onClick={abrirWhatsApp} className="w-full">
                  <MessageCircle size={15} />
                  Abrir no WhatsApp
                  <ExternalLink size={12} className="ml-auto opacity-60" />
                </Button>
                <Button variant="secondary" size="md" onClick={copiarMensagem} className="w-full">
                  <Copy size={14} />
                  {copiado ? '✓ Copiado!' : 'Copiar mensagem'}
                </Button>
              </div>

              <button
                onClick={() => navigate('/agendamentos')}
                className="text-xs text-[#555] font-sora hover:text-[#888] transition-colors text-center pt-1"
              >
                Fechar e ir para Agendamentos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
