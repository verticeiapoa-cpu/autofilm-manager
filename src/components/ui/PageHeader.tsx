import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface Breadcrumb {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  breadcrumbs?: Breadcrumb[]
  action?: ReactNode
}

export function PageHeader({ title, breadcrumbs, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex flex-col gap-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} className="text-brand-muted/50" />}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="text-xs text-brand-muted hover:text-brand-gold transition-colors font-sora"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-xs text-brand-muted font-sora">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        <h1 className="font-heading font-bold text-2xl text-brand-text tracking-wide">
          {title}
        </h1>
      </div>

      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}
