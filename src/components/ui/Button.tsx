import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary: [
    'bg-brand-gold text-[#0A0A0A] font-semibold',
    'hover:bg-brand-gold-hover',
    'disabled:bg-brand-gold/40 disabled:text-[#0A0A0A]/50',
  ].join(' '),
  secondary: [
    'border border-brand-gold text-brand-gold bg-transparent font-semibold',
    'hover:bg-brand-gold/10',
    'disabled:border-brand-gold/30 disabled:text-brand-gold/30',
  ].join(' '),
  danger: [
    'bg-red-600 text-white font-semibold',
    'hover:bg-red-500',
    'disabled:bg-red-600/40',
  ].join(' '),
  ghost: [
    'bg-transparent text-brand-muted font-medium',
    'hover:bg-white/5 hover:text-brand-text',
    'disabled:text-brand-muted/40',
  ].join(' '),
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-lg gap-2.5',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled ?? loading}
      className={clsx(
        'inline-flex items-center justify-center font-sora',
        'transition-all duration-150 cursor-pointer select-none',
        'disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin shrink-0" />}
      {children}
    </button>
  )
}
