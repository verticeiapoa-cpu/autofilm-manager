import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Camera, CheckCircle, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import type {
  Servico,
  Veiculo,
  Cliente,
  EstadoBorrachas,
  EstadoVidros,
  MicroRiscos,
} from '../types'

interface VeiculoComCliente extends Veiculo {
  clientes: Cliente
}

interface ServicoComRelacoes extends Servico {
  veiculos: VeiculoComCliente
}

const PECAS: { label: string; key: string }[] = [
  { label: 'Para-brisa', key: 'parabrisa' },
  { label: 'Lateral Direita', key: 'lateral_dir' },
  { label: 'Lateral Esquerda', key: 'lateral_esq' },
  { label: 'Traseiro', key: 'traseiro' },
  { label: 'Teto', key: 'teto' },
  { label: 'Capô', key: 'capo' },
  { label: 'Triângulo Dir', key: 'triangulo_dir' },
  { label: 'Triângulo Esq', key: 'triangulo_esq' },
]

const TIPO_LABEL: Record<string, string> = {
  solar: 'Insulfilm',
  ppf: 'PPF',
  ambos: 'Solar + PPF',
}

const STATUS_LABEL: Record<string, string> = {
  agendado: 'Agendado',
  em_execucao: 'Em Execução',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T; activeClass: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${
            value === opt.value
              ? `${opt.activeClass} text-white border-transparent`
              : 'bg-transparent border-[#2A2A2A] text-[#888] hover:border-[#444]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function ChecklistPage() {
  const { servicoId } = useParams<{ servicoId: string }>()
  const navigate = useNavigate()

  const [servico, setServico] = useState<ServicoComRelacoes | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [kmEntrada, setKmEntrada] = useState('')
  const [nivelCombustivel, setNivelCombustivel] = useState(50)
  const [estadoBorrachas, setEstadoBorrachas] = useState<EstadoBorrachas>('bom')
  const [estadoVidros, setEstadoVidros] = useState<EstadoVidros>('bom')
  const [microRiscos, setMicroRiscos] = useState<MicroRiscos>('nenhum')
  const [observacoes, setObservacoes] = useState('')

  const [fotos, setFotos] = useState<Record<string, string | null>>(
    Object.fromEntries(PECAS.map((p) => [p.key, null]))
  )
  const [uploading, setUploading] = useState<Record<string, boolean>>(
    Object.fromEntries(PECAS.map((p) => [p.key, false]))
  )

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    if (!servicoId) return
    supabase
      .from('servicos')
      .select('*, veiculos(*, clientes(*))')
      .eq('id', servicoId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setServico(data as ServicoComRelacoes)
        setLoading(false)
      })
  }, [servicoId])

  async function handleUploadFoto(key: string, file: File) {
    setUploading((prev) => ({ ...prev, [key]: true }))
    const ext = file.name.split('.').pop()
    const path = `${servicoId}/${key}_${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('checklist-fotos')
      .upload(path, file, { upsert: true })
    if (!error) {
      const { data: urlData } = supabase.storage.from('checklist-fotos').getPublicUrl(path)
      setFotos((prev) => ({ ...prev, [key]: urlData.publicUrl }))
    }
    setUploading((prev) => ({ ...prev, [key]: false }))
  }

  async function handleFinalizar() {
    if (!servicoId) return
    setSaving(true)

    const fotosUrls = Object.values(fotos).filter((u): u is string => u !== null)

    const { error } = await supabase.from('checklists').insert({
      servico_id: servicoId,
      data_checkin: new Date().toISOString(),
      km_entrada: kmEntrada ? Number(kmEntrada) : null,
      nivel_combustivel: nivelCombustivel,
      estado_borrachas: estadoBorrachas,
      estado_vidros: estadoVidros,
      micro_riscos_pintura: microRiscos,
      observacoes_gerais: observacoes || null,
      fotos: fotosUrls,
    })

    if (!error) {
      await supabase.from('servicos').update({ status: 'em_execucao' }).eq('id', servicoId)
      navigate(`/servico/${servicoId}`)
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-[#888] text-sm">Carregando...</span>
      </div>
    )
  }

  if (!servico) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-red-400 text-sm">Serviço não encontrado.</span>
      </div>
    )
  }

  const { veiculos } = servico
  const cliente = veiculos?.clientes

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Checklist de Entrada"
        breadcrumbs={[
          { label: 'Agendamentos', href: '/agendamentos' },
          { label: 'Checklist' },
        ]}
      />

      {/* ETAPA 1 — Header read-only */}
      <Card accent>
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-[#888] text-xs font-semibold uppercase tracking-widest">
            <User size={12} />
            Cliente
          </div>
          <p className="font-heading font-bold text-xl text-[#F0F0F0]">{cliente?.nome ?? '—'}</p>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#2A2A2A]">
            <div>
              <span className="text-xs text-[#888] block mb-0.5">Veículo</span>
              <span className="text-sm text-[#F0F0F0] font-medium">
                {veiculos?.marca} {veiculos?.modelo}
                {veiculos?.ano ? ` (${veiculos.ano})` : ''}
              </span>
            </div>
            <div>
              <span className="text-xs text-[#888] block mb-0.5">Placa</span>
              <span className="text-sm text-[#F0F0F0] font-mono font-bold tracking-widest">
                {veiculos?.placa ?? '—'}
              </span>
            </div>
            <div>
              <span className="text-xs text-[#888] block mb-0.5">Serviço</span>
              <span className="text-sm text-[#F0F0F0] font-medium">
                {TIPO_LABEL[servico.tipo] ?? servico.tipo}
              </span>
            </div>
            <div>
              <span className="text-xs text-[#888] block mb-0.5">Status</span>
              <span className="text-sm text-[#F0F0F0] font-medium">
                {STATUS_LABEL[servico.status] ?? servico.status}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ETAPA 2 — Inspeção */}
      <Card>
        <h2 className="font-heading font-bold text-lg text-[#F0F0F0] mb-5 pl-3 border-l-[3px] border-l-[#CC0000]">
          Inspeção do Veículo
        </h2>

        <div className="space-y-5">
          <div>
            <label className="text-xs text-[#888] font-medium block mb-1.5">KM de Entrada</label>
            <input
              type="number"
              value={kmEntrada}
              onChange={(e) => setKmEntrada(e.target.value)}
              placeholder="Ex: 45000"
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-[#F0F0F0] placeholder-[#555] focus:outline-none focus:border-[#CC0000] transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-[#888] font-medium block mb-1.5">
              Nível de Combustível —{' '}
              <span className="text-[#F0F0F0] font-bold">{nivelCombustivel}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={nivelCombustivel}
              onChange={(e) => setNivelCombustivel(Number(e.target.value))}
              className="w-full accent-[#CC0000] cursor-pointer"
            />
            <div className="flex justify-between text-xs text-[#555] mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-[#888] font-medium block mb-2">Estado das Borrachas</label>
            <ToggleGroup<EstadoBorrachas>
              value={estadoBorrachas}
              onChange={setEstadoBorrachas}
              options={[
                { label: 'Bom', value: 'bom', activeClass: 'bg-green-600' },
                { label: 'Regular', value: 'regular', activeClass: 'bg-yellow-600' },
                { label: 'Ruim', value: 'ruim', activeClass: 'bg-red-600' },
              ]}
            />
          </div>

          <div>
            <label className="text-xs text-[#888] font-medium block mb-2">Estado dos Vidros</label>
            <ToggleGroup<EstadoVidros>
              value={estadoVidros}
              onChange={setEstadoVidros}
              options={[
                { label: 'Bom', value: 'bom', activeClass: 'bg-green-600' },
                { label: 'Trincado', value: 'trincado', activeClass: 'bg-yellow-600' },
                { label: 'Arranhado', value: 'arranhado', activeClass: 'bg-orange-600' },
              ]}
            />
          </div>

          <div>
            <label className="text-xs text-[#888] font-medium block mb-2">Micro-riscos na Pintura</label>
            <ToggleGroup<MicroRiscos>
              value={microRiscos}
              onChange={setMicroRiscos}
              options={[
                { label: 'Nenhum', value: 'nenhum', activeClass: 'bg-green-600' },
                { label: 'Leve', value: 'leve', activeClass: 'bg-yellow-500' },
                { label: 'Moderado', value: 'moderado', activeClass: 'bg-orange-600' },
                { label: 'Severo', value: 'severo', activeClass: 'bg-red-600' },
              ]}
            />
          </div>

          <div>
            <label className="text-xs text-[#888] font-medium block mb-1.5">Observações Gerais</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Condição geral do veículo, itens no interior, avarias pré-existentes..."
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-[#F0F0F0] placeholder-[#555] focus:outline-none focus:border-[#CC0000] transition-colors resize-none"
            />
          </div>
        </div>
      </Card>

      {/* ETAPA 3 — Fotos por Área */}
      <Card>
        <h2 className="font-heading font-bold text-lg text-[#F0F0F0] mb-5 pl-3 border-l-[3px] border-l-[#CC0000]">
          Fotos por Área
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {PECAS.map((peca) => {
            const url = fotos[peca.key]
            const isUploading = uploading[peca.key]
            return (
              <div key={peca.key}>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={(el) => {
                    fileInputRefs.current[peca.key] = el
                  }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleUploadFoto(peca.key, file)
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[peca.key]?.click()}
                  disabled={isUploading}
                  className="w-full border border-dashed border-[#2A2A2A] rounded-lg overflow-hidden hover:border-[#CC0000] transition-colors disabled:opacity-50"
                >
                  {url ? (
                    <div className="relative">
                      <img src={url} alt={peca.label} className="w-full h-28 object-cover" />
                      <div className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5">
                        <CheckCircle size={14} className="text-green-400" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1">
                        <p className="text-xs text-center text-white">{peca.label}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-28 flex flex-col items-center justify-center gap-1.5 text-[#555]">
                      {isUploading ? (
                        <span className="text-xs text-[#888]">Enviando...</span>
                      ) : (
                        <>
                          <Camera size={20} />
                          <span className="text-xs">{peca.label}</span>
                        </>
                      )}
                    </div>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ETAPA 4 — Finalizar */}
      <div className="pb-8">
        <Button
          variant="danger"
          size="lg"
          onClick={handleFinalizar}
          loading={saving}
          className="w-full"
        >
          <CheckCircle size={18} />
          Finalizar Checklist
        </Button>
      </div>
    </div>
  )
}
