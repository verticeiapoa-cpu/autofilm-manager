/**
 * VeiculoFields — campos de veículo com autocomplete de marca/modelo
 * Busca a tabela `modelos_veiculos` uma única vez (cache de módulo).
 * Pode ser usado em qualquer formulário passando as props de valor/handler.
 */
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Input } from './Input'

// ── Cache de módulo (fetch único por sessão) ──────────────────────────────────

interface ModeloEntry { marca: string; modelo: string }

let _cache: ModeloEntry[] | null = null
let _promise: Promise<ModeloEntry[]> | null = null

function loadModelos(): Promise<ModeloEntry[]> {
  if (_cache) return Promise.resolve(_cache)
  if (!_promise) {
    _promise = new Promise<ModeloEntry[]>(resolve => {
      supabase
        .from('modelos_veiculos')
        .select('marca, modelo')
        .order('marca', { ascending: true })
        .order('modelo', { ascending: true })
        .then(({ data }) => {
          _cache = (data ?? []) as ModeloEntry[]
          _promise = null
          resolve(_cache)
        })
    })
  }
  return _promise!
}

// ── Combobox interno ──────────────────────────────────────────────────────────

interface CBProps {
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  open: boolean
  onOpen: () => void
  onClose: () => void
  onPick: (v: string) => void
  error?: string
}

function CB({
  label, placeholder, value, onChange,
  suggestions, open, onOpen, onClose, onPick,
  error,
}: CBProps) {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [onClose])

  return (
    <div ref={wrapRef} className="relative flex flex-col gap-1.5 w-full">
      <label className="text-xs font-medium text-brand-muted font-sora uppercase tracking-wider">
        {label}
      </label>

      <div className="relative">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          onFocus={onOpen}
          className={[
            'w-full bg-[#111111] border rounded-lg text-sm text-brand-text font-sora',
            'placeholder:text-brand-muted/50 py-2.5',
            value ? 'pl-3 pr-8' : 'px-3',
            'focus:outline-none focus:ring-1 transition-all duration-150',
            error
              ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20'
              : 'border-[#2A2A2A] focus:border-brand-gold focus:ring-brand-gold/20',
          ].join(' ')}
        />
        {value && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); onChange(''); onClose() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-400 font-sora">{error}</p>}

      {/* Dropdown de sugestões */}
      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-30 top-full mt-1 w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-2xl overflow-y-auto max-h-52"
          onMouseDown={e => e.preventDefault()}
        >
          {suggestions.map(s => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={() => { onPick(s); onClose() }}
                className={[
                  'w-full text-left px-3 py-2.5 text-sm font-sora transition-colors border-b border-[#222] last:border-0',
                  s.toLowerCase() === value.toLowerCase()
                    ? 'bg-brand-gold/10 text-brand-gold'
                    : 'text-brand-text hover:bg-[#252525]',
                ].join(' ')}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Props públicas ─────────────────────────────────────────────────────────────

export interface VeiculoFieldsProps {
  marca: string
  modelo: string
  ano: string
  placa: string
  cor?: string
  showCor?: boolean
  onMarca: (v: string) => void
  onModelo: (v: string) => void
  onAno: (v: string) => void
  onPlaca: (v: string) => void
  onCor?: (v: string) => void
  errorModelo?: string
}

// ── Componente principal ───────────────────────────────────────────────────────

export function VeiculoFields({
  marca, modelo, ano, placa, cor = '',
  showCor = false,
  onMarca, onModelo, onAno, onPlaca, onCor,
  errorModelo,
}: VeiculoFieldsProps) {
  const [allModelos, setAllModelos] = useState<ModeloEntry[]>([])
  const [marcaDD, setMarcaDD]       = useState(false)
  const [modeloDD, setModeloDD]     = useState(false)

  useEffect(() => { loadModelos().then(setAllModelos) }, [])

  // ── Sugestões de marca ─────────────────────────────────────────────────────
  // Ativa só com 2+ caracteres digitados

  const uniqueMarcas = [...new Set(allModelos.map(m => m.marca))]

  const marcaSuggs = marca.trim().length >= 2
    ? uniqueMarcas.filter(m => m.toLowerCase().includes(marca.toLowerCase()))
    : []

  // ── Sugestões de modelo ────────────────────────────────────────────────────
  // Filtra pelos modelos da marca selecionada; aceita texto livre

  const modelosDaMarca = allModelos
    .filter(m => m.marca.toLowerCase() === marca.trim().toLowerCase())
    .map(m => m.modelo)

  const modeloSuggs = modelosDaMarca.length === 0
    ? []                                                          // Marca fora da lista → só texto livre
    : modelo.trim().length === 0
      ? modelosDaMarca                                            // Campo vazio → mostra todos
      : modelosDaMarca.filter(m =>                               // Filtra pelo que foi digitado
          m.toLowerCase().includes(modelo.toLowerCase())
        )

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleMarcaChange(v: string) {
    onMarca(v)
    // Limpa modelo se a nova marca é diferente da anterior (troca de fabricante)
    if (v.toLowerCase() !== marca.toLowerCase()) onModelo('')
    setMarcaDD(v.trim().length >= 2)
  }

  function handlePickMarca(v: string) {
    onMarca(v)
    onModelo('') // Limpa modelo ao escolher nova marca da lista
  }

  function handleModeloChange(v: string) {
    onModelo(v)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

      {/* Marca */}
      <CB
        label="Marca"
        placeholder="Ex: Toyota"
        value={marca}
        onChange={handleMarcaChange}
        suggestions={marcaSuggs}
        open={marcaDD && marcaSuggs.length > 0}
        onOpen={() => marca.trim().length >= 2 && setMarcaDD(true)}
        onClose={() => setMarcaDD(false)}
        onPick={handlePickMarca}
      />

      {/* Modelo */}
      <CB
        label="Modelo *"
        placeholder={modelosDaMarca.length > 0 ? 'Selecione ou digite...' : 'Ex: Corolla'}
        value={modelo}
        onChange={handleModeloChange}
        suggestions={modeloSuggs}
        open={modeloDD && modeloSuggs.length > 0}
        onOpen={() => setModeloDD(true)}
        onClose={() => setModeloDD(false)}
        onPick={onModelo}
        error={errorModelo}
      />

      {/* Ano */}
      <Input
        label="Ano"
        placeholder={String(new Date().getFullYear())}
        type="number"
        min={1950}
        max={new Date().getFullYear() + 1}
        value={ano}
        onChange={e => onAno(e.target.value)}
      />

      {/* Cor (opcional — ClienteDetailPage) */}
      {showCor && (
        <Input
          label="Cor"
          placeholder="Ex: Preto"
          value={cor}
          onChange={e => onCor?.(e.target.value)}
        />
      )}

      {/* Placa */}
      <div className={showCor ? 'sm:col-span-2' : ''}>
        <Input
          label="Placa"
          placeholder="ABC-1234"
          value={placa}
          onChange={e => onPlaca(e.target.value.toUpperCase())}
          maxLength={8}
        />
      </div>
    </div>
  )
}
