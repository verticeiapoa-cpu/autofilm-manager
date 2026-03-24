import { useNavigate } from 'react-router-dom'
import { useAppStore, selectSession, selectUser } from '../store'

export function useAuth() {
  const session = useAppStore(selectSession)
  const user    = useAppStore(selectUser)
  const login   = useAppStore((s) => s.login)
  const logout  = useAppStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return {
    session,
    user,
    isAuthenticated: !!session,
    login,
    logout: handleLogout,
  }
}
