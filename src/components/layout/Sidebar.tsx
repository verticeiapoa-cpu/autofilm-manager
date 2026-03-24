import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Package,
  DollarSign,
  BarChart2,
  Shield,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAppStore, selectConfiguracoes } from '../../store'

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agendamentos', icon: CalendarDays,     label: 'Agendamentos' },
  { to: '/clientes',     icon: Users,            label: 'Clientes' },
  { to: '/estoque',      icon: Package,          label: 'Estoque' },
  { to: '/precos',       icon: DollarSign,       label: 'Preços' },
  { to: '/relatorios',   icon: BarChart2,        label: 'Relatórios' },
  { to: '/garantias',    icon: Shield,           label: 'Garantias' },
]

export function Sidebar() {
  const logout        = useAppStore((s) => s.logout)
  const configuracoes = useAppStore(selectConfiguracoes)
  const nomeEstetica  = configuracoes?.nome_estetica ?? 'Alisson Películas'

  return (
    <aside className="w-56 min-h-screen bg-[#111111] border-r border-[#1E1E1E] flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-[#1E1E1E]">
        <span className="font-heading font-bold text-xl tracking-widest uppercase text-brand-gold">
          AutoFilm
        </span>
        <p className="text-[11px] text-brand-muted mt-0.5 font-sora truncate" title={nomeEstetica}>
          {nomeEstetica}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium font-sora',
                'transition-all duration-150',
                isActive
                  ? 'bg-brand-gold/10 text-brand-gold'
                  : 'text-brand-muted hover:text-brand-text hover:bg-white/4'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={17}
                  className={clsx(
                    'shrink-0 transition-colors',
                    isActive ? 'text-brand-gold' : 'text-brand-muted'
                  )}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Configurações + Logout */}
      <div className="px-3 py-4 border-t border-[#1E1E1E] space-y-0.5">
        <NavLink
          to="/configuracoes"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg',
              'text-sm font-medium font-sora transition-all duration-150',
              isActive
                ? 'bg-brand-gold/10 text-brand-gold'
                : 'text-brand-muted hover:text-brand-text hover:bg-white/4'
            )
          }
        >
          {({ isActive }) => (
            <>
              <Settings
                size={17}
                className={clsx('shrink-0 transition-colors', isActive ? 'text-brand-gold' : 'text-brand-muted')}
              />
              Configurações
            </>
          )}
        </NavLink>

        <button
          onClick={logout}
          className={clsx(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg',
            'text-sm font-medium font-sora text-brand-muted',
            'hover:text-red-400 hover:bg-red-500/5 transition-all duration-150'
          )}
        >
          <LogOut size={17} className="shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  )
}
