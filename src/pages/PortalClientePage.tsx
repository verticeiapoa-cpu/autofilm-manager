import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Etapa1 {
  nome: string
  whatsapp: string
  email: string
}

interface Etapa2 {
  marca: string
  modelo: string
  ano: string
  placa: string
}

interface Etapa3 {
  servico_interesse: string
  data_solicitada: string
  hora_preferencial: string
  observacoes: string
}

type Errors = Partial<Record<string, string>>

// ── Constantes ────────────────────────────────────────────────────────────────

const HORARIOS = [
  '08:00', '09:00', '10:00', '11:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
]

const SERVICO_OPTIONS = [
  { value: 'solar', label: 'Insulfilm Solar' },
  { value: 'ppf', label: 'PPF (Paint Protection Film)' },
  { value: 'ambos', label: 'Solar + PPF' },
  { value: 'consulta', label: 'Apenas Orçamento' },
]

const E1_INITIAL: Etapa1 = { nome: '', whatsapp: '', email: '' }
const E2_INITIAL: Etapa2 = { marca: '', modelo: '', ano: '', placa: '' }
const E3_INITIAL: Etapa3 = { servico_interesse: 'solar', data_solicitada: '', hora_preferencial: '09:00', observacoes: '' }

// ── Máscara WhatsApp ──────────────────────────────────────────────────────────

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// ── Indicador de etapas ───────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  const labels = ['Seus Dados', 'Veículo', 'Serviço']
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {Array.from({ length: total }).map((_, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                  done
                    ? 'bg-[#22C55E] text-white'
                    : active
                    ? 'bg-[#CC0000] text-white'
                    : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#555]',
                ].join(' ')}
              >
                {done ? '✓' : i + 1}
              </div>
              <span
                className={[
                  'text-[10px] font-sora whitespace-nowrap',
                  active ? 'text-[#CC0000]' : done ? 'text-[#22C55E]' : 'text-[#444]',
                ].join(' ')}
              >
                {labels[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div
                className={[
                  'w-12 h-px mb-5 mx-1 transition-all duration-300',
                  done ? 'bg-[#22C55E]' : 'bg-[#2A2A2A]',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Componentes de campo ──────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[#888] uppercase tracking-wider font-sora">
        {label}
        {required && <span className="text-[#CC0000] ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-400 font-sora">{error}</p>}
    </div>
  )
}

const inputCls = [
  'w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg',
  'text-sm text-[#F0F0F0] font-sora placeholder:text-[#444]',
  'px-3 py-2.5',
  'focus:outline-none focus:ring-1 focus:border-[#CC0000] focus:ring-[#CC0000]/20',
  'transition-all duration-150',
].join(' ')

const inputErrCls = [
  'w-full bg-[#0D0D0D] border border-red-500/60 rounded-lg',
  'text-sm text-[#F0F0F0] font-sora placeholder:text-[#444]',
  'px-3 py-2.5',
  'focus:outline-none focus:ring-1 focus:border-red-500 focus:ring-red-500/20',
  'transition-all duration-150',
].join(' ')

function fieldCls(error?: string) { return error ? inputErrCls : inputCls }

// ── Página principal ──────────────────────────────────────────────────────────

export function PortalClientePage() {
  useParams<{ slug: string }>()

  const [step, setStep] = useState(0)
  const [e1, setE1] = useState<Etapa1>(E1_INITIAL)
  const [e2, setE2] = useState<Etapa2>(E2_INITIAL)
  const [e3, setE3] = useState<Etapa3>(E3_INITIAL)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Configurações da estética (página pública — busca direto)
  const [nomeEstetica, setNomeEstetica] = useState('Alisson Películas')
  const [enderecoEstetica, setEnderecoEstetica] = useState('Barão do Amazonas, 1681 · Porto Alegre')
  const [logoUrl, setLogoUrl] = useState<string | undefined>()

  useEffect(() => {
    supabase
      .from('configuracoes')
      .select('nome_estetica, endereco, logo_url')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        if (data.nome_estetica) setNomeEstetica(data.nome_estetica)
        if (data.endereco)      setEnderecoEstetica(data.endereco)
        if (data.logo_url)      setLogoUrl(data.logo_url)
      })
  }, [])

  // ── Validações ──────────────────────────────────────────────────────────────

  function validateStep(): boolean {
    const next: Errors = {}

    if (step === 0) {
      if (!e1.nome.trim()) next.nome = 'Informe seu nome'
      if (!e1.whatsapp.trim() || e1.whatsapp.replace(/\D/g, '').length < 10)
        next.whatsapp = 'WhatsApp inválido'
    }

    if (step === 1) {
      if (!e2.marca.trim()) next.marca = 'Informe a marca'
      if (!e2.modelo.trim()) next.modelo = 'Informe o modelo'
    }

    if (step === 2) {
      if (!e3.data_solicitada) next.data_solicitada = 'Escolha uma data'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  function next() {
    if (validateStep()) setStep(s => s + 1)
  }

  function back() {
    setErrors({})
    setStep(s => s - 1)
  }

  // ── Bloqueia domingos ───────────────────────────────────────────────────────

  function isDateValid(dateStr: string): boolean {
    if (!dateStr) return false
    const d = new Date(dateStr + 'T12:00:00')
    return d.getDay() !== 0
  }

  function handleDateChange(v: string) {
    if (v && !isDateValid(v)) {
      setErrors(prev => ({ ...prev, data_solicitada: 'Domingos não estão disponíveis' }))
    } else {
      setErrors(prev => ({ ...prev, data_solicitada: undefined }))
    }
    setE3(prev => ({ ...prev, data_solicitada: v }))
  }

  // ── Submissão ───────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!validateStep()) return
    setSubmitting(true)

    await supabase.from('agendamentos').insert({
      nome_cliente: e1.nome.trim(),
      whatsapp_cliente: e1.whatsapp.trim(),
      modelo_veiculo: `${e2.marca.trim()} ${e2.modelo.trim()}${e2.ano ? ' ' + e2.ano : ''}${e2.placa ? ' · ' + e2.placa.trim() : ''}`,
      servico_interesse: e3.servico_interesse,
      data_solicitada: e3.data_solicitada || null,
      hora_preferencial: e3.hora_preferencial || null,
      observacoes: e3.observacoes.trim() || null,
      status: 'pendente',
      origem: 'portal',
    })

    setSubmitting(false)
    setSuccess(true)
  }

  // ── Tela de sucesso ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center">
              <CheckCircle size={40} className="text-[#22C55E]" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="font-rajdhani font-black text-3xl text-[#F0F0F0] tracking-wide">
              Pedido Recebido!
            </h2>
            <p className="text-[#888] font-sora text-sm leading-relaxed">
              Em breve entraremos em contato pelo WhatsApp para confirmar seu agendamento.
            </p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] border-l-[3px] border-l-[#22C55E] rounded-lg p-4 text-left space-y-1 text-sm font-sora">
            <p className="text-[#888] text-xs uppercase tracking-wider mb-2">Resumo</p>
            <p className="text-[#F0F0F0]"><span className="text-[#666]">Nome:</span> {e1.nome}</p>
            <p className="text-[#F0F0F0]"><span className="text-[#666]">WhatsApp:</span> {e1.whatsapp}</p>
            <p className="text-[#F0F0F0]"><span className="text-[#666]">Veículo:</span> {e2.marca} {e2.modelo}{e2.ano ? ` ${e2.ano}` : ''}</p>
            {e3.data_solicitada && (
              <p className="text-[#F0F0F0]">
                <span className="text-[#666]">Data preferencial:</span> {new Date(e3.data_solicitada + 'T12:00:00').toLocaleDateString('pt-BR')} às {e3.hora_preferencial}
              </p>
            )}
          </div>
          <p className="text-[#444] text-xs font-sora">
            {nomeEstetica}{enderecoEstetica ? ` · ${enderecoEstetica}` : ''}
          </p>
        </div>
      </div>
    )
  }

  // ── Layout principal ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1A1A1A] px-4 py-4">
        <div className="max-w-lg mx-auto flex flex-col items-center gap-1">
          {logoUrl ? (
            <img src={logoUrl} alt={nomeEstetica} className="h-10 object-contain" />
          ) : (
            <span
              className="font-black tracking-[0.2em] text-2xl"
              style={{ fontFamily: 'Rajdhani, sans-serif' }}
            >
              <span style={{ color: '#D4A017' }}>AUTO</span>
              <span style={{ color: '#CC0000' }}>FILM</span>
            </span>
          )}
          <p className="text-[#888] text-xs font-sora">
            {nomeEstetica}
          </p>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <StepIndicator current={step} total={3} />

          <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-6 shadow-2xl space-y-5">
            {/* Título da etapa */}
            <div className="space-y-0.5 pb-2 border-b border-[#1E1E1E]">
              <h2
                className="font-black text-xl text-[#F0F0F0] tracking-wide"
                style={{ fontFamily: 'Rajdhani, sans-serif' }}
              >
                {step === 0 && 'Seus Dados'}
                {step === 1 && 'Seu Veículo'}
                {step === 2 && 'Serviço Desejado'}
              </h2>
              <p className="text-[#555] text-xs font-sora">
                {step === 0 && 'Para entrarmos em contato e confirmar seu agendamento.'}
                {step === 1 && 'Informe os dados do veículo que será atendido.'}
                {step === 2 && 'Escolha o serviço e a data de preferência.'}
              </p>
            </div>

            {/* ── Etapa 1 ── */}
            {step === 0 && (
              <div className="space-y-4">
                <Field label="Nome completo" required error={errors.nome}>
                  <input
                    className={fieldCls(errors.nome)}
                    placeholder="Seu nome completo"
                    value={e1.nome}
                    onChange={ev => setE1(p => ({ ...p, nome: ev.target.value }))}
                  />
                </Field>

                <Field label="WhatsApp" required error={errors.whatsapp}>
                  <input
                    className={fieldCls(errors.whatsapp)}
                    placeholder="(51) 99999-9999"
                    value={e1.whatsapp}
                    inputMode="numeric"
                    onChange={ev => setE1(p => ({ ...p, whatsapp: maskPhone(ev.target.value) }))}
                  />
                </Field>

                <Field label="E-mail" error={errors.email}>
                  <input
                    className={fieldCls()}
                    type="email"
                    placeholder="seu@email.com (opcional)"
                    value={e1.email}
                    onChange={ev => setE1(p => ({ ...p, email: ev.target.value }))}
                  />
                </Field>
              </div>
            )}

            {/* ── Etapa 2 ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Marca" required error={errors.marca}>
                    <input
                      className={fieldCls(errors.marca)}
                      placeholder="Ex: Toyota"
                      value={e2.marca}
                      onChange={ev => setE2(p => ({ ...p, marca: ev.target.value }))}
                    />
                  </Field>

                  <Field label="Modelo" required error={errors.modelo}>
                    <input
                      className={fieldCls(errors.modelo)}
                      placeholder="Ex: Corolla"
                      value={e2.modelo}
                      onChange={ev => setE2(p => ({ ...p, modelo: ev.target.value }))}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ano" error={errors.ano}>
                    <input
                      className={fieldCls()}
                      placeholder="2024"
                      inputMode="numeric"
                      maxLength={4}
                      value={e2.ano}
                      onChange={ev => setE2(p => ({ ...p, ano: ev.target.value.replace(/\D/g, '') }))}
                    />
                  </Field>

                  <Field label="Placa" error={errors.placa}>
                    <input
                      className={fieldCls()}
                      placeholder="ABC-1234"
                      value={e2.placa}
                      onChange={ev => setE2(p => ({ ...p, placa: ev.target.value.toUpperCase() }))}
                    />
                  </Field>
                </div>
              </div>
            )}

            {/* ── Etapa 3 ── */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Tipo de serviço */}
                <Field label="Serviço de interesse" required>
                  <div className="grid grid-cols-2 gap-2">
                    {SERVICO_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setE3(p => ({ ...p, servico_interesse: opt.value }))}
                        className={[
                          'px-3 py-2.5 rounded-lg border text-left text-xs font-sora transition-all duration-150',
                          e3.servico_interesse === opt.value
                            ? 'border-[#CC0000] bg-[#CC0000]/10 text-[#F0F0F0]'
                            : 'border-[#2A2A2A] bg-[#0D0D0D] text-[#666] hover:border-[#444] hover:text-[#888]',
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Data */}
                <Field label="Data preferencial" required error={errors.data_solicitada}>
                  <input
                    type="date"
                    className={fieldCls(errors.data_solicitada)}
                    min={new Date().toISOString().slice(0, 10)}
                    value={e3.data_solicitada}
                    onChange={ev => handleDateChange(ev.target.value)}
                  />
                  <p className="text-[10px] text-[#555] font-sora -mt-0.5">Domingos não disponíveis</p>
                </Field>

                {/* Horário */}
                <Field label="Horário de preferência">
                  <div className="relative">
                    <select
                      className={[inputCls, 'appearance-none pr-8 cursor-pointer'].join(' ')}
                      value={e3.hora_preferencial}
                      onChange={ev => setE3(p => ({ ...p, hora_preferencial: ev.target.value }))}
                    >
                      {HORARIOS.map(h => (
                        <option key={h} value={h} className="bg-[#1A1A1A]">{h}</option>
                      ))}
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none text-xs">▼</span>
                  </div>
                </Field>

                {/* Observações */}
                <Field label="Observações">
                  <textarea
                    rows={3}
                    className={[inputCls, 'resize-none'].join(' ')}
                    placeholder="Alguma informação adicional? (opcional)"
                    value={e3.observacoes}
                    onChange={ev => setE3(p => ({ ...p, observacoes: ev.target.value }))}
                  />
                </Field>
              </div>
            )}

            {/* Navegação */}
            <div className="flex items-center justify-between pt-2 border-t border-[#1E1E1E]">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={back}
                  className="flex items-center gap-1.5 text-sm text-[#666] hover:text-[#888] font-sora transition-colors"
                >
                  <ChevronLeft size={16} />
                  Voltar
                </button>
              ) : (
                <span />
              )}

              {step < 2 ? (
                <button
                  type="button"
                  onClick={next}
                  className="flex items-center gap-1.5 bg-[#CC0000] hover:bg-[#E60000] text-white text-sm font-semibold font-sora px-5 py-2.5 rounded-lg transition-colors"
                >
                  Próximo
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="flex items-center gap-2 bg-[#CC0000] hover:bg-[#E60000] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold font-sora px-5 py-2.5 rounded-lg transition-colors"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Confirmar Agendamento
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Rodapé */}
          <p className="text-center text-[#333] text-xs font-sora mt-6">
            {nomeEstetica}{enderecoEstetica ? ` · ${enderecoEstetica}` : ''}
          </p>
        </div>
      </main>
    </div>
  )
}
