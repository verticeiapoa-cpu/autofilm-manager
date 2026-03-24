import { useCallback, useEffect, useRef, useState } from 'react'
import { Building2, ImagePlus, MapPin, Phone, Save, Tag, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { PageHeader } from '../components/ui/PageHeader'
import type { Configuracoes } from '../types'

interface ConfigForm {
  nome_estetica: string
  whatsapp: string
  endereco: string
  cnpj: string
  logo_url: string
  slogan: string
}

const FORM_INITIAL: ConfigForm = {
  nome_estetica: '',
  whatsapp: '',
  endereco: '',
  cnpj: '',
  logo_url: '',
  slogan: '',
}

function fromRecord(c: Configuracoes): ConfigForm {
  return {
    nome_estetica: c.nome_estetica ?? '',
    whatsapp:      c.whatsapp      ?? '',
    endereco:      c.endereco      ?? '',
    cnpj:          c.cnpj          ?? '',
    logo_url:      c.logo_url      ?? '',
    slogan:        c.slogan        ?? '',
  }
}

export function ConfiguracoesPage() {
  const fetchConfiguracoes = useAppStore((s) => s.fetchConfiguracoes)

  const [recordId, setRecordId] = useState<string | null>(null)
  const [form, setForm]         = useState<ConfigForm>(FORM_INITIAL)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [uploading, setUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('configuracoes')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (data) {
      setRecordId(data.id)
      setForm(fromRecord(data as Configuracoes))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Field helper ───────────────────────────────────────────────────────────

  function setField<K extends keyof ConfigForm>(k: K, v: ConfigForm[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  // ── Upload de logo ─────────────────────────────────────────────────────────

  async function handleLogoUpload(file: File) {
    if (!file) return
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop() ?? 'png'
      const path = `logo/logo-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('configuracoes')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('configuracoes')
        .getPublicUrl(path)

      setField('logo_url', urlData.publicUrl)
    } finally {
      setUploading(false)
    }
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleLogoUpload(file)
    e.target.value = ''
  }

  // ── Salvar ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.nome_estetica.trim()) return
    setSaving(true)

    const payload = {
      nome_estetica: form.nome_estetica.trim(),
      whatsapp:      form.whatsapp.trim()  || null,
      endereco:      form.endereco.trim()  || null,
      cnpj:          form.cnpj.trim()      || null,
      logo_url:      form.logo_url.trim()  || null,
      slogan:        form.slogan.trim()    || null,
      updated_at:    new Date().toISOString(),
    }

    if (recordId) {
      await supabase.from('configuracoes').update(payload).eq('id', recordId)
    } else {
      const { data } = await supabase
        .from('configuracoes')
        .insert(payload)
        .select('id')
        .single()
      if (data) setRecordId(data.id)
    }

    // Atualiza o store global para Sidebar + Certificado reagirem imediatamente
    await fetchConfiguracoes()

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#CC0000] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Configurações"
        breadcrumbs={[{ label: 'Configurações' }]}
      />

      {/* ── Identidade da estética ── */}
      <section className="space-y-4">
        <SectionTitle icon={<Building2 size={15} />} label="Identidade da Estética" />

        <Card>
          <div className="space-y-4">
            <Input
              label="Nome da estética"
              placeholder="Ex: Alisson Películas e Envelopamentos"
              value={form.nome_estetica}
              onChange={e => setField('nome_estetica', e.target.value)}
              error={!form.nome_estetica.trim() && saving ? 'Informe o nome' : undefined}
            />
            <Input
              label="Slogan"
              placeholder="Ex: Proteção e estilo para o seu veículo"
              value={form.slogan}
              onChange={e => setField('slogan', e.target.value)}
            />
          </div>
        </Card>
      </section>

      {/* ── Contato ── */}
      <section className="space-y-4">
        <SectionTitle icon={<Phone size={15} />} label="Contato" />

        <Card>
          <div className="space-y-4">
            <Input
              label="WhatsApp do profissional"
              placeholder="(51) 99999-9999"
              value={form.whatsapp}
              onChange={e => setField('whatsapp', e.target.value)}
            />
            <Input
              label="Endereço completo"
              placeholder="Ex: Barão do Amazonas, 1681 · Partenon · Porto Alegre"
              value={form.endereco}
              onChange={e => setField('endereco', e.target.value)}
            />
          </div>
        </Card>
      </section>

      {/* ── Dados fiscais ── */}
      <section className="space-y-4">
        <SectionTitle icon={<Tag size={15} />} label="Dados Fiscais" />

        <Card>
          <Input
            label="CNPJ (opcional)"
            placeholder="00.000.000/0001-00"
            value={form.cnpj}
            onChange={e => setField('cnpj', e.target.value)}
          />
        </Card>
      </section>

      {/* ── Logo ── */}
      <section className="space-y-4">
        <SectionTitle icon={<ImagePlus size={15} />} label="Logo" />

        <Card>
          <div className="space-y-4">
            {/* Preview */}
            {form.logo_url && (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-[#2A2A2A] bg-[#111] flex items-center justify-center">
                <img
                  src={form.logo_url}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain p-2"
                />
                <button
                  onClick={() => setField('logo_url', '')}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-brand-muted hover:text-[#CC0000] transition-colors"
                  title="Remover logo"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFilePick}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                loading={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {!uploading && <ImagePlus size={14} />}
                {uploading ? 'Enviando...' : form.logo_url ? 'Trocar Logo' : 'Enviar Logo'}
              </Button>

              <span className="text-xs text-brand-muted font-sora">
                PNG ou JPG · recomendado 512×512 px
              </span>
            </div>

            {/* Ou URL manual */}
            <Input
              label="Ou cole a URL da logo"
              placeholder="https://..."
              value={form.logo_url}
              onChange={e => setField('logo_url', e.target.value)}
            />
          </div>
        </Card>
      </section>

      {/* ── Localização no certificado ── */}
      <section className="space-y-4">
        <SectionTitle icon={<MapPin size={15} />} label="Visualização nos documentos" />

        <div className="bg-[#111] border border-[#2A2A2A] rounded-xl p-5 space-y-2">
          <p className="text-xs text-brand-muted font-sora uppercase tracking-wider">Prévia do rodapé do certificado</p>
          <div className="flex items-center gap-3">
            {form.logo_url && (
              <img
                src={form.logo_url}
                alt="logo"
                className="w-10 h-10 object-contain rounded opacity-80"
              />
            )}
            <div>
              <p className="font-rajdhani font-bold text-brand-text text-base">
                {form.nome_estetica || 'Nome da estética'}
              </p>
              {form.slogan && (
                <p className="text-xs text-brand-muted font-sora italic">{form.slogan}</p>
              )}
              {form.endereco && (
                <p className="text-xs text-brand-muted font-sora">{form.endereco}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Salvar ── */}
      <div className="flex items-center gap-4 pb-8">
        <Button
          loading={saving}
          onClick={handleSave}
          className="bg-[#CC0000] hover:bg-[#E60000] text-white font-semibold"
        >
          {!saving && <Save size={15} />}
          Salvar Configurações
        </Button>

        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-400 font-sora">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            Salvo com sucesso!
          </span>
        )}
      </div>

      {/* ── SQL hint ── */}
      <div className="border border-[#2A2A2A] rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-brand-muted font-sora uppercase tracking-wider">
          SQL — rode no Supabase uma única vez
        </p>
        <pre className="text-[11px] text-[#666] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">{`CREATE TABLE IF NOT EXISTS configuracoes (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome_estetica TEXT NOT NULL DEFAULT 'AutoFilm',
  whatsapp      TEXT,
  endereco      TEXT,
  cnpj          TEXT,
  logo_url      TEXT,
  slogan        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Bucket de storage (execute no Supabase Storage)
-- Crie o bucket "configuracoes" com acesso público`}</pre>
      </div>
    </div>
  )
}

// ── Sub-componente título de seção ────────────────────────────────────────────

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#CC0000]">{icon}</span>
      <h2 className="font-rajdhani font-bold text-base text-brand-text uppercase tracking-wide">
        {label}
      </h2>
    </div>
  )
}
