import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  /** Remove o padding padrão */
  noPadding?: boolean
  /** Adiciona borda esquerda dourada */
  accent?: boolean
}

export function Card({ children, className, noPadding = false, accent = false }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-[#1A1A1A] border border-[#2A2A2A] rounded-[8px]',
        !noPadding && 'p-5',
        accent && 'border-l-2 border-l-brand-gold',
        className
      )}
    >
      {children}
    </div>
  )
}
