import { clsx } from 'clsx'
import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
}

export function Input({ label, error, icon, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-brand-muted font-sora uppercase tracking-wider"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none">
            {icon}
          </span>
        )}

        <input
          id={inputId}
          className={clsx(
            'w-full bg-[#111111] border rounded-lg text-sm text-brand-text font-sora',
            'placeholder:text-brand-muted/50',
            'focus:outline-none focus:ring-1 transition-all duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            icon ? 'pl-9 pr-3' : 'px-3',
            'py-2.5',
            error
              ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20'
              : 'border-[#2A2A2A] focus:border-brand-gold focus:ring-brand-gold/20',
            className
          )}
          {...props}
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 font-sora">{error}</p>
      )}
    </div>
  )
}
