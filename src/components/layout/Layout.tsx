import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAppStore, selectUser, selectAuthLoading } from '../../store'
import { Sidebar } from './Sidebar'

export function Layout() {
  const user         = useAppStore(selectUser)
  const authLoading  = useAppStore(selectAuthLoading)
  const fetchConfiguracoes = useAppStore((s) => s.fetchConfiguracoes)

  useEffect(() => {
    if (user) fetchConfiguracoes()
  }, [user, fetchConfiguracoes])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <span className="font-heading font-bold text-xl text-brand-gold tracking-widest animate-pulse uppercase">
          AutoFilm
        </span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar />
      <main className="flex-1 px-8 py-7 overflow-auto min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
