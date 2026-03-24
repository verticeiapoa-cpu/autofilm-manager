import { clsx } from 'clsx'

type BadgeStatus =
  | 'agendado'
  | 'em_execucao'
  | 'concluido'
  | 'cancelado'
  | 'ativa'
  | 'alerta'
  | 'esgotada'
  | 'pendente'
  | 'confirmado'
  | 'reagendado'

interface BadgeProps {
  status: BadgeStatus
  className?: string
}

const config: Record<BadgeStatus, { label: string; classes: string }> = {
  agendado:    { label: 'Agendado',     classes: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  em_execucao: { label: 'Em execução',  classes: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  concluido:   { label: 'Concluído',    classes: 'bg-green-500/15 text-green-400 border-green-500/30' },
  cancelado:   { label: 'Cancelado',    classes: 'bg-red-500/15 text-red-400 border-red-500/30' },
  ativa:       { label: 'Ativa',        classes: 'bg-green-500/15 text-green-400 border-green-500/30' },
  alerta:      { label: 'Alerta',       classes: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  esgotada:    { label: 'Esgotada',     classes: 'bg-red-500/15 text-red-400 border-red-500/30' },
  pendente:    { label: 'Pendente',     classes: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
  confirmado:  { label: 'Confirmado',   classes: 'bg-green-500/15 text-green-400 border-green-500/30' },
  reagendado:  { label: 'Reagendado',   classes: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
}

export function Badge({ status, className }: BadgeProps) {
  const { label, classes } = config[status]
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border font-sora',
        classes,
        className
      )}
    >
      {label}
    </span>
  )
}
