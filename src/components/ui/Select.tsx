import { clsx } from 'clsx'
import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export function Select({ label, error, options, placeholder, className, id, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-medium text-brand-muted font-sora uppercase tracking-wider"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          className={clsx(
            'w-full bg-[#111111] border rounded-lg text-sm text-brand-text font-sora appearance-none',
            'px-3 py-2.5 pr-9',
            'focus:outline-none focus:ring-1 transition-all duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'cursor-pointer',
            error
              ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20'
              : 'border-[#2A2A2A] focus:border-brand-gold focus:ring-brand-gold/20',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#1A1A1A]">
              {opt.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 font-sora">{error}</p>
      )}
    </div>
  )
}
