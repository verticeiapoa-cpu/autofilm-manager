import { clsx } from 'clsx'

interface StockBarProps {
  metrosRestantes: number
  metrosTotais: number
  alertaMetros?: number
  className?: string
}

function getBarColor(percent: number): string {
  if (percent > 50) return '#22C55E'
  if (percent >= 20) return '#EAB308'
  return '#EF4444'
}

function getTextColor(percent: number): string {
  if (percent > 50) return 'text-green-400'
  if (percent >= 20) return 'text-yellow-400'
  return 'text-red-400'
}

export function StockBar({ metrosRestantes, metrosTotais, alertaMetros, className }: StockBarProps) {
  const percent = metrosTotais > 0
    ? Math.min(100, Math.max(0, (metrosRestantes / metrosTotais) * 100))
    : 0

  const barColor = getBarColor(percent)
  const textColor = getTextColor(percent)
  const isAlert = alertaMetros !== undefined && metrosRestantes <= alertaMetros

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between">
        <span className={clsx('text-xs font-medium font-sora', textColor)}>
          {metrosRestantes.toFixed(2)} m restantes
        </span>
        <span className="text-xs text-brand-muted font-sora">
          {percent.toFixed(0)}%
        </span>
      </div>

      <div className="h-1.5 w-full bg-[#2A2A2A] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: barColor }}
        />
      </div>

      {isAlert && (
        <p className="text-[11px] text-yellow-400 font-sora">
          ⚠ Estoque abaixo do alerta ({alertaMetros?.toFixed(1)} m)
        </p>
      )}
    </div>
  )
}
